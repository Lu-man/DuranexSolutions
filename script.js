const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    siteNav.classList.toggle("is-open", !isExpanded);
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      menuToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    }
  });
}

const revealGroups = [
  [".hero-content", "bottom"],
  [".intro .section-kicker", "top"],
  [".intro h2", "left"],
  [".intro-copy", "right"],
  [".principles > div", "bottom"],
  [".work .section-kicker", "top"],
  [".work-heading h2", "left"],
  [".work-heading > p", "right"],
  [".project-showcase", "bottom"],
  [".project-meta", "right"],
  [".statement-content", "left"],
  [".statement-caption", "right"],
  [".services .section-kicker", "top"],
  [".services-layout > h2", "left"],
  [".service-item", "right"],
  [".contact .section-kicker", "top"],
  [".contact-eyebrow", "right"],
  [".contact h2", "left"],
  [".contact-form", "bottom"],
  [".contact-bottom", "bottom"],
  [".site-footer", "bottom"],
];

const revealTargets = revealGroups.flatMap(([selector, direction]) =>
  [...document.querySelectorAll(selector)].map((element) => ({ element, direction })),
);

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

if (revealTargets.length && !motionPreference.matches && "IntersectionObserver" in window) {
  document.body.classList.add("motion-ready");

  revealTargets.forEach(({ element, direction }, index) => {
    element.dataset.reveal = direction;
    element.style.setProperty("--reveal-delay", `${Math.min((index % 5) * 75, 300)}ms`);
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -36px 0px" },
  );

  revealTargets.forEach(({ element }) => revealObserver.observe(element));
}

document.querySelectorAll(".project-card").forEach((card) => {
  card.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      card.style.setProperty("--card-rotate-x", `${(0.5 - y) * 5}deg`);
      card.style.setProperty("--card-rotate-y", `${(x - 0.5) * 5}deg`);
      card.style.setProperty("--glare-x", `${x * 100}%`);
      card.style.setProperty("--glare-y", `${y * 100}%`);
    },
    { passive: true },
  );

  card.addEventListener("pointerleave", () => {
    card.style.removeProperty("--card-rotate-x");
    card.style.removeProperty("--card-rotate-y");
    card.style.removeProperty("--glare-x");
    card.style.removeProperty("--glare-y");
  });
});

const hero = document.querySelector(".hero");
const meshCanvas = document.querySelector(".hero-mesh");
const meshContext = meshCanvas?.getContext("2d");

if (hero && meshCanvas && meshContext) {
  const context = meshContext;
  const nodes = [];
  const pointer = { x: 0, y: 0, active: false };
  let canvasWidth = 0;
  let canvasHeight = 0;
  let columns = 0;
  let rows = 0;
  let frameId = 0;
  let heroIsVisible = false;

  const createMesh = () => {
    const bounds = hero.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = bounds.width;
    canvasHeight = bounds.height;
    const step = canvasWidth < 700 ? 62 : 78;
    meshCanvas.width = Math.round(canvasWidth * pixelRatio);
    meshCanvas.height = Math.round(canvasHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    columns = Math.ceil(canvasWidth / step) + 2;
    rows = Math.ceil(canvasHeight / step) + 2;
    nodes.length = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        nodes.push({
          x: (column - (columns - 1) / 2) * step,
          y: (row - (rows - 1) / 2) * step,
          z: 0,
          velocity: 0,
        });
      }
    }

    drawMesh(0, false);
  };

  const drawMesh = (time, animate) => {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    const focalLength = Math.max(canvasWidth, canvasHeight) * 1.35;
    const yaw = -0.26;
    const pitch = 0.34;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);

    const projected = nodes.map((node) => {
      if (animate) {
        let target =
          Math.sin(time * 0.00058 + node.x * 0.006 + node.y * 0.004) * 16 +
          Math.cos(time * 0.00037 - node.x * 0.003) * 10;

        if (pointer.active) {
          const distance = Math.hypot(node.x + canvasWidth / 2 - pointer.x, node.y + canvasHeight / 2 - pointer.y);
          const influence = Math.exp(-distance / 185);
          target += Math.sin(distance * 0.035 - time * 0.004) * influence * 74;
        }

        node.velocity = (node.velocity + (target - node.z) * 0.016) * 0.9;
        node.z += node.velocity;
      }

      const rotatedX = node.x * cosYaw + node.z * sinYaw;
      const rotatedZ = -node.x * sinYaw + node.z * cosYaw;
      const rotatedY = node.y * cosPitch - rotatedZ * sinPitch;
      const depth = node.y * sinPitch + rotatedZ * cosPitch;
      const perspective = focalLength / (focalLength + depth);

      return {
        x: canvasWidth / 2 + rotatedX * perspective,
        y: canvasHeight / 2 + rotatedY * perspective,
        scale: perspective,
        z: node.z,
      };
    });

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const point = projected[index];

        if (column < columns - 1) {
          const neighbor = projected[index + 1];
          const alpha = Math.max(0.035, Math.min(0.21, 0.105 + (point.z + neighbor.z) / 520));
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(neighbor.x, neighbor.y);
          context.strokeStyle = `rgba(177, 140, 62, ${alpha})`;
          context.lineWidth = 0.7 * point.scale;
          context.stroke();
        }

        if (row < rows - 1) {
          const neighbor = projected[index + columns];
          const alpha = Math.max(0.035, Math.min(0.19, 0.09 + (point.z + neighbor.z) / 580));
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(neighbor.x, neighbor.y);
          context.strokeStyle = `rgba(231, 224, 207, ${alpha})`;
          context.lineWidth = 0.55 * point.scale;
          context.stroke();
        }

        if (index % 3 === 0) {
          context.beginPath();
          context.arc(point.x, point.y, Math.max(0.7, 1.15 * point.scale), 0, Math.PI * 2);
          context.fillStyle = `rgba(242, 225, 185, ${Math.max(0.09, Math.min(0.43, 0.2 + point.z / 180))})`;
          context.fill();
        }
      }
    }
  };

  const animateMesh = (time) => {
    frameId = 0;
    drawMesh(time, true);

    if (heroIsVisible && !document.hidden && !motionPreference.matches) {
      frameId = window.requestAnimationFrame(animateMesh);
    }
  };

  const startMesh = () => {
    if (!frameId && heroIsVisible && !document.hidden && !motionPreference.matches) {
      frameId = window.requestAnimationFrame(animateMesh);
    }
  };

  const stopMesh = () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
  };

  const meshObserver = new IntersectionObserver(([entry]) => {
    heroIsVisible = entry.isIntersecting;
    if (heroIsVisible) {
      if (motionPreference.matches) {
        drawMesh(0, false);
      } else {
        startMesh();
      }
    } else {
      stopMesh();
    }
  });

  meshObserver.observe(hero);
  window.addEventListener("resize", createMesh, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopMesh();
    } else {
      startMesh();
    }
  });
  motionPreference.addEventListener("change", () => {
    if (motionPreference.matches) {
      stopMesh();
      drawMesh(0, false);
    } else {
      startMesh();
    }
  });
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      const bounds = meshCanvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active = true;
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  createMesh();
}

