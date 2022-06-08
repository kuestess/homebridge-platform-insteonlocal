import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { InsteonLocalAccessory } from './InsteonLocalAccessory';

//import { InsteonUI } from './insteon-ui';
//import InsteonUI = require('./insteon-ui');
//let ui;

import hc from 'home-controller';
import app from 'express';
import _ from 'underscore';
import moment, { Moment } from 'moment';

const Insteon = hc.Insteon;
const hub = new Insteon();

let connectedToHub = false;
let connectingToHub = false;
const inUse = true;
let express_init = false;
let eventListener_init = false;
let configPath;

export class InsteonLocalPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public hub: any;
  private host: string;
  private port: string;
  private user: string;
  private pass: string;
  private model: string;
  public devices: Array<any>;
  public deviceIDs: Array<any>;
  private server_port: string;
  private use_express: boolean;
  private keepAlive: number;
  private checkInterval: number;
  public refreshInterval: number;
  private hubConfig: {host: string; port: string; user: string; password: string};
  hubID: any;
  insteonAccessories: Array<InsteonLocalAccessory>;
  platform: any;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.hub = hub;
    this.host = config['host'];
    this.host = config['host'];
    this.port = config['port'];
    this.user = config['user'];
    this.pass = config['pass'];
    this.model = config['model'];
    this.devices = config['devices'];
    this.server_port = config['server_port'] || 3000;
    this.use_express = config['use_express'] || false;
    this.keepAlive = config['keepAlive'] || 3600;
    this.checkInterval = config['checkInterval'] || 20;
    this.deviceIDs = [];
    this.platform = this;
    this.insteonAccessories = [];

    if (this.model == '2242') {
      this.refreshInterval = config['refresh'] || 300;
    } else {
      this.refreshInterval = config['refresh'] || 0;
    }

    this.hubConfig = {
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.pass,
    };

    this.connectToHub();

    //InsteonUI
    //const ui = new InsteonUI(configPath, hub);
    //app.use('/', ui.handleRequest);

    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  getHubInfo() {
    hub.info((error, info) => {
      if (error) {
        this.log.warn('Error getting Hub info');
      } else {
        this.hubID = info.id.toUpperCase();
        this.log.debug('Hub/PLM id is ' + this.hubID);
      }
    });
  }

  connectToHub (){
    if (this.model == '2245') {
      this.log.debug('Connecting to Insteon Model 2245 Hub...');
      connectingToHub = true;
      hub.httpClient(this.hubConfig, (had_error) => {
        this.log.info('Connected to Insteon Model 2245 Hub...');
        hub.emit('connect');
        connectedToHub = true;
        connectingToHub = false;
        if(eventListener_init == false) {
          this.eventListener();
        }

        this.getHubInfo();

        if(this.use_express && express_init == false){
          express_init = true;
          app.listen(this.server_port);
          this.log.info('Started Insteon Express server...');
        }
      });
    } else if (this.model == '2243') {
      this.log.debug('Connecting to Insteon "Hub Pro" Hub...');
      connectingToHub = true;
      hub.serial('/dev/ttyS4', {baudRate:19200}, (had_error) => {
        this.log.info('Connected to Insteon "Hub Pro" Hub...');
        connectedToHub = true;
        connectingToHub = false;
        if(eventListener_init == false) {
          this.eventListener();
        }

        this.getHubInfo();

        if(this.use_express && express_init == false){
          express_init = true;
          app.listen(this.server_port);
          this.log.info('Started Insteon Express server...');
        }
      });
    } else if (this.model == '2242') {
      this.log.debug('Connecting to Insteon Model 2242 Hub...');
      connectingToHub = true;
      hub.connect(this.host, () => {
        this.log.info('Connected to Insteon Model 2242 Hub...');
        hub.emit('connect');
        connectedToHub = true;
        connectingToHub = false;

        if(this.keepAlive == 0 && eventListener_init == false) {
          this.eventListener();
        }

        this.getHubInfo();

        if(this.use_express && express_init == false){
          express_init = true;
          app.listen(this.server_port);
          this.log.info('Started Insteon Express server...');
        }
      });
    } else {
      this.log.debug('Connecting to Insteon PLM...');
      connectingToHub = true;
      hub.serial(this.host, {baudRate:19200}, (had_error) => {
        this.log.info('Connected to Insteon PLM...');
        connectedToHub = true;
        connectingToHub = false;
        if(eventListener_init == false) {
          this.eventListener();
        }

        this.getHubInfo();

        if(this.use_express && express_init == false){
          express_init = true;
          app.listen(this.server_port);
          this.log.info('Started Insteon Express server...');
        }
      });
    }
  }

  checkHubConnection () {
    if(connectingToHub == false) {
      if(connectedToHub == false) {
        this.log.info('Reconnecting to Hub...');
        this.connectToHub();
      }
    }
    return;
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  eventListener() {
    const eight_buttonArray = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8};
    const six_buttonArray = {'ON': 1, 'A': 3, 'B': 4, 'C': 5, 'D': 6, 'OFF': 1};
    let buttonArray;

    const deviceIDs = this.deviceIDs;
    eventListener_init = true;

    this.log.info('Insteon event listener started...');

    hub.on('command', (data) => {
      if (typeof data.standard !== 'undefined') {
        this.log.debug('Received command for ' + data.standard.id);

        const info = JSON.stringify(data);
        const id = data.standard.id.toUpperCase();
        const command1 = data.standard.command1;
        const command2 = data.standard.command2;
        const messageType = data.standard.messageType;
        const gateway = data.standard.gatewayId.toUpperCase();

        const isDevice = _.contains(deviceIDs, id, 0);

        if (isDevice) {
          let foundDevices: Array<InsteonLocalAccessory>;
          foundDevices = this.insteonAccessories.filter((item) => {
            return item.id == id;
          });

          if (gateway != this.hubID) {
            if(parseInt(gateway) != 1){
              this.log.debug('Message is from keypad, filtering non-keypad devices.');
              foundDevices = foundDevices.filter((item) => {
                return item.deviceType == 'keypad';
              });
            }
          }

          this.log.debug('Found ' + foundDevices.length + ' accessories matching ' + id);
          this.log.debug('Hub command: ' + info);

          let isFan = false;

          if (foundDevices.some((item)=> {
            return item['deviceType'] === 'fan';
          })) {
            isFan = true;
          } else {
            isFan = false;
          }

          for (let i = 0, len = foundDevices.length; i < len; i++) {
            const foundDevice = foundDevices[i];
            this.log.debug('Got event for ' + foundDevice.name + ' (' + foundDevice.id + ')');

            switch (foundDevice.deviceType) {
              case 'lightbulb':
              case 'dimmer':
              case 'switch':
                if(isFan){
                  foundDevice.getStatus.call(foundDevice);
                  foundDevice.lastUpdate = moment();
                  break;
                }

                if (command1 == '19' || command1 == '03' || command1 == '04' || /*(command1 == '00' && command2 != '00')||*/ (command1 == '06' && messageType == '1')) { //19 = status
                  const level_int = parseInt(command2, 16) * (100 / 255);
                  const level = Math.ceil(level_int);

                  this.log.info('Got updated status for ' + foundDevice.name);

                  if (foundDevice.dimmable) {
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(level);
                    foundDevice.level = level;
                  }

                  if(level > 0){
                    foundDevice.currentState = true;
                  } else {
                    foundDevice.currentState = false;
                  }

                  foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(foundDevice.currentState);
                  foundDevice.lastUpdate = moment();
                }

                if (command1 == 11 && messageType == '1') { //11 = on
                  const level_int = parseInt(command2, 16)*(100/255);
                  const level = Math.ceil(level_int);

                  if (level == 0){
                    this.log.info('Got off event for ' + foundDevice.name);
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                    foundDevice.currentState = false;
                  } else if (level > 0) {
                    this.log.info('Got on event for ' + foundDevice.name);
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
                    foundDevice.currentState = true;
                  }

                  if(foundDevice.dimmable){
                    if(messageType == 1){
                      foundDevice.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(level);
                      foundDevice.level = level;
                    } else {
                      setTimeout(()=> {
                        foundDevice.getStatus.call(foundDevice);
                      }, 5000);
                    }
                  }

                  foundDevice.lastUpdate = moment();
                  foundDevice.getGroupMemberStatus.call(foundDevice);
                }

                if (command1 == 12) { //fast on

                  this.log.info('Got fast on event for ' + foundDevice.name);

                  if(foundDevice.dimmable){
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(100);
                    foundDevice.level = 100;
                  }

                  foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
                  foundDevice.currentState = true;
                  foundDevice.lastUpdate = moment();
                  foundDevice.getGroupMemberStatus.call(foundDevice);
                }

                if (command1 == 13 || command1 == 14) { //13 = off, 14= fast off
                  if (command1 == 13) {
                    this.log.info('Got off event for ' + foundDevice.name);
                  } else {
                    this.log.info('Got fast off event for ' + foundDevice.name);
                  }

                  if(foundDevice.dimmable){
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
                    foundDevice.level = 0;
                  }
                  foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                  foundDevice.currentState = false;
                  foundDevice.lastUpdate = moment();
                  if (messageType == '1') {
                    foundDevice.getGroupMemberStatus.call(foundDevice);
                  }
                }

                if (command1 == 18) { //18 = stop changing
                  this.log.info('Got stop dimming event for ' + foundDevice.name);
                  foundDevice.getStatus.call(foundDevice);
                }

                if (messageType == '6') { //group broadcast - manual button press
                  let commandedState;
                  let group;

                  if(command1 == '06'){
                    commandedState = gateway.substring(0, 2);
                    group = parseInt(gateway.substring(4, 6)); //button number
                  } else {
                    commandedState = command1;
                    group = parseInt(gateway.substring(4, 6)); //button number
                  }

                  if(commandedState == 11) {
                    this.log.info('Got on event for ' + foundDevice.name);
                    foundDevice.currentState = true;
                    foundDevice.lastUpdate = moment();
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(100);
                    foundDevice.getGroupMemberStatus.call(foundDevice);
                  }

                  if(commandedState == 13) {
                    this.log.info('Got off event for ' + foundDevice.name);
                    foundDevice.currentState = false;
                    foundDevice.lastUpdate = moment();
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                    foundDevice.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
                    foundDevice.getGroupMemberStatus.call(foundDevice);
                  }
                }

                break;

              case 'scene':
              case 'keypad':
                if (messageType == '3') { //cleanup of group broadcast from hub
                  const group = parseInt(command2, 16);
                  const foundGroupID = parseInt(foundDevice.groupID);

                  //we're looping through devices with the same deviceID - if not the correct group, move on to the next
                  if (foundGroupID !== group) {
                    this.log.info('Event not for correct group (group: ' + group + ')');
                    break;
                  } else { //got correct group, command1 contains commanded state
                    this.log.info('Got updated status for ' + foundDevice.name);
                    if(command1 == 11) {
                      foundDevice.currentState = true;
                      foundDevice.lastUpdate = moment();
                      foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
                    }

                    if(command1 == 13) {
                      foundDevice.currentState = false;
                      foundDevice.lastUpdate = moment();
                      foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                    }
                  }
                }

                if (messageType == '6') { //group broadcast - manual button press
                  let group;
                  let commandedState;

                  if(command1 == '06'){
                    commandedState = gateway.substring(0, 2);
                    group = parseInt(gateway.substring(4, 6)); //button number
                  } else {
                    commandedState = command1;
                    group = parseInt(gateway.substring(4, 6)); //button number
                  }

                  if(foundDevice.six_btn == true){
                    buttonArray = six_buttonArray;
                  } else {
                    buttonArray = eight_buttonArray;
                  }

                  const foundGroupID = buttonArray[foundDevice.keypadbtn];
                  if (foundGroupID !== group) {
                    this.log.info('Event not for correct group (group: ' + group + ')');
                    break;
                  } else {
                    this.log.info('Got updated status for ' + foundDevice.name);
                    if(commandedState == 11) {
                      foundDevice.currentState = true;
                      foundDevice.lastUpdate = moment();
                      foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
                    }

                    if(commandedState == 13) {
                      foundDevice.currentState = false;
                      foundDevice.lastUpdate = moment();
                      foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                    }
                  }
                }

                if (messageType == '2') { //group cleanup

                  const group = parseInt(command2, 16); //button number

                  if(foundDevice.six_btn == true){
                    buttonArray = six_buttonArray;
                  } else {
                    buttonArray = eight_buttonArray;
                  }

                  const foundGroupID = buttonArray[foundDevice.keypadbtn];
                  if (foundGroupID !== group) {
                    this.log.info('Event not for correct group (group: ' + group + ')');
                    break;
                  } else {
                    this.log.info('Got updated status for ' + foundDevice.name);
                    if(command1 == 11) {
                      foundDevice.currentState = true;
                      foundDevice.lastUpdate = moment();
                      foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
                    }

                    if(command1 == 13) {
                      foundDevice.currentState = false;
                      foundDevice.lastUpdate = moment();
                      foundDevice.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
                    }
                  }
                }

                foundDevice.getGroupMemberStatus.call(foundDevice);
                break;

              case 'fan':
                this.log.info('Got updated status for ' + foundDevice.name);
                if (command1 == 19) {//fan portion of fanlinc
                  foundDevice.getFanState.call(foundDevice);
                }
                foundDevice.lastUpdate = moment();
                break;

              case 'remote':
                this.log.info('Got updated status for ' + foundDevice.name);
                if (messageType == 6) {
                  foundDevice.handleRemoteEvent.call(foundDevice, gateway, command1);
                }
                foundDevice.lastUpdate = moment();
                break;

              case 'outlet':
                this.log.info('Got updated status for ' + foundDevice.name);
                foundDevice.getOutletState.call(foundDevice);
                foundDevice.lastUpdate = moment();
                break;

              case 'blinds':
              case 'shades':
                this.log.info('Got updated status for ' + foundDevice.name);
                foundDevice.getPosition.call(foundDevice);
                foundDevice.lastUpdate = moment();
                break;

              case 'smoke':
                this.log.info('Got updated status for ' + foundDevice.name);

                if(command1 == 11 && command2 == '01') {
                  foundDevice.service.getCharacteristic(this.platform.Characteristic.SmokeDetected).updateValue(1);
                } else if(command1 == 11 && command2 == '02') {
                  foundDevice.serviceCO.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected).updateValue(1);
                } else if(command1 == 11 && command2 == '05') {
                  foundDevice.service.getCharacteristic(this.platform.Characteristic.SmokeDetected).updateValue(0);
                }

                foundDevice.lastUpdate = moment();
                break;

              case 'doorsensor':
              case 'windowsensor':
              case 'contactsensor':
              case 'leaksensor':
              case 'motionsensor':
                if(command2 == '03'){ //low battery
                  this.log.info('Got low battery status for ' + foundDevice.name);
                  foundDevice.statusLowBattery = true;
                  foundDevice.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1);
                } else if (command2 !== '03') {
                  foundDevice.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(0);
                  foundDevice.statusLowBattery = false;
                }
                foundDevice.lastUpdate = moment();
                break;
            }
          }
        }

        // find all the devices that the current event device is a controller of
        const responders = _.filter(this.devices, (device)=> {
          return _.contains(device.controllers, id, 0);
        });

        if (responders.length > 0) {
          this.log.debug(id + ' is a contoller of ' + responders.length + ' devices');

          if(['11', '12', '13', '14'].indexOf(command1) +1){ //only really care about on/off commands

            for (let i=0, l=responders.length; i < l; i++){
              const responderDevice: InsteonLocalAccessory = this.insteonAccessories.filter((item) => {
                return (item.id == responders[i].deviceID);
              })[0];

              this.log.info('Getting status of responder device ' + responderDevice.name);
              responderDevice.getStatus.call(responderDevice);

            }
          } else {
            this.log.debug('Ignoring Controller Command: ' + command1);
          }
        }
      }
    });
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    if(typeof this.devices=== 'undefined'){
      this.log.debug('No devices defined in config');
      //callback(null);
      return;
    }

    const numberDevices = this.devices.length;
    this.log.info('Found %s devices in config', numberDevices);

    for (const device of this.devices) {
      const uuid = this.api.hap.uuid.generate(device.name);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if(device.deviceID.includes('.')){
        device.deviceID = device.deviceID.replace(/\./g, '');
      }

      this.deviceIDs.push(device.deviceID.toUpperCase());

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        const theAccessory = new InsteonLocalAccessory(this, existingAccessory);
        this.insteonAccessories.push(theAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        //this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        //this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        this.log.info('Adding new accessory:', device.name);
        const accessory = new this.api.platformAccessory(device.name, uuid);
        accessory.context.device = device;

        const theAccessory = new InsteonLocalAccessory(this, accessory);
        this.insteonAccessories.push(theAccessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
