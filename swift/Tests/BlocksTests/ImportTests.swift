import Blocks
import BlocksUI
import Foundation
import SwiftUI
import XCTest

@MainActor
final class ImportTests: XCTestCase {
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    private func answer(_ name: String) throws -> Import {
        try JSONDecoder().decode(Import.self, from: Data(contentsOf: root.appendingPathComponent("fixtures/import/\(name).json")))
    }

    private func height(_ b: Import, files: Bool = true) -> CGFloat {
        let view = BlocksView(.import(b), source: .core).environment(\.look, Look(still: true))
        let host = files ? AnyView(view.onFile { _, _ in FileRef("f-7") }) : AnyView(view)
        return NSHostingView(rootView: host.frame(width: 390)).fittingSize.height
    }

    func testAGoodReadTakesEveryRowAndSendsTheFileSheetAndMatch() throws {
        let b = try answer("good")
        XCTAssertEqual(b.good, 48)
        XCTAssertNil(b.missing)
        XCTAssertEqual(b.values(file: "f-7"), [
            "file": .string("f-7"), "sheet": .string("Sheet1"),
            "map": .object(["sku": .string("Item code"), "name": .string("Description"), "cat": .string("Group"), "price": .string("Unit price")]),
        ])
        XCTAssertEqual(b.values(file: "other"), ["file": .string("other"), "sheet": .null, "map": .object([:])])
    }

    func testBadRowsAndTheAppsRefusedRowsAreLeftOut() throws {
        var b = try answer("bad-rows")
        XCTAssertEqual(b.bad.map(\.n), [14, 87, 203])
        XCTAssertEqual(b.good, 309)
        b.refused = try JSONDecoder().decode([ImportRow].self, from: Data(#"[{"n": 2, "cells": {"sku": "BK-0101"}, "bad": {"sku": "already in Products"}}]"#.utf8))
        XCTAssertEqual(b.bad.map(\.n), [2, 14, 87, 203])
        XCTAssertEqual(b.good, 308)
    }

    func testWrongColumnsHoldTheImportOnTheRequiredColumnWithNoMatch() throws {
        XCTAssertEqual(try answer("wrong-columns").missing?.label, "Price ฿")
        XCTAssertNil(try answer("refused").read(of: "f-7"))
        XCTAssertEqual(try answer("refused").bad, [])
    }

    func testThePickerThePreviewWithItsRowsAndTheDoneCountDraw() throws {
        let picker = height(try answer("refused")), preview = height(try answer("bad-rows"))
        XCTAssertGreaterThan(picker, 100, "the title, the server's message, the drop area and the columns it needs")
        XCTAssertGreaterThan(preview, picker * 1.5, "the file, the match, five rows with their reasons and the import button")
        var done = try answer("good")
        done.done = try JSONDecoder().decode(ImportDone.self, from: Data(#"{"count": 48}"#.utf8))
        XCTAssertGreaterThan(height(done), 60)
        XCTAssertLessThan(height(done), preview)
    }
}
