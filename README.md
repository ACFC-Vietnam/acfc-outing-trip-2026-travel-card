# ACFC Outing Trip 2026 — Travel Card mini-site

## What's in here
- `index.html` — both screens (login + card), toggled by JS
- `css/tokens.css` — every value pulled straight from the font/element guide
- `css/style.css` — layout, login screen, desktop dual-ticket, mobile single card, animations
- `js/script.js` — login handling, rendering, hover-pop + click-to-swap
- `js/mock-data.js` — local stand-in data so this previews without a live backend (remove/ignore once BACKEND_URL is set)
- `gas/Code.gs` — Apps Script Web App backend to paste into the Sheet's Extensions > Apps Script

## To go live
1. Open the Sheet > Extensions > Apps Script, paste in `gas/Code.gs`, update `SHEET_NAME` if the tab isn't literally "Sheet1".
2. Deploy > New deployment > Web app > Execute as **Me** > Who has access **Anyone with the link**. Copy the `/exec` URL.
3. In `js/script.js`, set `BACKEND_URL` to that URL. That's it — `mock-data.js` is only used as a fallback when `BACKEND_URL` is empty, so you can leave it in for future local testing.

## Font swap (Glow Better)
Glow Better is a paid, personal-use-by-default font — not licensed for this. Swapped in **Fraunces**, a free, fully commercial-use (OFL) variable serif from Google Fonts, loaded via the `@import` at the top of `style.css`. It's not a 1:1 stylistic match (no built-in ligature swashes), but it's in the same "elegant display serif" family and reads well at both the H1/H2/H3 sizes in the guide. Swap the `--font-display` variable in `tokens.css` if you'd rather try something else — happy to test alternates if this one doesn't land.

## Animation
The 4 keyframe PNGs (off/on/activate3/activate4) are flattened exports with no vector data to extract exact offsets from, so the hover + swap motion is built as a CSS transition with an overshoot easing curve (`cubic-bezier(0.34, 1.56, 0.64, 1)`) approximating the same three beats: small hover rise, full swap, bouncy settle. Tune `TICKET_OFFSETS` in `script.js` / the `.ticket--*` rules in `style.css` if you want it tighter to the real frames.

## Known gaps / please confirm
- "Gather info" (SALA, address, date, time) is currently hardcoded as event-wide config in both `mock-data.js` and `Code.gs` (`EVENT_CONFIG`) since there's no per-row column for it in the sheet — confirm this is correct and not meant to vary per person/bus.
- Same for depart date ("16 AUG") — sheet has no per-row depart-date column, only return date, so it's assumed constant.
