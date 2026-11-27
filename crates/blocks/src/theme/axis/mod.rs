use super::Axis;

pub(super) mod buttons;
pub(super) mod fills;
pub(super) mod marks;
pub(super) mod sections;
pub(super) mod surface;

/// Every axis that restyles a part, in the order `Style` lists them.
pub const AXES: [Axis; 5] = [surface::AXIS, fills::AXIS, buttons::AXIS, marks::AXIS, sections::AXIS];
