# Changelog

All notable changes to this project will be documented in this file.

## [0.5.18] - 2026-03-27
### Enhanced
- **Get All Dev Links — inline device status in left pane**: The operation no longer opens the scrolling progress modal. Instead, each device row in the left pane shows a live status label that updates as each step runs: `op flags...` → `db delta...` → `links (N)...`, resolving to a coloured final result — green `Done`, orange `No links returned (battery device or sensor)`, red `Offline (no device response)`. When all devices are processed, the "Get All Dev Links" button briefly shows ✓ Done!. The modal is still used when a device's link database is up-to-date and a confirmation prompt is needed.
- **Duplicate SSE listener fixed**: Opening "Get All Dev Links" (or any SSE-backed action) multiple times on the same page previously registered a new EventSource listener on each click without closing the previous one, causing every message to be displayed twice. Now a single `_sseSource` reference is tracked globally and the old connection is closed before a new one is opened.

## [0.5.17] - 2026-03-27
### Fixed
- **Get All Dev Links — all failures showed identical "battery device or offline" message**: Every device that didn't return links was reported as "Timed out (battery device or offline)" regardless of actual cause. Three distinct failure modes are now reported separately:
  - **"Offline (no device response)"** — device failed to respond to op flags, database delta, AND link read (e.g. truly powered-off or unreachable devices). Shown in red.
  - **"No links returned (battery device or sensor)"** — device responded to at least one command (op flags or delta) but the link database read returned empty. Typical for battery-powered sensors and some remotes that don't expose a link database. Shown in orange.
  - **"Done"** — device responded and links were read successfully (existing behaviour). Shown in green.
- **Get All Dev Links — devices with 0 links incorrectly reported as timed out**: `getDeviceLinks` was treating an empty link database (device responded but has no links) the same as a hub communication timeout — both called `callback(true, null)`. Now checks the error argument first: a hub timeout propagates the error; a successful response with 0 links emits "No links found" and calls `callback(null, [])` (success, treated as Done).
- **Get All Dev Links — queue hangs when device links are up to date**: When `getDatabaseDelta` matched the stored delta (links unchanged), `getAllDeviceInfo` emitted a `prompt` SSE event but never called its callback, leaving the queue waiting indefinitely for the next device. Added the missing `callback(null, null)`.
### Enhanced
- **Get All Dev Links progress log — warning color for no-links devices**: "No links" and "battery device" messages now appear in orange (`#f0ad4e`) in the progress log instead of the default dark colour, making it easier to distinguish warnings from errors (red) and successes (green).

## [0.5.16] - 2026-03-28
### Added
- **Import Names from Insteon Connect**: New option in the Device Action menu lets you paste a CSV exported from connect.insteon.com and apply device names (and device types inferred from the Model column) to all matched hub devices in one step. The import page renders a textarea form; on submit it parses the CSV, matches by Insteon ID (period-insensitive), updates names and types, and writes the result atomically (temp file then rename) to avoid corrupting insteon.json on failure. A results table shows each matched/unmatched row.
### Fixed
- **CSV import crash / insteon.json corruption**: `processInsteonConnectCSV` operated on `this.insteonJSON.devices` which is initialized as `{}` (plain object, not array) during `getHubDevices`. Any call to `findIndex` on an object is `undefined`, causing a runtime exception that left a partial JSON write and an empty/corrupt insteon.json on the next Homebridge restart. Fixed by using a local `devices` array (falling back to `hubDevices` if `insteonJSON.devices` is not yet an array), operating on that array throughout the loop, then syncing it back to `this.insteonJSON.devices` before the atomic save.

## [0.5.15] - 2026-03-27
### Fixed
- **Get All Dev Links progress modal closing after first device**: `getDeviceLinks` was emitting a `close` SSE event on both success and failure, dismissing the modal after every single device instead of waiting for the full run to complete. Removed the spurious `close` emits — only the top-level loop now signals completion.
- **Get All Dev Links device order**: Devices were processed bottom-to-top (`Array.pop`) instead of top-to-bottom. Changed to `Array.shift` so devices are processed in the same order they appear in the hub device list.
### Enhanced
- **Get All Dev Links — missing for-loop closing braces in `setOutletState`**: Two for-loops in the on/off branches of `setOutletState` were each missing two closing braces (a side effect of the earlier promise deadlock fix), causing TypeScript compile errors. Fixed.

