// A pane's header: the mission card. The focused pane is the active mission
// (hot pink), the others wait in the dark. Split, zoom and close on the right;
// double-click zooms, middle-click closes.

import { div, image, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home } from "herdr";
import { C, BEBAS, UI, STATUS, icon, hudButton, stop } from "./kit.js";

function where(cwd) {
  if (!cwd) return "";
  const h = (home() ?? "").replace(/\\/g, "/");
  const p = cwd.replace(/\\/g, "/");
  return h && p.toLowerCase().startsWith(h.toLowerCase()) ? `~${p.slice(h.length)}` : p;
}

export default class Mission {
  init() {}

  render(_cx) {
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    const on = Boolean(p?.focused);
    const prog = p?.program;
    const name = p?.mod ? p.title || p.mod : !prog || prog.shell ? "Street" : prog.name;
    const col = STATUS[p?.status] ?? null;
    const pic = prog?.icon && !prog.shell ? (prog.tint ? svg(prog.icon).size(14).text_color(C.text) : image(prog.icon).size(14)) : icon("arrow", 12, on ? C.night : C.pink);
    return h_flex()
      .id(`ms-${id}`)
      .size_full()
      .pl(4)
      .pr(4)
      .gap(8)
      .items_center()
      .bg(on ? "#3a0d4cf2" : "#12062ae6")
      .border_b(1)
      .border_color(on ? C.pink : "#ffffff14")
      .on_click((e, cx) => {
        run("pane.focus", { pane: id });
        if (e?.click_count === 2) run("pane.zoom", { pane: id });
      })
      .on_mouse_down("middle", (_e, cx) => {
        cx.stop_propagation();
        run("pane.close", { pane: id });
      })
      .child(
        h_flex()
          .flex_none()
          .h(20)
          .px(6)
          .gap(5)
          .items_center()
          .rounded(4)
          .bg(on ? C.pink : "#ffffff14")
          .child(pic)
          .child(div().font_family(BEBAS).text_size(15).text_color(on ? C.night : C.soft).child(on ? "ACTIVE MISSION" : "MISSION")),
      )
      .child(div().flex_none().font_family(BEBAS).text_size(18).text_color(on ? C.text : C.soft).child(name.toUpperCase()))
      .child(
        div()
          .flex_1()
          .min_w(0)
          .truncate()
          .font_family(UI)
          .font_weight(600)
          .text_size(12.5)
          .text_color(on ? C.soft : C.dim)
          .child([where(p?.cwd), p?.branch ? `⎇ ${p.branch}` : "", p?.title && p.title !== name ? p.title : ""].filter(Boolean).join("   ·   ")),
      )
      .when(Boolean(col), (el) =>
        el.child(
          div()
            .flex_none()
            .px(6)
            .rounded(4)
            .border(1)
            .border_color(col)
            .font_family(BEBAS)
            .text_size(14)
            .text_color(col)
            .child(String(p.status).toUpperCase())
            .when(p.status === "blocked", (d) => d.loop("opacity", { from: 0.3, to: 1, period: 600 })),
        ),
      )
      .child(hudButton(`ms-split-${id}`, icon("split", 13), () => run("pane.split", { direction: "right", pane: id }), { size: 22, radius: 5, tip: "Split (call backup)" }))
      .child(hudButton(`ms-zoom-${id}`, icon("zoom", 13), () => run("pane.zoom", { pane: id }), { size: 22, radius: 5, tip: p?.zoomed ? "Restore" : "Zoom" }))
      .child(hudButton(`ms-close-${id}`, icon("close", 11), () => run("pane.close", { pane: id }), { size: 22, radius: 5, tip: "Abort mission", hover: "#ff3b5ccc" }));
  }
}
