export const rule = "render/console";
export const shot = ({ logged }) => logged.splice(0).map((detail) => ({ at: "", detail }));
