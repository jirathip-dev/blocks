import Blocks
import SwiftUI
import UniformTypeIdentifiers

/// What the renderer tells the app's `.onFile` about one file; cancelling the task is the abort.
public struct Picked: Sendable {
    public let screen: String?
    public let block: String?
    public let field: String
    public let name: String
    public let mime: String
    public let size: UInt64
    public let progress: @MainActor @Sendable (Double) -> Void
}

/// The app's file handler: it takes the file at the URL and answers a small ref; a throw is the failed state.
public typealias OnFile = @MainActor (URL, Picked) async throws -> FileRef

extension View {
    /// Hands each file an upload field below picks to `handle`; without one the field is drawn off.
    public func onFile(_ handle: @escaping OnFile) -> some View { environment(\.onFile, handle) }
}

extension View {
    /// Draws each upload field below with the harness's file rows, by field name.
    package func fileRows(_ rows: [String: [FileRow]]) -> some View { environment(\.fileRows, rows) }
}

extension EnvironmentValues {
    @Entry internal var fileRows: [String: [FileRow]]?
    @Entry internal var onFile: OnFile?
    @Entry internal var uploads: Binding<[String: [FileRow]]> = .constant([:])
    @Entry internal var formId: String?
    @Entry internal var screenId: String?
}

#if !os(watchOS)
    extension UploadField: FieldKind {
        internal var start: JSONValue? { .array(held.ids.map(JSONValue.string)) }
        internal var edit: FieldEdit { .files(self) }
    }

    internal struct UploadRow: View {
        @Environment(\.look) private var look
        @Environment(\.onFile) private var onFile
        @Environment(\.uploads) private var uploads
        @Environment(\.formId) private var form
        @Environment(\.screenId) private var screen
        @Environment(\.edit) private var edit
        @State private var picking = false
        @State private var camera = false
        @State private var tasks: [String: Task<Void, Never>] = [:]
        @State private var urls: [String: URL] = [:]
        internal let field: UploadField

        private var rows: [FileRow] { uploads.wrappedValue[field.name] ?? field.held }

        private var types: [UTType] {
            let all = (field.accept ?? []).flatMap { a -> [UTType] in
                a == .image ? [.image] : a == .pdf ? [.pdf] : a == .sheet ? [.commaSeparatedText, .spreadsheet] : []
            }
            return all.isEmpty ? [.item] : all
        }

        internal var body: some View {
            let palette = look.palette
            let label = field.label ?? field.name
            let choose = field.pick(rows)
            VStack(alignment: .leading, spacing: Scale.gap) {
                Text(label).ui(Scale.cell, .regular, look).foregroundStyle(palette.mute)
                if let error = field.error { Text(error).ui(Scale.count, .regular, look).foregroundStyle(palette.red) }
                if let was = field.was { Text("\(fieldWord("was")) \(was)").ui(Scale.count, .regular, look).foregroundStyle(palette.lead) }
                if let doc = field.doc { Text(doc).ui(Scale.count, .regular, look).foregroundStyle(palette.mute) }
                ForEach(rows, id: \.key) { r in
                    HStack {
                        VStack(alignment: .leading, spacing: Scale.mark) {
                            Text(r.name).ui(Scale.cell, .regular, look).lineLimit(1).truncationMode(.middle)
                            Text(field.status(r)).ui(Scale.count, .regular, look).foregroundStyle(r.refused ? palette.red : palette.mute)
                        }
                        Spacer()
                        if r.state == .failed { button("retry", r.name) { send(r) } }
                        button(r.refused ? "dismiss" : "remove", r.name) { drop(r) }
                    }
                    .accessibilityElement(children: .contain).accessibilityLabel("\(r.name), \(field.status(r))")
                }
                HStack(spacing: Scale.gap) {
                    if field.capture == true, Shutter.ready { button("camera", nil) { camera = true } }
                    Button(choose) { picking = true }.accessibilityLabel("\(choose): \(label)")
                    Text(field.hint(on: onFile != nil)).ui(Scale.count, .regular, look).foregroundStyle(palette.mute)
                }
                .ui(Scale.meta, .semibold, look).disabled(onFile == nil)
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel(fieldWord("files", ["label": label, "n": "\(rows.count { !$0.refused })"]))
            .fileImporter(isPresented: $picking, allowedContentTypes: types, allowsMultipleSelection: field.many == true) {
                take((try? $0.get()) ?? [])
            }
            .sheet(isPresented: $camera) { Shutter { take([$0]) } }
        }

        private func button(_ word: String, _ file: String?, _ tap: @escaping () -> Void) -> some View {
            Button(fieldWord(word), action: tap).accessibilityLabel([fieldWord(word), file].compactMap(\.self).joined(separator: " "))
        }

        private func set(_ next: [FileRow]) {
            uploads.wrappedValue[field.name] = next
            edit([field.name: Behaviour.lit(.null, .array(next.ids.map(JSONValue.string)))])
        }

        private func take(_ urls: [URL]) {
            let fresh = urls.map { url in
                let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize).flatMap { $0.map(UInt64.init) } ?? 0
                let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? ""
                return (FileRow(key: UUID().uuidString, name: url.lastPathComponent, size: size, mime: mime), url)
            }
            let next = field.picked(rows, fresh.map(\.0))
            for r in rows where !next.contains(where: { $0.key == r.key }) { tasks[r.key]?.cancel() }
            set(next)
            for (r, url) in fresh where next.first(where: { $0.key == r.key })?.refused == false { send(r, url) }
        }

        private func send(_ r: FileRow, _ url: URL? = nil) {
            guard let onFile, let url = url ?? urls[r.key] else { return }
            urls[r.key] = url
            let key = r.key
            let about = Picked(
                screen: screen, block: form, field: field.name, name: r.name, mime: r.mime, size: r.size,
                progress: { part in moved(key, .uploading(min(1, max(0, part)))) })
            moved(key, .uploading(0))
            tasks[key] = Task {
                let open = url.startAccessingSecurityScopedResource()
                defer { if open { url.stopAccessingSecurityScopedResource() } }
                let ref = try? await onFile(url, about)
                if !Task.isCancelled { moved(key, ref.map(FileRow.State.done) ?? .failed) }
            }
        }

        private func moved(_ key: String, _ state: FileRow.State) {
            let named = if case .done(let f) = state { f.name } else { String?.none }
            set(rows.map { $0.key == key ? FileRow(key: key, name: named ?? $0.name, size: $0.size, mime: $0.mime, state: state) : $0 })
        }

        private func drop(_ r: FileRow) {
            tasks[r.key]?.cancel()
            set(rows.filter { $0.key != r.key })
        }
    }

    #if os(iOS)
        import UIKit

        internal struct Shutter: UIViewControllerRepresentable {
            internal static var ready: Bool { UIImagePickerController.isSourceTypeAvailable(.camera) }
            internal let took: (URL) -> Void

            internal func makeUIViewController(context: Context) -> UIImagePickerController {
                let camera = UIImagePickerController()
                camera.sourceType = .camera
                camera.delegate = context.coordinator
                return camera
            }

            internal func updateUIViewController(_ camera: UIImagePickerController, context: Context) {}

            internal func makeCoordinator() -> Took { Took(took) }

            internal final class Took: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
                private let took: (URL) -> Void

                internal init(_ took: @escaping (URL) -> Void) { self.took = took }

                internal func imagePickerController(
                    _ camera: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
                ) {
                    let url = FileManager.default.temporaryDirectory.appendingPathComponent("photo-\(UUID().uuidString).jpg")
                    if let jpeg = (info[.originalImage] as? UIImage)?.jpegData(compressionQuality: 0.9), (try? jpeg.write(to: url)) != nil {
                        took(url)
                    }
                    camera.dismiss(animated: true)
                }
            }
        }
    #else
        internal struct Shutter: View {
            internal static var ready: Bool { false }
            internal let took: (URL) -> Void

            internal var body: some View { EmptyView() }
        }
    #endif
#endif
