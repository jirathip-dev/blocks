/// `web/dist/blocks.js`: `mount`, the renderers and the stream, for a host with no Node.
pub const JS: &str = include_str!("../../../web/dist/blocks.js");
/// `web/dist/blocks.css`: the renderers' and the shell's style layer.
pub const CSS: &str = include_str!("../../../web/dist/blocks.css");
/// `web/dist/sheet.js`: the import kind's .xlsx and .csv reader and writer, which `blocks.js` loads as `./sheet.js` on first use.
pub const SHEET: &str = include_str!("../../../web/dist/sheet.js");
