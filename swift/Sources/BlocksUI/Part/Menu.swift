#if os(watchOS)
    import SwiftUI

    /// watchOS has no menu: its label opens the items in a sheet, and a picked item closes it.
    internal struct Menu<Label: View, Content: View>: View {
        @State private var open = false
        private let content: Content
        private let label: Label

        internal init(@ViewBuilder content: () -> Content, @ViewBuilder label: () -> Label) {
            (self.content, self.label) = (content(), label())
        }

        internal var body: some View {
            Button { open = true } label: { label }
                .sheet(isPresented: $open) {
                    ScrollView { VStack { content }.simultaneousGesture(TapGesture().onEnded { open = false }) }
                }
        }
    }

    /// watchOS has no disclosure group: it folds out as a menu's sheet.
    internal typealias DisclosureGroup = Menu

    extension Menu where Label == Text {
        internal init(_ title: String, @ViewBuilder content: () -> Content) {
            self.init(content: content) { Text(title) }
        }
    }
#endif
