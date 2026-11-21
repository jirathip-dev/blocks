fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: eframe::egui::ViewportBuilder::default().with_inner_size([480.0, 320.0]),
        ..Default::default()
    };
    eframe::run_ui_native("min-egui", options, |ui, _frame| {
        eframe::egui::CentralPanel::default().show(ui, |ui| {
            ui.centered_and_justified(|ui| ui.label("Hello from egui"));
        });
    })
}
