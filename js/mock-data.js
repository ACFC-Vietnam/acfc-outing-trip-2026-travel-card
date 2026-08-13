/**
 * mock-data.js
 * ---------------------------------------------------------------
 * Local stand-in for the Apps Script Web App response, so the
 * front end can be previewed without a live deployment.
 *
 * COLUMN MAP (confirmed with Luan — matches the original spec,
 * column C = MSNV without leading zero is intentionally skipped):
 *
 *  A  STT                         (order)
 *  B  Họ và tên                   (name)
 *  C  MSNV (no leading 0)         — not used
 *  D  MSNV reconcile              — employee code used for login (leading 0)
 *  E  Email
 *  F  Số điện thoại
 *  G  Depart bus no.
 *  H  Depart seat
 *  I  Depart bus leader name
 *  J  Depart bus leader phone
 *  K  Return date
 *  L  Return bus no.
 *  M  Return seat
 *  N  Return bus leader name
 *  O  Return bus leader phone
 *  P  Room code
 *  Q  Room type
 *  R  Roommate name (night 1 / 16-8)
 *  S  Roommate phone (night 1)
 *  T  Roommate name (night 2 / 17-8) — only shown if different from night 1
 *  U  Roommate phone (night 2)
 *  V  Flight booking number
 *  W  Flight ticket number
 *  X  Depart flight no.
 *  Y  Depart flight date
 *  Z  Depart flight time
 *  AA Depart from
 *  AB Depart to
 *  AC Return flight no.
 *  AD Return flight date
 *  AE Return flight time
 *  AF Return from
 *  AG Return to
 *
 * Column AH (Hành lý / baggage) is intentionally NOT mapped — confirmed
 * not needed on the card.
 *
 * Sentinel values seen in the live sheet for roommate columns:
 *   "— (về 17/8)"     -> guest left before night 2, hide the block
 *   "— (ở một mình)"  -> guest has the room alone, hide the block
 * Both are normalized to null by cleanRoommate() below so the card
 * simply omits the section, per the "hide if empty" rule.
 */

