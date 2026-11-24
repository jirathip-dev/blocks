use super::Word;
use crate::expr::Expr;
use crate::kind::Check;

field! {
    /// A search box: filters a list or table on the screen, or sends its text in a live form.
    pub struct SearchField {
        value: Option<String>,
        placeholder: Option<String>,
        filters: Option<String>,
    }
}

impl SearchField {
    /// Its role in the drawn tree.
    pub const ROLE: &str = "searchbox";

    /// The words it draws itself.
    pub const WORDS: &[Word] = &[
        ("clear", "clear", "ล้าง"),
        ("hits", "{n} of {m}", "{n} จาก {m}"),
        ("none", "no match", "ไม่พบ"),
        ("busy", "searching", "กำลังค้นหา"),
        ("nomatch", "No rows match “{q}”.", "ไม่มีแถวที่ตรงกับ “{q}”"),
    ];

    #[cfg(feature = "schema")]
    pub(crate) fn sample() -> Self {
        SearchField::new("q")
            .label("Search")
            .value("ops")
            .placeholder("Search every app")
    }
}
