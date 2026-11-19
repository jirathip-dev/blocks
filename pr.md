Closes #81

Slice R0 of the approved ADR (`docs/architecture/react/`): the ADR folder, and README's opening naming the two modes (ADR part 1's text, amendment q2229).

- `README.md`: the opening says blocks has Mode A (server-driven: drover, cooee) and Mode B (client-built: synergy), and the Intent bullet on row ops says "in Mode A".
- `docs/architecture/react/README.md`, `adr.md`: the open questions now record the owner's answers (q2271): 13 kinds now, cap stays 19,000 (#120) with one raise before R5, one package with `/react`, three dev-only tools; R2's codegen move is shared with #79's G1.
- Not in this PR: the `.drover/arch.toml` lines. The ADR says "R1 adds" them, and their `generated` entries name files R1 creates.
- The slices R1 to R7 are listed with line budgets in `docs/architecture/react/README.md` for the orchestrator to file.

src/ net +0 (budget +0): docs only.

## Evidence at 129cbd40437cde8107b2d99104f1941fe817fe17

- `bash scripts/line-cap.sh`: exit 0, 16091 / cap 19000
- `drover arch-check`: exit 1. The one violation is `just gen` exited 127 (`just` is not installed on this host). CI runs arch-check with `just`.

## For humans

The README now explains that blocks works in two ways: screens sent by a server, or screens built inside a React app.
The React plan records the owner's answers, so the build work can be filed in order.
