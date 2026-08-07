/* ============================================================
   FOREX SESSION DASHBOARD — JS
   Split-flap clock renderer, real timezones, session logic.
   Functionality unchanged — only the CSS/markup around it
   has been redesigned.
   ============================================================ */

(function () {
  "use strict";

  /* start/end are LOCAL business hours at the venue (8am–5pm local
     is the standard forex-session convention). Deriving the open/
     closed window from local time — rather than a hardcoded UTC
     window — keeps it correct through Daylight Saving changes,
     since London and New York shift UTC offset twice a year and
     Tokyo never does. */
  const SESSIONS = [
    { key: "tokyo",   tz: "Asia/Tokyo",         start: 9,  end: 18 },
    { key: "london",  tz: "Europe/London",      start: 8,  end: 17 },
    { key: "newyork", tz: "America/New_York",   start: 8,  end: 17 }
  ];

  const els = {};
  const flapState = {};

  function cacheEls() {
    SESSIONS.forEach((s) => {
      els[s.key] = {
        card: document.getElementById(`card-${s.key}`),
        clock: document.getElementById(`clock-${s.key}`),
        statusPill: document.getElementById(`status-${s.key}`),
        statusText: document.querySelector(`#status-${s.key} .status-text`),
        cdLabel: document.getElementById(`cd-label-${s.key}`),
        cdValue: document.getElementById(`cd-value-${s.key}`),
        progressFill: document.getElementById(`progress-${s.key}`),
        progressPct: document.getElementById(`progress-pct-${s.key}`),
        rangeLabel: document.querySelector(`#card-${s.key} .session-range`)
      };
    });

    els.utcTime = document.getElementById("utc-time");
    els.localTime = document.getElementById("local-time");
    els.todayDate = document.getElementById("today-date");

    els.marketForex = document.getElementById("market-forex");
    els.marketCrypto = document.getElementById("market-crypto");
    els.marketUS = document.getElementById("market-us");
  }

  /* -----------------------------------------------------------
     SPLIT-FLAP CLOCK — HH : MM : SS, built into .clock at runtime
     ----------------------------------------------------------- */
  function buildFlapClock(container) {
    container.innerHTML = "";
    container.dataset.flapBuilt = "true";

    const groups = [2, 2, 2];
    groups.forEach((count, gi) => {
      const group = document.createElement("div");
      group.className = "flap-group";
      for (let i = 0; i < count; i++) {
        const cell = document.createElement("div");
        cell.className = "flap-card";
        cell.innerHTML =
          '<div class="flap-face">0</div><div class="flap-flip">0</div>';
        group.appendChild(cell);
      }
      container.appendChild(group);
      if (gi < groups.length - 1) {
        const colon = document.createElement("span");
        colon.className = "flap-colon";
        colon.textContent = ":";
        container.appendChild(colon);
      }
    });
  }

  function setFlapDigit(container, index, char) {
    const cells = container.querySelectorAll(".flap-card");
    const cell = cells[index];
    if (!cell) return;

    const key = container.id + "-" + index;
    const prev = flapState[key];

    if (prev === char) return;
    flapState[key] = char;

    const face = cell.querySelector(".flap-face");
    const flip = cell.querySelector(".flap-flip");

    if (prev === undefined) {
      face.textContent = char;
      flip.textContent = char;
      return;
    }

    flip.textContent = prev;
    face.textContent = char;

    cell.classList.remove("flipping");
    void cell.offsetWidth;
    cell.classList.add("flipping");

    clearTimeout(cell._flapTimeout);
    cell._flapTimeout = setTimeout(() => {
      cell.classList.remove("flipping");
      flip.textContent = char;
    }, 440);
  }

  function renderFlapTime(container, hh, mm, ss) {
    const digits = `${hh}${mm}${ss}`.split("");
    digits.forEach((d, i) => setFlapDigit(container, i, d));
  }

  /* -----------------------------------------------------------
     HELPERS
     ----------------------------------------------------------- */
  function pad(n) {
    return n.toString().padStart(2, "0");
  }

  function getUTCDecimalHour(now) {
    return (
      now.getUTCHours() +
      now.getUTCMinutes() / 60 +
      now.getUTCSeconds() / 3600
    );
  }

  const timeFormatterCache = {};
  function getZonedParts(now, tz) {
    if (!timeFormatterCache[tz]) {
      timeFormatterCache[tz] = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
    }
    const parts = timeFormatterCache[tz].formatToParts(now);
    const map = {};
    parts.forEach((p) => (map[p.type] = p.value));
    return { hh: map.hour, mm: map.minute, ss: map.second };
  }

  /* Whole-hour UTC offset for a timezone right now (e.g. London is
     +0 in winter, +1 in summer; New York is -5 / -4). Used only to
     render an accurate "HH:MM – HH:MM UTC" label alongside the
     local-hour session logic above. */
  const offsetFormatterCache = {};
  function getUTCOffsetHours(tz, now) {
    if (!offsetFormatterCache[tz]) {
      offsetFormatterCache[tz] = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset"
      });
    }
    const parts = offsetFormatterCache[tz].formatToParts(now);
    const tzName = parts.find((p) => p.type === "timeZoneName");
    if (!tzName) return 0;
    const match = tzName.value.match(/GMT([+-]\d+)?/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }

  function formatSessionUTCRange(s, now) {
    const offset = getUTCOffsetHours(s.tz, now);
    const utcStart = ((s.start - offset) % 24 + 24) % 24;
    const utcEnd = ((s.end - offset) % 24 + 24) % 24;
    return `${pad(utcStart)}:00 – ${pad(utcEnd)}:00 UTC`;
  }

  function sessionDuration(s) {
    return ((s.end - s.start + 24) % 24) || 24;
  }

  function isSessionOpen(s, decHour) {
    if (s.start < s.end) {
      return decHour >= s.start && decHour < s.end;
    }
    return decHour >= s.start || decHour < s.end;
  }

  function sessionState(s, decHour) {
    const duration = sessionDuration(s);
    const open = isSessionOpen(s, decHour);

    if (open) {
      const elapsed = decHour >= s.start ? decHour - s.start : decHour + 24 - s.start;
      const pct = Math.min(100, Math.max(0, (elapsed / duration) * 100));
      const remaining = duration - elapsed;
      return { open: true, pct, remainingHours: remaining };
    } else {
      let untilStart = s.start - decHour;
      if (untilStart < 0) untilStart += 24;
      return { open: false, pct: 0, remainingHours: untilStart };
    }
  }

  function hoursToHHMMSS(decHours) {
    const totalSeconds = Math.max(0, Math.round(decHours * 3600));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function setStatusPill(pillEl, textEl, open) {
    pillEl.classList.remove("open", "closed");
    pillEl.classList.add(open ? "open" : "closed");
    textEl.textContent = open ? "OPEN" : "CLOSED";
  }

  /* -----------------------------------------------------------
     FOREX WEEK STATUS
     ----------------------------------------------------------- */
  function isForexWeekOpen(now) {
    const day = now.getUTCDay();
    const hour = getUTCDecimalHour(now);

    if (day === 6) return false;
    if (day === 0) return hour >= 22;
    if (day === 5) return hour < 22;
    return true;
  }

  /* -----------------------------------------------------------
     US MARKET (NYSE/NASDAQ approx: 09:30-16:00 America/New_York)
     ----------------------------------------------------------- */
  function isUSMarketOpen(now) {
    const nyParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);

    const map = {};
    nyParts.forEach((p) => (map[p.type] = p.value));

    const weekday = map.weekday;
    const hour = parseInt(map.hour, 10);
    const minute = parseInt(map.minute, 10);
    const decHour = hour + minute / 60;

    const isWeekday = !["Sat", "Sun"].includes(weekday);
    return isWeekday && decHour >= 9.5 && decHour < 16;
  }

  /* -----------------------------------------------------------
     RENDER
     ----------------------------------------------------------- */
  function render() {
    const now = new Date();

    SESSIONS.forEach((s) => {
      const e = els[s.key];

      if (!e.clock.dataset.flapBuilt) {
        buildFlapClock(e.clock);
      }
      const parts = getZonedParts(now, s.tz);
      renderFlapTime(e.clock, parts.hh, parts.mm, parts.ss);

      // Use this venue's own local hour (the same one the clock above
      // shows) so OPEN/CLOSED always lines up with the displayed time,
      // regardless of Daylight Saving in either the venue or the viewer.
      const localDecHour =
        parseInt(parts.hh, 10) +
        parseInt(parts.mm, 10) / 60 +
        parseInt(parts.ss, 10) / 3600;
      const state = sessionState(s, localDecHour);

      setStatusPill(e.statusPill, e.statusText, state.open);
      e.card.classList.toggle("is-open", state.open);

      e.cdLabel.textContent = state.open ? "Closes in" : "Opens in";
      e.cdValue.textContent = hoursToHHMMSS(state.remainingHours);

      e.progressFill.style.width = `${state.pct}%`;
      e.progressPct.textContent = `${Math.round(state.pct)}%`;

      if (e.rangeLabel) {
        e.rangeLabel.textContent = formatSessionUTCRange(s, now);
      }
    });

    const utcParts = getZonedParts(now, "UTC");
    els.utcTime.textContent = `${utcParts.hh}:${utcParts.mm}:${utcParts.ss}`;
    els.localTime.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
    els.todayDate.textContent = now.toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const forexOpen = isForexWeekOpen(now);
    setStatusPill(els.marketForex, els.marketForex.querySelector(".status-text"), forexOpen);
    els.marketForex.classList.toggle("open", forexOpen);
    els.marketForex.classList.toggle("closed", !forexOpen);

    setStatusPill(els.marketCrypto, els.marketCrypto.querySelector(".status-text"), true);
    els.marketCrypto.classList.add("open");
    els.marketCrypto.classList.remove("closed");

    const usOpen = isUSMarketOpen(now);
    setStatusPill(els.marketUS, els.marketUS.querySelector(".status-text"), usOpen);
    els.marketUS.classList.toggle("open", usOpen);
    els.marketUS.classList.toggle("closed", !usOpen);
  }

  /* -----------------------------------------------------------
     INIT
     ----------------------------------------------------------- */
  function init() {
    cacheEls();
    render();
    setInterval(render, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
 
