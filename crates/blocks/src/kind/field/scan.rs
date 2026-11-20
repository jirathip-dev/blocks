use super::{FileRef, Word};
use crate::expr::Expr;
use crate::kind::Check;

field! {
    /// Paper pages from the camera or picked photos: each is cornered, corrected to A4 and reviewed, then sent as one PDF's id.
    pub struct ScanField {
        max: Option<u32>,
        file: Option<FileRef>,
    }
}

impl ScanField {
    /// Its role in the drawn tree.
    pub const ROLE: &str = "group";

    /// The words it draws itself.
    pub const WORDS: &[Word] = &[
        ("scan", "scan pages", "สแกนเอกสาร"),
        ("rescan", "scan again", "สแกนใหม่"),
        (
            "scanHint",
            "makes one A4 PDF · up to {max} pages",
            "ได้ PDF ขนาด A4 หนึ่งไฟล์ · ไม่เกิน {max} หน้า",
        ),
        ("editPages", "edit pages", "แก้หน้า"),
        ("scanned1", "1 page · A4 · {kb} KB", "1 หน้า · A4 · {kb} KB"),
        ("scannedN", "{n} pages · A4 · {kb} KB", "{n} หน้า · A4 · {kb} KB"),
        ("scanOff", "scanning is off here", "สแกนไม่ได้ที่นี่"),
        ("cancel", "cancel", "ยกเลิก"),
        ("pickImages", "pick images", "เลือกรูป"),
        ("pageN", "page {n}", "หน้า {n}"),
        ("pageOf", "page {n} of {of}", "หน้า {n} จาก {of}"),
        ("seek", "looking for the page's edges", "กำลังหาขอบกระดาษ"),
        (
            "found",
            "page found: hold still and take it",
            "พบหน้ากระดาษ: ถือนิ่งๆ แล้วถ่าย",
        ),
        (
            "noEdge",
            "no page edge found: fill the frame with the page, or take it and set the corners by hand",
            "ไม่พบขอบกระดาษ: ให้กระดาษเต็มกรอบ หรือถ่ายแล้วตั้งมุมเอง",
        ),
        ("take", "take page {n}", "ถ่ายหน้า {n}"),
        ("done1", "done · 1 page", "เสร็จ · 1 หน้า"),
        ("doneN", "done · {n} pages", "เสร็จ · {n} หน้า"),
        ("retake", "retake", "ถ่ายใหม่"),
        ("usePage", "use page", "ใช้หน้านี้"),
        ("reset", "reset corners", "คืนมุมเดิม"),
        (
            "drag",
            "drag a corner onto the page's edge, or press space on it and move it with the arrow keys",
            "ลากมุมไปที่ขอบกระดาษ",
        ),
        ("tl", "top-left corner", "มุมบนซ้าย"),
        ("tr", "top-right corner", "มุมบนขวา"),
        ("br", "bottom-right corner", "มุมล่างขวา"),
        ("bl", "bottom-left corner", "มุมล่างซ้าย"),
        ("corners", "corners", "มุม"),
        ("rotate", "rotate", "หมุน"),
        ("delete", "delete", "ลบ"),
        ("earlier", "move earlier", "เลื่อนขึ้น"),
        ("later", "move later", "เลื่อนลง"),
        ("addPage", "add page", "เพิ่มหน้า"),
        (
            "making",
            "making the PDF · page {n} of {of}",
            "กำลังทำ PDF · หน้า {n} จาก {of}",
        ),
        ("noCam", "no camera here", "ไม่มีกล้อง"),
        (
            "noCamWhy",
            "pick photos of the pages instead: each one gets its corners found the same way",
            "เลือกรูปของแต่ละหน้าแทน",
        ),
        (
            "limit",
            "{n} of {n} pages: the most one scan takes",
            "{n} จาก {n} หน้า: สแกนได้มากที่สุดเท่านี้",
        ),
        ("review", "review", "ตรวจ"),
        ("strip", "pages, in order", "หน้าตามลำดับ"),
        ("denied", "the camera is blocked for this site", "กล้องถูกปิดสำหรับเว็บนี้"),
        (
            "deniedWhy",
            "allow it in the browser's settings, or pick photos of the pages",
            "เปิดได้ในการตั้งค่าเบราว์เซอร์ หรือเลือกรูปของแต่ละหน้า",
        ),
    ];

    #[cfg(feature = "schema")]
    pub(crate) fn sample() -> Self {
        let note = FileRef {
            id: "f-2".into(),
            name: Some("delivery-note.pdf".into()),
            src: None,
        };
        ScanField::new("note").label("Delivery note").max(20u32).file(note)
    }
}
