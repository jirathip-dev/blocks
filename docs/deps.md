# Dependencies

Every direct dependency in a `Cargo.toml` must be on this list; CI's deps gate (`scripts/deps-gate.sh`) fails
otherwise. A new one needs the owner's OK in an issue, then a line here. No transport (tokio, HTTP): those live in
drover and cooee.

- `serde`: the wire types' derive
- `serde_json`: the wire format, serialize and parse
- `schemars`: the JSON Schema behind the `schema` feature, so codegen only; never in drover's build
