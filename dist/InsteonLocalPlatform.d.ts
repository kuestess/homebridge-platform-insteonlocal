import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { InsteonLocalAccessory } from './InsteonLocalAccessory';
import { InsteonUI } from './insteon-ui';
export declare class InsteonLocalPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly config: PlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    accessories: PlatformAccessory[];
    hub: any;
    private host;
    private port;
    private user;
    private pass;
    private model;
    devices: Array<any>;
    deviceIDs: Array<any>;
    private server_port;
    private use_express;
    private keepAlive;
    private checkInterval;
    refreshInterval: number;
    private hubConfig;
    hubID: any;
    insteonAccessories: Array<InsteonLocalAccessory>;
    platform: any;
    configPath: string;
    app: any;
    ui: InsteonUI;
    override: boolean;
    constructor(log: Logger, config: PlatformConfig, api: API);
    connectionWatcher(): void;
    getHubInfo(): void;
    connectToHub(): void;
    checkHubConnection(): void;
    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory): void;
    eventListener(): void;
    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    discoverDevices(): void;
    private isValidInsteonID;
    private isValidLevel;
    private isValidGroup;
    initAPI(): void;
}
//# sourceMappingURL=InsteonLocalPlatform.d.ts.map