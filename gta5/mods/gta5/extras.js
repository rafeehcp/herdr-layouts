// What Herdr's default layout does that the HUD would otherwise lose:
// - spaces and tabs: drag onto another to reorder, double-click to rename,
//   middle-click to close (no confirm), right-click for their menu
// - a side panel on the left: Crew (the spaces and agents lists), Files, Changes
//   and, when the layout has it, Git; a button opens or closes each
// - search, and a dot on Settings when an update is ready
// Shared by the gta6, gta5 and rdr2 HUDs; keep the copies the same.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, run, openOverlay, layout, updates } from "herdr";

export const MENU = "menu";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// `hud` keeps the press, so letting go over another space or tab moves it there.
export function gestures(el, hud, kind, id, space) {
  const order = () => (kind === "space" ? spaces() : spaces().find((s) => s.id === space)?.tabs ?? []).map((x) => x.id);
  return el
    .on_mouse_down("left", (e, cx) => {
      cx.stop_propagation();
      hud.pressed = { kind, id };
      if (e?.click_count === 2) run(`${kind}.rename`, { id });
    })
    .on_mouse_up("left", () => {
      const from = hud.pressed;
      hud.pressed = null;
      const to = order().indexOf(id);
      if (from && from.kind === kind && from.id !== id && to !== -1) run(`${kind}.move`, { id: from.id, index: to + 1 });
      else run(`${kind}.select`, { id });
    })
    .on_mouse_down("middle", (_e, cx) => {
      cx.stop_propagation();
      run(`${kind}.close`, { id, confirmed: true });
    })
    .on_mouse_down("right", (_e, cx) => {
      cx.stop_propagation();
      openOverlay({ mod: MENU, kind: "popup", width: 200, ...(kind === "space" ? { height: 260 } : {}), props: { tab: kind, target: kind === "space" ? { id } : { id, space } } });
    });
}

export function closeTab(id, glyph) {
  return div()
    .id(`x-${id}`)
    .flex_none()
    .p(2)
    .rounded(3)
    .cursor_pointer()
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => {
      cx.stop_propagation();
      run("tab.close", { id, confirmed: true });
    })
    .child(glyph);
}

const PANELS = [
  ["crew", "Spaces & agents", "mods/workspace-chrome/sidebar.svg"],
  ["files", "Files", "mods/files/file.svg"],
  ["changes", "Changes", "mods/changes/changes.svg"],
  ["graph", "Git graph", "mods/git-graph/icons/graph.svg"],
];

// `button(id, child, onClick, options)`: the HUD's own button.
export function panelButtons(button, onColor) {
  const root = layout();
  const panel = find(root, "panel");
  const body = find(root, "panel-body");
  if (!panel || !body) return div();
  return h_flex()
    .flex_none()
    .gap(2)
    .items_center()
    .children(
      PANELS.filter(([id]) => find(body, id)).map(([id, tip, path]) => {
        const on = !panel.hidden && body.active === id;
        return button(
          `panel-${id}`,
          svg(path).size(15).when(on, (el) => el.text_color(onColor)),
          () => {
            if (on) run("layout.hide", { id: "panel" });
            else {
              run("layout.select", { stack: "panel-body", child: id });
              run("layout.show", { id: "panel" });
            }
          },
          { tip, size: 28 },
        );
      }),
    );
}

export const searchIcon = (size) => svg("mods/workspace-chrome/search.svg").size(size);

export function withUpdateDot(el, color) {
  return el.relative().when(Boolean(updates().app?.ready), (b) => b.child(div().absolute().top(3).right(3).size(6).rounded_full().bg(color)));
}
