use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::kind::{Block, Word};

listed! { 34: Import(Import) = "import" }

words!(ImportType {
    Text,
    Number,
    Money,
    Date,
    Choice
});

wire! {
    /// A column the screen takes: its key in the match, its header, type, whether it is required and its allowed values.
    pub struct ImportColumn {
        key: String,
        label: String,
        #[serde(rename = "type")]
        kind: Option<ImportType>,
        required: Option<bool>,
        values: Option<Vec<String>>,
    }
}

wire! {
    /// A file the app sends: its name and where to fetch it.
    pub struct FileLink {
        name: String,
        src: String,
    }
}

wire! {
    /// The picked file as the app's server read it: its file handler id, name, size in bytes, row count and sheets.
    pub struct ImportFile {
        id: String,
        name: String,
        size: Option<u32>,
        rows: u32,
        sheet: Option<String>,
        sheets: Option<Vec<String>>,
    }
}

wire! {
    /// A row of the file: its spreadsheet row number, its cells and the server's reasons, both by column key.
    pub struct ImportRow {
        n: u32,
        cells: BTreeMap<String, String>,
        bad: Option<BTreeMap<String, String>>,
    }
}

wire! {
    /// The server's answer to `read`: the file, its headers, the match (column key to header), the first rows and every bad row.
    pub struct ImportSheet {
        file: ImportFile,
        headers: Vec<String>,
        map: BTreeMap<String, String>,
        rows: Vec<ImportRow>,
        bad: Option<Vec<ImportRow>>,
    }
}

wire! {
    /// What the app took at import: how many rows, how many were left out, and a file of those.
    pub struct ImportDone {
        count: u32,
        left: Option<u32>,
        file: Option<FileLink>,
    }
}

kind! {
    /// A spreadsheet import the app's server reads: upload a file, check the column match and the row errors, confirm one action.
    pub struct Import {
        id: Option<String>,
        title: String,
        into: Option<String>,
        columns: Vec<ImportColumn>,
        accept: Option<Vec<String>>,
        mb: Option<u32>,
        template: Option<FileLink>,
        read: Option<String>,
        action: Option<String>,
        sheet: Option<ImportSheet>,
        done: Option<ImportDone>,
        error: Option<String>,
        refused: Option<Vec<ImportRow>>,
    }
}

impl ImportColumn {
    /// A column with its key, header and type.
    #[must_use]
    pub fn new(key: &str, label: &str, kind: ImportType) -> Self {
        Self {
            key: key.into(),
            label: label.into(),
            kind: Some(kind),
            ..Self::default()
        }
    }
}

impl Import {
    /// The words it draws itself.
    pub const WORDS: &[Word] = &[
        ("imTemplate", "download template", "ดาวน์โหลดแม่แบบ"),
        ("imDrop", "Drop a spreadsheet here", "วางไฟล์สเปรดชีตที่นี่"),
        ("imOr", "or", "หรือ"),
        ("imHint", "{types} · up to {mb} MB", "{types} · ไม่เกิน {mb} MB"),
        ("imNeeds", "The file needs", "ไฟล์ต้องมี"),
        ("imMay", "and may have", "และอาจมี"),
        ("imReq", "required", "ต้องมี"),
        ("imAnother", "choose another file", "เลือกไฟล์อื่น"),
        ("imRows", "{n} rows", "{n} แถว"),
        ("imSheet", "sheet", "ชีต"),
        ("imCols", "Columns", "คอลัมน์"),
        ("imNone", "— not in the file", "— ไม่มีในไฟล์"),
        ("imSkip", "Not imported: {list}", "ไม่นำเข้า: {list}"),
        ("imEg", "e.g. {s}", "เช่น {s}"),
        ("imPickFor", "required: pick a column", "ต้องมี: เลือกคอลัมน์"),
        ("imPreview", "Rows", "แถว"),
        ("imSum", "Columns: {n} of {m} matched", "คอลัมน์: ตรงกัน {n} จาก {m}"),
        ("imChange", "change", "เปลี่ยน"),
        ("imAll", "all {n}", "ทั้งหมด {n}"),
        ("imErrs", "{n} with errors", "มีข้อผิดพลาด {n}"),
        ("imMore", "{n} more rows, all checked by the server", "อีก {n} แถว เซิร์ฟเวอร์ตรวจแล้วทั้งหมด"),
        ("imGo", "import {n} rows", "นำเข้า {n} แถว"),
        ("imNothing", "nothing to import", "ไม่มีแถวให้นำเข้า"),
        ("imLeft", "{n} rows with errors are left out", "ไม่นำเข้า {n} แถวที่มีข้อผิดพลาด"),
        ("imFix", "pick a column for {c}", "เลือกคอลัมน์สำหรับ {c}"),
        ("imAsk", "Import {n} rows into {t}?", "นำเข้า {n} แถวไปที่ {t}?"),
        ("imSafe", "Your file is not changed.", "ไฟล์ของคุณไม่เปลี่ยน"),
        ("imBack", "back", "ย้อนกลับ"),
        ("imSending", "importing", "กำลังนำเข้า"),
        ("imDone", "rows imported into {t}", "แถวนำเข้าไปที่ {t} แล้ว"),
        ("imLeftOut", "{n} rows were left out", "ไม่ได้นำเข้า {n} แถว"),
        ("imLeftDl", "download left-out rows", "ดาวน์โหลดแถวที่ไม่ได้นำเข้า"),
        ("imAgain", "import another file", "นำเข้าไฟล์อื่น"),
        ("imRow", "row", "แถว"),
        ("imOff", "import is off here", "นำเข้าไม่ได้ที่นี่"),
        (
            "imNoJs",
            "Importing a file needs JavaScript. The template above works without it. The file needs these columns:",
            "การนำเข้าไฟล์ต้องใช้ JavaScript แม่แบบด้านบนใช้ได้โดยไม่ต้องใช้ ไฟล์ต้องมีคอลัมน์เหล่านี้:",
        ),
        ("imCancel", "cancel", "ยกเลิก"),
        ("imReading", "reading the file on the server", "เซิร์ฟเวอร์กำลังอ่านไฟล์"),
        ("imChecking", "checking the rows again with these columns", "กำลังตรวจแถวอีกครั้งตามคอลัมน์นี้"),
        ("imNoAnswer", "the server didn't answer", "เซิร์ฟเวอร์ไม่ตอบ"),
        ("imWait", "waiting for the server", "รอเซิร์ฟเวอร์"),
    ];
}

pub(super) fn sample() -> Vec<Block> {
    let mut sku = ImportColumn::new("sku", "SKU", ImportType::Text);
    sku.required = Some(true);
    let mut price = ImportColumn::new("price", "Price ฿", ImportType::Money);
    price.required = Some(true);
    let mut cat = ImportColumn::new("cat", "Category", ImportType::Choice);
    cat.values = Some(vec!["Bakery".into(), "Dairy".into()]);
    let columns = vec![sku, ImportColumn::new("name", "Name", ImportType::Text), cat, price];
    let template = FileLink {
        name: "products.xlsx".into(),
        src: "https://example.com/files/template-products.xlsx".into(),
    };
    vec![Block::Import(Box::new(
        Import::new("Import products", columns)
            .id("products")
            .into("Products")
            .mb(10u32)
            .template(template)
            .read("read")
            .action("import"),
    ))]
}
