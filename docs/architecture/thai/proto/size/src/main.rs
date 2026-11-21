fn main() {
    let text = std::env::args().nth(1).unwrap_or_default();
    #[cfg(feature = "dict")]
    let cuts: Vec<usize> = icu_segmenter::LineSegmenter::new_dictionary(Default::default())
        .segment_str(&text)
        .collect();
    #[cfg(feature = "lstm")]
    let cuts: Vec<usize> = icu_segmenter::LineSegmenter::new_lstm(Default::default())
        .segment_str(&text)
        .collect();
    #[cfg(feature = "plain")]
    let cuts: Vec<usize> = icu_segmenter::LineSegmenter::new_for_non_complex_scripts(Default::default())
        .segment_str(&text)
        .collect();
    #[cfg(not(any(feature = "dict", feature = "lstm", feature = "plain")))]
    let cuts: Vec<usize> = text
        .char_indices()
        .filter(|(_, c)| c.is_whitespace())
        .map(|(i, _)| i)
        .collect();
    println!("{cuts:?}");
}
