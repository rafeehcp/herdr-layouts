// The minimap (a floating block, bottom left), GTA V style: a rounded
// rectangle of a made-up sunny city, every agent a blip grouped by district
// (space) around you. Gold blips are working, red ones flash (they need you),
// green ones are done. Click one to go there. Under it the three bars:
// health (crew not blocked), armor (crew working) and special (crew done).

import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, run } from "herdr";
import { A, C, SWITCH, BEBAS, UI, STATUS, icon } from "./kit.js";

const W = 210;
const H = 140;

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

const bar = (frac, color, w) =>
  div()
    .w(w)
    .h(7)
    .bg(`${color}55`)
    .child(div().h_full().bg(color).w(Math.round(Math.max(0, Math.min(1, frac)) * w)).transition("width", 400));

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
        const dist = 0.35 + hash(`${a.address}r`) * 0.5;
        const x = W / 2 + Math.cos(ang) * dist * (W / 2 - 10);
        const y = H / 2 + Math.sin(ang) * dist * (H / 2 - 10);
        const col = STATUS[a.status] ?? SWITCH[di % 3];
        const sz = a.status === "blocked" ? 12 : 10;
        let dot = div()
          .id(`blip-${a.address}`)
          .absolute()
          .left(x - sz / 2)
          .top(y - sz / 2)
          .size(sz)
          .rounded_full()
          .bg(col)
          .border(2)
          .border_color("#000000")
          .cursor_pointer()
          .tooltip(`${a.program?.name ?? "Agent"} · ${a.space_name} / ${a.tab_name || `tab ${a.tab_index + 1}`} · ${a.status}`)
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
      .w(W)
      .h(H)
      .rounded(6)
      .overflow_hidden()
      .border(2)
      .border_color("#000000")
      .child(image(`${A}/img/radar.png`).absolute().left(0).top(0).w(W).h(H))
      .children(blips)
      .child(div().absolute().left(W / 2 - 8).top(H / 2 - 8).child(icon("arrow", 16, C.text)))
      .child(
        div()
          .absolute()
          .left(6)
          .top(4)
          .px(4)
          .rounded(2)
          .bg("#000000a0")
          .font_family(BEBAS)
          .text_size(12)
          .text_color(C.text)
          .child(`${crew.length} CREW · ${ds.length} DISTRICT${ds.length === 1 ? "" : "S"}`),
      );
    const third = Math.floor((W - 6) / 4);
    return v_flex()
      .id("radar")
      .bg("#0a0a0a")
      .rounded(6)
      .w(W + 8)
      .p(4)
      .gap(3)
      .font_family(UI)
      .child(map)
      .child(
        h_flex()
          .gap(3)
          .tooltip(`Health: crew not blocked · Armor: working · Special: done`)
          .id("bars")
          .child(bar(crew.length ? 1 - blocked / total : 1, C.green, W - third * 2 - 6))
          .child(bar(crew.length ? working / total : 0, C.blue, third))
          .child(bar(crew.length ? done / total : 0, C.gold, third)),
      );
  }
}
