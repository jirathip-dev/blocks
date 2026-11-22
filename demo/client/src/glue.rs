use std::cell::RefCell;

use crate::Meter;

thread_local! {
    static APP: RefCell<Meter> = RefCell::new(Meter::default());
    static TEXT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

fn put(s: String) {
    TEXT.with(|t| *t.borrow_mut() = s.into_bytes());
}

/// Makes the buffer `len` zero bytes long and says where it is, for the page to write into.
#[no_mangle]
pub extern "C" fn text(len: usize) -> *const u8 {
    TEXT.with(|t| {
        let mut t = t.borrow_mut();
        t.clear();
        t.resize(len, 0);
        t.as_ptr()
    })
}

/// Where the buffer is now, for the page to read.
#[no_mangle]
pub extern "C" fn text_at() -> *const u8 {
    TEXT.with(|t| t.borrow().as_ptr())
}

/// How long the buffer is now.
#[no_mangle]
pub extern "C" fn text_len() -> usize {
    TEXT.with(|t| t.borrow().len())
}

/// Writes the whole screen's JSON into the buffer.
#[no_mangle]
pub extern "C" fn screen() {
    put(APP.with(|a| serde_json::to_string(a.borrow_mut().screen()).unwrap_or_default()));
}

/// Reads an action's JSON from the buffer and writes the answer's JSON into it; text that is no action gets `{}`.
#[no_mangle]
pub extern "C" fn act() {
    let asked = TEXT.with(|t| serde_json::from_slice::<blocks::Action>(&t.borrow()));
    let answer = asked
        .map(|a| APP.with(|app| app.borrow_mut().act(&a)))
        .unwrap_or_default();
    put(serde_json::to_string(&answer).unwrap_or_default());
}
