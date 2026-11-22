use serde::{Deserialize, Serialize};

use super::{AppBlock, Fields};

kinds! {
    screen { Screen(Screen) = "screen" }
    modal { Modal(Modal) = "modal", Sheet(Modal) = "sheet" }
    section { Section(Section) = "section" }
    list { List(List) = "list" }
    row { Row(Row) = "row" }
    card { Card(Card) = "card" }
    choice { Choice(Choice) = "choice" }
    form { Form(Form) = "form", Config(Form) = "config" }
    secret { Secret(Secret) = "secret" }
    run { Run(Run) = "run" }
    button { Button(Button) = "button" }
    chips { Chips(Chips) = "chips" }
    stat { Stat(Stat) = "stat" }
    text { Text(Text) = "text" }
    images { Images(Images) = "images" }
    web { Web(Web) = "web" }
    diff { Diff(Diff) = "diff" }
    editor { Editor(Editor) = "editor" }
    scene { Scene(Scene) = "scene" }
    diagram { Diagram(Diagram) = "diagram" }
    composer { Composer(Composer) = "composer" }
    lines { Lines(Lines) = "lines" }
    prose { Prose(Prose) = "prose" }
    hero { Hero(Hero) = "hero" }
    media { Media(Media) = "media" }
    nav { Nav(Nav) = "nav" }
    island { Island(Island) = "island" }
    table { Table(Table) = "table" }
    steps { Steps(Steps) = "steps" }
    chart { Chart(Chart) = "chart" }
    toast { Toast(Toast) = "toast" }
    pages { Pages(Pages) = "pages" }
    timeline { Timeline(Timeline) = "timeline" }
    import { Import(Import) = "import" }
    message { Message(Message) = "message" }
    tool { Tool(Tool) = "tool" }
    sidebar { Sidebar(Sidebar) = "sidebar" }
    boxplot { Boxplot(Boxplot) = "boxplot" }
}
