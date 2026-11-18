// swift-tools-version: 6.2
import PackageDescription

let strict: [SwiftSetting] =
    [.swiftLanguageMode(.v6), .enableExperimentalFeature("StrictConcurrency=complete")]
    + (Context.environment["BLOCKS_STRICT"] == "1" ? [.treatAllWarnings(as: .error)] : [])

let package = Package(
    name: "Blocks",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "Blocks", targets: ["Blocks"]),
        .library(name: "BlocksUI", targets: ["BlocksUI"]),
    ],
    targets: [
        .target(name: "Blocks", path: "swift/Sources/Blocks", swiftSettings: strict),
        .target(name: "BlocksUI", dependencies: ["Blocks"], path: "swift/Sources/BlocksUI", swiftSettings: strict),
        .testTarget(
            name: "BlocksTests", dependencies: ["Blocks", "BlocksUI"], path: "swift/Tests/BlocksTests",
            swiftSettings: strict),
    ]
)
