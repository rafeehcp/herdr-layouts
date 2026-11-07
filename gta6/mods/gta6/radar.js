// The minimap (a floating block, bottom left): every agent is a blip, grouped
// by district (space) around you in the middle. Gold blips are working, red
// ones flash (they need you), green ones are done. Click one to go there.
// Under it, Health (crew not blocked) and Armor (crew working).

import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, run } from "herdr";
import { A, C, BEBAS, UI, STATUS, icon } from "./kit.js";

const R = 64; // radius, px

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

function bar(label, glyph, frac, color) {
  return h_flex()
    .gap(5)
    .items_center()
    .child(icon(glyph, 11, color))
    .child(
      div()
        .flex_1()
        .h(7)
        .rounded(2)
        .bg("#ffffff1a")
        .child(div().h_full().rounded(2).bg(color).w(Math.round(Math.max(0, Math.min(1, frac)) * 84)).transition("width", 400)),
    )
    .child(div().w(30).font_family(BEBAS).text_size(12).text_color(C.soft).child(label));
}

export default class Radar {
  init() {}

  render(_cx) {
    const crew = agents();
    const ds = spaces();
    const sector = (spaceId) => {
      const i = Math.max(0, ds.findIndex((s) => s.id === spaceId));
      return (i / Math.max(1, ds.length)) * Math.PI * 2;
    };
    const blips = crew.map((a) => {
      const ang = sector(a.space) + (hash(a.address) - 0.5) * 1.1 - Math.PI / 2;
      const dist = a.focused ? 0 : R * (0.35 + hash(`${a.address}r`) * 0.5);
      const x = R + Math.cos(ang) * dist;
      const y = R + Math.sin(ang) * dist;
      const col = STATUS[a.status] ?? C.dim;
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
        .border_color(C.night)
        .cursor_pointer()
        .tooltip(`${a.program?.name ?? "Agent"} · ${a.space_name} / ${a.tab_name || `tab ${a.tab_index + 1}`} · ${a.status}`)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("pane.focus", { pane: a.pane }));
      if (a.status === "blocked") dot = dot.loop("opacity", { from: 0.15, to: 1, period: 500 });
      else if (a.status === "working") dot = dot.loop("opacity", { from: 0.5, to: 1, period: 1200 });
      return a.focused ? null : dot;
    });
    const total = crew.length || 1;
    const blocked = crew.filter((a) => a.status === "blocked").length;
    const working = crew.filter((a) => a.status === "working").length;
    const map = div()
      .relative()
      .size(R * 2)
      .rounded_full()
      .overflow_hidden()
      .border(3)
      .border_color("#0b041c")
      .child(image(`${A}/img/radar.png`).absolute().left(0).top(0).size(R * 2).rounded_full())
      .child(div().absolute().left(0).top(0).size(R * 2).rounded_full().bg("#0b041c40"))
      .child(svg(`${A}/icons/cross.svg`).absolute().left(0).top(0).size(R * 2).text_color(C.hot))
      .child(svg(`${A}/icons/sweep.svg`).absolute().left(0).top(0).size(R * 2).text_color(C.teal).spin(3600))
      .children(blips.filter(Boolean))
      .child(div().absolute().left(R - 8).top(R - 8).child(icon("arrow", 16, C.text)))
      .child(div().absolute().left(R - 4).top(4).font_family(BEBAS).text_size(12).text_color(C.text).child("N"));
    return v_flex()
      .id("radar")
      .bg(C.night)
      .rounded(8)
      .w(R * 2 + 12)
      .p(6)
      .gap(6)
      .font_family(UI)
      .child(map)
      .child(bar("HP", "heart", crew.length ? 1 - blocked / total : 1, C.green))
      .child(bar("ARM", "shield", crew.length ? working / total : 0, C.blue))
      .child(
        div()
          .font_family(BEBAS)
          .text_size(13)
          .text_color(C.dim)
          .text_center()
          .child(`${crew.length} CREW · ${ds.length} DISTRICT${ds.length === 1 ? "" : "S"}`),
      );
  }
}
