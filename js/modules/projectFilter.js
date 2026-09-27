export function initProjectFilter(filterGroup) {
  const buttons = [...filterGroup.querySelectorAll(".filter__button")];
  const sections = [...document.querySelectorAll(".project-section")];
  const count = document.querySelector(".filter__count");

  function matchesTopic(project, topic) {
    const tags = project.dataset.tags.split(" ").filter(Boolean);
    if (topic === "all") {
      return true;
    }
    return tags.includes(topic);
  }

  function applyFilter(topic) {
    let visible = 0;

    sections.forEach((section) => {
      const projects = [...section.querySelectorAll(".project")];
      const emptyMessage = section.querySelector(".project-section__empty");
      let visibleInSection = 0;

      projects.forEach((project) => {
        const matches = matchesTopic(project, topic);
        project.hidden = !matches;
        if (matches) {
          visibleInSection += 1;
        }
        if (matches && !project.classList.contains("project--placeholder")) {
          visible += 1;
        }
      });

      if (emptyMessage) {
        emptyMessage.hidden = visibleInSection > 0;
      }
    });

    buttons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === topic),
      );
    });

    if (count) {
      const noun = visible === 1 ? "project" : "projects";
      count.textContent = `Showing ${visible} ${noun}`;
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
  });

  applyFilter("all");
}
