use std::collections::BTreeMap;

use blocks::theme::{
    Buttons, CodeError, Easing, Fills, LabelCase, LabelRole, LookCode, Marks, Scale, SchemeName, Sections, Style,
    StyleLabel, Surface, TypeDesign,
};

const FOUR: [(&str, &str); 4] = [
    ("default", "101yx6"),
    ("paper", "11hioq~BQAA.paper"),
    ("console", "10lspy~BAMvLyAAEAFbAV0.console"),
    ("playful", "108bd0.playful"),
];
const ALL_ROLES: &str =
    "11u0yw~AAFbAAQD4oC5A-KAuggBWwPigLoJA-KAuQANAVsD4oC6EQPigLkD4oC6EgFbABYD4oC5A-KAuhoBWwPigLobA-KAuQA.swag-1";

fn plain() -> Style {
    "101yx6".parse::<LookCode>().unwrap().style().clone()
}

fn round(style: &Style) {
    let look = LookCode::new(style.clone(), None).unwrap();
    let back: LookCode = look.to_string().parse().unwrap();
    assert_eq!(back.style(), style, "{look}");
    assert_eq!(back, look);
}

#[test]
fn the_four_site_looks_have_the_pinned_codes_and_decode_to_their_style() {
    let file: serde_json::Value = serde_json::from_str(include_str!("../../../site/looks.json")).unwrap();
    for (name, want) in FOUR {
        let style: Style = serde_json::from_value(file[name]["style"].clone()).unwrap();
        let scheme = (name != "default").then(|| SchemeName::new(name).unwrap());
        let look = LookCode::new(style.clone(), scheme).unwrap();
        assert_eq!(look.to_string(), want);
        let back: LookCode = want.parse().unwrap();
        assert_eq!(back.style(), &style);
        assert_eq!(
            back.scheme().map(SchemeName::as_str),
            (name != "default").then_some(name)
        );
    }
}

#[test]
fn each_enum_axis_round_trips_every_value() {
    let base = plain();
    for v in TypeDesign::ALL {
        round(&Style {
            type_: *v,
            ..base.clone()
        });
    }
    for v in Easing::ALL {
        round(&Style {
            easing: *v,
            ..base.clone()
        });
    }
    for v in Surface::ALL {
        round(&Style {
            surface: *v,
            ..base.clone()
        });
    }
    for v in Fills::ALL {
        round(&Style {
            fills: *v,
            ..base.clone()
        });
    }
    for v in Buttons::ALL {
        round(&Style {
            buttons: *v,
            ..base.clone()
        });
    }
    for v in Marks::ALL {
        round(&Style {
            marks: *v,
            ..base.clone()
        });
    }
    for v in Sections::ALL {
        round(&Style {
            sections: *v,
            ..base.clone()
        });
    }
}

#[test]
fn space_radius_and_motion_round_trip_each_quarter_step_and_name_the_axis_off_one() {
    let base = plain();
    for i in 0..=16 {
        let s = Scale::try_from(f64::from(i) / 4.0).unwrap();
        round(&Style {
            space: s,
            ..base.clone()
        });
        round(&Style {
            radius: s,
            ..base.clone()
        });
        round(&Style {
            motion: s,
            ..base.clone()
        });
    }
    let off = Scale::try_from(1.1).unwrap();
    let err = |s: Style| LookCode::new(s, None).unwrap_err();
    assert_eq!(
        err(Style {
            space: off,
            ..base.clone()
        }),
        CodeError::OffStep("space")
    );
    assert_eq!(
        err(Style {
            radius: off,
            ..base.clone()
        }),
        CodeError::OffStep("radius")
    );
    assert_eq!(err(Style { motion: off, ..base }), CodeError::OffStep("motion"));
}

#[test]
fn labels_on_every_role_with_a_multi_byte_affix_round_trip_to_the_pinned_code() {
    let labels: BTreeMap<LabelRole, StyleLabel> = LabelRole::ALL
        .iter()
        .enumerate()
        .map(|(i, r)| {
            let label = StyleLabel {
                prefix: (if i % 2 == 1 { "‹" } else { "[" }).to_string().try_into().unwrap(),
                suffix: (if i % 3 == 0 { "" } else { "›" }).to_string().try_into().unwrap(),
                case: LabelCase::ALL[i % 3],
            };
            (*r, label)
        })
        .collect();
    let style = Style {
        type_: TypeDesign::Serif,
        space: Scale::try_from(4.0).unwrap(),
        radius: Scale::try_from(0.25).unwrap(),
        motion: Scale::try_from(0.0).unwrap(),
        easing: Easing::Bouncy,
        surface: Surface::Glass,
        fills: Fills::Solid,
        buttons: Buttons::Filled,
        marks: Marks::Text,
        sections: Sections::Quiet,
        labels,
        ..plain()
    };
    let look = LookCode::new(style.clone(), Some(SchemeName::new("swag-1").unwrap())).unwrap();
    assert_eq!(look.to_string(), ALL_ROLES);
    let back: LookCode = ALL_ROLES.parse().unwrap();
    assert_eq!(back.style(), &style);
}

#[test]
fn a_bad_code_is_refused_with_why() {
    let err = |c: &str| c.parse::<LookCode>().unwrap_err();
    assert_eq!(err("hello"), CodeError::NotACode);
    assert_eq!(err("101yx"), CodeError::NotACode);
    assert_eq!(err("101YX6"), CodeError::NotACode);
    assert_eq!(err("101yx6~"), CodeError::NotACode);
    assert_eq!(err("901yx6"), CodeError::Version('9'));
    assert_eq!(err("2zzzzz"), CodeError::Version('2'));
    assert_eq!(err("1zzzzz"), CodeError::Newer);
    assert_eq!(err("101yx6.default"), CodeError::Scheme);
    assert_eq!(err("101yx6.Paper"), CodeError::Scheme);
    assert_eq!(err("101yx6.-x"), CodeError::Scheme);
    assert_eq!(err("101yx6~_w"), CodeError::Labels);
    assert_eq!(err("101yx6~AAFh"), CodeError::Labels);
    assert_eq!(err("101yx6~BQAB"), CodeError::Labels);
    assert_eq!(CodeError::Version('9').to_string(), "version 9: this reader takes 1");
    assert_eq!(
        CodeError::Newer.to_string(),
        "an axis value this reader does not know: made by a newer blocks"
    );
}
