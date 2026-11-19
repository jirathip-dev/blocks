use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{LazyLock, Mutex};
use std::thread;

use blocks::{Block, Hello, Put, SCHEMA_VERSION, Shelf, Sync, Synced};
use blocks_bench::{Rows, Update, lock};

const KEY: &str = "/rows";
const PAGE: &str = r#"<!doctype html><meta charset=utf-8><link rel=stylesheet href=/blocks.css><body><div id=root></div><script type=module>import { mount } from "/blocks.js"; const at = (p) => ({ compact: p, wide: p }); mount({ root: document.getElementById("root"), layout: { format: 1, root: { type: "nav", id: "root", place: at("inline"), transition: "push", slots: { main: [{ type: "screen", id: "rows", source: "core", path: "/rows", place: at("inline"), transition: "push" }] } } }, url: (s, p) => `/${s}${p}` });</script>"#;

struct Server {
    rows: Mutex<Rows>,
    shelf: Mutex<Shelf<String>>,
    streams: Mutex<Vec<TcpStream>>,
    epoch: Mutex<u64>,
}

static SERVER: LazyLock<Server> = LazyLock::new(|| Server {
    rows: Mutex::default(),
    shelf: Mutex::default(),
    streams: Mutex::default(),
    epoch: Mutex::new(0),
});

fn screen(r: &Rows) -> io::Result<Block> {
    let rows: Vec<_> = r
        .rows
        .iter()
        .map(|x| serde_json::json!({ "type": "row", "id": x.id, "title": x.title, "subtitle": x.subtitle, "value": x.value }))
        .collect();
    let s = serde_json::json!({ "type": "screen", "id": "rows", "title": "Rows", "blocks": rows });
    Ok(serde_json::from_value(s)?)
}

fn reset() -> io::Result<()> {
    let fresh = Rows::default();
    let mut shelf = Shelf::default();
    shelf
        .put(&KEY.to_owned(), KEY, &screen(&fresh)?)
        .map_err(io::Error::other)?;
    *lock(&SERVER.rows) = fresh;
    *lock(&SERVER.shelf) = shelf;
    lock(&SERVER.streams).clear();
    *lock(&SERVER.epoch) += 1;
    Ok(())
}

fn bump(u: Update) -> io::Result<()> {
    let mut r = lock(&SERVER.rows);
    r.apply(u);
    let put = lock(&SERVER.shelf)
        .put(&KEY.to_owned(), KEY, &screen(&r)?)
        .map_err(io::Error::other)?;
    if let Put::Changed(d) = put {
        let event = format!("data: {}\n\n", d.frame);
        lock(&SERVER.streams).retain_mut(|s| s.write_all(event.as_bytes()).is_ok());
    }
    Ok(())
}

fn reply(s: &mut TcpStream, status: &str, kind: &str, cache: bool, body: &[u8]) -> io::Result<()> {
    let cache = if cache {
        "cache-control: max-age=3600\r\n"
    } else {
        "cache-control: no-store\r\n"
    };
    let head = format!(
        "HTTP/1.1 {status}\r\ncontent-type: {kind}\r\n{cache}content-length: {}\r\n\r\n",
        body.len()
    );
    s.write_all(head.as_bytes())?;
    s.write_all(body)
}

fn asset(name: &str) -> io::Result<Vec<u8>> {
    std::fs::read(format!("{}/../web/dist/{name}", env!("CARGO_MANIFEST_DIR")))
}

fn serve(mut s: TcpStream) -> io::Result<()> {
    let mut r = BufReader::new(s.try_clone()?);
    loop {
        let mut line = String::new();
        if r.read_line(&mut line)? == 0 {
            return Ok(());
        }
        let mut parts = line.split_whitespace();
        let (method, path) = (
            parts.next().unwrap_or_default().to_owned(),
            parts.next().unwrap_or_default().to_owned(),
        );
        let mut len = 0;
        loop {
            let mut h = String::new();
            r.read_line(&mut h)?;
            if h.trim().is_empty() {
                break;
            }
            if let Some((k, v)) = h.split_once(':')
                && k.eq_ignore_ascii_case("content-length")
            {
                len = v.trim().parse().unwrap_or(0);
            }
        }
        let mut body = vec![0; len];
        r.read_exact(&mut body)?;
        let route = path.split('?').next().unwrap_or_default();
        match (method.as_str(), route) {
            ("GET", "/") => {
                reset()?;
                reply(&mut s, "200 OK", "text/html", false, PAGE.as_bytes())?;
            }
            ("GET", "/blocks.js") => reply(&mut s, "200 OK", "text/javascript", true, &asset("blocks.js")?)?,
            ("GET", "/blocks.css") => reply(&mut s, "200 OK", "text/css", true, &asset("blocks.css")?)?,
            ("GET", "/core/stream") => {
                let epoch = *lock(&SERVER.epoch);
                let hello = Hello {
                    v: SCHEMA_VERSION,
                    sid: format!("s{epoch}"),
                    epoch: format!("e{epoch}"),
                    keys: 16,
                };
                let head = "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\ncache-control: no-store\r\n\r\n";
                s.write_all(format!("{head}event: hello\ndata: {}\n\n", serde_json::to_string(&hello)?).as_bytes())?;
                lock(&SERVER.streams).push(s);
                return Ok(());
            }
            ("POST", p) if p.starts_with("/core/stream/") => {
                let sync: Sync = serde_json::from_slice(&body)?;
                let shelf = lock(&SERVER.shelf);
                let keys = sync
                    .open
                    .iter()
                    .map(|h| shelf.state(&h.k, &h.k, h.rev))
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(io::Error::other)?;
                drop(shelf);
                reply(
                    &mut s,
                    "200 OK",
                    "application/json",
                    false,
                    &serde_json::to_vec(&Synced { keys })?,
                )?;
            }
            ("POST", p) => match p.strip_prefix("/bump/").and_then(Update::named) {
                Some(u) => {
                    bump(u)?;
                    reply(&mut s, "204 No Content", "text/plain", false, b"")?;
                }
                None => reply(&mut s, "404 Not Found", "text/plain", false, b"")?,
            },
            _ => reply(&mut s, "404 Not Found", "text/plain", false, b"")?,
        }
    }
}

fn main() -> io::Result<()> {
    reset()?;
    let l = TcpListener::bind("127.0.0.1:0")?;
    writeln!(io::stdout(), "http://{}", l.local_addr()?)?;
    for s in l.incoming() {
        let s = s?;
        s.set_nodelay(true)?;
        thread::spawn(move || serve(s));
    }
    Ok(())
}
