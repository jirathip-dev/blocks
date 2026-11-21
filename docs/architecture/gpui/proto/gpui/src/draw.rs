use std::collections::BTreeMap;

use blocks::{Block, Card, Composer, List, Part, Prose, Row, Screen, Span, Text, TextStyle, Toned};
use gpui::{
    div, prelude::*, px, AnyElement, Context, Div, Entity, FontStyle, FontWeight, HighlightStyle, Role, SharedString,
    Stateful, StyledText,
};

use crate::field::{Field, Sent};
use crate::look::Look;
use crate::stage::{Event, Stage};
use crate::text::shown;

pub struct Cx<'a, 'b> {
    pub look: Look,
    pub fields: &'a mut BTreeMap<String, Entity<Field>>,
    pub cx: &'a mut Context<'b, Stage>,
}

fn shell(b: &Block, n: usize, role: Role, name: &str) -> Stateful<Div> {
    let id = b
        .id()
        .map_or_else(|| format!("{}#{n}", b.kind()), |i| format!("block:{i}"));
    div()
        .id(SharedString::from(id.clone()))
        .role(role)
        .aria_label(SharedString::from(name.to_owned()))
        .accessibility_id(id)
}

fn blocks(list: &[Block], d: &mut Cx<'_, '_>) -> Vec<AnyElement> {
    list.iter().enumerate().map(|(n, b)| block(b, n, d)).collect()
}

pub fn block(b: &Block, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    match b {
        Block::Screen(x) => screen(b, x, n, d),
        Block::List(x) => list(b, x, n, d),
        Block::Row(x) => row(b, x, n, d),
        Block::Card(x) => card(b, x, n, d),
        Block::Text(x) => text(b, x, n, d),
        Block::Prose(x) => prose(b, x, n, d),
        Block::Composer(x) => composer(b, x, n, d),
        _ => fallback(b, n, d),
    }
}

fn button(label: &str, look: Look) -> Div {
    div()
        .px_3()
        .py_1()
        .rounded_md()
        .border_1()
        .border_color(look.line)
        .bg(look.card)
        .cursor_pointer()
        .child(SharedString::from(label.to_owned()))
}

fn screen(b: &Block, x: &Screen, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    let title = x.title.as_deref().unwrap_or_default();
    let acts = x.actions.as_deref().unwrap_or_default();
    shell(b, n, Role::Group, title)
        .flex()
        .flex_col()
        .gap_3()
        .p_4()
        .children(x.title.as_ref().map(|t| {
            div()
                .text_size(px(22.0))
                .font_weight(FontWeight::BOLD)
                .child(SharedString::from(t.clone()))
        }))
        .children((!acts.is_empty()).then(|| {
            div()
                .flex()
                .flex_wrap()
                .gap_2()
                .children(acts.iter().map(|a| button(&a.label, d.look)))
        }))
        .children(blocks(x.blocks.as_deref().unwrap_or_default(), d))
        .into_any_element()
}

fn list(b: &Block, x: &List, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    shell(b, n, Role::List, "list")
        .flex()
        .flex_col()
        .children(blocks(&x.rows, d))
        .into_any_element()
}

fn toned(s: &Toned, look: Look) -> Div {
    let (text, color) = match s {
        Toned::Text(s) => (s.clone(), look.mute),
        Toned::Label(l) => (shown(&l.text, &BTreeMap::new(), 0.0), look.tone(l.tone.as_ref())),
    };
    div()
        .text_size(px(12.0))
        .text_color(color)
        .child(SharedString::from(text))
}

fn label(text: String, color: gpui::Rgba) -> Div {
    div().text_color(color).child(SharedString::from(text))
}

fn tapped(el: Stateful<Div>, b: &Block, on: bool, d: &mut Cx<'_, '_>) -> Stateful<Div> {
    let Some(id) = b.id().filter(|_| on).map(str::to_owned) else {
        return el;
    };
    el.cursor_pointer()
        .on_click(d.cx.listener(move |_, _, _, cx| cx.emit(Event::Tap(id.clone()))))
}

fn row(b: &Block, x: &Row, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    let look = d.look;
    let none = BTreeMap::new();
    let head = div()
        .flex()
        .items_center()
        .gap_3()
        .child(
            div()
                .flex_1()
                .min_w_0()
                .child(SharedString::from(x.title.clone()))
                .children(x.subtitle.as_ref().map(|s| toned(s, look))),
        )
        .children(x.value.as_ref().map(|v| label(shown(v, &none, 0.0), look.mute)))
        .children(
            x.badge
                .as_ref()
                .map(|l| label(shown(&l.text, &none, 0.0), look.tone(l.tone.as_ref()))),
        );
    let rounds = x.rounds.iter().flatten();
    let nested: Vec<AnyElement> = rounds
        .flat_map(|r| blocks(r.blocks.as_deref().unwrap_or_default(), d))
        .collect();
    let el = shell(b, n, Role::ListItem, &x.title)
        .py_2()
        .border_b_1()
        .border_color(look.line)
        .child(head)
        .children(nested);
    tapped(el, b, x.tap.is_some(), d).into_any_element()
}

