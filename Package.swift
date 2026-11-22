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
        .library(name: "BlocksSnapshot", targets: ["BlocksSnapshot"]),
        .executable(name: "blocks-snap", targets: ["blocks-snap"]),
    ],
    targets: [
        .target(name: "Blocks", path: "swift/Sources/Blocks", swiftSettings: strict),
        .target(name: "BlocksUI", dependencies: ["Blocks"], path: "swift/Sources/BlocksUI", swiftSettings: strict),
        .target(
            name: "BlocksSnapshot", dependencies: ["Blocks", "BlocksUI"], path: "swift/Sources/BlocksSnapshot",
            swiftSettings: strict),
        .executableTarget(
            name: "blocks-snap", dependencies: ["Blocks", "BlocksUI", "BlocksSnapshot"], path: "swift/Sources/blocks-snap",
            swiftSettings: strict),
        .testTarget(
            name: "BlocksTests", dependencies: ["Blocks", "BlocksUI", "BlocksSnapshot"], path: "swift/Tests/BlocksTests",
            swiftSettings: strict),
        .testTarget(
            name: "AppFixtureTests", dependencies: ["Blocks", "BlocksUI", "BlocksSnapshot"],
            path: "swift/Tests/AppFixtureTests", swiftSettings: strict),
        .testTarget(name: "BlocksAPITests", dependencies: ["Blocks"], path: "swift/Tests/BlocksAPITests", swiftSettings: strict),
    ]
)