const SENTINEL_PATTERNS = [/^—\s*\(/, /^-\s*\(/];

function cleanRoommate(name, phone) {
  if (!name) return null;
  const isSentinel = SENTINEL_PATTERNS.some((re) => re.test(name.trim()));
  if (isSentinel) return null;
  return { name: name.trim(), phone: (phone || "").trim() || null };
}

// Static, event-wide defaults. `gather.address` is now overridden per-row
// from column C of the MASTER FILE (see toCardViewModel below) — this
// stays only as the fallback when that cell is empty.
const EVENT_CONFIG = {
  departDateLabel: "16 AUG",
  gather: {
    at: "SALA",
    address: "XX Nguyễn Cơ Thạch, An Khánh Ward, HCMC",
    dateLabel: "SUN, 16 AUG 26",
    time: "09:00 AM",
  },
  // Static event-wide fields with no per-row sheet column — same for
  // flightClass is static for every guest. Bus FROM/TO/CLASS/DROP OFF
  // are now computed per-row by deriveBusLabels() below.
  flightClass: "ECONOMY",
  destinationCode: "LH", // shown as the H2 on the mobile route diagram
  originCode: "ACFC",
};

// Raw rows shaped exactly like columns A..AG (skipping C) — for local preview only.
const MOCK_ROWS = [
  {
    stt: 94,
    name: "NGUYỄN ĐỨC THỤY RẠNG ĐÔNG",
    employeeCode: "009825",
    email: "dong.nguyenducthuyrang@acfc.com.vn",
    phone: "0708349858",
    gatherLocation: "", // empty -> falls back to EVENT_CONFIG default
    departBusNo: "SG2",
    departSeat: "4",
    departBusLeader: "TRẦN VĂN THÌN",
    departBusLeaderPhone: "0948030669",
    returnDate: "18/8",
    returnBusNo: "BTC",
    returnSeat: "1",
    returnBusLeader: "PHẠM THỊ LINH CHI",
    returnBusLeaderPhone: "0932078782",
    roomCode: "10",
    roomType: "Suite",
    roommate1Name: "LÊ THỊ PHƯƠNG TRANG",
    roommate1Phone: "0985694069",
    roommate2Name: "LÊ THỊ PHƯƠNG TRANG", // identical to night 1 -> should collapse to one line
    roommate2Phone: "0985694069",
    // No flight columns filled for this guest in the live sheet today —
    // the flight ticket must NOT render for her (unlike the design mockups).
    bookingNumber: "",
    departFlightNo: "",
    departFlightDate: "",
    departFlightTime: "",
    departFrom: "",
    departTo: "",
    returnFlightNo: "",
    returnFlightDate: "",
    returnFlightTime: "",
    returnFrom: "",
    returnTo: "",
  },
  {
    // A second sample WITH flight data, so the flight ticket + swap
    // interaction can actually be previewed.
    stt: 1,
    name: "NGUYỄN THỊ THANH MAI",
    employeeCode: "022861",
    email: "mai.nguyenthithanh@acfc.com.vn",
    phone: "0936612889",
    gatherLocation: "Sala Quận 2 — Giao giữa đường Hoàng Thế Thiện và D6",
    departBusNo: "HAN",
    departSeat: "1",
    departBusLeader: "TRẦN THỊ THU HƯƠNG",
    departBusLeaderPhone: "0904378881",
    returnDate: "17/8",
    returnBusNo: "HAN",
    returnSeat: "1",
    returnBusLeader: "TRẦN THỊ THU HƯƠNG",
    returnBusLeaderPhone: "0904378881",
    roomCode: "161",
    roomType: "Deluxe (twin)",
    roommate1Name: "NGUYỄN THỊ NGUYỆT",
    roommate1Phone: "0917547035",
    roommate2Name: "— (về 17/8)", // sentinel -> hide 2nd-night block
    roommate2Phone: "",
    bookingNumber: "DMQHZO",
    departFlightNo: "VN207",
    departFlightDate: "15/08/2026",
    departFlightTime: "07:00 AM",
    departFrom: "HÀ NỘI",
    departTo: "TP. HỒ CHÍ MINH",
    returnFlightNo: "VN258",
    returnFlightDate: "17/08/2026",
    returnFlightTime: "07:00 PM",
    returnFrom: "TP. HỒ CHÍ MINH",
    returnTo: "HÀ NỘI",
  },
  {
    // Personal-car test case — no flight, no BID/HAN — checks the
    // "Personal Car" CLASS override.
    stt: 55,
    name: "TRẦN VĂN ĐẠT",
    employeeCode: "004512",
    email: "dat.tranvan@acfc.com.vn",
    phone: "0912345678",
    gatherLocation: "",
    departBusNo: "Personal Car",
    departSeat: "",
    departBusLeader: "",
    departBusLeaderPhone: "",
    returnDate: "16/8",
    returnBusNo: "Personal Car",
    returnSeat: "",
    returnBusLeader: "",
    returnBusLeaderPhone: "",
    roomCode: "12",
    roomType: "Deluxe (twin)",
    roommate1Name: "PHẠM QUỐC HUY",
    roommate1Phone: "0909112233",
    roommate2Name: "PHẠM QUỐC HUY",
    roommate2Phone: "0909112233",
    bookingNumber: "",
    departFlightNo: "",
    departFlightDate: "",
    departFlightTime: "",
    departFrom: "",
    departTo: "",
    returnFlightNo: "",
    returnFlightDate: "",
    returnFlightTime: "",
    returnFrom: "",
    returnTo: "",
  },
];

/**
 * Derived/business-logic fields with no direct sheet column.
 * FROM: if flying, use the flight's depart city. Otherwise BID bus ->
 *       Bình Dương, everything else -> Ho Chi Minh City.
 * TO:   always "VIENNA HOUSE" (static).
 * CLASS: "HAPPY BUS" normally; "PERSONAL CAR" for the 2 riders whose
 *        bus no. is literally marked "Personal Car" in the sheet.
 * DROP OFF AT: keyed off the RETURN bus number — HAN -> TSN Airport,
 *        BID -> Bình Dương, everything else -> Ho Chi Minh City.
 */
function deriveBusLabels(departBusNo, returnBusNo, hasFlight, flightDepartFrom) {
  const from = hasFlight
    ? flightDepartFrom || null
    : departBusNo === "BID"
    ? "BÌNH DƯƠNG"
    : "HO CHI MINH CITY";

  const to = "VIENNA HOUSE";

  const isPersonalCar =
    (departBusNo || "").toLowerCase() === "personal car" ||
    (returnBusNo || "").toLowerCase() === "personal car";
  const busClass = isPersonalCar ? "PERSONAL CAR" : "HAPPY BUS";

  const dropOffAt =
    returnBusNo === "HAN"
      ? "TSN AIRPORT"
      : returnBusNo === "BID"
      ? "BÌNH DƯƠNG"
      : "HO CHI MINH CITY";

  return { from, to, busClass, dropOffAt };
}

/** Format like "16 AUG" from a "dd/MM/yyyy" or already-formatted string. */
function formatFlightDate(raw) {
  if (!raw) return null;
  // Accepts "15/08/2026" style input from the mock rows.
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!m) return raw; // already formatted / unrecognized — pass through
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${parseInt(m[1], 10)} ${months[parseInt(m[2], 10) - 1]}`;
}

/** Format like "07:00AM" (no space) from "07:00 AM" style input. */
function formatFlightTime(raw) {
  if (!raw) return null;
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

/**
 * Shapes a raw row into the view-model the renderer expects,
 * applying "hide if empty" + sentinel-cleaning rules.
 */
function toCardViewModel(row) {
  const roommate1 = cleanRoommate(row.roommate1Name, row.roommate1Phone);
  const roommate2 = cleanRoommate(row.roommate2Name, row.roommate2Phone);
  // Collapse night-2 into night-1 if it's the same person.
  const showRoommate2 =
    roommate2 && (!roommate1 || roommate2.name !== roommate1.name);

  const hasFlight = Boolean(row.bookingNumber && row.bookingNumber.trim());
  const busLabels = deriveBusLabels(
    row.departBusNo,
    row.returnBusNo,
    hasFlight,
    row.departFrom
  );

  return {
    name: row.name || null,
    employeeCode: row.employeeCode || null,
    bus: {
      departNo: row.departBusNo || null,
      departSeat: row.departSeat || null,
      departLeaderName: row.departBusLeader || null,
      departLeaderPhone: row.departBusLeaderPhone || null,
      returnDate: row.returnDate || null,
      returnNo: row.returnBusNo || null,
      returnSeat: row.returnSeat || null,
      returnLeaderName: row.returnBusLeader || null,
      returnLeaderPhone: row.returnBusLeaderPhone || null,
      from: busLabels.from,
      to: busLabels.to,
      busClass: busLabels.busClass,
      dropOffAt: busLabels.dropOffAt,
    },
    room: {
      // NOTE: using column P for room type per your latest instruction —
      // this used to be column Q (P was "room code"). Flagging in case
      // that wasn't intentional; room code (old P) is no longer read.
      type: row.roomType || null,
      roommate1,
      roommate2: showRoommate2 ? roommate2 : null,
    },
    flight: hasFlight
      ? {
          bookingNumber: row.bookingNumber,
          depart: {
            flightNo: row.departFlightNo || null,
            date: formatFlightDate(row.departFlightDate),
            time: formatFlightTime(row.departFlightTime),
            from: row.departFrom || null,
            to: row.departTo || null,
          },
          return: {
            flightNo: row.returnFlightNo || null,
            date: formatFlightDate(row.returnFlightDate),
            time: formatFlightTime(row.returnFlightTime),
            from: row.returnFrom || null,
            to: row.returnTo || null,
          },
        }
      : null,
    event: Object.assign({}, EVENT_CONFIG, {
      gather: Object.assign({}, EVENT_CONFIG.gather, {
        address: row.gatherLocation || EVENT_CONFIG.gather.address,
      }),
    }),
  };
}

// Exposed for script.js
window.__MOCK__ = {
  rows: MOCK_ROWS,
  toCardViewModel,
  findByLogin(email, employeeCode) {
    const e = (email || "").trim().toLowerCase();
    const c = (employeeCode || "").trim();
    const row = MOCK_ROWS.find(
      (r) => r.email.toLowerCase() === e && r.employeeCode === c
    );
    return row ? toCardViewModel(row) : null;
  },
};
