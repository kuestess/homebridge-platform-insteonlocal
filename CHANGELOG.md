# Changelog

All notable changes to this project will be documented in this file.
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
