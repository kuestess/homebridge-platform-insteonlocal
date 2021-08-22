'use strict'
var request = require('request')
var _ = require('underscore')
var Insteon = require('home-controller').Insteon
var hub = new Insteon()
var moment = require('moment')
var util = require('util')
var express = require('express')
var app = express()
var InsteonUI = require('./insteon-ui.js')
var ui

var Accessory, Service, Characteristic, UUIDGen
var links = []
var accessories = []
var connectedToHub = false
var connectingToHub = false
var inUse = true
var express_init = false
var eventListener_init = false
var configPath

var platform = InsteonLocalPlatform

module.exports = function(homebridge) {
	console.log('homebridge API version: ' + homebridge.version)

	Accessory = homebridge.platformAccessory
	Service = homebridge.hap.Service
	Characteristic = homebridge.hap.Characteristic
	UUIDGen = homebridge.hap.uuid
	homebridge.registerPlatform('homebridge-platform-insteonlocal', 'InsteonLocal', InsteonLocalPlatform)
	configPath = homebridge.user.configPath()
}

function InsteonLocalPlatform(log, config, api) {
	var self = this
	var platform = this

	self.config = config
	self.log = log
	self.host = config['host']
	self.port = config['port']
	self.user = config['user']
	self.pass = config['pass']
	self.model = config['model']
	self.devices = config['devices']
	self.server_port = config['server_port'] || 3000
	self.use_express = config.hasOwnProperty('use_express') ? config['use_express'] : true
	self.keepAlive = config['keepAlive'] || 3600
	self.checkInterval = config['checkInterval'] || 20

	//InsteonUI
	ui = new InsteonUI(configPath, hub)

	if (self.model == '2242') {
		self.refreshInterval = config['refresh'] || 300
	} else {
		self.refreshInterval = config['refresh'] || 0
	}

	self.hubConfig = {
		host: self.host,
		port: self.port,
		user: self.user,
		password: self.pass
	}

	app.get('/light/:id/on', function(req, res) {
		var id = req.params.id.toUpperCase()
		hub.light(id).turnOn().then(function(status) {
			if (status.response) {
				res.sendStatus(200)

				var isDevice = _.contains(self.deviceIDs, id, 0)

				if (isDevice) {
					var foundDevice = accessories.filter(function(item) {
						return item.id == id
					})
				}

				foundDevice = foundDevice[0]
				setTimeout(function(){foundDevice.getStatus.call(foundDevice)},1000)

			} else {
				res.sendStatus(404)
			}
		})
	})

	app.get('/light/:id/off', function(req, res) {
		var id = req.params.id.toUpperCase()
		hub.light(id).turnOff().then(function(status) {
			if (status.response) {
				res.sendStatus(200)

				var isDevice = _.contains(self.deviceIDs, id, 0)

				if (isDevice) {
					var foundDevice = accessories.filter(function(item) {
						return item.id == id
					})
				}

				foundDevice = foundDevice[0]
				foundDevice.getStatus.call(foundDevice)

			} else {
				res.sendStatus(404)
			}
		})
	})

	app.get('/light/:id/status', function(req, res) {
		var id = req.params.id
		hub.light(id).level(function(err, level) {
			res.json({
				'level': level
			})
		})
	})

	app.get('/light/:id/level/:targetLevel', function(req, res) {
		var id = req.params.id
		var targetLevel = req.params.targetLevel

		hub.light(id).level(targetLevel).then(function(status) {
			if (status.response) {
				res.sendStatus(200)

				var isDevice = _.contains(self.deviceIDs, id, 0)

				if (isDevice) {
					var foundDevice = accessories.filter(function(item) {
						return item.id == id
					})
				}

				foundDevice = foundDevice[0]
				foundDevice.getStatus.call(foundDevice)

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

				var isDevice = _.contains(self.deviceIDs, id, 0)

				if (isDevice) {
					var foundDevice = accessories.filter(function(item) {
						return item.id == id
					})
				}

				foundDevice = foundDevice[0]
				foundDevice.getSceneState.call(foundDevice)

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

				var isDevice = _.contains(self.deviceIDs, id, 0)

				if (isDevice) {
					var foundDevice = accessories.filter(function(item) {
						return item.id == id
					})
				}

				foundDevice = foundDevice[0]
				foundDevice.getSceneState.call(foundDevice)

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

				var isDevice = _.contains(self.deviceIDs, id, 0)

				if (isDevice) {
					var foundDevice = accessories.filter(function(item) {
						return item.id == id
					})
				}

				foundDevice = foundDevice[0]

				setTimeout(function() {
					foundDevice.getSensorStatus.call(foundDevice)
				}, 1000 * foundDevice.gdo_delay)

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

				var isDevice = _.contains(self.deviceIDs, id, 0)

				if (isDevice) {
					var foundDevice = accessories.filter(function(item) {
						return item.id == id
					})
				}

				foundDevice = foundDevice[0]

				setTimeout(function() {
					foundDevice.getSensorStatus.call(foundDevice)
				}, 1000 * foundDevice.gdo_delay)

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

	//InsteonUI
	app.use('/', ui.handleRequest)

	self.deviceIDs = []

	if (typeof self.devices == 'undefined'){
		self.devices = []
	}

	if(self.devices.length > 0){//check to see if devices is empty in config
		for (var i = 0; i < self.devices.length; i++) {
			if(self.devices[i].deviceID){
				if(self.devices[i].deviceID.includes('.')){self.devices[i].deviceID = self.devices[i].deviceID.replace(/\./g,'')}
				self.deviceIDs.push(self.devices[i].deviceID.toUpperCase())
			}
		}

		self.connectToHub()

		if (self.keepAlive > 0){
			connectionWatcher()
		}
	} else {
		self.log.error('No devices defined - please add devices to your config.json')

		self.connectToHub()

		if (self.keepAlive > 0){
			connectionWatcher()
		}
	}

	function connectionWatcher() { //resets connection to hub every keepAlive mS
		self.log('Started connection watcher...')

		if (self.model == '2245') {
			if(self.keepAlive > 0){
				setInterval(function(){
					self.log('Closing connection to Hub...')
					hub.close()
					connectedToHub = false

					self.log.debug('Connected: ' + connectedToHub + ', Connecting: ' + connectingToHub)

					setTimeout(function () { //wait 5 sec to reconnect to Hub
						self.log('Reconnecting to Hub...')
						self.connectToHub()
					}, 5000)

				},1000*self.keepAlive)
			}
		}

		if (self.model == '2242') { //check every 10 sec to see if a request is in progress
			setInterval(function(){
				if (typeof hub.status == 'undefined' && connectedToHub == true) { //undefined if no request in progress
					inUse = false
					self.log('Closing connection to Hub...')
					hub.close()
					connectedToHub = false
				} else {
					inUse = true
				}
			}, 1000*self.checkInterval)
		}
	}
}

InsteonLocalPlatform.prototype.connectToHub = function (){
	var self = this

	if (self.model == '2245') {
		self.log.debug('Connecting to Insteon Model 2245 Hub...')
		connectingToHub = true
		hub.httpClient(self.hubConfig, function(had_error) {
			self.log('Connected to Insteon Model 2245 Hub...')
			hub.emit('connect')
			connectedToHub = true
			connectingToHub = false
			if(eventListener_init == false) {
				self.eventListener()
			}

			if(self.use_express && express_init == false){
				express_init = true
				app.listen(self.server_port)
				self.log('Started Insteon Express server...')
			}
		})
	} else if (self.model == '2243') {
		self.log.debug('Connecting to Insteon "Hub Pro" Hub...')
		connectingToHub = true
		hub.serial('/dev/ttyS4',{baudRate:19200}, function(had_error) {
			self.log('Connected to Insteon "Hub Pro" Hub...')
			connectedToHub = true
			connectingToHub = false
			if(eventListener_init == false) {
				self.eventListener()
			}

			if(self.use_express && express_init == false){
				express_init = true
				app.listen(self.server_port)
				self.log('Started Insteon Express server...')
			}
		})
	} else if (self.model == '2242') {
		self.log.debug('Connecting to Insteon Model 2242 Hub...')
		connectingToHub = true
		hub.connect(self.host, function() {
			self.log('Connected to Insteon Model 2242 Hub...')
			hub.emit('connect')
			connectedToHub = true
			connectingToHub = false

			if(self.keepAlive == 0 && eventListener_init == false) {
				self.eventListener()
			}

			if(self.use_express && express_init == false){
				express_init = true
				app.listen(self.server_port)
				self.log('Started Insteon Express server...')
			}
		})
	} else {
		self.log.debug('Connecting to Insteon PLM...')
		connectingToHub = true
		hub.serial(self.host,{baudRate:19200}, function(had_error) {
			self.log('Connected to Insteon PLM...')
			connectedToHub = true
			connectingToHub = false
			if(eventListener_init == false) {
				self.eventListener()
			}

			if(self.use_express && express_init == false){
				express_init = true
				app.listen(self.server_port)
				self.log('Started Insteon Express server...')
			}
		})
	}
}

InsteonLocalPlatform.prototype.checkHubConnection = function () {
	var self = this

	if(connectingToHub == false) {
		if(connectedToHub == false) {
			console.log('Reconnecting to Hub...')
			self.connectToHub()
		}
	}

	return
}

InsteonLocalPlatform.prototype.eventListener = function () {
	var self = this
	var eight_buttonArray = {'A': 1, 'B': 2, 'C': 3,'D': 4,'E': 5,'F': 6,'G': 7,'H': 8}
	var six_buttonArray = {'ON': 1,'A': 3,'B': 4,'C': 5, 'D': 6, 'OFF': 1}
	var buttonArray

	var deviceIDs = self.deviceIDs
	eventListener_init = true

	self.log('Insteon event listener started...')

	hub.on('command', function(data) {

		if (typeof data.standard !== 'undefined') {
			self.log.debug('Received command for ' + data.standard.id)

			var info = JSON.stringify(data)
			var id = data.standard.id.toUpperCase()
			var command1 = data.standard.command1
			var command2 = data.standard.command2
			var messageType = data.standard.messageType
			var gateway = data.standard.gatewayId

			var isDevice = _.contains(deviceIDs, id, 0)

			if (isDevice) {
				var foundDevices = accessories.filter(function(item) {
					return item.id == id
				})

				self.log.debug('Found ' + foundDevices.length + ' accessories matching ' + id)
				self.log.debug('Hub command: ' + info)

				var isFan = false

				if (foundDevices.some(function(item){return item['deviceType'] === 'fan'})) {
					isFan = true
				} else {isFan = false}

				for (var i = 0, len = foundDevices.length; i < len; i++) {
					var foundDevice = foundDevices[i]
					self.log.debug('Got event for ' + foundDevice.name + ' (' + foundDevice.id + ')')

					switch (foundDevice.deviceType) {
					case 'lightbulb':
					case 'dimmer':
					case 'switch':
						if(isFan){
							foundDevice.getStatus.call(foundDevice)
							foundDevice.lastUpdate = moment()
							break
						}

						if (command1 == '19' || command1 == '03' || command1 == '04' || /*(command1 == '00' && command2 != '00')||*/ (command1 == '06' && messageType == '1')) { //19 = status
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

						if (command1 == 11 && messageType == '1') { //11 = on
							var level_int = parseInt(command2, 16)*(100/255)
							var level = Math.ceil(level_int)

							if (level == 0){
								self.log('Got off event for ' + foundDevice.name)
								foundDevice.service.getCharacteristic(Characteristic.On).updateValue(false)
								foundDevice.currentState = false
							} else if (level > 0) {
								self.log('Got on event for ' + foundDevice.name)
								foundDevice.service.getCharacteristic(Characteristic.On).updateValue(true)
								foundDevice.currentState = true
							}

							if(foundDevice.dimmable){
								if(messageType == 1){
									foundDevice.service.getCharacteristic(Characteristic.Brightness).updateValue(level)
									foundDevice.level = level
								} else {setTimeout(function(){foundDevice.getStatus.call(foundDevice)},5000)}
							}

							foundDevice.lastUpdate = moment()
							foundDevice.getGroupMemberStatus.call(foundDevice)
						}

						if (command1 == 12) { //fast on

							self.log('Got fast on event for ' + foundDevice.name)

							if(foundDevice.dimmable){
								foundDevice.service.getCharacteristic(Characteristic.Brightness).updateValue(100)
								foundDevice.level = 100
							}

							foundDevice.service.getCharacteristic(Characteristic.On).updateValue(true)
							foundDevice.currentState = true
							foundDevice.lastUpdate = moment()
							foundDevice.getGroupMemberStatus.call(foundDevice)
						}

						if (command1 == 13 || command1 == 14) { //13 = off, 14= fast off
							if (command1 == 13) {
								self.log('Got off event for ' + foundDevice.name)
							} else {self.log('Got fast off event for ' + foundDevice.name)}

							if(foundDevice.dimmable){
								foundDevice.service.getCharacteristic(Characteristic.Brightness).updateValue(0)
								foundDevice.level = 0
							}
							foundDevice.service.getCharacteristic(Characteristic.On).updateValue(false)
							foundDevice.currentState = false
							foundDevice.lastUpdate = moment()
							if (messageType = '1') {
							  foundDevice.getGroupMemberStatus.call(foundDevice)
							}
						}

						if (command1 == 18) { //18 = stop changing
							self.log('Got stop dimming event for ' + foundDevice.name)
							foundDevice.getStatus.call(foundDevice)
						}

						if (messageType == '6') { //group broadcast - manual button press
							if(command1 == '06'){
								var commandedState = gateway.substring(0,2)
								var group = parseInt(gateway.substring(4,6)) //button number
							} else {
								var commandedState = command1
								var group = parseInt(gateway.substring(4,6)) //button number
							}

							if(commandedState == 11) {
								self.log('Got on event for ' + foundDevice.name)
								foundDevice.currentState = true
								foundDevice.lastUpdate = moment()
								foundDevice.service.getCharacteristic(Characteristic.On).updateValue(true)
								foundDevice.service.getCharacteristic(Characteristic.Brightness).updateValue(100)
								foundDevice.getGroupMemberStatus.call(foundDevice)
							}

							if(commandedState == 13) {
								self.log('Got off event for ' + foundDevice.name)
								foundDevice.currentState = false
								foundDevice.lastUpdate = moment()
								foundDevice.service.getCharacteristic(Characteristic.On).updateValue(false)
								foundDevice.service.getCharacteristic(Characteristic.Brightness).updateValue(0)
								foundDevice.getGroupMemberStatus.call(foundDevice)
							}
						}

						break

					case 'scene':
					case 'keypad':
						if (messageType == '3') { //cleanup of group broadcast from hub
							var group = parseInt(command2, 16)
							var foundGroupID = parseInt(foundDevice.groupID)

							//we're looping through devices with the same deviceID - if not the correct group, move on to the next
							if (foundGroupID !== group) {
								self.log('Event not for correct group (group: ' + group + ')')
								break
							} else { //got correct group, command1 contains commanded state
								self.log('Got updated status for ' + foundDevice.name)
								if(command1 == 11) {
									foundDevice.currentState = true
									foundDevice.lastUpdate = moment()
									foundDevice.service.getCharacteristic(Characteristic.On).updateValue(true)
								}

								if(command1 == 13) {
									foundDevice.currentState = false
									foundDevice.lastUpdate = moment()
									foundDevice.service.getCharacteristic(Characteristic.On).updateValue(false)
								}
							}
						}

						if (messageType == '6') { //group broadcast - manual button press

							if(command1 == '06'){
								var commandedState = gateway.substring(0,2)
								var group = parseInt(gateway.substring(4,6)) //button number
							} else {
								var commandedState = command1
								var group = parseInt(gateway.substring(4,6)) //button number
							}

							if(foundDevice.six_btn == true){
								buttonArray = six_buttonArray
							} else {
								buttonArray = eight_buttonArray
							}

							var foundGroupID = buttonArray[foundDevice.keypadbtn]
							if (foundGroupID !== group) {
								self.log('Event not for correct group (group: ' + group + ')')
								break
							} else {
								self.log('Got updated status for ' + foundDevice.name)
								if(commandedState == 11) {
									foundDevice.currentState = true
									foundDevice.lastUpdate = moment()
									foundDevice.service.getCharacteristic(Characteristic.On).updateValue(true)
								}

								if(commandedState == 13) {
									foundDevice.currentState = false
									foundDevice.lastUpdate = moment()
									foundDevice.service.getCharacteristic(Characteristic.On).updateValue(false)
								}
							}
						}

						if (messageType == '2') { //group cleanup

							var group = parseInt(command2, 16) //button number

							if(foundDevice.six_btn == true){
								buttonArray = six_buttonArray
							} else {
								buttonArray = eight_buttonArray
							}

							var foundGroupID = buttonArray[foundDevice.keypadbtn]
							if (foundGroupID !== group) {
								self.log('Event not for correct group (group: ' + group + ')')
								break
							} else {
								self.log('Got updated status for ' + foundDevice.name)
								if(command1 == 11) {
									foundDevice.currentState = true
									foundDevice.lastUpdate = moment()
									foundDevice.service.getCharacteristic(Characteristic.On).updateValue(true)
								}

								if(command1 == 13) {
									foundDevice.currentState = false
									foundDevice.lastUpdate = moment()
									foundDevice.service.getCharacteristic(Characteristic.On).updateValue(false)
								}
							}
						}

						foundDevice.getGroupMemberStatus.call(foundDevice)
						break

					case 'fan':
						self.log('Got updated status for ' + foundDevice.name)
						if (command1 == 19) {//fan portion of fanlinc
							foundDevice.getFanState.call(foundDevice)
						}
						foundDevice.lastUpdate = moment()
						break

					case 'remote':
						self.log('Got updated status for ' + foundDevice.name)
						if (messageType == 6) {
							foundDevice.handleRemoteEvent.call(foundDevice, gateway, command1)
						}
						foundDevice.lastUpdate = moment()
						break

					case 'outlet':
						self.log('Got updated status for ' + foundDevice.name)
						foundDevice.getOutletState.call(foundDevice)
						foundDevice.lastUpdate = moment()
						break

					case 'blinds':
					case 'shades':
						self.log('Got updated status for ' + foundDevice.name)
						foundDevice.getPosition.call(foundDevice)
						foundDevice.lastUpdate = moment()
						break

					case 'smoke':
						self.log('Got updated status for ' + foundDevice.name)

						if(command1 == 11 & command2 == '01') {
							foundDevice.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(1)
						} else if(command1 == 11 & command2 == '02') {
							foundDevice.serviceCO.getCharacteristic(Characteristic.CarbonMonoxideDetected).updateValue(1)
						} else if(command1 == 11 & command2 == '05') {
							foundDevice.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(0)
						}

						foundDevice.lastUpdate = moment()
						break

					case 'doorsensor':
					case 'windowsensor':
					case 'contactsensor':
					case 'leaksensor':
					case 'motionsensor':
						if(command2 == '03'){ //low battery
							self.log('Got low battery status for ' + foundDevice.name)
							self.statusLowBattery = true
							foundDevice.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1)
						} else if (command2 !== '03') {
							foundDevice.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(0)
							self.statusLowBattery = false
						}
						foundDevice.lastUpdate = moment()
						break
					}
				}
			}

			// find all the devices that the current event device is a controller of
			var responders = _.filter(self.devices, function(device){return _.contains(device.controllers,id,0)})

			if (responders.length > 0) {
				self.log.debug(id + ' is a contoller of ' + responders.length + ' devices')

				if(['11','12','13','14'].indexOf(command1) +1){ //only really care about on/off commands

					for (var i=0, l=responders.length; i < l; i++){

						var responderDevice = accessories.filter(function(item) {
							return (item.id == responders[i].deviceID)
						})

						responderDevice = responderDevice[0]
						self.log('Getting status of responder device ' + responderDevice.name)
						responderDevice.getStatus.call(responderDevice)

					}
				} else {self.log.debug('Ignoring Controller Command: ' + command1)}
			}
		}
	})
}

InsteonLocalPlatform.prototype.accessories = function(callback) {
	var self = this
	self.foundAccessories = []

	if(typeof self.devices== 'undefined'){
		self.log.debug('No devices defined in config')
		callback(null)
		return
	}

	var numberDevices = self.devices.length
	self.log('Found %s devices in config', numberDevices)

	self.devices.forEach(function(device) {
		var accessory = new InsteonLocalAccessory(self, device)
		self.foundAccessories.push(accessory)
	})

	callback(self.foundAccessories)
}

InsteonLocalPlatform.prototype.getDevices = function(callback) {
	var self = this
	var myURL = 'http://127.0.0.1:' + self.server_port + '/links'

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
	var myURL = 'http://127.0.0.1:' + self.server_port + '/info/' + id

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

		self.log('Polling status for ' + self.name + '...')

		self.platform.checkHubConnection()

		switch (self.deviceType) {
		case 'lightbulb':
		case 'dimmer':
			self.getStatus.call(self)
			setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
			break

		case 'switch':
			self.getStatus.call(self)
			setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
			break

		case 'iolinc':
			self.getSensorStatus.call(self)
			setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
			break

		case 'scene':
			self.getSceneState.call(self)
			setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
			break

		case 'fan':
			self.getFanState.call(self)
			setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
			break

		case 'outlet':
			self.getOutletState.call(self)
			setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
			break
		}
	}
}

InsteonLocalAccessory.prototype.setPowerState = function(state, callback) {
	var powerOn = state ? 'on' : 'off'
	var self = this

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	self.platform.checkHubConnection()

	if (state !== self.currentState) {
		self.log('Setting power state of ' + self.name + ' to ' + powerOn)
		if (state) {
			setTimeout(function(){self.light.turnOn().then(function(status) {
				setTimeout(function(){
					if (status.success) { //if command actually worked, do nothing
						//do nothing
					} else { //if command didn't work, check status to see what happened and update homekit
						self.log('Error setting power state of ' + self.name + ' to ' + powerOn)
						self.getStatus.call(self)
					}
				},0)
			})
			},800)

			//assume that the command worked and report back to homekit
			if (self.dimmable) {
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(100)
			}
			self.level = 100
			self.service.getCharacteristic(Characteristic.On).updateValue(true)
			self.currentState = true
			self.lastUpdate = moment()

			self.getGroupMemberStatus()

			//Check if any target keypad button(s) to process
			if(self.targetKeypadID.length > 0){
				self.log.debug(self.targetKeypadID.length + ' target keypad(s) found for ' + self.name)

				for(var temp = 0; temp < self.targetKeypadID.length; temp++){
					self.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + self.targetKeypadID[temp] + ']')
				}

				var count

				for(count = 0; count < self.targetKeypadID.length; count++){
					//self.log.debug('<Check point 0> count = ' + count)

					self.setTargetKeypadCount = count
					run()

					//Async-Wait function to insure multiple keypads are processed in order
					async function run() {
				  		let promise = new Promise((resolve, reject) => self.setTargetKeypadBtn.call(self))
				  		let result = await promise // wait until the promise resolves
				  		return // "done!"
					}
				}
			}

			if (typeof callback !== 'undefined') {
				callback(null)
				return
			} else {
				return
			}
		} else {
			self.light.turnOff().then(function(status) {
				setTimeout(function(){
					if (status.success) { //if command actually worked, do nothing
						//do nothing
					} else { //if command didn't work, check status to see what happened and update homekit
						self.log('Error setting power state of ' + self.name + ' to ' + powerOn)
						self.getStatus.call(self)
					}
				},0)
			})

			if (self.dimmable) {
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(0)
			}
			self.level = 0
			self.service.getCharacteristic(Characteristic.On).updateValue(false)
			self.currentState = false
			self.lastUpdate = moment()

			self.getGroupMemberStatus()

			//Check if any target keypad button(s) to process
			if(self.targetKeypadID.length > 0){
				self.log.debug(self.targetKeypadID.length + ' target keypad(s) found for ' + self.name)

				for(var temp = 0; temp < self.targetKeypadID.length; temp++){
					self.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + self.targetKeypadID[temp] + ']')
				}

				var count

				for(count = 0; count < self.targetKeypadID.length; count++){
					//self.log.debug('<Check point 0> count = ' + count)

					self.setTargetKeypadCount = count
					run()

					//Async-Wait function to insure multiple keypads are processed in order
					async function run() {
				  		let promise = new Promise((resolve, reject) => self.setTargetKeypadBtn.call(self))
				  		let result = await promise // wait until the promise resolves
				  		return // "done!"
					}
				}
			}

			if (typeof callback !== 'undefined') {
				callback(null)
				return
			} else {
				return
			}
		}
	} else {
		self.currentState = state
		self.lastUpdate = moment()
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}
}

InsteonLocalAccessory.prototype.setX10PowerState = function(state, callback) {
	var powerOn = state ? 'on' : 'off'
	var self = this

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	self.platform.checkHubConnection()

	self.log('Setting power state of ' + self.name + ' to ' + powerOn)
	if (state) {
		self.light.turnOn()

		//assume that the command worked and report back to homekit
		self.level = 100
		self.service.getCharacteristic(Characteristic.On).updateValue(true)
		self.currentState = true
		self.lastUpdate = moment()

		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	} else {
		self.light.turnOff()

		self.level = 0
		self.service.getCharacteristic(Characteristic.On).updateValue(false)
		self.currentState = false
		self.lastUpdate = moment()

		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}
}

InsteonLocalAccessory.prototype.getPowerState = function(callback) {
	var self = this
	var currentState

	self.platform.checkHubConnection()

	self.log('Getting power state for ' + self.name)

	self.light.level(function(error,level) {
		if(error || typeof level == 'undefined'){
			self.log('Error getting power state of ' + self.name)
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

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	self.platform.checkHubConnection()

	var now = moment()

	if(typeof self.lastCommand == 'undefined'){self.lastCommand = now}

	var lastCommand = self.lastCommand
	var delta = now.diff(lastCommand, 'milliseconds')
	var debounceTimer = 600

	if (level == self.currentState) {
		self.log.debug("Discard on, already at commanded state")
		callback()
		return
	} else if (level === true && delta <= 50) {
		self.log.debug("Discard on, sent too close to dim")
		callback()
		return
	} else if (level === true) {
		level = 100
	} else if (level === false) {
		level = 0
	}

	self.lastCommand = now

	clearTimeout(self.levelTimeout)

	self.levelTimeout = setTimeout(function(){
		setLevel.call(self,level)
	}, debounceTimer)

	callback(null)

	function setLevel(level, callback){
		var self = this

		hub.cancelPending(self.id)

		self.lastCommand = now

		self.log('Setting level of ' + self.name + ' to ' + level + '%')

		var hexLevel = Math.ceil(level * (255/100)).toString(16)
		hexLevel = '00'.substr(hexLevel.length) + hexLevel
		var timeout = 0

		var cmd = {
			cmd1: '11',
			cmd2: hexLevel
		}

		hub.directCommand(self.id, cmd, timeout, function(error, status) {
			if(error){
				self.log('Error setting level of ' + self.name)
				self.getStatus.call(self)

				if (typeof callback !== 'undefined') {
					callback(error, null)
					return
				} else {
					return
				}
			}

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

			//Check if any target keypad button(s) to process
			if(self.targetKeypadID.length > 0){
				self.log.debug(self.targetKeypadID.length + ' target keypad(s) found for ' + self.name)

				for(var temp = 0; temp < self.targetKeypadID.length; temp++){
					self.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + self.targetKeypadID[temp] + ']')
				}

				var count

				for(count = 0; count < self.targetKeypadID.length; count++){
					//self.log.debug('<Check point 0> count = ' + count)

					self.setTargetKeypadCount = count
					run()

					//Async-Wait function to insure multiple keypads are processed in order
					async function run() {
				  		let promise = new Promise((resolve, reject) => self.setTargetKeypadBtn.call(self))
				  		let result = await promise // wait until the promise resolves
				  		return // "done!"
					}
				}
				return
			}
			return
		})
	}
}

InsteonLocalAccessory.prototype.getBrightnessLevel = function(callback) {
	var self = this
	var currentState

	self.platform.checkHubConnection()

	self.log('Getting brightness for ' + self.name)

	self.light.level(function(error, level) {
		if (error || level == null || typeof level == 'undefined') {
			self.log('Error getting level of ' + self.name)
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

	self.platform.checkHubConnection()

	if(self.deviceType == 'scene' || self.deviceType == 'keypad'){
		self.getSceneState.call(self)
		return
	}

	self.log('Getting status for ' + self.name)

	self.light.level(function(err,level) {
		if(err || level == null || typeof level == 'undefined'){
			self.log('Error getting power state of ' + self.name)
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

	self.platform.checkHubConnection()

	self.log('Getting sensor state for ' + self.name)

	self.iolinc.status(function(error,status){
		if (error || status == null || typeof status == 'undefined' || typeof status.sensor == 'undefined') {
			if (typeof callback !== 'undefined') {
				callback(error, null)
				return
			} else {
				return
			}
		} else {
			self.log.debug('Invert sensor: ' + self.invert_sensor)
			if(self.invert_sensor == 'false' || self.invert_sensor == false) {
				self.currentState = (status.sensor == 'on') ? 1 : 0
			} else if(self.invert_sensor == true || self.invert_sensor == 'true') {
				self.currentState = (status.sensor == 'off') ? 1 : 0
			}

			self.log.debug(self.name + ' sensor is ' + status.sensor + ', currentState: ' + self.currentState)

			if (self.deviceType == 'iolinc') {
				self.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(self.currentState)
				self.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(self.currentState)
			} else (
				self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
			)

			self.lastUpdate = moment()
			if (typeof callback !== 'undefined') {
				callback(null, self.currentState)
			} else {
				return
			}
		}
	})
}

InsteonLocalAccessory.prototype.setRelayState = function(state, callback) {
	var self = this
	//0=open 1=close

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	self.platform.checkHubConnection()

	self.log('Setting ' + self.name + ' relay to ' + state)

	if (state !== self.currentState){
		self.iolinc.relayOn().then(function(status){
			if (status.success) {
				if (self.deviceType == 'iolinc') {
					self.targetState = (self.currentState == 0) ? 1 : 0
					self.log(' >>> New target state is ' + self.targetState + ((self.targetState == 0) ? ' (Open)' : ' (Closed)'))
					callback()
				} else if (self.deviceType == 'valve') {
					self.currentState = (self.currentState == 0) ? 1 : 0
					self.service.getCharacteristic(Characteristic.Active).updateValue(self.currentState)
					self.service.getCharacteristic(Characteristic.InUse).updateValue(self.currentState)
					self.log('Setting ' + self.name + ' state to ' + self.currentState)

					setTimeout(function() {
						self.getSensorStatus(function() {
							self.lastUpdate = moment()
							self.service.getCharacteristic(Characteristic.Active).updateValue(0)
							self.service.getCharacteristic(Characteristic.InUse).updateValue(0)
							if (typeof callback !== 'undefined') {
								callback(null)
							} else {
								return
							}
						})
					}, 1000 * self.valve_delay)
				}
			} else {
				self.log('Error setting relay state of ' + self.name + ' to ' + state)
				if (typeof callback !== 'undefined') {
					callback(error, null)
					return
				} else {
					return
				}
			}
		})
	} else {
		self.log(self.name + ' is already at commanded state')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}
}

InsteonLocalAccessory.prototype.setSceneState = function(state, callback) {
	var self = this
	var powerOn = state ? 'on' : 'off'
	var groupID = parseInt(self.groupID)

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	self.platform.checkHubConnection()

	self.log('Setting power state of ' + self.name + ' to ' + powerOn)

	if (state) {
		hub.sceneOn(groupID).then(function(status) {
			if (status.completed) {
				self.level = 100
				self.service.getCharacteristic(Characteristic.On).updateValue(true)
				self.currentState = true
				self.lastUpdate = moment()

				self.getGroupMemberStatus()

        self.log.debug ('Scene is set to momentary: ' + self.momentary)
				if (self.momentary) {
					setTimeout(function(){
						self.level = 0
						self.service.getCharacteristic(Characteristic.On).updateValue(false)
						self.currentState = false
					},2000)
				}


				if (typeof callback !== 'undefined') {
					callback(null)
					return
				} else {
					return
				}
			} else {
				self.log('Error setting power state of ' + self.name + ' to ' + powerOn)
				if (typeof callback !== 'undefined') {
					callback(error)
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

				self.getGroupMemberStatus()

				if (typeof callback !== 'undefined') {
					callback(null)
					return
				} else {
					return
				}
			} else {
				self.log('Error setting power state of ' + self.name + ' to ' + powerOn)
				if (typeof callback !== 'undefined') {
					callback(error)
					return
				} else {
					return
				}
			}
		})
	}
}

InsteonLocalAccessory.prototype.getSceneState = function(callback) {
	var self = this
	var timeout = 0

	var eight_buttonArray = {
		'A': 0b00000001,
		'B': 0b00000010,
		'C': 0b00000100,
		'D': 0b00001000,
		'E': 0b00010000,
		'F': 0b00100000,
		'G': 0b01000000,
		'H': 0b10000000}

	var six_buttonArray = {
		'A': eight_buttonArray['C'],
		'B': eight_buttonArray['D'],
		'C': eight_buttonArray['E'],
		'D': eight_buttonArray['F'],
		'ON': eight_buttonArray['A'] | eight_buttonArray['B'],
		'OFF': eight_buttonArray['G'] | eight_buttonArray['H']}

	var buttonArray

	self.platform.checkHubConnection()

	if(self.six_btn == true){
		buttonArray = six_buttonArray
	} else {
		buttonArray = eight_buttonArray
	}

	if(self.six_btn == true){
		if (self.keypadbtn == 'ON')
		{
			var cmd = {
				cmd1: '19',
				cmd2: '00',
			}
		} else {
			var cmd = {
				cmd1: '19',
				cmd2: '01',
			}
		}
	} else { //eight button
		if (self.keypadbtn == 'A')
		{
			var cmd = {
				cmd1: '19',
				cmd2: '00',
			}
		} else {
			var cmd = {
				cmd1: '19',
				cmd2: '01',
			}
		}
	}

	self.log('Getting status for ' + self.name)

	hub.directCommand(self.id, cmd, timeout, function(err,status){
		if(err || status == null || typeof status == 'undefined' || typeof status.response == 'undefined' || typeof status.response.standard == 'undefined' || status.success == false){
			self.log('Error getting power state of ' + self.name)
			self.log.debug('Err: ' + util.inspect(err))

			if (typeof callback !== 'undefined') {
				callback(err, null)
				return
			} else {
				return
			}

		} else {

			if (self.keypadbtn == 'ON' || (self.six_btn == false && self.keypadbtn == 'A') || (typeof self.six_btn == 'undefined' && self.keypadbtn == 'A'))
			{
				self.level = parseInt(status.response.standard.command2, 16)
				if (self.level > 0) {
					self.currentState = true
				} else {
					self.currentState = false
				}
				self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
				self.lastUpdate = moment()

				if (typeof callback !== 'undefined') {
					callback(null, self.currentState)
					return
				} else {
					return
				}
			}

			var hexButtonMap = status.response.standard.command2
			var binaryButtonMap = parseInt(hexButtonMap, 16).toString(2)
			binaryButtonMap = '00000000'.substr(binaryButtonMap.length) + binaryButtonMap //pad to 8 digits
			self.buttonMap = binaryButtonMap
			self.log.debug('Binary map: ' + self.buttonMap + ' (' + self.name + ')')

			var decButtonMap = parseInt(binaryButtonMap, 2)
			var buttonNumber = buttonArray[self.keypadbtn]
			if(decButtonMap & buttonNumber) {var buttonState = true} else {var buttonState = false}
			self.log.debug('Button ' + self.keypadbtn + ' state is ' + ((buttonState == true) ? 'on' : 'off'))

			if (buttonState ==true) {
				self.currentState = true
				self.level = 100
			} else {
				self.currentState = false
				self.level = 0
			}

			self.log.debug(self.name + ' is ' + (self.currentState ? 'on' : 'off'))
			self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
			if (self.dimmable) {
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level)
			}
			self.lastUpdate = moment()
			if (typeof callback !== 'undefined') {
				callback(null, self.currentState)
				return
			} else {
				return
			}
		}
	})
}

InsteonLocalAccessory.prototype.setKeypadState = function(state, callback) {
	var self = this

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	var timeout = 0
	var eight_buttonArray = {
		'A': 7,
		'B': 6,
		'C': 5,
		'D': 4,
		'E': 3,
		'F': 2,
		'G': 1,
		'H': 0
	}
	var six_buttonArray = {
		'A': eight_buttonArray['C'],
		'B': eight_buttonArray['D'],
		'C': eight_buttonArray['E'],
		'D': eight_buttonArray['F']
	}
	var buttonArray

	self.log('Setting state of ' + self.name + ' to ' + state)

	self.platform.checkHubConnection()

	getButtonMap(function(){
		var currentButtonMap = self.buttonMap
		console.log('Current: ' + currentButtonMap)

		if(self.six_btn == true){
			buttonArray = six_buttonArray
		} else {
			buttonArray = eight_buttonArray
		}

		var buttonNumber = buttonArray[self.keypadbtn]
		console.log('button num: ' + buttonNumber)
		var binaryButtonMap = currentButtonMap.substring(0,buttonNumber) +
            (state ? '1' : '0') +
            currentButtonMap.substring(buttonNumber+1)
		console.log('New bin: ' + binaryButtonMap)
		var buttonMap = ('00'+parseInt(binaryButtonMap, 2).toString(16)).substr(-2).toUpperCase()
		console.log('Hex: ' + buttonMap)
		var cmd = {
			cmd1: '2E',
			cmd2: '00',
			extended: true,
			userData: ['01', '09', buttonMap],
			isStandardResponse: true
		}

		hub.directCommand(self.id, cmd, timeout, function(err,status){
			if(err || status == null || typeof status == 'undefined' || typeof status.response == 'undefined' || typeof status.response.standard == 'undefined' || status.success == false){
				self.log('Error setting state of ' + self.name)
				self.log.debug('Err: ' + util.inspect(err))

				if (typeof callback !== 'undefined') {
					callback(err)
					return
				} else {
					return
				}
			} else {
				self.lastUpdate = moment()
				self.buttonMap = binaryButtonMap
				self.currentState = state

				if (typeof callback !== 'undefined') {
					callback(null)
					return
				} else {
					return
				}

			}
		})
	})

	function getButtonMap(callback) {
		var command = {
			cmd1: '19',
			cmd2: '01',
		}

		hub.directCommand(self.id, command, timeout, function(err,status){
			if(err || status == null || typeof status == 'undefined' || typeof status.response == 'undefined' || typeof status.response.standard == 'undefined' || status.success == false){
				self.log('Error getting power state of ' + self.name)
				self.log.debug('Err: ' + util.inspect(err))
				return
			} else {
				var hexButtonMap = status.response.standard.command2
				var binaryButtonMap = parseInt(hexButtonMap, 16).toString(2)
				binaryButtonMap = '00000000'.substr(binaryButtonMap.length) + binaryButtonMap //pad to 8 digits

				self.buttonMap = binaryButtonMap

				self.log.debug('Binary map: ' + binaryButtonMap)
				callback()
			}
		})
	}
}

InsteonLocalAccessory.prototype.setTargetKeypadBtn = function(state, callback) {
	var self = this
	var timeout = 0

	var eight_buttonArray = {
		'A': 7,
		'B': 6,
		'C': 5,
		'D': 4,
		'E': 3,
		'F': 2,
		'G': 1,
		'H': 0
	}
	var six_buttonArray = {
		'A': eight_buttonArray['C'],
		'B': eight_buttonArray['D'],
		'C': eight_buttonArray['E'],
		'D': eight_buttonArray['F']
	}
	var buttonArray
	var index1 = self.setTargetKeypadCount

	self.log(' also setting target keypad [' + self.targetKeypadID[index1] + '] button [' + self.targetKeypadBtn[index1] + '] to ' + this.currentState)
	//self.log.debug('<Check point 1> index1 = ' + index1)

	self.platform.checkHubConnection()

	getButtonMap(function(){
		var currentButtonMap = self.buttonMap //binary button states from getButtonMap

		//self.log.debug('<Check point 4> index1 = ' + index1)

		if(self.targetKeypadSixBtn[index1] == true){
			buttonArray = six_buttonArray
			self.log.debug(' Using 6-button keypad layout')
		} else {
			buttonArray = eight_buttonArray
			self.log.debug(' Using 8-button keypad layout')
		}

		var buttonNumber = buttonArray[self.targetKeypadBtn[index1]]

		self.log.debug(' Target button: ' + self.targetKeypadBtn[index1])
		self.log.debug(' Button number: ' + buttonNumber)

		var binaryButtonMap = currentButtonMap.substring(0,buttonNumber) +
            (self.currentState ? '1' : '0') +
            currentButtonMap.substring(buttonNumber+1)

		self.log.debug(' New binary button map: ' + binaryButtonMap)

		var buttonMap = ('00'+parseInt(binaryButtonMap, 2).toString(16)).substr(-2).toUpperCase()

		//self.log.debug(' New hex value: ' + buttonMap)

		var cmd = {
				cmd1: '2E',
				cmd2: '00',
				extended: true,
				userData: ['01', '09', buttonMap],
				isStandardResponse: true
			}

			hub.directCommand(self.targetKeypadID[index1], cmd, timeout, function(err,status){

			//self.log.debug('<Check point 5> index1 = ' + index1)

			if(err || status == null || typeof status == 'undefined' || typeof status.response == 'undefined'
			|| typeof status.response.standard == 'undefined' || status.success == false){

				self.log('Error setting button state of target keypad [' + self.targetKeypadID[index1] + ']')
				self.log.debug('Err: ' + util.inspect(err))

				if (typeof callback !== 'undefined') {
					callback(err)
					return 1
				} else {
					return 1
				}
			} else {
				self.lastUpdate = moment()
				self.buttonMap = binaryButtonMap

				if (typeof callback !== 'undefined') {
				 	callback(null)
					return 1
				} else {
					return 1
				}
			}
		})

	})

	function getButtonMap(callback) {
		var command = {
			cmd1: '19',
			cmd2: '01',
		}

		//self.log.debug('<Check point 2> index1 = ' + index1)
		self.log.debug(' Reading button map for target keypad [' + self.targetKeypadID[index1] + ']')

		hub.directCommand(self.targetKeypadID[index1], command, timeout, function(err,status){
			if(err || status == null || typeof status == 'undefined' || typeof status.response == 'undefined'
			|| typeof status.response.standard == 'undefined' || status.success == false){
				self.log('Error getting button states for target keypad [' + self.targetKeypadID[index1] + ']')
				self.log.debug('Err: ' + util.inspect(err))
				return
			} else {
				var hexButtonMap = status.response.standard.command2
				var binaryButtonMap = parseInt(hexButtonMap, 16).toString(2)
				binaryButtonMap = '00000000'.substr(binaryButtonMap.length) + binaryButtonMap //pad to 8 digits
				self.buttonMap = binaryButtonMap

				self.log.debug(' Current button map: ' + binaryButtonMap)
				//self.log.debug('<Check point 3> index1 = ' + index1)

				callback()
			}
		})
	}
}

InsteonLocalAccessory.prototype.getFanState = function(callback) {
	var self = this
	var currentState

	self.platform.checkHubConnection()

	self.log('Getting state for ' + self.name)

	self.light.fan(function(error,state) {
		if(error || typeof state == 'undefined'){
			self.log('Error getting power state of ' + self.name)
			if (typeof callback !== 'undefined') {
				callback(error, null)
				return
			} else {
				return
			}
		} else {
			switch(state) {
			case 'off':
				self.currentState = false
				self.level = 0

				break

			case 'low':
				self.currentState = true
				self.level = 33

				break

			case 'medium':
				self.currentState = true
				self.level = 66

				break

			case 'high':
				self.currentState = true
				self.level = 100

				break
			}

			self.log.debug(self.name + ' is ' + (self.currentState ? 'on' : 'off') + ' at ' + self.level + ' %')

			self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
			self.service.getCharacteristic(Characteristic.RotationSpeed).updateValue(self.level) //value from 1 to 100

			self.lastUpdate = moment()
			if (typeof callback !== 'undefined') {
				callback(null, self.currentState)
			} else {
				return
			}
		}
	})
}

InsteonLocalAccessory.prototype.setFanState = function(level, callback) {
	var self = this

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	self.platform.checkHubConnection()

	hub.cancelPending(self.id)

	var now = moment()

	if(typeof self.lastCommand == 'undefined'){self.lastCommand = now}

	var lastCommand = self.lastCommand
	var delta = now.diff(lastCommand, 'milliseconds')
	var debounceTimer = 600

	if (level == self.currentState) {
		self.log.debug("Discard on, already at commanded state")
		callback()
		return
	} else if (level === true && delta <= 50) {
		self.log.debug("Discard on, sent too close to dim")
		callback()
		return
	}

	self.lastCommand = now

	clearTimeout(self.levelTimeout)

	self.levelTimeout = setTimeout(function(){
		setFanLevel.call(self, level)
	}, debounceTimer)

	callback(null)

	function setFanLevel(level, callback){
		var targetLevel

		if(typeof level == 'number'){
			self.level = level

			if (level == 0){
				targetLevel = 'off'
			} else if (level <= 33) {
				targetLevel = 'low'
			} else if (level > 66) {
				targetLevel = 'high'
			} else {
				targetLevel = 'medium'
			}
		} else if(typeof level == 'boolean'){
			if (level == false){
				targetLevel = 'off'
				self.level = 0
			} else if (level == true){
				targetLevel = 'on'
				self.level = 100
			}
		}

		self.log('Setting speed of ' + self.name + ' to ' + targetLevel + ' (' + level + '%)')

		self.light.fan(targetLevel).then(function(status)
		{
			//self.log.debug('Status: ' + util.inspect(status))
			if (status.success) {
				self.service.getCharacteristic(Characteristic.RotationSpeed).updateValue(self.level)

				if (self.level > 0) {
					self.service.getCharacteristic(Characteristic.On).updateValue(true)
					self.currentState = true
				} else if (self.level == 0) {
					self.service.getCharacteristic(Characteristic.On).updateValue(false)
					self.currentState = false
				}

				self.log.debug(self.name + ' is ' + (self.currentState ? 'on' : 'off') + ' at ' + targetLevel + ' (' + level + '%)')
				self.lastUpdate = moment()

				if (typeof callback !== 'undefined') {
					callback(null)
				} else {
					return
				}
			} else {
				self.log('Error setting level of ' + self.name)
				if (typeof callback !== 'undefined') {
					callback(error)
					return
				} else {
					return
				}
			}
		})
	}
}

InsteonLocalAccessory.prototype.handleRemoteEvent = function(group, command) {
	var self = this
	var eight_buttonArray = [{group: 1, button: 'B'},{group: 2, button: 'A'},{group: 3, button: 'D'},{group: 4, button: 'C'},{group: 5, button: 'F'},{group: 6, button: 'E'},{group: 7, button: 'H'},{group: 8, button: 'G'}] //button to group number map; documentation is wrong
	var four_buttonArray = [{group: 1, button: 'A'},{group: 2, button: 'B'},{group: 3, button: 'C'},{group: 4, button: 'D'}] //button to group number map; documentation is wrong

	var buttonArray

	if(self.four_btn == true){
		buttonArray = four_buttonArray
	} else {
		buttonArray = eight_buttonArray
	}

	self.platform.checkHubConnection()

	var buttonName = buttonArray.filter(function(item){
		return item.group == group
	})

	if (typeof buttonName[0] == 'undefined') {
		self.log.debug('Button group: ' + group)
		self.log.debug('Button not from a defined device')
		return
	} else {
		buttonName = buttonName[0].button
	}

	if (buttonName == self.button) {
		if (self.stateless == true) { //stateless switch
			self.service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0)
			self.log.debug(self.name + ' button ' + buttonName + ' was triggered')
			self.lastUpdate = moment()
		} else { //regular switch
			if(command == 11){
				self.currentState = true
			} else {
				self.currentState = false
			}
			self.lastUpdate = moment()
			self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
			self.log.debug(self.name + ' button ' + buttonName + ' is ' + (self.currentState ? 'on' : 'off'))
		}
	}
	return
}

InsteonLocalAccessory.prototype.setOutletState = function(state, callback) {
	var powerOn = state ? 'on' : 'off'
	var self = this
	var cmd
	var timeout = 0

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	self.platform.checkHubConnection()

	self.log('Setting power state of ' + self.name + ' to ' + powerOn)

	if (state) { //state = true = on
		if(self.position == 'bottom') {
			cmd = {
				extended: true,
				cmd1: '11',
				cmd2: 'FF',
				userData: ['02'],
				isStandardResponse: true
			}
		} else {
			cmd = {
				cmd1: '11',
				cmd2: 'FF'
			}
		}

		hub.directCommand(self.id, cmd, timeout, function(error, status) {
			if(error || status == null || typeof status == 'undefined' || typeof status.response == 'undefined'){
				self.log('Error getting power state of ' + self.name)
				self.log.debug('Error: ' + util.inspect(error))

				if (typeof callback !== 'undefined') {
					callback(error)
					return
				} else {
					return
				}
			} else {
				if (status.success) {
					self.currentState = true
					self.service.getCharacteristic(Characteristic.On).updateValue(true)
					self.lastUpdate = moment()

					//Check if any target keypad button(s) to process
					if(self.targetKeypadID.length > 0){
						self.log.debug(self.targetKeypadID.length + ' target keypad(s) found for ' + self.name)

						for(var temp = 0; temp < self.targetKeypadID.length; temp++){
							self.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + self.targetKeypadID[temp] + ']')
						}

						var count

						for(count = 0; count < self.targetKeypadID.length; count++){
							//self.log.debug('<Check point 0> count = ' + count)

							self.setTargetKeypadCount = count
							run()

							//Async-Wait function to insure multiple keypads are processed in order
							async function run() {
						  		let promise = new Promise((resolve, reject) => self.setTargetKeypadBtn.call(self))
						  		let result = await promise // wait until the promise resolves
						  		return // "done!"
							}
						}
					}

					if (typeof callback !== 'undefined') {
						callback(null)
						return
					} else {
						return
					}
				}
			}
		})
	} else { //state = false = off
		if(self.position == 'bottom') {
			cmd = {
				extended: true,
				cmd1: '13',
				cmd2: '00',
				userData: ['02'],
				isStandardResponse: true
			}
		} else {
			cmd = {
				cmd1: '13',
				cmd2: '00'
			}
		}

		hub.directCommand(self.id, cmd, timeout, function(error, status) {
			if(error || status == null || typeof status == 'undefined' || typeof status.response == 'undefined'){
				self.log('Error getting power state of ' + self.name)
				self.log.debug('Error: ' + util.inspect(error))

				if (typeof callback !== 'undefined') {
					callback(error)
					return
				} else {
					return
				}
			} else {
				if (status.success) {
					self.service.getCharacteristic(Characteristic.On).updateValue(false)
					self.currentState = false
					self.lastUpdate = moment()

					//Check if any target keypad button(s) to process
					if(self.targetKeypadID.length > 0){
						self.log.debug(self.targetKeypadID.length + ' target keypad(s) found for ' + self.name)

						for(var temp = 0; temp < self.targetKeypadID.length; temp++){
							self.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + self.targetKeypadID[temp] + ']')
						}

						var count

						for(count = 0; count < self.targetKeypadID.length; count++){
							//self.log.debug('<Check point 0> count = ' + count)

							self.setTargetKeypadCount = count
							run()

							//Async-Wait function to insure multiple keypads are processed in order
							async function run() {
						  		let promise = new Promise((resolve, reject) => self.setTargetKeypadBtn.call(self))
						  		let result = await promise // wait until the promise resolves
						  		return // "done!"
							}
						}
					}

					if (typeof callback !== 'undefined') {
						callback(null)
						return
					} else {
						return
					}
				}
			}
		})
	}
}

InsteonLocalAccessory.prototype.getOutletState = function(callback) {
	var self = this

	var timeout = 0
	var cmd = {
		cmd1: '19',
		cmd2: '01'
	}

	self.platform.checkHubConnection()

	self.log('Getting power state for ' + self.name)

	hub.directCommand(self.id, cmd, timeout, function(error, status) {
		if(error || typeof status == 'undefined' || typeof status.response == 'undefined' || typeof status.response.standard == 'undefined' || status.success == false){
			self.log('Error getting power state of ' + self.name)
			if (typeof callback !== 'undefined') {
				callback(error, null)
				return
			} else {
				return
			}
		}

		//self.log.debug('Outlet status: ' + util.inspect(status))

		if (status.success) {
			var command2 = status.response.standard.command2.substr(1,1) //0 = both off, 1 = top on, 2 = bottom on, 3 = both on

			switch (command2) {
			case '0':
				self.currentState = false
				break

			case '1':
				if(self.position =='bottom'){
					self.currentState = false
				} else {
					self.currentState = true
				}
				break

			case '2':
				if(self.position =='bottom'){
					self.currentState = true
				} else {
					self.currentState = false
				}
				break

			case '3':
				self.currentState = true
				break
			}

			self.log.debug(self.name + ' is ' + (self.currentState ? 'on' : 'off'))
			self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState)
			self.lastUpdate = moment()
			if (typeof callback !== 'undefined') {
				callback(null, self.currentState)
			} else {
				return
			}
		}
	})
}

InsteonLocalAccessory.prototype.getPosition = function(callback) { //get position for shades/blinds
	var self = this

	self.platform.checkHubConnection()

	self.log('Getting status for ' + self.name)

	self.light.level(function(err,level) {
		if(err || level == null || typeof level == 'undefined'){
			self.log('Error getting power state of ' + self.name)
			if (typeof callback !== 'undefined') {
				callback(null, self.level)
			} else {
				return
			}
		} else {

			self.level = level
			self.log.debug(self.name + ' is set to ' + level + '%')

			self.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(self.level)
			self.service.getCharacteristic(Characteristic.TargetPosition).updateValue(self.level)
			self.lastUpdate = moment()

			if (typeof callback !== 'undefined') {
				callback(null, self.level)
			} else {
				return
			}
		}
	})
}

InsteonLocalAccessory.prototype.setPosition = function(level, callback) { //get position for shades/blinds
	var self = this
	var oldLevel = self.level

	if(self.disabled){
		self.log.debug('Device ' + self.name + ' is disabled')
		if (typeof callback !== 'undefined') {
			callback(null)
			return
		} else {
			return
		}
	}

	self.platform.checkHubConnection()

	hub.cancelPending(self.id)

	if (level > oldLevel){
		self.service.getCharacteristic(Characteristic.PositionState).updateValue(1)
	} else {self.service.getCharacteristic(Characteristic.PositionState).updateValue(0)}

	self.log('Setting shades ' + self.name + ' to ' + level + '%')
	self.light.level(level).then(function(status)
	{
		if (status.success) {
			self.level = level
			self.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(self.level)

			self.log.debug(self.name + ' is at ' + level + '%')
			self.lastUpdate = moment()
			self.service.getCharacteristic(Characteristic.PositionState).updateValue(2)
			if (typeof callback !== 'undefined') {
				callback(null)
			} else {
				return
			}
		} else {
			self.log('Error setting level of ' + self.name)
			if (typeof callback !== 'undefined') {
				callback(error)
				return
			} else {
				return
			}
		}
	})
}

InsteonLocalAccessory.prototype.getGroupMemberStatus = function(){
	var self = this
	var deviceIDs = self.platform.deviceIDs

	if(typeof self.groupMembers == 'undefined') {
		self.log.debug('No group members defined for ' + self.name)
		return
	}

	self.groupMembers.forEach(function(deviceID){
		if (!/^[0-9a-fA-F]{6}$/.test(deviceID)){
			self.log.debug('Group device is a name...')
			var namedDev = accessories.filter(function(item) {
				return (item.name == deviceID)
			})

			namedDev = namedDev[0]
			self.log.debug('Found matching device with id ' + deviceID)
			self.log('Getting status of scene device ' + namedDev.name)
			setTimeout(function(){namedDev.getStatus.call(namedDev)}, 2000)
		} else { //group member defined by id
			var isDefined = _.contains(deviceIDs, deviceID.toUpperCase(), 0)
			if(isDefined){
				var groupDevice = accessories.filter(function(item) {
					return (item.id == deviceID.toUpperCase())
				})

				groupDevice = groupDevice[0]

				self.log('Getting status of scene device ' + groupDevice.name)
				self.log.debug('Group device type ' + groupDevice.deviceType)
				//Add slight delay to get correct status and ensure device is not mid-dim
				setTimeout(function(){groupDevice.getStatus.call(groupDevice)}, 2000)
			}
		}
	})
}

InsteonLocalAccessory.prototype.identify = function(callback) {
	var self = this

	self.log.debug('Sending beep command to ' + self.name)
	hub.directCommand(self.id, '30')
	callback()
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

	if(device.deviceID){
		self.id = device.deviceID.toUpperCase()
	}

	self.dimmable = (device.dimmable == 'yes') ? true : false
	self.currentState = ''
	self.level = ''
	self.name = device.name
	self.deviceType = device.deviceType
	self.reachable = true
	self.lastUpdate = ''
	self.refreshInterval = device.refresh || platform.refreshInterval
	self.server_port = platform.server_port
	self.disabled = device.disabled || false

	self.targetKeypadID = device.targetKeypadID || []
	self.targetKeypadSixBtn = device.targetKeypadSixBtn || []
	self.targetKeypadBtn = device.targetKeypadBtn || []
	self.setTargetKeypadCount = 0

	if(typeof device.groupMembers !== 'undefined'){
		var reg = /,|,\s/
		self.groupMembers = device.groupMembers.split(reg)
	}

	if(self.id){
		self.id = self.id.trim().replace(/\./g, '')
	}

	var uuid = UUIDGen.generate(self.name)

	self.accessory = new Accessory(self.name, uuid)
	self.accessory.on('identify', function(callback){
		self.identify.call(self,callback)
	})

	if (self.deviceType == 'scene') {
		self.groupID = device.groupID
		self.keypadbtn = device.keypadbtn
		self.six_btn = device.six_btn
		self.momentary = device.momentary || false
  }

	if (self.deviceType == 'keypad') {
		self.keypadbtn = typeof(device.keypadbtn) === 'string' ? device.keypadbtn : '?'
		self.six_btn = device.six_btn === true
	}

	if (self.deviceType == 'iolinc') {
		self.gdo_delay = device.gdo_delay || 15
		self.invert_sensor = device.invert_sensor || false
	}

	if (self.deviceType == 'valve') {
		self.valve_delay = device.valve_delay || 5
		self.invert_sensor = device.invert_sensor || false
	}

	if (self.deviceType == 'remote') {
		self.button = device.remotebtn
		self.stateless = device.stateless
		self.four_btn = device.four_btn || false
	}

	if (self.deviceType == 'outlet') {
		self.position = device.position || 'top'
	}

	if (['motionsensor', 'doorsensor', 'windowsensor', 'contactsensor', 'leaksensor'].includes(self.deviceType)) {
		self.disableBatteryStatus = device.disableBatteryStatus || false
		self.invert_sensor = device.invert_sensor || false
	}

	if (self.deviceType == 'x10') {
		self.house = device.house || 'A'
		self.unit = device.unit
	}

	if(self.refreshInterval > 0){
		hub.once('connect',function(){
			if (['lightbulb' , 'dimmer' , 'switch' , 'iolinc' , 'scene' , 'outlet' , 'fan' , 'shades' , 'blinds' , 'keypad'].includes(self.deviceType))
			{
				setTimeout(function() {self.pollStatus.call(self)}, (1000 * self.refreshInterval))
			}
		}
		)}
}

InsteonLocalAccessory.prototype.getServices = function() {
	var self = this
	var services = []
	var infoService = new Service.AccessoryInformation()

	if(self.id){
		var deviceMAC = self.id.substr(0, 2) + '.' + self.id.substr(2, 2) + '.' + self.id.substr(4, 2)
	} else {var deviceMAC = ''}
	infoService.setCharacteristic(Characteristic.Name, self.DeviceName)
		.setCharacteristic(Characteristic.Manufacturer, 'Insteon')
		.setCharacteristic(Characteristic.Model, 'Insteon')
		.setCharacteristic(Characteristic.SerialNumber, deviceMAC || '')
		.setCharacteristic(Characteristic.FirmwareRevision, self.FirmwareVersion || '')
		.setCharacteristic(Characteristic.HardwareRevision, '')
	services.push(infoService)

	switch (self.deviceType) {
	case 'lightbulb':
	case 'dimmer':
		self.service = new Service.Lightbulb(self.name)
		self.dimmable = true
		self.service.getCharacteristic(Characteristic.On).on('set', self.setBrightnessLevel.bind(self))
		//self.service.getCharacteristic(Characteristic.On).on('set', self.setPowerState.bind(self))

		if (self.dimmable) {
			self.service.getCharacteristic(Characteristic.Brightness).on('set', self.setBrightnessLevel.bind(self))
		}

		self.light = hub.light(self.id)
		self.light.emitOnAck = true

		//Get initial state
		hub.once('connect', function() {
			self.getStatus.call(self)
		})

		break

	case 'fan':
		self.service = new Service.Fan(self.name)

		self.service.getCharacteristic(Characteristic.On).on('set', self.setFanState.bind(self))
		self.service.getCharacteristic(Characteristic.RotationSpeed).on('set', self.setFanState.bind(self))

		self.light = hub.light(self.id)

		self.light.on('turnOn', function(group, level){
			self.log.debug(self.name + ' turned on')
			self.service.getCharacteristic(Characteristic.On).updateValue(true)
			self.getFanState.call(self)
		})

		self.light.on('turnOff', function(){
			self.log.debug(self.name + ' turned off')
			self.service.getCharacteristic(Characteristic.On).updateValue(false)
			self.service.getCharacteristic(Characteristic.RotationSpeed).updateValue(0)
		})

		//Get initial state
		hub.once('connect', function() {
			self.getFanState.call(self)
		})

		break

	case 'switch':
		self.service = new Service.Switch(self.name)

		self.service.getCharacteristic(Characteristic.On).on('set', self.setPowerState.bind(self))

		self.light = hub.light(self.id)
		self.light.emitOnAck = true

		hub.once('connect', function() {
			self.getStatus.call(self)
		})

		break

	case 'scene':
		self.service = new Service.Switch(self.name)
		self.dimmable = false

		self.service.getCharacteristic(Characteristic.On).on('set', self.setSceneState.bind(self))

		hub.once('connect', function() {
			if(self.id){
				self.getSceneState.call(self)
			}
		})

		break

	case 'iolinc':
	case 'garage':
		self.service = new Service.GarageDoorOpener(self.name)

		self.service.getCharacteristic(Characteristic.ObstructionDetected).updateValue(false)
		self.service.getCharacteristic(Characteristic.TargetDoorState).on('set', self.setRelayState.bind(self))

		self.iolinc = hub.ioLinc(self.id)

		self.iolinc.on('sensorOn', function(){
			self.log.debug(self.name + ' sensor is on. invert_sensor = ' + self.invert_sensor)

			if(self.invert_sensor == false || self.invert_sensor == 'false') { //Door Closed (non-inverted): No delay to action, since sensor isn't triggered until door is fully closed.
				self.log.debug(' >>> No Delayed Action <<<')
				actionDoorClosed()
			} else { //Door Open (inverted): Add delay to action, since sensor is triggered immediately upon door closing.
				setTimeout(function(){
					self.log.debug(' >>> Delayed Action <<<')
					actionDoorOpen()
				}, 1000 * self.gdo_delay)
			}
		})

		self.iolinc.on('sensorOff', function(){
			self.log.debug(self.name + ' sensor is off invert_sensor = ' + self.invert_sensor)

			if(self.invert_sensor == false || self.invert_sensor == 'false') { //Door Open (non-inverted): Add delay to action, since sensor is triggered immediately upon door opening.
				setTimeout(function(){
					self.log.debug(' >>> Delayed Action <<<')
					actionDoorOpen()
				}, 1000 * self.gdo_delay)
			} else { //Door Closed (inverted): No delay to action, since sensor isn't triggered until door fully opens.
				self.log.debug(' >>> No Delayed Action <<<')
				actionDoorClosed()
			}
		})

		hub.once('connect', function() {
			self.getSensorStatus.call(self)
		})

		function actionDoorClosed(){
			self.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(1)
			self.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(1)
			self.currentState = 1
		}

		function actionDoorOpen(){
			self.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(0)
			self.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(0)
			self.currentState = 0
		}

		break

	case 'valve':
		self.service = new Service.Valve(self.name)

		self.service.getCharacteristic(Characteristic.Active).updateValue(0)
		self.service.getCharacteristic(Characteristic.InUse).updateValue(0)
		self.service.getCharacteristic(Characteristic.ValveType).updateValue(0)

		self.service.getCharacteristic(Characteristic.Active).on('set', self.setRelayState.bind(self))

		self.iolinc = hub.ioLinc(self.id)

		hub.once('connect', function() {
			self.getSensorStatus.call(self)
		})

		break

	case 'leaksensor':
		self.service = new Service.LeakSensor(self.name)
		self.service.getCharacteristic(Characteristic.LeakDetected).updateValue(0) //Initialize as dry

		self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(0) //0=normal, 1=low
		self.statusLowBattery = false

		var buffer = 300 * 1000 //5 minute buffer
		if(self.disableBatteryStatus == false){
			self.log.debug('Initializing heartbeat timer for ' + self.name)
			self.heartbeatTimer = setTimeout(function() {
				self.statusLowBattery = true
				self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
			}, (1000*24*60*60 + buffer))
		}

		if(self.disableBatteryStatus == true){ //if battery status disabled, still notify when the device is dead
			self.log.debug('Initializing dead device timer for ' + self.name)
			self.deadDeviceTimer = setTimeout(function() {
				self.statusLowBattery = true
				self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
			}, (1000*48*60*60 + buffer))
		}

		self.leaksensor = hub.leak(self.id)

		self.leaksensor.on('wet', function(){
			self.log.debug(self.name + ' sensor is wet')
			self.service.getCharacteristic(Characteristic.LeakDetected).updateValue(1) //wet
		})

		self.leaksensor.on('dry', function(){
			self.log.debug(self.name + ' sensor is dry')
			self.service.getCharacteristic(Characteristic.LeakDetected).updateValue(0) //dry
		})

		self.leaksensor.on('heartbeat', function(){
			self.log.debug('Heartbeat from ' + self.name)

			if(self.disableBatteryStatus == false){
				clearTimeout(self.heartbeatTimer)
				self.heartbeatTimer = setTimeout(function() {
					self.statusLowBattery = true
					self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
				}, (1000*24*60*60 + buffer))
			}

			if(self.disableBatteryStatus == true){
				clearTimeout(self.deadDeviceTimer)
				self.deadDeviceTimer = setTimeout(function() { //if battery status disabled, still notify when the device is dead
					self.statusLowBattery = true
					self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
				}, (1000*48*60*60 + buffer))
			}
		})

		break

	case 'motionsensor':
		self.service = new Service.MotionSensor(self.name)
		self.service.getCharacteristic(Characteristic.MotionDetected).updateValue(0) //Initialize with no motion
		self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(0) //0=normal, 1=low
		self.statusLowBattery = false

		var buffer = 300 * 1000 //5 minute buffer
		if(self.disableBatteryStatus == false){
			self.log.debug('Initializing heartbeat timer for ' + self.name)
			self.heartbeatTimer = setTimeout(function() {
				self.statusLowBattery = true
				self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
			}, (1000*24*60*60 + buffer))
		}

		if(self.disableBatteryStatus == true){
			self.log.debug('Initializing dead device timer for ' + self.name)
			self.deadDeviceTimer = setTimeout(function() { //if battery status disabled, still notify when the device is dead
				self.statusLowBattery = true
				self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
			}, (1000*48*60*60 + buffer))
		}

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

		self.motionsensor.on('heartbeat', function(){
			self.log.debug('Heartbeat from ' + self.name)

			if(self.disableBatteryStatus == false){
				clearTimeout(self.heartbeatTimer)
				self.heartbeatTimer = setTimeout(function() {
					self.statusLowBattery = true
					self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
				}, (1000*24*60*60 + buffer))
			}

			if(self.disableBatteryStatus == true){
				clearTimeout(self.deadDeviceTimer)
				self.deadDeviceTimer = setTimeout(function() { //if battery status disabled, still notify when the device is dead
					self.statusLowBattery = true
					self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
				}, (1000*48*60*60 + buffer))
			}
		})

		break

	case 'doorsensor':
	case 'windowsensor':
	case 'contactsensor':
		self.service = new Service.ContactSensor(self.name)
		self.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(0) //Initialize closed
		self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(0) //0=normal, 1=low
		self.statusLowBattery = false

		var buffer = 300 * 1000 //5 minute buffer
		if(self.disableBatteryStatus == false){
			self.log.debug('Initializing heartbeat timer for ' + self.name)
			self.heartbeatTimer = setTimeout(function() {
				self.statusLowBattery = true
				self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
			}, (1000*24*60*60 + buffer))
		}

		if(self.disableBatteryStatus == true){
			self.log.debug('Initializing dead device timer for ' + self.name)
			self.deadDeviceTimer = setTimeout(function() { //if battery status disabled, still notify when the device is dead
				self.statusLowBattery = true
				self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
			}, (1000*48*60*60 + buffer))
		}

		self.door = hub.door(self.id)

		self.door.on('opened', function(){
			self.log.debug(self.name + ' is open')
			self.log.debug('Invert sensor: ' + self.invert_sensor)

			if(self.invert_sensor == 'false' || self.invert_sensor == false) {
				self.currentState = true
				self.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(1)
			} else if(self.invert_sensor == true || self.invert_sensor == 'true') {
				self.currentState = false
				self.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(0)
			}
		})

		self.door.on('closed', function(){
			self.log.debug(self.name + ' is closed')
			self.log.debug('Invert sensor: ' + self.invert_sensor)

			if(self.invert_sensor == 'false' || self.invert_sensor == false) {
				self.currentState = false
				self.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(0)
			} else if(self.invert_sensor == true || self.invert_sensor == 'true') {
				self.currentState = true
				self.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(1)
			}
		})

		self.door.on('heartbeat', function(){
			self.log.debug('Heartbeat from ' + self.name)

			if(self.disableBatteryStatus == false){
				clearTimeout(self.heartbeatTimer)
				self.heartbeatTimer = setTimeout(function() {
					self.statusLowBattery = true
					self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
				}, (1000*24*60*60 + buffer))
			}

			if(self.disableBatteryStatus == true){
				clearTimeout(self.deadDeviceTimer)
				self.deadDeviceTimer = setTimeout(function() { //if battery status disabled, still notify when the device is dead
					self.statusLowBattery = true
					self.service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(1) //0=normal, 1=low
				}, (1000*48*60*60 + buffer))
			}
		})

		break

	case 'remote':
		if (self.stateless) {
			self.service = new Service.StatelessProgrammableSwitch(self.name)
		} else {
			self.service = new Service.Switch(self.name)
		}

		self.dimmable = false

		break

	case 'outlet':
		self.service = new Service.Outlet(self.name)
		self.service.getCharacteristic(Characteristic.OutletInUse).updateValue(true)

		self.service.getCharacteristic(Characteristic.On).on('set', self.setOutletState.bind(self))

		self.dimmable = false

		hub.once('connect', function() {
			self.getOutletState.call(self)
		})

		break

	case 'shades':
	case 'blinds':
		self.service = new Service.WindowCovering(self.name)
		self.service.getCharacteristic(Characteristic.PositionState).updateValue(2) //stopped

		self.service.getCharacteristic(Characteristic.TargetPosition).on('set', self.setPosition.bind(self))

		self.light = hub.light(self.id)

		hub.once('connect', function() {
			self.getPosition.call(self)
		})

		break

	case 'keypad':
		self.service = new Service.Switch(self.name)

		self.service.getCharacteristic(Characteristic.On).on('set', self.setKeypadState.bind(self))

		hub.once('connect', function() {
			self.getSceneState.call(self)
		})

		break

	case 'smoke':
		self.service = new Service.SmokeSensor(self.name)
		self.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(0) //no smoke

		self.serviceCO = new Service.CarbonMonoxideSensor(self.name)
		self.serviceCO.getCharacteristic(Characteristic.CarbonMonoxideDetected).updateValue(0) //no CO

		break

	case 'x10':
		self.service = new Service.Switch(self.name)

		self.service.getCharacteristic(Characteristic.On).on('set', self.setX10PowerState.bind(self))
		self.light = hub.x10(self.house, self.unit)

		break
	}

	if (self.service) {
		services.push(self.service)
	}

	if (self.serviceCO) {
		services.push(self.serviceCO)
	}
	return services
}
