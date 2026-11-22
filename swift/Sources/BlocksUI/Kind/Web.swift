#if !os(watchOS)
    import Blocks
    import SwiftUI
    import WebKit

    internal struct WebBlock: View {
        @Environment(\.look) private var look
        @State private var page: WebPage = {
            var configuration = WebPage.Configuration()
            configuration.websiteDataStore = .nonPersistent()
            return WebPage(configuration: configuration)
        }()
        internal let block: Web

        internal var body: some View {
            let height = CGFloat(block.height)
            if let url = URL(string: block.src), url.scheme == "https" || url.scheme == "http" {
                WebView(page).frame(height: height)
                    .onAppear { _ = page.load(URLRequest(url: url)) }
            } else {
                Color.clear.frame(maxWidth: .infinity).frame(height: height).surface(look, radius: 12)
            }
        }
    }
#endif
