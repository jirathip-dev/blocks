/// Whether a link may be written or opened: http, https, mailto or relative.
public func linkable(_ url: String) -> Bool {
    let bare = url.unicodeScalars.filter { $0.value > 0x20 && !(0x7f...0x9f).contains($0.value) }
    let head = String(String.UnicodeScalarView(bare)).prefix { !"/?#".contains($0) }
    guard let colon = head.firstIndex(of: ":") else { return true }
    return ["http", "https", "mailto"].contains(head[..<colon].lowercased())
}
