import Blocks
import SwiftUI

extension SlotView {
    /// The edit mode on offer: each node with a handle to move or swap it and a picker for how it shows on `size`; `save` answers nil once saved, else why not.
    public func layoutEditing(
        slots: [String: [String]], size: SizeClass, save: @escaping @MainActor (LayoutEdit) async -> String?
    ) -> some View {
        Arranged(slotted: self, rules: LayoutRules(tree: node, held: slots), size: size, save: save)
    }
}

private struct Arranged<Slotted: View>: View {
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(\.look) private var look
    let slotted: Slotted
    let rules: LayoutRules
    let size: SizeClass
    let save: @MainActor (LayoutEdit) async -> String?
    @State private var editing = false
    @State private var why: String?
    @State private var preview: LayoutEdit?

    var body: some View {
        slotted
            .overlay(alignment: .topTrailing) { Button("Edit layout") { editing = true }.padding() }
            .sheet(isPresented: $editing) { arranger }
    }

    private var arranger: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Layout on \(size.rawValue)").font(.headline)
                Spacer()
                Button("Done") { editing = false }
            }
            .padding()
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(read(rules.tree), id: \.0.id) { row($0.0, depth: $0.1) }
                }
            }
            if let why { Text(why).foregroundStyle(look.palette.red).padding() }
        }
        .environment(\.acted) { a in
            guard let e = try? a.values["edit"]?.decode(LayoutEdit.self) else { return false }
            return await send(e)
        }
        .onKeyPress(.escape) {
            editing = false
            return .handled
        }
    }

    private func read(_ n: LayoutNode<LayoutPlace>, _ d: Int = 0) -> [(LayoutNode<LayoutPlace>, Int)] {
        [(n, d)] + n.slots.keys.sorted().flatMap { (n.slots[$0] ?? []).flatMap { read($0, d + 1) } }
    }

    private func send(_ e: LayoutEdit) async -> Bool {
        why = await save(e)
        return why == nil
    }

    private func target(_ id: String) -> Bool {
        switch preview {
        case .swap(let s)?: s.b == id
        case .move(let m)?: (m.before ?? m.into) == id
        default: false
        }
    }

    private func row(_ n: LayoutNode<LayoutPlace>, depth: Int) -> some View {
        let label = n.label ?? n.id
        let place = Binding(get: { n.place }, set: { p in Task { _ = await send(.showing(n.id, on: size, as: p)) } })
        return HStack {
            Text(label)
            Spacer()
            Picker("\(label) shows on \(size.rawValue) as", selection: place) {
                ForEach(LayoutPlace.all.filter { depth > 0 || $0 != .hidden }, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .labelsHidden()
            if depth > 0 {
                Image(systemName: "line.3.horizontal").frame(minWidth: 44, minHeight: 44)
                    .modifier(
                        Gestured(
                            rules: rules, grab: n.id, gesture: .layout, label: "Move \(label)",
                            reach: { Int(($0.height / 22).rounded()) }, value: { (try? JSONValue($0)) ?? .null },
                            show: { preview = $0 }))
            }
        }
        .padding(.leading, CGFloat(depth + 1) * 16)
        .opacity(target(n.id) ? 0.6 : 1)
        .animation(still ? nil : .snappy, value: preview)
    }
}
