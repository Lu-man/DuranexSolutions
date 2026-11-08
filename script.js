const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const legalTriggers = document.querySelectorAll("[data-legal-trigger]");

legalTriggers.forEach((trigger) => {
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new Error("Legal dialog trigger must be a button.");
  }

  const dialogId = trigger.getAttribute("aria-controls");
  const dialog = dialogId ? document.getElementById(dialogId) : null;
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error("A legal dialog trigger must reference an existing dialog.");
  }

  trigger.addEventListener("click", () => dialog.showModal());
});

document.querySelectorAll("dialog[data-legal-dialog]").forEach((dialog) => {
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
});

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    siteNav.classList.toggle("is-open", !isExpanded);
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      menuToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    }
  });
}

const currentYear = document.querySelector("#current-year");
if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

if (contactForm instanceof HTMLFormElement && formStatus) {
  const goalInputs = [...contactForm.querySelectorAll('input[name="business_goals"]')];
  const updateGoalValidity = () => {
    if (goalInputs[0] instanceof HTMLInputElement) {
      goalInputs[0].setCustomValidity(
        goalInputs.some((input) => input.checked) ? "" : "Please select at least one business goal.",
      );
    }
  };
  goalInputs.forEach((input) => input.addEventListener("change", updateGoalValidity));
  updateGoalValidity();

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) {
      return;
    }

    const formData = new FormData(contactForm);
    formData.set("business_goals", formData.getAll("business_goals").join(", "));
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
      updateGoalValidity();
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

const floatingContact = document.querySelector(".floating-contact");
const contactSection = document.querySelector("#contact");
if (floatingContact instanceof HTMLElement && contactSection instanceof HTMLElement) {
  let contactUpdatePending = false;
  const updateFloatingContact = () => {
    floatingContact.hidden = contactSection.getBoundingClientRect().top <= window.innerHeight;
    contactUpdatePending = false;
  };
  const scheduleContactUpdate = () => {
    if (!contactUpdatePending) {
      contactUpdatePending = true;
      requestAnimationFrame(updateFloatingContact);
    }
  };
  window.addEventListener("scroll", scheduleContactUpdate, { passive: true });
  window.addEventListener("resize", scheduleContactUpdate, { passive: true });
  updateFloatingContact();
}

const hero = document.querySelector(".hero");
const trailCanvas = document.querySelector(".hero-trail");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

const whyStats = document.querySelector(".why-stats");
const counters = [...document.querySelectorAll("[data-counter]")];
if (whyStats && counters.length && "IntersectionObserver" in window) {
  let counterFrame = 0;
  const finishCounters = () => {
    cancelAnimationFrame(counterFrame);
    counterFrame = 0;
    counters.forEach((counter) => {
      counter.textContent = `${Number(counter.dataset.counter).toFixed(Number(counter.dataset.decimals))}${counter.dataset.suffix}`;
    });
  };
  const counterObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
      finishCounters();
      return;
    }
    if (motionPreference.matches || document.hidden) return;
    cancelAnimationFrame(counterFrame);
    let start;
    const animateCounters = (time) => {
      counterFrame = 0;
      if (motionPreference.matches || document.hidden) {
        finishCounters();
        return;
      }
      if (start === undefined) start = time;
      const progress = Math.min((time - start) / 1400, 1);
      const eased = 1 - (1 - progress) ** 3;
      counters.forEach((counter) => {
        const value = Number(counter.dataset.counter) * eased;
        counter.textContent = `${value.toFixed(Number(counter.dataset.decimals))}${counter.dataset.suffix}`;
      });
      if (progress < 1) counterFrame = requestAnimationFrame(animateCounters);
    };
    counterFrame = requestAnimationFrame(animateCounters);
  }, { threshold: 0.2 });
  counterObserver.observe(whyStats);
  motionPreference.addEventListener("change", () => {
    if (motionPreference.matches) finishCounters();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && counterFrame) finishCounters();
  });
}

if (hero instanceof HTMLElement && trailCanvas instanceof HTMLCanvasElement) {
  const context = trailCanvas.getContext("2d");
  if (context) {
    let width = 0;
    let height = 0;
    let elapsed = 0;
    let lastFrame = 0;
    let frameId = 0;
    let heroVisible = false;
    const straightDots = [
      { x: 0, y: 0, vx: 85, vy: -56, radius: 6, color: "243, 217, 148", glow: "#f3d994", trail: [] },
      { x: 0, y: 0, vx: 105, vy: 59, radius: 4, color: "101, 229, 227", glow: "#65e5e3", trail: [] },
      { x: 0, y: 0, vx: -76, vy: 92, radius: 3, color: "176, 186, 200", glow: "#b0bac8", trail: [] },
    ];

    const resizeTrail = () => {
      const bounds = trailCanvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      trailCanvas.width = Math.round(width * ratio);
      trailCanvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      straightDots.forEach((dot, index) => {
        dot.x = width * [0.3, 0.65, 0.8][index];
        dot.y = height * [0.65, 0.3, 0.6][index];
        dot.trail.length = 0;
      });
    };

    const drawTrail = (time) => {
      frameId = 0;
      if (!heroVisible || document.hidden || motionPreference.matches) return;
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 0;
      lastFrame = time;
      elapsed += delta;
      const margin = 12;
      context.clearRect(0, 0, width, height);

      straightDots.forEach((dot) => {
        dot.x += dot.vx * delta;
        dot.y += dot.vy * delta;
        if (dot.x < margin || dot.x > width - margin) {
          dot.x = Math.max(margin, Math.min(width - margin, dot.x));
          dot.vx *= -1;
        }
        if (dot.y < margin || dot.y > height - margin) {
          dot.y = Math.max(margin, Math.min(height - margin, dot.y));
          dot.vy *= -1;
        }

        dot.trail.push({ x: dot.x, y: dot.y, time: elapsed });
        while (dot.trail.length > 120 || (dot.trail.length > 1 && elapsed - dot.trail[0].time > 2.5)) {
          dot.trail.shift();
        }
        for (let i = 1; i < dot.trail.length; i += 1) {
          const point = dot.trail[i];
          const opacity = Math.max(0, 1 - (elapsed - point.time) / 2.5) * 0.55;
          context.beginPath();
          context.moveTo(dot.trail[i - 1].x, dot.trail[i - 1].y);
          context.lineTo(point.x, point.y);
          context.strokeStyle = `rgba(${dot.color}, ${opacity})`;
          context.lineWidth = dot.radius / 2;
          context.stroke();
        }
        context.beginPath();
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        context.fillStyle = dot.glow;
        context.shadowColor = dot.glow;
        context.shadowBlur = 16;
        context.fill();
        context.shadowBlur = 0;
      });
      frameId = requestAnimationFrame(drawTrail);
    };

    const updateTrail = () => {
      if (heroVisible && !document.hidden && !motionPreference.matches) {
        if (!frameId) frameId = requestAnimationFrame(drawTrail);
      } else {
        cancelAnimationFrame(frameId);
        frameId = 0;
        lastFrame = 0;
        context.clearRect(0, 0, width, height);
      }
    };

    resizeTrail();
    if ("ResizeObserver" in window) {
      new ResizeObserver(resizeTrail).observe(trailCanvas);
    } else {
      window.addEventListener("resize", resizeTrail, { passive: true });
    }
    document.addEventListener("visibilitychange", updateTrail);
    motionPreference.addEventListener("change", updateTrail);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        updateTrail();
      }).observe(hero);
    } else {
      heroVisible = true;
      updateTrail();
    }
  } else {
    console.error("Could not initialize the hero animation canvas.");
  }
}
