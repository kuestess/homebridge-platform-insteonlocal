'use strict';

var request = require('sync-request');
//var underscore = require("underscore");
var moment = require('moment');
var util = require('util');

var Accessory, Service, Characteristic, LastUpdate, UUIDGen;

var platform = InsteonLocalPlatform;

module.exports = function(homebridge) {
    console.log("homebridge API version: " + homebridge.version);
  
  	Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerPlatform("homebridge-platform-insteonlocal", "InsteonLocal", InsteonLocalPlatform);

	UUIDGen = homebridge.hap.uuid;

    LastUpdate = function() {
        var self = this;

       	Characteristic.call(self, 'Last Activity', '');

       	self.setProps({
           format: Characteristic.Formats.STRING,
           perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
       	});

        self.value = self.getDefaultValue();
    };
    require('util').inherits(LastUpdate, Characteristic);
}

function InsteonLocalPlatform(log, config) {
    
    var self = this;
    var platform = this;
    
    self.config = config;
    self.log = log;
    self.host = config["host"];
    self.port = config["port"];
    self.user = config["user"];
    self.pass = config["pass"];
    self.devices = config["devices"];
    
    self.refreshInterval = 1000* parseInt(config["refresh"]);
    //self.url = 'http://' + self.user + ':' + self.pass + '@' + self.host + ':' + self.port
    self.log.debug('Platform definition');
	
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
	
	self.timer = setTimeout(self.deviceStateTimer.bind(self), self.refreshInterval);
}

InsteonLocalAccessory.prototype.setPowerState = function(deviceID, powerOn, callback) {

    var binaryState = powerOn ? "on" : "off";
    var self = this;
    var onOffState = powerOn ? "ff" : "00";
    var command = "0F11"

    if (this.deviceType == "garage") {
      onOffState = "ff"
      command = "0F12"
    }
    
    var myURL = "http://"+ self.user + ":" + self.pass + "@" + self.host + ":" + self.port + "/" +"3?0262" + deviceID + command + onOffState+ "=I=3";
    self.log(myURL);
    var res = request('GET', myURL);
    
    callback();
    self.log("Setting power state of " + deviceID + " to " + powerOn);

  },

InsteonLocalAccessory.prototype.getPowerState = function(deviceID, callback) {
    var self = this;
    var currentState;
    var command = "0F19FF"
    var level = '';
    
    var myURL = "http://"+ self.user + ":" + self.pass + "@" + self.host + ":" + self.port + "/" +"3?0262" + deviceID + command + "=I=3";
    self.log(myURL);
	
	console.log('Getting power state...');
	
	//var clearURL = "http://"+ self.user + ":" + self.pass + "@" + self.host + ":" + self.port +"/1?XB=M=1";
	//request('POST', clearURL);
	//console.log('Clearing buffer');
	
	if (level == '' || level == 'error'){
		
		setTimeout(function() {
			request('POST', myURL);
			self.log(myURL);
				
			setTimeout(function() {
				level = self.getBufferStatus(deviceID);
			
				if (level != 'error') {
					self.level = parseInt(level);

					if (level > 0) {
						currentState = true
						
					} else {
						currentState = false
					}
	
					self.currentState = currentState;
				
					callback(null, currentState);
				}
			}, 3000);
		},3000);
	}	
}

InsteonLocalAccessory.prototype.setBrightnessLevel = function(deviceID, level, callback) {
    var self = this;
    var myURL;
    var res;

    var levelInt = parseInt(level)*255/100;
    var intvalue = Math.ceil( levelInt ); 
    var hexString = ("0" + intvalue.toString(16)).substr(-2); 

		myURL = "http://"+ self.user + ":" + self.pass + "@" + self.host + ":" + self.port + "/" +"3?0262" + deviceID + "0F11" + hexString + "=I=3";
		self.log(myURL);
		self.log("Setting brightness level of " + deviceID + " to " + hexString);
		res = request('POST', myURL);
		callback();
  }

