# Smart home automation: handoff from the Claude chat (2026-11-25)

Owner: Zezu. House already built, in Pakistan. Mains is 220V single-phase per circuit; the house supply is three-phase (see DB board). The user writes casually and likes short answers with diagrams.

## Goal
Control the house from a phone with his own app: lights, fans, washroom lights, plus a few appliances, with on/off and schedules. DIY build, not a prebuilt system (smart breakers and Sonoff/Tuya modules were offered and declined).

## Decisions made
- No Raspberry Pi or local server. Each ESP32 joins the home Wi-Fi and syncs through a cloud database (Firebase Realtime Database). The app talks to the same database. Works from anywhere.
- The DB board stays as plain power. No relays in it, and no whole-house cut-off.
- Room switchboards (small wall plates with several buttons that control lights and fans): one ESP32 + 4-channel relay board behind each plate. Each light and fan is controlled individually. The existing wall switches must keep working by hand, so wire them to ESP32 input pins.
- Wall sockets: not wired. Build our own plug-in smart plugs (ESP32-C3 + isolated 5V module + 16A relay + fuse, in a closed plastic enclosure) only for chosen appliances. Never for the fridge, freezer or router.
- ACs stay manual (remote). Water pump/"water machine" not needed. The electric water heater is the only heavy load. Open question: is it hard-wired or on a socket? If hard-wired, it needs a contactor.
- Schedules are stored on the ESP32 and run there using NTP time, so they work with the phone off or the internet down.
- After a power cut, every relay must restore its last state.
- Optional, later: IR beam people counter at room doors (two beams about 10 to 15 cm apart, direction from which breaks first) to switch lights and fans. IR only. No radar. Safeguards: nightly auto reset to zero, app reset button, manual override.

## Hardware he already owns
5 x 4-channel 5V relay boards (rated 250VAC 10A per channel). Check whether they are opto-isolated and whether they have a JD-VCC jumper.

## Parts still to buy
ESP32 38-pin dev boards (2, one spare), ESP32-C3 boards for plugs and sensors, 5V power supplies sized to the relay count (about 3A for 20 relays on at once), HLK-PM01 isolated modules for the plugs, 16A relays, fuses, plastic enclosures, terminals. Earlier cost estimates assumed relays in the DB board and are now out of date. Recost once the switchboard count is known.

## DB board (from a photo; ratings read by eye, not verified)
- 24 single-pole MCBs: 8 x C10, 8 x C16, 8 x C20 (Schneider DomA81).
- 3 fuse holders (RT18-32, 32A) and a 3-pole 63A main (Schneider iC60N). So three phases (red, yellow, blue wires).
- The board is full, dusty, tangled, and unlabeled. No earth-leakage (RCD) breaker visible. A metal box blocks Wi-Fi, so electronics go in a separate plastic box.
- What each MCB feeds is still unknown. The user can find out by switching each one off and noting what goes dead.

## Wiring rules per circuit
- Only the live wire goes through a relay (COM in, NO out). Neutral and earth pass straight through, never through a relay.
- A relay goes in one circuit's live only. Never across two phases (400V). The relay boards are rated for 250V.
- Each switchboard unit needs 5V power from live and neutral in the box. Many Pakistani switch boxes have no neutral. Check this first.
- A licensed electrician must do all mains wiring. The user must not open or touch the live DB board.

## DIY smart plug rules
Isolated 5V module (HLK-PM01) only. Relay well above the load. Fuse on live. Closed plastic enclosure with strain relief. Screw terminals, proper wire gauge, no breadboard or perfboard on mains. Keep mains and low-voltage sides physically separated with a gap or slot. Earth passes straight through. Test with a low-voltage load first, and have the electrician check the first unit before a heater goes on it.

## Software plan
- Firmware: ESP32, Arduino framework via PlatformIO. Wi-Fi, Firebase sync, relay outputs, input pins for wall switches, NTP schedules, state restore in flash, status heartbeat.
- ESP32 pins: avoid strapping pins (0, 2, 12, 15), flash pins (6 to 11) and input-only pins (34 to 39) for outputs. Many relay boards are active-low.
- Database layout (suggested): `/devices/{deviceId}/channels/{n}` with `name`, `state`, `schedules`; `/devices/{deviceId}/status` with `online`, `lastSeen`. Security rules: only the owner's signed-in account can read or write.
- App: Flutter (Android only or Android and iPhone: not decided yet). Screens: room tabs, toggles with real state feedback, schedule editor, reset-count button if sensors are added.
- Safe schedule example he asked for: ten lights on from evening, off automatically at 6 am.

## Open questions for the user
1. How many room switchboards, and how many buttons on each?
2. Do the switch boxes have a neutral wire?
3. Android only, or Android and iPhone?
4. Is the water heater hard-wired or plugged into a socket?
5. Which appliances get a smart plug?
6. What does each MCB feed (from the switch-off test)?

## First task for Claude Code
Scaffold `firmware/` (PlatformIO, ESP32) and `app/` (Flutter) with a Firebase project, and build a one-relay prototype that toggles a low-voltage LED from the app, with the relay state reported back. No mains in the prototype.
