/// `web/dist/blocks.js`: `mount`, the renderers and the stream, for a host with no Node.
pub const JS: &str = include_str!("dist/blocks.js");
/// `web/dist/blocks.css`: the renderers' and the shell's style layer.
pub const CSS: &str = include_str!("dist/blocks.css");
/// `web/dist/import.js`: the import kind's view, which `blocks.js` fetches as `./import.js` on its first draw; serve it beside `blocks.js`.
pub const IMPORT: &str = include_str!("dist/import.js");
/// `web/dist/scan.js`: the scanner a scan field loads on first use; serve it beside `JS` as `scan.js`.
pub const SCAN: &str = include_str!("dist/scan.js");
