import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation

let usage =
    "usage: blocks-snap --plan <plan.json> | --screen <file> [--size 390x844] [--scheme light|dark] [--script <steps.json>]"
    + " [--expect <tree.json>] [--ids <ids.json>] [--check] [--measure] [--form <glance form>] --out <dir>\n"

func fail(_ text: String, _ code: Int32) -> Never {
    FileHandle.standardError.write(Data(text.utf8))
    exit(code)
}

var options: [String: String] = [:]
var check = false
var measure = false
var args = CommandLine.arguments.dropFirst()
while let arg = args.popFirst() {
    if arg == "--check" {
        check = true
    } else if arg == "--measure" {
        measure = true
    } else if arg.hasPrefix("--"), let value = args.popFirst() {
        options[String(arg.dropFirst(2))] = value
    } else {
        fail(usage, 2)
    }
}
func read<T: Decodable>(_ type: T.Type, _ path: String) -> T {
    do {
        return try JSONDecoder().decode(type, from: Data(contentsOf: URL(fileURLWithPath: path)))
    } catch {
        fail("blocks-snap: \(path): \(error)\n", 2)
    }
}

if let plan = options["plan"] {
    do { try Snapshot.plan(read(Plan.self, plan)) } catch { fail("blocks-snap --plan: \(error)\n", 2) }
    exit(0)
}
guard let screenFile = options["screen"], let out = options["out"] else { fail(usage, 2) }
let sides = (options["size"] ?? "390x844").split(separator: "x").compactMap { Double($0) }
guard sides.count == 2 else { fail(usage, 2) }

var look = Look(still: true)
if let name = options["scheme"] {
    guard let scheme = ["light": blocksDefaultLight, "dark": blocksDefaultDark][name], let palette = Palette(tokens: scheme.tokens, dark: scheme.mode == .dark)
    else { fail("blocks-snap: no scheme \(name)\n", 2) }
    look.palette = palette
}
func glance(in block: Block) -> Glance? {
    switch block {
    case .glance(let glance): glance
    case .screen(let screen): (screen.blocks ?? []).lazy.compactMap(glance(in:)).first
    default: nil
    }
}

if let name = options["form"] {
    guard let form = GlanceForm(rawValue: name), let block = glance(in: read(Block.self, screenFile)) else {
        fail("blocks-snap: no form \(name), or no glance in \(screenFile)\n", 2)
    }
    let shot = Snapshot.form(block, form, look: look)
    do {
        try FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
        try shot.png.write(to: URL(fileURLWithPath: out).appendingPathComponent("\(form.rawValue).png"))
    } catch {
        fail("blocks-snap: \(error)\n", 1)
    }
    for fault in shot.faults { FileHandle.standardError.write(Data("\(fault)\n".utf8)) }
    exit(shot.faults.isEmpty ? 0 : 1)
}
let snapshot = Snapshot(
    read(Block.self, screenFile), size: CGSize(width: sides[0], height: sides[1]), look: look)
do {
    let run = try snapshot.run(
        options["script"].map { read([Step].self, $0) } ?? [],
        name: URL(fileURLWithPath: screenFile).deletingPathExtension().lastPathComponent,
        expect: options["expect"].map { read(TreeNode.self, $0) }, ids: options["ids"].map { read(DrawnIdList.self, $0) },
        check: check, measure: measure)
    try run.save(to: URL(fileURLWithPath: out))
    for fault in run.faults { FileHandle.standardError.write(Data("\(fault)\n".utf8)) }
    exit(run.faults.isEmpty ? 0 : 1)
} catch {
    fail("blocks-snap: \(error)\n", 1)
}