fn card(b: &Block, x: &Card, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    let look = d.look;
    let none = BTreeMap::new();
    let title = x.title.as_deref().unwrap_or_default();
    let head = div()
        .flex()
        .flex_wrap()
        .items_center()
        .gap_2()
        .child(
            div()
                .font_weight(FontWeight::BOLD)
                .child(SharedString::from(title.to_owned())),
        )
        .children(
            x.badge
                .as_ref()
                .map(|l| label(shown(&l.text, &none, 0.0), look.tone(l.tone.as_ref()))),
        )
        .children(x.meta.as_ref().map(|m| label(shown(m, &none, 0.0), look.mute)));
    let inner = blocks(x.blocks.as_deref().unwrap_or_default(), d);
    let buttons = blocks(x.buttons.as_deref().unwrap_or_default(), d);
    let el = shell(b, n, Role::Group, title)
        .flex()
        .flex_col()
        .gap_2()
        .p_3()
        .rounded_lg()
        .border_1()
        .border_color(x.tone.as_ref().map_or(look.line, |t| look.tone(Some(t))))
        .bg(look.card)
        .child(head)
        .children(x.subtitle.as_ref().map(|s| toned(s, look)))
        .children(inner)
        .child(div().flex().flex_wrap().gap_2().children(buttons));
    tapped(el, b, x.tap.is_some(), d).into_any_element()
}

fn text(b: &Block, x: &Text, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    let s = x.markdown.as_deref().or(x.text.as_deref()).unwrap_or_default();
    let small = x.style == Some(TextStyle::Footnote);
    shell(b, n, Role::Paragraph, s)
        .text_color(d.look.tone(x.tone.as_ref()))
        .text_size(px(if small { 12.0 } else { 14.0 }))
        .child(SharedString::from(s.to_owned()))
        .into_any_element()
}

fn spans(spans: &[Span], look: Look) -> StyledText {
    let mut all = String::new();
    let mut marks = vec![];
    for s in spans {
        let from = all.len();
        all.push_str(&s.text);
        let style = HighlightStyle {
            font_weight: s.bold.unwrap_or(false).then_some(FontWeight::BOLD),
            font_style: s.italic.unwrap_or(false).then_some(FontStyle::Italic),
            background_color: s.code.unwrap_or(false).then_some(look.line.into()),
            color: s.link.is_some().then_some(look.link.into()),
            ..HighlightStyle::default()
        };
        marks.push((from..all.len(), style));
    }
    StyledText::new(all).with_highlights(marks)
}

fn part(p: &Part, look: Look) -> Div {
    match p {
        Part::Heading { level, spans: s } => div()
            .text_size(px(24.0 - 2.0 * f32::from(*level).min(4.0)))
            .font_weight(FontWeight::BOLD)
            .child(spans(s, look)),
        Part::Para { spans: s } => div().child(spans(s, look)),
        Part::List { ordered, items } => {
            div()
                .flex()
                .flex_col()
                .gap_1()
                .children(items.iter().enumerate().map(|(i, it)| {
                    let mark = if *ordered { format!("{}.", i + 1) } else { "•".into() };
                    div()
                        .flex()
                        .gap_2()
                        .child(div().text_color(look.mute).child(SharedString::from(mark)))
                        .child(div().flex_1().min_w_0().child(spans(it, look)))
                }))
        }
        Part::Quote { spans: s } => div()
            .pl_3()
            .border_l_2()
            .border_color(look.line)
            .text_color(look.mute)
            .child(spans(s, look)),
        Part::Code { text, .. } => div()
            .p_2()
            .rounded_md()
            .bg(look.card)
            .border_1()
            .border_color(look.line)
            .font_family("Menlo")
            .text_size(px(13.0))
            .child(SharedString::from(text.clone())),
        Part::Rule => div().h(px(1.0)).bg(look.line),
    }
}

fn prose(b: &Block, x: &Prose, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    let look = d.look;
    shell(b, n, Role::Document, "prose")
        .flex()
        .flex_col()
        .gap_2()
        .children(x.parts.iter().map(|p| part(p, look)))
        .into_any_element()
}

fn composer(b: &Block, x: &Composer, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    let look = d.look;
    let key = b.id().unwrap_or("composer").to_owned();
    let hint: SharedString = x.placeholder.clone().unwrap_or_default().into();
    let action = x.action.clone();
    let field = match d.fields.get(&key) {
        Some(f) => f.clone(),
        None => {
            let f = d.cx.new(|cx| Field::new(hint.clone(), look, cx));
            d.cx.subscribe(&f, move |_, _, sent: &Sent, cx| {
                cx.emit(Event::Send {
                    action: action.clone(),
                    text: sent.0.clone(),
                });
            })
            .detach();
            d.fields.insert(key, f.clone());
            f
        }
    };
    shell(b, n, Role::Group, x.label.as_deref().unwrap_or("composer"))
        .flex()
        .items_center()
        .gap_2()
        .p_2()
        .rounded_lg()
        .border_1()
        .border_color(look.line)
        .bg(look.card)
        .child(field)
        .child(button("Send", look))
        .into_any_element()
}

fn fallback(b: &Block, n: usize, d: &mut Cx<'_, '_>) -> AnyElement {
    let name = format!("{} {}", b.kind(), b.id().unwrap_or_default());
    shell(b, n, Role::Group, &name)
        .p_2()
        .rounded_md()
        .border_1()
        .border_dashed()
        .border_color(d.look.line)
        .text_color(d.look.mute)
        .child(SharedString::from(name.clone()))
        .into_any_element()
}
