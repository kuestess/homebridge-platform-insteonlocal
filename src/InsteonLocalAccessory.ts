/* eslint-disable no-case-declarations */
/* eslint-disable max-len */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { InsteonLocalPlatform } from './InsteonLocalPlatform';

import moment, { Moment } from 'moment';
import util from 'util';
import _ from 'underscore';
import insteonUtils from 'home-controller/lib/Insteon/utils';
const convertTemp = insteonUtils.convertTemp;

export class InsteonLocalAccessory {
  service: Service;
  private readonly log: any;
  private hub: any;
  private light: any;

  device: any;
  name: string;
  id: string;
  deviceType: string;
  dimmable: boolean;
  level: number;
  currentState: any;
  disabled: boolean;
  lastUpdate: Moment;
  refreshInterval: number;
  targetKeypadID: string;
  targetKeypadSixBtn: number;
  targetKeypadBtn: string;
  setTargetKeypadCount: number;
  lastCommand: Moment;
  levelTimeout;
  six_btn;
  keypadbtn;
  buttonMap: string;
  pollTimer: NodeJS.Timeout;
  iolinc: any;
  invert_sensor: unknown;
  groupMembers: any;
  groupID: any;
  momentary: any;
  gdo_delay: any;
  valve_delay: any;
  stateless: any;
  button: any;
  four_btn: any;
  position: any;
  disableBatteryStatus: any;
  house: any;
  unit: any;
  statusLowBattery: boolean;
  heartbeatTimer: NodeJS.Timeout;
  deadDeviceTimer: NodeJS.Timeout;
  leaksensor: any;
  motionsensor: any;
  motionDetected: boolean;
  door: any;
  targetState: unknown;
  accessories: Array<InsteonLocalAccessory>;
  handleRemoteEvent: any;
  serviceCO: any;
  thermostat: any;
  units: any;
  tempUnits: any;
  mode: string;
  currentTemp: any;
  targetTemp: any;
  refresh: number;

  constructor(
    private readonly platform: InsteonLocalPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.hub = platform.hub;
    this.log = this.platform.log;
    this.device = accessory.context.device;

    if(this.device.deviceID){
      this.id = this.device.deviceID.toUpperCase();
      this.id = this.id.trim().replace(/\./g, '');
    }

    this.dimmable = (this.device.dimmable == 'yes') ? true : false;
    this.name = this.device.name;
    this.deviceType = this.device.deviceType;
    this.refreshInterval = this.device.refresh || this.platform.refreshInterval;
    this.disabled = this.device.disabled || false;

    this.targetKeypadID = this.device.targetKeypadID || [];
    this.targetKeypadSixBtn = this.device.targetKeypadSixBtn || [];
    this.targetKeypadBtn = this.device.targetKeypadBtn || [];
    this.setTargetKeypadCount = 0;

    if(typeof this.device.groupMembers !== 'undefined'){
      const reg = /,|,\s/;
      this.groupMembers = this.device.groupMembers.split(reg);
    }

    if(this.id){
      this.id = this.id.trim().replace(/\./g, '');
    }

    this.accessory.on('identify', () =>{
      this.identify();
    });

    if (this.deviceType == 'scene') {
      this.groupID = this.device.groupID;
      this.keypadbtn = this.device.keypadbtn;
      this.six_btn = this.device.six_btn;
      this.momentary = this.device.momentary || false;
    }

    if (this.deviceType == 'keypad') {
      this.keypadbtn = typeof(this.device.keypadbtn) === 'string' ? this.device.keypadbtn : '?';
      this.six_btn = this.device.six_btn === true;
    }

    if (this.deviceType == 'iolinc') {
      this.gdo_delay = this.device.gdo_delay || 15;
      this.invert_sensor = this.device.invert_sensor || false;
    }

    if (this.deviceType == 'valve') {
      this.valve_delay = this.device.valve_delay || 5;
      this.invert_sensor = this.device.invert_sensor || false;
    }

    if (this.deviceType == 'remote') {
      this.button = this.device.remotebtn;
      this.stateless = this.device.stateless;
      this.four_btn = this.device.four_btn || false;
    }

    if (this.deviceType == 'outlet') {
      this.position = this.device.position || 'top';
    }

    if (['motionsensor', 'doorsensor', 'windowsensor', 'contactsensor', 'leaksensor'].includes(this.deviceType)) {
      this.disableBatteryStatus = this.device.disableBatteryStatus || false;
      this.invert_sensor = this.device.invert_sensor || false;
    }

    if (this.deviceType == 'x10') {
      this.house = this.device.house || 'A';
      this.unit = this.device.unit;
    }

    if (this.deviceType == 'thermostat') {
      //this.tempUnits = this.device.tempUnits; //Not currently used - determined from thermostat
    }

    if(this.refreshInterval > 0){
      this.hub.once('connect', () =>{
        if (['lightbulb', 'dimmer', 'switch', 'iolinc', 'scene', 'outlet', 'fan', 'shades', 'blinds', 'keypad'].includes(this.deviceType)) {
          setTimeout(() => {
            this.pollStatus();
          }, (1000 * this.refreshInterval));
        }
      },
      );
    }

    this.init();
  }

  init(){
    this.setAccessoryInformation();

    switch (this.deviceType) {
      case 'lightbulb':
      case 'dimmer':
        this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
        this.dimmable = true;
        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.setBrightnessLevel.bind(this));
        //this.service.getCharacteristic(Characteristic.On).on('set', this.setPowerState.bind(this))

        if (this.dimmable) {
          this.service.getCharacteristic(this.platform.Characteristic.Brightness).onSet(this.setBrightnessLevel.bind(this));
        }

        this.light = this.hub.light(this.id);
        this.light.emitOnAck = true;

        //Get initial state
        this.hub.once('connect', () => {
          this.getStatus.call(this);
        });

        break;

      case 'fan':
        this.service = this.accessory.getService(this.platform.Service.Fan) || this.accessory.addService(this.platform.Service.Fan);

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.setFanState.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).onSet(this.setFanState.bind(this));

        this.light = this.hub.light(this.id);

        this.light.on('turnOn', (group, level) =>{
          this.log.debug(this.name + ' turned on');
          this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
          this.getFanState.call(this);
        });

        this.light.on('turnOff', () =>{
          this.log.debug(this.name + ' turned off');
          this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
          this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(0);
        });

        //Get initial state
        this.hub.once('connect', () => {
          this.getFanState.call(this);
        });

        break;

