# homebridge-platform-insteonlocal
Homebridge platform plugin for local Insteon control

Overview
--------
Implements local control of Insteon devices including switches, dimmers, scenes, iolincs (configured as a garage door), motion sensors, and leak sensors via Homebridge. Leverages [home-controller](https://github.com/automategreen/home-controller) to enable control and status of multiple Insteon devices.  Supports both Insteon Hub 2242 and 2245 and now has alpha support for running directly on a Hub Pro (thanks to @rasod).

This plugin provides two mechanisms to get device status - an event listener and periodic polling.  The event listener will listen for events on the Insteon network and automatically update device status in Homebridge.  It will only capture manual events (ie, manually pushing a switch) as well as events triggered by other apps or devices (ie, Amazon Echo).  The plugin also provides a mechanism for periodic polling of the status of configured devices.  This is now disabled by default as the event listener should capture events, but can be enabled if desired (see configuration below).

Devices are not yet auto-discovered and must be defined in config.json (see configuration example)

Local Express Server
--------------------
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

**Now with more npm!**

To install from npm:

`npm -g install homebridge-platform-insteonlocal`

Alternately, clone the repository, cd into the cloned directory and install using npm:

`npm -g install`

Configuration
-------------
Edit the config.json (see example) to fit your installation - configuration parameters are:

  - `user`:  Hub username from Insteon app (Not your Insteon login username.  Go to Settings->House in the Insteon app and use the 'Hub Username' from there.)
  - `pass`:  Hub password from Insteon app (Not your Insteon login password.  Go to Settings->House in the Insteon app and use the 'Hub Password' from there.)
  - `host`:  local IP of your Insteon hub
  - `port`:  port from Insteon app
  - `model`: model number of your hub.  Valid values are 2242, 2245 or 2243 (see below)
  - `refresh`: device status refresh interval in seconds (disabled by default, set to 0 to disable polling)
  - `use_express`: true or false to enable/disable Express server
  - `server_port`: port for local Express server

Devices are also defined in the config.json as follows:

  - `name`:  Device name as you want it to appear in Homebridge
  - `deviceID`: Insteon ID
  - `groupID`:  Insteon group ID for a scene
  - `keypadbtn`: Keypad button to check for status of a scene, in caps.  For a six-button configuration, use 'ON' if the ON/OFF buttons are your scene controller.
  - `dimmable`:  dimmable or non-dimming device - valid values are "yes" or "no"
  - `deviceType`:  valid values include 'lightbulb', 'dimmer', 'switch', 'scene', 'remote', 'iolinc', 'motionsensor', 'leaksensor', 'outlet', and 'fan'.
  - `refresh`:  device-level refresh interval in seconds.  This will override the platform-level refresh value and will still refresh individual devices even if platform-level polling is turned off.

**Scene config changes in 0.3.2 and later**

Scenes:
Scenes remain on/off only and support status when controlled via a Keypadlinc.  Scenes are configured using additional the parameters below:

  - `deviceID`: Insteon ID of a keypad that controls the scene
  - `keypadbtn`: Keypadlinc button that indicates the status of the scene - valid values are 'A' - 'H' 
  - `six_btn`: set to `true` if using a Keypadlinc configured as a 6-button; default is `false`
  - `groupID`: the group number in the Insteon app (Scenes->Edit Scene->Group Number)
  - `groupMembers`: comma-delimited list of Insteon IDs that are part of the group/scene (optional); member device status will be automatically updated after a scene is triggered 

Fanlinc support:
To configure fanlinc support, use the 'fan' device type.  This will create a fan device only - you can add a separate entry in your config (using the same `deviceID`) to add the light as a device.

For iolinc devices, there is an additional parameter that can be defined:

- `gdo_delay`: number of seconds before status of the sensor is checked when opening/closing the door (ie, how long does it take the door to open/close) [default = 15]

Remote support:
Remotes are supported as on/off switches or stateless switches intended to be used in Homekit automation and/or scenes.  Only 8-button mode is supported for now (happy to add 4-button support if someone is willing to test).  Additional parameters that should be used when defining a Remote device are:

- `remotebtn`: Remote button that triggers the switch - valid values are 'A' - 'H'
- `stateless`: Define as a stateless switch - valid values are true or false [default = false]

Outlet support:
On/off outlets are supported with independent control over each outlet (each is defined as an individual device).  Additional parameters that should be used when defining an outlet are:

- `position`: Specify the position of the outlet - valid values are 'top' or 'bottom' [default = top]

Connection Watcher
------------------
The Insteon Hub seems to give up on connections after a certain period of time, resulting in no response or incorrect status in Homekit.  Starting with v0.3.4, a `connectionWatcher` will periodically reset the connection to the Hub.  This is a temporary workaround, but seems to address the issue and create a better experience without having to restart `homebridge`.
The default connection reset duration is 1 hour and can be customized or disabled in you config as follows:

- `keepAlive`: Hub connection reset duration in seconds (default is "3600" [1 hour]).  Set to "0" to disable. 

For model 2242 hubs, the Connection Watcher wil determine if a request is in progress and, if not, close the connection.  This model of hub seems particularly sensitive to connection duration/number of connections, so this will effectively spare connections as much as possible an only create them on-demand.  The downside is that the eventListener will not function (as it requires a persistent connection), however polling will still update device status.

Using The HubPro Model 2243 (Alpha)
-----------------------------------
It is possible to use the official Insteon HubPro as a complete homebride server and Insteon Hub. This requires flashing the HubPro and installing homebridge as normal. Inside the HubPro is a BeagleBoard Black Computer and a Power Line Modem connected via a serial connection.

1. Follow the intructions here http://beagleboard.org/getting-started to create an microSD card with latest board software
2. Open the HubPro removing the 6 screwes on the bottom.
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