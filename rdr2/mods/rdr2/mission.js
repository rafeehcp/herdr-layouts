// A pane's header: a journal strip. The focused pane is today's entry (bright
// paper, a red ribbon), the others are older pages. Status is a rubber stamp.
// Split, zoom and close on the right; double-click zooms, middle-click closes.

import { div, image, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home } from "herdr";
import { A, C, RYE, FELL, TYPE, STATUS, icon, inkButton } from "./kit.js";

function where(cwd) {
  if (!cwd) return "";
  const h = (home() ?? "").replace(/\\/g, "/");
  const p = cwd.replace(/\\/g, "/");
  return h && p.toLowerCase().startsWith(h.toLowerCase()) ? `~${p.slice(h.length)}` : p;
}

const STAMP = { working: "AT WORK", blocked: "NEEDS YOU", done: "DONE", idle: "RESTING" };

export default class Mission {
  init() {}

  render(_cx) {
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    const on = Boolean(p?.focused);
    const prog = p?.program;
    const name = p?.mod ? p.title || p.mod : !prog || prog.shell ? "Trail Notes" : prog.name;
    const col = { working: "#8a5a10", blocked: C.blood, done: C.green, idle: C.inkSoft }[p?.status] ?? null;
    const pic = prog?.icon && !prog.shell ? (prog.tint ? svg(prog.icon).size(14).text_color(C.ink) : image(prog.icon).size(14)) : icon("hat", 15, C.ink);
    return div()
      .id(`ms-${id}`)
      .relative()
      .size_full()
      .overflow_hidden()
      .on_click((e) => {
        run("pane.focus", { pane: id });
        if (e?.click_count === 2) run("pane.zoom", { pane: id });
      })
      .on_mouse_down("middle", (_e, cx) => {
        cx.stop_propagation();
        run("pane.close", { pane: id });
      })
      .child(image(`${A}/img/${on ? "strip" : "strip-dim"}.jpg`).absolute().left(0).top(-25).w(1920).h(80))
      .child(
        h_flex()
          .absolute()
          .left(0)
          .top(0)
          .size_full()
          .pr(4)
          .gap(8)
          .items_center()
          .child(div().w(on ? 6 : 0).h_full().bg(C.blood))
          .child(pic)
          .child(div().flex_none().font_family(RYE).text_size(15).text_color(C.ink).child(name))
          .child(
            div()
              .flex_1()
              .min_w(0)
              .truncate()
              .font_family(TYPE)
              .text_size(12)
              .text_color(on ? C.inkSoft : "#2b1a0ecc")
              .child([where(p?.cwd), p?.branch ? `branch ${p.branch}` : "", p?.title && p.title !== name ? p.title : ""].filter(Boolean).join("   ·   ")),
          )
          .when(Boolean(col), (el) =>
            el.child(
              div()
                .flex_none()
                .px(5)
                .border(2)
                .border_color(col)
                .font_family(TYPE)
                .text_size(11)
                .text_color(col)
                .child(STAMP[p.status] ?? String(p.status).toUpperCase())
                .when(p.status === "blocked", (d) => d.loop("opacity", { from: 0.35, to: 1, period: 650 })),
            ),
          )
          .child(inkButton(`ms-split-${id}`, icon("split", 13), () => run("pane.split", { direction: "right", pane: id }), { size: 22, tip: "Split (ride with a partner)" }))
          .child(inkButton(`ms-zoom-${id}`, icon("zoom", 13), () => run("pane.zoom", { pane: id }), { size: 22, tip: p?.zoomed ? "Restore" : "Zoom" }))
          .child(inkButton(`ms-close-${id}`, icon("close", 11), () => run("pane.close", { pane: id }), { size: 22, tip: "Abandon the job", hover: "#8e1b1455" })),
      );
  }
}