      case 'switch':
        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.setPowerState.bind(this));

        this.light = this.hub.light(this.id);
        this.light.emitOnAck = true;

        this.hub.once('connect', () => {
          this.getStatus.call(this);
        });

        break;

      case 'scene':
        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
        this.dimmable = false;

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.setSceneState.bind(this));

        this.hub.once('connect', () => {
          if(this.id){
            this.getSceneState.call(this);
          }
        });

        break;

      case 'iolinc':
      case 'garage':
        this.service = this.accessory.getService(this.platform.Service.GarageDoorOpener) || this.accessory.addService(this.platform.Service.GarageDoorOpener);

        this.service.getCharacteristic(this.platform.Characteristic.ObstructionDetected).updateValue(false);
        this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState).onSet(this.setRelayState.bind(this));

        this.iolinc = this.hub.ioLinc(this.id);

        this.iolinc.on('sensorOn', () =>{
          this.log.debug(this.name + ' sensor is on. invert_sensor = ' + this.invert_sensor);

          if(this.invert_sensor == false || this.invert_sensor == 'false') { //Door Closed (non-inverted): No delay to action, since sensor isn't triggered until door is fully closed.
            this.log.debug(' >>> No Delayed Action <<<');
            actionDoorClosed();
          } else { //Door Open (inverted): Add delay to action, since sensor is triggered immediately upon door closing.
            setTimeout(() =>{
              this.log.debug(' >>> Delayed Action <<<');
              actionDoorOpen();
            }, 1000 * this.gdo_delay);
          }
        });

        this.iolinc.on('sensorOff', () =>{
          this.log.debug(this.name + ' sensor is off invert_sensor = ' + this.invert_sensor);

          if(this.invert_sensor == false || this.invert_sensor == 'false') { //Door Open (non-inverted): Add delay to action, since sensor is triggered immediately upon door opening.
            setTimeout(() =>{
              this.log.debug(' >>> Delayed Action <<<');
              actionDoorOpen();
            }, 1000 * this.gdo_delay);
          } else { //Door Closed (inverted): No delay to action, since sensor isn't triggered until door fully opens.
            this.log.debug(' >>> No Delayed Action <<<');
            actionDoorClosed();
          }
        });

        this.hub.once('connect', () => {
          this.getSensorStatus.call(this, () =>{/*do nothing for now*/});
        });

        const actionDoorClosed = () =>{
          this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState).updateValue(1);
          this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState).updateValue(1);
          this.currentState = true;
        };

        const actionDoorOpen = () =>{
          this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState).updateValue(0);
          this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState).updateValue(0);
          this.currentState = false;
        };

        break;

      case 'valve':
        this.service = this.accessory.getService(this.platform.Service.Valve) || this.accessory.addService(this.platform.Service.Valve);

        this.service.getCharacteristic(this.platform.Characteristic.Active).updateValue(0);
        this.service.getCharacteristic(this.platform.Characteristic.InUse).updateValue(0);
        this.service.getCharacteristic(this.platform.Characteristic.ValveType).updateValue(0);

        this.service.getCharacteristic(this.platform.Characteristic.Active).onSet(this.setRelayState.bind(this));

        this.iolinc = this.hub.ioLinc(this.id);

        this.hub.once('connect', () => {
          this.getSensorStatus.call(this, () =>{/*do nothing for now*/});
        });

        break;

      case 'leaksensor': {
        this.service = this.accessory.getService(this.platform.Service.LeakSensor) || this.accessory.addService(this.platform.Service.LeakSensor);

        this.service.getCharacteristic(this.platform.Characteristic.LeakDetected).updateValue(0); //Initialize as dry

        this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(0); //0=normal, 1=low
        this.statusLowBattery = false;

        const buffer = 300 * 1000; //5 minute buffer
        if(this.disableBatteryStatus == false){
          this.log.debug('Initializing heartbeat timer for ' + this.name);
          this.heartbeatTimer = setTimeout(() => {
            this.statusLowBattery = true;
            this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
          }, (1000*24*60*60 + buffer));
        }

        if(this.disableBatteryStatus == true){ //if battery status disabled, still notify when the device is dead
          this.log.debug('Initializing dead device timer for ' + this.name);
          this.deadDeviceTimer = setTimeout(() => {
            this.statusLowBattery = true;
            this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
          }, (1000*48*60*60 + buffer));
        }

        this.leaksensor = this.hub.leak(this.id);

        this.leaksensor.on('wet', () =>{
          this.log.debug(this.name + ' sensor is wet');
          this.service.getCharacteristic(this.platform.Characteristic.LeakDetected).updateValue(1); //wet
        });

        this.leaksensor.on('dry', () =>{
          this.log.debug(this.name + ' sensor is dry');
          this.service.getCharacteristic(this.platform.Characteristic.LeakDetected).updateValue(0); //dry
        });

        this.leaksensor.on('heartbeat', () =>{
          this.log.debug('Heartbeat from ' + this.name);

          if(this.disableBatteryStatus == false){
            clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = setTimeout(() => {
              this.statusLowBattery = true;
              this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
            }, (1000*24*60*60 + buffer));
          }

          if(this.disableBatteryStatus == true){
            clearTimeout(this.deadDeviceTimer);
            this.deadDeviceTimer = setTimeout(() => { //if battery status disabled, still notify when the device is dead
              this.statusLowBattery = true;
              this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
            }, (1000*48*60*60 + buffer));
          }
        });

        break;
      }
      case 'motionsensor': {
        this.service = this.accessory.getService(this.platform.Service.MotionSensor) || this.accessory.addService(this.platform.Service.MotionSensor);

        this.service.getCharacteristic(this.platform.Characteristic.MotionDetected).updateValue(0); //Initialize with no motion
        this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(0); //0=normal, 1=low
        this.statusLowBattery = false;

        const buffer = 300 * 1000; //5 minute buffer
        if(this.disableBatteryStatus == false){
          this.log.debug('Initializing heartbeat timer for ' + this.name);
          this.heartbeatTimer = setTimeout(() => {
            this.statusLowBattery = true;
            this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
          }, (1000*24*60*60 + buffer));
        }

        if(this.disableBatteryStatus == true){
          this.log.debug('Initializing dead device timer for ' + this.name);
          this.deadDeviceTimer = setTimeout(() => { //if battery status disabled, still notify when the device is dead
            this.statusLowBattery = true;
            this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
          }, (1000*48*60*60 + buffer));
        }

        this.motionsensor = this.hub.motion(this.id);

        this.motionsensor.on('motion', () =>{
          this.log.debug(this.name + ' is on');
          this.motionDetected = true;
          this.service.getCharacteristic(this.platform.Characteristic.MotionDetected).updateValue(1);
        });

        this.motionsensor.on('clear', () =>{
          this.log.debug(this.name + ' is off');
          this.motionDetected = false;
          this.service.getCharacteristic(this.platform.Characteristic.MotionDetected).updateValue(0);
        });

        this.motionsensor.on('heartbeat', () =>{
          this.log.debug('Heartbeat from ' + this.name);

          if(this.disableBatteryStatus == false){
            clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = setTimeout(() => {
              this.statusLowBattery = true;
              this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
            }, (1000*24*60*60 + buffer));
          }

          if(this.disableBatteryStatus == true){
            clearTimeout(this.deadDeviceTimer);
            this.deadDeviceTimer = setTimeout(() => { //if battery status disabled, still notify when the device is dead
              this.statusLowBattery = true;
              this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
            }, (1000*48*60*60 + buffer));
          }
        });

        break;
      }
      case 'doorsensor':
      case 'windowsensor':
      case 'contactsensor': {
        this.service = this.accessory.getService(this.platform.Service.ContactSensor) || this.accessory.addService(this.platform.Service.ContactSensor);

        this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).updateValue(0); //Initialize closed
        this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(0); //0=normal, 1=low
        this.statusLowBattery = false;

        const buffer = 300 * 1000; //5 minute buffer
        if(this.disableBatteryStatus == false){
          this.log.debug('Initializing heartbeat timer for ' + this.name);
          this.heartbeatTimer = setTimeout(() => {
            this.statusLowBattery = true;
            this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
          }, (1000*24*60*60 + buffer));
        }

        if(this.disableBatteryStatus == true){
          this.log.debug('Initializing dead device timer for ' + this.name);
          this.deadDeviceTimer = setTimeout(() => { //if battery status disabled, still notify when the device is dead
            this.statusLowBattery = true;
            this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
          }, (1000*48*60*60 + buffer));
        }

        this.door = this.hub.door(this.id);

        this.door.on('opened', () =>{
          this.log.debug(this.name + ' is open');
          this.log.debug('Invert sensor: ' + this.invert_sensor);

          if(this.invert_sensor == 'false' || this.invert_sensor == false) {
            this.currentState = true;
            this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).updateValue(1);
          } else if(this.invert_sensor == true || this.invert_sensor == 'true') {
            this.currentState = false;
            this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).updateValue(0);
          }
        });

        this.door.on('closed', () =>{
          this.log.debug(this.name + ' is closed');
          this.log.debug('Invert sensor: ' + this.invert_sensor);

          if(this.invert_sensor == 'false' || this.invert_sensor == false) {
            this.currentState = false;
            this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).updateValue(0);
          } else if(this.invert_sensor == true || this.invert_sensor == 'true') {
            this.currentState = true;
            this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).updateValue(1);
          }
        });

        this.door.on('heartbeat', () =>{
          this.log.debug('Heartbeat from ' + this.name);

          if(this.disableBatteryStatus == false){
            clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = setTimeout(() => {
              this.statusLowBattery = true;
              this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
            }, (1000*24*60*60 + buffer));
          }

          if(this.disableBatteryStatus == true){
            clearTimeout(this.deadDeviceTimer);
            this.deadDeviceTimer = setTimeout(() => { //if battery status disabled, still notify when the device is dead
              this.statusLowBattery = true;
              this.service.getCharacteristic(this.platform.Characteristic.StatusLowBattery).updateValue(1); //0=normal, 1=low
            }, (1000*48*60*60 + buffer));
          }
        });

        break;
      }
      case 'remote':
        if (this.stateless) {
          this.service = this.accessory.getService(this.platform.Service.StatelessProgrammableSwitch) || this.accessory.addService(this.platform.Service.StatelessProgrammableSwitch);
        } else {
          this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

        }

        this.dimmable = false;

        break;

      case 'outlet':
        this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);

        this.service.getCharacteristic(this.platform.Characteristic.OutletInUse).updateValue(true);

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.setOutletState.bind(this));

        this.dimmable = false;

        this.hub.once('connect', () => {
          this.getOutletState.call(this);
        });

        break;

      case 'shades':
      case 'blinds':
        this.service = this.accessory.getService(this.platform.Service.WindowCovering) || this.accessory.addService(this.platform.Service.WindowCovering);

        this.service.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(2); //stopped

        this.service.getCharacteristic(this.platform.Characteristic.TargetPosition).onSet(this.setPosition.bind(this));

        this.light = this.hub.light(this.id);

        this.hub.once('connect', () => {
          this.getPosition.call(this);
        });

        break;

      case 'keypad':
        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.setKeypadState.bind(this));

        this.hub.once('connect', () => {
          this.getSceneState.call(this);
        });

        break;

      case 'smoke':
        this.service = this.accessory.getService(this.platform.Service.SmokeSensor) || this.accessory.addService(this.platform.Service.SmokeSensor);

        this.service.getCharacteristic(this.platform.Characteristic.SmokeDetected).updateValue(0); //no smoke

        this.service = this.accessory.getService(this.platform.Service.CarbonMonoxideSensor) || this.accessory.addService(this.platform.Service.CarbonMonoxideSensor);
        this.service.getCharacteristic(this.platform.Characteristic.CarbonMonoxideDetected).updateValue(0); //no CO

        break;

      case 'x10':
        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

        this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.setX10PowerState.bind(this));
        this.light = this.hub.x10(this.house, this.unit);

        break;

      case 'thermostat':
        this.service = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat);

        this.thermostat = this.hub.thermostat(this.id);
        this.thermostat.monitor(true);

        const refresh = this.refresh || 5*60*1000; //set to 5min unless 'refresh' defined at device level

        this.hub.once('connect', () => {
          this.getThermostatStatus.call(this);
          //get temp every `refresh` minutes (or 5min)
          setInterval(()=>{
            this.getTemperature();
          }, refresh);
        });

        this.thermostat.on('cooling', () =>{
          this.log.debug('Thermostat ' + this.name + ' is cooling');
          this.mode = 'cool';
          this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).updateValue(2);
          this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).updateValue(2);
        });

        this.thermostat.on('heating', () =>{
          this.log.debug('Thermostat ' + this.name + ' is heating');
          this.mode = 'heat';
          this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).updateValue(1);
          this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).updateValue(1);
        });

        this.thermostat.on('off', () =>{
          this.log.debug('Thermostat ' + this.name + ' is off');
          this.mode = 'off';
          this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).updateValue(0);
          this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).updateValue(0);
        });

        this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
          .onSet(this.setThermostatMode.bind(this));

        this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
          .onSet(this.setTemperature.bind(this));

        break;
    }
  }

  setAccessoryInformation() {
    let deviceMAC;

    if(this.id){
      deviceMAC = this.id.substr(0, 2) + '.' + this.id.substr(2, 2) + '.' + this.id.substr(4, 2);
    } else {
      deviceMAC = this.name; //Device without device id (ie, scene), set serial num to the name
    }
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Insteon')
      .setCharacteristic(this.platform.Characteristic.Model, 'Insteon')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, deviceMAC);
  }

  async setBrightnessLevel(level: CharacteristicValue) {

    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();

    const now = moment();
    let delta;

    if(typeof this.lastCommand === 'undefined'){
      this.lastCommand = now;
      delta = -1;
    } else {
      delta = now.diff(this.lastCommand, 'milliseconds');
    }

    const debounceTimer = 600;

    this.log.debug('Command for ' + this.name + ': ' + level + ', time: ' + this.lastCommand + ', delta: ' + delta);

    if (level == this.currentState) {
      this.log.debug('Discard on for ' + this.name + ' already at commanded state');
      return;
    } else if (level === true && delta >= 0 && delta <= 50) {
      this.log.debug('Discard on for ' + this.name + ', sent too close to dim');
      return;
    } else if (level === true) {
      level = 100;
    } else if (level === false) {
      level = 0;
    }

    this.lastCommand = now;

    clearTimeout(this.levelTimeout);

    this.levelTimeout = setTimeout(()=> {
      setLevel(level);
    }, debounceTimer);

    const setLevel = (level) =>{
      this.hub.cancelPending(this.id);

      this.lastCommand = now;

      this.log('Setting level of ' + this.name + ' to ' + level + '%');

      let hexLevel = Math.ceil(level * (255/100)).toString(16);
      hexLevel = '00'.substr(hexLevel.length) + hexLevel;
      const timeout = 0;

      const cmd = {
        cmd1: '11',
        cmd2: hexLevel,
      };

      this.hub.directCommand(this.id, cmd, timeout, (error, status) => {
        if(error){
          this.log('Error setting level of ' + this.name);
          this.getStatus.call(this);
          return;
        }

        this.level = level;
        this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.level);

        if (this.level > 0) {
          this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
          this.currentState = true;
        } else if (this.level == 0) {
          this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
          this.currentState = false;
        }

        this.log.debug(this.name + ' is ' + (this.currentState ? 'on' : 'off') + ' at ' + level + '%');
        this.lastUpdate = moment();

        //Check if any target keypad button(s) to process
        if(this.targetKeypadID.length > 0){
          this.log.debug(this.targetKeypadID.length + ' target keypad(s) found for ' + this.name);

          for(let temp = 0; temp < this.targetKeypadID.length; temp++){
            this.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + this.targetKeypadID[temp] + ']');
          }

          let count;
          for(count = 0; count < this.targetKeypadID.length; count++){
            //this.log.debug('<Check point 0> count = ' + count)

            this.setTargetKeypadCount = count;

            //Async-Wait function to insure multiple keypads are processed in order
            const run = async () =>{
              const promise = new Promise((resolve, reject) => this.setTargetKeypadBtn.call(this));
              const result = await promise; // wait until the promise resolves
              return; // "done!"
            };

            run();
          }
          return;
        }
        return;
      });
    };
  }

  async getStatus() {
    let currentState;

    this.platform.checkHubConnection();

    if(this.deviceType == 'scene' || this.deviceType == 'keypad'){
      this.getSceneState.call(this);
      return;
    }

    this.log.info('Getting status for ' + this.name);

    this.light.level((err, level) => {
      if(err || level == null || typeof level === 'undefined'){
        this.log('Error getting power state of ' + this.name);
        return;
      } else {
        if (level > 0) {
          currentState = true;
        } else {
          currentState = false;
        }

        this.currentState = currentState;
        this.level = level;
        this.log.debug(this.name + ' is ' + (currentState ? 'on' : 'off') + ' at ' + level + '%');
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentState);
        if (this.dimmable) {
          this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.level);
        }
        this.lastUpdate = moment();
        return;
      }
    });
  }

  getSceneState() {
    const timeout = 0;

    const eight_buttonArray = {
      'A': 0b00000001,
      'B': 0b00000010,
      'C': 0b00000100,
      'D': 0b00001000,
      'E': 0b00010000,
      'F': 0b00100000,
      'G': 0b01000000,
      'H': 0b10000000};

    const six_buttonArray = {
      'A': eight_buttonArray['C'],
      'B': eight_buttonArray['D'],
      'C': eight_buttonArray['E'],
      'D': eight_buttonArray['F'],
      'ON': eight_buttonArray['A'] | eight_buttonArray['B'],
      'OFF': eight_buttonArray['G'] | eight_buttonArray['H']};

    let buttonArray;

    this.platform.checkHubConnection();

    if(this.six_btn == true){
      buttonArray = six_buttonArray;
    } else {
      buttonArray = eight_buttonArray;
    }

    let cmd;

    if(this.six_btn == true){
      if (this.keypadbtn == 'ON') {
        cmd = {
          cmd1: '19',
          cmd2: '00',
        };
      } else {
        cmd = {
          cmd1: '19',
          cmd2: '01',
        };
      }
    } else { //eight button
      if (this.keypadbtn == 'A') {
        cmd = {
          cmd1: '19',
          cmd2: '00',
        };
      } else {
        cmd = {
          cmd1: '19',
          cmd2: '01',
        };
      }
    }

    this.log('Getting status for ' + this.name);

    this.hub.directCommand(this.id, cmd, timeout, (err, status)=> {
      if(err || status == null || typeof status === 'undefined' || typeof status.response === 'undefined' || typeof status.response.standard === 'undefined' || status.success == false){
        this.log('Error getting power state of ' + this.name);
      } else {

        if (this.keypadbtn == 'ON' || (this.six_btn == false && this.keypadbtn == 'A') || (typeof this.six_btn === 'undefined' && this.keypadbtn == 'A')) {
          this.level = parseInt(status.response.standard.command2, 16);
          if (this.level > 0) {
            this.currentState = true;
          } else {
            this.currentState = false;
          }
          this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentState);
          this.lastUpdate = moment();
        }

        const hexButtonMap = status.response.standard.command2;
        let binaryButtonMap = parseInt(hexButtonMap, 16).toString(2);
        binaryButtonMap = '00000000'.substr(binaryButtonMap.length) + binaryButtonMap; //pad to 8 digits
        this.buttonMap = binaryButtonMap;
        this.log.debug('Binary map: ' + this.buttonMap + ' (' + this.name + ')');

        const decButtonMap = parseInt(binaryButtonMap, 2);
        const buttonNumber = buttonArray[this.keypadbtn];
        let buttonState;

        if(decButtonMap & buttonNumber) {
          buttonState = true;
        } else {
          buttonState = false;
        }
        this.log.debug('Button ' + this.keypadbtn + ' state is ' + ((buttonState == true) ? 'on' : 'off'));

        if (buttonState ==true) {
          this.currentState = true;
          this.level = 100;
        } else {
          this.currentState = false;
          this.level = 0;
        }

        this.log.debug(this.name + ' is ' + (this.currentState ? 'on' : 'off'));
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentState);
        if (this.dimmable) {
          this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.level);
        }
        this.lastUpdate = moment();
      }
    });
  }

  pollStatus() {
    const now = moment();
    const lastUpdate = this.lastUpdate;
    const delta = now.diff(lastUpdate, 'seconds');

    if (delta < this.refreshInterval) {
      clearTimeout(this.pollTimer);
      this.pollTimer = setTimeout(() => {
        this.pollStatus.call(this);
      }, 1000 * (this.refreshInterval - delta));
    } else {

      this.log('Polling status for ' + this.name + '...');

      this.platform.checkHubConnection();

      switch (this.deviceType) {
        case 'lightbulb':
        case 'dimmer':
          this.getStatus.call(this);
          setTimeout(() => {
            this.pollStatus.call(this);
          }, (1000 * this.refreshInterval));
          break;

        case 'switch':
          this.getStatus.call(this);
          setTimeout(() => {
            this.pollStatus.call(this);
          }, (1000 * this.refreshInterval));
          break;

        case 'iolinc':
          this.getSensorStatus.call(this, ()=>{/*do nothing for now*/});
          setTimeout(() => {
            this.pollStatus.call(this);
          }, (1000 * this.refreshInterval));
          break;

        case 'scene':
          this.getSceneState.call(this);
          setTimeout(() => {
            this.pollStatus.call(this);
          }, (1000 * this.refreshInterval));
          break;

        case 'fan':
          this.getFanState.call(this);
          setTimeout(() => {
            this.pollStatus.call(this);
          }, (1000 * this.refreshInterval));
          break;

        case 'outlet':
          this.getOutletState.call(this);
          setTimeout(() => {
            this.pollStatus.call(this);
          }, (1000 * this.refreshInterval));
          break;
      }
    }
  }

  getOutletState() {
    const timeout = 0;
    const cmd = {
      cmd1: '19',
      cmd2: '01',
    };

    this.platform.checkHubConnection();

    this.log('Getting power state for ' + this.name);

    this.hub.directCommand(this.id, cmd, timeout, (error, status) => {
      if(error || typeof status === 'undefined' || typeof status.response === 'undefined' || typeof status.response.standard === 'undefined' || status.success == false){
        this.log('Error getting power state of ' + this.name);
        return;
      }

      //this.log.debug('Outlet status: ' + util.inspect(status))

      if (status.success) {
        const command2 = status.response.standard.command2.substr(1, 1); //0 = both off, 1 = top on, 2 = bottom on, 3 = both on

        switch (command2) {
          case '0':
            this.currentState = false;
            break;

          case '1':
            if(this.position =='bottom'){
              this.currentState = false;
            } else {
              this.currentState = true;
            }
            break;

          case '2':
            if(this.position =='bottom'){
              this.currentState = true;
            } else {
              this.currentState = false;
            }
            break;

          case '3':
            this.currentState = true;
            break;
        }

        this.log.debug(this.name + ' is ' + (this.currentState ? 'on' : 'off'));
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentState);
        this.lastUpdate = moment();
      }
    });
  }

  getFanState() {
    let currentState;

    this.platform.checkHubConnection();

    this.log('Getting state for ' + this.name);

    this.light.fan((error, state) => {
      if(error || typeof state === 'undefined'){
        this.log('Error getting power state of ' + this.name);
        return;
      } else {
        switch(state) {
          case 'off':
            this.currentState = false;
            this.level = 0;

            break;

          case 'low':
            this.currentState = true;
            this.level = 33;

            break;

          case 'medium':
            this.currentState = true;
            this.level = 66;

            break;

          case 'high':
            this.currentState = true;
            this.level = 100;

            break;
        }

        this.log.debug(this.name + ' is ' + (this.currentState ? 'on' : 'off') + ' at ' + this.level + ' %');

        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentState);
        this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(this.level); //value from 1 to 100
      }
    });
  }

  getSensorStatus(callback) {
    this.platform.checkHubConnection();

    this.log.info('Getting sensor state for ' + this.name);

    this.iolinc.status((error, status)=> {
      if (error || status == null || typeof status === 'undefined' || typeof status.sensor === 'undefined') {
        return;
      } else {
        this.log.debug('Invert sensor: ' + this.invert_sensor);
        if(this.invert_sensor == 'false' || this.invert_sensor == false) {
          this.currentState = (status.sensor == 'on') ? true : false;
        } else if(this.invert_sensor == true || this.invert_sensor == 'true') {
          this.currentState = (status.sensor == 'off') ? true : false;
        }

        this.log.debug(this.name + ' sensor is ' + status.sensor + ', currentState: ' + this.currentState);

        if (this.deviceType == 'iolinc') {
          this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState).updateValue(this.currentState);
          this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState).updateValue(this.currentState);
        } else {
          (
            this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.currentState)
          );
        }

        this.lastUpdate = moment();
        callback();
      }
    });
  }

  identify() {
    this.log.debug('Sending beep command to ' + this.name);
    this.hub.directCommand(this.id, '30');
  }

  setFanState (level) {
    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();

    this.hub.cancelPending(this.id);

    const now = moment();
    let delta;

    if(typeof this.lastCommand === 'undefined'){
      this.lastCommand = now;
      delta = -1;
    } else {
      delta = now.diff(this.lastCommand, 'milliseconds');
    }

    const debounceTimer = 600;

    if (level == this.currentState) {
      this.log.debug('Discard on, already at commanded state');
      return;
    } else if (level === true && delta >= 0 && delta <= 50) {
      this.log.debug('Discard on, sent too close to dim');
      return;
    }

    this.lastCommand = now;

    clearTimeout(this.levelTimeout);

    const setFanLevel = (level ) =>{
      let targetLevel;

      if(typeof level === 'number'){
        this.level = level;

        if (level == 0){
          targetLevel = 'off';
        } else if (level <= 33) {
          targetLevel = 'low';
        } else if (level > 66) {
          targetLevel = 'high';
        } else {
          targetLevel = 'medium';
        }
      } else if(typeof level === 'boolean'){
        if (level == false){
          targetLevel = 'off';
          this.level = 0;
        } else if (level == true){
          targetLevel = 'on';
          this.level = 100;
        }
      }

      this.log('Setting speed of ' + this.name + ' to ' + targetLevel + ' (' + level + '%)');

      this.light.fan(targetLevel).then((status)=> {
        //this.log.debug('Status: ' + util.inspect(status))
        if (status.success) {
          this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed).updateValue(this.level);

          if (this.level > 0) {
            this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
            this.currentState = true;
          } else if (this.level == 0) {
            this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
            this.currentState = false;
          }

          this.log.debug(this.name + ' is ' + (this.currentState ? 'on' : 'off') + ' at ' + targetLevel + ' (' + level + '%)');
          this.lastUpdate = moment();
          return;

        } else {
          this.log('Error setting level of ' + this.name);
          return;
        }
      });
    };

    this.levelTimeout = setTimeout(()=> {
      setFanLevel(level);
    }, debounceTimer);

    return;
  }

  setPowerState(state) {
    const powerOn = state ? 'on' : 'off';

    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();

    if (state !== this.currentState) {
      this.log('Setting power state of ' + this.name + ' to ' + powerOn);
      if (state) {
        setTimeout(()=> {
          this.light.turnOn().then((status) => {
            setTimeout(()=> {
              if (status.success) { //if command actually worked, do nothing
              //do nothing
              } else { //if command didn't work, check status to see what happened and update homekit
                this.log('Error setting power state of ' + this.name + ' to ' + powerOn);
                this.getStatus.call(this);
              }
            }, 0);
          });
        }, 800);

        //assume that the command worked and report back to homekit
        if (this.dimmable) {
          this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(100);
        }
        this.level = 100;
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
        this.currentState = true;
        this.lastUpdate = moment();

        this.getGroupMemberStatus();

        //Check if any target keypad button(s) to process
        if(this.targetKeypadID.length > 0){
          this.log.debug(this.targetKeypadID.length + ' target keypad(s) found for ' + this.name);

          for(let temp = 0; temp < this.targetKeypadID.length; temp++){
            this.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + this.targetKeypadID[temp] + ']');
          }

          let count;

          for(count = 0; count < this.targetKeypadID.length; count++){
            //this.log.debug('<Check point 0> count = ' + count)

            this.setTargetKeypadCount = count;

            //Async-Wait function to insure multiple keypads are processed in order
            const run = async () => {
              const promise = new Promise((resolve, reject) => this.setTargetKeypadBtn.call(this));
              const result = await promise; // wait until the promise resolves
              return; // "done!"
            };

            run();
          }
        }
        return;
      } else {
        this.light.turnOff().then((status) => {
          setTimeout(()=> {
            if (status.success) { //if command actually worked, do nothing
              //do nothing
            } else { //if command didn't work, check status to see what happened and update homekit
              this.log('Error setting power state of ' + this.name + ' to ' + powerOn);
              this.getStatus.call(this);
            }
          }, 0);
        });

        if (this.dimmable) {
          this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(0);
        }
        this.level = 0;
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
        this.currentState = false;
        this.lastUpdate = moment();

        this.getGroupMemberStatus();

        //Check if any target keypad button(s) to process
        if(this.targetKeypadID.length > 0){
          this.log.debug(this.targetKeypadID.length + ' target keypad(s) found for ' + this.name);

          for(let temp = 0; temp < this.targetKeypadID.length; temp++){
            this.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + this.targetKeypadID[temp] + ']');
          }

          let count: number;

          for(count = 0; count < this.targetKeypadID.length; count++){
            //this.log.debug('<Check point 0> count = ' + count)

            this.setTargetKeypadCount = count;

            //Async-Wait function to insure multiple keypads are processed in order
            const run = async () => {
              const promise = new Promise((resolve, reject) => this.setTargetKeypadBtn.call(this));
              const result = await promise; // wait until the promise resolves
              return; // "done!"
            };

            run();
          }
        }
        return;
      }
    } else {
      this.currentState = state;
      this.lastUpdate = moment();
      return;
    }
  }

  setTargetKeypadBtn (callback?) {
    const timeout = 0;

    const eight_buttonArray = {
      'A': 7,
      'B': 6,
      'C': 5,
      'D': 4,
      'E': 3,
      'F': 2,
      'G': 1,
      'H': 0,
    };

    const six_buttonArray = {
      'A': eight_buttonArray['C'],
      'B': eight_buttonArray['D'],
      'C': eight_buttonArray['E'],
      'D': eight_buttonArray['F'],
    };

    let buttonArray;
    const index1 = this.setTargetKeypadCount;

    this.log(' also setting target keypad [' + this.targetKeypadID[index1] + '] button [' + this.targetKeypadBtn[index1] + '] to ' + this.currentState);
    //this.log.debug('<Check point 1> index1 = ' + index1)

    this.platform.checkHubConnection();

    const getButtonMap = (callback) => {
      const command = {
        cmd1: '19',
        cmd2: '01',
      };

      //this.log.debug('<Check point 2> index1 = ' + index1)
      this.log.debug(' Reading button map for target keypad [' + this.targetKeypadID[index1] + ']');

      this.hub.directCommand(this.targetKeypadID[index1], command, timeout, (err, status)=> {
        if(err || status == null || typeof status === 'undefined' || typeof status.response === 'undefined'
        || typeof status.response.standard === 'undefined' || status.success == false){
          this.log('Error getting button states for target keypad [' + this.targetKeypadID[index1] + ']');
          this.log.debug('Err: ' + util.inspect(err));
          return;
        } else {
          const hexButtonMap = status.response.standard.command2;
          let binaryButtonMap = parseInt(hexButtonMap, 16).toString(2);
          binaryButtonMap = '00000000'.substr(binaryButtonMap.length) + binaryButtonMap; //pad to 8 digits
          this.buttonMap = binaryButtonMap;

          this.log.debug(' Current button map: ' + binaryButtonMap);
          //this.log.debug('<Check point 3> index1 = ' + index1)

          callback();
        }
      });
    };

    getButtonMap(()=> {
      const currentButtonMap = this.buttonMap; //binary button states from getButtonMap

      //this.log.debug('<Check point 4> index1 = ' + index1)

      if(this.targetKeypadSixBtn[index1] == true){
        buttonArray = six_buttonArray;
        this.log.debug(' Using 6-button keypad layout');
      } else {
        buttonArray = eight_buttonArray;
        this.log.debug(' Using 8-button keypad layout');
      }

      const buttonNumber = buttonArray[this.targetKeypadBtn[index1]];

      this.log.debug(' Target button: ' + this.targetKeypadBtn[index1]);
      this.log.debug(' Button number: ' + buttonNumber);

      const binaryButtonMap = currentButtonMap.substring(0, buttonNumber) +
              (this.currentState ? '1' : '0') +
              currentButtonMap.substring(buttonNumber+1);

      this.log.debug(' New binary button map: ' + binaryButtonMap);

      const buttonMap = ('00'+parseInt(binaryButtonMap, 2).toString(16)).substr(-2).toUpperCase();

      //this.log.debug(' New hex value: ' + buttonMap)

      const cmd = {
        cmd1: '2E',
        cmd2: '00',
        extended: true,
        userData: ['01', '09', buttonMap],
        isStandardResponse: true,
      };

      this.hub.directCommand(this.targetKeypadID[index1], cmd, timeout, (err, status)=> {

        //this.log.debug('<Check point 5> index1 = ' + index1)

        if(err || status == null || typeof status === 'undefined' || typeof status.response === 'undefined'
        || typeof status.response.standard === 'undefined' || status.success == false){

          this.log('Error setting button state of target keypad [' + this.targetKeypadID[index1] + ']');
          this.log.debug('Err: ' + util.inspect(err));

          if (typeof callback !== 'undefined') {
            callback(err);
            return 1;
          } else {
            return 1;
          }
        } else {
          this.lastUpdate = moment();
          this.buttonMap = binaryButtonMap;

          if (typeof callback !== 'undefined') {
            callback(null);
            return 1;
          } else {
            return 1;
          }
        }
      });

    });
  }

  getGroupMemberStatus (){
    const deviceIDs = this.platform.deviceIDs;

    if(typeof this.groupMembers === 'undefined') {
      this.log.debug('No group members defined for ' + this.name);
      return;
    }

    this.groupMembers.forEach((deviceID) =>{
      if (/^[0-9a-fA-F]{6}$/.test(deviceID)){ //group member defined by id
        const isDefined = _.contains(deviceIDs, deviceID.toUpperCase(), 0);
        if(isDefined){
          const groupDevice = this.platform.insteonAccessories.filter((item) => {
            return (item.id == deviceID.toUpperCase());
          });

          const theGroupDevice = groupDevice[0];

          this.log('Getting status of scene device ' + theGroupDevice.name);
          this.log.debug('Group device type ' + theGroupDevice.deviceType);
          //Add slight delay to get correct status and ensure device is not mid-dim
          setTimeout(()=> {
            theGroupDevice.getStatus.call(theGroupDevice);
          }, 2000);
        }
      } else { //group member defined by name
        this.log.debug('Group device is a name...');
        const namedDev = this.platform.insteonAccessories.filter((item) => {
          return (item.name == deviceID);
        });

        const theNamedDev = namedDev[0];
        this.log.debug('Found matching device with id ' + deviceID);
        this.log('Getting status of scene device ' + theNamedDev.name);
        setTimeout(()=> {
          theNamedDev.getStatus.call(theNamedDev);
        }, 2000);
      }
    });
  }

  setSceneState (state) {
    const powerOn = state ? 'on' : 'off';
    const groupID = parseInt(this.groupID);

    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();

    this.log('Setting power state of ' + this.name + ' to ' + powerOn);

    if (state) {
      this.hub.sceneOn(groupID).then((status) => {
        if (status.completed) {
          this.level = 100;
          this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
          this.currentState = true;
          this.lastUpdate = moment();

          this.getGroupMemberStatus();

          this.log.debug ('Scene is set to momentary: ' + this.momentary);
          if (this.momentary) {
            setTimeout(()=> {
              this.level = 0;
              this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
              this.currentState = false;
            }, 2000);
          }
          return;
        } else {
          this.log('Error setting power state of ' + this.name + ' to ' + powerOn);
          return;
        }
      });
    } else {
      this.hub.sceneOff(groupID).then((status) => {
        if (status.completed) {
          this.level = 0;
          this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
          this.currentState = false;
          this.lastUpdate = moment();

          this.getGroupMemberStatus();

          return;
        } else {
          this.log('Error setting power state of ' + this.name + ' to ' + powerOn);
          return;
        }
      });
    }
  }

  setRelayState(state) {
    //0=open 1=close
    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();

    this.log('Setting ' + this.name + ' relay to ' + state);

    if (state !== this.currentState){
      this.iolinc.relayOn().then((status) =>{
        if (status.success) {
          if (this.deviceType == 'iolinc') {
            this.targetState = (this.currentState == 0) ? true : false;
            this.log(' >>> New target state is ' + this.targetState + ((this.targetState == 0) ? ' (Open)' : ' (Closed)'));
            return;
          } else if (this.deviceType == 'valve') {
            this.currentState = (this.currentState == 0) ? true : false;
            this.service.getCharacteristic(this.platform.Characteristic.Active).updateValue(this.currentState);
            this.service.getCharacteristic(this.platform.Characteristic.InUse).updateValue(this.currentState);
            this.log('Setting ' + this.name + ' state to ' + this.currentState);

            setTimeout(() => {
              this.getSensorStatus(() =>{
                this.lastUpdate = moment();
                this.service.getCharacteristic(this.platform.Characteristic.Active).updateValue(0);
                this.service.getCharacteristic(this.platform.Characteristic.InUse).updateValue(0);
                return;
              });
            }, 1000 * this.valve_delay);
          }
        } else {
          this.log('Error setting relay state of ' + this.name + ' to ' + state);
          return;
        }
      });
    } else {
      this.log(this.name + ' is already at commanded state');
      return;
    }
  }

  getPosition() { //get position for shades/blinds

    this.platform.checkHubConnection();

    this.log('Getting status for ' + this.name);

    this.light.level((err, level) => {
      if(err || level == null || typeof level === 'undefined'){
        this.log('Error getting power state of ' + this.name);
        return;
      } else {

        this.level = level;
        this.log.debug(this.name + ' is set to ' + level + '%');

        this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(this.level);
        this.service.getCharacteristic(this.platform.Characteristic.TargetPosition).updateValue(this.level);
        this.lastUpdate = moment();

        return;
      }
    });
  }

  setOutletState(state) {
    const powerOn = state ? 'on' : 'off';

    let cmd;
    const timeout = 0;

    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();

    this.log('Setting power state of ' + this.name + ' to ' + powerOn);

    if (state) { //state = true = on
      if(this.position == 'bottom') {
        cmd = {
          extended: true,
          cmd1: '11',
          cmd2: 'FF',
          userData: ['02'],
          isStandardResponse: true,
        };
      } else {
        cmd = {
          cmd1: '11',
          cmd2: 'FF',
        };
      }

      this.hub.directCommand(this.id, cmd, timeout, (error, status) => {
        if(error || status == null || typeof status === 'undefined' || typeof status.response === 'undefined'){
          this.log('Error getting power state of ' + this.name);
          this.log.debug('Error: ' + util.inspect(error));

          return;
        } else {
          if (status.success) {
            this.currentState = true;
            this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
            this.lastUpdate = moment();

            //Check if any target keypad button(s) to process
            if(this.targetKeypadID.length > 0){
              this.log.debug(this.targetKeypadID.length + ' target keypad(s) found for ' + this.name);

              for(let temp = 0; temp < this.targetKeypadID.length; temp++){
                this.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + this.targetKeypadID[temp] + ']');
              }

              let count;

              for(count = 0; count < this.targetKeypadID.length; count++){
                //this.log.debug('<Check point 0> count = ' + count)

                this.setTargetKeypadCount = count;

                //Async-Wait function to insure multiple keypads are processed in order
                const run = async () => {
                  const promise = new Promise((resolve, reject) => this.setTargetKeypadBtn.call(this));
                  const result = await promise; // wait until the promise resolves
                  return; // "done!"
                };
                run();
              }
            }
            return;
          }
        }
      });
    } else { //state = false = off
      if(this.position == 'bottom') {
        cmd = {
          extended: true,
          cmd1: '13',
          cmd2: '00',
          userData: ['02'],
          isStandardResponse: true,
        };
      } else {
        cmd = {
          cmd1: '13',
          cmd2: '00',
        };
      }

      this.hub.directCommand(this.id, cmd, timeout, (error, status) => {
        if(error || status == null || typeof status === 'undefined' || typeof status.response === 'undefined'){
          this.log('Error getting power state of ' + this.name);
          this.log.debug('Error: ' + util.inspect(error));
          return;
        } else {
          if (status.success) {
            this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
            this.currentState = false;
            this.lastUpdate = moment();

            //Check if any target keypad button(s) to process
            if(this.targetKeypadID.length > 0){
              this.log.debug(this.targetKeypadID.length + ' target keypad(s) found for ' + this.name);

              for(let temp = 0; temp < this.targetKeypadID.length; temp++){
                this.log.debug(' targetKeypadID[' + temp + '] = ' + '[' + this.targetKeypadID[temp] + ']');
              }

              let count;

              for(count = 0; count < this.targetKeypadID.length; count++){
                //this.log.debug('<Check point 0> count = ' + count)

                this.setTargetKeypadCount = count;

                //Async-Wait function to insure multiple keypads are processed in order
                const run = async () => {
                  const promise = new Promise((resolve, reject) => this.setTargetKeypadBtn.call(this));
                  const result = await promise; // wait until the promise resolves
                  return; // "done!"
                };
                run();
              }
            }

            return;
          }
        }
      });
    }
  }

  setKeypadState(state) {
    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    const timeout = 0;
    const eight_buttonArray = {
      'A': 7,
      'B': 6,
      'C': 5,
      'D': 4,
      'E': 3,
      'F': 2,
      'G': 1,
      'H': 0,
    };
    const six_buttonArray = {
      'A': eight_buttonArray['C'],
      'B': eight_buttonArray['D'],
      'C': eight_buttonArray['E'],
      'D': eight_buttonArray['F'],
    };
    let buttonArray;

    this.log('Setting state of ' + this.name + ' to ' + state);

    this.platform.checkHubConnection();


    const getButtonMap = (callback) => {
      const command = {
        cmd1: '19',
        cmd2: '01',
      };

      this.hub.directCommand(this.id, command, timeout, (err, status) =>{
        if(err || status == null || typeof status === 'undefined' || typeof status.response === 'undefined' || typeof status.response.standard === 'undefined' || status.success == false){
          this.log('Error getting power state of ' + this.name);
          this.log.debug('Err: ' + util.inspect(err));
          return;
        } else {
          const hexButtonMap = status.response.standard.command2;
          let binaryButtonMap = parseInt(hexButtonMap, 16).toString(2);
          binaryButtonMap = '00000000'.substr(binaryButtonMap.length) + binaryButtonMap; //pad to 8 digits

          this.buttonMap = binaryButtonMap;

          this.log.debug('Binary map: ' + binaryButtonMap);
          callback();
        }
      });
    };

    getButtonMap(() =>{
      const currentButtonMap = this.buttonMap;
      console.log('Current: ' + currentButtonMap);

      if(this.six_btn == true){
        buttonArray = six_buttonArray;
      } else {
        buttonArray = eight_buttonArray;
      }

      const buttonNumber = buttonArray[this.keypadbtn];
      console.log('button num: ' + buttonNumber);
      const binaryButtonMap = currentButtonMap.substring(0, buttonNumber) +
              (state ? '1' : '0') +
              currentButtonMap.substring(buttonNumber+1);
      console.log('New bin: ' + binaryButtonMap);
      const buttonMap = ('00'+parseInt(binaryButtonMap, 2).toString(16)).substr(-2).toUpperCase();
      console.log('Hex: ' + buttonMap);
      const cmd = {
        cmd1: '2E',
        cmd2: '00',
        extended: true,
        userData: ['01', '09', buttonMap],
        isStandardResponse: true,
      };

      this.hub.directCommand(this.id, cmd, timeout, (err, status) =>{
        if(err || status == null || typeof status === 'undefined' || typeof status.response === 'undefined' || typeof status.response.standard === 'undefined' || status.success == false){
          this.log('Error setting state of ' + this.name);
          this.log.debug('Err: ' + util.inspect(err));

          return;
        } else {
          this.lastUpdate = moment();
          this.buttonMap = binaryButtonMap;
          this.currentState = state;

          return;
        }
      });
    });
  }

  setX10PowerState(state) {
    const powerOn = state ? 'on' : 'off';

    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();

    this.log('Setting power state of ' + this.name + ' to ' + powerOn);
    if (state) {
      this.light.turnOn();

      //assume that the command worked and report back to homekit
      this.level = 100;
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(true);
      this.currentState = true;
      this.lastUpdate = moment();
      return;
    } else {
      this.light.turnOff();

      this.level = 0;
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(false);
      this.currentState = false;
      this.lastUpdate = moment();

      return;
    }
  }

  setPosition(level) { //get position for shades/blinds
    const oldLevel = this.level;

    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();

    this.hub.cancelPending(this.id);

    if (level > oldLevel){
      this.service.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(1);
    } else {
      this.service.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(0);
    }

    this.log('Setting shades ' + this.name + ' to ' + level + '%');
    this.light.level(level).then((status) => {
      if (status.success) {
        this.level = level;
        this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(this.level);

        this.log.debug(this.name + ' is at ' + level + '%');
        this.lastUpdate = moment();
        this.service.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(2);
        return;
      } else {
        this.log('Error setting level of ' + this.name);
        return;
      }
    });
  }

  getThermostatStatus(){
    this.thermostat.status((err, status)=>{
      this.log('Getting thermostat ' + this.name + ' status');

      if(err || status == null || !status || typeof(status) === 'undefined'){
        return new Error('Thermostat did not return status');
      }
      this.log.debug('Status: ' + util.inspect(status));
      //get mode
      if(status.mode == 'off'){
        this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).updateValue(0);
        this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).updateValue(0);
        this.mode = 'off';
      } else if(status.mode == 'heat'){
        this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).updateValue(1);
        this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).updateValue(1);
        this.mode = 'heat';
      } else { //cool
        this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).updateValue(2);
        this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState).updateValue(2);
        this.mode = 'cool';
      }
      //get units
      if(status.unit == 'C'){
        this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits).updateValue(0);
        this.unit = 'C';
      } else {
        this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits).updateValue(1);
        this.unit = 'F';
      }
      //get current temperature
      if(status.temperature){
        if(status.unit == 'C'){
          this.currentTemp = status.temperature;
        } else {
          this.currentTemp = convertTemp('F', 'C', status.temperature);
        }
        this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature).updateValue(this.currentTemp);
      }
      //get target temperature
      if(status.setpoints){
        if(this.mode == 'cool'){
          if(status.unit == 'C'){
            this.targetTemp = status.setpoints.cool;
          } else {
            this.targetTemp = convertTemp('F', 'C', status.setpoints.cool);
          }
          this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature).updateValue(this.targetTemp);
        } else if(this.mode == 'heat'){
          if(status.unit == 'C'){
            this.targetTemp = status.setpoints.heat;
          } else {
            this.targetTemp = convertTemp('F', 'C', status.setpoints.heat);
          }
          this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature).updateValue(this.targetTemp);
        }
      }
    });
  }

  setTemperature(temp){
    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    let theTemp;

    if(this.unit == 'F'){
      theTemp = Math.round(convertTemp('C', 'F', temp));
    } else {
      theTemp = Math.round(temp);
    }

    this.log('Setting ' + this.name + ' temperature to ' + theTemp);

    this.platform.checkHubConnection();
    this.lastUpdate = moment();

    if(this.mode == 'cool'){
      this.thermostat.coolTemp(theTemp, (err, response)=>{
        if(err || !response || typeof(response) === 'undefined'){
          return new Error('Thermostat did not return status');
        }
        this.log.debug(util.inspect(response));

        this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature).updateValue(temp);
        this.targetTemp = temp;
      });
    } else if(this.mode == 'heat'){
      this.thermostat.heatTemp(theTemp, (err, response)=>{
        if(err || !response || typeof(response) === 'undefined'){
          return new Error('Thermostat did not return status');
        }
        this.log.debug(util.inspect(response));

        this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature).updateValue(temp);
        this.targetTemp = temp;
      });
    }
  }

  getTemperature(){
    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.log('Getting temperature of ' + this.name);

    this.platform.checkHubConnection();
    this.lastUpdate = moment();

    this.thermostat.temp((temp)=>{
      if(!temp || typeof(temp) === 'undefined'){
        return new Error('Thermostat did not return current temp');
      }

      if(this.unit == 'C'){
        this.currentTemp = temp;
      } else {
        this.currentTemp = convertTemp('F', 'C', temp);
      }

      this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature).updateValue(this.currentTemp);
    });


  }

  setThermostatMode(mode){
    if(this.disabled){
      this.log.debug('Device ' + this.name + ' is disabled');
      return;
    }

    this.platform.checkHubConnection();
    this.log.debug('Set ' + this.name + ' mode to ' + mode);
    if(mode == 0) {
      mode = 'off';
    } else {
      mode == 1 ? mode='heat' : mode='cool';
    }

    this.lastUpdate = moment();
    this.thermostat.mode(mode, (err, response)=>{
      if(err || response == null || !response || typeof(response) === 'undefined'){
        return new Error('Thermostat did not return status');
      }
      this.log.debug('Set ' + this.name + ' mode to ' + mode);
    });
  }
}
