import Blocks
import BlocksSnapshot
import BlocksUI
import Foundation
import ImageIO
import Vision
import XCTest

@MainActor
final class LinesTests: XCTestCase {
    private let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../..")

    private func journal(_ edit: (inout Lines) -> Void = { _ in }) throws -> Block {
        let url = root.appendingPathComponent("fixtures/blocks/lines.json")
        var lines = try JSONDecoder().decode(Lines.self, from: Data(contentsOf: url))
        edit(&lines)
        return .lines(lines)
    }

    private func drawn(_ block: Block) throws -> Data {
        try XCTUnwrap(try Snapshot(block).run([], name: "lines").pngs["lines"])
    }

    private func read(_ block: Block) async throws -> String {
        var request = RecognizeTextRequest()
        request.usesLanguageCorrection = false
        let lines = try await request.perform(on: try drawn(block)).compactMap { $0.topCandidates(1).first?.string }
        return lines.joined(separator: "\n").replacingOccurrences(of: "•", with: "·")
    }

    private func lit(_ block: Block) throws -> Int {
        let png = try drawn(block) as CFData
        let source = try XCTUnwrap(CGImageSourceCreateWithData(png, nil))
        let image = try XCTUnwrap(CGImageSourceCreateImageAtIndex(source, 0, nil))
        let (w, h) = (image.width, image.height)
        var data = [UInt8](repeating: 0, count: w * h * 4)
        data.withUnsafeMutableBytes { bytes in
            let context = CGContext(
                data: bytes.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
            context?.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        }
        return stride(from: 0, to: data.count, by: 4).filter { i in (0..<3).allSatisfy { data[i + $0] > 0xc8 } }.count
    }

    func testAnOutOfBalanceJournalSaysWhichSideIsShortAndKeepsPostOff() async throws {
        let text = try await read(journal())
        XCTAssertTrue(text.contains("out of balance · credit short by 49.90"), text)
        XCTAssertTrue(text.contains("2,718.40") && text.contains("2,668.50"), text)
        let note = text.replacingOccurrences(of: "\n", with: " ")
        XCTAssertTrue(note.contains("fix 1 line and balance the entry to post entry"), text)
        XCTAssertTrue(text.contains("pick an account for line 2"), text)
    }

    func testABalancedJournalWithNoErrorsTurnsPostOn() async throws {
        let balanced = try journal { $0.items[2].values["credit"] = .string("2718.40") }
        let text = try await read(balanced)
        XCTAssertTrue(text.contains("balanced · debit = credit"), text)
        XCTAssertTrue(text.contains("fix 1 line to post entry"), text)
        let clean = try journal {
            $0.items[2].values["credit"] = .string("2,718.40")
            $0.errors = nil
        }
        let ready = try await read(clean)
        XCTAssertTrue(ready.contains("balanced · debit = credit"), ready)
        XCTAssertFalse(ready.contains("fix"), ready)
        XCTAssertGreaterThan(try lit(clean), try lit(balanced) + 5000, "the live submit is filled")
    }

    func testACalcColumnMultipliesItsRowAndIsTotalledInMinorUnits() async throws {
        let invoice = try JSONDecoder().decode(
            Block.self,
            from: Data(
                #"""
                {"type": "lines", "id": "inv", "name": "lines",
                 "columns": [{"type": "text", "name": "qty", "label": "Qty", "keyboard": "number"},
                   {"type": "text", "name": "price", "label": "Price", "keyboard": "number"},
                   {"type": "text", "name": "amount", "label": "Amount", "enabled": false}],
                 "items": [{"id": "a", "values": {"qty": "2", "price": "450"}},
                   {"id": "b", "values": {"qty": "3", "price": "0.1"}}],
                 "calc": {"amount": {"mul": [{"get": "qty"}, {"get": "price"}]}}, "sum": ["amount"]}
                """#.utf8))
        let text = try await read(invoice)
        XCTAssertTrue(text.contains("900.00"), text)
        XCTAssertTrue(text.contains("0.30"), text)
        XCTAssertTrue(text.contains("900.30"), text)
    }
}
