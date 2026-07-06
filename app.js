/* ============================================================
   Montrose Run Club — app.js
   1) Mission clock: countdown to next Saturday 7:30 AM (Houston/Central)
   2) Contact form: AJAX POST to Formsubmit.co -> derekpiszczek@gmail.com
   3) Scroll reveals
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 1) MISSION CLOCK ---------- */
  var TZ = "America/Chicago";
  var RUN_DAY = 6;      // Saturday (0=Sun ... 6=Sat)
  var RUN_HOUR = 7;
  var RUN_MIN = 30;
  var RUN_WINDOW_MIN = 90; // treat the run as "in progress" for 90 min after start

  // Offset (ms) of a timezone at a given UTC instant.
  function tzOffset(utcMs, tz) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    var p = {};
    dtf.formatToParts(new Date(utcMs)).forEach(function (x) { p[x.type] = x.value; });
    var h = p.hour === "24" ? 0 : +p.hour;
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute, +p.second);
    return asUTC - utcMs;
  }

  // Epoch ms for given wall-clock components in a timezone (DST-safe).
  function zonedToEpoch(y, mo, d, h, mi, tz) {
    var guess = Date.UTC(y, mo - 1, d, h, mi, 0);
    var off = tzOffset(guess, tz);
    var ts = guess - off;
    // refine once in case the guess crossed a DST boundary
    var off2 = tzOffset(ts, tz);
    if (off2 !== off) ts = guess - off2;
    return ts;
  }

  // Get current wall-clock parts in the target timezone.
  function nowParts(tz) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false, weekday: "short",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    var p = {};
    dtf.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      y: +p.year, mo: +p.month, d: +p.day,
      h: p.hour === "24" ? 0 : +p.hour, mi: +p.minute, s: +p.second,
      dow: days[p.weekday]
    };
  }

  function nextRun() {
    var n = nowParts(TZ);
    var nowMs = Date.now();
    var todayStart = zonedToEpoch(n.y, n.mo, n.d, RUN_HOUR, RUN_MIN, TZ);
    var windowEnd = todayStart + RUN_WINDOW_MIN * 60000;

    // If it's Saturday and we're within the run window -> "in progress"
    if (n.dow === RUN_DAY && nowMs >= todayStart && nowMs <= windowEnd) {
      return { inProgress: true };
    }

    var daysAhead = (RUN_DAY - n.dow + 7) % 7;
    // Saturday but already past this week's window -> next Saturday
    if (daysAhead === 0 && nowMs > windowEnd) daysAhead = 7;

    // Build target date by adding daysAhead to today's calendar date (UTC math on the date only)
    var base = new Date(Date.UTC(n.y, n.mo - 1, n.d));
    base.setUTCDate(base.getUTCDate() + daysAhead);
    var target = zonedToEpoch(
      base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(),
      RUN_HOUR, RUN_MIN, TZ
    );
    return { inProgress: false, target: target };
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function renderClock() {
    var valueEl = document.getElementById("clock-value");
    var labelEl = document.getElementById("clock-label");
    if (!valueEl) return;

    var info = nextRun();
    if (info.inProgress) {
      labelEl.textContent = "Right now";
      valueEl.textContent = "It's go time — 3615 Alpha St";
      return;
    }

    var diff = info.target - Date.now();
    if (diff < 0) diff = 0;
    var totalSec = Math.floor(diff / 1000);
    var days = Math.floor(totalSec / 86400);
    var hrs = Math.floor((totalSec % 86400) / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;

    labelEl.textContent = "Next launch";
    valueEl.textContent = "T– " + days + "d " + pad(hrs) + ":" + pad(mins) + ":" + pad(secs);
  }

  renderClock();
  setInterval(renderClock, 1000);

  /* ---------- 2) CONTACT FORM ---------- */
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/derekpiszczek@gmail.com";
  var form = document.getElementById("contact-form");

  if (form) {
    var statusEl = document.getElementById("form-status");
    var btn = document.getElementById("submit-btn");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // honeypot: if filled, silently pretend success (bot)
      if (form.elements["_honey"] && form.elements["_honey"].value) {
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = {
        name: form.elements["name"].value.trim(),
        email: form.elements["email"].value.trim(),
        message: form.elements["message"].value.trim(),
        _subject: "New message from montroserunclub.com",
        _template: "table"
      };

      btn.disabled = true;
      var originalLabel = btn.textContent;
      btn.textContent = "Sending…";
      statusEl.className = "form-status";
      statusEl.textContent = "";

      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("bad status " + res.status);
          return res.json();
        })
        .then(function () {
          form.reset();
          statusEl.className = "form-status is-ok";
          statusEl.textContent = "Message sent — see you Saturday! A leader will be in touch.";
          btn.textContent = "Sent ✓";
          setTimeout(function () { btn.textContent = originalLabel; btn.disabled = false; }, 4000);
        })
        .catch(function () {
          statusEl.className = "form-status is-err";
          statusEl.textContent = "Something went wrong — please try again in a moment.";
          btn.textContent = originalLabel;
          btn.disabled = false;
        });
    });
  }

  /* ---------- 3) SCROLL REVEALS ---------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(
    ".facts, .section__title, .route, .provide__item, .split__col, .faq__row, .status, .form-card"
  );

  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("in"); });
  } else {
    targets.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  }
})();
