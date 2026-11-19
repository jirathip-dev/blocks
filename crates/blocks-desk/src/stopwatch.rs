use std::time::Instant;

pub(crate) struct Stopwatch(Instant);

impl Stopwatch {
    pub(crate) fn start() -> Self {
        Self(Instant::now())
    }

    pub(crate) fn ms(&self) -> f64 {
        self.0.elapsed().as_secs_f64() * 1000.0
    }
}
