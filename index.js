'use strict';
var request = require('request');
var _ = require('underscore');
var Insteon = require('home-controller').Insteon;
var hub = new Insteon();
var moment = require('moment');
var util = require('util');
var express = require('express');
var app = express();

var Accessory, Service, Characteristic, UUIDGen;
var links = []
var accessories = []
var connectedToHub = false

var platform = InsteonLocalPlatform;

module.exports = function(homebridge) {
    console.log("homebridge API version: " + homebridge.version);
  
  	Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    homebridge.registerPlatform("homebridge-platform-insteonlocal", "InsteonLocal", InsteonLocalPlatform);
}

function InsteonLocalPlatform(log, config, api) { 
    var self = this;
    var platform = this;
    
    self.config = config;
    self.log = log;
    self.host = config["host"];
    self.port = config["port"];
    self.user = config["user"];
    self.pass = config["pass"];
    self.model = config["model"];
    self.devices = config["devices"];
    self.refreshInterval = config["refresh"];
    self.server_port = config["server_port"];
      
	var config = {
		host: self.host,
	  	port: self.port,
	  	user: self.user,
	  	password: self.pass
	};

	app.get('/light/:id/on', function(req, res){
	  var id = req.params.id;
	  hub.light(id).turnOn()
	  .then(function (status) {
		if(status.response) {
		  res.sendStatus(200);
		} else {
		  res.sendStatus(404);
		}
	  });
	});

	app.get('/light/:id/off', function(req, res){
	  var id = req.params.id;
	  hub.light(id).turnOff()
	  .then(function (status) {
		if(status.response) {
		  res.sendStatus(200);
		} else {
		  res.sendStatus(404);
		}
	  });
	});

	app.get('/light/:id/status', function(req, res){
	  var id = req.params.id;
	  hub.light(id).level(function(err, level){  
		   	res.json({"level": level});
		})
	});
	
	app.get('/light/:id/level/:targetLevel', function(req, res){
	  var id = req.params.id;
	  var targetLevel = req.params.targetLevel;
  
	  hub.light(id).level(targetLevel)
	  .then(function (status) {
		if(status.response) {
		  res.sendStatus(200);
		} else {
		  res.sendStatus(404);
		}
	  });
	});

	app.get('/links', function(req, res){
		hub.links(function(err, links){ 
		   res.json(links);
		})
	});
	
	app.get('/links/:id', function(req, res){
  		var id = req.params.id; 
  		hub.links(id, function(err, links){
       	res.json(links);
		})
	});
	
	app.get('/info/:id', function(req, res){
	  var id = req.params.id; 
	  hub.info(id, function(err, info){ 
		   res.json(info);
		})
	});

	self.deviceIDs = []
	
	for(var i=0; i< self.devices.length; i++){       
        self.deviceIDs.push(self.devices[i].deviceID)
    }
	
	if(self.model == "2245") {
		hub.httpClient(config, function () {
			console.log('Connected to Insteon Hub.  Server listening on port ' + self.server_port + '....')
			connectedToHub = true
			hub.emit('connect')
			eventListener()		  	
		  	app.listen(self.server_port);		  	
		});
	} else {
		hub.connect(self.host, function () {
		  console.log('Connected to Insteon Hub.  Server listening on port ' + self.server_port + '....')
		  connectedToHub = true
		  hub.emit('connect')
		  eventListener()		  
		  app.listen(self.server_port);
		});
	}
	
	function eventListener () {
		var deviceIDs = platform.deviceIDs
		
		self.log('Insteon event listener started');
		
		hub.on('command', function (data) {
		  var info = JSON.stringify(data)
		  var id = data.standard.id
		  var command1 = data.standard.command1
		  var command2 = data.standard.command2
	  
		  var isDevice = _.contains(deviceIDs, id, 0)
		  if (isDevice){
			var foundDevice = accessories.filter(function(item) {
							return item.id == id;
							});
			
			foundDevice = foundDevice[0]
			
			self.log.debug('Got event for ' + foundDevice.name);
			self.log.debug('Hub command: ' + info);
		
			if (command1 == 11) { //11 = on
				var level_int = parseInt(command2, 16)*(100/255);
				var level = Math.ceil(level_int);
				
				self.log('Got on event for ' + foundDevice.name);
				
				if(foundDevice.dimmable){
					foundDevice.service.getCharacteristic(Characteristic.Brightness).updateValue(100);
					foundDevice.level = level
				}
				foundDevice.service.getCharacteristic(Characteristic.On).updateValue(true);
				foundDevice.currentState = true
				foundDevice.lastUpdate = moment()	
			}
			if (command1 == 13) { //13 = off
				self.log('Got off event for ' + foundDevice.name);
				
				if(foundDevice.dimmable){
					foundDevice.service.getCharacteristic(Characteristic.Brightness).updateValue(0);
					foundDevice.level = 0
				}
				foundDevice.service.getCharacteristic(Characteristic.On).updateValue(false);
				foundDevice.currentState = false
				foundDevice.lastUpdate = moment()
			}
			if (command1 == 18) { //18 = stop changing
				self.log('Got stop dimming event for ' + foundDevice.name);
				
				foundDevice.getPowerState(foundDevice.id, function(error,state){
					self.log('Got state ' + state + ' for ' + foundDevice.id)
				})
				if(foundDevice.dimmable){			
					foundDevice.getBrightnessLevel(foundDevice.id, function(error,level){
						self.log('Got level ' + level + ' for ' + foundDevice.id)
					})
				}
			}
		  }
	  })
	}
}

