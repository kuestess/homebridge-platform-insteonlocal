import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, ColorUtils } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { InsteonLocalAccessory } from './InsteonLocalAccessory';

import { InsteonUI } from './insteon-ui';

import hc from 'home-controller';
import express from 'express';
const app = express();
import _ from 'underscore';
import moment, { Moment } from 'moment';
import events from 'events';
import util from 'util';

const Insteon = hc.Insteon;
const hub = new Insteon();

let connectedToHub = false;
let connectingToHub = false;
let inUse = true;
let express_init = false;
let eventListener_init = false;
export class InsteonLocalPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public accessories: PlatformAccessory[] = [];

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
  configPath: string;
  app: any;
  ui: InsteonUI;

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
    this.devices = config['devices'] || [];
    this.server_port = config['server_port'] || 3000;
    this.use_express = config['use_express'] || false;
    this.keepAlive = config['keepAlive'] || 3600;
    this.checkInterval = config['checkInterval'] || 20;
    this.deviceIDs = [];
    this.platform = this;
    this.insteonAccessories = [];
    this.configPath = api.user.configPath();
    this.app = app;

    events.EventEmitter.defaultMaxListeners = Math.max(10, this.devices.length);

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

    if (this.keepAlive > 0){
      this.connectionWatcher();
    }

    if(this.use_express && express_init == false){
      this.initAPI();
      express_init = true;
      this.log.info('Started Insteon Express server...');
    }

    //InsteonUI
    const ui = new InsteonUI(this.configPath, hub);
    app.use('/', ui.handleRequest.bind(ui));
    app.listen(this.server_port);

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

  connectionWatcher() { //resets connection to hub every keepAlive mS
    this.log.info('Started connection watcher...');

    if (this.model == '2245') {
      if(this.keepAlive > 0){
        setInterval(()=> {
          this.log.info('Closing connection to Hub...');
          hub.close();
          connectedToHub = false;

          this.log.debug('Connected: ' + connectedToHub + ', Connecting: ' + connectingToHub);

          setTimeout(() => { //wait 5 sec to reconnect to Hub
            this.log.info('Reconnecting to Hub...');
            this.connectToHub();
          }, 5000);

        }, 1000*this.keepAlive);
      }
    }

    if (this.model == '2242') { //check every 10 sec to see if a request is in progress
      setInterval(()=> {
        if (typeof hub.status === 'undefined' && connectedToHub == true) { //undefined if no request in progress
          inUse = false;
          this.log.info('Closing connection to Hub...');
          hub.close();
          connectedToHub = false;
        } else {
          inUse = true;
        }
      }, 1000*this.checkInterval);
    }
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

        // this.getHubInfo();
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

        // this.getHubInfo();
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

        // this.getHubInfo();
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

        // this.getHubInfo();
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
    const four_buttonArray = {
      '1': eight_buttonArray['A'],
      '2': eight_buttonArray['B'],
      '3': eight_buttonArray['C'],
      '4': eight_buttonArray['D'],
    };

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
                  } else if (foundDevice.four_btn == true){
                    buttonArray = four_buttonArray;
                  }else {
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
                  } else if (foundDevice.four_btn == true){
                    buttonArray = four_buttonArray;
                  }else {
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
      return;
    }

    //Remove accessories that are cached but no longer defined in the config
    this.accessories.forEach((accessory, index) => {
      const foundName = this.devices.filter((device) => {
        return (device.name == accessory.displayName);
      });
      const inConfig = !!foundName.length;

      if(!inConfig){
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.info('Removing ' + accessory.displayName +' from cache - no longer in config.');
        this.accessories.splice(index, 1);
      }
    });

    const numberDevices = this.devices.length;
    this.log.info('Found %s devices in config', numberDevices);

    for (const device of this.devices) {
      const uuid = this.api.hap.uuid.generate(device.name);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if(device.deviceID && device.deviceID.includes('.')){
        device.deviceID = device.deviceID.replace(/\./g, '');
      }

      if(device.deviceID){
        this.deviceIDs.push(device.deviceID.toUpperCase());
      }

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        const theAccessory = new InsteonLocalAccessory(this, existingAccessory);
        this.insteonAccessories.push(theAccessory);

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

  initAPI() {
    const deviceIDs = this.deviceIDs;

    this.app.get('/light/:id/on', (req, res) => {
      const id = req.params.id.toUpperCase();

      this.hub.light(id).turnOn().then((status) => {
        if (status.response) {
          res.sendStatus(200);

          const isDevice = _.contains(deviceIDs, id, 0);
          let foundDevice: any;

          if (isDevice) {
            foundDevice = this.insteonAccessories.filter((item) => {
              return item.id == id;
            });
          }

          foundDevice = foundDevice[0];
          setTimeout(()=> {
            foundDevice.getStatus.call(foundDevice);
          }, 1000);

        } else {
          res.sendStatus(404);
        }
      });
    });

    this.app.get('/light/:id/off', (req, res) => {
      const id = req.params.id.toUpperCase();
      this.hub.light(id).turnOff().then((status) => {
        if (status.response) {
          res.sendStatus(200);

          const isDevice = _.contains(deviceIDs, id, 0);
          let foundDevice;

          if (isDevice) {
            foundDevice = this.insteonAccessories.filter((item) => {
              return item.id == id;
            });
          }

          foundDevice = foundDevice[0];
          foundDevice.getStatus.call(foundDevice);

        } else {
          res.sendStatus(404);
        }
      });
    });

    this.app.get('/light/:id/status', (req, res) => {
      const id = req.params.id;
      this.hub.light(id).level((err, level) => {
        res.json({
          'level': level,
        });
      });
    });

    this.app.get('/light/:id/level/:targetLevel', (req, res) => {
      const id = req.params.id;
      const targetLevel = req.params.targetLevel;

      this.hub.light(id).level(targetLevel).then((status) => {
        if (status.response) {
          res.sendStatus(200);

          const isDevice = _.contains(deviceIDs, id, 0);
          let foundDevice;

          if (isDevice) {
            foundDevice = this.insteonAccessories.filter((item: any) => {
              return item.id == id;
            });
          }

          foundDevice = foundDevice[0];
          foundDevice.getStatus.call(foundDevice);

        } else {
          res.sendStatus(404);
        }
      });
    });

    this.app.get('/scene/:group/on', (req, res) => {
      const group = parseInt(req.params.group);
      this.hub.sceneOn(group).then((status) => {
        if (status.aborted) {
          res.sendStatus(404);
        }
        if (status.completed) {
          res.sendStatus(200);

          /* const isDevice = _.contains(deviceIDs, id, 0);
          let foundDevice;

          if (isDevice) {
            foundDevice = this.accessories.filter((item) => {
              return item.id == id;
            });
          }

          foundDevice = foundDevice[0];
          foundDevice.getSceneState.call(foundDevice);
        */
        } else {
          res.sendStatus(404);
        }
      });
    });

    this.app.get('/scene/:group/off', (req, res) => {
      const group = parseInt(req.params.group);
      this.hub.sceneOff(group).then((status) => {
        if (status.aborted) {
          res.sendStatus(404);
        }
        if (status.completed) {
          res.sendStatus(200);
          /*
          const isDevice = _.contains(deviceIDs, id, 0);
          let foundDevice;

          if (isDevice) {
            foundDevice = this.accessories.filter((item) => {
              return item.id == id;
            });
          }

          foundDevice = foundDevice[0];
          foundDevice.getSceneState.call(foundDevice);
*/
        } else {
          res.sendStatus(404);
        }
      });
    });

    this.app.get('/links', (req, res) => {
      this.hub.links((err, links) => {
        res.json(links);
      });
    });

    this.app.get('/links/:id', (req, res) => {
      const id = req.params.id;
      this.hub.links(id, (err, links) => {
        res.json(links);
      });
    });

    this.app.get('/info/:id', (req, res) => {
      const id = req.params.id;
      this.hub.info(id, (err, info) => {
        res.json(info);
      });
    });

    this.app.get('/iolinc/:id/relay_on', (req, res) => {
      const id = req.params.id;
      this.hub.ioLinc(id).relayOn().then((status) => {
        if (status.response) {
          res.sendStatus(200);

          const isDevice = _.contains(deviceIDs, id, 0);
          let foundDevice;

          if (isDevice) {
            foundDevice = this.insteonAccessories.filter((item: any) => {
              return item.id == id;
            });
          }

          foundDevice = foundDevice[0];

          setTimeout(() => {
            foundDevice.getSensorStatus.call(foundDevice);
          }, 1000 * foundDevice.gdo_delay);

        } else {
          res.sendStatus(404);
        }
      });
    });

    this.app.get('/iolinc/:id/relay_off', (req, res) => {
      const id = req.params.id;
      this.hub.ioLinc(id).relayOff().then((status) => {
        if (status.response) {
          res.sendStatus(200);

          const isDevice = _.contains(deviceIDs, id, 0);
          let foundDevice;

          if (isDevice) {
            foundDevice = this.insteonAccessories.filter((item: any) => {
              return item.id == id;
            });
          }

          foundDevice = foundDevice[0];

          setTimeout(() => {
            foundDevice.getSensorStatus.call(foundDevice);
          }, 1000 * foundDevice.gdo_delay);

        } else {
          res.sendStatus(404);
        }
      });
    });

    this.app.get('/iolinc/:id/sensor_status', (req, res) => {
      const id = req.params.id;
      this.hub.ioLinc(id).status((err, status) => {
        res.json(status.sensor);
      });
    });

    this.app.get('/iolinc/:id/relay_status', (req, res) => {
      const id = req.params.id;
      this.hub.ioLinc(id).status((err, status) => {
        res.json(status.relay);
      });
    });


    this.app.get('/fan/:id/level/:targetLevel', (req, res) => {
      const id = req.params.id;
      const targetLevel = req.params.targetLevel;

      hub.light(id).fan(targetLevel).then((status) => {
        if (status.response) {
          res.sendStatus(200);

          const isDevice = _.contains(this.deviceIDs, id, 0);
          let foundDevice;

          if (isDevice) {
            foundDevice = this.insteonAccessories.filter((item) => {
              return item.id == id;
            });
          }

          foundDevice = foundDevice[0];
          foundDevice.getStatus.call(foundDevice);

        } else {
          res.sendStatus(404);
        }
      });
    });

    this.app.get('/fan/:id/status', (req, res) => {
      const id = req.params.id;
      hub.light(id).fan((err, level) => {
        res.json({
          'level': level,
        });
      });
    });
  }
}