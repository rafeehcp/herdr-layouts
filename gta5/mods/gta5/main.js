// Herdr: Los Santos Edition. A sunny GTA V-style HUD for the gta5 layout, one mod in
// roles (the layout gives each copy props { role }):
//   hud      the top bar: logo, districts (spaces), missions (tabs), radio, wanted stars, cash, clock
//   mission  a pane's header
//   radar    the minimap with every agent as a blip, health and armor
//   banner   MISSION PASSED / WASTED / WANTED / welcome, centered at the top

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Hud from "./hud.js";
import Mission from "./mission.js";
import Radar from "./radar.js";
import Banner from "./banner.js";

const ROLES = { hud: Hud, mission: Mission, radar: Radar, banner: Banner };

export default class LosSantos extends View {
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
    if (!this.role) return div().child(`gta5: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
