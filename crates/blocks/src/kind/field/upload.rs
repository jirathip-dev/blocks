use serde::{Deserialize, Serialize};

use super::Word;
use crate::expr::Expr;
use crate::kind::{Check, Fields};

words!(Accept { Image, Pdf, Sheet });

wire! {
    /// A file the app holds, as its file handler answered it; `src` is a picture of it the app serves.
    pub struct FileRef {
        id: String,
        name: Option<String>,
        src: Option<String>,
    }
}

field! {
    /// Files or photos: each picked file goes to the app's file handler, and the field sends their ids.
    pub struct UploadField {
        accept: Option<Vec<Accept>>,
        capture: Option<bool>,
        many: Option<bool>,
        mb: Option<u32>,
        files: Option<Vec<FileRef>>,
    }
}

impl UploadField {
    /// Its role in the drawn tree.
    pub const ROLE: &str = "group";

    /// The words it draws itself.
    pub const WORDS: &[Word] = &[
        ("file1", "choose file", "เลือกไฟล์"),
        ("fileN", "add files", "เพิ่มไฟล์"),
        ("photo1", "choose photo", "เลือกรูป"),
        ("photoN", "add photos", "เพิ่มรูป"),
        ("camera", "take photo", "ถ่ายรูป"),
        ("replace", "replace", "เปลี่ยน"),
        ("remove", "remove", "ลบ"),
        ("retry", "retry", "ลองอีกครั้ง"),
        ("dismiss", "dismiss", "ปิด"),
        ("image", "images", "รูปภาพ"),
        ("pdf", "PDF", "PDF"),
        ("sheet", "sheets", "ไฟล์ตาราง"),
        ("or", " or ", " หรือ "),
        ("upTo", "up to {mb} MB", "ไม่เกิน {mb} MB"),
        ("each", "up to {mb} MB each", "ไม่เกิน {mb} MB ต่อไฟล์"),
        ("uploading", "uploading {p} %", "กำลังอัปโหลด {p} %"),
        ("failed", "upload failed", "อัปโหลดไม่สำเร็จ"),
        ("onlyType", "refused: only {types}", "ไม่รับ: รับเฉพาะ{types}"),
        ("tooBig", "refused: {size} is over {mb} MB", "ไม่รับ: {size} เกิน {mb} MB"),
        ("off", "uploads are off here", "อัปโหลดไม่ได้ที่นี่"),
        ("wait1", "waiting for {n} upload", "รออัปโหลด {n} ไฟล์"),
        ("waitN", "waiting for {n} uploads", "รออัปโหลด {n} ไฟล์"),
        (
            "stuck",
            "an upload failed: retry or remove it",
            "อัปโหลดไม่สำเร็จ: ลองอีกครั้งหรือลบ",
        ),
        ("files", "{label}, {n} files", "{label}, {n} ไฟล์"),
    ];

    #[cfg(feature = "schema")]
    pub(crate) fn sample() -> Self {
        let photo = FileRef {
            id: "f-1".into(),
            name: Some("crate.jpg".into()),
            src: None,
        };
        UploadField::new("photos")
            .label("Photos of the problem")
            .accept(vec![Accept::Image])
            .capture(true)
            .many(true)
            .mb(10u32)
            .files(vec![photo])
    }
}
