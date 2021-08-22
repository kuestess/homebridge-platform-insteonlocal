# Changelog

All notable changes to this project will be documented in this file.

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