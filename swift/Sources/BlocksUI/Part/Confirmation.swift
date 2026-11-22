import Blocks
import SwiftUI

internal struct Confirmation: Sendable, Equatable {
    internal let title: String
    internal let message: String?
    internal let accept: String
    internal let destructive: Bool
}

extension Confirmation {
    internal init?(_ confirm: Confirm?, label: String?, destructive: Bool = false) {
        guard confirm != nil || destructive else { return nil }
        self.init(
            title: confirm?.title ?? label ?? "", message: confirm?.message, accept: confirm?.ok ?? label ?? "OK",
            destructive: destructive || confirm?.destructive == true)
    }
}
