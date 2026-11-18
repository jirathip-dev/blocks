use std::path::Path;

fn main() -> std::io::Result<()> {
    blocks::codegen::write(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
}
