/**
 * script.js
 * ---------------------------------------------------------------
 * Drives both screens:
 *  1. Login form -> validates against the backend (Apps Script Web
 *     App) or, for local preview, the mock dataset in mock-data.js.
 *  2. Card screen -> renders the desktop dual-ticket layout (with
 *     hover-pop + click-to-swap) and the mobile single-card layout.
 *
 * Swap production note: the 4 provided keyframe PNGs (off / on /
 * activate3 / activate4) are flattened Figma smart-animate exports —
 * there's no vector/position data to lift exact offsets from. The
 * transform values below approximate the same three beats (small
 * hover rise -> full swap -> bouncy settle) using a single CSS
 * transition with an overshoot easing curve. Tweak TICKET_OFFSETS if
 * you want to fine-tune against the real frames.
 */

// ⚠️ Replace with your deployed Apps Script Web App URL before going live.
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbx9-Aehmrh2db0zkMLuhCr_kGOejErqm9jC8eo6cTqNXeoeGPaEApaNKF4xA1kV-YIC/exec";

const TICKET_OFFSETS = {
  frontTop: 90, // px — resting position of the fully-visible card
  backTop: 0, // px — resting position of the peeking card
  hoverRise: 16, // px — extra rise on hover of the back ticket
};

const screens = {
  login: document.getElementById("screen-login"),
  card: document.getElementById("screen-card"),
};

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("is-active"));
  screens[name].classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

// ---------------------------------------------------------------
// Login
// ---------------------------------------------------------------
const form = document.getElementById("login-form");
const emailField = document.getElementById("field-email");
const codeField = document.getElementById("field-code");
const emailInput = document.getElementById("input-email");
const codeInput = document.getElementById("input-code");
const submitBtn = document.getElementById("submit-btn");