## [0.5.14] - 2026-03-26
### Security
- **Input validation on all Express API routes**: All route parameters (`[id]`, `[targetLevel]`, `[group]`) are now validated before being passed to the Insteon hub. Device IDs must be exactly 6 hexadecimal characters; level must be an integer 0–100; group must be an integer 1–255. Invalid requests are rejected with HTTP 400.
- **Null dereference fixed in `iolinc` and `fan` Express routes**: `/iolinc/:id/relay_on`, `/iolinc/:id/relay_off`, and `/fan/:id/level/:targetLevel` would crash attempting to call methods on `undefined` if the device ID was not registered. Fixed with the same null guard pattern applied to the light routes in 0.5.13.
- **Hub password no longer visible in InsteonUI**: The hub password field on the Config page was rendered as `type='text'`, making the password visible in the browser and in page source. Changed to `type='password'`.
- **Hub credentials no longer logged to Homebridge log**: When saving config via the InsteonUI, the full config object (including hub username and password) was written to the Homebridge log via `JSON.stringify(this.config)`. Replaced with a redacted message.
- **Device ID validation in InsteonUI action routes**: The `removeDevice`, `removeLink`, `removeHubLink`, `beep`, and `getLinks` URL-based routes in the InsteonUI extracted device IDs and link indices directly from the raw URL with no validation. All now validate the device ID against the 6-character hex format and return HTTP 400 on invalid input.
### Enhanced
- **Get All Dev Links progress log**: The "Updating device..." modal now shows a live scrollable log with per-device status — green for success, red for timeouts (battery/offline devices), blue for in-progress. Each line shows the device ID and position in the queue (e.g. `[2/6] Getting info for 6072DB...`).

## [0.5.13] - 2026-03-26
### Fixed
- **Remote (mini-remote) battery handling**: `remote` device type is now correctly treated as a battery-operated device. Added `StatusLowBattery` characteristic and low battery detection via Insteon `command2 == '03'` broadcast signal, consistent with other battery sensors.
- **Remote button press handler**: `handleRemoteEvent` was declared but never defined, causing a `TypeError` crash on every button press. Now correctly implemented — routes group/button matching, fires `ProgrammableSwitchEvent` in stateless mode or toggling On/Off in switch mode.
- **Inverted responder controller logic**: `['11','12','13','14'].indexOf(command1) + 1` evaluated truthy for every command *except* on/off commands (completely inverted). Fixed to `>= 0`.
- **Null dereference crashes in Express API routes**: `/light/:id/on`, `/light/:id/off`, and `/light/:id/level` routes would crash with `TypeError` if a device ID was not registered or not found in accessories. Added null guard before calling `getStatus`.
- **Null dereference in responder device lookup**: The event listener's controller-responder loop would crash if a `controllers` device ID was not registered as an accessory. Added null guard with `continue`.
- **Null dereference in `getGroupMemberStatus`**: Accessing `groupDevice[0]` or `namedDev[0]` without checking for undefined would crash when a group member ID/name was not found in accessories. Added null guards with debug log.
- **`getSensorStatus` callback crash**: `callback()` was called unconditionally for IOLinc sensor polling, crashing when called without a callback argument. Added `typeof callback === 'function'` guard.
- **Broken promise deadlock in keypad LED sync**: All 5 occurrences of the keypad LED synchronization loop used `new Promise((resolve, reject) => this.setTargetKeypadBtn.call(this))` where `resolve` was never passed through to the callback, causing an `await` that would never resolve (permanent deadlock/resource leak). Replaced with direct sequential calls.
- **Duplicate `this.host` assignment**: `this.host = config['host']` was assigned twice consecutively in the platform constructor.

