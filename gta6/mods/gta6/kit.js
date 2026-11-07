// Vice HUD kit: colors, fonts, little helpers, the radio and the cash.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { hc, shared, setShared, playSound, home, settings, fonts } from "herdr";

export const A = "mods/gta6";

export const C = {
  night: "#0b041c",
  ink: "#140830",
  glass: "#12062acc",
  glassHi: "#24104ad9",
  pink: "#ff2f9c",
  hot: "#ff5fb4",
  orange: "#ff9a3d",
  gold: "#ffd166",
  teal: "#2de2e6",
  violet: "#9b5de5",
  green: "#5dff8a",
  money: "#7dff9a",
  red: "#ff3b5c",
  blue: "#4cc9ff",
  text: "#fbefff",
  soft: "#d9c2f0",
  dim: "#9a7fc0",
  line: "#ff2f9c55",
};

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
    .hover((s) => s.bg(o.hover ?? "#ff2f9c33").text_color(C.text))
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
export const cash = () => Number(shared("gta6.cash")) || 0;
export const addCash = (n) => setShared("gta6.cash", cash() + n);

/** Shows a banner (the floating "banner" block): passed, wanted or text. */
export function banner(kind, title, sub, ms = 4200) {
  setShared("gta6.banner", { kind, title, sub, until: Date.now() + ms, n: Date.now() });
}

// ---- radio: free synthwave streams from nightride.fm, played by ffplay.

export const STATIONS = [
  { id: "nightride", name: "Nightride FM", tag: "Synthwave", color: C.pink },
  { id: "chillsynth", name: "Chillsynth FM", tag: "Chill / Lo-fi synth", color: C.teal },
  { id: "datawave", name: "Datawave FM", tag: "Retro computer", color: C.violet },
  { id: "spacesynth", name: "Spacesynth FM", tag: "Italo / space", color: C.blue },
  { id: "darksynth", name: "Darksynth FM", tag: "Dark / heavy", color: C.red },
  { id: "rekt", name: "Rekt FM", tag: "Bass / DnB", color: C.orange },
];

export const streamUrl = (s) => `https://stream.nightride.fm/${s.id}.mp3`;

export function radio() {
  const r = shared("gta6.radio") ?? {};
  return { on: r.on ?? true, station: r.station ?? 0, volume: r.volume ?? 45, playing: r.playing ?? false, busy: r.busy ?? false, error: r.error ?? null };
}

const setRadio = (patch) => setShared("gta6.radio", { ...radio(), ...patch });

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
const NAME = "gta6-radio";

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
