// The sample for these pages and for the showcase gallery: made-up names and numbers.
const FY = ["2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09"];
const M = a => a.map(v => v == null ? null : Math.round(v * 1e6));
const TARGET = { action: "plan.target", name: "point" };
const plan = {
  target: { type: "chart", id: "target", chart: "line", title: "Sales target, FY 2568", x: FY, era: "be", format: "thb_m", move: TARGET,
    series: [{ name: "Target", step: 50000, values: M([1.0,1.05,1.4,1.1,1.1,1.2,1.15,1.2,1.15,1.25,1.3,1.2]) },
             { name: "FY 2567 actual", tone: "mute", dash: true, fixed: true, values: M([0.92,1.04,1.48,1.11,1.06,1.29,1.18,1.22,1.14,1.26,1.31,1.19]) }] },
  crew: { type: "chart", id: "crew", chart: "bar", title: "Crew plan", x: FY.slice(4, 10), era: "be", format: "count", move: { action: "plan.crew", name: "point" },
    series: [{ name: "Crew", tone: "info", step: 1, values: [12,14,15,15,16,18] }] },
  actual: { type: "chart", id: "actual", chart: "combo", title: "Revenue against target", x: FY.slice(0, 6), era: "be", format: "thb_m", selected: "2025-01",
    series: [{ name: "Revenue", values: M([0.98,1.12,1.52,1.06,1.17,1.25]) }, { name: "Target", as: "line", tone: "warn", values: M([1.0,1.05,1.4,1.1,1.1,1.2]) }] },
};
