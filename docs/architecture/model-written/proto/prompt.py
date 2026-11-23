import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..")
DEFS = json.load(open(os.path.join(ROOT, "schema", "blocks.schema.json")))["$defs"]
KINDS = {
    a["properties"]["type"]["const"]: a["$ref"].split("/")[-1]
    for a in DEFS["Block"]["anyOf"]
    if "properties" in a and "$ref" in a
}
NEVER = {"show", "enabled", "checks", "set", "focus", "keep", "open", "sheet", "thread", "fallback"}
INPUTS = ["TextField", "ToggleField", "PickerField"]
HEAD = (
    'Reply with one JSON object {"blocks": Block[]} and nothing else: no prose around it, no code fence.\n'
    "Write no `id`. Write text as markdown in a `prose` block. Use only the kinds and fields below.\n"
    "An `action` is one of its kind's `sends`, spelt as written. A link may start with: https://. No file is loaded.\n\n"
    "A Block is one of:\n"
)


def words(v):
    alts = v.get("anyOf")
    if alts and len(alts) == 2 and "enum" in alts[0] and alts[1].get("type") == "string":
        return alts[0]["enum"]
    return v.get("enum")


def ty(v, refs):
    if v is True:
        return "any"
    if "$ref" in v:
        name = v["$ref"].split("/")[-1]
        w = words(DEFS[name])
        if w and len(w) <= 4:
            return "|".join(json.dumps(x) for x in w)
        refs.add(name)
        return name
    alts = v.get("anyOf") or v.get("oneOf")
    if alts:
        return "|".join(ty(a, refs) for a in alts if a.get("type") != "null")
    if "const" in v:
        return json.dumps(v["const"])
    if "enum" in v:
        return "|".join(json.dumps(x) for x in v["enum"])
    t = v.get("type")
    if isinstance(t, list):
        t = [x for x in t if x != "null"][0]
    if t == "array":
        item = ty(v.get("items", True), refs)
        return (item if "|" not in item else "(" + item + ")") + "[]"
    if t == "object":
        return obj(v, refs, NEVER) if "properties" in v else "{}"
    return {"string": "string", "boolean": "bool", "number": "number", "integer": "number"}.get(t, "any")


def obj(v, refs, skip):
    need = set(v.get("required", []))
    props = v.get("properties", {})
    names = sorted((k for k in props if k not in skip), key=lambda k: (k not in need, k))
    return "{" + ", ".join(f"{k}{'' if k in need else '?'}: {ty(props[k], refs)}" for k in names) + "}"


def part(name, refs):
    v = DEFS[name]
    w = words(v)
    if w:
        return "|".join(json.dumps(x) for x in w)
    if name == "Field":
        refs.update(INPUTS)
        return " | ".join(INPUTS)
    alts = v.get("anyOf") or v.get("oneOf")
    if alts and "properties" not in v:
        return " | ".join(t for t in (ty(a, refs) for a in alts) if t != "Bound")
    return obj(v, refs, NEVER)


def prompt(catalog):
    refs, lines = set(), []
    for kind, allow in catalog.items():
        v = DEFS[KINDS[kind]]
        skip = NEVER | {"id"}
        if "fields" in allow:
            skip |= set(v["properties"]) - set(allow["fields"])
        body = "{markdown: string}" if kind == "prose" else obj(v, refs, skip)
        about = v.get("description", "").split(":")[0].split(";")[0]
        sends = "".join(' sends: ' + " | ".join(json.dumps(a) for a in allow["actions"]) if allow.get("actions") else "")
        lines.append(f'{{type: "{kind}", ' + body[1:] + "  // " + about + sends)
    done, parts, todo = set(), [], sorted(refs)
    while todo:
        name = todo.pop(0)
        if name in done or name in ("Block", "Bound", "Expr") or name in KINDS.values():
            continue
        done.add(name)
        more = set()
        parts.append(f"{name} = " + part(name, more))
        todo += sorted(more - done)
    return HEAD + "\n".join(lines) + "\n\nwhere\n" + "\n".join(sorted(parts)) + "\n"


def schema_closure(catalog):
    seen, todo = set(), [KINDS[k] for k in catalog]

    def refs(v):
        if isinstance(v, dict):
            for k, x in v.items():
                if k == "$ref":
                    yield x.split("/")[-1]
                else:
                    yield from refs(x)
        elif isinstance(v, list):
            for x in v:
                yield from refs(x)

    while todo:
        name = todo.pop()
        if name not in seen and name != "Block":
            seen.add(name)
            todo += list(refs(DEFS[name]))
    return len(json.dumps({n: DEFS[n] for n in seen}, separators=(",", ":")))


def skill_pages(catalog):
    return sum(os.path.getsize(os.path.join(ROOT, "skill", "blocks", "kinds", f"{k}.md")) for k in catalog)


SAY = {
    "prose": {},
    "list": {"fields": ["rows"]},
    "row": {"fields": ["title", "subtitle", "value", "badge"]},
    "stat": {"fields": ["items", "label", "value", "unit", "tone"]},
    "table": {"fields": ["title", "columns", "rows", "empty"]},
    "steps": {"fields": ["title", "steps", "current", "done", "bars"]},
}
ASK = dict(SAY)
ASK.update(
    {
        "card": {"fields": ["title", "subtitle", "badge", "tone", "blocks", "buttons"]},
        "button": {"fields": ["label", "style", "action", "confirm", "values"], "actions": ["pick", "open-plan"]},
        "choice": {"fields": ["question", "options", "action", "recommended"], "actions": ["answer"]},
        "chips": {"fields": ["name", "options", "action", "multi", "selected"], "actions": ["filter"]},
        "form": {"fields": ["fields", "action", "submit"], "actions": ["submit"]},
    }
)
ALL = {k: {"actions": ["a", "b"]} for k in KINDS}

for name, catalog in (("say", SAY), ("ask", ASK), ("all", ALL)):
    text = prompt(catalog)
    print(f"{name}: {len(catalog)} kinds, prompt {len(text)} characters, "
          f"schema {schema_closure(catalog)}, skill pages {skill_pages(catalog)}")
    if name in sys.argv[1:]:
        print(text)