const currentYear = document.querySelector("#current-year");
if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

const projectTrack = document.querySelector("#project-track");
const projectSlides = [...document.querySelectorAll("[data-project-slide]")];
const currentProjectNumber = document.querySelector("#current-project-number");
const projectDots = [...document.querySelectorAll(".slide-dot")];
const previousProject = document.querySelector("#previous-project");
const nextProject = document.querySelector("#next-project");

if (
  projectTrack &&
  projectSlides.length > 1 &&
  currentProjectNumber &&
  projectDots.length === projectSlides.length &&
  previousProject instanceof HTMLButtonElement &&
  nextProject instanceof HTMLButtonElement
) {
  let activeProject = Math.max(0, projectSlides.findIndex((slide) => slide.classList.contains("is-active")));
  const previousSlide = projectSlides[projectSlides.length - 1].cloneNode(true);
  const nextSlide = projectSlides[0].cloneNode(true);
  let pendingWrap = null;
  let pendingWrapSlide = null;
  const syncProjectPreviewAccess = () => {
    const viewportCenter = window.innerHeight / 2;
    const centerBand = window.innerHeight * 0.15;

    projectSlides.forEach((slide) => {
      const screen = slide.querySelector(".browser-screen");
      const iframe = screen?.querySelector("iframe");
      if (!screen || !iframe) {
        return;
      }

      const bounds = screen.getBoundingClientRect();
      const isCentered = slide === projectSlides[activeProject] &&
        bounds.bottom > viewportCenter - centerBand &&
        bounds.top < viewportCenter + centerBand;

      screen.classList.toggle("is-scroll-enabled", isCentered);
      iframe.tabIndex = isCentered ? 0 : -1;
    });
  };
  const getSlideTransform = (trackIndex) => {
    const slideWidth = projectSlides[0].getBoundingClientRect().width;
    const trackGap = Number.parseFloat(getComputedStyle(projectTrack).columnGap) || 0;
    const slideInset = window.matchMedia("(max-width: 1000px)").matches ? 0 : 72;
    return `translate3d(${slideInset - trackIndex * (slideWidth + trackGap)}px, 0, 0)`;
  };

  [previousSlide, nextSlide].forEach((slide) => {
    slide.classList.remove("is-active");
    slide.setAttribute("aria-hidden", "true");
    slide.removeAttribute("data-project-slide");
    slide.querySelectorAll("iframe, a").forEach((element) => {
      element.tabIndex = -1;
    });
  });

  projectTrack.prepend(previousSlide);
  projectTrack.append(nextSlide);

  const setProject = (index, direction = 0) => {
    const previousProject = activeProject;
    activeProject = (index + projectSlides.length) % projectSlides.length;
    currentProjectNumber.textContent = String(activeProject + 1).padStart(2, "0");

    let trackIndex = activeProject + 1;
    pendingWrap = null;
    pendingWrapSlide = null;
    if (direction > 0 && previousProject === projectSlides.length - 1 && activeProject === 0) {
      trackIndex = projectSlides.length + 1;
      pendingWrap = 1;
      pendingWrapSlide = nextSlide;
    } else if (direction < 0 && previousProject === 0 && activeProject === projectSlides.length - 1) {
      trackIndex = 0;
      pendingWrap = -1;
      pendingWrapSlide = previousSlide;
    }
    previousSlide.classList.remove("is-loop-target");
    nextSlide.classList.remove("is-loop-target");
    pendingWrapSlide?.classList.add("is-loop-target");

    projectTrack.style.transform = getSlideTransform(trackIndex);

    projectSlides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeProject;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.querySelectorAll("a").forEach((link) => {
        link.tabIndex = isActive ? 0 : -1;
      });
    });
    syncProjectPreviewAccess();

    projectDots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeProject;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", String(isActive));
    });
  };

  const showProject = (index) => setProject(index);

  projectTrack.addEventListener("transitionend", (event) => {
    if (event.target !== projectTrack || event.propertyName !== "transform" || pendingWrap === null) {
      return;
    }

    pendingWrap = null;
    pendingWrapSlide?.classList.remove("is-loop-target");
    pendingWrapSlide = null;
    projectTrack.classList.add("is-snapping");
    projectTrack.style.transform = getSlideTransform(activeProject + 1);
    projectTrack.getBoundingClientRect();
    projectTrack.classList.remove("is-snapping");
  });

  previousProject.addEventListener("click", () => setProject(activeProject - 1, -1));
  nextProject.addEventListener("click", () => setProject(activeProject + 1, 1));
  projectDots.forEach((dot, index) => {
    dot.addEventListener("click", () => showProject(index));
  });
  const updateSlidePosition = () => {
    pendingWrap = null;
    pendingWrapSlide?.classList.remove("is-loop-target");
    pendingWrapSlide = null;
    projectTrack.classList.add("is-snapping");
    showProject(activeProject);
    projectTrack.getBoundingClientRect();
    projectTrack.classList.remove("is-snapping");
  };
  const projectResizeObserver = new ResizeObserver(updateSlidePosition);
  projectResizeObserver.observe(projectSlides[0]);
  window.addEventListener("resize", updateSlidePosition, { passive: true });
  window.addEventListener("scroll", syncProjectPreviewAccess, { passive: true });
  window.matchMedia("(max-width: 1000px)").addEventListener("change", updateSlidePosition);

  const swipeQuery = window.matchMedia("(max-width: 1000px)");
  const projectStage = projectTrack.parentElement;
  let swipeStart = null;
  projectStage.addEventListener("pointerdown", (event) => {
    swipeStart = swipeQuery.matches && event.isPrimary ? { x: event.clientX, y: event.clientY } : null;
  });
  projectStage.addEventListener("pointerup", (event) => {
    if (!swipeStart) {
      return;
    }
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      const direction = deltaX < 0 ? 1 : -1;
      setProject(activeProject + direction, direction);
    }
  });
  projectStage.addEventListener("pointercancel", () => {
    swipeStart = null;
  });
  showProject(activeProject);
}

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

if (contactForm instanceof HTMLFormElement && formStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) {
      return;
    }

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") ?? "");
    formData.append("subject", `Website enquiry from ${name}`);
    formData.append("from_name", "Duranex Website");

    const submitButton = contactForm.querySelector('button[type="submit"]');
    if (!(submitButton instanceof HTMLButtonElement)) {
      throw new Error("Contact form submit button was not found.");
    }

    const submitLabel = submitButton.querySelector("span");
    const originalLabel = submitLabel?.textContent ?? "";
    submitButton.disabled = true;
    if (submitLabel) {
      submitLabel.textContent = "Sending...";
    }
    formStatus.textContent = "Sending your enquiry...";

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        formStatus.textContent = "We couldn't send your enquiry. Please try again or contact us on WhatsApp.";
        return;
      }

      formStatus.textContent = "Thanks for your enquiry. We'll be in touch soon.";
      contactForm.reset();
    } catch (error) {
      console.error("Contact form submission failed:", error);
      formStatus.textContent = "We couldn't send your enquiry. Check your connection and try again, or contact us on WhatsApp.";
    } finally {
      submitButton.disabled = false;
      if (submitLabel) {
        submitLabel.textContent = originalLabel;
      }
    }
  });
}
