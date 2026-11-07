// The big centered banner (a floating block at the top): MISSION PASSED,
// HEAT'S ON, or a welcome line. Renders nothing between banners, so the block
// disappears.

import { div, image } from "gpui-kit";
import { v_flex } from "gpui-base";
import { shared, setShared } from "herdr";
import { A, C, PRICEDOWN, UI } from "./kit.js";

const ART = { passed: ["passed.png", 524, 99], wanted: ["wanted.png", 400, 101] };

export default class Banner {
  init(_p, cx) {
    cx.timer.every(400, (cx) => {
      const b = shared("gta6.banner");
      if (b && Date.now() > b.until) {
        setShared("gta6.banner", null);
        cx.notify();
      }
    });
  }

  render(_cx) {
    const b = shared("gta6.banner");
    if (!b || Date.now() > b.until) return div();
    const art = ART[b.kind];
    const head = art
      ? image(`${A}/img/${art[0]}`).w(art[1]).h(art[2])
      : div().font_family(PRICEDOWN).text_size(54).line_height("58px").text_color(C.hot).child(b.title);
    return v_flex()
      .id(`banner-${b.n}`)
      .items_center()
      .bg(C.night)
      .rounded(10)
      .px(28)
      .py(8)
      .gap(2)
      .child(head)
      .when(Boolean(b.sub), (el) =>
        el.child(
          div()
            .font_family(UI)
            .font_weight(700)
            .text_size(16)
            .text_color(b.kind === "wanted" ? "#ffd1d8" : C.text)
            .child(b.sub),
        ),
      );
  }
}
