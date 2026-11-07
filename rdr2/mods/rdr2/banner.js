// The big banner (a floating block at the top): MISSION COMPLETE on its red
// brush stroke, a WANTED poster for a partner stuck waiting, or a line of
// news. Renders nothing between banners, so the block disappears.

import { div, image } from "gpui-kit";
import { v_flex } from "gpui-base";
import { shared, setShared } from "herdr";
import { A, C, RYE, FELL, TYPE } from "./kit.js";

export default class Banner {
  init(_p, cx) {
    cx.timer.every(400, (cx) => {
      const b = shared("rdr2.banner");
      if (b && Date.now() > b.until) {
        setShared("rdr2.banner", null);
        cx.notify();
      }
    });
  }

  render(_cx) {
    const b = shared("rdr2.banner");
    if (!b || Date.now() > b.until) return div();
    if (b.kind === "wanted") {
      const W = 250, H = 289;
      return div()
        .id(`banner-${b.n}`)
        .relative()
        .w(W)
        .h(H)
        .child(image(`${A}/img/poster.png`).absolute().left(0).top(0).w(W).h(H))
        .child(
          v_flex()
            .absolute()
            .left(0)
            .top(118)
            .w(W)
            .items_center()
            .gap(2)
            .child(div().font_family(RYE).text_size(24).text_color(C.ink).child(b.sub))
            .child(div().font_family(TYPE).text_size(12).text_color(C.inkSoft).child(`last seen in ${b.place}`))
            .child(div().font_family(FELL).italic().text_size(13).text_color(C.inkSoft).child("for keeping a partner waiting"))
            .child(div().pt(6).font_family(RYE).text_size(26).text_color(C.blood).child(`$${b.reward} REWARD`)),
        );
    }
    const head =
      b.kind === "complete"
        ? image(`${A}/img/complete.png`).w(560).h(93)
        : div().font_family(FELL).text_size(40).text_color(b.kind === "lost" ? C.blood : C.ink).child(b.title);
    return v_flex()
      .id(`banner-${b.n}`)
      .items_center()
      .px(24)
      .py(8)
      .gap(2)
      .child(head)
      .when(Boolean(b.sub), (el) => el.child(div().font_family(FELL).italic().text_size(16).text_color(C.inkSoft).child(b.sub)));
  }
}
