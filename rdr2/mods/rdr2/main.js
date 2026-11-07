// Herdr: Frontier Edition (1899). A Red Dead-style HUD for the rdr2 layout, one mod in
// roles (the layout gives each copy props { role }):
//   hud      THE HERDR GAZETTE masthead: towns (spaces), jobs (tabs), phonograph, honor, money, date
//   mission  a pane's header, a journal strip
//   radar    the round map and the three cores
//   banner   MISSION COMPLETE / a WANTED poster / news, centered at the top

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Hud from "./hud.js";
import Mission from "./mission.js";
import Radar from "./radar.js";
import Banner from "./banner.js";

const ROLES = { hud: Hud, mission: Mission, radar: Radar, banner: Banner };

export default class Frontier extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  async close(cx) {
    await this.role?.close?.(cx);
  }

  render(cx) {
    if (!this.role) return div().child(`rdr2: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
