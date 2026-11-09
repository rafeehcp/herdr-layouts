// The top HUD (Los Santos): logo, districts (spaces), missions (tabs), the radio, wanted
// stars, cash and the clock. It also turns agent changes into game events:
// an agent finishing pays out and shows MISSION PASSED; one getting blocked
// raises the heat.

import { div, image } from "gpui-kit";
import { gestures, closeTab, panelButtons, searchIcon, withUpdateDot } from "./extras.js";
import { h_flex, v_flex } from "gpui-base";
import { spaces, agents, run, shared, setShared, openOverlay, window as appWindow } from "herdr";
import {
  A, C, SWITCH, PRICEDOWN, BEBAS, UI, STATUS, STATIONS, icon, hudButton, stop, sfx, money, cash, addCash, banner,
  radio, radioPlay, radioStop,
} from "./kit.js";

const pad = (n) => String(n).padStart(2, "0");

export default class Hud {
  init(_p, cx) {
    this.now = new Date();
    this.seen = new Map(agents().map((a) => [a.address, a]));
    cx.timer.every(1000, (cx) => {
      const t = new Date();
      const changed = this.events();
      if (t.getMinutes() !== this.now.getMinutes() || changed) {
        this.now = t;
        cx.notify();
      }
    });
    // Arriving in Vice: the welcome and, unless turned off, the radio.
    sfx("radio");
    banner("welcome", "welcome to los santos", "Agents are crew. Tabs are missions. Finish them to get paid.", 3800);
    if (radio().on) cx.spawn(async () => radioPlay());
  }

  async close() {
    await radioStop(false);
  }

  events() {
    let any = false;
    const next = new Map();
    for (const a of agents()) {
      const was = this.seen.get(a.address)?.status;
      next.set(a.address, a);
      if (was === a.status) continue;
      any = true;
      if (a.status === "done" && was === "working") {
        const pay = Math.round((5000 + Math.random() * 70000) / 100) * 100;
        addCash(pay);
        sfx("passed");
        banner("passed", "mission passed", `${a.program?.name ?? "Crew"} · ${a.tab_name || a.space_name}   +$${pay.toLocaleString("en-US")}`);
      } else if (a.status === "blocked") {
        sfx("wanted");
        banner("wanted", "wanted", `${a.program?.name ?? "Crew"} in ${a.space_name} needs you`, 3600);
      }
    }
    // A crew member gone mid-job: wasted.
    for (const [addr, a] of this.seen) {
      if (next.has(addr) || a.status !== "working") continue;
      sfx("wasted");
      banner("wasted", "wasted", `${a.program?.name ?? "Crew"} in ${a.space_name} went down mid-job`, 3800);
    }
    if (next.size !== this.seen.size) any = true;
    this.seen = next;
    return any;
  }

  logo() {
    return div()
      .flex_none()
      .px(6)
      .on_mouse_down("left", stop)
      .id("logo")
      .cursor_pointer()
      .on_click(() => {
        sfx("cash");
        banner("welcome", "welcome to los santos", "Ctrl+Shift+L to leave town.", 2600);
      })
      .child(image(`${A}/img/logo.png`).h(40).w(94));
  }

  districts() {
    const list = spaces();
    return h_flex()
      .id("districts")
      .flex_none()
      .max_w(360)
      .overflow_x_scroll()
      .gap(2)
      .items_center()
      .children(
        list.map((s, i) => {
          const col = STATUS[s.status] ?? null;
          return v_flex()
            .id(`d-${s.id}`)
            .flex_none()
            .px(9)
            .h(38)
            .justify_center()
            .rounded(6)
            .cursor_pointer()
            .when(s.active, (el) => el.bg("#f2c94c22"))
            .hover((st) => st.bg("#ffffff22"))
            .on_mouse_down("left", stop)
            .when(true, (el) => gestures(el, this, "space", s.id))
            .child(
              h_flex()
                .gap(5)
                .items_center()
                .child(div().font_family(BEBAS).text_size(19).text_color(s.active ? C.text : C.soft).child(s.name.toUpperCase()))
                .when(Boolean(col), (el) =>
                  el.child(
                    div()
                      .size(7)
                      .rounded_full()
                      .bg(col)
                      .when(s.status === "blocked" || s.status === "working", (d) => d.loop("opacity", { from: 0.25, to: 1, period: 900 })),
                  ),
                ),
            )
            .child(div().h(3).w_full().rounded(1).bg(s.active ? SWITCH[i % 3] : `${SWITCH[i % 3]}55`));
        }),
      )
      .child(hudButton("d-new", icon("plus", 14), () => run("space.new", {}), { tip: "New district (space)", size: 24 }));
  }

