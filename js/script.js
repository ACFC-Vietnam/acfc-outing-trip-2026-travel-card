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
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbyl0rbz0d8NWGyY7COAWS01QcFbe6XGODvQPO4XCgLA7coaniK5Ghplfr7r-VcejIodTg/exec";

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
/**
 * Renders a label/value pair. `mode` controls empty-value behavior:
 *  - "hide" (default): empty value -> field omitted entirely. Used for
 *    Flight Ticket fields (e.g. seat, when no data source exists).
 *  - "dash": empty value -> renders "—" instead of omitting. Used for
 *    everything else (Travel Card, Room Info), on both desktop and
 *    mobile, per your instruction that only FLIGHT INFORMATION keeps
 *    the hide-on-empty behavior.
 */
function infoItem(label, value, size = "desktop", mode = "hide") {
  const isEmpty = value === null || value === undefined || value === "";
  if (isEmpty && mode === "hide") return "";
  const display = isEmpty ? "—" : value;
  const cls = size === "desktop" ? "info-item" : "m-block";
  return `<div class="${cls}">
    <p class="label">${label}</p>
    <p class="value">${display}</p>
  </div>`;
}

// ---------------------------------------------------------------
// DESKTOP: dual layered ticket
// ---------------------------------------------------------------
function travelCardMarkup(vm) {
  const { bus, room, name } = vm;
  const d = "dash"; // shorthand for the dash-fallback mode used throughout this card
  return `
    <div class="ticket-band">
      <img class="band-logo" src="assets/company-logo.svg" alt="ACFC" />
      <span class="title">TRAVEL CARD</span>
      <img class="band-logo" src="assets/company-logo.svg" alt="ACFC" />
    </div>
    <div class="ticket-flap-divider"></div>
    <div class="ticket-body ticket-body--travel">
      <div class="info-col">
        <p class="section-title">Bus information</p>
        ${infoItem("Carrier", "ACFC Outing Trip 2026", "desktop", d)}
        ${infoItem("Name", name, "desktop", d)}
        ${infoItem("From", bus.from, "desktop", d)}
      </div>
      <div class="info-col">
        ${infoItem("Depart Bus No.", bus.departNo, "desktop", d)}
        ${infoItem("Seat No.", bus.departSeat, "desktop", d)}
        ${infoItem("Depart Date", vm.event.departDateLabel, "desktop", d)}
        ${infoItem("Depart Time", vm.event.gather.time, "desktop", d)}
      </div>
      <div class="info-col">
        ${infoItem("Return Bus No.", bus.returnNo, "desktop", d)}
        ${infoItem("Seat No.", bus.returnSeat, "desktop", d)}
        ${infoItem("Return Date", bus.returnDateLabel, "desktop", d)}
        ${infoItem("Gather Time", vm.event.returnGatherTime, "desktop", d)}
      </div>
      <div class="note-box">Please show up at least 15 minutes before Departure Time. Please note that your bus number is also your assigned table during lunch and gala dinner.</div>
      <div class="info-col info-col--room">
        <p class="section-title">Room information</p>
        ${infoItem("Room Type", room.type, "desktop", d)}
        ${infoItem("Roommate", room.roommate1 ? room.roommate1.name : null, "desktop", d)}
        ${infoItem("Roommate Contact", room.roommate1 ? room.roommate1.phone : null, "desktop", d)}
        ${
          room.roommate2
            ? infoItem("2nd Night Roommate", room.roommate2.name, "desktop", d) +
              infoItem("Roommate Contact", room.roommate2.phone, "desktop", d)
            : ""
        }
      </div>
    </div>
    <div class="ticket-footer">ACFC OUTING TRIP 2026</div>
  `;
}

