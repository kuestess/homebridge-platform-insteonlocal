[![Support via PayPal][paypal-button]][paypal-kuestess]

# homebridge-platform-insteonlocal
Homebridge platform plugin for local Insteon control

See [CHANGELOG][].

[changelog]: CHANGELOG.md

Overview
--------
Implements local control of Insteon devices including switches, dimmers, outlets, fans, blinds, scenes, iolincs (configured as a garage door), motion sensors, door/window sensors, and leak sensors via Homebridge. Leverages [home-controller](https://github.com/automategreen/home-controller) to enable control and status of multiple Insteon devices.  Supports both Insteon Hub 2242 and 2245 and now has beta support for running directly on a Hub Pro (thanks to @rasod).

Devices are not yet auto-discovered and must be defined in config.json (see configuration example)

InsteonUI
---------

Introducing InsteonUI, a new way to manage your Insteon devices and InsteonLocal configuration.  Think of it as 'Houselinc' in a browser.

### InsteonUI Quick Start
Direct your browser to the host that you have Insteonlocal running on and the port configured in your config.json (ie, 127.0.0.1:3000 if running on the local machine).  Before using any of the pages described below, you will need to complete the following steps:

  1. Click on the 'Hub' link.  In the top section of the page, click 'Get Hub Info'.  This pulls information from the Hub, most notably the Insteon ID.
  2. Still on the 'Hub' page, click 'Get Devices/Links' under the action menu.

You should now have devices populated on the 'Devices' page, and be able to link/unlink devices from the Hub, as well as create scenes.

* Config:<br />
Manage your Insteonlocal configuration.  Hub connection parameter settings are managed in the top section, device settings in the bottom.  No changes are made to your config.json until you click save.  To add a device, click the 'Add' button at the bottom of the page.  Configuration is limited to basics until I can figure out a new UI.

* Hub<br />
Information about your Hub.  To start, click 'Get Hub Info'.  Under the 'Action' menu, click 'Get Devices/Links'.  This will discover devices and links from the Hub and populate scenes controlled by the hub.  This must be done before any devices are displayed on the 'Devices' tab.<br /><br />In the 'Links' tab on the Hub page, you can delete a link by clicking the trashcan icon (it wil confirm before deleteing).  Note that this only deletes the link from the Hub and not the corresponding device.  This is useful for deleting half-links from the Hub.

* Devices<br />
If you have already discovered devices from the Hub, you should see a list of devices in the left-hand column.  If not, click 'Get Devices' and the device list should populate after discovery is complete.<br /><br />Once devices are discovered, click on a device in the list.  In the right-hand pane, you can give the device a friendly name (be sure to click 'Save').  Devices that were in your config should already be named (you can change the name here without overwriting your config).  Under the 'Action' menu, you can get links information and links from the device by clicking 'Get Dev Info/Links'.  Depending upon the number of links in the device, this may take some time and is best to do when there is no other Insteon traffic.  If you want to do this for all devices at once, click 'Get All Dev Links' in the top right.  Again, this may take time.

    You can also identify the device by clicking 'Beep' under the 'Action' menu.<br /><br />Three tabs in the bottom part of the page show details for the selected device:
    * Operating Flags: Lists device config parameters (not editable, for now).  The database delta will change anytime a link is modified on a device.  The UI will check this before retrieving links from the device.
    * Links: Lists all links stored in the device database.  You can delete a link by clicking the wastebasket button (there is a confirmation).  Again, this only deletes the link from the selected device and not from any linked devices.  Good for cleaning up half-links.
    * Scenes: Lists all scenes (complete with other responders) that the device participates in.  Level and ramp rate information is only available for devices that you have retrieved information and links for.

* Link<br />
Link/unlink devices from the hub and create scenes.  This is fairly sel-explanatory, but to link/unlink a device, just enter the device id that you wish to link/unlink in the relevant field and click the 'Link' or 'Unlink' button.

To create a scene, select the desired device from the dropdown list and fill out the level, ramp rate, and controller/responder fields.  The group number defaults to 1 for most devices.  For a keypad, the group number corresponds to the button number (ie, A=1, B=2, C=3, etc).  If the Hub is a controller, select an unoccupied group number (one that does not currently have a scene defined) or you will overwrite an existing scene.

All information for your Hub and devices is stored in `insteon.json` saved in your homebridge config directory.  It is fully readable json, and can be viewed in any editor.

## Express Server

This plugin will set up a local [Express](https://expressjs.com) server at the port specified in your config.json (see below) that can also be accessed via a browser to get or manipulate Insteon device status and view hub or device information. Endpoints for the Express sever include:

 - `/light/[id]/on`:  turn on the light with Insteon [id]
 - `/light/[id]/off`:  turn off the light with Insteon [id]
 - `/light/[id]/status`:  get status of the light with Insteon [id]
 - `/light/[id]/level/[targetlevel]`:  set brightness of the light with Insteon [id] to [targetlevel]
 - `/scene/[group]/on`:  turn on the scene with Insteon [group] number
 - `/scene/[group]/off`:  turn off the scene with Insteon [group] number
 - `/iolinc/[id]/relay_on`:  turn on the relay for iolinc with Insteon [id]
 - `/iolinc/[id]/relay_off`:  turn off the relay for iolinc with Insteon [id]
 - `/iolinc/[id]/relay_status`:  get status of the relay for iolinc with Insteon [id]
 - `/iolinc/[id]/sensor_status`:  get status of the sensor for iolinc with Insteon [id]
 - `/links`:  get all links from your Insteon Hub
 - `/links/[id]`:  get links for device with Insteon [id]
 - `/info/[id]`:  get info for device with Insteon [id]

The Express server is now optional and can be disabled if desired.

## Install

To install from npm:

`npm -g install homebridge-platform-insteonlocal`

Alternately, clone the repository, cd into the cloned directory and install using npm:

`npm -g install`

Configuration
-------------
Edit the config.json (see example) to fit your installation - configuration parameters are:

  - `user`:  Hub username from Insteon app (Not your Insteon login username.  Go to Settings->House in the Insteon app and use the 'Hub Username' from there.)
  - `pass`:  Hub password from Insteon app (Not your Insteon login password.  Go to Settings->House in the Insteon app and use the 'Hub Password' from there.)
  - `host`:  local IP of your Insteon hub or device path of your Insteon PLM
  - `port`:  port from Insteon app
  - `model`: model number of your hub.  Valid values are 2242, 2245, 2243, or PLM
  - `refresh`: device status refresh interval in seconds (disabled by default, set to 0 to disable polling)
  - `use_express`: true or false to enable/disable Express server
  - `server_port`: port for local Express server



Devices are also defined in the config.json as follows:

  - `name`:  Device name as you want it to appear in Homebridge
  - `deviceID`: Insteon ID
  - `groupID`:  Insteon group ID for a scene
  - `keypadbtn`: Keypad button to check for status of a scene, in caps.  For a six-button configuration, use 'ON' if the ON/OFF buttons are your scene controller.
  - `dimmable`:  dimmable or non-dimming device - valid values are "yes" or "no".  This is automatically set to 'yes' for dimmer/lightbulb device types.
  - `deviceType`:  valid values include 'lightbulb', 'dimmer', 'switch', 'scene', 'remote', 'iolinc', 'motionsensor', 'leaksensor', 'doorsensor', 'outlet', 'keypad', 'shades', 'blinds', 'smoke', and 'fan'.
  - `refresh`:  device-level refresh interval in seconds.  This will override the platform-level refresh value and will still refresh individual devices even if platform-level polling is turned off.
  - `controllers`: this is an array `["<Insteon ID>","<Insteon ID>"]` of other Insteon devices that this device is controlled by. ie if you have a plug in dimmer that is controlled by a wall switch you would add the wall switch ID as a controller for the plug in dimmer. The controller device does not need to be a device listed in the config.json
  - `targetKeypadID`: this is an array `["<Insteon ID>","<Insteon ID>"]` of Insteon keypad(s), whose scene button LED you would like to set accoridngly to the state of the device. See additional notes below on Target Keypad LED.
  - `targetKeypadBtn`: this is an array `["button_letter","button_letter"]` of Insteon keypad button(s), 'A' - 'H', that corresponds to the array from `targetKeypadID`. See additional notes below on Target Keypad LED.
  - `targetKeypadSixBtn`: this is an array `[true/false, true/false]` of Insteon keypad button layout, that corresponds to the array from `targetKeypadID`. `true` denote a 6-button keypad, while `false` denotes an 8-button keypad. See additional notes below on Target Keypad LED.
  - `disabled`: set to true to disable Insteon communication for a device (defaults to false).  Device will still appear in Home (or other apps), but can't be controlled.  Good to use for 'seasonal' devices.
  - `groupMembers`: comma-delimited list of Insteon IDs that are linked to this device (optional, for devices with on/off states like dimmers and switches); member device status will be automatically updated after the device is turned on or off

Battery operated devices: Battery status is monitored for battery operated devices (leak, motion, door/window sensors) and will alert when the device sends a low battery signal.  The heartbeat for those devices is also monitored (sent from device every 24 hours).  You will also receive a low battery alert if no heartbeat is received within 24 hours.

Scenes:
Scenes remain on/off only and support status when controlled via a Keypadlinc.  Scenes are configured using additional the parameters below:

  - `deviceID`: Insteon ID of a keypad that controls the scene
  - `keypadbtn`: Keypadlinc button that indicates the status of the scene - valid values are 'A' - 'H'
  - `six_btn`: set to `true` if using a Keypadlinc configured as a 6-button; default is `false`
  - `groupID`: the group number in the Insteon app (Scenes->Edit Scene->Group Number)
  - `groupMembers`: comma-delimited list of Insteon IDs that are part of the group/scene (optional); member device status will be automatically updated after a scene is triggered
  - `momentary`: since hub-based scenes do not support status, you can set this to `true` to make a scene 'stateless'. This will allow you to re-trigger the scene or run a different scene on the same devices without having to turn the scene `off` first. 

Target Keypad LED:
By Insteon's design, keypad (scene button) LED follows the state of a linked scene only; it does not act according to the device state itself. eg. Turn on `scene 1` then the corresponding keypad LED lights up, but turning on `Light 1` directly will not light up the keypad LED.
This enhancement allows you to specify which keypad LED(s) to set according to the device state; effetively turning keypad buttons into true device status indicators that many had wished for.
For the following example, when `Light 1` "XXYYZZ" is turned on (or at any dim level), button "A" of the 6-button keypad "AABBCC" is lit up, as do button "D" of the 8-button keypad "BBCCDD".
  ```
  "name" : "Light 1",
  "deviceID" : "XXYYZZ",
  "targetKeypadID" : [ "AABBCC", "BBCCDD" ],
  "targetKeypadBtn" : [ "A", "D" ],
  "targetKeypadSixBtn" : [ true, false ]
  ```

Fanlinc support:
To configure fanlinc support, use the 'fan' device type.  This will create a fan device only - you can add a separate entry in your config (using the same `deviceID`) to add the light as a device.

In addition to scenes as described above, keypads are supported as on/off switches intended to be used in Homekit automation and/or scenes.

- `keypadbtn`: keypad button to use as the trigger
- `six_btn`: set to `true` if using a Keypadlinc configured as a 6-button; default is `false`

For iolinc devices, there is an additional parameter that can be defined:

- `gdo_delay`: number of seconds before status of the garage door is updated. This delay should be configured to closely approximate the time it takes the garage door to fully close (if `invert_sensor` = false) or fully open (if `invert_sensor` = true). [default = 15]
- `invert_sensor`: set to true if your iolinc sensor is inverted, ie off when closed and on when open. [default = false]

Remote support:
Remotes are supported as on/off switches or stateless switches intended to be used in Homekit automation and/or scenes.  Both 8-button and 4-button remotes are supported.  Additional parameters that should be used when defining a Remote device are:

- `remotebtn`: Remote button that triggers the switch - valid values are 'A' - 'H'
- `stateless`: Define as a stateless switch - valid values are true or false [default = false]
- `four_btn`: set to `true` for 4-button remotes [default = false]

Outlet support:
On/off outlets are supported with independent control over each outlet (each is defined as an individual device).  Additional parameters that should be used when defining an outlet are:

- `position`: Specify the position of the outlet - valid values are 'top' or 'bottom' [default = top]

Battery operated devices:
Low battery levels are reported periodically by the device and by default are shown in the Home app UI.  To disable low battery reporting, use the optional configuration parameter below.  This should be set at the individual device level.  Even with low battery status disabled, you will still get a low battery alert in the Home app if two heartbeat messages from the device are missed (takes ~2 days), likely indicating a dead device.

- `disableBatteryStatus`: default false; set to true to disable low battery reporting.

Contact sensors:
- `invert_sensor`: set to true to invert the sensor status, ie off when closed and on when open. [default = false]

Connection Watcher
------------------
The Insteon Hub seems to give up on connections after a certain period of time, resulting in no response or incorrect status in Homekit.  Starting with v0.3.4, a `connectionWatcher` will periodically reset the connection to the Hub.  This is a temporary workaround, but seems to address the issue and create a better experience without having to restart `homebridge`.
The default connection reset duration is 1 hour and can be customized or disabled in you config as follows:

- `keepAlive`: Hub connection reset duration in seconds (default is "3600" [1 hour]).  Set to "0" to disable.

For model 2242 hubs, the Connection Watcher wil determine if a request is in progress and, if not, close the connection.  This model of hub seems particularly sensitive to connection duration/number of connections, so this will effectively spare connections as much as possible an only create them on-demand.  The downside is that the eventListener will not function (as it requires a persistent connection), however polling will still update device status.

Using The HubPro Model 2243 (Beta)
-----------------------------------
It is possible to use the official Insteon HubPro as a complete homebridge server and Insteon Hub. This requires flashing the HubPro and installing homebridge as normal. Inside the HubPro is a BeagleBoard Black Computer and a Power Line Modem connected via a serial connection.

1. Follow the intructions here http://beagleboard.org/getting-started to create an microSD card with latest board software
2. Open the HubPro removing the 6 screws on the bottom.
3. Insert the SD Card.
4. While holding down the Boot Button "S2" connect the power. Don't electrocute yourself. Wait until the LED starts flashing.
5. You should be able to connect via SSH now (username is 'debian' and the password is 'temppwd').
6. Change the password!
7. Enable the serial port by editing /boot/uEnv.txt

Add:
```
cape_disable=bone_capemgr.disable_partno=BB-BONELT-HDMI,BB-BONELT-HDMIN
cape_enable=bone_capemgr.enable_partno=BB-UART1,BB-UART2,BB-UART4,BB-UART5
```

Enable:
```
###Overide capes with eeprom
uboot_overlay_addr0=/lib/firmware/BB-UART1-00A0.dtbo
uboot_overlay_addr1=/lib/firmware/BB-UART2-00A0.dtbo
uboot_overlay_addr2=/lib/firmware/BB-UART4-00A0.dtbo
uboot_overlay_addr3=/lib/firmware/BB-UART5-00A0.dtbo
```

8. Reboot and log back in (same as step 4 & 5)
9. Install homebridge and this plug as usual seting the model in config.json to 2243

Donate
-----------------------------------
If you find this plugin useful you may make a donation using the button below.  Donations are not expected, but appreciated!

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=AP4SUF96E39GU)

[paypal-button]: https://img.shields.io/badge/Donate-PayPal-green.svg
[paypal-kuestess]: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=AP4SUF96E39GU
