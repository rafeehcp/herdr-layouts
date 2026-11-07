// Frontier kit: inks, papers, type, little helpers, the phonograph, money
// and honor.

import { div, svg } from "gpui-kit";
import { hc, shared, setShared, playSound, home, appHome, settings } from "herdr";

export const A = "mods/rdr2";

export const C = {
  paper: "#dcc497",
  paperHi: "#ecdcb6",
  ink: "#2b1a0e",
  inkSoft: "#5a3d24",
  faded: "#8a6a48",
  blood: "#8e1b14",
  red: "#b3261e",
  gold: "#c99a3b",
  brass: "#b08a4a",
  green: "#5f7d3a",
  blue: "#3f6a80",
  night: "#120c07",
  smoke: "#1b130cdd",
  bone: "#f1e6cf",
  dim: "#a08a6c",
};

export const RYE = "Rye";
export const FELL = "IM FELL English";
export const TYPE = "Special Elite";

export const STATUS = { working: C.gold, blocked: C.red, done: C.green, idle: C.faded };

export const icon = (name, size, color) => svg(`${A}/icons/${name}.svg`).size(size).flex_none().text_color(color ?? C.ink);

export const stop = (_e, cx) => cx.stop_propagation();

/** A small button stamped in ink; its press stays its own inside a window_drag bar. */
export function inkButton(id, child, onClick, o = {}) {
  return div()
    .id(id)
    .flex_none()
    .size(o.size ?? 26)
    .flex()
    .items_center()
    .justify_center()
    .rounded(o.radius ?? 4)
    .text_color(o.color ?? C.inkSoft)
    .cursor_pointer()
    .hover((s) => s.bg(o.hover ?? "#2b1a0e22").text_color(o.hoverColor ?? C.ink))
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

// Money is in cents, like a satchel's: $12.40.
export const cents = () => Number(shared("rdr2.cents")) || 0;
export const addCents = (n) => setShared("rdr2.cents", cents() + n);
export const dollars = (c) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Honor runs -10..10: finished jobs raise it, crew lost mid-job lowers it.
export const honor = () => Number(shared("rdr2.honor")) || 0;
export const addHonor = (n) => setShared("rdr2.honor", Math.max(-10, Math.min(10, honor() + n)));

/** Shows a banner (the floating "banner" block): complete, wanted or text. */
export function banner(kind, title, sub, ms = 4200, extra = {}) {
  setShared("rdr2.banner", { kind, title, sub, until: Date.now() + ms, n: Date.now(), ...extra });
}

// ---- the phonograph: public-domain records (Wikimedia Commons) and one
// live wire, played by ffplay as a herdr-core terminal no screen shows.

export const RECORDS = [
  { file: "traveler.mp3", name: "Arkansaw Traveler", by: "Eck Robertson & Henry Gilliland, 1922" },
  { file: "mapleleaf.mp3", name: "Maple Leaf Rag", by: "U.S. Marine Band, 1906" },
  { file: "turkey.mp3", name: "Turkey in the Straw", by: "Traditional" },
  { file: "range.mp3", name: "Home on the Range", by: "Traditional" },
  { file: "augustan.mp3", name: "Augustan Club Waltzes", by: "Scott Joplin, 1901" },
  { file: "kangaroo.mp3", name: "Kangaroo Hop", by: "Melville Morris, 1915" },
  { url: "https://ice1.somafm.com/bootliquor-128-mp3", name: "The Saloon Wire", by: "Americana, live (SomaFM Boot Liquor)" },
];

export function phono() {
  const r = shared("rdr2.phono") ?? {};
  return { on: r.on ?? true, record: r.record ?? 0, volume: r.volume ?? 45, playing: r.playing ?? false, busy: r.busy ?? false, error: r.error ?? null };
}

const setPhono = (patch) => setShared("rdr2.phono", { ...phono(), ...patch });

const NAME = "rdr2-phono";
let gen = 0;

// ffplay on PATH first, then winget's link folder (Herdr may not see winget's PATH).
async function startPlayer(name, args) {
  let out = null;
  for (const player of ["ffplay", `${home()}/AppData/Local/Microsoft/WinGet/Links/ffplay.exe`]) {
    out = await hc(["run", "--json", "--name", name, "--bg", "--rm", "--no-parent", "--no-notify", "--", player, ...args]).catch((e) => ({ code: 1, stdout: "", stderr: String(e) }));
    if (out.code === 0 && out.stdout.includes('"live"')) return out;
  }
  return out;
}

export async function phonoPlay(patch = {}) {
  const my = ++gen;
  setPhono({ ...patch, on: true, busy: true, playing: false, error: null });
  await hc(["kill", NAME]).catch(() => null);
  const r = phono();
  const rec = RECORDS[r.record % RECORDS.length];
  const src = rec.url ?? `${appHome()}/${A}/records/${rec.file}`.replace(/\\/g, "/");
  const args = ["-nodisp", "-loglevel", "quiet", "-volume", String(r.volume), ...(rec.url ? [] : ["-loop", "0"]), src];
  const out = await startPlayer(NAME, args);
  if (my !== gen) return;
  const ok = out.code === 0 && out.stdout.includes('"live"');
  setPhono({ busy: false, playing: ok, error: ok ? null : (out.stderr || out.stdout).trim().slice(0, 160) || "ffplay did not start" });
}

export async function phonoStop(remember = true) {
  ++gen;
  setPhono({ playing: false, busy: false, ...(remember ? { on: false } : {}) });
  await hc(["kill", NAME]).catch(() => null);
}
