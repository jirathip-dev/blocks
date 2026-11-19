import { declarations } from "../css.ts";

const NAMED = new Set(
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen accentcolor accentcolortext activetext buttonborder buttonface buttontext canvas canvastext field fieldtext graytext highlight highlighttext linktext mark marktext selecteditem selecteditemtext visitedtext".split(" "),
);
const PAINTS = /(^|-)colou?r$|^(fill|stroke|background|outline|box-shadow|text-shadow|text-decoration|column-rule|-webkit-text-stroke|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?)$/;
const RAW = /#[\da-f]+\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(|[a-z-]+/gi;

export const rule = "css/raw-colour";
export const sheet = (text) =>
  declarations(text)
    .filter(({ prop }) => !prop.startsWith("--") && PAINTS.test(prop))
    .flatMap(({ line, prop, value }) =>
      Array.from(value.replace(/url\([^)]*\)|var\(\s*--[\w-]+/gi, "").matchAll(RAW), (m) => m[0])
        .filter((t) => !/^[a-z-]+$/i.test(t) || NAMED.has(t.toLowerCase()))
        .map((t) => ({ line, detail: `${prop}: ${t}` })),
    );
