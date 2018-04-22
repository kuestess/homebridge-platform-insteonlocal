'use strict'
var request = require('request')
var _ = require('underscore')
var Insteon = require('home-controller').Insteon
var hub = new Insteon()
var moment = require('moment')
var util = require('util')
var express = require('express')
var app = express()

var Accessory, Service, Characteristic, UUIDGen
var links = []
var accessories = []

var platform = InsteonLocalPlatform

module.exports = function(homebridge) {
        console.log("homebridge API version: " + homebridge.version)

        Accessory = homebridge.platformAccessory
        Service = homebridge.hap.Service
        Characteristic = homebridge.hap.Characteristic
        UUIDGen = homebridge.hap.uuid
        homebridge.registerPlatform("homebridge-platform-insteonlocal", "InsteonLocal", InsteonLocalPlatform)
    }

function InsteonLocalPlatform(log, config, api) {
    var self = this
    var platform = this

    self.config = config
    self.log = log
    self.host = config["host"]
    self.port = config["port"]
    self.user = config["user"]
    self.pass = config["pass"]
    self.model = config["model"]
    self.devices = config["devices"]
    self.refreshInterval = config["refresh"]
    self.server_port = config["server_port"]
    self.use_express = config["use_express"] || true

    var config = {
        host: self.host,
        port: self.port,
        user: self.user,
        password: self.pass
    }

    app.get('/light/:id/on', function(req, res) {
        var id = req.params.id
        hub.light(id).turnOn().then(function(status) {
            if (status.response) {
                res.sendStatus(200)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.get('/light/:id/off', function(req, res) {
        var id = req.params.id
        hub.light(id).turnOff().then(function(status) {
            if (status.response) {
                res.sendStatus(200)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.get('/light/:id/status', function(req, res) {
        var id = req.params.id
        hub.light(id).level(function(err, level) {
            res.json({
                "level": level
            })
        })
    })

    app.get('/light/:id/level/:targetLevel', function(req, res) {
        var id = req.params.id
        var targetLevel = req.params.targetLevel

        hub.light(id).level(targetLevel).then(function(status) {
            if (status.response) {
                res.sendStatus(200)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.get('/scene/:group/on', function(req, res) {
        var group = parseInt(req.params.group)
        hub.sceneOn(group).then(function(status) {
            if (status.aborted) {
                res.sendStatus(404)
            } 
            if (status.completed) {
                res.sendStatus(200)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.get('/scene/:group/off', function(req, res) {
        var group = parseInt(req.params.group)
        hub.sceneOff(group).then(function(status) {
            if (status.aborted) {
                res.sendStatus(404)
            } 
            if (status.completed) {
                res.sendStatus(200)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.get('/links', function(req, res) {
        hub.links(function(err, links) {
            res.json(links)
        })
    })

    app.get('/links/:id', function(req, res) {
        var id = req.params.id
        hub.links(id, function(err, links) {
            res.json(links)
        })
    })

    app.get('/info/:id', function(req, res) {
        var id = req.params.id
        hub.info(id, function(err, info) {
            res.json(info)
        })
    })

    app.get('/iolinc/:id/relay_on', function(req, res) {
        var id = req.params.id
        hub.ioLinc(id).relayOn().then(function(status) {
            if (status.response) {
                res.sendStatus(200)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.get('/iolinc/:id/relay_off', function(req, res) {
        var id = req.params.id
        hub.ioLinc(id).relayOff().then(function(status) {
            if (status.response) {
                res.sendStatus(200)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.get('/iolinc/:id/sensor_status', function(req, res) {
        var id = req.params.id
        hub.ioLinc(id).status(function(err, status) {
            res.json(status.sensor)
        })
    })

    app.get('/iolinc/:id/relay_status', function(req, res) {
        var id = req.params.id
        hub.ioLinc(id).status(function(err, status) {
            res.json(status.relay)
        })
    })
    
    self.deviceIDs = []

    for (var i = 0; i < self.devices.length; i++) {
        self.deviceIDs.push(self.devices[i].deviceID)
    }
	
    if (self.model == "2245") {
        hub.httpClient(config, function(had_error) {
            console.log('Connected to Insteon Hub...')
            hub.emit('connect')
            eventListener()
            if(self.use_express){
            	app.listen(self.server_port)
            }
        })
    } else {
        hub.connect(self.host, function() {
            console.log('Connected to Insteon Hub...')
            hub.emit('connect')
            eventListener()
            if(self.use_express){
            	app.listen(self.server_port)
            }
        })
    }
    
    function eventListener() {
        var deviceIDs = platform.deviceIDs

        self.log('Insteon event listener started')
		
        hub.on('command', function(data) {
            var info = JSON.stringify(data)
            var id = data.standard.id
            var command1 = data.standard.command1
            var command2 = data.standard.command2

            var isDevice = _.contains(deviceIDs, id, 0)

            if (isDevice) {
                var foundDevice = accessories.filter(function(item) {
                    return item.id == id
                })

                foundDevice = foundDevice[0]

                self.log.debug('Got event for ' + foundDevice.name)
                self.log.debug('Hub command: ' + info)

                switch (foundDevice.deviceType) {
                case ('lightbulb' || 'switch'):

                    if (command1 == 19 || command1 == 3 || command1 == 0) { //19 = status
						var level_int = parseInt(command2, 16) * (100 / 255)
						var level = Math.ceil(level_int)

						self.log('Got updated status for ' + foundDevice.name)

						if (foundDevice.dimmable) {
							foundDevice.service.getCharacteristic(Characteristic.Brightness).updateValue(level)
							foundDevice.level = level
						}
						
						if(level > 0){
							foundDevice.currentState = true
						} else {
							foundDevice.currentState = false
						}
						
						foundDevice.service.getCharacteristic(Characteristic.On).updateValue(foundDevice.currentState)
						foundDevice.lastUpdate = moment()
                    }
                    
                    break

                case 'iolinc':
                    if (command1 == 11 || command1 == 13) {
                        setTimeout(function() {
                            foundDevice.getSensorStatus.call(foundDevice)
                        }, 1000 * foundDevice.gdo_delay)
                    }
                    break
                }
            }
        })
    }
}

InsteonLocalPlatform.prototype.accessories = function(callback) {
    var self = this
    var numberDevices = self.devices.length

    console.log('Found %s devices in config', numberDevices)

    self.foundAccessories = []

    self.devices.forEach(function(device) {
        var accessory = new InsteonLocalAccessory(self, device)
        self.foundAccessories.push(accessory)
    })

    callback(self.foundAccessories)
}

InsteonLocalPlatform.prototype.getDevices = function(callback) {
    var self = this
    var myURL = "http://127.0.0.1:" + self.server_port + "/links"

    request.get(myURL, function(error, response, body) {
        var obj = JSON.parse(body)

        obj.forEach(function(link) {
            if (link !== null) {
                links.push(link.id)
            }
        })

        links = links.filter(function(item, index, inputArray) {
            return inputArray.indexOf(item) == index
        })

        console.log('Insteon device IDs:' + JSON.stringify(links))
        console.log('Number links: ' + links.length)

        links.forEach(function(link) {
            self.getInfo(link, function(device) {
                if (device !== null) {
                    self.devices.push(device)
                    console.log('Adding device: ' + JSON.stringify(device))
                    console.log('Number devices:' + self.devices.length)
                }
            })
        })
    })
    callback()
}

InsteonLocalPlatform.prototype.getInfo = function(id, callback) {
    var self = this
    var myURL = "http://127.0.0.1:" + self.server_port + "/info/" + id

    request.get(myURL, function(error, response, body) {
        var device = JSON.parse(body)
        callback(device)
    })
}

InsteonLocalAccessory.prototype.pollStatus = function() {
    var self = this
    var now = moment()
    var lastUpdate = self.lastUpdate
    var delta = now.diff(lastUpdate, 'seconds')

    if (delta < self.refreshInterval) {
        clearTimeout(self.pollTimer)
        self.pollTimer = setTimeout(function() {
            self.pollStatus.call(self)
        }, 1000 * (self.refreshInterval - delta))
    } else {
        console.log('Polling status for ' + self.name + '...')

        switch (self.deviceType) {
        case ('lightbulb' || 'dimmer'):
            self.getStatus.call(self)

            setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
            break

        case ('switch'):
            self.getStatus.call(self)
            setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
            break

        case ('iolinc'):
            self.getSensorStatus.call(self)            
            setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
            break
        } 
    }
}

InsteonLocalAccessory.prototype.setPowerState = function(state, callback) {
    var powerOn = state ? "on" : "off"
    var self = this
	
    if (state !== self.currentState) {
            self.log("Setting power state of " + self.name + " to " + powerOn)
			if (state) {
				self.light.turnOn().then(function(status) {
					if (status.success) {
							if (self.dimmable) {
								self.service.getCharacteristic(Characteristic.Brightness).updateValue(100)
							}
							self.level = 100
							self.service.getCharacteristic(Characteristic.On).updateValue(true)
							self.currentState = true
							self.lastUpdate = moment()
						
							if (typeof callback !== 'undefined') {
								callback(null, self.currentState)
								return
							} else {
								return
							}       
					} else {
						self.log("Error setting power state of " + self.name + " to " + powerOn)
						if (typeof callback !== 'undefined') {
							callback(error, null)
							return
						} else {
							return
						}
					}
				})
			} else {
				self.light.turnOff().then(function(status) {
					if (status.success) {
							if (self.dimmable) {
								self.service.getCharacteristic(Characteristic.Brightness).updateValue(0)
							}
							self.level = 0
							self.service.getCharacteristic(Characteristic.On).updateValue(false)
							self.currentState = false
							self.lastUpdate = moment()
						
							if (typeof callback !== 'undefined') {
								callback(null, self.currentState)
								return
							} else {
								return
							}       
					} else {
						self.log("Error setting power state of " + self.name + " to " + powerOn)
						if (typeof callback !== 'undefined') {
							callback(error, null)
							return
						} else {
							return
						}
					}
				})
			}           
        } else {
			self.currentState = state
			self.lastUpdate = moment()
			if (typeof callback !== 'undefined') {
				callback(null, self.currentState)
				return
			} else {
				return
			}
    }
}

InsteonLocalAccessory.prototype.getPowerState = function(callback) {
    var self = this
	var currentState
	
    self.log('Getting power state for ' + self.name)

    self.light.level(function(err,level) {
		if(err || typeof level == 'undefined'){
			self.log("Error getting power state of " + self.name)
			if (typeof callback !== 'undefined') {
				callback(error, null)
				return
			} else {
				return
			}
		} else {	
			if (level > 0) {
				currentState = true
			} else {
				currentState = false
			}
			
			self.currentState = currentState
			self.level = level
			self.log.debug(self.name + ' is ' + (currentState ? 'on' : 'off'))
			self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
			if (self.dimmable) {
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level)
			}
			self.lastUpdate = moment()
			if (typeof callback !== 'undefined') {
				callback(null, self.currentState)
			} else {
				return
			}
		}
	})       
}

InsteonLocalAccessory.prototype.setBrightnessLevel = function(level, callback) {
    var self = this
	
    hub.cancelPending(self.deviceID)
    
    self.log("Setting level of " + self.name + " to " + level + '%')
    self.light.level(level).then(function(status)
     {    
        if (status.success) {                
            self.level = level
            self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level)

			if (self.level > 0) {
				self.service.getCharacteristic(Characteristic.On).updateValue(true)
				self.currentState = true
			} else if (self.level == 0) {
				self.service.getCharacteristic(Characteristic.On).updateValue(false)
				self.currentState = false
			}
			
			self.log.debug(self.name + ' is ' + (self.currentState ? 'on' : 'off') + ' at ' + level + '%')
			self.lastUpdate = moment()
			
			if (typeof callback !== 'undefined') {
				callback(null, self.level)
			} else {
				return
			}	
        } else {
			self.log("Error setting level of " + self.name)   
            if (typeof callback !== 'undefined') {
                callback(error, null)
                return
            } else {
                return
            }
		}
	})
}

InsteonLocalAccessory.prototype.getBrightnessLevel = function(callback) {
    var self = this
	var currentState
	
    self.log('Getting brightness for ' + self.name)

    self.light.level(function(error, level) {
        if (error || level == null || typeof level == 'undefined') {
            self.log("Error getting level of " + self.name)
            if (typeof callback !== 'undefined') {
                callback(error, null)
                return
            } else {
                return
				}
			} else {	
				if (level > 0) {
					currentState = true
				} else {
					currentState = false
				}
				
				self.currentState = currentState
				self.level = level
				self.log.debug(self.name + ' is at ' + level + '%')
				self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level)
				self.lastUpdate = moment()
				if (typeof callback !== 'undefined') {
					callback(null, self.level)
				} else {
					return
				}	
			}
		})  
}

InsteonLocalAccessory.prototype.getStatus = function() {
    var self = this
	var currentState
	
    self.log('Getting status for ' + self.name)

    self.light.level(function(err,level) {
		if(err || level == null || typeof level == 'undefined'){
			self.log("Error getting power state of " + self.name)
			return
			} else {	
			if (level > 0) {
				currentState = true
			} else {
				currentState = false
			}
			
			self.currentState = currentState
			self.level = level
			self.log.debug(self.name + ' is ' + (currentState ? 'on' : 'off') + ' at ' + level + '%')
			self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
			if (self.dimmable) {
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level)
			}
			self.lastUpdate = moment()
			return
		}
	})       
}

InsteonLocalAccessory.prototype.getSensorStatus = function(callback) {
    var self = this
	
    self.log('Getting sensor state for ' + self.name)

	self.iolinc.status(function(err,status){
		if (err || status == null || typeof status == 'undefined') {			
			if (typeof callback !== 'undefined') {
                callback(error, null)
                return
            } else {
                return
            }
            } else {
				self.currentState = (status.sensor == 'on') ? 1 : 0
				self.log.debug(self.name + ' sensor is ' + status.sensor)
				//Characteristic.CurrentDoorState.OPEN = 0
				//Characteristic.CurrentDoorState.CLOSED = 1
				self.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(self.currentState)
				self.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(self.currentState)

				self.lastUpdate = moment()
				if (typeof callback !== 'undefined') {
					callback(null, status)
				} else {
					return
				}
            }	
	})	
}

InsteonLocalAccessory.prototype.setRelayState = function(state, callback) {
    var self = this
    state = 'on'

    self.log("Setting " + self.name + " relay to " + state)

    self.iolinc.relayOn().then(function(status){
        if (status.success) {
            self.targetState = (self.currentState == 0) ? 1 : 0
            self.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(self.targetState)
            self.log('Setting ' + self.name + 'target state to ' + self.targetState)

            setTimeout(function() {
                self.getSensorStatus(function() {
                    self.lastUpdate = moment()
                    if (typeof callback !== 'undefined') {
                        callback(null, self.targetState)
                    } else {
                        return
                    }
                })
            }, 1000 * self.gdo_delay)
        } else {
        	self.log("Error setting relay state of " + self.name + " to " + state)
        	if (typeof callback !== 'undefined') {
                callback(error, null)
                return
            } else {
                return
            }
        }     
    })
}

InsteonLocalAccessory.prototype.setSceneState = function(state, callback) {
    var self = this
    var powerOn = state ? "on" : "off"
    var groupID = parseInt(self.id)
	
	self.log("Setting power state of " + self.name + " to " + powerOn)
	
	if (state) {
		hub.sceneOn(groupID).then(function(status) {
			if (status.completed) {
					self.level = 100
					self.service.getCharacteristic(Characteristic.On).updateValue(true)
					self.currentState = true
					self.lastUpdate = moment()
			
					if (typeof callback !== 'undefined') {
						callback(null, self.currentState)
						return
					} else {
						return
					}       
			} else {
				self.log("Error setting power state of " + self.name + " to " + powerOn)
				if (typeof callback !== 'undefined') {
					callback(error, null)
					return
				} else {
					return
				}
			}
		})
		} else {
			hub.sceneOff(groupID).then(function(status) {
				if (status.completed) {
						self.level = 0
						self.service.getCharacteristic(Characteristic.On).updateValue(false)
						self.currentState = false
						self.lastUpdate = moment()
			
						if (typeof callback !== 'undefined') {
							callback(null, self.currentState)
							return
						} else {
							return
						}       
				} else {
					self.log("Error setting power state of " + self.name + " to " + powerOn)
					if (typeof callback !== 'undefined') {
						callback(error, null)
						return
					} else {
						return
					}
				}
			})
		}  
}

function InsteonLocalAccessory(platform, device) {
    var self = this

    self.init.call(self, platform, device)

    platform.log.debug('[%s]: found Insteon Device, deviceid=%s', moment().format('YYYYMMDDHHmmss.SSS'), self.id)
    self.reachable = true

    accessories.push(self)
}

InsteonLocalAccessory.prototype.init = function(platform, device) {
    var self = this

    self.platform = platform
    self.log = platform.log
    self.id = device.deviceID
    self.dimmable = (device.dimmable == "yes") ? true : false
    self.currentState = ''
    self.level = ''
    self.name = device.name
    self.deviceType = device.deviceType
    self.reachable = true
    self.lastUpdate = ''
    self.refreshInterval = platform.refreshInterval || 0
    self.server_port = platform.server_port
	
    if (self.deviceType == 'iolinc') {
        self.gdo_delay = device.gdo_delay || 15
    }
    
	if(self.refreshInterval > 0){    
		hub.on('connect',function(){		
			if (self.deviceType == ('lightbulb' || 'dimmer' || 'switch' || 'iolinc')){
				self.pollStatus.call(self)
			} 
		}	
	)}	
}

InsteonLocalAccessory.prototype.getServices = function() {
    var self = this
    var services = []
    var infoService = new Service.AccessoryInformation()
    var deviceMAC = self.id.substr(0, 2) + '.' + self.id.substr(2, 2) + '.' + self.id.substr(4, 2)

    infoService.setCharacteristic(Characteristic.Name, self.DeviceName)
    .setCharacteristic(Characteristic.Manufacturer, 'Insteon')
    .setCharacteristic(Characteristic.Model, 'Insteon')
    .setCharacteristic(Characteristic.SerialNumber, deviceMAC || '')
    .setCharacteristic(Characteristic.FirmwareRevision, self.FirmwareVersion || '')
    .setCharacteristic(Characteristic.HardwareRevision, '')
    services.push(infoService)
	
    switch (self.deviceType) {
    case ('lightbulb' || 'dimmer'):
        self.service = new Service.Lightbulb(self.name)

        self.service.getCharacteristic(Characteristic.On).on('set', self.setPowerState.bind(self))
        
        if (self.dimmable) {
            self.service.getCharacteristic(Characteristic.Brightness).on('set', self.setBrightnessLevel.bind(self))
        }
		
		self.light = hub.light(self.id)
		self.light.emitOnAck = true
		
		self.light.on('turnOn', function(group, level){		
			self.log.debug(self.name + ' turned on to ' + level + '%')
			self.service.getCharacteristic(Characteristic.On).updateValue(true)
			if (self.dimmable) {
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(level)
			}
		})
		
		self.light.on('turnOff', function(){
			self.log.debug(self.name + ' turned off')
			self.service.getCharacteristic(Characteristic.On).updateValue(false)
			if (self.dimmable) {
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(0)
			}
		})
		
		if (self.dimmable) {
			self.light.on('brightened', function(){
				self.log.debug(self.name + ' brightened')
				self.getBrightnessLevel.call(self)
			})
		
			self.light.on('dimmed', function(){
				self.log.debug(self.name + ' dimmed')
				self.getBrightnessLevel.call(self)
			})
		}
		
		//Get initial state
        hub.on('connect', function() {
            self.getStatus.call(self)
        })

        break

    case ('switch'):
        self.service = new Service.Switch(self.name)

        self.service.getCharacteristic(Characteristic.On).on('set', self.setPowerState.bind(self))
		
		self.light = hub.light(self.id)
		self.light.emitOnAck = true
		
		self.light.on('turnOn', function(group, level){		
			self.log.debug(self.name + ' turned on to ' + level + ' %')
			self.service.getCharacteristic(Characteristic.On).updateValue(true)
		})
		
		self.light.on('turnOff', function(){
			self.log.debug(self.name + ' turned off')
			self.service.getCharacteristic(Characteristic.On).updateValue(false)
		})
		
        hub.on('connect', function() {
            self.getStatus.call(self)
        })

        break

    case ('scene'):
        self.service = new Service.Switch(self.name)
        self.dimmable = false
		
		self.service.getCharacteristic(Characteristic.On).on('set', self.setSceneState.bind(self))

        break

    case 'iolinc':
        self.service = new Service.GarageDoorOpener(self.name)

        self.service.getCharacteristic(Characteristic.ObstructionDetected).updateValue(false)
        self.service.getCharacteristic(Characteristic.TargetDoorState).on('set', self.setRelayState.bind(self))
		
		self.iolinc = hub.ioLinc(self.id)
		
		self.iolinc.on('sensorOn', function(){		
			self.log.debug(self.name + ' sensor is on')
			self.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(1)
        	self.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(1)
		})
		
		self.iolinc.on('sensorOff', function(){
			self.log.debug(self.name + ' sensor is off')
			self.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(0)
        	self.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(0)
		})
		
        hub.on('connect', function() {
            self.getSensorStatus.call(self)
        })

        break

    case 'leaksensor':
        self.service = new Service.LeakSensor(self.name)
        self.service.getCharacteristic(Characteristic.LeakDetected).updateValue(0) //Initialize as dry
        
        self.leaksensor = hub.leak(self.id)
        
        self.leaksensor.on('wet', function(){		
			self.log.debug(self.name + ' sensor is wet')
			self.service.getCharacteristic(Characteristic.LeakDetected).updateValue(1) //wet
		})
		
		self.leaksensor.on('dry', function(){
			self.log.debug(self.name + ' sensor is dry')
			self.service.getCharacteristic(Characteristic.LeakDetected).updateValue(0) //dry
		})
        
        break

    case 'motionsensor':
        self.service = new Service.MotionSensor(self.name)
        self.service.getCharacteristic(Characteristic.MotionDetected).updateValue(0) //Initialize with no motion
        
        self.motionsensor = hub.motion(self.id)
        
        self.motionsensor.on('motion', function(){		
			self.log.debug(self.name + ' is on')
			self.motionDetected = true
			self.service.getCharacteristic(Characteristic.MotionDetected).updateValue(1)
		})
		
		self.motionsensor.on('clear', function(){
			self.log.debug(self.name + ' is off')
			self.motionDetected = false
			self.service.getCharacteristic(Characteristic.MotionDetected).updateValue(0)
		})
        
        break
    }

    if (self.service) {
        services.push(self.service)
    }
    return services
}
