// The cores and the map (a floating block, bottom left): a round inked chart
// with every partner (agent) as a blip, grouped by town (space) around you;
// gold ones are at work, red ones flash (they need you), green ones are done.
// Click one to ride there. Under it the three cores, rings that fill:
// Health (partners not stuck), Stamina (at work), Dead Eye (done).

import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, run } from "herdr";
import { A, C, FELL, STATUS, icon } from "./kit.js";

const R = 66;

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

function core(id, glyph, frac, color, tip) {
  const k = Math.round(Math.max(0, Math.min(1, frac)) * 10);
  return div()
    .id(id)
    .relative()
    .size(38)
    .tooltip(tip)
    .child(div().absolute().left(0).top(0).size(38).rounded_full().bg("#120c07cc").border(1).border_color("#dcc49744"))
    .child(svg(`${A}/icons/ring-${k}.svg`).absolute().left(0).top(0).size(38).text_color(C.bone))
    .child(div().absolute().left(11).top(11).child(icon(glyph, 16, color)));
}

export default class Radar {
  init() {}

  render(_cx) {
    const crew = agents();
    const ds = spaces();
    const blips = crew
      .filter((a) => !a.focused)
      .map((a) => {
        const di = Math.max(0, ds.findIndex((s) => s.id === a.space));
        const ang = (di / Math.max(1, ds.length)) * Math.PI * 2 + (hash(a.address) - 0.5) * 1.1 - Math.PI / 2;
        const dist = R * (0.35 + hash(`${a.address}r`) * 0.5);
        const x = R + Math.cos(ang) * dist;
        const y = R + Math.sin(ang) * dist;
        const sz = a.status === "blocked" ? 12 : 10;
        let dot = div()
          .id(`blip-${a.address}`)
          .absolute()
          .left(x - sz / 2)
          .top(y - sz / 2)
          .size(sz)
          .rounded_full()
          .bg(STATUS[a.status] ?? C.faded)
          .border(2)
          .border_color(C.ink)
          .cursor_pointer()
          .tooltip(`${a.program?.name ?? "Partner"} · ${a.space_name} / ${a.tab_name || `job ${a.tab_index + 1}`} · ${a.status}`)
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click(() => run("pane.focus", { pane: a.pane }));
        if (a.status === "blocked") dot = dot.loop("opacity", { from: 0.15, to: 1, period: 500 });
        else if (a.status === "working") dot = dot.loop("opacity", { from: 0.5, to: 1, period: 1200 });
        return dot;
      });
    const total = crew.length || 1;
    const blocked = crew.filter((a) => a.status === "blocked").length;
    const working = crew.filter((a) => a.status === "working").length;
    const done = crew.filter((a) => a.status === "done").length;
    const map = div()
      .relative()
      .size(R * 2)
      .rounded_full()
      .overflow_hidden()
      .border(3)
      .border_color(C.ink)
      .child(image(`${A}/img/map.png`).absolute().left(0).top(0).size(R * 2).rounded_full())
      .children(blips)
      .child(div().absolute().left(R - 8).top(R - 8).child(icon("arrow", 16, C.blood)))
      .child(div().absolute().left(R - 4).top(3).font_family(FELL).text_size(12).text_color(C.ink).child("N"));
    return v_flex()
      .id("cores")
      .items_center()
      .p(6)
      .gap(6)
      .child(map)
      .child(
        h_flex()
          .gap(6)
          .child(core("c-health", "heart", crew.length ? 1 - blocked / total : 1, "#c0392b", `Health: ${crew.length - blocked} of ${crew.length} partners not stuck`))
          .child(core("c-stamina", "lungs", crew.length ? working / total : 0, C.bone, `Stamina: ${working} at work`))
          .child(core("c-deadeye", "eye", crew.length ? done / total : 0, C.gold, `Dead Eye: ${done} done`)),
      );
  }
}