## [0.5.12] - 2025-12-31
### Enhanced
- Added `override` feature (see README)
- Added override for the `serialport` package to hopefully fix some install issues
- Merged (#333) from @rasod for full Homebridge 2.0 compatibility.  Note that you will need to upgrade your Node.js version to at least v20.0.

## [0.5.11] - 2023-09-19
### Fixed
- Fix for target keypads feature (#300)

## [0.5.10] - 2023-07-29
### Enhanced
- Initial support for new i3 keypad

## [0.5.9] - 2023-07-07
### Enhanced
- Update device database to include new i3 devices

## [0.5.8] - 2023-02-15
### Fixed
- Fix error with deleting links (#291)
- Fix error when devices array is not present in config (#289)
## [0.5.7] - 2023-01-03
### Fixed
- Restore 'keepAlive' and 'connectionWatcher' functionality (#286)

## 0.5.6
- [FIXED] Fixes for thermostat support
## 0.5.5
- [FIXED] Fixes for group members defined by name (#260)
- [FIXED] Fixes for removing or renaming accessories
- [ENHANCED] Optimize getting hub id on startup
## 0.5.4-3
- [DEBUG] Additional debugging for setting thermostat temp/mode
## 0.5.4-2
- [FIXED] Fix for setting thermostat mode
- [ENHANCED] Additional debugging for temp setting
## 0.5.4-1
- [FIXED] Fix for temperature units
## 0.5.4
- [NEW] Initial support for thermostat (#267)
## 0.5.3
- [FIXED] Fix for fanlinc issue (#278)
## 0.5.1
- [FIXED] Fix crash from specifying refresh interval (#272)
- [FIXED] Restore `setTargetKeypadBtn` (#273)
## 0.5.0
- [NEW] Complete refactor to more modern, dynamic platform
- [NEW] Merge PR from @microbmen to add fan control/status to the express server (#223)
- [FIXED] Address issue with groupMember logic (#260)
## 0.4.28
- [NEW] Automated device discovery/addition to config
- [REMOVE] Remove config.json editing gui from main page in favor of homebridge/hoobs ui and above auto-discovery/addition
- [FIXED] Fix crash when groupMembers contain a period in the device id (#239)
## 0.4.27
- [FIXED] Fix stupid error in logging :(
## 0.4.26
- [FIXED] Fix restart issues on HOOBS
- [FIXED] Better error handling for `getHubInfo`
- [ENHANCED] Address 'max listeners' message
## 0.4.25
- [FIXED] Add outlet position to schema.
- [NEW] Hub info automatically discovered in ui (no longer need to get hub info).
- [FIXED] Fix ui when no devices are defined in config.
## 0.4.24
- [FIXED] Quick fixes to prevent empty model/devices array and improve configuration.
## 0.4.23
- [FIXED] Fix status for keypads with attached load (#185)
## 0.4.22
- [FIXED] Fix debounce logic when using Siri.
## 0.4.21
- [FIXED] Fixes for configuration via homebrudge ui.
## 0.4.20
- [FIXED] Enable connection to Hub and load of Insteon UI even if no devices are defined in config.
- [NEW] Merge PR from @donavanbecker: Allow easy homebridge config UI setup (#152)
- [ENHANCED] Readme updates courtesy of @calorian
## 0.4.19
- [FIXED] Remove npm-shrinkwrap; no longer required with updates to `home-controller` dependencies
- [NEW] Merge PRs from @mikeypdev: fix for groupMembers (#147), expand groupMembers to switches/dimmers (#149), add 'momentary' property for scene configurations (#148)
## 0.4.18
- [FIXED] Fix warning from 'set' handlers (#136)
- [NEW] Add invert sensor option for door/window/contact sensors (#134)
## 0.4.17

- [FIXED] Fix crash when devices array not in config (#77)
- [NEW] Initial support for X10 devices (#119)
- [NEW] Added ability to disable battery monitoring (#123)
## 0.4.16

- [FIXED] Fix crash when no devices defined (#77)
- [FIXED] Fix dimmer/switch/fan status check on every hub reconnect (#127)
## 0.4.15

- [FIXED] Fix fan light status in eventListener (#102)
## 0.4.14

- [ENHANCED] Update eventListener to better capture off status events (#110)

## 0.4.13

- [FIXED] Fix for 'no response' from garage door (thanks to @THX723) (#97)
- [ENHANCED] Add ability to create a simple scene in the config (thanks to @THX723) - see example here: https://github.com/kuestess/homebridge-platform-insteonlocal/pull/103 (#101)

## 0.4.12

- [NEW] Added 'disabled' feature (#89)
- [ENHANCED] Dimmer/lightbulb devices are automatically set to dimmable, no need to specify in the config (#76)

## 0.4.11

- [NEW] Initial support for four-button remotes
- [NEW] Added changelog
- [ENHANCED] Improved quick start for InsteonUI
