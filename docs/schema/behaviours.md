# Behaviours

Every kind takes `show`, an `Expr`: `{"get": "key"}`, `not`, `all`, `any`, `eq`, `lt`, `len`, `has`, `is` (a named
pattern), `add`, `sub`, `mul`, `cat`, `pick`, or a bare value. `eval` is total: a wrong type gives `null`, and `null` is
false. `fixtures/behave/` holds its cases (state, expression, value), and an operation a reader does not know
evaluates to `null`.

A field also takes `show`, `enabled` and `checks` (each `{ok, say}`), a button and an act `enabled`, and a tap `set` (each
`{key, to}`: local state changes, nothing is sent). `behave::view` gives what a state makes of a screen: the hidden
ids and field names, the disabled ones (a form whose check fails, for its submit) and each failing field's `say`;
`behave.ts` and Swift's `Behaviour` give the same for `fixtures/behave/view.json`. A `show`, `enabled`, check or
`set` that uses an operation or pattern a reader does not know counts as not written. A block's `show` needs its
`id`. An act's `enabled` keys by the action it sends (`View.acts`); a row's or tile's `value` may be `{"get": key}`, which
shows that state key's text (`View.values`). The static page writes the start state: `hidden`, `disabled` acts, bound
values, and from checks `required`, `type="email"`, `maxlength`.
