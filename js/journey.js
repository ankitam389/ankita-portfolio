const READING_LINE = 0.55;

function initJourney(timeline) {
  const milestones = [...timeline.querySelectorAll(".journey-milestone")];
  const chapters = [...timeline.querySelectorAll(".journey-chapter")];
  const railLinks = [...document.querySelectorAll(".journey-rail__link")];
  const railList = document.querySelector(".journey-rail__list");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeLink = null;
  let frameRequested = false;

  function isAtPageBottom() {
    const scrolled = window.scrollY + window.innerHeight;
    return scrolled >= document.documentElement.scrollHeight - 2;
  }

  function updateProgress(readingLine) {
    const box = timeline.getBoundingClientRect();
    const ratio = (readingLine - box.top) / box.height;
    const progress = isAtPageBottom() ? 1 : Math.min(Math.max(ratio, 0), 1);
    timeline.style.setProperty("--j-progress", progress.toFixed(4));
  }

  function updateMilestones(readingLine) {
    milestones.forEach((milestone) => {
      const marker = milestone.querySelector(".journey-milestone__marker");
      const reached = marker.getBoundingClientRect().top < readingLine;
      milestone.classList.toggle("is-reached", reached);
    });
  }

  function updateRail(readingLine) {
    let current = chapters[0];
    chapters.forEach((chapter) => {
      if (chapter.getBoundingClientRect().top < readingLine) {
        current = chapter;
      }
    });
    if (isAtPageBottom()) {
      current = chapters[chapters.length - 1];
    }

    railLinks.forEach((link) => {
      if (link.hash === `#${current.id}`) {
        link.setAttribute("aria-current", "true");
        if (link !== activeLink) {
          activeLink = link;
          revealInRail(link);
        }
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function revealInRail(link) {
    if (!railList || railList.scrollWidth <= railList.clientWidth) {
      return;
    }
    const item = link.parentElement;
    railList.scrollTo({
      left: item.offsetLeft - railList.offsetLeft - 16,
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  }

  function update() {
    frameRequested = false;
    const readingLine = window.innerHeight * READING_LINE;
    updateProgress(readingLine);
    updateMilestones(readingLine);
    updateRail(readingLine);
  }

  function requestUpdate() {
    if (!frameRequested) {
      frameRequested = true;
      window.requestAnimationFrame(update);
    }
  }

  timeline.classList.add("is-enhanced");
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();
}

const timeline = document.querySelector(".journey-timeline");
if (timeline) {
  initJourney(timeline);
}
