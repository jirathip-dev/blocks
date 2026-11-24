import Blocks
import BlocksUI
import Foundation
import AppKit
import SwiftUI
import XCTest

extension RenderTests {
    func testAHeatMapFillsItsCellsInItsToneStepsAndAnEmptyOneDrawsItsTextAlone() throws {
        let palette = Look(still: true).palette
        let amber = try near(palette.amber)
        let load = BlocksView(try fixture("heat"), source: .core)
        XCTAssertGreaterThan(try pixels(load, amber), 6 * 30 * 30, "the fourth step is the warn tone itself, in six cells or more")
        XCTAssertGreaterThan(try pixels(BlocksView(try fixture("heat-sleep"), source: .core), try near(palette.green)), 2 * 30 * 30)
        let empty = try block(
            #"{"type": "heat", "title": "Load", "columns": ["Mon"], "grid": [{"name": "w", "cells": [{}]}], "tone": "warn", "empty": "No rides yet"}"#)
        XCTAssertEqual(try pixels(BlocksView(empty, source: .core), amber), 0, "no values: no cells and no legend")
        XCTAssertLessThan(height(BlocksView(empty, source: .core)), height(load))
    }
}
