#[test]
fn the_bundle_exports_mount_and_carries_the_shell_style() {
    assert!(blocks::web::JS.contains("mount"), "web/dist/blocks.js has no mount");
    assert!(
        blocks::web::JS.contains("export{"),
        "web/dist/blocks.js is not an ES module"
    );
    assert!(
        blocks::web::CSS.contains(".b-sheet"),
        "web/dist/blocks.css has no shell style"
    );
    assert!(
        blocks::web::CSS.contains("@layer blocks"),
        "web/dist/blocks.css lost its layer"
    );
}
