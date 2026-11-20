use serde::{Deserialize, Serialize};

words!(Lang { En, Th });
words!(Era { Ce, Be });

wire! {
    /// A screen's language, era and today: the words a field draws, the years it shows, the day it marks.
    pub struct Locale {
        lang: Option<Lang>,
        era: Option<Era>,
        today: Option<String>,
    }
}

impl Locale {
    /// The field word `key` in this locale's language: Thai for `th`, else English.
    pub fn word(&self, key: &str) -> &'static str {
        let mut all = super::Field::WORDS.iter().flat_map(|ws| ws.iter());
        all.find(|w| w.0 == key)
            .map_or("", |(_, en, th)| if self.lang == Some(Lang::Th) { th } else { en })
    }
}
