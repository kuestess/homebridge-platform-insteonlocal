import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { InsteonLocalAccessory } from './InsteonLocalAccessory';
//import InsteonUI = require('./insteon-ui.js');
//let ui;

import hc from 'home-controller';
import app from 'express';

const Insteon = hc.Insteon;
const hub = new Insteon();

let connectedToHub = false;
let connectingToHub = false;
const inUse = true;
let express_init = false;
const eventListener_init = false;
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
    //ui = new InsteonUI(configPath, hub);
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
          //sskthis.eventListener();
        }

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
          //sskthis.eventListener();
        }

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
          //SSKthis.eventListener();
        }

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
          //SSKthis.eventListener();
        }

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

        new InsteonLocalAccessory(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        //this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        //this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        this.log.info('Adding new accessory:', device.name);
        const accessory = new this.api.platformAccessory(device.name, uuid);
        accessory.context.device = device;

        new InsteonLocalAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
