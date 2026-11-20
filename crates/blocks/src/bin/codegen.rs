use std::path::Path;

fn main() -> std::io::Result<()> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    if std::env::args().nth(1).as_deref() == Some("kinds") {
        return blocks::codegen::kinds(&root);
    }
    blocks::codegen::write(&root)
}