InsteonLocalPlatform.prototype.accessories = function(callback) {
    var self = this;
  	var numberDevices =  self.devices.length;
  	
  	console.log('Found %s devices in config', numberDevices);
  	
  	self.foundAccessories = [];
	
	self.devices.forEach(function(device) {
		var accessory = new InsteonLocalAccessory(self, device);
		self.foundAccessories.push(accessory);
	});

	callback(self.foundAccessories);
}

InsteonLocalPlatform.prototype.getDevices = function(callback){
	var self = this;
	var myURL = "http://127.0.0.1:" + self.server_port + "/links"

	request.get(myURL, function (error, response, body) {
		var obj = JSON.parse(body)
		
		obj.forEach(function(link) {   
			if (link !== null) {
			   links.push(link.id)			   
			}
		})
		
		links = links.filter( function( item, index, inputArray ) {
           return inputArray.indexOf(item) == index;
    	})
    	
    	console.log('Insteon device IDs:' + JSON.stringify(links))
    	console.log('Number links: ' + links.length)
    	
    	links.forEach(function(link) {   
    		self.getInfo(link, function(device){
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

InsteonLocalPlatform.prototype.getInfo = function(id, callback){
	var self = this;
	var myURL = "http://127.0.0.1:" + self.server_port + "/info/" + id
	
	request.get(myURL, function (error, response, body) {
		var device = JSON.parse(body)
		callback(device)
	})
}

InsteonLocalAccessory.prototype.pollStatus = function(id) {
	var self = this
	var now = moment()
	var lastUpdate = self.lastUpdate
	var delta = now.diff(lastUpdate, 'seconds')
		
	if (delta < self.refreshInterval){
		setTimeout(function(){self.pollStatus.call(self, self.id)}, 1000*(self.refreshInterval-delta))
	} else {
		console.log('Polling status for ' + self.name + '...')
		self.getPowerState.call(self, self.id, function(error, body){
		if(error){
			console.log('Error retrieving status of ' + self.name);
			return 
		}
			var state = body;
			self.currentState = state;	
		})

	if(self.dimmable){
			self.getBrightnessLevel.call(self, self.id, function(error, body){
			if(error){
				console.log('Error retrieving status of ' + self.name);
				return
				}
			})
		}
	}
}

InsteonLocalAccessory.prototype.setPowerState = function(deviceID, powerOn, callback) {
	var light = hub.light(deviceID)
    var binaryState = powerOn ? "on" : "off";
    var self = this;
    
    var myURL = "http://127.0.0.1:" + self.server_port + "/light/" + deviceID + "/" + binaryState;
	
	if(powerOn !== self.currentState){		
		request.get(myURL, function (error, response, body) {
			self.log("Setting power state of " + self.name + " to " + binaryState);
			if (error) {
				callback(error, null);
			}
			if (response.statusCode == 200) {
				self.service.getCharacteristic(Characteristic.On).updateValue(powerOn);
				if(self.dimmable){
					if (binaryState == 'on') {
						self.service.getCharacteristic(Characteristic.Brightness).updateValue(100);
						self.level = 100
					} else {
						self.service.getCharacteristic(Characteristic.Brightness).updateValue(0);
						self.level = 0
					}
				}
				self.currentState = powerOn
				self.lastUpdate = moment()	
				callback(null, powerOn);
			}
		})
	} else {
			self.currentState = powerOn
			self.lastUpdate = moment()	
			callback(null, powerOn);
	}
},

InsteonLocalAccessory.prototype.getPowerState = function(deviceID, callback) {
    var self = this;
    var level;
    var currentState;
	
	self.log('Getting power state for ' + self.name);
		
	var myURL = "http://127.0.0.1:" + self.server_port + "/light/" + deviceID + "/status";
	request.get(myURL, function (error, response, body) {
  		if (error) {
				callback(error, null);
		}
  		
  		var obj = JSON.parse(body)
  		level = parseInt(obj.level,10)
  		
  		if (level > 0) {
			currentState = true
		} else {
			currentState = false	
		} 
		self.currentState = currentState;
		self.service.getCharacteristic(Characteristic.On).updateValue(currentState);
		self.lastUpdate = moment()	
		callback(null, currentState);	
	})
}

InsteonLocalAccessory.prototype.setBrightnessLevel = function(deviceID, level, callback) {
    var self = this;
    var light = hub.light(deviceID)
    
    var myURL = "http://127.0.0.1:" + self.server_port + "/light/" + deviceID + "/level/" + level;
	hub.cancelPending(deviceID)
	request.get(myURL, function (error, response, body) {
		if (error) {
			callback(error, null);
		}
		self.log("Setting brightness of " + self.name + " to " + level);
		self.level = level
		
		self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level);
		
		if(self.level > 0){
						self.service.getCharacteristic(Characteristic.On).updateValue(true);
						self.currentState = true
					} else if (self.level == 0){
						self.service.getCharacteristic(Characteristic.On).updateValue(false);
						self.currentState = false
					}
		self.lastUpdate = moment()	
		callback(null, level)					
	})
}

InsteonLocalAccessory.prototype.getBrightnessLevel = function(deviceID, callback) {
    var self = this;
    var level
    
    var myURL = "http://127.0.0.1:" + self.server_port + "/light/" + deviceID + "/status";
	self.log('Getting brightness level for ' + self.name);
	request.get(myURL, function (error, response, body) {
		if (error || !response.statusCode) {
			callback(error, null);
		}
			
		if (response.statusCode == 200) {
			var obj = JSON.parse(body)
		
			level = parseInt(obj.level,10)
			self.level = level
			
			self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level);
			self.lastUpdate = moment()	
			callback(null, self.level)
  		}
	})	
}

function InsteonLocalAccessory(platform, device) {
    var self = this;
    
    self.init.call(self, platform, device)
    
    platform.log.debug('[%s]: found Insteon Device, deviceid=%s', moment().format('YYYYMMDDHHmmss.SSS'), self.id);
    self.reachable = true;                	
	self.service = new Service.Lightbulb(self.name);
	
	accessories.push(self)
		
	self.service
		.getCharacteristic(Characteristic.On)	
		.on('set', function(state, callback) {
				
			self.log.debug("[%s]: set current dimmer state...[%s]", moment().format('YYYYMMDDHHmmss.SSS'), state);
						
			self.setPowerState.call(self, self.id, state, function(error, state){
				if(error){
					console.log('Error setting power for ' + self.name);
					callback(error,null); 
				} else {					
						self.currentState = state
						callback(null, self.currentState);
						}			
			});
	}.bind(self));
	
	if(self.dimmable){
		self.service
			.getCharacteristic(Characteristic.Brightness)
				.on('set', function(level, callback) {
				
					self.setBrightnessLevel.call(self, self.id, level, function(error, level){
						if(error){
							console.log('Error setting level for ' + self.name);
							callback(error,null); 
						} else {
								self.level = level;
								}
						callback(null, self.level);
					});				
		}.bind(self));
	}
}

InsteonLocalAccessory.prototype.init = function(platform, device) {
    var self = this;

    self.platform = platform;
    self.log = platform.log;
    self.id = device.deviceID;
    self.dimmable = (device.dimmable == "yes") ? true : false;
    self.currentState = '';
    self.level = '';
    self.name = device.name;
    self.deviceType = device.deviceType;
    self.reachable = true;
    self.lastUpdate = ''
    self.refreshInterval = platform.refreshInterval
    self.server_port = platform.server_port
    
    self.updateDevice([device]); 
    
    //Get initial state
	hub.on('connect', function() {
		self.getPowerState.call(self, self.id, function(error, body){
				if(error){
					console.log('Error retrieving status of ' + self.name);
				}
				var state = body;
				self.currentState = state;
				self.lastUpdate = moment()	
			})

		if(self.dimmable){
			self.getBrightnessLevel.call(self, self.id, function(error, body){
					if(error){
						console.log('Error retrieving status of ' + self.name); 
					}
			})
		}
		
		if(self.refreshInterval>0){
			setInterval(function(){self.pollStatus.call(self, self.id)}, 1000*self.refreshInterval)
		}		
	})
}

InsteonLocalAccessory.prototype.addService = function(accessory, service_name, service_type) {
  var self = this;
  var isValid;

  if (typeof Service[service_type] !== "undefined") {
    accessory.addService(Service[service_type], service_name, service_name);
    
    this.service_types[service_name] = service_type;
    
    if (typeof accessory.context.service_types === "undefined") {
      accessory.context.service_types = {};
    }
    accessory.context.service_types[service_name] = service_type;
    
    isValid = true;
  } else {
    isValid = false;
  }
  return isValid;
}

InsteonLocalAccessory.prototype.updateDevice = function(devices) {
    var self = this;
    var isMe = false;
    
    if(!devices) {
        return false;
    }
    
    if (self.deviceType == ('lightbulb' || 'dimmer' || 'switch' || 'scene')) {
    	var serviceType = 'Service.Lightbulb';
    	};
    
    if (self.deviceType == 'Leak Sensor') { //not implemented
    	var serviceType = 'Service.LeakSensor';
    	};
    
     if (self.deviceType == 'I/O Module') { //not implemented
    	var serviceType = 'Service.GarageDoorOpener';
    	};
    
    for(var i=0; i< devices.length; i++){
        self.addService(self, self.name, serviceType)
        
        if(!self.device || self.device.deviceID === devices[i].deviceID) {
            self.device = devices[i];
            isMe = true;
            break;
        }
    }
    if(!isMe || !self.device) {
        return false;
    }  
    return true;
}

InsteonLocalAccessory.prototype.getServices = function() {
    var self = this;
    var services = [];
    var service = new Service.AccessoryInformation();
    var deviceMAC = self.id.substr(0,2) + '.' + self.id.substr(2,2) + '.' + self.id.substr(4,2)
    
    service.setCharacteristic(Characteristic.Name, self.DeviceName)
        .setCharacteristic(Characteristic.Manufacturer, 'Insteon')
        .setCharacteristic(Characteristic.Model, 'Insteon')
        .setCharacteristic(Characteristic.SerialNumber, deviceMAC || '')
        .setCharacteristic(Characteristic.FirmwareRevision, self.FirmwareVersion || '')
        .setCharacteristic(Characteristic.HardwareRevision, '');
    services.push(service);
    
    if(self.service) {
        services.push(self.service);
    }
    return services;
}