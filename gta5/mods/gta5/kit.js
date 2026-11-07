// Los Santos HUD kit: colors, fonts, little helpers, the radio and the cash.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { hc, shared, setShared, playSound, home, settings, fonts } from "herdr";

export const A = "mods/gta5";

export const C = {
  night: "#0a0a0a",
  pink: "#f2c94c",
  hot: "#ffe08a",
  orange: "#ff9a3d",
  gold: "#f2c94c",
  teal: "#6fd3c7",
  violet: "#a98ad6",
  green: "#5fb760",
  money: "#72c26a",
  red: "#d63a3a",
  blue: "#4aa3df",
  text: "#ffffff",
  soft: "#dcdcdc",
  dim: "#9a9a9a",
  line: "#ffffff1f",
};

// The three switch colors: districts (spaces) take them in turn.
export const SWITCH = ["#4aa3df", "#5fb760", "#ff9a3d"];

// Pricedown's licence forbids sharing the font file: it's used when installed
// (mods/<name>/fonts or the system), else Bebas Neue stands in.
export const PRICEDOWN = (fonts?.() ?? []).includes("Pricedown") ? "Pricedown" : "Bebas Neue";
export const BEBAS = "Bebas Neue";
export const UI = "Rajdhani";

export const STATUS = { working: C.gold, blocked: C.red, done: C.green, idle: C.dim };

export const icon = (name, size, color) => svg(`${A}/icons/${name}.svg`).size(size).flex_none().text_color(color ?? C.text);

export const stop = (_e, cx) => cx.stop_propagation();

/** A round HUD button; its press stays its own inside a window_drag bar. */
export function hudButton(id, child, onClick, o = {}) {
  return div()
    .id(id)
    .flex_none()
    .size(o.size ?? 28)
    .flex()
    .items_center()
    .justify_center()
    .rounded(o.radius ?? 8)
    .text_color(o.color ?? C.soft)
    .cursor_pointer()
    .hover((s) => s.bg(o.hover ?? "#ffffff22").text_color(C.text))
    .on_mouse_down("left", stop)
    .on_click((e, cx) => onClick(e, cx))
    .when(Boolean(o.tip), (el) => el.tooltip(o.tip))
    .child(child);
}

export function sfx(name) {
  if (settings()?.sounds === false) return;
  try {
    playSound(`${A}/sounds/${name}.mp3`);
  } catch {}
}

export const money = (n) => `$${String(Math.max(0, Math.floor(n))).padStart(9, "0")}`;
export const cash = () => Number(shared("gta5.cash")) || 0;
export const addCash = (n) => setShared("gta5.cash", cash() + n);

/** Shows a banner (the floating "banner" block): passed, wanted or text. */
export function banner(kind, title, sub, ms = 4200) {
  setShared("gta5.banner", { kind, title, sub, until: Date.now() + ms, n: Date.now() });
}

// ---- radio: free listener-supported streams from SomaFM, played by ffplay.

export const STATIONS = [
  { id: "fluid", name: "Fluid", tag: "Instrumental hip-hop", color: C.green },
  { id: "groovesalad", name: "Groove Salad", tag: "Downtempo", color: C.teal },
  { id: "seventies", name: "Left Coast 70s", tag: "Mellow 70s rock", color: C.orange },
  { id: "u80s", name: "Underground 80s", tag: "Synthpop / new wave", color: C.violet },
  { id: "poptron", name: "PopTron", tag: "Electropop / indie", color: C.blue },
  { id: "bootliquor", name: "Boot Liquor", tag: "Americana / country", color: C.gold },
  { id: "metal", name: "Metal Detector", tag: "Metal", color: C.red },
  { id: "defcon", name: "DEF CON Radio", tag: "Hacker music", color: C.soft },
];

export const streamUrl = (s) => `https://ice1.somafm.com/${s.id}-128-mp3`;

export function radio() {
  const r = shared("gta5.radio") ?? {};
  return { on: r.on ?? true, station: r.station ?? 0, volume: r.volume ?? 45, playing: r.playing ?? false, busy: r.busy ?? false, error: r.error ?? null };
}

const setRadio = (patch) => setShared("gta5.radio", { ...radio(), ...patch });

// ffplay on PATH first, then winget's link folder (Herdr may not see winget's PATH).
async function startPlayer(name, args) {
  let out = null;
  for (const player of ["ffplay", `${home()}/AppData/Local/Microsoft/WinGet/Links/ffplay.exe`]) {
    out = await hc(["run", "--json", "--name", name, "--bg", "--rm", "--no-parent", "--no-notify", "--", player, ...args]).catch((e) => ({ code: 1, stdout: "", stderr: String(e) }));
    if (out.code === 0 && out.stdout.includes('"live"')) return out;
  }
  return out;
}

// The radio is a herdr-core terminal named NAME with no Herdr labels, so no
// screen shows it; `hc kill NAME` stops it. (exec of a launcher never returned
// while the music played: the player kept its pipes.)
const NAME = "gta5-radio";

// Each start or stop bumps this: a slower earlier start stops what it started.
let gen = 0;

/** Starts (or restarts) the radio on the station/volume in shared state. */
export async function radioPlay(patch = {}) {
  const my = ++gen;
  setRadio({ ...patch, on: true, busy: true, playing: false, error: null });
  await hc(["kill", NAME]).catch(() => null);
  const r = radio();
  const s = STATIONS[r.station % STATIONS.length];
  const out = await startPlayer(NAME, ["-nodisp", "-loglevel", "quiet", "-volume", String(r.volume), streamUrl(s)]);
  if (my !== gen) return;
  const ok = out.code === 0 && out.stdout.includes('"live"');
  setRadio({ busy: false, playing: ok, error: ok ? null : (out.stderr || out.stdout).trim().slice(0, 160) || "ffplay did not start" });
}

export async function radioStop(remember = true) {
  ++gen;
  setRadio({ playing: false, busy: false, ...(remember ? { on: false } : {}) });
  await hc(["kill", NAME]).catch(() => null);
}