async function lookupGuest(email, employeeCode) {
  if (BACKEND_URL) {
    const url = `${BACKEND_URL}?email=${encodeURIComponent(
      email
    )}&code=${encodeURIComponent(employeeCode)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("network");
    const json = await res.json();
    return json.ok ? json.data : null;
  }
  // Local preview fallback
  return window.__MOCK__.findByLogin(email, employeeCode);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  emailField.classList.remove("has-error");
  codeField.classList.remove("has-error");

  const email = emailInput.value.trim();
  const code = codeInput.value.trim();

  if (!email) {
    emailField.classList.add("has-error");
    return;
  }
  if (!code) {
    codeField.classList.add("has-error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Checking…";

  try {
    const viewModel = await lookupGuest(email, code);
    if (!viewModel) {
      emailField.classList.add("has-error");
      codeField.classList.add("has-error");
      return;
    }
    renderDesktopDeck(viewModel);
    renderMobileCard(viewModel);
    showScreen("card");
  } catch (err) {
    console.error(err);
    alert("Something went wrong reaching the travel card service. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Check Travel Card";
  }
});

// ---------------------------------------------------------------
// Small render helpers (return "" when value is empty -> field hidden)
// ---------------------------------------------------------------
function infoItem(label, value, size = "desktop") {
  if (value === null || value === undefined || value === "") return "";
  const cls = size === "desktop" ? "info-item" : "m-block";
  return `<div class="${cls}">
    <p class="label">${label}</p>
    <p class="value">${value}</p>
  </div>`;
}

// ---------------------------------------------------------------
// DESKTOP: dual layered ticket
// ---------------------------------------------------------------
function travelCardMarkup(vm) {
  const { bus, room, name, employeeCode } = vm;
  return `
    <div class="ticket-band">
      <span class="wordmark">ACFC</span>
      <span class="title">TRAVEL CARD</span>
      <span class="wordmark">ACFC</span>
    </div>
    <div class="ticket-body">
      <div class="info-col">
        <p class="section-title">Bus information</p>
        ${infoItem("Carrier", "ACFC Outing Trip 2026")}
        ${infoItem("Name", name)}
        ${infoItem("Employee Code", employeeCode)}
      </div>
      <div class="info-col">
        <div class="info-row">
          ${infoItem("Bus No.", bus.departNo)}
          ${infoItem("Date", vm.event.departDateLabel)}
          ${infoItem("Return Bus No.", bus.returnNo)}
        </div>
        <div class="info-row">
          ${infoItem("Seat No.", bus.departSeat)}
          ${infoItem("Depart Time", vm.event.gather.time)}
          ${infoItem("Seat No. (return)", bus.returnSeat)}
        </div>
        <div class="info-row">
          ${infoItem("Gather At", vm.event.gather.at)}
          ${infoItem("Return Date", bus.returnDate)}
        </div>
        <div class="note-box">Please note that your bus number is also your assigned table during lunch and gala dinner.</div>
      </div>
      <div class="info-col">
        <p class="section-title">Room information</p>
        ${infoItem("Room Type", room.type)}
        ${
          room.roommate1
            ? infoItem("Roommate Name", room.roommate1.name) +
              infoItem("Roommate Contact", room.roommate1.phone)
            : ""
        }
        ${
          room.roommate2
            ? infoItem("Roommate Name (2nd night)", room.roommate2.name) +
              infoItem("Roommate Contact", room.roommate2.phone)
            : ""
        }
      </div>
    </div>
  `;
}

function flightTicketMarkup(vm) {
  const { flight, name } = vm;
  if (!flight) return "";
  const d = flight.depart;
  const r = flight.return;
  return `
    <div class="ticket-band flight">
      <span class="carrier-logo">✈ Vietnam Airlines</span>
      <span class="title">FLIGHT TICKET</span>
      <span class="carrier-logo">✈ Vietnam Airlines</span>
    </div>
    <div class="ticket-body">
      <div class="info-col">
        <p class="section-title">Departure</p>
        <div class="info-row">${infoItem("From", d.from)}${infoItem("To", d.to)}</div>
        <div class="info-row">${infoItem("Flight No.", d.flightNo)}${infoItem("Date", d.date)}</div>
        <div class="info-row">${infoItem("Gather At", vm.event.gather.at)}${infoItem("Time", d.time)}</div>
      </div>
      <div class="info-col">
        <p class="section-title">Return</p>
        <div class="info-row">${infoItem("From", r.from)}${infoItem("To", r.to)}</div>
        <div class="info-row">${infoItem("Flight No.", r.flightNo)}${infoItem("Date", r.date)}</div>
        <div class="info-row">${infoItem("Time", r.time)}</div>
      </div>
      <div class="info-col">
        ${infoItem("Name", name)}
        ${infoItem("Booking Number", flight.bookingNumber)}
        ${infoItem("Ticket Number", flight.ticketNumber)}
      </div>
      <div class="note-box">Please show up at least 2 hours before flight time for check-in and baggage drop.</div>
    </div>
  `;
}

let deckState = null; // { frontKey: 'travel'|'flight', backKey, animating }

function renderDesktopDeck(vm) {
  const deck = document.getElementById("ticket-deck");
  const hasFlight = Boolean(vm.flight);

  deck.innerHTML = "";

  const travelEl = document.createElement("div");
  travelEl.className = "ticket ticket--front";
  travelEl.dataset.key = "travel";
  travelEl.innerHTML = travelCardMarkup(vm);
  deck.appendChild(travelEl);

  if (!hasFlight) {
    // Single card only — no swap interaction needed (matches
    // "Desktop-travelcard-no_flightticket" reference).
    deckState = null;
    return;
  }

  const flightEl = document.createElement("div");
  flightEl.className = "ticket ticket--back";
  flightEl.dataset.key = "flight";
  flightEl.innerHTML = flightTicketMarkup(vm);
  deck.appendChild(flightEl);

  deckState = { frontKey: "travel", backKey: "flight", animating: false };
  wireDeckInteractions(deck);
}

function wireDeckInteractions(deck) {
  deck.addEventListener("mouseover", (e) => {
    const backEl = deck.querySelector(".ticket--back");
    if (backEl && e.target.closest(".ticket") === backEl) {
      backEl.classList.add("is-hover");
    }
  });
  deck.addEventListener("mouseout", (e) => {
    const backEl = deck.querySelector(".ticket--back");
    if (backEl && e.target.closest(".ticket") === backEl) {
      backEl.classList.remove("is-hover");
    }
  });
  deck.addEventListener("click", (e) => {
    const backEl = deck.querySelector(".ticket--back");
    if (backEl && e.target.closest(".ticket") === backEl) {
      swapTickets(deck);
    }
  });
}

function swapTickets(deck) {
  if (!deckState || deckState.animating) return;
  deckState.animating = true;

  const frontEl = deck.querySelector(".ticket--front");
  const backEl = deck.querySelector(".ticket--back");

  backEl.classList.remove("is-hover");
  backEl.classList.add("ticket--swapping");
  frontEl.classList.add("ticket--swapping");

  // Force reflow so the transition picks up cleanly.
  // eslint-disable-next-line no-unused-expressions
  backEl.offsetHeight;

  backEl.classList.add("ticket--swap-to-front");
  frontEl.classList.add("ticket--swap-to-back");

  const cleanup = () => {
    // Commit the new resting roles.
    frontEl.classList.remove("ticket--front", "ticket--swapping", "ticket--swap-to-back");
    backEl.classList.remove("ticket--back", "ticket--swapping", "ticket--swap-to-front");
    frontEl.style.transform = "";
    backEl.style.transform = "";
    backEl.classList.add("ticket--front");
    frontEl.classList.add("ticket--back");

    const key = deckState.frontKey;
    deckState.frontKey = deckState.backKey;
    deckState.backKey = key;
    deckState.animating = false;
  };

  backEl.addEventListener("transitionend", cleanup, { once: true });
}

// ---------------------------------------------------------------
// MOBILE: single consolidated card
// ---------------------------------------------------------------
function renderMobileCard(vm) {
  const root = document.getElementById("mobile-card");
  const { bus, room, flight, name, employeeCode, event } = vm;

  const flightBlock = flight
    ? `
    <div class="mobile-card__body">
      ${infoItem("Passenger", name, "mobile")}
      <p class="m-section-title">Flight information</p>
      ${infoItem("Booking Number", flight.bookingNumber, "mobile")}
      <div class="m-two-col">
        <div>${infoItem("Depart · " + (flight.depart.flightNo || ""), flight.depart.date, "mobile")}</div>
        <div>${infoItem("Time", flight.depart.time, "mobile")}</div>
      </div>
      <div class="m-two-col">
        <div>${infoItem("Return · " + (flight.return.flightNo || ""), flight.return.date, "mobile")}</div>
        <div>${infoItem("Time", flight.return.time, "mobile")}</div>
      </div>
      <hr class="m-divider-solid" />
      <p class="m-section-title">Gather information</p>
      <div class="m-two-col">
        <div>${infoItem("Gather At", `${event.gather.at}<br><small>${event.gather.address}</small>`, "mobile")}</div>
        <div>${infoItem("Date", event.gather.dateLabel, "mobile")}</div>
      </div>
      ${infoItem("Time", event.gather.time, "mobile")}
    </div>`
    : `
    <div class="mobile-card__body">
      ${infoItem("Passenger", name, "mobile")}
      ${employeeCode ? infoItem("Employee Code", employeeCode, "mobile") : ""}
      <hr class="m-divider-solid" />
      <p class="m-section-title">Gather information</p>
      <div class="m-two-col">
        <div>${infoItem("Gather At", `${event.gather.at}<br><small>${event.gather.address}</small>`, "mobile")}</div>
        <div>${infoItem("Date", event.gather.dateLabel, "mobile")}</div>
      </div>
      ${infoItem("Time", event.gather.time, "mobile")}
    </div>`;

  const busBlock = `
    <div class="mobile-card__body">
      <p class="m-section-title">Bus information</p>
      ${infoItem("Depart Bus No.", bus.departNo, "mobile")}
      ${infoItem("Bus Leader", bus.departLeaderName, "mobile")}
      ${infoItem("Bus Leader Contact", bus.departLeaderPhone, "mobile")}
      <p style="font-size:12px;">Please note that this bus number is also your assigned table during lunch and gala dinner.</p>
      <hr class="m-divider-dash" />
      ${infoItem("Return Bus No.", bus.returnNo, "mobile")}
      ${infoItem("Bus Leader", bus.returnLeaderName, "mobile")}
      ${infoItem("Bus Leader Contact", bus.returnLeaderPhone, "mobile")}
    </div>`;

  const roomBlock = `
    <div class="mobile-card__body">
      <p class="m-section-title">Room information</p>
      ${infoItem("Room Type", room.type, "mobile")}
      ${room.roommate1 ? infoItem("Roommate", room.roommate1.name, "mobile") + infoItem("Roommate Contact", room.roommate1.phone, "mobile") : ""}
      ${room.roommate2 ? infoItem("Roommate (2nd night)", room.roommate2.name, "mobile") + infoItem("Roommate Contact", room.roommate2.phone, "mobile") : ""}
    </div>`;

  root.innerHTML = `
    <div class="mobile-card__hero">
      <img class="hero-image" src="assets/mobile-travelcard-header.png" alt="Travel Card — ${event.originCode} to ${event.destinationCode}" />
    </div>
    ${flightBlock}
    ${busBlock}
    ${roomBlock}
    <a class="faq-tab" href="https://docs.google.com/spreadsheets/d/1LCphezgMnkgBXstGCPjkuiN5su83opC6Zyluv0twBeA/edit?gid=0#gid=0" target="_blank" rel="noopener" aria-label="FAQ — opens in a new tab"></a>
  `;
}
