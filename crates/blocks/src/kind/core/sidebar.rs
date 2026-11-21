use serde::{Deserialize, Serialize};

use crate::kind::{Block, Tone};

listed! { 37: Sidebar(Sidebar) = "sidebar" }

wire! {
    /// A count on a link; the `bad` tone draws it as needing attention.
    pub struct SideBadge {
        count: u64,
        tone: Option<Tone>,
    }
}

wire! {
    /// A sidebar link: its label, page, glyph icon, badge and whether it is the current page.
    pub struct SideLink {
        label: String,
        href: String,
        icon: Option<String>,
        current: Option<bool>,
        badge: Option<SideBadge>,
    }
}

wire! {
    /// A group's row: a link, or with `children` a parent that opens to show its links.
    pub struct SideItem {
        label: String,
        href: Option<String>,
        icon: Option<String>,
        current: Option<bool>,
        badge: Option<SideBadge>,
        open: Option<bool>,
        children: Option<Vec<SideLink>>,
    }
}

wire! {
    /// A run of rows under an optional title.
    pub struct SideGroup {
        title: Option<String>,
        links: Vec<SideItem>,
    }
}

kind! {
    /// A side navigation: an icon rail that opens on hover or pin, a drawer on a phone.
    pub struct Sidebar {
        id: Option<String>,
        label: String,
        brand: Option<SideLink>,
        groups: Vec<SideGroup>,
        footer: Option<Vec<SideLink>>,
        empty: Option<String>,
    }
}

fn page(label: &str, href: &str) -> SideLink {
    SideLink {
        label: label.into(),
        href: href.into(),
        ..SideLink::default()
    }
}

fn link(label: &str, icon: &str, href: &str) -> SideLink {
    SideLink {
        icon: Some(icon.into()),
        ..page(label, href)
    }
}

fn item(l: SideLink) -> SideItem {
    SideItem {
        label: l.label,
        href: Some(l.href),
        icon: l.icon,
        current: l.current,
        badge: l.badge,
        ..SideItem::default()
    }
}

pub(super) fn sample() -> Vec<Block> {
    let inbox = SideLink {
        current: Some(true),
        badge: Some(SideBadge {
            count: 12,
            tone: None,
        }),
        ..link("Inbox", "✉", "#inbox")
    };
    let alerts = SideLink {
        badge: Some(SideBadge {
            count: 3,
            tone: Some(Tone::Bad),
        }),
        ..link("Alerts", "⚑", "#alerts")
    };
    let projects = SideItem {
        href: None,
        open: Some(true),
        children: Some(vec![
            page("Spring launch", "#spring"),
            page("Archive", "#archive"),
        ]),
        ..item(link("Projects", "◆", "#projects"))
    };
    let groups = vec![
        SideGroup {
            title: None,
            links: vec![item(link("Home", "⌂", "#home")), item(inbox)],
        },
        SideGroup {
            title: Some("Work".into()),
            links: vec![projects, item(alerts)],
        },
    ];
    vec![Block::Sidebar(Box::new(
        Sidebar::new("main", groups)
            .id("side")
            .brand(link("Workspace", "◈", "#home"))
            .footer(vec![link("Settings", "⚙", "#settings")])
            .empty("No pages yet"),
    ))]
}
