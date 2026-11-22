use serde_json::Value;

pub(super) struct Found {
    pub(super) value: Value,
    pub(super) around: bool,
    pub(super) closed: bool,
    pub(super) cut: bool,
    pub(super) open: usize,
}

pub(super) fn find(text: &str) -> Option<Found> {
    text.char_indices()
        .filter(|(_, c)| *c == '{' || *c == '[')
        .take(32)
        .find_map(|(i, _)| {
            let rest = text.get(i..)?;
            let shut = close(rest)?;
            let value: Value = serde_json::from_str(&shut.json).ok()?;
            let blocks = value.is_object() || value.as_array().is_some_and(|l| l.iter().all(Value::is_object));
            let after = rest.get(shut.end..).unwrap_or_default();
            let around = !text.get(..i)?.trim().is_empty() || !after.trim().is_empty();
            blocks.then_some(Found {
                value,
                around,
                closed: shut.mended,
                cut: shut.cut,
                open: shut.open,
            })
        })
}

struct Shut {
    json: String,
    end: usize,
    mended: bool,
    cut: bool,
    open: usize,
}

fn close(s: &str) -> Option<Shut> {
    let mut json = String::with_capacity(s.len() + 8);
    let mut stack = vec![];
    let mut safe = (0, 0);
    let (mut string, mut escape, mut mended) = (false, false, false);
    for (i, c) in s.char_indices() {
        if string {
            json.push(c);
            (string, escape) = match (escape, c) {
                (false, '\\') => (true, true),
                (false, '"') => (false, false),
                _ => (true, false),
            };
            continue;
        }
        match c {
            '"' => string = true,
            '{' => stack.push('}'),
            '[' => stack.push(']'),
            '}' | ']' => {
                let kept = json.trim_end().strip_suffix(',').map(str::len);
                if let Some(n) = kept {
                    json.truncate(n);
                    mended = true;
                }
                if stack.pop() != Some(c) {
                    return None;
                }
            }
            _ => {}
        }
        json.push(c);
        if "{[]}".contains(c) {
            safe = (json.len(), stack.len());
        }
        if stack.is_empty() {
            let end = i + c.len_utf8();
            return Some(Shut {
                json,
                end,
                mended,
                cut: false,
                open: 0,
            });
        }
    }
    json.truncate(safe.0);
    stack.truncate(safe.1);
    json.extend(stack.iter().rev());
    Some(Shut {
        json,
        end: s.len(),
        mended: true,
        cut: true,
        open: safe.1,
    })
}
