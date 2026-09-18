// I-SPOT — shared site behaviour: mobile nav, Acknowledgement modal, enquiry form.

(function () {
  "use strict";

  /* ---------- mobile nav toggle ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    /* Escape closes the open menu and returns focus to the toggle */
    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && links.classList.contains("open")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Acknowledgement of Country modal (home page only) ---------- */
  var overlay = document.getElementById("ack-overlay");
  if (overlay) {
    var STORAGE_KEY = "ispot-ack-seen";
    var alreadySeen = false;
    try {
      alreadySeen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      alreadySeen = false;
    }

    var openModal = function () {
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      var focusTarget = overlay.querySelector(".btn-primary");
      if (focusTarget) focusTarget.focus();
    };
    var closeModal = function () {
      overlay.hidden = true;
      document.body.style.overflow = "";
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {
        /* private browsing or storage disabled — fine to skip remembering */
      }
    };

    if (!alreadySeen) {
      openModal();
    } else {
      overlay.hidden = true;
    }

    overlay.querySelectorAll("[data-ack-close]").forEach(function (btn) {
      btn.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape" && !overlay.hidden) closeModal();
    });
  }

  /* ---------- pre-select a program from ?program= (links from Home/Programs) ---------- */
  var programSelect = document.getElementById("program");
  if (programSelect) {
    var key = new URLSearchParams(window.location.search).get("program");
    if (key) {
      var match = programSelect.querySelector('option[data-key="' + key.replace(/[^a-z]/g, "") + '"]');
      if (match) programSelect.value = match.value;
    }
  }

  /* ---------- enquiry form: submits to Formspree ---------- */
  var form = document.getElementById("enquiry-form");
  if (form) {
    form.addEventListener("submit", function (evt) {
      evt.preventDefault();

      /* lightweight validation: name + a valid email are the only required fields */
      var firstInvalid = null;
      var check = function (id, test, msg) {
        var input = document.getElementById(id);
        var err = document.getElementById(id + "-error");
        var ok = test(input.value.trim());
        input.setAttribute("aria-invalid", ok ? "false" : "true");
        if (err) { err.textContent = ok ? "" : msg; err.hidden = ok; }
        if (!ok && !firstInvalid) firstInvalid = input;
      };
      check("name", function (v) { return v.length > 0; }, "Please tell us your name.");
      check("email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }, "Please enter an email address we can reply to, like name@example.com.");
      if (firstInvalid) { firstInvalid.focus(); return; }

      var status = document.getElementById("form-status");
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      if (status) status.textContent = "Sending your enquiry…";

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (response) {
          if (response.ok) {
            form.reset();
            if (status) status.textContent = "Thanks — your enquiry has been sent. We'll reply within two business days.";
          } else {
            if (status) status.textContent = "Sorry, something went wrong sending that. Please try again or email eli.toombs@connectionworks.com.au directly.";
          }
        })
        .catch(function () {
          if (status) status.textContent = "Sorry, something went wrong sending that. Please try again or email eli.toombs@connectionworks.com.au directly.";
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ---------- hero photo slider (home page) ----------
     Accessible carousel: prev/next, dots, pause button (WCAG 2.2.2),
     pauses on hover/focus, and never auto-advances with reduced motion. */
  var slider = document.querySelector(".hero-slider");
  if (slider) {
    var slides = slider.querySelectorAll(".slide");
    var dots = slider.querySelectorAll(".slider-dot");
    var pauseBtn = slider.querySelector("[data-slider-pause]");
    var current = 0, timer = null, userPaused = false, hovering = false;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var show = function (i) {
      slides[current].classList.remove("is-active");
      slides[current].setAttribute("aria-hidden", "true");
      dots[current].classList.remove("is-active");
      dots[current].removeAttribute("aria-current");
      current = (i + slides.length) % slides.length;
      slides[current].classList.add("is-active");
      slides[current].removeAttribute("aria-hidden");
      dots[current].classList.add("is-active");
      dots[current].setAttribute("aria-current", "true");
    };
    var stop = function () { clearInterval(timer); timer = null; };
    var start = function () {
      stop();
      if (!reduce && !userPaused && !hovering) timer = setInterval(function () { show(current + 1); }, 6000);
    };
    var setPaused = function (p) {
      userPaused = p;
      pauseBtn.setAttribute("aria-pressed", p ? "true" : "false");
      pauseBtn.setAttribute("aria-label", p ? "Play slideshow" : "Pause slideshow");
      start();
    };

    slider.querySelector("[data-slider-prev]").addEventListener("click", function () { show(current - 1); start(); });
    slider.querySelector("[data-slider-next]").addEventListener("click", function () { show(current + 1); start(); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { show(i); start(); }); });
    pauseBtn.addEventListener("click", function () { setPaused(!userPaused); });
    slider.addEventListener("mouseenter", function () { hovering = true; stop(); });
    slider.addEventListener("mouseleave", function () { hovering = false; start(); });
    slider.addEventListener("focusin", function () { hovering = true; stop(); });
    slider.addEventListener("focusout", function () { hovering = false; start(); });
    slider.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { show(current - 1); }
      if (e.key === "ArrowRight") { show(current + 1); }
    });

    if (reduce) setPaused(true); else start();
  }

  /* ---------- footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
