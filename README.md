# homebridge-platform-insteonlocal
Homebridge platform plugin for local Insteon control

See example config.json for configuration instructions.

Implements local control of Insteon devices (switches or dimmers only for now) via Homebridge.  Devices are not yet auto-discovered and must be defined in config.json (see example).  Unfortunately, currently only works with a single device because of the ridiculous way that the Insteon hub provides power/brightness status.  Accepting PRs if anyone has a better way to support multiple devices.
