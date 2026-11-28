export type Mode = "dark" | "light";

export type Token = "--bg" | "--card" | "--edge" | "--line" | "--scrim" | "--fg" | "--mute" | "--l" | "--link" | "--g" | "--a" | "--r" | "--p" | "--c" | "--fk-l" | "--fk-p" | "--fk-c" | "--fk-g" | "--fk-a";

export type Scheme = { label: string; "color-scheme": Mode; tokens: Record<Token, string> };

export const defaultPair: Record<Mode, Scheme> = {
  "dark": {
    "label": "Default dark",
    "color-scheme": "dark",
    "tokens": {
      "--bg": "#161616",
      "--card": "#1f1f1f",
      "--edge": "#3a3a3a",
      "--line": "#2a2a2a",
      "--scrim": "#00000099",
      "--fg": "#ececec",
      "--mute": "#a3a3a3",
      "--l": "#d6d6d6",
      "--link": "#d6d6d6",
      "--g": "#769672",
      "--a": "#c5a370",
      "--r": "#bb776e",
      "--p": "#a295bb",
      "--c": "#6da1a5",
      "--fk-l": "#d6d6d6",
      "--fk-p": "#b8abce",
      "--fk-c": "#8ab9bc",
      "--fk-g": "#9bb996",
      "--fk-a": "#d1b184"
    }
  },
  "light": {
    "label": "Default light",
    "color-scheme": "light",
    "tokens": {
      "--bg": "#f6f6f6",
      "--card": "#ffffff",
      "--edge": "#d0d0d0",
      "--line": "#e4e4e4",
      "--scrim": "#0000004d",
      "--fg": "#1c1c1c",
      "--mute": "#5e5e5e",
      "--l": "#3d3d3d",
      "--link": "#3d3d3d",
      "--g": "#547850",
      "--a": "#927236",
      "--r": "#a75953",
      "--p": "#74678e",
      "--c": "#3c797d",
      "--fk-l": "#3d3d3d",
      "--fk-p": "#64597c",
      "--fk-c": "#31666a",
      "--fk-g": "#456642",
      "--fk-a": "#775d2c"
    }
  }
};

export const defaultStyle: Record<string, string> = {
  "--build": "200ms",
  "--dot": "var(--edge)",
  "--dot-gap": "16px",
  "--dot-size": "2px",
  "--ease": "cubic-bezier(0.2, 0, 0, 1)",
  "--enter": "160ms",
  "--radius": "0px",
  "--rise": "8px",
  "--seam": "2px",
  "--settle": "160ms",
  "--stagger": "40ms"
};

export const rules = {
  type: { "default": ":root{font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif}", "mono": "", "serif": ":root{font-family:ui-serif,Georgia,Cambria,serif}" },
  surface: { "glass": "", "dashed": ".as-surface{border-style:dashed}", "solid": ".as-surface{border-width:2px}" },
  fills: { "tint": "", "outline": ".as-tint{background:none;color:var(--l);box-shadow:inset 0 0 0 1px var(--l)}", "solid": "" },
  buttons: { "plain": "", "filled": "button::before,a.btn::before{content:none}button::after,a.btn::after{content:\"\"}button.primary,a.btn.primary{background:var(--l);color:var(--bg);padding:0 var(--s3);font-weight:600}" },
  marks: { "symbols": "", "text": ".as-mark{width:auto;font-size:0}.as-mark::after{content:attr(data-mark);font-size:var(--fs-meta)}" },
  sections: { "title": "", "quiet": ".as-header-label{font-size:var(--fs-meta);font-weight:400}.as-section-label{font-size:var(--fs-meta);font-weight:400}" },
};

export const curves = { "standard": "cubic-bezier(0.2, 0, 0, 1)", "calm": "cubic-bezier(0.4, 0, 0.2, 1)", "bouncy": "cubic-bezier(0.34, 1.3, 0.64, 1)" };

export const cases = { "as-is": "none", "lower": "lowercase", "upper": "uppercase" };

export const drawn = { "header": ".as-header-label", "section": ".as-section-label", "title": ".as-title-label", "button": ".as-button-label", "chip": ".as-chip-label", "picked": ".as-picked-label", "screen": ".as-screen-label" };

type Label = { prefix?: string; suffix?: string; case?: keyof typeof cases };

export type Axes = { [K in keyof typeof rules]?: keyof (typeof rules)[K] };

export type Scale = Axes & { space?: number; motion?: number; radius?: number; easing?: keyof typeof curves; labels?: Record<string, Label> };
