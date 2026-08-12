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

// Static, event-wide info that is the same for every guest and is NOT
// pulled from the sheet (there's no per-row column for it):
//   - depart date (everyone leaves 16 Aug 2026)
//   - gather location / address
// Confirm with Luan these truly are constant before hardcoding for real.
const EVENT_CONFIG = {
  departDateLabel: "16 AUG",
  gather: {
    at: "SALA",
    address: "XX Nguyễn Cơ Thạch, An Khánh Ward, HCMC",
    dateLabel: "SUN, 16 AUG 26",
    time: "09:00 AM",
  },
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
    ticketNumber: "",
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
    ticketNumber: "738-2422499501",
    departFlightNo: "VN207",
    departFlightDate: "15/08/2026",
    departFlightTime: "07:00 am",
    departFrom: "HÀ NỘI",
    departTo: "TP. HỒ CHÍ MINH",
    returnFlightNo: "VN258",
    returnFlightDate: "17/08/2026",
    returnFlightTime: "19:00",
    returnFrom: "TP. HỒ CHÍ MINH",
    returnTo: "HÀ NỘI",
  },
];

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
    },
    room: {
      code: row.roomCode || null,
      type: row.roomType || null,
      roommate1,
      roommate2: showRoommate2 ? roommate2 : null,
    },
    flight: hasFlight
      ? {
          bookingNumber: row.bookingNumber,
          ticketNumber: row.ticketNumber || null,
          depart: {
            flightNo: row.departFlightNo || null,
            date: row.departFlightDate || null,
            time: row.departFlightTime || null,
            from: row.departFrom || null,
            to: row.departTo || null,
          },
          return: {
            flightNo: row.returnFlightNo || null,
            date: row.returnFlightDate || null,
            time: row.returnFlightTime || null,
            from: row.returnFrom || null,
            to: row.returnTo || null,
          },
        }
      : null,
    event: EVENT_CONFIG,
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
