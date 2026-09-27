export function initNavigation(nav) {
  const toggle = nav.querySelector(".site-nav__toggle");
  const menu = nav.querySelector(".site-nav__menu");

  if (!toggle || !menu) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.textContent = isOpen ? "Menu" : "Close";
    menu.classList.toggle("site-nav__menu--open", !isOpen);
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      toggle.click();
      toggle.focus();
    }
  });
}
