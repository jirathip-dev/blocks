mod action_no_id;
mod actions_many;
mod baseline_grew;
mod baseline_stale;
mod buttons_many;
mod clipped_text;
mod console;
mod contrast;
mod depth;
mod destructive_unconfirmed;
mod dropped;
mod empty_state;
mod error_screen;
mod fault;
mod fixed_width;
mod frame_budget;
mod island_unsized;
mod label_empty;
mod label_long;
mod label_twice;
mod level_blocks;
mod motion;
mod no_name;
mod no_size;
mod overflow;
mod overlap;
mod primary_twice;
mod private_selector;
mod seed_missing;
mod sent_differs;
mod tap_target;
mod text_wall;
mod title_long;
mod tree;
mod truncated;
mod unanswered;
mod unstable;
mod untitled;
mod unused_ignore;

use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen};

/// Every rule of the table, one file each in this folder.
pub static RULES: &[&Rule] = &[
    &action_no_id::RULE,
    &actions_many::RULE,
    &baseline_grew::RULE,
    &baseline_stale::RULE,
    &buttons_many::RULE,
    &clipped_text::RULE,
    &console::RULE,
    &contrast::RULE,
    &depth::RULE,
    &destructive_unconfirmed::RULE,
    &dropped::RULE,
    &empty_state::RULE,
    &error_screen::RULE,
    &fault::RULE,
    &fixed_width::RULE,
    &frame_budget::RULE,
    &island_unsized::RULE,
    &label_empty::RULE,
    &label_long::RULE,
    &label_twice::RULE,
    &level_blocks::RULE,
    &motion::RULE,
    &no_name::RULE,
    &no_size::RULE,
    &overflow::RULE,
    &overlap::RULE,
    &primary_twice::RULE,
    &private_selector::RULE,
    &seed_missing::RULE,
    &sent_differs::RULE,
    &tap_target::RULE,
    &text_wall::RULE,
    &title_long::RULE,
    &tree::RULE,
    &truncated::RULE,
    &unanswered::RULE,
    &unstable::RULE,
    &untitled::RULE,
    &unused_ignore::RULE,
];

pub(super) const CHECKS: &[fn(&Cx, &mut Vec<Seen>)] = &[
    action_no_id::check,
    actions_many::check,
    buttons_many::check,
    depth::check,
    destructive_unconfirmed::check,
    empty_state::check,
    fault::check,
    island_unsized::check,
    label_empty::check,
    label_long::check,
    label_twice::check,
    level_blocks::check,
    primary_twice::check,
    text_wall::check,
    title_long::check,
    untitled::check,
];
