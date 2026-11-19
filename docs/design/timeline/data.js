// Preview-only sample data: made-up jobs, December 2026, weekends and two public holidays off.
const OFF = ["2026-12-05", "2026-12-06", "2026-12-10", "2026-12-12", "2026-12-13", "2026-12-19", "2026-12-20", "2026-12-26", "2026-12-27", "2026-12-31"];
const d = n => "2026-12-" + String(n).padStart(2, "0");
var planner = {
  type: "timeline", id: "plan", title: "Crews", meta: "8 jobs · weekends and holidays shaded", from: d(1), to: d(31), off: OFF, corner: "Job",
  move: { action: "schedule", name: "bar" }, stretch: { action: "schedule", name: "bar" }, draw: { action: "schedule", name: "bar" },
  rows: [
    { id: "j0", title: "St Anne's annexe", subtitle: "Crew 3 · fit-out", bars: [{ id: "b01", start: "2026-11-23", end: d(4), label: "Fit-out", progress: 80 }] },
    { id: "j1", title: "Riverside Tower A", subtitle: "Crew 1", bars: [
      { id: "b11", start: d(1), end: d(4), label: "Formwork", tone: "ok", progress: 100 },
      { id: "b12", start: d(7), end: d(9), label: "Pour", pv: { ph: "focus" } },
      { id: "b13", start: d(14), end: d(22), label: "Cure", tone: "info" }] },
    { id: "j2", title: "Riverside Tower B", subtitle: "Crew 2", bars: [
      { id: "b21", start: d(2), end: d(8), label: "Excavate", progress: 60 },
      { id: "b22", start: d(11), end: d(18), label: "Footings" }] },
    { id: "j3", title: "Marlow Street flats", subtitle: "Crew 3 · behind", bars: [
      { id: "b31", start: d(7), end: d(23), label: "Brickwork", tone: "warn", progress: 30 },
      { id: "b32", start: d(28), end: d(28), label: "Inspect" }] },
    { id: "j4", title: "Kingfisher school hall", subtitle: "Crew 1 · finished", bars: [
      { id: "b41", start: d(1), end: d(3), label: "Roof", tone: "ok", progress: 100, fixed: true },
      { id: "b42", start: d(7), end: d(8), label: "Snag list", progress: 100, fixed: true }] },
    { id: "j5", title: "Quayside car park", subtitle: "Crew 4", bars: [
      { id: "b51", start: d(15), end: d(18), label: "Resurface · no permit", tone: "bad" },
      { id: "b52", start: d(21), end: d(22), label: "Lines" }] },
    { id: "j6", title: "Old Mill conversion", subtitle: "unassigned", bars: [] },
    { id: "j7", title: "Pier Road drainage", subtitle: "Crew 2", bars: [
      { id: "b71", start: d(21), end: d(23), label: "Survey" },
      { id: "b72", start: d(28), end: "2027-01-08", label: "Dig", tone: "accent" }] },
  ],
};
var activities = {
  type: "timeline", id: "acts", title: "Estimate E-118 · activities", meta: "read-only · edit the days in the list below", from: d(1), to: d(31), off: OFF, corner: "Activity", static: false,
  rows: [
    { id: "a1", title: "Site set-up", bars: [{ id: "x1", start: d(1), end: d(2), label: "2 days" }] },
    { id: "a2", title: "Demolition", bars: [{ id: "x2", start: d(3), end: d(9), label: "5 days" }] },
    { id: "a3", title: "Groundworks", bars: [{ id: "x3", start: d(11), end: d(18), label: "6 days" }] },
    { id: "a4", title: "Frame", bars: [{ id: "x4", start: d(16), end: d(30), label: "9 days" }] },
  ],
};
