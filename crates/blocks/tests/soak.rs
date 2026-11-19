mod support;

use blocks::{Frame, Hello, Mirror, Put, Shelf, Synced, Took};
use support::{mutate, screen, Rng};

fn rss_kb() -> u64 {
    let pid = std::process::id().to_string();
    let out = std::process::Command::new("ps")
        .args(["-o", "rss=", "-p", &pid])
        .output()
        .unwrap();
    String::from_utf8(out.stdout).unwrap().trim().parse().unwrap()
}

#[test]
#[ignore = "release only: `just soak`"]
fn a_streams_memory_stays_flat() {
    let mut rng = Rng::new(3);
    let mut truth = screen(&mut rng, 200, 40);
    let mut shelf = Shelf::default();
    shelf.put(&0u8, "/s", &truth).unwrap();
    let hello = Hello {
        v: 1,
        sid: "sid".into(),
        epoch: "e".into(),
        keys: 16,
    };
    let sync = |m: &mut Mirror, shelf: &Shelf<u8>| {
        let have = m.have();
        let keys = have.iter().map(|h| shelf.state(&0, &h.k, h.rev).unwrap()).collect();
        assert!(!m.synced(&have, Synced { keys }).contains(&Took::Gap));
    };
    let mut m = Mirror::default();
    m.open("/s");
    m.hello(&hello).unwrap();
    sync(&mut m, &shelf);
    let (mut fresh, mut samples) = (0, vec![]);
    for round in 0..10 {
        for i in 0..20_000 {
            truth = mutate(&mut rng, &truth, &mut fresh, 4);
            let Put::Changed(d) = shelf.put(&0, "/s", &truth).unwrap() else {
                continue;
            };
            if i % 500 == 0 {
                m = Mirror::default();
                m.open("/s");
                m.hello(&hello).unwrap();
                sync(&mut m, &shelf);
            } else {
                let f: Frame = serde_json::from_str(&d.frame).unwrap();
                assert_ne!(m.frame(f), Took::Gap);
            }
        }
        assert_eq!(m.screen("/s"), Some(&truth));
        samples.push(rss_kb());
        eprintln!("round {round}: rss {} KB", rss_kb());
    }
    let warm = samples[2];
    let last = *samples.last().unwrap();
    assert!(
        last <= warm + 4096,
        "RSS grew from {warm} KB to {last} KB after warm-up: {samples:?}"
    );
}
