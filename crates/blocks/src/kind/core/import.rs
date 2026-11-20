use serde::{Deserialize, Serialize};

use crate::kind::Block;

listed! { 33: Import(Import) = "import" }

words!(ImportType {
    Text,
    Number,
    Money,
    Date,
    Choice
});

wire! {
    /// A column the file brings: its key in the rows sent, its header, type, checks and other header names it matches.
    pub struct ImportColumn {
        key: String,
        label: String,
        #[serde(rename = "type")]
        kind: Option<ImportType>,
        required: Option<bool>,
        unique: Option<bool>,
        values: Option<Vec<String>>,
        also: Option<Vec<String>>,
    }
}

wire! {
    /// A row the app refused: its spreadsheet row, the column's key and why.
    pub struct Refused {
        row: u32,
        key: String,
        text: String,
    }
}

kind! {
    /// A spreadsheet import: pick an .xlsx or .csv, map its columns, see row errors, send the good rows as one action.
    pub struct Import {
        id: Option<String>,
        title: String,
        into: Option<String>,
        columns: Vec<ImportColumn>,
        action: Option<String>,
        max: Option<u32>,
        template: Option<bool>,
        error: Option<String>,
        refused: Option<Vec<Refused>>,
        done: Option<u32>,
    }
}

impl ImportColumn {
    /// A column with its key, header and type.
    #[must_use]
    pub fn new(key: &str, label: &str, kind: ImportType) -> Self {
        Self { key: key.into(), label: label.into(), kind: Some(kind), ..Self::default() }
    }
}

pub(super) fn sample() -> Vec<Block> {
    let mut sku = ImportColumn::new("sku", "SKU", ImportType::Text);
    sku.required = Some(true);
    sku.unique = Some(true);
    sku.also = Some(vec!["item code".into()]);
    let mut price = ImportColumn::new("price", "Price", ImportType::Money);
    price.required = Some(true);
    let mut cat = ImportColumn::new("cat", "Category", ImportType::Choice);
    cat.values = Some(vec!["Bakery".into(), "Dairy".into()]);
    let columns = vec![sku, ImportColumn::new("name", "Name", ImportType::Text), cat, price];
    vec![Block::Import(Box::new(
        Import::new("Import products", columns).id("products").into("Products").action("import"),
    ))]
}

impl Import {
    /// The words it draws itself.
    pub const WORDS: &[crate::kind::Word] = &[
        ("imTemplate", "download template", "ดาวน์โหลดแม่แบบ"),
        ("imDrop", "Drop a spreadsheet here", "วางไฟล์สเปรดชีตที่นี่"),
        ("imOr", "or", "หรือ"),
        ("imHint", ".xlsx or .csv · up to {max} rows", ".xlsx หรือ .csv · ไม่เกิน {max} แถว"),
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
        ("imMore", "{n} more rows, all checked", "อีก {n} แถว ตรวจแล้วทั้งหมด"),
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
        ("imNotNum", "“{v}” is not a number", "“{v}” ไม่ใช่ตัวเลข"),
        ("imNotDate", "“{v}” is not a date", "“{v}” ไม่ใช่วันที่"),
        ("imNotOne", "“{v}” is not one of {list}", "“{v}” ไม่อยู่ในรายการ {list}"),
        ("imTwice", "{v} is also on row {n}", "{v} ซ้ำกับแถว {n}"),
        ("imOld", "An old .xls file: save it as .xlsx or .csv", "ไฟล์ .xls แบบเก่า: บันทึกเป็น .xlsx หรือ .csv"),
        ("imNotSheet", "Not an .xlsx or .csv file", "ไม่ใช่ไฟล์ .xlsx หรือ .csv"),
        ("imTooMany", "{n} rows: more than the {max} allowed", "{n} แถว: เกิน {max} แถวที่รับได้"),
        ("imNoRows", "No rows in the file", "ไม่มีแถวในไฟล์"),
        ("imError", "error", "ข้อผิดพลาด"),
        ("imValues", "Allowed values", "ค่าที่ใช้ได้"),
    ];
}
