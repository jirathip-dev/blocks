#if !os(watchOS)
    import Blocks
    import SwiftUI

    internal struct EditorBlock: View {
        @Environment(\.look) private var look
        @Environment(\.act) private var act
        @State private var draft: String?
        internal let block: Editor

        private var text: String { block.text }
        private var first: Int { Int(block.first ?? 1) }

        private var errors: [Int: String] {
            let pairs = (block.errors ?? []).map { (Int($0.line), $0.message) }
            return Dictionary(pairs) { kept, _ in kept }
        }

        internal var body: some View {
            VStack(alignment: .leading, spacing: 0) {
                if draft == nil {
                    ForEach(Array(text.components(separatedBy: "\n").enumerated()), id: \.offset) { index, line in
                        EditorLine(number: first + index, text: line, error: errors[first + index])
                    }
                } else {
                    TextEditor(
                        text: Binding {
                            draft ?? ""
                        } set: {
                            draft = $0
                        }
                    ).frame(minHeight: 320)
                        .scrollContentBackground(.hidden)
                    ForEach(errors.sorted { $0.key < $1.key }, id: \.key) { error in
                        ErrorNote(error: "line \(error.key) · \(error.value)")
                    }
                }
            }
            .font(.system(size: 12, design: .monospaced)).padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading).surface(look, radius: 12)
            .onTapGesture { if draft == nil { draft = text } }
            .task(id: draft) { await check() }
        }

        private func check() async {
            guard let draft, draft != text else { return }
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            act(BlockAction(action: block.action, values: [block.name: .string(draft)]))
        }
    }

    internal struct EditorLine: View {
        @Environment(\.look) private var look
        internal let number: Int
        internal let text: String
        internal let error: String?

        internal var body: some View {
            let palette = look.palette
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text("\(number)").foregroundStyle(palette.mute).frame(width: 30, alignment: .trailing)
                    Text(text.isEmpty ? " " : text).foregroundStyle(palette.foreground)
                    Spacer(minLength: 0)
                }
                .background(error == nil ? Color.clear : palette.red.opacity(0.14))
                if let error { ErrorNote(error: error).padding(.leading, 30) }
            }
        }
    }

    internal struct ErrorNote: View {
        @Environment(\.look) private var look
        internal let error: String

        internal var body: some View {
            Text(error).ui(11.5, .semibold, look).foregroundStyle(look.palette.red)
                .padding(.vertical, 4).padding(.horizontal, 8)
                .background(look.palette.red.opacity(0.18), in: .rect(cornerRadius: look.radius(6))).padding(.horizontal, 10)
        }
    }
#endif
