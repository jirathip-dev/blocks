// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Blocks",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [.library(name: "Blocks", targets: ["Blocks"])],
    targets: [
        .target(name: "Blocks"),
        .testTarget(name: "BlocksTests", dependencies: ["Blocks"]),
    ]
)
