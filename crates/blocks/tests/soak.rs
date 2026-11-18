mod support;

use blocks::{Replica, Stream};
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
    let mut stream = Stream::new(truth.clone(), 64);
    let mut replica = Replica::default();
    for f in stream.resume(None) {
        replica.receive(&f).unwrap();
    }
    let (mut fresh, mut samples) = (0, vec![]);
    for round in 0..10 {
        for i in 0..20_000 {
            truth = mutate(&mut rng, &truth, &mut fresh, 4);
            let frame = stream.push(truth.clone());
            if i % 500 == 0 {
                replica = Replica::default();
                for f in stream.resume(None) {
                    replica.receive(&f).unwrap();
                }
            } else {
                replica.receive(&frame).unwrap();
            }
        }
        assert_eq!(replica.screen, truth);
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
