import Blocks
import Foundation
import XCTest

final class ImportTests: XCTestCase {
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    private func kind() throws -> Import {
        try JSONDecoder().decode(Import.self, from: Data(contentsOf: root.appendingPathComponent("fixtures/blocks/import.json")))
    }

    private func read(_ name: String, sheet: Int = 0) throws -> (SheetBook?, String?) {
        readSheet(name: name, data: try Data(contentsOf: root.appendingPathComponent("fixtures/import/\(name)")), sheet: sheet)
    }

    func testAGoodXlsxIsReadFromItsZipWithDatesByFormatAndMappedByAlsoNames() throws {
        XCTAssertEqual(try read("good.xlsx").0?.head, ["Cover sheet"])
        let b = try kind(), book = try XCTUnwrap(try read("good.xlsx", sheet: 1).0)
        XCTAssertEqual(book.head, ["Item code", "Name", "Category", "Price", "Best before", "Supplier"])
        XCTAssertEqual(book.rows.map(\.n), [2, 3, 5])
        XCTAssertEqual(book.rows.map(\.cells), [
            ["BK-0101", "Sourdough loaf", "Bakery", "85", "2026-11-21"],
            ["BK-0102", "Butter croissant & jam", "Bakery", "45.5", "2026-11-22"],
            ["DA-0310", "Fresh milk 1 L", "Dairy", "52", "", "Farm <A>"],
        ])
        let map = matchColumns(b.columns, book.head)
        XCTAssertEqual(map, ["sku": 0, "name": 1, "cat": 2, "price": 3])
        XCTAssertEqual(checkRows(b.columns, map, book).map(\.bad), [[:], [:], [:]])
    }

    func testBadRowsGiveEachRowsReasons() throws {
        let b = try kind(), (book, _) = try read("bad-rows.csv")
        let book1 = try XCTUnwrap(book)
        let rows = checkRows(b.columns, matchColumns(b.columns, book1.head), book1)
        XCTAssertEqual(book1.encoding, "UTF-8")
        XCTAssertEqual(rows.map(\.n), [2, 3, 4, 5, 6])
        XCTAssertEqual(rows.map(\.bad), [
            [:], ["price": "“12,5O” is not a number"], ["cat": "“Dry goods” is not one of Bakery, Dairy"],
            ["sku": "required"], ["sku": "BK-0101 is also on row 2"],
        ])
        XCTAssertEqual(rows[0].values, ["sku": .string("BK-0101"), "name": .string("Sourdough loaf"), "cat": .string("Bakery"), "price": .number(85)])
        XCTAssertEqual(rows[1].cells["name"], "Pandan \"chiffon\" cake")
        XCTAssertEqual(rows[4].values["price"], .number(1250))
        let refused = checkRows(b.columns, matchColumns(b.columns, book1.head), book1, refused: [try JSONDecoder().decode(Refused.self, from: Data(#"{"row":2,"key":"price","text":"below cost"}"#.utf8))])
        XCTAssertEqual(refused[0].bad, ["price": "below cost"])
    }

    func testWrongColumnsThaiCsvAndRefusedFiles() throws {
        let b = try kind(), (wrong, _) = try read("wrong-columns.csv")
        XCTAssertEqual(matchColumns(b.columns, try XCTUnwrap(wrong).head), ["sku": -1, "name": -1, "cat": -1, "price": -1])
        let (thai, _) = try read("thai.csv")
        XCTAssertEqual(thai?.encoding, "Windows-874")
        XCTAssertEqual(thai?.rows.first?.cells[1], "ขนมปังโฮลวีต")
        XCTAssertEqual(try read("old.xls").1, "imOld")
        XCTAssertEqual(importWord("imReq", thai: true), "ต้องมี")
    }
}