  missions() {
    const s = spaces().find((x) => x.active);
    if (!s) return div().flex_1();
    const crew = agents();
    return h_flex()
      .id("missions")
      .flex_1()
      .min_w(0)
      .overflow_x_scroll()
      .gap(6)
      .items_center()
      .px(8)
      .children(
        s.tabs.map((t, i) => {
          const who = crew.find((a) => a.tab === t.id);
          const col = STATUS[t.status] ?? C.dim;
          return h_flex()
            .id(`m-${t.id}`)
            .flex_none()
            .h(32)
            .pl(4)
            .pr(10)
            .gap(7)
            .items_center()
            .rounded(16)
            .border(1)
            .border_color(t.active ? C.pink : "#ffffff22")
            .bg(t.active ? "#141414e6" : "#00000099")
            .cursor_pointer()
            .hover((st) => st.border_color(C.hot))
            .on_mouse_down("left", stop)
            .when(true, (el) => gestures(el, this, "tab", t.id, s.id))
            .child(
              div()
                .size(24)
                .rounded_full()
                .flex()
                .items_center()
                .justify_center()
                .bg(t.active ? C.gold : "#ffffff1a")
                .font_family(BEBAS)
                .text_size(15)
                .text_color(t.active ? C.night : C.soft)
                .child(String(i + 1)),
            )
            .child(
              div()
                .max_w(170)
                .truncate()
                .font_family(UI)
                .font_weight(700)
                .text_size(14)
                .text_color(t.active ? C.text : C.soft)
                .child((t.named ? t.name : who?.program?.name ?? `Mission ${i + 1}`) + (t.zoomed ? " · Z" : "")),
            )
            .when(Boolean(t.status), (el) =>
              el.child(
                div()
                  .size(8)
                  .rounded_full()
                  .bg(col)
                  .when(t.status === "working" || t.status === "blocked", (d) => d.loop("opacity", { from: 0.2, to: 1, period: t.status === "blocked" ? 500 : 1100 })),
              ),
            )
            .when(t.active, (el) => el.child(closeTab(t.id, icon("close", 10))));
        }),
      )
      .child(hudButton("m-new", icon("plus", 15), () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }), { tip: "New mission (tab)", size: 28, radius: 14 }));
  }

  radioWidget() {
    const r = radio();
    const st = STATIONS[r.station % STATIONS.length];
    const playing = r.on && r.playing;
    const tune = (d) => {
      sfx("radio");
      radioPlay({ station: (r.station + d + STATIONS.length) % STATIONS.length });
    };
    const bars = [0, 1, 2, 3, 4].map((i) =>
      div()
        .w(3)
        .rounded(1)
        .bg(st.color)
        .h(playing ? 14 : 3)
        .when(playing, (el) => el.loop("height", { from: 3, to: 15 - (i % 3) * 2, period: 420 + i * 130 })),
    );
    return h_flex()
      .id("radio")
      .flex_none()
      .h(42)
      .pl(6)
      .pr(4)
      .gap(4)
      .items_center()
      .rounded(10)
      .border(1)
      .border_color(playing ? `${st.color}aa` : "#ffffff22")
      .bg("#000000b3")
      .on_mouse_down("left", stop)
      .on_scroll_wheel((e, cx) => {
        // Show the new volume at once; restart the stream once scrolling stops.
        const dy = e?.delta?.y ?? 0;
        if (!dy) return;
        const vol = Math.max(5, Math.min(100, r.volume + (dy > 0 ? 5 : -5)));
        if (vol === r.volume) return;
        setShared("gta5.radio", { ...shared("gta5.radio"), volume: vol });
        const token = (this.volToken = (this.volToken ?? 0) + 1);
        cx.timer.after(600, () => {
          if (token === this.volToken && radio().on) radioPlay();
        });
      })
      .tooltip(`${st.name} · ${st.tag}\nVolume ${r.volume}% (scroll to change)${r.error ? `\n${r.error}` : ""}`)
      .child(hudButton("r-prev", icon("prev", 13), () => tune(-1), { size: 24 }))
      .child(
        v_flex()
          .w(118)
          .child(
            h_flex()
              .gap(5)
              .items_center()
              .child(icon("radio", 13, st.color))
              .child(div().font_family(BEBAS).text_size(17).text_color(C.text).truncate().child(st.name.toUpperCase())),
          )
          .child(
            h_flex()
              .gap(5)
              .items_center()
              .child(h_flex().gap(2).items_end().h(15).children(bars))
              .child(
                div()
                  .font_family(UI)
                  .font_weight(600)
                  .text_size(11)
                  .text_color(r.busy ? C.gold : C.dim)
                  .truncate()
                  .child(r.busy ? "TUNING…" : playing ? `${st.tag} · ${r.volume}%` : r.error ? "NO SIGNAL" : "RADIO OFF"),
              ),
          ),
      )
      .child(hudButton("r-next", icon("next", 13), () => tune(1), { size: 24 }))
      .child(
        hudButton("r-play", icon(playing || r.busy ? "stop" : "play", 14, playing ? st.color : C.text), () => (playing || r.busy ? radioStop() : radioPlay()), {
          size: 30,
          radius: 15,
          tip: playing ? "Radio off" : "Radio on",
        }),
      );
  }

  wanted() {
    const crew = agents();
    const blocked = crew.filter((a) => a.status === "blocked").length;
    const working = crew.filter((a) => a.status === "working").length;
    const lit = Math.min(5, blocked * 2 + working);
    const hot = blocked > 0;
    return v_flex()
      .flex_none()
      .items_end()
      .gap(0)
      .tooltip(`${working} working · ${blocked} need you`)
      .id("wanted")
      .child(
        h_flex()
          .gap(1)
          .children(
            [0, 1, 2, 3, 4].map((i) => {
              const on = i < lit;
              const st = icon(on ? "star" : "star-o", 15, on ? (hot ? C.red : C.text) : "#ffffff55");
              return on && hot ? div().child(st).loop("opacity", { from: 0.2, to: 1, period: 520 }) : st;
            }),
          ),
      )
      .child(div().font_family(PRICEDOWN).text_size(24).line_height("24px").text_color(C.money).child(money(cash())));
  }

  clock() {
    const d = this.now;
    return v_flex()
      .flex_none()
      .items_end()
      .px(6)
      .child(div().font_family(PRICEDOWN).text_size(26).line_height("26px").text_color(C.text).child(`${pad(d.getHours())}:${pad(d.getMinutes())}`))
      .child(
        div()
          .font_family(UI)
          .font_weight(700)
          .text_size(10.5)
          .text_color(C.hot)
          .child(`${"SUN MON TUE WED THU FRI SAT".split(" ")[d.getDay()]} ${"JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ")[d.getMonth()]} ${d.getDate()}` + " · LOS SANTOS"),
      );
  }

  render(_cx) {
    const w = appWindow();
    const winBtn = (id, name, cmd, hover) => hudButton(id, icon(name, 15), () => run(cmd), { size: 30, radius: 6, hover });
    return h_flex()
      .id("hud")
      .on_mouse_up("left", () => { this.pressed = null; })
      .size_full()
      .px(8)
      .gap(8)
      .items_center()
      .font_family(UI)
      .text_color(C.text)
      .bg("#000000a6")
      .border_b(1)
      .border_color(C.line)
      .child(this.logo())
      .child(panelButtons(hudButton, C.pink))
      .child(this.districts())
      .child(div().w(1).h(30).bg("#ffffff22").flex_none())
      .child(this.missions())
      .child(this.radioWidget())
      .child(this.wanted())
      .child(this.clock())
      .child(hudButton("search", searchIcon(16), () => run("mod.open", { name: "picker" }), { tip: "Search", size: 30 }))
      .child(withUpdateDot(hudButton("settings", icon("settings", 16), () => run("app.settings"), { tip: "Settings", size: 30 }), C.pink))
      .when(Boolean(w?.buttons), (el) =>
        el
          .child(winBtn("w-min", "win-min", "window.minimize"))
          .child(winBtn("w-max", w.maximized ? "win-restore" : "win-max", "window.maximize"))
          .child(winBtn("w-close", "win-close", "window.close", "#ff3b5ccc")),
      );
  }
}