function flightTicketMarkup(vm) {
  const { flight, name } = vm;
  if (!flight) return "";
  const dep = flight.depart;
  const ret = flight.return;
  return `
    <div class="ticket-band flight">
      <img class="band-logo" src="assets/surface1.svg" alt="Vietnam Airlines" />
      <span class="title">FLIGHT TICKET</span>
      <img class="band-logo" src="assets/surface1.svg" alt="Vietnam Airlines" />
    </div>
    <div class="ticket-flap-divider"></div>
    <div class="ticket-body">
      <div class="info-col">
        <p class="section-title">Departure</p>
        <div class="info-row">${infoItem("From", dep.from)}${infoItem("To", dep.to)}</div>
        <div class="info-row">${infoItem("Flight No.", dep.flightNo)}${infoItem("Date", dep.date)}</div>
        <div class="info-row">${infoItem("Time", dep.time)}${infoItem("Class", vm.event.flightClass)}</div>
      </div>
      <div class="info-col">
        <p class="section-title">Return</p>
        <div class="info-row">${infoItem("From", ret.from)}${infoItem("To", ret.to)}</div>
        <div class="info-row">${infoItem("Flight No.", ret.flightNo)}${infoItem("Date", ret.date)}</div>
        <div class="info-row">${infoItem("Time", ret.time)}${infoItem("Class", vm.event.flightClass)}</div>
      </div>
      <div class="info-col">
        ${infoItem("Name", name)}
        ${infoItem("Booking Number", flight.bookingNumber)}
        <div class="info-row">${infoItem("Depart Flight No.", dep.flightNo)}${infoItem("Depart Date", dep.date)}</div>
        <div class="info-row">${infoItem("Return Flight No.", ret.flightNo)}${infoItem("Return Date", ret.date)}</div>
      </div>
      <div class="note-box">Please show up at least 2 hours before flight time for check-in and baggage drop.</div>
    </div>
    <div class="ticket-footer flight">ACFC OUTING TRIP 2026</div>
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
  const { bus, room, flight, name, event } = vm;
  const dash = "mobile"; // size arg; dash mode passed explicitly below

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
      ${infoItem("Class", event.flightClass, "mobile")}
      <hr class="m-divider-solid" />
      <p class="m-section-title">Gather information</p>
      <div class="m-two-col">
        <div>${infoItem("Gather At", `${event.gather.at}<br><small>${event.gather.address}</small>`, "mobile", "dash")}</div>
        <div>${infoItem("Date", event.gather.dateLabel, "mobile", "dash")}</div>
      </div>
      ${infoItem("Time", event.gather.time, "mobile", "dash")}
    </div>`
    : `
    <div class="mobile-card__body">
      ${infoItem("Passenger", name, "mobile", "dash")}
      <hr class="m-divider-solid" />
      <p class="m-section-title">Gather information</p>
      <div class="m-two-col">
        <div>${infoItem("Gather At", `${event.gather.at}<br><small>${event.gather.address}</small>`, "mobile", "dash")}</div>
        <div>${infoItem("Date", event.gather.dateLabel, "mobile", "dash")}</div>
      </div>
      ${infoItem("Time", event.gather.time, "mobile", "dash")}
    </div>`;

  const busBlock = `
    <div class="mobile-card__body">
      <p class="m-section-title">Bus information</p>
      ${infoItem("From", bus.from, "mobile", "dash")}
      ${infoItem("To", bus.to, "mobile", "dash")}
      <div class="m-two-col">
        <div>${infoItem("Depart Bus No.", bus.departNo, "mobile", "dash")}</div>
        <div>${infoItem("Seat No.", bus.departSeat, "mobile", "dash")}</div>
      </div>
      ${infoItem("Bus Leader", bus.departLeaderName, "mobile", "dash")}
      ${infoItem("Bus Leader Contact", bus.departLeaderPhone, "mobile", "dash")}
      ${infoItem("Class", bus.busClass, "mobile", "dash")}
      <p style="font-size:12px;">Please note that this bus number is also your assigned table during lunch and gala dinner.</p>
      <hr class="m-divider-dash" />
      <div class="m-two-col">
        <div>${infoItem("Return Bus No.", bus.returnNo, "mobile", "dash")}</div>
        <div>${infoItem("Seat No.", bus.returnSeat, "mobile", "dash")}</div>
      </div>
      ${infoItem("Bus Leader", bus.returnLeaderName, "mobile", "dash")}
      ${infoItem("Bus Leader Contact", bus.returnLeaderPhone, "mobile", "dash")}
      ${infoItem("Drop Off At", bus.dropOffAt, "mobile", "dash")}
    </div>`;

  const roomBlock = `
    <div class="mobile-card__body">
      <p class="m-section-title">Room information</p>
      ${infoItem("Room Type", room.type, "mobile", "dash")}
      ${infoItem("Roommate", room.roommate1 ? room.roommate1.name : null, "mobile", "dash")}
      ${infoItem("Roommate Contact", room.roommate1 ? room.roommate1.phone : null, "mobile", "dash")}
      ${
        room.roommate2
          ? infoItem("2nd Night Roommate", room.roommate2.name, "mobile", "dash") +
            infoItem("Roommate Contact", room.roommate2.phone, "mobile", "dash")
          : ""
      }
    </div>`;

  root.innerHTML = `
    <div class="mobile-card__hero">
      <h1>TRAVEL CARD</h1>
      <div class="route-diagram">
        <div class="node"><h2>${event.originCode}</h2><p>THE BEST PLACE<br/>TO WORK</p></div>
        <span class="bus-icon">🚌</span>
        <div class="route-line"></div>
        <div class="node"><h2>${event.destinationCode}</h2><p>A FANTASTIC<br/>DESTINATION</p></div>
      </div>
    </div>
    ${flightBlock}
    ${busBlock}
    ${roomBlock}
    <a class="faq-tab" href="https://docs.google.com/spreadsheets/d/1LCphezgMnkgBXstGCPjkuiN5su83opC6Zyluv0twBeA/edit?gid=0#gid=0" target="_blank" rel="noopener" aria-label="FAQ — opens in a new tab"></a>
  `;
}
