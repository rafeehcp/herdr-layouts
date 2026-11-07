// The masthead: THE HERDR GAZETTE, printed on parchment. Towns (spaces), the
// day's jobs (tabs, numbered in Roman numerals), the phonograph, honor, the
// satchel's money and the date, always 1899. It also turns agent changes
// into frontier news: a job finished pays out and shows MISSION COMPLETE, a
// partner stuck waiting goes on a WANTED poster, one lost mid-job costs honor.

import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, agents, run, shared, setShared, openOverlay, window as appWindow } from "herdr";
import {
  A, C, RYE, FELL, TYPE, STATUS, RECORDS, icon, inkButton, stop, sfx, dollars, cents, addCents, honor, addHonor, banner,
  phono, phonoPlay, phonoStop,
} from "./kit.js";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
const roman = (n) => ROMAN[n - 1] ?? String(n);

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

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
    sfx("radio");
    banner("welcome", "Welcome to the Frontier", "Partners are agents. Jobs are tabs. Finish them for honor and pay.", 4000);
    if (phono().on) cx.spawn(async () => phonoPlay());
  }

  async close() {
    await phonoStop(false);
  }

  events() {
    let any = false;
    const next = new Map();
    for (const a of agents()) {
      const was = this.seen.get(a.address)?.status;
      next.set(a.address, a);
      if (was === a.status) continue;
      any = true;
      const who = a.program?.name ?? "Your partner";
      if (a.status === "done" && was === "working") {
        const pay = 500 + Math.floor(Math.random() * 7500);
        addCents(pay);
        addHonor(1);
        sfx("passed");
        banner("complete", "Mission Complete", `${who} · ${a.tab_name || a.space_name}     +${dollars(pay)}     Honor increased`);
      } else if (a.status === "blocked") {
        sfx("wanted");
        banner("wanted", "Wanted", `${who}`, 5000, { place: a.space_name, reward: (1 + Math.floor(Math.random() * 9)) * 50 });
      }
    }
    for (const [addr, a] of this.seen) {
      if (next.has(addr) || a.status !== "working") continue;
      addHonor(-1);
      sfx("wasted");
      banner("lost", "A partner has fallen", `${a.program?.name ?? "A partner"} in ${a.space_name} was lost mid-job.  Honor decreased`, 4000);
    }
    if (next.size !== this.seen.size) any = true;
    this.seen = next;
    return any;
  }

  masthead() {
    const vol = spaces().length;
    return v_flex()
      .id("masthead")
      .flex_none()
      .pl(6)
      .pr(4)
      .cursor_pointer()
      .on_mouse_down("left", stop)
      .on_click(() => {
        sfx("cash");
        banner("welcome", "Extra! Extra!", "Ctrl+Shift+L rides out of town.", 2600);
      })
      .child(div().font_family(RYE).text_size(23).line_height("26px").text_color(C.ink).child("THE HERDR GAZETTE"))
      .child(
        div()
          .font_family(FELL)
          .italic()
          .text_size(12)
          .text_color(C.inkSoft)
          .child(`Est. 1899  ·  Vol. ${roman(Math.max(1, vol))}  ·  Price 5 cents`),
      );
  }

  towns() {
    return h_flex()
      .id("towns")
      .flex_none()
      .max_w(340)
      .overflow_x_scroll()
      .gap(2)
      .items_center()
      .children(
        spaces().map((s) => {
          const col = STATUS[s.status] ?? null;
          return v_flex()
            .id(`t-${s.id}`)
            .flex_none()
            .px(8)
            .h(44)
            .justify_center()
            .items_center()
            .rounded(3)
            .cursor_pointer()
            .hover((st) => st.bg("#2b1a0e14"))
            .on_mouse_down("left", stop)
            .on_click(() => run("space.select", { id: s.id }))
            .child(
              h_flex()
                .gap(5)
                .items_center()
                .child(div().font_family(FELL).text_size(17).text_color(s.active ? C.ink : C.faded).child(s.name.toUpperCase()))
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
            .child(div().h(2).w_full().bg(s.active ? C.blood : "#00000000"));
        }),
      )
      .child(inkButton("t-new", icon("plus", 13), () => run("space.new", {}), { tip: "Found a new town (space)", size: 22 }));
  }

  jobs() {
    const s = spaces().find((x) => x.active);
    if (!s) return div().flex_1();
    const crew = agents();
    return h_flex()
      .id("jobs")
      .flex_1()
      .min_w(0)
      .overflow_x_scroll()
      .gap(6)
      .items_center()
      .px(6)
      .children(
        s.tabs.map((t, i) => {
          const who = crew.find((a) => a.tab === t.id);
          const col = STATUS[t.status] ?? C.faded;
          return h_flex()
            .id(`j-${t.id}`)
            .flex_none()
            .h(30)
            .pl(2)
            .pr(9)
            .gap(6)
            .items_center()
            .border(1)
            .border_color(t.active ? C.ink : "#2b1a0e55")
            .bg(t.active ? "#2b1a0e" : "#ecdcb680")
            .cursor_pointer()
            .hover((st) => st.border_color(C.ink))
            .on_mouse_down("left", stop)
            .on_click(() => run("tab.select", { id: t.id }))
            .on_mouse_down("middle", (_e, cx) => {
              cx.stop_propagation();
              run("tab.close", { id: t.id, confirmed: true });
            })
            .on_mouse_down("right", (_e, cx) => {
              cx.stop_propagation();
              openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: t.id, space: s.id } } });
            })
            .child(
              div()
                .min_w(24)
                .h(24)
                .px(3)
                .flex()
                .items_center()
                .justify_center()
                .border_r(1)
                .border_color(t.active ? "#dcc49755" : "#2b1a0e40")
                .font_family(RYE)
                .text_size(13)
                .text_color(t.active ? C.paperHi : C.blood)
                .child(roman(i + 1)),
            )
            .child(
              div()
                .max_w(170)
                .truncate()
                .font_family(FELL)
                .text_size(15)
                .text_color(t.active ? C.paperHi : C.ink)
                .child(t.named ? t.name : who?.program?.name ?? `Job ${roman(i + 1)}`),
            )
            .when(Boolean(t.status), (el) =>
              el.child(
                div()
                  .size(8)
                  .rounded_full()
                  .bg(col)
                  .when(t.status === "working" || t.status === "blocked", (d) => d.loop("opacity", { from: 0.2, to: 1, period: t.status === "blocked" ? 500 : 1100 })),
              ),
            );
        }),
      )
      .child(inkButton("j-new", icon("plus", 14), () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }), { tip: "Take on a new job (tab)", size: 26 }));
  }

  phonograph() {
    const r = phono();
    const rec = RECORDS[r.record % RECORDS.length];
    const playing = r.on && r.playing;
    const turn = (d) => {
      sfx("radio");
      phonoPlay({ record: (r.record + d + RECORDS.length) % RECORDS.length });
    };
    const disc = icon("disc", 30, playing ? C.ink : C.faded);
    return h_flex()
      .id("phono")
      .flex_none()
      .h(46)
      .pl(4)
      .pr(4)
      .gap(4)
      .items_center()
      .border(1)
      .border_color(playing ? C.ink : "#2b1a0e55")
      .bg("#ecdcb699")
      .on_mouse_down("left", stop)
      .on_scroll_wheel((e, cx) => {
        const dy = e?.delta?.y ?? 0;
        if (!dy) return;
        const vol = Math.max(5, Math.min(100, r.volume + (dy > 0 ? 5 : -5)));
        if (vol === r.volume) return;
        setShared("rdr2.phono", { ...shared("rdr2.phono"), volume: vol });
        const token = (this.volToken = (this.volToken ?? 0) + 1);
        cx.timer.after(600, () => {
          if (token === this.volToken && phono().on) phonoPlay();
        });
      })
      .tooltip(`${rec.name} · ${rec.by}\nVolume ${r.volume}% (scroll to change)${r.error ? `\n${r.error}` : ""}`)
      .child(inkButton("p-prev", icon("prev", 12), () => turn(-1), { size: 22 }))
      .child(playing ? div().child(disc.spin(1800)) : disc)
      .child(
        v_flex()
          .w(132)
          .child(div().font_family(FELL).text_size(14).line_height("16px").text_color(C.ink).truncate().child(rec.name))
          .child(
            div()
              .font_family(TYPE)
              .text_size(10.5)
              .text_color(r.busy ? C.blood : C.inkSoft)
              .truncate()
              .child(r.busy ? "winding the crank..." : playing ? rec.by : r.error ? "the needle skipped" : "phonograph at rest"),
          ),
      )
      .child(inkButton("p-next", icon("next", 12), () => turn(1), { size: 22 }))
      .child(
        inkButton("p-play", icon(playing || r.busy ? "stop" : "play", 13, playing ? C.blood : C.ink), () => (playing || r.busy ? phonoStop() : phonoPlay()), {
          size: 28,
          radius: 14,
          tip: playing ? "Lift the needle" : "Drop the needle",
        }),
      );
  }

  honorMeter() {
    const h = honor();
    const pos = Math.round(((h + 10) / 20) * 96);
    const word = h >= 6 ? "Honorable" : h >= 2 ? "Decent" : h > -2 ? "Neutral" : h > -6 ? "Shady" : "Outlaw";
    return v_flex()
      .flex_none()
      .gap(3)
      .id("honor")
      .tooltip(`Honor ${h > 0 ? "+" : ""}${h}: rises with finished jobs, falls with partners lost mid-job`)
      .child(
        h_flex()
          .justify_between()
          .w(100)
          .child(div().font_family(FELL).italic().text_size(11).text_color(C.inkSoft).child("Honor"))
          .child(div().font_family(FELL).text_size(11).text_color(h < 0 ? C.blood : C.ink).child(word)),
      )
      .child(
        div()
          .relative()
          .w(100)
          .h(8)
          .border(1)
          .border_color(C.ink)
          .bg(C.paperHi)
          .child(div().absolute().left(0).top(0).h_full().w(48).bg("#8e1b1455"))
          .child(div().absolute().left(pos).top(-3).w(3).h(12).bg(C.ink).transition("left", 500)),
      )
      .child(div().font_family(TYPE).text_size(15).text_color(C.ink).child(dollars(cents())));
  }

  date() {
    const d = this.now;
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, "0");
    return v_flex()
      .flex_none()
      .items_end()
      .px(4)
      .child(div().font_family(RYE).text_size(19).line_height("22px").text_color(C.ink).child(`${h}:${m} ${d.getHours() < 12 ? "a.m." : "p.m."}`))
      .child(
        div()
          .font_family(FELL)
          .italic()
          .text_size(12)
          .text_color(C.inkSoft)
          .child(`${DAYS[d.getDay()]}, the ${ordinal(d.getDate())} of ${MONTHS[d.getMonth()]}, 1899`),
      );
  }

  render(_cx) {
    const w = appWindow();
    const winBtn = (id, name, cmd, hover) => inkButton(id, icon(name, 15), () => run(cmd), { size: 28, radius: 3, hover });
    const rule = () => div().w(1).h(40).bg("#2b1a0e55").flex_none();
    return div()
      .id("hud")
      .relative()
      .size_full()
      .overflow_hidden()
      // Images keep their aspect ratio: draw the paper wider than any window and clip it.
      .child(image(`${A}/img/masthead.jpg`).absolute().left(0).top(-34).w(3840).h(128))
      .child(
        h_flex()
          .absolute()
          .left(0)
          .top(0)
          .size_full()
          .px(8)
          .gap(8)
          .items_center()
          .border_b(2)
          .border_color(C.ink)
          .child(this.masthead())
          .child(rule())
          .child(this.towns())
          .child(rule())
          .child(this.jobs())
          .child(this.phonograph())
          .child(this.honorMeter())
          .child(rule())
          .child(this.date())
          .child(inkButton("settings", icon("settings", 15), () => run("app.settings"), { tip: "Settings", size: 28 }))
          .when(Boolean(w?.buttons), (el) =>
            el
              .child(winBtn("w-min", "win-min", "window.minimize"))
              .child(winBtn("w-max", w.maximized ? "win-restore" : "win-max", "window.maximize"))
              .child(winBtn("w-close", "win-close", "window.close", "#8e1b14cc")),
          ),
      );
  }
}
