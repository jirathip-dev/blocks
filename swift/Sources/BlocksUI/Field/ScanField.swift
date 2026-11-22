#if !os(watchOS)
    import Blocks
    import CoreImage
    import PDFKit
    import SwiftUI
    import Vision

    extension ScanField: FieldKind {
        internal var start: JSONValue? { .array(held.ids.map(JSONValue.string)) }
        internal var edit: FieldEdit { .scan(self) }

        internal var held: [FileRow] {
            file.map { [FileRow(key: $0.id, name: $0.name ?? $0.id, size: 0, mime: "application/pdf", state: .done($0))] } ?? []
        }
    }

    private let mm = 72 / 25.4

    internal struct ScanRow: View {
        @Environment(\.look) private var look
        @Environment(\.onFile) private var onFile
        @Environment(\.uploads) private var uploads
        @Environment(\.formId) private var form
        @Environment(\.screenId) private var screen
        @Environment(\.edit) private var edit
        @State private var picking = false
        @State private var camera = false
        @State private var task: Task<Void, Never>?
        @State private var made: (url: URL, pages: Int)?
        internal let field: ScanField

        private var rows: [FileRow] { uploads.wrappedValue[field.name] ?? field.held }

        private var name: String {
            let words = (field.label ?? field.name).lowercased().split { !$0.isLetter && !$0.isNumber }
            return (words.isEmpty ? "scan" : words.joined(separator: "-")) + ".pdf"
        }

        internal var body: some View {
            let palette = look.palette
            let label = field.label ?? field.name
            let again = rows.isEmpty ? "scan" : "rescan"
            VStack(alignment: .leading, spacing: Scale.gap) {
                Text(label).ui(Scale.cell, .regular, look).foregroundStyle(palette.mute)
                if let error = field.error { Text(error).ui(Scale.count, .regular, look).foregroundStyle(palette.red) }
                if let was = field.was { Text("\(fieldWord("was")) \(was)").ui(Scale.count, .regular, look).foregroundStyle(palette.lead) }
                if let doc = field.doc { Text(doc).ui(Scale.count, .regular, look).foregroundStyle(palette.mute) }
                ForEach(rows, id: \.key) { r in
                    HStack {
                        VStack(alignment: .leading, spacing: Scale.mark) {
                            Text(r.name).ui(Scale.cell, .regular, look).lineLimit(1).truncationMode(.middle)
                            Text(status(r)).ui(Scale.count, .regular, look).foregroundStyle(palette.mute)
                        }
                        Spacer()
                        if r.state == .failed { button("retry", r.name) { send() } }
                        button("remove", r.name) { drop() }
                    }
                    .accessibilityElement(children: .contain).accessibilityLabel("\(r.name), \(status(r))")
                }
                HStack(spacing: Scale.gap) {
                    button(again, label) { if DocumentCamera.ready { camera = true } else { picking = true } }
                    Text(onFile == nil ? fieldWord("scanOff") : fieldWord("scanHint", ["max": "\(field.max ?? 20)"]))
                        .ui(Scale.count, .regular, look).foregroundStyle(palette.mute)
                }
                .ui(Scale.meta, .semibold, look).disabled(onFile == nil)
            }
            .accessibilityElement(children: .contain).accessibilityLabel(label)
            .fileImporter(isPresented: $picking, allowedContentTypes: [.image], allowsMultipleSelection: true) {
                let urls = (try? $0.get()) ?? []
                take(urls.compactMap { url in
                    let open = url.startAccessingSecurityScopedResource()
                    defer { if open { url.stopAccessingSecurityScopedResource() } }
                    return CIImage(contentsOf: url, options: [.applyOrientationProperty: true]).map(Self.corrected)
                })
            }
            .sheet(isPresented: $camera) { DocumentCamera { take($0) } }
        }

        private func status(_ r: FileRow) -> String {
            let pages = made.map { fieldWord($0.pages > 1 ? "scannedN" : "scanned1", ["n": "\($0.pages)", "kb": "\(max(1, r.size / 1024))"]) }
            let head: String? =
                switch r.state {
                case .uploading(let part): fieldWord("uploading", ["p": "\(Int((part * 100).rounded()))"])
                case .failed: fieldWord("failed")
                default: nil
                }
            return [head, pages].compactMap(\.self).joined(separator: " · ")
        }

        private func button(_ word: String, _ name: String, _ tap: @escaping () -> Void) -> some View {
            Button(fieldWord(word), action: tap).accessibilityLabel("\(fieldWord(word)): \(name)")
        }

        private func set(_ next: [FileRow]) {
            uploads.wrappedValue[field.name] = next
            edit([field.name: Behaviour.lit(.null, .array(next.ids.map(JSONValue.string)))])
        }

        private static func corrected(_ photo: CIImage) -> CIImage {
            let ask = VNDetectRectanglesRequest()
            ask.minimumConfidence = 0.6
            try? VNImageRequestHandler(ciImage: photo).perform([ask])
            guard let page = ask.results?.first else { return photo }
            let at = { (p: CGPoint) in CIVector(cgPoint: VNImagePointForNormalizedPoint(p, Int(photo.extent.width), Int(photo.extent.height))) }
            return photo.applyingFilter(
                "CIPerspectiveCorrection",
                parameters: [
                    "inputTopLeft": at(page.topLeft), "inputTopRight": at(page.topRight),
                    "inputBottomLeft": at(page.bottomLeft), "inputBottomRight": at(page.bottomRight),
                ])
        }

        private func take(_ pages: [CIImage]) {
            guard !pages.isEmpty else { return }
            let doc = PDFDocument(), draw = CIContext()
            let a4 = CGRect(x: 0, y: 0, width: mm * 210, height: mm * 297)
            for (i, p) in pages.prefix(Int(field.max ?? 20)).enumerated() {
                guard let cg = draw.createCGImage(p, from: p.extent) else { continue }
                #if os(iOS)
                    let image = UIImage(cgImage: cg)
                #else
                    let image = NSImage(cgImage: cg, size: .zero)
                #endif
                if let page = PDFPage(image: image, options: [.mediaBox: a4, .upscaleIfSmaller: true]) { doc.insert(page, at: i) }
            }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString)-\(name)")
            guard doc.write(to: url) else { return }
            made = (url, doc.pageCount)
            send()
        }

        private func send() {
            guard let onFile, let made else { return }
            task?.cancel()
            let key = made.url.lastPathComponent, size = (try? made.url.resourceValues(forKeys: [.fileSizeKey]).fileSize).flatMap { $0.map(UInt64.init) } ?? 0
            let moved = { (state: FileRow.State) in set([FileRow(key: key, name: name, size: size, mime: "application/pdf", state: state)]) }
            let about = Picked(
                screen: screen, block: form, field: field.name, name: name, mime: "application/pdf", size: size,
                progress: { part in moved(.uploading(min(1, max(0, part)))) })
            moved(.uploading(0))
            task = Task {
                let ref = try? await onFile(made.url, about)
                if !Task.isCancelled { moved(ref.map(FileRow.State.done) ?? .failed) }
            }
        }

        private func drop() {
            task?.cancel()
            made = nil
            set([])
        }
    }

    #if os(iOS) && canImport(VisionKit)
        import VisionKit

        internal struct DocumentCamera: UIViewControllerRepresentable {
            internal static var ready: Bool { VNDocumentCameraViewController.isSupported }
            internal let took: ([CIImage]) -> Void

            internal func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
                let camera = VNDocumentCameraViewController()
                camera.delegate = context.coordinator
                return camera
            }

            internal func updateUIViewController(_ camera: VNDocumentCameraViewController, context: Context) {}

            internal func makeCoordinator() -> Took { Took(took) }

            @MainActor internal final class Took: NSObject, @MainActor VNDocumentCameraViewControllerDelegate {
                private let took: ([CIImage]) -> Void

                internal init(_ took: @escaping ([CIImage]) -> Void) { self.took = took }

                internal func documentCameraViewController(_ camera: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
                    took((0..<scan.pageCount).compactMap { CIImage(image: scan.imageOfPage(at: $0)) })
                    camera.dismiss(animated: true)
                }

                internal func documentCameraViewControllerDidCancel(_ camera: VNDocumentCameraViewController) { camera.dismiss(animated: true) }
            }
        }
    #else
        internal struct DocumentCamera: View {
            internal static var ready: Bool { false }
            internal let took: ([CIImage]) -> Void

            internal var body: some View { EmptyView() }
        }
    #endif
#endif