InsteonLocalAccessory.prototype.getBrightnessLevel = function(deviceID, callback) {
    var self = this;
    var command = "0F19FF"
    var level = ''
    
    var myURL = "http://"+ self.user + ":" + self.pass + "@" + self.host + ":" + self.port + "/" +"3?0262" + deviceID + command + "=I=3";
    self.log(myURL);
	
	console.log('Getting brightness...');
	
	if (level == '' || level == 'error'){
		setTimeout(function() {
			request('POST', myURL);
			self.log(myURL);
				
			setTimeout(function() {
				level = self.getBufferStatus(deviceID);
			
				if (level != 'error') {
					self.level = parseInt(level);
					callback(null, self.level);
				}
			}, 3000);
		},5000);
	}	
}

InsteonLocalAccessory.prototype.getBufferStatus = function(deviceID) {
	var self = this;
	
   	var myURL = "http://"+ self.user + ":" + self.pass + "@" + self.host + ":" + self.port + "/buffstatus.xml";
    self.log(myURL);
    
    var response = request('GET', myURL);   
	var raw_text = String(response.getBody());
		
	raw_text = raw_text.replace('<response><BS>', '')
	raw_text = raw_text.replace('</BS></response>', '')
	raw_text = raw_text.trim();
	
	console.log('Full buffer text: ' + raw_text);
	
	var buffer_length = raw_text.length;
	console.log('Buffer length: ' + buffer_length);
	if (buffer_length == 202) {
		// 2015 hub
		// the last byte in the buffer indicates where it stopped writing.
		// checking for text after that position would show if the buffer
		// has overlapped and allow ignoring the old stuff after
		
		var buffer_end = raw_text.substr(-2,2);
		var buffer_end_int = parseInt(buffer_end, 16)
		raw_text = raw_text.substr(0,buffer_end_int)
	} else {
		
		return 'error';
	}
	
	//var responseID = raw_text.substr(4,6)
	var responseID = raw_text.substr(22,6)
	
	if (deviceID == responseID) {
		console.log('Response is for correct device ' + responseID);
		var level_int = parseInt(raw_text.substr(-2,2), 16)*(100/255);
		var level = Math.ceil(level_int);
		
		console.log('get_buffer_status: Got raw text with size %s and contents: %s', buffer_length, raw_text);
		console.log('Level is: ' + level);
	
		self.level = level;
		return level;
			
	} else {
			console.log('Response is for wrong device - looking for ' + deviceID + ', got ' + responseID);
			
			//var clearURL = "http://"+ self.user + ":" + self.pass + "@" + self.host + ":" + self.port +"/1?XB=M=1";
			//request('POST', clearURL);
			//console.log('Clearing buffer');
			
			return 'error';
	}	
}

