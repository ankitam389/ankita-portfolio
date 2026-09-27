import { initNavigation } from "./modules/navigation.js";
import { initMeshNetwork } from "./modules/meshNetwork.js";
import { initProjectFilter } from "./modules/projectFilter.js";
import { initFooterYear } from "./modules/footerYear.js";

const components = [
  [".site-nav", initNavigation],
  [".mesh", initMeshNetwork],
  [".filter", initProjectFilter],
  [".site-footer__year", initFooterYear],
];

components.forEach(([selector, init]) => {
  document.querySelectorAll(selector).forEach((element) => init(element));
});
