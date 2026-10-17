(function () {
  "use strict";
  var CFG = window.SITE_CONFIG || {};

  /* ---------- optional Google Analytics ---------- */
  if (CFG.GOOGLE_ANALYTICS_ID && /^G-[A-Z0-9]+$/i.test(CFG.GOOGLE_ANALYTICS_ID)) {
    var ga = document.createElement("script");
    ga.async = true;
    ga.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.GOOGLE_ANALYTICS_ID);
    document.head.appendChild(ga);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CFG.GOOGLE_ANALYTICS_ID);
  }

  /* ---------- image fallbacks: use illustrated art if a photo is missing ---------- */
  function applyFallback(img) {
    var fb = img.getAttribute("data-fallback");
    if (!fb || img.getAttribute("data-fell")) return;
    img.setAttribute("data-fell", "1");
    img.src = fb;
  }
  var imgs = document.querySelectorAll("img[data-fallback]");
  Array.prototype.forEach.call(imgs, function (img) {
    img.addEventListener("error", function () { applyFallback(img); });
    if (img.complete && img.naturalWidth === 0) applyFallback(img);
  });

  /* ---------- mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- footer year ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- lead form ---------- */
  var form = document.getElementById("lead-form");
  if (!form) return;

  var params = new URLSearchParams(window.location.search);
  var preset = params.get("interest");
  var select = form.querySelector("#interest");
  if (preset && select) {
    Array.prototype.forEach.call(select.options, function (o) {
      if (o.getAttribute("data-key") === preset) select.value = o.value;
    });
  }
  var lp = form.querySelector("#landing_page");
  var rf = form.querySelector("#referrer");
  try {
    lp.value = sessionStorage.getItem("zng_landing") || window.location.href;
    rf.value = sessionStorage.getItem("zng_ref") || document.referrer || "direct";
  } catch (e) {
    lp.value = window.location.href;
    rf.value = document.referrer || "direct";
  }
  form.querySelector("#access_key").value = CFG.WEB3FORMS_ACCESS_KEY || "";

  var status = form.querySelector(".form-status");
  var button = form.querySelector("button[type=submit]");

  function setError(id, on) {
    var field = form.querySelector("#" + id).closest(".field");
    field.classList.toggle("has-error", on);
    return on;
  }
  function validate() {
    var bad = false, first = null;
    var checks = [
      ["name", function (v) { return v.trim().length > 1; }],
      ["email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }],
      ["interest", function (v) { return v !== ""; }]
    ];
    checks.forEach(function (c) {
      var el = form.querySelector("#" + c[0]);
      var failed = !c[1](el.value);
      setError(c[0], failed);
      if (failed && !first) first = el;
      bad = bad || failed;
    });
    var consent = form.querySelector("#consent");
    var cFail = !consent.checked;
    setError("consent", cFail);
    if (cFail && !first) first = consent;
    if (first) first.focus();
    return !(bad || cFail);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.textContent = "";
    status.classList.remove("is-error");
    if (!validate()) return;

    if (!CFG.WEB3FORMS_ACCESS_KEY || CFG.WEB3FORMS_ACCESS_KEY.indexOf("PASTE_") === 0) {
      status.textContent = "This form is not connected yet. Add your Web3Forms key in js/config.js.";
      status.classList.add("is-error");
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success) {
          if (window.gtag) window.gtag("event", "generate_lead", { interest: select.value });
          window.location.href = "thank-you.html";
        } else {
          throw new Error((data && data.message) || "failed");
        }
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = "Send my request";
        status.textContent = "Your request did not send. Check your connection and try again.";
        status.classList.add("is-error");
      });
  });
})();

/* remember where a visitor first landed, for lead source tracking */
(function () {
  try {
    if (!sessionStorage.getItem("zng_landing")) {
      sessionStorage.setItem("zng_landing", window.location.href);
      sessionStorage.setItem("zng_ref", document.referrer || "direct");
    }
  } catch (e) { /* storage unavailable: form falls back to the current page */ }
})();
