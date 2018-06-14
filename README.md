# homebridge-platform-insteonlocal
Homebridge platform plugin for local Insteon control

Overview
--------
Implements local control of Insteon devices including switches, dimmers, scenes, iolincs (configured as a garage door), motion sensors, and leak sensors via Homebridge. Leverages [home-controller](https://github.com/automategreen/home-controller) to enable control and status of multiple Insteon devices.  Supports both Insteon Hub 2242 and 2245.

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

The Express serve is now optional and can be disabled if desired.

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
  - `deviceID`: Insteon ID with no spaces or dividers
  - `groupID`:  Insteon group ID for a scene
  - `keypadbtn`: Keypad button to check for status of a scene, in caps (8-key models only)
  - `dimmable`:  dimmable or non-dimming device - valid values are "yes" or "no"
  - `deviceType`:  valid values include 'lightbulb', 'dimmer', 'switch', 'scene', 'iolinc', 'motionsensor', 'leaksensor', and 'fan'.  Please note that fan/fanlinc support is untested.

**Scene config changes in 0.3.2 and later**

Scenes remain on/off only, and now support status when controlled via a Keypadlinc.  When defining a scene, the `deviceID` is the Insteon ID of a keypad that controls the scene and `keypadbtn` is then button that indicates the status of the scene.  The `groupID` parameter is now the group number in the Insteon app (Scenes->Edit Scene->Group Number).

Fan support in version 0.3.3 is untested so I appreciate any feedback on its use.  To configure fanlinc support, use the 'fan' device type.  This will create a fan device only - you can add a separate entry in your config (using the same `deviceID`) to add the light as a device.

For iolinc devices, there is an additional parameter that can be defined:

- `gdo_delay`: number of seconds before status of the sensor is checked when opening/closing the door (ie, how long does it take the door to open/close) [default = 15]

Using The HubPro Model 2243 (Alpha)
-----------------------------------

It is possible to use the official Insteon HubPro as a complete homebride server and Insteon Hub. This requires flashing the HubPro and installing homebridge as normal. Inside the HubPro is a BeagleBoard Black Computer and a Power Line Modem connected via a serial connection.

1. Follow the intructions here http://beagleboard.org/getting-started to create an microSD card with latest board software
2. Open the HubPro removing the 6 screwes on the bottom.
3. Insert the SD Card.
4. While holding down the Boot Button "S2" connect the power. Don't elecute your self. Wait until the LED starts flashing.
5. You should be able to connect via SSH now (username is 'debian' and the password is 'temppwd').
6. Change the password!
7. Enable the serial port by editing /boot/uEnv.txt

Add:
```
cape_disable=bone_capemgr.disable_partno=BB-BONELT-HDMI,BB-BONELT-HDMIN
cape_enable=bone_capemgr.enable_partno=BB-UART1,BB-UART2,BB-UART4.BB-UART5
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


TODO

- How to always start up off the SD or flash the eMMC