function InsteonLocalAccessory(platform, device) {
    var self = this;
    
    self.user = platform.user;
    self.pass = platform.pass;
    self.host = platform.host;
    self.port = platform.port;
    
    self.init.call(self, platform, device)
    
    platform.log.debug('[%s]: found Insteon Device, deviceid=%s', moment().format('YYYYMMDDHHmmss.SSS'), self.id);
        
    self.reachable = true;                	
	
	self.service = new Service.Lightbulb(self.name);
	
	/*self.service
		.addCharacteristic(Characteristic.LastUpdate);*/
	
	self.service
		.getCharacteristic(Characteristic.On)
		.on('get', function(callback) {
		self.log.debug("[%s]: Getting current dimmer state for [%s]...", moment().format('YYYYMMDDHHmmss.SSS'), self.name);
		


		self.getPowerState.call(self, self.id, function(error, body){
			if(error){
				console.log('Error retrieving status of ' + self.name);
				callback(error,null); 
			}
					
			var state = body;
			console.log('State returned ' + body);
			self.currentState = state;
							
			console.log('Setting Characteristic.On to ' + self.currentState + ' for ' + self.name);
			self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState);
			
			callback(null, self.currentState);	  
			})
	}.bind(self));
	
	self.service
		.addCharacteristic(Characteristic.Brightness)
			.on('get', function(callback) {
				self.getBrightnessLevel.call(self, self.id, function(error, body){
					if(error){
						console.log('Error retrieving status of ' + self.name);
						callback(error,null); 
					}
					
					var level = body;
					self.level = level;
				
				self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level);
				callback(null, self.level);
			});
		}.bind(self));
		
	self.service
		.getCharacteristic(Characteristic.On)	
		.on('set', function(state, callback) {
				
			if(state !== self.currentState) {
				self.log.debug("[%s]: set current dimmer state...[%s]", moment().format('YYYYMMDDHHmmss.SSS'), state);
							
				console.log('Sending [%s] to ' + self.name, state);
				self.setPowerState.call(self, self.id, state, function(body){
			
				self.currentState = state ? true : false;
				//self.level = 100;
				self.stateUpdatedTime = moment().format('x');

				self.service.getCharacteristic(Characteristic.On).updateValue(self.currentState);
				//self.service.getCharacteristic(LastUpdate).setValue(self.platform.dateTimeToDisplay(self.stateUpdatedTime));
				callback();
					
				});
			} 
		}.bind(self));
	
	self.service
		.getCharacteristic(Characteristic.Brightness)
			.on('set', function(level, callback) {
				
				self.setBrightnessLevel.call(self, self.id, level, function(body){
				
					self.level = level;
					self.stateUpdatedTime = moment().format('x');

					self.service.getCharacteristic(Characteristic.Brightness).updateValue(self.level);
					//self.service.getCharacteristic(LastUpdate).setValue(self.platform.dateTimeToDisplay(self.stateUpdatedTime));
					callback();
				});				
			}.bind(self));
}

InsteonLocalAccessory.prototype.init = function(platform, device) {
    var self = this;

    self.platform = platform;
    self.log = platform.log;
    self.id = device.deviceID;
    self.currentState = '';
    self.level = '';
    self.name = device.name;
    self.deviceType = device.deviceType;
    self.reachable = true;
    
    self.updateDevice([device]);  
}

InsteonLocalAccessory.prototype.addService = function(accessory, service_name, service_type) {

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
    
    if (self.deviceType == ('lightbulb' || 'dimmer' || 'switch')) {
    	var serviceType = 'Service.Lightbulb';
    	};
    
    if (self.deviceType == 'Leak Sensor') {
    	var serviceType = 'Service.LeakSensor';
    	};
    
     if (self.deviceType == 'I/O Module') {
    	var serviceType = 'Service.GarageDoorOpener';
    	};
    
    for(var i=0; i< devices.length; i++){
        //self.log.debug('updateDevice ' + devices[i].DeviceID);
        
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
    
    service.setCharacteristic(Characteristic.Name, self.DeviceName)
        .setCharacteristic(Characteristic.Manufacturer, 'Insteon')
        .setCharacteristic(Characteristic.Model, 'Insteon')
        .setCharacteristic(Characteristic.SerialNumber, self.insteonID || '')
        .setCharacteristic(Characteristic.FirmwareRevision, self.FirmwareVersion || '')
        .setCharacteristic(Characteristic.HardwareRevision, '');
    services.push(service);
    if(self.service) {
        services.push(self.service);
    }
    return services;
}

InsteonLocalPlatform.prototype.deviceStateTimer = function() {
    var self = this;
    if(self.timer) {
        clearTimeout(self.timer);
        self.timer = null;
    }
    /*self.getDevices(function(insteon_devices) {
        self.foundAccessories.forEach(function(accessory) {
            accessory.updateDevice(insteon_devices);
        });
        self.timer = setTimeout(self.deviceStateTimer.bind(self), self.refreshInterval);
    });*/
}

InsteonLocalPlatform.prototype.dateTimeToDisplay = function(unixtime) {
    return moment(unixtime, 'x').fromNow()
}