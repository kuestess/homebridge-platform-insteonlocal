# homebridge-platform-insteonlocal
Homebridge platform plugin for local Insteon control

Overview
--------
Implements local control of Insteon devices (switches or dimmers only for now) via Homebridge. Leverages [home-controller](https://github.com/automategreen/home-controller) to enable control and status of multiple Insteon devices.  Supports both Insteon Hub 2242 and 2245.

This plugin leverages two mechanisms to get device status - an event listener and periodic polling.  The event listener will listen for events on the Insteon network and automatically update device status in Homebridge.  It will only capture manual events (ie, manually pushing a switch) and not events triggered by other apps or devices (ie, Amazon Echo).  To work around this limitation, the plugin will also periodically poll for the status of configured devices (see configuration below).

Devices are not yet auto-discovered and must be defined in config.json (see configuration example)

Local Express Server
--------------------
This plugin will set up a local [Express](https://expressjs.com) server at the port specified in your config.json (see below) that can also be accessed via a browser to get or manipulate Insteon device status and view hub or device information. Endpoints for the Express sever include:

 - `/light/[id]/on`:  turn on the light with Insteon [id]
 - `/light/[id]/off`:  turn off the light with Insteon [id]
 - `/light/[id]/status`:  get status of the light with Insteon [id]
 - `/light/[id]/level/[targetlevel]`:  set brightness of the light with Insteon [id] to [targetlevel]
 - `/links`:  get all links from your Insteon Hub
 - `/links/[id]`:  get links for device with Insteon [id]
 - `/info/[id]`:  get info for device with Insteon [id]

### Install

Clone the repository, cd into the cloned directory and install using npm:

`npm -g install`

Configuration
-------------
Edit the config.json (see example) to fit your installation - configuration parameters are:
  - `user`:  username from Insteon app
  - `pass`:  password from Insteon app
  - `host`:  local IP of your Insteon hub
  - `port`:  port from Insteon app
  - `model`: model number of your hub.  Valid values are 2242 or 2245
  - `refresh`: device status refresh interval in seconds (set to 0 for no refresh)
  - `server_port`: port for local Express server

Devices are also defined in the config.json as follows:
  - `name`:  Device name as you want it to appear in Homebridge
  - `deviceID`:  Insteon ID with no spaces or dividers
  - `dimmable`:  dimmable or non-dimming device - valid values are "yes" or "no"
  - `deviceType`:  "lightbulb" for all devices (for now)
