/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-case-declarations */
/* eslint-disable max-len */
/* eslint-disable no-empty-pattern */

import deviceDatabase from './deviceDatabase.json';
import insteonUtils from 'home-controller/lib/Insteon/utils';
import chalk from 'chalk';
import moment, { Moment } from 'moment';

const byteToRampRate = insteonUtils.byteToRampRate;
const toByte = insteonUtils.toByte;
let rampRates = insteonUtils.RAMP_RATES;
import util from 'util';
import fs from 'fs';
import event from 'events';
const sse = new event();
let ui;
export class InsteonUI {
    configDir: any;
    wastebasket: string;
    tablestyle: string;
    style: string;
    header: string;
    footer: string;
    bootstrap: string;
    deviceDatabase: any;
    dataTables: string;
    font: string;
    scripts: string;
    navBar: string;
    platforms: any;
    config: any;
    platformIndex: any;
    insteonJSON: any;
    hubInfo: any;
    hubLinks: any;
    hubDevices: any;
    scenes: any;

    ui = this;
    devList: string;
    dimList: string;
    hubDeviceTableHeader: string;
    deviceTemplate: string;
    addDevRow: string;
    hubTable: any;
    hubLinkTable: string;
    hubInfoTable: any;
    hubLinkTableHeader: string;
    sceneTable: string;
    sceneControllerTableHeader: string;
    sceneResponderTableHeader: string;
    progressModal: string;
    confirmModal: string;
    modalConfirmScript: string;
    sseInit: string;
    deviceLinkTableHeader: string;
    deviceLinkTable: string;
    deviceSceneTable: string;
    hubDeviceInfoTable: string;
    hubDeviceOpFlagsTable: string;
    hubDeviceTable: string;
    selectedDevice: any;
    getAllLinksScript: string;
    databaseModal: string;
    ajaxLoadScript: string;
    progressModalYes: string;
    alertFade: string;
    deviceTable: string;
    devices: any;
    deviceSceneControllerTableHeader: string;
    deviceSceneResponderTableHeader: string;
    hubDeviceOpFlagsTableHeader: string;
    keypadButtonArray: string[];
    addDeviceTableHeader: string;
    sceneTableHeader: string;
    linkTemplate: string;
    unlinkTemplate: string;
    cont_respList: string;
    deviceList: string;
    sceneTemplateHeader: string;
    rateList: string;
    sceneTemplate: string;
    addSceneRow: string;
    disableFormField: string;
    formToJSON: string;
    platform: any;
    hubID: any;
    validator: string;
    dataTable: string;
    buttonAnimation: string;
    listHighlight: string;
    redirect: string;

    constructor(private configPath: any, private hub: any) {
      this.configDir = configPath.replace('config.json', '');
      this.init(configPath, hub, () => {
        this.log('Done with InsteonUI init');
      });

      this.deviceDatabase = deviceDatabase;
      this.wastebasket = '&#128465';

      this.getScripts();

      const customCSS = `<style>
				li.active a{
					color: white;
				}
				.nav-tabs>li.active>a, .nav-tabs>li.active>a:hover, .nav-tabs>li.active>a:focus{
					color: #337ab7 !important;
				}
				.row-height{
					height: 100vh;
				}
				.left {
					height: 100%;
					overflow-y: scroll;
				}
				.right {
					height: 100%;
					overflow-y: scroll;
				}
				.showinline {
					h2 {
						display: inline-block;
					}
					button {
						float: right;
					}
				}
				.has-error input[type="text"], .has-error select {
					border: 1px solid #a94442;
				}
				#flagsTable tbody tr td{
					border: 0;
					rules: none;
				}
				#progressModal .modal-body{
					text-align: center;
				}
			</style>`;

      this.bootstrap =
            '<link rel=\'stylesheet\' href=\'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css\'>' +
            customCSS;

      this.dataTables =
            '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.12/css/dataTables.bootstrap.min.css" />';

      this.font =
            '<link href=\'https://fonts.googleapis.com/css?family=Open+Sans:300,600\' rel=\'stylesheet\' type=\'text/css\'>';

      this.tablestyle =
            '<style>' +
            '.responsive-wrapper { margin-bottom: 15px; }' +
            '.responsive-wrapper .row { display: flex; width: 100%; justify-content: space-between; padding: 1em 0.1em; margin: 0; }' +
            '.responsive-wrapper .row.content:hover { background-color: #e6e6e6; }' +
            '.row.header { border-bottom: 2px solid #ddd; }' +
            '.row.header div { font-weight: 600; font-size: 16px; }' +
            '.row.content { border: 1px solid hsla(0, 0%, 90%, 1); border-top: none; -webkit-transition: all 0.1s cubic-bezier(1, 0, 0.5, 1); transition: all 0.1s cubic-bezier(1, 0, 0.5, 1); }' +
            '</style>';

      this.style =
            '<style>h1, h2, h3, h4, h5, h6 {font-family: \'Open Sans\', sans-serif;}p, div {font-family: \'Open Sans\', sans-serif;} input[type=\'radio\'], input[type=\'checkbox\'] {line-height: normal; margin: 0;}</style>';

      this.header =
            '<html><meta charset=\'UTF-8\'><meta name=\'viewport\' content=\'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no\'><head><title>InsteonUI - Configuration</title>' +
            this.bootstrap +
            this.dataTables +
            this.font +
            this.style +
            this.tablestyle +
            '<script src=\'http://code.jquery.com/jquery-latest.min.js\' type=\'text/javascript\'></script>' +
            '<script src=\'http://code.jquery.com/ui/1.12.1/jquery-ui.min.js\'></script>' +
            '</head><body style=\'padding-top: 70px;\'>';

      this.footer =
            `</body>
		<script defer='defer' src='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js' type='text/javascript'></script>` +
            this.scripts +
            '</html>';

      this.navBar = `<nav class="navbar navbar-default navbar-fixed-top">
			<div class="container-fluid">
			<div class="navbar-header">
			<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
			<span class="sr-only">Toggle navigation</span>
			<span class="icon-bar"></span>
			<span class="icon-bar"></span>
			<span class="icon-bar"></span>
			</button>
			<a class="navbar-brand" href="/">InsteonUI - Configuration</a>
			</div>
			<div id="navbar" class="navbar-collapse collapse">
			<ul class="nav navbar-nav navbar-right">
			<li><a href="/">Configuration</a></li>
			<li><a href="/hub">Hub</a></li>
			<li><a href="/devices">Devices</a></li>
			<li><a href="/link">Link</a></li>
			</ul>
			</div>
			</div>
			</nav>`;
    }

    init(configPath, hub, callback?) {
      this.log('Initializing Insteon UI ');

      this.configPath = configPath;
      this.hub = hub;
      this.loadConfig();

      this.loadInsteonConfig(() => {
        this.buildDeviceList();
        this.getHubInfo();
      });

      if (callback) {
        callback();
      }
    }

    renderMainPage(res) {
      this.devList =
            '<select class=\'form-control\' name=\'deviceType\'> ' +
            '<option value=\'lightbulb\'>lightbulb</option>' +
            '<option value=\'dimmer\'>dimmer</option>' +
            '<option value=\'switch\'>switch</option>' +
            '<option value=\'scene\'>scene</option>' +
            '<option value=\'remote\'>remote</option>' +
            '<option value=\'iolinc\'>iolinc</option>' +
            '<option value=\'motionsensor\'>motionsensor</option>' +
            '<option value=\'leaksensor\'>leaksensor</option>' +
            '<option value=\'outlet\'>outlet</option>' +
            '<option value=\'fan\'>fan</option>' +
            '</select>';

      function _getDevList(device) {
        const deviceTypes = [
          'lightbulb',
          'dimmer',
          'switch',
          'scene',
          'remote',
          'iolinc',
          'motionsensor',
          'leaksensor',
          'outlet',
          'fan',
        ];
        const listHeader = '<select class=\'form-control\' name=\'deviceType\'>';
        const listFooter = '</select>';
        let devList = listHeader;

        deviceTypes.forEach((deviceType) => {
          if (device.deviceType == deviceType) {
            devList =
                        devList +
                        '<option selected value=\'' +
                        deviceType +
                        '\'>' +
                        deviceType +
                        '</option>';
          } else {
            devList =
                        devList +
                        '<option value=\'' +
                        deviceType +
                        '\'>' +
                        deviceType +
                        '</option>';
          }
        });

        devList = devList + listFooter;
        return devList;
      }

      this.dimList =
            '<select class=\'form-control\' name=\'dimmable\'>' +
            '<option value=\'yes\'>yes</option>' +
            '<option value=\'no\'>no</option>' +
            '</select>';

      function _getDimList(device) {
        const dims = ['yes', 'no'];
        const listHeader = '<select class=\'form-control\' name=\'dimmable\'>';
        const listFooter = '</select>';
        let dimList = listHeader;

        dims.forEach((dim) => {
          if (device.dimmable == dim) {
            dimList =
                        dimList +
                        '<option selected value=\'' +
                        dim +
                        '\'>' +
                        dim +
                        '</option>';
          } else {
            dimList =
                        dimList + '<option value=\'' + dim + '\'>' + dim + '</option>';
          }
        });

        dimList = dimList + listFooter;
        return dimList;
      }

      const buildHubTable = () => {
        this.hubTable = '';
        const hubUsername =
                '<div class=\'form-group\'><label for=\'username\'>Username:</label><input type=\'text\' class=\'form-control\' name=\'hubUsername\' value=\'' +
                this.platform.user +
                '\'></div>';
        const hubPassword =
                '<div class=\'form-group\'><label for=\'password\'>Password:</label><input type=\'text\' class=\'form-control\' name=\'hubPassword\' value=\'' +
                this.platform.pass +
                '\'></div>';
        const hubAddress =
                '<div class=\'form-group\'><label for=\'host\'>Hub address:</label><input type=\'text\' class=\'form-control\' name=\'hubAddress\' value=\'' +
                this.platform.host +
                '\'></div>';
        const hubPort =
                '<div class=\'form-group\'><label for=\'port\'>Hub port:</label><input type=\'text\' class=\'form-control\' name=\'hubPort\' value=\'' +
                this.platform.port +
                '\'></div>';
        const hubModel =
                '<div class=\'form-group\'><label for=\'model\'>Hub model:</label><input type=\'text\' class=\'form-control\' name=\'hubModel\' value=\'' +
                this.platform.model +
                '\'></div>';
        const hubRefresh =
                '<div class=\'form-group\'><label for=\'refresh\'>Refresh:</label><input type=\'text\' class=\'form-control\' name=\'hubRefresh\' value=\'' +
                this.platform.refresh +
                '\'></div>';
        const hubKeepalive =
                '<div class=\'form-group\'><label for=\'keepalive\'>Keepalive:</label><input type=\'text\' class=\'form-control\' name=\'hubKeepalive\' value=\'' +
                this.platform.keepAlive +
                '\'></div>';

        this.hubTable =
                hubUsername +
                hubPassword +
                hubAddress +
                hubPort +
                hubModel +
                hubRefresh +
                hubKeepalive;
      };

      const buildDeviceTable = () => {
        this.deviceTable = '<div id=\'devTable\'>';

        this.devices.forEach((device) => {
          const devList = _getDevList(device);
          const dimList = _getDimList(device);

          this.deviceTable =
                    this.deviceTable +
                    '<div class=\'row content\'>' +
                    '<div class=\'input-group\'><input type=\'text\' class=\'form-control\' name=\'name\' required=\'required\' data-error=\'Enter dev name\' value=\'' +
                    device.name +
                    '\'><div class=\'help-block with-errors\'></div></div>' +
                    '<div class=\'input-group\'><input type=\'text\' class=\'form-control\' name=\'deviceID\' required=\'required\' data-error=\'Enter dev id\' value=\'' +
                    device.deviceID +
                    '\'><div class=\'help-block with-errors\'></div></div>' +
                    '<div class=\'input-group\'><name=\'deviceType\' value=\'' +
                    device.deviceType +
                    '\'>' +
                    devList +
                    '</div>' +
                    '<div class=\'input-group\'><name=\'dimmable\' value=\'' +
                    device.dimmable +
                    '\'>' +
                    dimList +
                    '</div>' +
                    '<div class=\'input-group\'><a href=\'/removeDevice' +
                    device.deviceID +
                    '\' class=\'btn btn-default btn-danger\' style=\'outline:none !important\'><span class=\'glyphicon glyphicon-trash\'></span></a></div>' +
                    '</div class=\'row\'>';
        });

        this.deviceTable = this.deviceTable + '</div>';
      };

      buildHubTable();
      buildDeviceTable();

      this.hubDeviceTableHeader = `<div class="responsive-wrapper">
		<div class="row header">
		<div>Name</div>
		<div>Device ID</div>
		<div>Device Type</div>
		<div>Dimmable?</div>
		</div>`;

      res.write(this.header + this.navBar);
      res.write('<div class=\'container\'>');
      res.write('<h3>Hub Configuration</h3>');
      res.write(
        '<form enctype=\'application/x-www-form-urlencoded\' action=\'/saveHubSettings\' method=\'post\'>',
      );
      res.write(this.hubTable);
      res.write(
        '<input type=\'submit\' class=\'btn btn-default center-block\' style=\'width:135px\' value=\'Save\' />',
      );
      res.write('</form>');
      res.write('<hr>');
      /*res.write('<h3>Devices</h3>');

                    if (typeof (this.devices) != 'undefined') {
                        res.write("<form class='form-inline' width='100%' enctype='application/x-www-form-urlencoded' id='devConfigForm' name='devConfigForm' action='/saveConfigDeviceSettings' data-toggle='validator' novalidate='true' method='post'>")
                        res.write(this.hubDeviceTableHeader + this.deviceTable + '</div>')
                        res.write("<div class='col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center'>")
                        res.write("<div class='btn-group'>")
                        res.write("<input href='#' class='btn btn-default center-block' id='add' style='width:135px' value='Add' />")
                        res.write("<input class='btn btn-default center-block' type='submit' style='width:135px' value='Save' />")
                        res.write('</div>')
                        res.write('</form>')
                    } else {
                        res.write('No devices installed or configured!')
                    }*/

      this.deviceTemplate =
            '<div class=\'row content\'>' +
            '<div class=\'input-group\'><input type=\'text\' class=\'form-control\' name=\'name\' required=\'required\' data-error=\'Enter dev name\' value=\'\'><div class=\'help-block with-errors\'></div></div>' +
            '<div class=\'input-group\'><input type=\'text\' class=\'form-control\' name=\'deviceID\' required=\'required\' data-error=\'Enter dev id\' value=\'\'><div class=\'help-block with-errors\'></div></div>' +
            '<div class=\'input-group\'>' +
            this.devList +
            '</div>' +
            '<div class=\'input-group\'>' +
            this.dimList +
            '</div>' +
            '<div class=\'input-group\'><a href=\'/removeDevice\' class=\'btn btn-default btn-danger\' style=\'outline:none !important\'><span class=\'glyphicon glyphicon-trash\'></span></a></div>' +
            '</div class=\'row content\'>';

      this.addDevRow =
            '<script>' +
            '$("#add").click(function() {' +
            '$("#devTable").append("' +
            this.deviceTemplate +
            '");' +
            '$("#devConfigForm").validator("update");' +
            '});' +
            '</script>';

      res.write('</div>');
      res.end(this.addDevRow + this.footer);
    }

    renderHubPage(res) {
      this.buildHubSceneData();

      const buildHubLinkTable = () => {
        this.hubLinkTable = '<tbody>';

        this.hubLinks.forEach((link) => {
          const insteonDevIndex = this.hubDevices.findIndex((item) => {
            return item.deviceID == link.id;
          });
          let nameText;

          if (insteonDevIndex == -1) {
            nameText = link.id;
          } else {
            const devName = this.hubDevices[insteonDevIndex].name;
            if (devName) {
              //check if blank
              nameText = devName + ' (' + link.id + ')';
            } else {
              nameText = link.id;
            }
          }

          this.hubLinkTable =
                    this.hubLinkTable +
                    '<tr>' +
                    '<td>' +
                    link.group +
                    '</td>' +
                    '<td>' +
                    nameText +
                    '</td>' +
                    '<td>' +
                    link.controller +
                    '</td>' +
                    '<td>' +
                    link.isInUse +
                    '</td>' +
                    '<td>' +
                    link.onLevel +
                    '</td>' +
                    '<td>' +
                    link.rampRate / 1000 +
                    '</td>' +
                    '<td><div><a href=\'#\' data-href=\'/removeHubLink/' +
                    this.hubInfo.id +
                    '/' +
                    link.number +
                    '\' class=\'btn btn-default center-block open-modal\' style=\'outline:none !important;\'><span style=\'font-size:12px;\'>' +
                    this.wastebasket +
                    ';</span></a></div></td>' +
                    '</tr>';
        });

        this.hubLinkTable = this.hubLinkTable + '</tbody>' + '</table>';
      };

      if (
        typeof this.hubLinks === 'undefined' ||
            Object.keys(this.hubLinks).length == 0
      ) {
        this.hubLinkTable =
                '<h4>No links in Insteon config - please click Get Links to get links and devices from Hub</h4>';
      } else {
        buildHubLinkTable();
      }

      if (this.hubInfo == undefined || this.hubInfo.length == 0) {
        this.hubInfoTable = '<h4> Please click Get Hub Info</h4>';
      } else {
        this.hubInfoTable = '';
        const hubAddress =
                '<div class=\'form-group\'><b>Hub address: </b>' +
                this.platform.host +
                '</div>';
        const hubPort =
                '<div class=\'form-group\'><b>Hub port: </b>' +
                this.platform.port +
                '</div>';
        const hubModel =
                '<div class=\'form-group\'><b>Hub model: </b>' +
                this.platform.model +
                '</div>';
        const hubID =
                '<div class=\'form-group\'><b>ID: </b>' + this.hubInfo.id + '</div>';
        const hubFirmwareVersion =
                '<div class=\'form-group\'><b>Firmware Version: </b>' +
                this.hubInfo.firmwareVersion +
                '</div>';

        this.hubInfoTable =
                hubAddress + hubPort + hubModel + hubID + hubFirmwareVersion;
      }

      res.write(this.header + this.navBar);
      res.write('<div class=\'container\'>');
      res.write('<h2>Hub Information</h2>');
      res.write(this.hubInfoTable);
      res.write(
        '<a class=\'btn btn-default center-block\' role=\'button\' href=\'/getHubInfo\' style=\'width:135px; height:40px;\'>Get Hub Info</a>',
      );
      res.write('<hr>');

      this.hubLinkTableHeader = `<table id="linkTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
		<thead>
		<th scope="col">Group</th>
		<th scope="col">Device ID</th>
		<th scope="col">Controller</th>
		<th scope="col">In Use?</th>
		<th scope="col">On Level</th>
		<th scope="col">Ramp Rate</th>
		<th scope="col">Delete?</th>
		</thead>`;

      res.write(`<ul class="nav nav-tabs">
		<li class="active"><a data-toggle="tab" href="#links">Links</a></li>
		<li><a data-toggle="tab" href="#scenes">Scenes</a></li>
		<li>
			<div class="btn-group">
			<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
				Action <span class="caret"></span>
			</button>
			<ul class="dropdown-menu">
				<li><a onclick="sseInit()" href="/getHubDevices">Get Devices/Links</a></li>
			</ul>
			</div>
		</li>
		</ul>`);

      res.write('<div class=\'tab-content\'>');
      res.write('<div id="links" class="tab-pane fade in active">'); //start links tab
      res.write('<h2>Links</h2>');
      res.write(this.hubLinkTableHeader);
      res.write(this.hubLinkTable);
      res.write('</div>'); //end links tab

      res.write('<div id="scenes" class="tab-pane fade">'); //start scenes tab

      this.sceneTable = '';
      this.sceneControllerTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
		<thead>
		<th scope="col">Controller Group</th>
		<th scope="col">Device ID</th>
		</thead>`;
      this.sceneResponderTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
			<thead>
			<th scope="col">Group</th>
			<th scope="col">Device ID</th>
			<th scope="col">On Level</th>
			<th scope="col">Ramp Rate</th>
			</thead>`;

      const buildSceneTable = (res, callback) => {
        this.sceneTable = '';

        if (
          typeof this.scenes === 'undefined' ||
                Object.keys(this.scenes).length == 0 ||
                this.scenes.length == 0
        ) {
          this.sceneTable =
                    '<div>No scenes defined. Please click Get Device Info to retrieve device/link information from the Hub </div>';
          callback(res);
          return;
        }

        this.scenes.forEach((scene) => {
          const sceneIndex = this.devices.findIndex((item) => {
            return item.groupID == scene.group && item.deviceType == 'scene';
          });
          let sceneNameText;

          if (sceneIndex == -1) {
            sceneNameText = 'Scene ' + scene.group;
          } else {
            sceneNameText =
                        this.devices[sceneIndex].name + ' (Scene ' + scene.group + ')';
          }

          let controllerTable =
                    '<h4>Controllers - ' +
                    sceneNameText +
                    '</h4>' +
                    this.sceneControllerTableHeader +
                    '<tbody>';
          let responderTable =
                    '<h4>Responders - ' +
                    sceneNameText +
                    '</h4>' +
                    this.sceneResponderTableHeader +
                    '<tbody>';

          scene.controllers.forEach((controller) => {
            const insteonDevIndex = this.hubDevices.findIndex((item) => {
              return item.deviceID == controller.id;
            });
            let nameText;

            if (insteonDevIndex == -1) {
              if (controller.id == this.hubInfo.id) {
                nameText = 'Hub' + ' (' + controller.id + ')';
              } else {
                nameText = controller.id;
              }
            } else {
              const devName = this.hubDevices[insteonDevIndex].name;
              if (devName) {
                nameText = devName + ' (' + controller.id + ')';
              } else {
                nameText = controller.id;
              }
            }

            controllerTable =
                        controllerTable +
                        '<tr>' +
                        '<td>' +
                        controller.group +
                        '</td>' +
                        '<td>' +
                        nameText +
                        '</td>' +
                        '</tr>' +
                        '</tbody>';
          });

          controllerTable = controllerTable + '</table>';

          scene.responders.forEach((responder) => {
            const insteonDevIndex = this.hubDevices.findIndex((item) => {
              return item.deviceID == responder.id;
            });
            let nameText;

            if (insteonDevIndex == -1) {
              if (responder.id == this.hubInfo.id) {
                nameText = 'Hub' + ' (' + responder.id + ')';
              } else {
                nameText = responder.id;
              }
            } else {
              const devName = this.hubDevices[insteonDevIndex].name;
              if (devName) {
                nameText = devName + ' (' + responder.id + ')';
              } else {
                nameText = responder.id;
              }
            }

            responderTable =
                        responderTable +
                        '<tr>' +
                        '<td>' +
                        responder.group +
                        '</td>' +
                        '<td>' +
                        nameText +
                        '</td>' +
                        '<td>' +
                        responder.onLevel +
                        '</td>' +
                        '<td>' +
                        responder.rampRate / 1000 +
                        '</td>' +
                        '</tr>' +
                        '</tbody>';
          });

          responderTable = responderTable + '</table>';

          this.sceneTable =
                    this.sceneTable +
                    controllerTable +
                    '<br>' +
                    responderTable +
                    '<br><hr>';
        });
        this.sceneTable = this.sceneTable + '</table>';
        callback(res);
      };

      buildSceneTable(res, () => {
        res.write(this.header + this.navBar);
        res.write('<div class=\'container\'>');
        res.write('<h3>Scenes</h3><hr>');
        res.write(this.sceneTable);
      });

      res.write('</div>'); //end scenes tab
      res.write('</div class=\'tab-content\'>');

      this.progressModal =
            '<div id=\'progressModal\' class=\'modal fade\' role=\'dialog\'>' +
            '<div class=\'modal-dialog\'>' +
            '<div class=\'modal-content\'>' +
            '<div class=\'modal-header\'>' +
            '<button type=\'button\' class=\'close\' data-dismiss=\'modal\'>&times;</button>' +
            '<h4 class=\'modal-title\'>Getting links and devices from Hub...</h4>' +
            '</div>' +
            '<div class=\'modal-body\' hidden=\'true\'>' +
            '<p> </p>' +
            '</div>' +
            '<div class=\'modal-footer\' hidden=\'true\'>' +
            '<button type=\'button\' class=\'btn btn-danger\' id=\'progressModalYes\'>Yes</button>' +
            '<button type=\'button\' class=\'btn btn-default btn-primary\' data-dismiss=\'modal\'>Close</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';

      this.confirmModal =
            '<div id=\'confirmModal\' class=\'modal fade\' role=\'dialog\'>' +
            '<div class=\'modal-dialog\'>' +
            '<div class=\'modal-content\'>' +
            '<div class=\'modal-header\'>' +
            '<button type=\'button\' class=\'close\' data-dismiss=\'modal\'>&times;</button>' +
            '<h4 class=\'modal-title\'>Delete Link?</h4>' +
            '</div>' +
            '<div class=\'modal-body\'>' +
            '<p>Click yes to delete the link, or close to cancel.</p>' +
            '</div>' +
            '<div class=\'modal-footer\'>' +
            '<button type=\'button\' class=\'btn btn-danger\' data-dismiss=\'modal\' id=\'confirmModalYes\'>Yes</button>' +
            '<button type=\'button\' class=\'btn btn-default btn-primary\' data-dismiss=\'modal\'>Close</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';

      this.modalConfirmScript =
            '<script>' +
            '$(\'.open-modal\').on(\'click\',function(){' +
            'var link = $(this).attr(\'data-href\');' +
            '$(\'#confirmModal\').modal({show:true});' +
            '$(\'#confirmModalYes\').click(function(e) {' +
            'window.location.replace(link);' +
            '});' +
            '});' +
            '</script>';

      res.end(
        this.sseInit +
            this.progressModal +
            this.confirmModal +
            this.modalConfirmScript +
            this.footer,
      );
    }

    renderDevicePage(res, deviceID?) {
      const _getRampRate = (deviceID) => {
        const linkDevIndex = this.hubDevices.findIndex((item) => {
          return item.deviceID == deviceID;
        });

        let rampVal;

        if (linkDevIndex == -1) {
          rampVal = '';
        } else if (
          typeof this.insteonJSON.devices[linkDevIndex].operatingFlags !==
                'undefined' &&
                typeof this.insteonJSON.devices[linkDevIndex].operatingFlags.D7 !==
                'undefined'
        ) {
          rampVal = byteToRampRate(
            this.insteonJSON.devices[linkDevIndex].operatingFlags.D7,
          );
        } else {
          rampVal = '';
        }

        return rampVal;
      };

      const _getOnLevel = (deviceID, controllerID, group) => {
        const deviceIndex = this.hubDevices.findIndex((item) => {
          return item.deviceID == deviceID;
        });

        if (
          deviceIndex != -1 &&
                typeof this.insteonJSON.devices[deviceIndex].links !== 'undefined'
        ) {
          const responderLink = this.insteonJSON.devices[
            deviceIndex
          ].links.filter((link) => {
            return (
              link.group == group &&
                        link.id == controllerID &&
                        link.isInUse == true &&
                        link.controller == false
            );
          });

          if (responderLink.length == 0) {
            return '';
          } else {
            return responderLink[0].onLevel;
          }
        } else {
          return '';
        }
      };

      const buildDeviceSceneTable = () => {
        let groupText;
        this.log('Building scene table for ' + this.insteonJSON.devices[devIndex].name + '...');
        this.deviceSceneTable = '';

        this.keypadButtonArray = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        this.deviceSceneTable = '<tbody>';

        if (
          typeof this.insteonJSON.devices[devIndex].scenes === 'undefined' ||
                this.insteonJSON.devices[devIndex].scenes.length == 0
        ) {
          this.deviceSceneTable =
                    '<p>No scenes defined for ' +
                    this.insteonJSON.devices[devIndex].name +
                    '</p>';
          this.log(
            'No scenes defined for ' + this.insteonJSON.devices[devIndex].name,
          );
          return;
        }

        this.insteonJSON.devices[devIndex].scenes.forEach((scene) => {
          let controllerTable =
                    '<h4>Controllers - Scene ' +
                    scene.group +
                    '</h4>' +
                    this.deviceSceneControllerTableHeader +
                    '<tbody>';
          let responderTable =
                    '<h4>Responders - Scene ' +
                    scene.group +
                    '</h4>' +
                    this.deviceSceneResponderTableHeader +
                    '<tbody>';

          scene.controllers.forEach((controller) => {
            const insteonDevIndex = this.hubDevices.findIndex((item) => {
              return item.deviceID == controller.id;
            });
            let nameText;

            if (insteonDevIndex == -1) {
              if (controller.id == this.hubInfo.id) {
                nameText = 'Hub' + ' (' + controller.id + ')';
              } else {
                nameText = controller.id;
              }
            } else {
              const devName = this.hubDevices[insteonDevIndex].name;
              if (devName) {
                nameText = devName + ' (' + controller.id + ')';
              } else {
                nameText = controller.id;
              }
            }

            if (
              insteonDevIndex == -1 ||
                        this.hubDevices[insteonDevIndex].info == undefined
            ) {
              groupText = controller.group;
            } else {
              const filtered = this.deviceDatabase.filter((item) => {
                return (
                  item.category ==
                                this.hubDevices[insteonDevIndex].info.deviceCategory.id
                );
              });
              const found = filtered.find((item) => {
                return (
                  item.subcategory ==
                                this.hubDevices[insteonDevIndex].info.deviceSubcategory.id
                );
              });

              let groupText;

              if (found.name.includes('Keypad')) {
                groupText =
                                controller.group +
                                ' (' +
                                this.keypadButtonArray[controller.group - 1] +
                                ')';
              } else {
                groupText = controller.group;
              }
            }
            controllerTable =
                        controllerTable +
                        '<tr>' +
                        '<td>' +
                        groupText +
                        '</td>' +
                        '<td>' +
                        nameText +
                        '</td>' +
                        '</tr>' +
                        '</tbody>';
          });

          controllerTable = controllerTable + '</table>';

          scene.responders.forEach((responder) => {
            const insteonDevIndex = this.hubDevices.findIndex((item) => {
              return item.deviceID == responder.id;
            });
            let nameText;

            if (insteonDevIndex == -1) {
              if (responder.id == this.hubInfo.id) {
                nameText = 'Hub' + ' (' + responder.id + ')';
              } else {
                nameText = responder.id;
              }
            } else {
              const devName = this.hubDevices[insteonDevIndex].name;
              if (devName) {
                nameText = devName + ' (' + responder.id + ')';
              } else {
                nameText = responder.id;
              }
            }

            if (
              insteonDevIndex == -1 ||
                        this.hubDevices[insteonDevIndex].info == undefined
            ) {
              groupText = responder.group;
            } else {
              const filtered = this.deviceDatabase.filter((item) => {
                return (
                  item.category ==
                                this.hubDevices[insteonDevIndex].info.deviceCategory.id
                );
              });
              const found = filtered.find((item) => {
                return (
                  item.subcategory ==
                                this.hubDevices[insteonDevIndex].info.deviceSubcategory.id
                );
              });
              let groupText;
              let responderGroupText;

              if (found.name.indexOf('Keypad') > -1) {
                const responderLinkData = this.hubDevices[
                  insteonDevIndex
                ].links.filter((link) => {
                  return link.group == responder.group;
                });
                if (
                  responderLinkData.length > 0 &&
                                typeof responderLinkData !== 'undefined' &&
                                typeof responderLinkData[0].data !== 'undefined'
                ) {
                  const responderGroupNum = responderLinkData[0].data[2];
                  groupText =
                                    responder.group +
                                    ' (' +
                                    this.keypadButtonArray[responderGroupNum - 1] +
                                    ')';
                } else {
                  groupText = responder.group;
                }
              } else {
                groupText = responder.group;
                responderGroupText = responder.responderGroup;
              }
            }
            responderTable =
                        responderTable +
                        '<tr>' +
                        '<td>' +
                        groupText +
                        '</td>' +
                        '<td>' +
                        nameText +
                        '</td>' +
                        '<td>' +
                        responder.onLevel +
                        '</td>' +
                        '<td>' +
                        responder.rampRate / 1000 +
                        '</td>' +
                        '</tr>' +
                        '</tbody>';
          });

          responderTable = responderTable + '</table>';

          this.deviceSceneTable =
                    this.deviceSceneTable +
                    controllerTable +
                    '<br>' +
                    responderTable +
                    '<br><hr>';
        });
        this.deviceSceneTable = this.deviceSceneTable + '</tbody>' + '</table>';
      };

      this.deviceSceneControllerTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
		<thead>
		<th scope="col">Controller Group</th>
		<th scope="col">Device ID</th>
		</thead>`;

      this.deviceSceneResponderTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
		<thead>
		<th scope="col">Controller Group</th>
		<th scope="col">Device ID</th>
		<th scope="col">On Level</th>
		<th scope="col">Ramp Rate</th>
		</thead>`;

      let devName: any;
      let device;
      let devIndex;

      if (deviceID == '' || deviceID == null || typeof deviceID === 'undefined') {
        //nothing selected
        deviceID = '';
        this.deviceLinkTableHeader = '';
        this.deviceLinkTable = '';
        this.deviceSceneTable = '';
        this.hubDeviceInfoTable = '';
        this.hubDeviceOpFlagsTable = '';
        devName = '';
      } else {
        devIndex = this.insteonJSON.devices.findIndex((item) => {
          return item.deviceID == deviceID;
        });
        device = this.insteonJSON.devices[devIndex];

        if (device.name == '') {
          devName = device.deviceID;
        } else {
          devName = device.name;
        }

        const buildOpFlagsTable = () => {
          if (typeof device.operatingFlags === 'undefined') {
            this.hubDeviceOpFlagsTable =
                      '<div>Please click Get Device Info to retrieve device information from the Hub </div>';
          } else {
            const rampRate = byteToRampRate(device.operatingFlags.D7) / 1000;
            const onLevel = Math.ceil(
              (parseInt(device.operatingFlags.D8, 16) / 255) * 100,
            );
            const ledBrightness = Math.ceil(
              (parseInt(device.operatingFlags.D9, 16) / 128) * 100,
            );
            const databaseDelta =
                      typeof device.databaseDelta === 'undefined'
                        ? ''
                        : device.databaseDelta;
            const progLock =
                      typeof device.operatingFlags.programLock === 'undefined'
                        ? ''
                        : device.operatingFlags.programLock;
            const resumeDim =
                      typeof device.operatingFlags.resumeDim === 'undefined'
                        ? ''
                        : device.operatingFlags.resumeDim;
            const ledEnable =
                      typeof device.operatingFlags.ledEnable === 'undefined'
                        ? ''
                        : device.operatingFlags.ledEnable;
            const keys =
                      typeof device.operatingFlags.keys === 'undefined'
                        ? ''
                        : device.operatingFlags.keys;

            let keyRow;

            if (typeof this.hubDevices[devIndex].info !== 'undefined') {
              const filtered = this.deviceDatabase.filter((item) => {
                return (
                  item.category == this.hubDevices[devIndex].info.deviceCategory.id
                );
              });
              const found = filtered.find((item) => {
                return (
                  item.subcategory ==
                              this.hubDevices[devIndex].info.deviceSubcategory.id
                );
              });

              if (found.name.includes('Keypad')) {
                keyRow = '<td><b>Button Configuration: </b>' + keys + '</td>';
              } else {
                keyRow = '';
              }
            }

            this.hubDeviceOpFlagsTableHeader =
                      '<table id="flagsTable" class="table" cellspacing="0" cellpadding="0" width="100%">';

            this.hubDeviceOpFlagsTable =
                      '<tr>' +
                      '<td><b>Ramp Rate: </b>' +
                      rampRate +
                      '</td>' +
                      '<td><b>Programming Lock: </b>' +
                      progLock +
                      '</td>' +
                      '</tr>' +
                      '<tr>' +
                      '<td><b>On Level: </b>' +
                      onLevel +
                      '</td>' +
                      '<td><b>Resume Dim: </b>' +
                      resumeDim +
                      '</td>' +
                      '</tr>' +
                      '<tr>' +
                      '<td><b>LED Brightness: </b>' +
                      ledBrightness +
                      '</td>' +
                      '<td><b>Database Delta: </b>' +
                      databaseDelta +
                      '</td>' +
                      '</tr>' +
                      '<tr>' +
                      '<td><b>LED Enable: </b>' +
                      ledEnable +
                      '</td>' +
                      keyRow +
                      '</tr>' +
                      '</table>';

            this.hubDeviceOpFlagsTable =
                      this.hubDeviceOpFlagsTableHeader + this.hubDeviceOpFlagsTable;
          }
        };

        const buildDeviceLinkTable = () => {
          this.deviceLinkTable = '<tbody>';

          this.insteonJSON.devices[devIndex].links.forEach((link) => {
            if (link.isInUse) {
              const insteonDevIndex = this.hubDevices.findIndex((item) => {
                return item.deviceID == link.id;
              });

              let nameText;
              let rampRateText: any;

              if (insteonDevIndex == -1) {
                if (link.id == this.hubInfo.id) {
                  nameText = 'Hub' + ' (' + link.id + ')';
                } else {
                  nameText = link.id;
                }
              } else {
                const devName = this.hubDevices[insteonDevIndex].name;
                if (devName) {
                  nameText = devName + ' (' + link.id + ')';
                } else {
                  nameText = link.id;
                }
              }

              if (typeof link.rampRate === 'undefined') {
                rampRateText = parseInt(_getRampRate(deviceID)) / 1000;
              } else {
                rampRateText = parseInt(link.rampRate) / 1000;
              }

              this.deviceLinkTable =
                          this.deviceLinkTable +
                          '<tr>' +
                          '<td>' +
                          link.group +
                          '</td>' +
                          '<td>' +
                          nameText +
                          '</td>' +
                          '<td>' +
                          link.controller +
                          '</td>' +
                          '<td>' +
                          link.onLevel +
                          '</td>' +
                          '<td>' +
                          rampRateText +
                          '</td>' +
                          '<td>' +
                          link.at +
                          '</td>' +
                          '<td>' +
                          link.data[2] +
                          '</td>' +
                          '<td><div><a href=\'#\' class=\'btn btn-default center-block open-modal\' data-href=\'/removeLink/' +
                          device.deviceID +
                          '/' +
                          link.at +
                          '\'\' style=\'outline:none !important;\'><span style=\'font-size:12px;\'>' +
                          this.wastebasket +
                          ';</span></a></div></td>' +
                          '</tr>';
            }
          });
          this.deviceLinkTable = this.deviceLinkTable + '</tbody>' + '</table>';
        };

        const buildDeviceSceneData = (callback) => {
          const groups: any = [];
          const scenes: any = [];
          const responders: any = [];

          this.log(
            'Building scene data for ' +
                  this.insteonJSON.devices[devIndex].name +
                  '...',
          );
          this.insteonJSON.devices[devIndex].links.forEach((link) => {
            if (link !== null && link.isInUse) {
              groups.push(link.group);
            }
          });

          //filter for unique groups
          let deviceGroups = groups.filter((item, index, inputArray) => {
            return inputArray.indexOf(item) == index;
          });

          deviceGroups = deviceGroups.sort((x, y) => {
            return x - y;
          });

          if (typeof deviceGroups === 'undefined' || deviceGroups.length == 0) {
            this.log('No scenes for ' + this.insteonJSON.devices[devIndex].name);
            callback(false);
            return;
          }

          deviceGroups.forEach((groupNum) => {
            let responders: any = [];
            let controllers: any = [];

            //get all the links for groupNum
            let groupLinkArray = this.insteonJSON.devices[devIndex].links.filter(
              (link) => {
                return link.group == groupNum && link.isInUse == true;
              },
            );

            //remove groups 0 and 1 if the hub is the controller/responder to clean up the table
            if (groupNum == 0 || groupNum == 1) {
              groupLinkArray = groupLinkArray.filter((link) => {
                return link.id !== this.hubInfo.id;
              });
              if (groupLinkArray.length == 0) {
                return;
              }
            }

            //get all of the controllers
            groupLinkArray.forEach((link) => {
              if (link.controller == true) {
                //if true, selected device is controller for group
                const controllerID = deviceID;
                const responderID = link.id;

                controllers.push({ group: groupNum, id: controllerID });

                const responderIndex = this.hubDevices.findIndex((item) => {
                  return item.deviceID == responderID;
                });

                if (
                  responderIndex == -1 ||
                              typeof this.insteonJSON.devices[responderIndex].links ===
                              'undefined'
                ) {
                  //device not in insteon.json
                  this.log('No links for ' + responderID + ' found in config');
                  return;
                }

                let responderLink = this.insteonJSON.devices[
                  responderIndex
                ].links.filter((link) => {
                  return (
                    link.group == groupNum &&
                                  link.isInUse == true &&
                                  link.id == controllerID &&
                                  link.controller == false
                  );
                });

                responderLink = responderLink[0];
                const rampVal = _getRampRate(responderID);

                if (
                  typeof responderLink !== 'undefined' &&
                              responderLink.length != 0
                ) {
                  const responderData = {
                    group: groupNum,
                    id: responderID,
                    onLevel: responderLink.onLevel,
                    rampRate: rampVal,
                  };
                  responders.push(responderData);
                }
              } else if (link.controller == false) {
                const controllerID = link.id;
                const responderID = deviceID;

                //first check if the Hub is controller
                if (controllerID == this.hubInfo.id) {
                  const hubhubResponderLinks = this.insteonJSON.hub.links.filter(
                    (link) => {
                      return (
                        link.group == groupNum &&
                                          link.isInUse == true &&
                                          link.controller == true
                      );
                    },
                  );

                  controllers.push({ group: groupNum, id: controllerID });

                  hubhubResponderLinks.forEach((responder) => {
                    //Need to get the on level and ramp rate from the device itthis
                    const rampVal = _getRampRate(responder.id);
                    const onLevel = _getOnLevel(
                      responder.id,
                      this.hubInfo.id,
                      groupNum,
                    );

                    const responderData = {
                      group: groupNum,
                      id: responder.id,
                      onLevel: onLevel,
                      rampRate: rampVal,
                    };
                    responders.push(responderData);
                  });
                } else {
                  //link.controller == false and controllerID is not the Hub
                  //if false, selected device is controlled by device in link; selected device is responder
                  controllers.push({ group: groupNum, id: controllerID });

                  const rampVal = _getRampRate(responderID);
                  const onLevel = _getOnLevel(responderID, controllerID, groupNum);

                  const responderData = {
                    group: groupNum,
                    id: responderID,
                    onLevel: onLevel,
                    rampRate: rampVal,
                  };
                  responders.push(responderData); //Maybe don't need to push this?

                  const controllerIndex = this.hubDevices.findIndex((item) => {
                    return item.deviceID == controllerID;
                  });

                  if (
                    controllerIndex == -1 ||
                                  typeof this.insteonJSON.devices[controllerIndex].links ===
                                  'undefined'
                  ) {
                    //device not in insteon.json
                    this.log(
                      'Device/links for ' + controllerID + ' not found in config',
                    );
                    return;
                  }

                  const responderLinkArray = ([] = this.insteonJSON.devices[
                    controllerIndex
                  ].links.filter((responderLink) => {
                    return (
                      responderLink.group == groupNum &&
                                      responderLink.isInUse == true &&
                                      responderLink.controller == true
                    );
                  }));

                  responderLinkArray.forEach((responderLink) => {
                    //for each of the devices controlled by the controller, get link information
                    //check here if hub is responder id
                    if (responderLink.id == this.hubInfo.id) {
                      const responderData = {
                        group: groupNum,
                        id: this.hubInfo.id,
                        onLevel: '',
                        rampRate: '',
                      };
                      responders.push(responderData);
                    } else {
                      const responderIndex = this.hubDevices.findIndex((item) => {
                        return item.deviceID == responderLink.id;
                      });

                      if (
                        responderIndex == -1 ||
                                          typeof this.insteonJSON.devices[responderIndex].links ===
                                          'undefined'
                      ) {
                        //device not in insteon.json
                        this.log(
                          'Device/links for ' +
                                              responderLink.id +
                                              ' not found in config',
                        );
                        return;
                      }

                      const responderDevLink = ([] = this.insteonJSON.devices[
                        responderIndex
                      ].links.filter((link) => {
                        return (
                          link.group == groupNum &&
                                              link.isInUse == true &&
                                              link.controller == false
                        );
                      }));

                      responderDevLink.forEach((devLink) => {
                        const rampVal = _getRampRate(responderID);

                        const responderData = {
                          group: groupNum,
                          id: devLink.id,
                          onLevel: devLink.onLevel,
                          rampRate: rampVal,
                        };
                        responders.push(responderData);
                      });
                    }
                  });
                }
              }
            });

            responders = responders
              .map(JSON.stringify)
              .reverse() // convert to JSON string the array content, then reverse it (to check from end to begining)
              .filter((item, index, arr) => {
                return arr.indexOf(item, index + 1) === -1;
              }) // check if there is any occurence of the item in whole array
              .reverse()
              .map(JSON.parse);

            controllers = controllers
              .map(JSON.stringify)
              .reverse() // convert to JSON string the array content, then reverse it (to check from end to begining)
              .filter((item, index, arr) => {
                return arr.indexOf(item, index + 1) === -1;
              }) // check if there is any occurence of the item in whole array
              .reverse()
              .map(JSON.parse);

            scenes.push({
              group: groupNum,
              controllers: controllers,
              responders: responders,
            });
            this.insteonJSON.devices[devIndex].scenes = scenes;
          });

          callback(true);
        };

        if (typeof device === 'undefined' || typeof device.links === 'undefined' || device.links.length == 0
        ) {
          this.deviceLinkTableHeader = '';
          this.deviceLinkTable =
                    '<div>Please click Get Device Info to retrieve device information from the Hub </div>';
          this.deviceSceneTable =
                    '<div>Please click Get Device Info to retrieve device information from the Hub </div>';
          buildOpFlagsTable();
        } else {
          buildDeviceLinkTable();
          buildDeviceSceneData((scenes) => {
            if (scenes == false) {
              this.deviceSceneTable = '';
            } else {
              buildDeviceSceneTable();
            }
          });
          buildOpFlagsTable();

          this.deviceLinkTableHeader = `<table id="linkTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
				<thead>
				<th scope="col">Group</th>
				<th scope="col">Device ID</th>
				<th scope="col">Controller</th>
				<th scope="col">On Level</th>
				<th scope="col">Ramp Rate</th>
				<th scope="col">At</th>
				<th scope="col">D3</th>
				<th scope="col">Delete</th>
				</thead>`;
        }

        const buildDeviceInfoTable = () => {
          this.hubDeviceInfoTable =
                '<div class=\'form-group row\'><label for=\'deviceName\'>Name: </label><input type=\'text\' class=\'form-control\' name=\'name\' required value=\'' +
                device.name +
                '\'></div>';

          if (typeof device.info === 'undefined' || device.info.length == 0) {
            this.hubDeviceInfoTable =
                    this.hubDeviceInfoTable +
                    '<div class="form-group row">Please click Get Device Info to retrieve device information from the Hub </div>';
          } else {
            const deviceIDRow =
                    '<div class="form-group row"><b>Device ID: </b>' +
                    device.deviceID +
                    '</div>';
            const firmware =
                    '<div class="form-group row"><b>Firmware: </b>' +
                    device.info.firmware +
                    '</div>';
            const deviceDim =
                    '<div class="form-group row"><b>Dimmable: </b>' +
                    device.info.isDimmable +
                    '</div>';

            const deviceCat =
                    '<div class="form-group row"><b>Device Category: </b>' +
                    device.info.deviceCategory.id +
                    '</div>';

            const filtered = this.deviceDatabase.filter((item) => {
              return item.category == device.info.deviceCategory.id;
            });
            const found = filtered.find((item) => {
              return item.subcategory == device.info.deviceSubcategory.id;
            });

            const model = found.sku;
            const description = found.name;

            const deviceModel =
                    '<div class="form-group row"><b>Model: </b>' + model + '</div>';
            const deviceDesc =
                    '<div class="form-group row"><b>Description: </b>' +
                    description +
                    '</div>';

            this.hubDeviceInfoTable =
                    this.hubDeviceInfoTable +
                    deviceIDRow +
                    firmware +
                    deviceCat +
                    deviceDim +
                    deviceModel +
                    deviceDesc;
          }
        };

        if (device.info == undefined || device.info.length == 0) {
          this.hubDeviceInfoTable =
                    '<div class=\'form-group row\'><label for=\'deviceName\'>Name: </label><input type=\'text\' class=\'form-control\' name=\'name\' required value=\'' +
                    device.name +
                    '\'></div>';
        } else {
          buildDeviceInfoTable();
        }
      }

      if (
        typeof this.hubDevices === 'undefined' ||
            this.hubDevices.length == 0 ||
            Object.keys(this.insteonJSON.devices).length == 0
      ) {
        this.hubDeviceTable =
                '<p>No devices in Insteon config - please click Get Devices to get links and devices from Hub</p>';
      } else {
        this.hubDeviceTable = '<ul class=\'list-group\' id=\'hubDevTable\'>';

        this.hubDevices.forEach((hubDevice) => {
          let linkText;
          if (hubDevice.name == '') {
            linkText = hubDevice.deviceID;
          } else {
            linkText = hubDevice.name + ' (' + hubDevice.deviceID + ')';
          }

          let status;
          if (hubDevice.deviceID == deviceID) {
            status = 'active';
          } else {
            status = '';
          }

          this.hubDeviceTable =
                    this.hubDeviceTable +
                    '<li class="list-group-item ' +
                    status +
                    '" id="' +
                    deviceID +
                    '">' +
                    '<a href="/devices/' +
                    hubDevice.deviceID +
                    '">' +
                    linkText +
                    '</a>' +
                    '</li class="list-group-item">';
        });

        this.hubDeviceTable = this.hubDeviceTable + '</ul class="list-group">';
      }

      let numberDevices: any;
      if (typeof this.hubDevices === 'undefined') {
        numberDevices = 0;
      } else {
        numberDevices = this.hubDevices.length;
      }

      res.write(this.header + this.navBar);
      res.write('<div class=\'container-fluid\'>');
      res.write('<div class=\'btn-toolbar pull-right\'>');
      res.write(
        '<a class=\'btn btn-default load center-block getlinks\' onclick=\'sseInit()\' id=\'getAllLinks\' role=\'button\' href=\'/getAllDeviceLinks\' style=\'width:135px; height:30px;\'>Get All Dev Links</a>',
      );
      res.write('</div>');

      res.write('<div class=\'col-xs-2 col-sm-4 left\'>');
      res.write('<div class=\'row\'>');
      res.write(
        '<h4 class=\'sub-header pull-left\'>Devices (' + numberDevices + ')</h4>',
      );

      res.write(`<li>
			<div class="btn-group pull-right">
			<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
				Device Action <span class="caret"></span>
			</button>
			<ul class="dropdown-menu">
				<li><a href='/getHubDevices' style='width:135px; height:30px;'>Get Devices</a></li>
				<li><a onclick='sseInit()' href="/addAllDevicesToConfig">Add All to Config</a></li>
			</ul>
			</div>
		</li>`);

      res.write('</div class=\'row\'>');
      res.write('<div class=\'table-responsive\'>');
      res.write(this.hubDeviceTable);
      res.write('</div class=\'table-responsive\'>');
      res.write('</div class=\'col-xs-6 col-sm-4\'>');

      res.write('<div class=\'col-xs-12 col-sm-6 col-md-8 right\'>');

      //Device info form
      res.write(
        '<form enctype=\'application/x-www-form-urlencoded\' action=\'/saveDeviceSettings\' method=\'post\'>',
      );

      if (
        typeof this.selectedDevice === 'undefined' ||
            this.selectedDevice == null
      ) {
        res.write('<h3 class=\'sub-header\'>Device Info - ' + devName + '</h3>');
      } else {
        res.write(
          '<h3 class=\'sub-header\'>Device Info - ' +
                devName +
                '<a id="config" class="btn btn-primary pull-right" href="/addToConfig">Add to config</a></h3>',
        );
      }
      res.write(this.hubDeviceInfoTable);
      res.write(
        '<input class=\'btn btn-default center-block\' type=\'submit\' style=\'width:135px\' value=\'Save\' />',
      );
      res.write('</form>');
      res.write('<hr>');

      res.write(
        `<ul class="nav nav-tabs">
		<li class="active"><a data-toggle="tab" href="#opflags">Operating Flags</a>
		</li>
		<li><a data-toggle="tab" href="#links">Links</a>
		</li>
		<li><a data-toggle="tab" href="#scenes">Scenes</a>
		</li>
		<li>
			<div class="btn-group">
			<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
				Action <span class="caret"></span>
			</button>
			<ul class="dropdown-menu">` +
            '<li><a class=\'ajaxload\' id=\'beep\' data-href=\'/beep/' +
            deviceID +
            '\' href=\'#\'>Beep</a></li>' +
            `<li><a class='ajaxload' onclick="sseInit()" href="#" data-href="/getDeviceInfo">Get Dev Info/Links</a></li>
			</ul>
			</div>
		</li>
		</ul>`,
      );

      //Device op flags
      res.write('<div class=\'tab-content\'>');
      res.write('<div id="opflags" class="tab-pane fade in active">'); //start op flags tab
      res.write('<h3 class=\'sub-header\'>Operating Flags </h3>');
      res.write(
        '<form enctype=\'application/x-www-form-urlencoded\' action=\'#\' method=\'post\'>',
      );
      res.write(this.hubDeviceOpFlagsTable);
      res.write('</form>');
      res.write('</div>'); //end op flags tab

      this.getAllLinksScript =
            '<script>' +
            '$(\'.getlinks\').bind(\'click\', function(e) {' +
            'e.preventDefault();' +
            '$(\'#getAllLinks\').load(\'/getAllDeviceLinks\');' +
            '});' +
            '</script>';

      this.confirmModal =
            '<div id=\'confirmModal\' class=\'modal fade\' role=\'dialog\'>' +
            '<div class=\'modal-dialog\'>' +
            '<div class=\'modal-content\'>' +
            '<div class=\'modal-header\'>' +
            '<button type=\'button\' class=\'close\' data-dismiss=\'modal\'>&times;</button>' +
            '<h4 class=\'modal-title\'>Delete Link?</h4>' +
            '</div>' +
            '<div class=\'modal-body\'>' +
            '<p>Click yes to delete the link, or close to cancel.</p>' +
            '</div>' +
            '<div class=\'modal-footer\'>' +
            '<button type=\'button\' class=\'btn btn-danger\' data-dismiss=\'modal\' id=\'confirmModalYes\'>Yes</button>' +
            '<button type=\'button\' class=\'btn btn-default btn-primary\' data-dismiss=\'modal\'>Close</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';

      this.databaseModal =
            '<div id=\'databaseModal\' class=\'modal fade\' role=\'dialog\'>' +
            '<div class=\'modal-dialog\'>' +
            '<div class=\'modal-content\'>' +
            '<div class=\'modal-header\'>' +
            '<button type=\'button\' class=\'close\' data-dismiss=\'modal\'>&times;</button>' +
            '<h4 class=\'modal-title\'>Database already up to date</h4>' +
            '</div>' +
            '<div class=\'modal-body\'>' +
            '<p>Click yes update device links anyway, or close to cancel.</p>' +
            '</div>' +
            '<div class=\'modal-footer\'>' +
            '<button type=\'button\' class=\'btn btn-danger\' data-dismiss=\'modal\' id=\'databaseModalYes\'>Yes</button>' +
            '<button type=\'button\' class=\'btn btn-default btn-primary\' data-dismiss=\'modal\'>Close</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';

      this.progressModal =
            '<div id=\'progressModal\' class=\'modal fade\' role=\'dialog\'>' +
            '<div class=\'modal-dialog\'>' +
            '<div class=\'modal-content\'>' +
            '<div class=\'modal-header\'>' +
            '<button type=\'button\' class=\'close\' data-dismiss=\'modal\'>&times;</button>' +
            '<h4 class=\'modal-title\'><b>Updating device...</b></h4>' +
            '</div>' +
            '<div class=\'modal-body\'>' +
            '<p> </p>' +
            '</div>' +
            '<div class=\'modal-footer\' hidden=\'true\'>' +
            '<button type=\'button\' class=\'btn btn-danger\' id=\'progressModalYes\'>Yes</button>' +
            '<button type=\'button\' class=\'btn btn-default btn-primary\' data-dismiss=\'modal\'>Close</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';

      this.ajaxLoadScript =
            '<script>' +
            '$(\'.ajaxload\').bind(\'click\', function(e) {' +
            'e.preventDefault();' +
            'var link = $(this).attr(\'data-href\');' +
            '$(\'.ajaxload\').load(link);' +
            '});' +
            '</script>';

      this.modalConfirmScript =
            '<script>' +
            '$(\'.open-modal\').on(\'click\',function(){' +
            'var link = $(this).attr(\'data-href\');' +
            '$(\'#confirmModal\').modal({show:true});' +
            '$(\'#confirmModalYes\').click(function(e) {' +
            'window.location.replace(link);' +
            '});' +
            '});' +
            '</script>';

      this.progressModalYes =
            '<script>' +
            '$(\'#progressModalYes\').click(function(e) {' +
            'e.preventDefault();' +
            '$(\'#progressModal .modal-footer\').hide();' +
            '$(\'#progressModal\').load(\'/getLinks/' +
            deviceID +
            '\');' +
            '});' +
            '</script>';

      res.write('<div id="links" class="tab-pane fade">'); //start links tab
      res.write('<h3 class=\'sub-header\'>Links</h3>');
      res.write('<div class="table-responsive">');
      res.write(this.deviceLinkTableHeader);
      res.write(this.deviceLinkTable);
      res.write('</div class="table-responsive">');
      res.write('</div>'); //end links tab

      res.write('<div id="scenes" class="tab-pane fade">'); //start scenes tab
      res.write('<h3 class=\'sub-header\'>Scenes</h3>');
      res.write('<div class="table-responsive">');
      res.write(this.deviceSceneTable);
      res.write('</div class="table-responsive">');
      res.write('</div>'); //end scenes tab

      res.write('</div class=\'tab-content\'>');
      res.write('</div class=\'col-xs-12 col-sm-6 col-md-8\'>');

      res.write(this.confirmModal);
      res.write(this.databaseModal);
      res.write(this.progressModal);
      res.end(
        this.ajaxLoadScript +
            this.sseInit +
            this.modalConfirmScript +
            this.progressModalYes +
            this.getAllLinksScript +
            this.alertFade +
            this.footer,
      );
    }

    renderAddPage(res, type) {
      //not used

      res.write(this.header + this.navBar);
      res.write('<div class=\'container-fluid\'>');

      this.addDeviceTableHeader = `<div class="responsive-wrapper">
		<div class="row header">
		<div>Name</div>
		<div>Device ID</div>
		<div>Device Type</div>
		<div>Dimmable?</div>
		<div></div>
		<div></div>
		</div>`;

      this.devList =
            '<select class=\'form-control\' name=\'deviceType\'>' +
            '<option value=\'lightbulb\'>lightbulb</option>' +
            '<option value=\'dimmer\'>dimmer</option>' +
            '<option value=\'switch\'>switch</option>' +
            '<option value=\'scene\'>scene</option>' +
            '<option value=\'remote\'>remote</option>' +
            '<option value=\'iolinc\'>iolinc</option>' +
            '<option value=\'motionsensor\'>motionsensor</option>' +
            '<option value=\'leaksensor\'>leaksensor</option>' +
            '<option value=\'outlet\'>outlet</option>' +
            '<option value=\'fan\'>fan</option>' +
            '</select>';

      this.dimList =
            '<select class=\'form-control\' name=\'deviceDimmable\'>' +
            '<option value=\'yes\'>yes</option>' +
            '<option value=\'no\'>no</option>' +
            '</select>';

      this.deviceTemplate =
            '<div class=\'row content\'>' +
            '<div class=\'form-group\'><input type=\'text\' class=\'form-control\' name=\'deviceName\' value=\'' +
            '\'></div>' +
            '<div class=\'form-group\'><input type=\'text\' class=\'form-control\' name=\'deviceID\' value=\'\'></div>' +
            '<div class=\'form-group\'>' +
            this.devList +
            '</div>' +
            '<div class=\'form-group\'>' +
            this.dimList +
            '</div>' +
            '<div></div>' +
            '<div></div>' +
            '</div class=\'row content\'>';

      this.progressModal =
            '<div id=\'progressModal\' class=\'modal fade\' role=\'dialog\'>' +
            '<div class=\'modal-dialog\'>' +
            '<div class=\'modal-content\'>' +
            '<div class=\'modal-header\'>' +
            '<button type=\'button\' class=\'close\' data-dismiss=\'modal\'>&times;</button>' +
            '<h4 class=\'modal-title\'><b>Updating device...</b></h4>' +
            '</div>' +
            '<div class=\'modal-body\'>' +
            '<p> </p>' +
            '</div>' +
            '<div class=\'modal-footer\' hidden=\'true\'>' +
            '<button type=\'button\' class=\'btn btn-danger\' id=\'progressModalYes\'>Yes</button>' +
            '<button type=\'button\' class=\'btn btn-default btn-primary\' data-dismiss=\'modal\'>Close</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';

      res.write('<h2>Add ' + type + '</h2>');

      res.write(
        '<form enctype=\'application/x-www-form-urlencoded\' action=\'/save' +
            type +
            'Settings\' method=\'post\'>',
      );
      res.write(this.addDeviceTableHeader + this.deviceTemplate + '</div>');
      res.write('<br>');
      res.write('<div class=\'row\'>');
      res.write(
        '<div class=\'col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center\'>',
      );
      res.write('<div class=\'btn-group\' data-toggle=\'buttons\'>');
      res.write(
        '<input type=\'submit\' class=\'btn btn-default center-block\' value=\'Save\' onClick=\'submit()\' style=\'width:135px\' />',
      );
      res.write(
        '<input type=\'submit\' class=\'btn btn-default center-block\' value=\'Cancel\' onClick="location.href=\'/\'" style=\'width:135px\' />',
      );
      res.write('</div>');
      res.write('</div>');
      res.write('</form>');

      res.write('<br>');
      res.write('</div>');

      res.end(this.footer);
    }

    renderScenePage(res) {
      this.sceneTable = '';

      this.sceneTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
		<thead>
		<th scope="col">Group</th>
		<th scope="col">Device ID</th>
		<th scope="col">On Level</th>
		<th scope="col">Ramp Rate</th>
		</thead>`;


      const buildSceneTable = (res, callback) => {
        this.scenes.forEach((scene) => {
          let controllerTable =
                  '<h4>Controllers - Scene ' +
                  scene.group +
                  '</h4>' +
                  this.sceneTableHeader +
                  '<tbody>';
          let responderTable =
                  '<h4>Responders - Scene ' +
                  scene.group +
                  '</h4>' +
                  this.sceneTableHeader +
                  '<tbody>';

          scene.controllers.forEach((controller) => {
            const insteonDevIndex = this.hubDevices.findIndex((item) => {
              return item.deviceID == controller.id;
            });
            let nameText;

            if (insteonDevIndex == -1) {
              nameText = controller.id;
            } else {
              const devName = this.hubDevices[insteonDevIndex].name;
              if (devName) {
                nameText = devName + ' (' + controller.id + ')';
              } else {
                nameText = controller.id;
              }
            }

            controllerTable =
                      controllerTable +
                      '<tr>' +
                      '<td>' +
                      controller.group +
                      '</td>' +
                      '<td>' +
                      nameText +
                      '</td>' +
                      '<td>' +
                      controller.onLevel +
                      '</td>' +
                      '<td>' +
                      controller.rampRate +
                      '</td>' +
                      '</tr>' +
                      '</tbody>';
          });

          scene.responders.forEach((responder) => {
            const insteonDevIndex = this.hubDevices.findIndex((item) => {
              return item.deviceID == responder.id;
            });
            let nameText;

            if (insteonDevIndex == -1) {
              nameText = responder.id;
            } else {
              const devName = this.hubDevices[insteonDevIndex].name;
              if (devName) {
                nameText = devName + ' (' + responder.id + ')';
              } else {
                nameText = responder.id;
              }
            }

            responderTable =
                      responderTable +
                      '<tr>' +
                      '<td>' +
                      responder.group +
                      '</td>' +
                      '<td>' +
                      nameText +
                      '</td>' +
                      '<td>' +
                      responder.onLevel +
                      '</td>' +
                      '<td>' +
                      responder.rampRate +
                      '</td>' +
                      '</tr>' +
                      '</tbody>';
          });

          this.sceneTable =
                  this.sceneTable +
                  controllerTable +
                  '<br>' +
                  responderTable +
                  '<br><hr>';
        });
        this.sceneTable = this.sceneTable + '</table>';
        callback(res);
      };

      buildSceneTable(res, () => {
        res.write(this.header + this.navBar);
        res.write('<div class=\'container\'>');
        res.write('<div class=\'btn-toolbar pull-right\'>');
        res.write(
          '<a class=\'btn btn-default load center-block\' role=\'button\' href=\'/buildHubSceneData\' style=\'width:140px; height:30px;\'>Refresh Scene Data</a>',
        );
        res.write('</div>');
        res.write('<h3>Scenes</h3><hr>');
        res.write(this.sceneTableHeader);
        res.write(this.sceneTable);
        res.end(this.footer);
      });
    }

    renderLinkPage(res) {
      res.write(this.header + this.navBar);
      res.write('<div class=\'container\'>');

      this.linkTemplate =
            '<div class=\'form-group\'><label for=\'deviceID\'>Link To Hub</label><input type=\'text\' class=\'form-control\' required=\'required\' data-error=\'Enter device id\' name=\'deviceID\' value=\'\' placeholder=\'Enter device id to link to hub.  Multiple devices can be separated with a comma.\'><div class=\'help-block with-errors\'></div></div>';

      this.unlinkTemplate =
            '<div class=\'form-group\'><label for=\'deviceID\'>Unlink From Hub</label><input type=\'text\' class=\'form-control\' required=\'required\' data-error=\'Enter device id\' name=\'deviceID\' value=\'\' placeholder=\'Enter device id to unlink from hub\'><div class=\'help-block with-errors\'></div></div>';

      res.write(
        '<form enctype=\'application/x-www-form-urlencoded\' action=\'/linkToHub\' data-toggle=\'validator\' novalidate=\'true\' method=\'post\'>',
      );
      res.write(this.linkTemplate);
      res.write('<br>');
      res.write(
        '<div class=\'col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center\'>',
      );
      res.write(
        '<input type=\'submit\' class=\'btn btn-default center-block\' onclick=\'sseInit()\' value=\'Link\' style=\'width:135px\' />',
      );
      res.write('</div>');
      res.write('</form>');

      res.write('<br><hr>');

      res.write(
        '<form enctype=\'application/x-www-form-urlencoded\' action=\'/unlinkFromHub\' data-toggle=\'validator\' novalidate=\'true\' method=\'post\'>',
      );
      res.write(this.unlinkTemplate);
      res.write('<br>');
      res.write(
        '<div class=\'col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center\'>',
      );
      res.write(
        '<input type=\'submit\' class=\'btn btn-default center-block\' value=\'Unlink\' style=\'width:135px\' />',
      );
      res.write('</div>');
      res.write('</form>');

      res.write('<br><hr>');

      this.cont_respList =
            '<select class=\'form-control\' id=cont_resp name=\'cont_resp\'>' +
            '<option value=\'controller\'>controller</option>' +
            '<option value=\'responder\'>responder</option>' +
            '<option value=\'both\'>both</option>' +
            '</select>';

      const buildDeviceList = () => {
        this.deviceList = '<select class=\'form-control\' name=\'id\'>';

        if (this.hubInfo) {
          this.deviceList =
                    this.deviceList +
                    '<option value=\'' +
                    this.hubInfo.id +
                    '\'>Hub</option>';
        }

        let listText;

        this.insteonJSON.devices.forEach((device) => {
          if (device.name == '') {
            listText = device.deviceID;
          } else {
            listText = device.name;
          }

          this.deviceList =
                    this.deviceList +
                    '<option value=\'' +
                    device.deviceID +
                    '\'>' +
                    listText +
                    '</option>';
        });
        this.deviceList = this.deviceList + '</select>';
      };

      buildDeviceList();

      this.sceneTemplateHeader = `<div class="responsive-wrapper">
	<div class="row header">
	<div>Create Scene</div>
	</div>`;

      this.rateList = '<select class=\'form-control\' name=\'rate\'>';

      rampRates = rampRates.sort((x, y) => {
        return x - y;
      });

      rampRates.forEach((rate) => {
        this.rateList =
                this.rateList +
                '<option value=\'' +
                rate / 1000 +
                '\'>' +
                rate / 1000 +
                '</option>';
      });

      this.rateList = this.rateList + '</select>';

      this.sceneTemplate =
            '<div class=\'row content\'>' +
            '<div class=\'form-group\'><label for=\'id\'>Device ID</label>' +
            this.deviceList +
            '<div class=\'help-block with-errors\'></div></div>' +
            '<div class=\'form-group\'><label for=\'id\'>Group</label><input type=\'text\' class=\'form-control\' name=\'group\' required=\'required\' data-error=\'Please enter group\' value=\'1\'><div class=\'help-block with-errors\'></div></div>' +
            '<div class=\'form-group\'><label for=\'id\'>Level</label><input type=\'text\' class=\'form-control\' name=\'level\' id=rate required=\'required\' data-error=\'Please enter level\' value=\'\'><div class=\'help-block with-errors\'></div></div>' +
            '<div class=\'form-group\'><label for=\'id\'>Ramp Rate</label>' +
            this.rateList +
            '<div class=\'help-block with-errors\'></div></div>' +
            '<div class=\'form-group\'><label for=\'id\'>Controller/Responder</label>' +
            this.cont_respList +
            '<div class=\'help-block with-errors\'></div></div>' +
            '</div class=\'row content\'>';

      res.write(
        '<form enctype=\'application/x-www-form-urlencoded\' id=\'sceneTemplateForm\' name=\'sceneTemplateForm\' action=\'/createScene\' data-toggle=\'validator\' novalidate=\'true\' method=\'post\'>',
      );
      res.write(
        this.sceneTemplateHeader +
            '<div id=\'sceneTemplateTable\'>' +
            this.sceneTemplate +
            this.sceneTemplate,
      );
      res.write('</div>');
      res.write('</div>');
      res.write('<br>');

      res.write(
        '<div class=\'col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center\'>',
      );
      res.write('<div class=\'btn-group\'>');
      res.write(
        '<input href=\'#\' class=\'btn btn-default center-block\' id=\'addScene\' style=\'width:135px\' value=\'Add\' />',
      );
      res.write(
        '<input type=\'submit\' class=\'btn btn-default center-block\' onclick=\'sseInit()\' value=\'Create Scene\' style=\'width:135px\' />',
      );
      res.write('</div>');
      res.write('</div>');
      res.write('</form>');

      this.addSceneRow =
            '<script>' +
            '$("#addScene").click(function() {' +
            '$("#sceneTemplateTable").append("' +
            this.sceneTemplate +
            '");' +
            '$("#sceneTemplateForm").validator("update");' +
            '});' +
            '</script>';

      this.disableFormField = `<script>
			$(function() {
				$('#cont_resp').change(function() {
					if($(cont_resp).val() == 'controller') {
							$('#level, #rate').prop('disabled', true);
							$('#level, #rate').prop('required', false);
						} else {
							$('#level, #rate').prop('disabled', false);
							$('#level, #rate').prop('required', 'required');
						};
				});
			});
			</script>`;

      this.formToJSON = `<script>
		function sendData(jsonData) {
			$.ajax({
				url: '/createScene',
				type: 'POST',
				contentType: 'application/json',
				data: JSON.stringify(jsonData),
				dataType: 'json'
			});
		};

		$.fn.serializeObject = function()
			{
			   var o = {};
			   var a = this.serializeArray();
			   $.each(a, function() {
				   if (o[this.name]) {
					   if (!o[this.name].push) {
						   o[this.name] = [o[this.name]];
					   }
					   o[this.name].push(this.value || '');
				   } else {
					   o[this.name] = this.value || '';
				   }
			   });
			   return o;
			};

		$(function() {
			$('#sceneTemplateForm').on('submit', function(e) {
				e.preventDefault();
				var data = $("#sceneTemplateForm").serializeObject();
				this.log(data);
				sendData(data)
			});
		});
	</script>`;
      res.write(this.progressModal);
      res.end(this.sseInit + this.addSceneRow + this.formToJSON + this.footer);
    }

    handleRequest(req, res) {
      if(req.header('Referer')) {
        const referer = req.header('Referer');
      }
      switch (req.url) {
        case '/':
          this.renderMainPage(res);
          break;
        case '/redirect':
          res.redirect('back');
          break;
        case '/saveHubSettings':
          if (req.method == 'POST') {
            req.on('data', (chunk) => {
              const receivedData = chunk.toString();
              const arr = receivedData.split('&');

              this.config.platforms[this.platformIndex].user =
                            this.stripEscapeCodes(arr[0].replace('hubUsername=', ''));
              this.config.platforms[this.platformIndex].pass =
                            this.stripEscapeCodes(arr[1].replace('hubPassword=', ''));
              this.config.platforms[this.platformIndex].host =
                            this.stripEscapeCodes(arr[2].replace('hubAddress=', ''));
              this.config.platforms[this.platformIndex].port =
                            this.stripEscapeCodes(arr[3].replace('hubPort=', ''));
              this.config.platforms[this.platformIndex].model =
                            this.stripEscapeCodes(arr[4].replace('hubModel=', ''));
              this.config.platforms[this.platformIndex].refresh =
                            this.stripEscapeCodes(arr[5].replace('hubRefresh=', ''));
              this.config.platforms[this.platformIndex].keepAlive =
                            this.stripEscapeCodes(arr[6].replace('hubKeepalive=', ''));

              this.saveConfig(res);
            });
            res.redirect('/hub');
            //req.on('end', function (chunk) { })
          } else {
            this.log('[405] ' + req.method + ' to ' + req.url);
          }
          break;
        case '/saveDeviceSettings':
          if (req.method == 'POST') {
            req.on('data', (chunk) => {
              const receivedData = chunk.toString();
              const arr = receivedData.split('&');
              const deviceName = arr[0].replace('name=', '');

              const referer = req.header('Referer');
              const deviceID = referer.substring(
                referer.lastIndexOf('/') + 1,
                referer.length,
              );

              const devIndex = this.insteonJSON.devices.findIndex((item) => {
                return item.deviceID == deviceID;
              });
              this.insteonJSON.devices[devIndex].name = deviceName;

              this.saveInsteonConfig(res);
            });
            req.on('end', (chunk) => {
              //donothing
            });
          } else {
            this.log('[405] ' + req.method + ' to ' + req.url);
          }
          break;
        case '/hub':
          this.renderHubPage(res);
          break;
        case '/getHubInfo':
          this.log('Getting Hub info');
          this.hub.info((error, info) => {
            if (error || typeof info === 'undefined') {
              this.log('Error getting Hub info');
              this.saveInsteonConfig(res);
            } else {
              this.log(info);
              info.id = info.id.toUpperCase();
              this.hubInfo = info;
              this.insteonJSON.hub.info = this.hubInfo;
              this.saveInsteonConfig(res);
            }
          });
          break;
        case '/getHubDevices':
          this.log('Getting devices from Hub');
          this.getHubDevices(res, (res) => {
            this.saveInsteonConfig(res);
          });
          break;
        case '/addDevice':
          this.renderAddPage(res, 'Device');
          break;
        case '/link':
          this.renderLinkPage(res);
          break;
        case '/linkToHub':
          if (req.method == 'POST') {
            req.on('data', (chunk) => {
              const receivedData = chunk.toString();
              let arr = receivedData.split('&');
              arr = this.stripEscapeCodes(arr[0].replace('deviceID=', ''));
              const deviceIDs = arr.split(',');

              const _linkToHub = (devices) => {
                if (devices.length == 0) {
                  sse.emit('push', { message: 'Finished linking devices' });
                  setTimeout(() => {
                    sse.emit('push', { message: 'close' });
                  }, 3000);
                  this.getHubDevices(res, (res) => {
                    this.saveInsteonConfig(res);
                  });
                  return;
                }

                const device = devices.pop();
                sse.emit('push', { message: 'Linking ' + device + ' to hub' });

                this.linkToHub(device, res, (error, response) => {
                  if (error) {
                    this.log('Error linking ' + device);
                    sse.emit('push', { message: 'Error linking ' + device });
                    setTimeout(() => {
                      sse.emit('push', { message: 'close' });
                    }, 3000);
                    return _linkToHub(devices);
                  } else {
                    sse.emit('push', {
                      message: 'Successfully linked ' + device + ' to hub',
                    });
                    return _linkToHub(devices);
                  }
                });
              };

              _linkToHub(deviceIDs);
            });
          } else {
            this.log('[405] ' + req.method + ' to ' + req.url);
          }
          break;
        case '/unlinkFromHub':
          if (req.method == 'POST') {
            req.on('data', (chunk) => {
              const receivedData = chunk.toString();
              const arr = receivedData.split('&');
              const deviceID = arr[0].replace('deviceID=', '');

              this.unlinkFromHub(deviceID, res);
            });
            req.on('end', (chunk) => {
              //do nothing
            });
          } else {
            this.log('[405] ' + req.method + ' to ' + req.url);
          }
          break;
        case '/createScene':
          if (req.method == 'POST') {
            req.on('data', (data) => {
              const receivedData = JSON.parse(data.toString());
              const sceneData: any = [];

              for (let i = 0; i < receivedData.id.length; i++) {
                sceneData.push({
                  id: receivedData.id[i],
                  group: parseInt(receivedData.group[i]),
                  level: parseInt(receivedData.level[i]),
                  rate: parseFloat(receivedData.rate[i]),
                  cont_resp: receivedData.cont_resp[i],
                });
              }

              const controllers: any = [];
              const responders: any = [];

              sceneData.forEach((item) => {
                if (item.cont_resp == 'controller') {
                  controllers.push(item);
                } else if (item.cont_resp == 'responder') {
                  responders.push(item);
                } else if (item.cont_resp == 'both') {
                  controllers.push(item);
                  responders.push(item);
                }
              });

              const sceneArray: any = [];

              controllers.forEach((controller) => {
                for (let i = 0; i < responders.length; i++) {
                  if (controller.id == responders[i].id) {
                    continue;
                  }

                  //convert to 'gw' - Hub Pro uses lower case so using 'gw' takes care of that for us
                  if (
                    controller.id.toUpperCase() == this.hubInfo.id.toUpperCase()
                  ) {
                    controller.id = 'gw';
                  }

                  if (
                    responders[i].id.toUpperCase() ==
                                    this.hubInfo.id.toUpperCase()
                  ) {
                    responders[i].id = 'gw';
                  }

                  const responderJSON = {
                    id: responders[i].id,
                    level: responders[i].level,
                    rate: responders[i].rate,
                    data: [
                      '00',
                      '00',
                      responders[i].group.toString().padStart(2, '0'),
                    ],
                  };
                  const options = {
                    group: controller.group,
                    remove: false,
                  };

                  sceneArray.push({
                    controller: controller.id,
                    responder: responderJSON,
                    options: options,
                  });
                }
              });

              const _createScene = (scenes) => {
                if (scenes.length == 0) {
                  sse.emit('push', { message: 'Finished creating scene!' });
                  setTimeout(() => {
                    sse.emit('push', { message: 'close' });
                  }, 3000);
                  this.saveInsteonConfig(res);
                  return;
                }

                _createScene(sceneArray);

                sse.emit('push', { message: 'Creating scene...' });
                const scene = scenes.pop();

                sse.emit('push', {
                  message:
                                    'Linking ' + scene.responder.id + ' to ' + scene.controller,
                });

                this.createScene(
                  scene.controller,
                  scene.responder,
                  scene.options,
                  (error, response) => {
                    if (error) {
                      this.log('Error creating scene');
                      sse.emit('push', { message: 'Error creating scene' });
                      setTimeout(() => {
                        sse.emit('push', { message: 'close' });
                      }, 3000);
                      return _createScene(scenes);
                    } else {
                      sse.emit('push', {
                        message:
                                                'Successfully linked ' +
                                                scene.responder.id +
                                                ' to ' +
                                                scene.controller,
                      });
                      return _createScene(scenes);
                    }
                  },
                );
              };
            });
          } else {
            this.log('[405] ' + req.method + ' to ' + req.url);
          }
          break;
        case '/buildHubSceneData':
          this.buildHubSceneData(() => {
            res.redirect(referer);
          });
          break;
        case '/devices':
          if (req.url == '/devices') {
            this.selectedDevice = null;
          } else {
            this.selectedDevice = req.url.replace('/devices/', '');
            this.log('Selected device is: ' + this.selectedDevice);
          }

          this.renderDevicePage(res);
          break;
        case '/scenes':
          this.renderScenePage(res);
          break;
        case '/getAllDeviceLinks':
          this.log('Getting all device links');
          req.connection.setTimeout(1000 * 60 * 10);

          const linkDevIDs: any = [];

          this.hubDevices.forEach((device) => {
            linkDevIDs.push(device.deviceID);
          });

          const _getAllDevLinks = () => {
            if (linkDevIDs.length === 0) {
              this.log('Done getting all device links');
              this.saveInsteonConfig(res);
              return;
            }

            const id = linkDevIDs.pop();
            this.getAllDeviceInfo(id, res, () => {
              setTimeout(() => {
                return _getAllDevLinks();
              }, 4000); //slight delay to minimize traffic and help eliminate errors
            });
          };

          _getAllDevLinks();

          break;
        case '/getDeviceInfo':
          req.connection.setTimeout(1000 * 60 * 10);

          const referer = req.header('Referer');
          let deviceID = referer.substring(
            referer.lastIndexOf('/') + 1,
            referer.length,
          );
          const devIndex = this.insteonJSON.devices.findIndex((item) => {
            return item.deviceID == deviceID;
          });
          this.selectedDevice = deviceID;

          if (deviceID == 'devices') {
            res.write(
              '<div class=\'alert alert-warning alert-dismissible fade in out\'><a href=\'/devices\' class=\'close\' data-dismiss=\'success\'>&times;</a><strong>Success!</strong>Please select a device first</div>',
            );
            this.log(
              'Error getting device id from url: ' +
                        referer +
                        '  Select a device first.',
            );
            break;
          }

          sse.emit('push', { message: 'Getting device info for ' + deviceID });
          this.getAllDeviceInfo(deviceID, res, () => {
            this.log('Done getting device info for ' + deviceID);
            setTimeout(() => {
              sse.emit('push', { message: 'close' });
            }, 3000);
            this.saveInsteonConfig(res);
          });

          break;
        case '/events':
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          sse.on('push', (data) => {
            res.write('data: ' + JSON.stringify(data) + '\n\n');
          });
          break;
        case '/saveConfigDeviceSettings':
          if (req.method == 'POST') {
            req.on('data', (chunk) => {
              const receivedData = this.stripEscapeCodes(chunk);
              const arr = receivedData.split('&');
              this.log('Got device data: ' + util.inspect(arr));

              const devJSON: any = [];
              let tmpArray: any = [];
              let index = 0;
              const arrLength = arr.length;

              arr.forEach((item) => {
                const tmp = item.split('=');
                const key = tmp[0];
                const value = tmp[1];

                if (key == 'name' && index > 1) {
                  devJSON.push(tmpArray);
                  tmpArray = [];
                  tmpArray[key] = value;
                  index++;
                } else {
                  tmpArray[key] = value;
                  index++;
                }

                if (index == arrLength) {
                  devJSON.push(tmpArray);
                }
              });

              devJSON.forEach((savedDev) => {
                if (
                  this.config.platforms[this.platformIndex].devices == undefined
                ) {
                  this.log('No devices defined - adding to config');
                  this.config.platforms[this.platformIndex].devices = [];
                }

                const devIndex = this.config.platforms[
                  this.platformIndex
                ].devices.findIndex((item) => {
                  return item.deviceID == savedDev.deviceID;
                });
                const keys = Object.keys(savedDev);

                if (devIndex == -1) {
                  //add to config
                  this.log('Adding ' + savedDev.name + ' to config');
                  const insertIndex =
                                    this.config.platforms[this.platformIndex].devices.length;
                  this.config.platforms[this.platformIndex].devices[insertIndex] =
                                    {};

                  keys.forEach((key) => {
                    this.config.platforms[this.platformIndex].devices[
                      insertIndex
                    ][key] = savedDev[key];
                  });
                } else {
                  //modify existing
                  this.log('Modifying config for ' + savedDev.name);

                  keys.forEach((key) => {
                    this.log('Key ' + key + savedDev[key]);
                    this.config.platforms[this.platformIndex].devices[devIndex][
                      key
                    ] = savedDev[key];
                  });
                }
              });
              this.log('Config to save: ' + JSON.stringify(this.config));
              this.saveConfig(res);
            });
            req.on('end', (chunk) => {
              //do nothing
            });
          } else {
            this.log('[405] ' + req.method + ' to ' + req.url);
          }
          break;
        case '/addToConfig':
          this.redirect =
                    '<script>window.setTimeout(function() {window.location.href = document.referrer;}, 2000);</script>';

          this.generateDeviceConfig(
            this.selectedDevice,
            res,
            (error, devConf, res) => {
              if (error) {
                this.log(
                  'Error - could not generate device config for ' +
                                this.selectedDevice,
                );
                res.write(this.header + this.navBar);
                res.write(
                  '<div class=\'alert alert-danger alert-dismissible fade in out alert-close\' id=\'saveAlert\'><a href=\'/devices/' +
                                this.selectedDevice +
                                '\' class=\'close\' data-dismiss=\'alert\'>&times;</a><strong>Note!</strong> Could not save device to config.</div>',
                );

                res.write(this.header + this.navBar);
                res.write(
                  '<div class=\'alert alert-success alert-dismissible fade in out alert-close\'><a href=\'/devices/' +
                                this.selectedDevice +
                                '\' class=\'close\' data-dismiss=\'alert\'>&times;</a><strong>Note!</strong> Successfully saved device to config.</div>',
                );
                res.write(this.redirect);
                return;
              } else {
                this.log(
                  'Device config for ' +
                                this.selectedDevice +
                                ' is: ' +
                                util.inspect(devConf),
                );
                this.addDeviceToConfig(devConf, res, (res) => {
                  this.saveConfig(res);

                  res.write(this.header + this.navBar);
                  res.write(
                    '<div class=\'alert alert-success alert-dismissible fade in out alert-close\'><a href=\'/devices/' +
                                    this.selectedDevice +
                                    '\' class=\'close\' data-dismiss=\'alert\'>&times;</a><strong>Note!</strong> Successfully saved device to config.</div>',
                  );
                  res.write(this.redirect);
                  return;
                });
              }
            },
          );
          break;
        case '/addAllDevicesToConfig':
          this.log('Adding all devices to config');
          req.connection.setTimeout(1000 * 60 * 10);

          const devIDs: any = [];

          this.hubDevices.forEach((device) => {
            devIDs.push(device.deviceID);
          });

          const _addAllDevs = () => {
            const redirect =
                        '<script>window.setTimeout(function() {window.location.href = document.referrer;}, 2000);</script>';

            if (devIDs.length === 0) {
              this.log('Done adding all devices to config');
              this.saveConfig(res);
              res.write(this.header + this.navBar);
              res.write(
                '<div class=\'alert alert-success alert-dismissible fade in out alert-close\'><a href=\'/devices/' +
                            this.selectedDevice +
                            '\' class=\'close\' data-dismiss=\'alert\'>&times;</a><strong>Note!</strong> Successfully saved device to config.</div>',
              );
              res.write(redirect);
              return;
            }

            _addAllDevs();

            const id = devIDs.pop();
            sse.emit('push', { message: 'Adding ' + id + ' to config' });

            this.generateDeviceConfig(id, res, (error, devConf, res) => {
              if (error) {
                this.log('Error - could not generate device config for ' + id);
                return _addAllDevs();
              } else {
                this.log(
                  'Device config for ' + id + ' is: ' + util.inspect(devConf),
                );
                this.addDeviceToConfig(devConf, res, () => {
                  setTimeout(() => {
                    return _addAllDevs();
                  }, 2000); //slight delay to minimize traffic and help eliminate errors
                });
              }
            });
          };
          break;
        default:
          const url = req.url;

          if (url.indexOf('/removeDevice') !== -1) {
            const deviceToRemove = req.url.replace('/removeDevice', '');

            const devIndex = this.config.platforms[
              this.platformIndex
            ].devices.findIndex((item) => {
              return item.deviceID == deviceToRemove;
            });
            this.log(devIndex);
            this.config.platforms[this.platformIndex].devices.splice(devIndex, 1);
            this.log('Removing ' + deviceToRemove + ' from config');
            this.saveConfig(res);
          }

          if (url.indexOf('/removeLink') !== -1) {
            const deviceLink = req.url.replace('/removeLink/', '').split('/');
            deviceID = deviceLink[0];
            const linkAt = parseInt(deviceLink[1]);
            this.removeLinkAt(deviceID, linkAt, res);
          }

          if (url.indexOf('/removeHubLink') !== -1) {
            const deviceLink = req.url.replace('/removeHubLink/', '').split('/');
            const deviceID = deviceLink[0];
            const linkNumber = parseInt(deviceLink[1]);

            let linkToDelete = this.hubLinks.filter((link) => {
              return link.number == linkNumber;
            });

            linkToDelete = linkToDelete[0];

            this.removeLink(deviceID, linkToDelete, (error, response) => {
              if (error) {
                this.log('Error removing link from hub');
              } else {
                this.log('Successfully removed link from hub');
                this.saveInsteonConfig(res);
              }
            });
          }

          if (url.indexOf('/beep') !== -1) {
            const deviceID = req.url.replace('/beep/', '');
            this.beep(deviceID);
          }

          if (url.indexOf('/getLinks') !== -1) {
            const deviceID = req.url.replace('/getLinks/', '');
            this.selectedDevice = deviceID;
            this.getDeviceLinks(deviceID, (error, links) => {
              if (error) {
                res.write(this.header + this.navBar);
                res.write(
                  '<div class=\'alert alert-danger alert-dismissible fade in out\' id=\'saveAlert\'><a href=\'/devices/' +
                                this.selectedDevice +
                                '\' class=\'close\' data-dismiss=\'alert\'>&times;</a><strong>Note!</strong>Error getting device info/flags/links</div>',
                );
                res.end(this.footer);
              } else {
                this.saveInsteonConfig(res);
              }
            });
          }

          if (url.indexOf('/devices') !== -1) {
            const selectedDevice = req.url.replace('/devices/', '');
            let device;

            if (typeof selectedDevice === 'undefined' || selectedDevice == null) {
              device = '';
            } else {
              device = selectedDevice;
            }

            this.selectedDevice = device;
            this.log('Selected device is: ' + this.selectedDevice);
            this.renderDevicePage(res, device);
          }
      }
    }

    getDeviceInfo(deviceID, res, callback) {
      const devIndex = this.insteonJSON.devices.findIndex((item) => {
        return item.deviceID == deviceID;
      });
      this.log('Getting device info for ' + deviceID);
      this.hub.info(deviceID, (error, info) => {
        if (error || info == null) {
          this.log('Error getting device info');
          callback(error, null);
        } else {
          if (info != null) {
            this.insteonJSON.devices[devIndex].info = info;
            callback(null, info);
          }
        }
      });
    }

    getDatabaseDelta(deviceID, callback) {
      const timeout = 0;
      const cmd = {
        cmd1: '19',
        cmd2: '00',
      };

      this.log('Getting database delta for ' + deviceID);
      sse.emit('push', { message: 'Getting database delta for ' + deviceID });

      this.hub.directCommand(deviceID, cmd, timeout, (error, response) => {
        if (
          error ||
                typeof response.response === 'undefined' ||
                typeof response.response.standard === 'undefined'
        ) {
          this.log('Error getting database delta');
          sse.emit('push', {
            message: 'Error getting database delta for ' + deviceID,
          });
          callback(error, null);
        } else {
          const databaseDelta = response.response.standard.command1;
          this.log('dbDelta: ' + databaseDelta);
          callback(null, databaseDelta);
        }
      });
    }

    buildDeviceList() {
      if (
        typeof this.insteonJSON.devices === 'undefined' ||
            Object.keys(this.insteonJSON.devices).length == 0
      ) {
        this.log('No devices in config');
        return;
      }

      this.deviceList = '<select class=\'form-control\' name=\'id\'>';

      if (this.hubInfo) {
        this.deviceList =
                this.deviceList +
                '<option value=\'' +
                this.hubInfo.id +
                '\'>Hub</option>';
      }

      this.insteonJSON.devices.forEach((device) => {
        let listText;

        if (device.name == '') {
          listText = device.deviceID;
        } else {
          listText = device.name;
        }

        this.deviceList =
                this.deviceList +
                '<option value=\'' +
                device.deviceID +
                '\'>' +
                listText +
                '</option>';
      });
      this.deviceList = this.deviceList + '</select>';
    }

    saveConfig(res) {
      let newConfig = JSON.stringify(this.config)
        .replace(/\[,/g, '[')
        .replace(/,null/g, '')
        .replace(/null,/g, '')
        .replace(/null/g, '')
        .replace(/,,/g, ',')
        .replace(/,\]/g, ']');

      newConfig = JSON.stringify(JSON.parse(newConfig), null, 4);

      //make backup of old config
      fs.copyFile(this.configPath, this.configPath + '.bak', (err) => {
        if (err) {
          this.log('Error creating backup: ' + err);
        } else {
          this.log('Created backup of previous config');
        }
      });

      this.log('Saved new Homebridge config');
      //res.write(this.header + this.navBar);
      //res.write("<div class='alert alert-info alert-dismissible fade in out id=saveAlert'><a href='/' class='close' data-dismiss='alert'>&times;</a><strong>Note!</strong> Please restart Homebridge to activate your changes.</div>");
      fs.writeFile(this.configPath, newConfig, 'utf8', (err) => {
        if (err) {
          this.log(err);
          return;
        } else {
          this.log('Done writing Homebridge config');
          this.loadConfig();
        }
      });
    }

    saveInsteonConfig(res) {
      let newInsteonJSON = this.stripEscapeCodes(
        JSON.stringify(this.insteonJSON),
      );
      newInsteonJSON = JSON.stringify(JSON.parse(newInsteonJSON), null, 4);

      //make backup of old config
      fs.copyFile(
        this.configDir + './insteon.json',
        this.configDir + './insteon.json.bak',
        (err) => {
          if (err) {
            this.log('Error creating backup');
          } else {
            this.log('Created backup of previous config');
          }
        },
      );

      //write new config
      this.log('Saved new insteon config');
      res.write(this.header + this.navBar);

      res.write(
        '<div class=\'alert alert-success alert-dismissible fade in out\' id=\'saveAlert\'><a href=\'/devices/' +
            this.selectedDevice +
            '\' class=\'close\' data-dismiss=\'alert\'>&times;</a><strong>Note!</strong> Successfully saved devices/link to Insteon config.</div>',
      );
      res.end(this.footer);
      fs.writeFile(this.configDir + './insteon.json', newInsteonJSON, 'utf8', (err) => {
        if (err) {
          return this.log(err);
        } else {
          this.log('Done writing Insteon config');
          this.loadInsteonConfig();
        }
      },
      );
    }

    loadConfig() {
      this.log('Reading config from ' + this.configPath);

      const configJSON = fs.readFileSync(this.configPath);
      this.config = JSON.parse(configJSON.toString());

      this.platforms = this.config.platforms;
      this.log('Found ' + this.platforms.length + ' platform(s) in config');

      this.platformIndex = this.config.platforms.findIndex((item) => {
        return item.platform == 'InsteonLocal';
      });

      const platform = this.platforms.filter((item) => {
        return item.platform == 'InsteonLocal';
      });

      this.platform = platform[0];
      this.devices = this.platform.devices || [];

      for (let i = 0; i < this.devices.length; i++) {
        if (this.devices[i].deviceID) {
          if (this.devices[i].deviceID.includes('.')) {
            this.devices[i].deviceID = this.devices[i].deviceID.replace(
              /\./g,
              '',
            );
          }
        }
      }

      if (
        typeof this.config.platforms[this.platformIndex].devices === 'undefined'
      ) {
        this.config.platforms[this.platformIndex].devices = [];
      }
    }

    loadInsteonConfig(callback?) {
      if (fs.existsSync(this.configDir + './insteon.json')) {
        this.log('Reading devices from insteon.json');
        const insteonJSON = fs.readFileSync(this.configDir + './insteon.json');

        this.insteonJSON = JSON.parse(insteonJSON.toString());
        this.hubInfo = this.insteonJSON.hub.info;
        this.hubLinks = this.insteonJSON.hub.links;
        this.hubDevices = this.insteonJSON.devices;
        this.scenes = this.insteonJSON.scenes;

        if (callback) {
          callback();
        }
      } else {
        this.insteonJSON = {};
        this.insteonJSON = JSON.parse(JSON.stringify(this.insteonJSON));
        this.insteonJSON.hub = {};
        this.insteonJSON.hub.info = {};
        this.insteonJSON.hub.links = {};
        this.insteonJSON.devices = {};
        this.insteonJSON.scenes = {};

        this.log('Creating new insteon.json');

        if (callback) {
          callback();
        }
      }
    }

    getHubInfo() {
      this.hub.info((error, info) => {
        if (error || typeof info === 'undefined') {
          this.log('Error getting Hub info');
          this.hubInfo = {};
          return;
        } else {
          info.id = info.id.toUpperCase();
          this.hubInfo = info;
          this.hubID = info.id.toUpperCase();
          this.insteonJSON.hub.info = this.hubInfo;
          this.log('Hub/PLM info is ' + util.inspect(this.hubInfo));
          return;
        }
      });
    }

    getHubDevices(res, callback) {
      const devices: any = [];

      const oldDevices = this.hubDevices;

      this.hubLinks = {};
      this.hubDevices = [];
      this.insteonJSON.devices = {};

      this.hub.links((error, links) => {
        if (error) {
          this.log('Error getting devices');
        } else {
          let num = 0;
          links.forEach((link) => {
            link.number = num;
            num++;
          });

          this.hubLinks = links;

          links.forEach((link) => {
            if (link !== null && link.isInUse) {
              link.id = link.id.toUpperCase();
              devices.push(link.id);
            }
          });

          this.insteonJSON.hub.links = this.hubLinks;

          const hubDevices = devices.filter((item, index, inputArray) => {
            return inputArray.indexOf(item) == index;
          });

          hubDevices.forEach((deviceID) => {
            let devName;
            const configDevIndex = this.config.platforms[
              this.platformIndex
            ].devices.findIndex((item) => {
              return item.deviceID == deviceID && item.deviceType != 'scene';
            });

            let insteonDevIndex;

            if (
              typeof oldDevices === 'undefined' ||
                        Object.keys(oldDevices).length == 0
            ) {
              insteonDevIndex = -1;
            } else {
              insteonDevIndex = oldDevices.findIndex((item) => {
                return item.deviceID == deviceID;
              });
            }

            if (configDevIndex == -1 && insteonDevIndex == -1) {
              devName = '';
            } else if (configDevIndex != -1) {
              devName =
                            this.config.platforms[this.platformIndex].devices[configDevIndex]
                              .name;
              this.log('Found ' + devName + ' in homebridge config');
            } else {
              devName = oldDevices[insteonDevIndex].name;
              this.log('Found ' + devName + ' in Insteon config');
            }

            if (
              insteonDevIndex !== -1 &&
                        typeof oldDevices[insteonDevIndex].info !== 'undefined'
            ) {
              const devInfo = oldDevices[insteonDevIndex].info;
              const devLinks = oldDevices[insteonDevIndex].links;
              const opFlags = oldDevices[insteonDevIndex].operatingFlags;
              const dbDelta = oldDevices[insteonDevIndex].databaseDelta;

              this.hubDevices.push({
                name: devName,
                deviceID: deviceID,
                info: devInfo,
                links: devLinks,
                operatingFlags: opFlags,
                databaseDelta: dbDelta,
              });
            } else {
              this.hubDevices.push({ name: devName, deviceID: deviceID });
            }
          });

          this.insteonJSON.devices = this.hubDevices;
        }
        callback(res);
      });
    }

    getAllDeviceInfo(deviceID, res, callback) {
      const devIndex = this.insteonJSON.devices.findIndex((item) => {
        return item.deviceID == deviceID;
      });

      this.getDeviceInfo(deviceID, res, (error, response) => {
        if (error) {
          sse.emit('push', {
            message: 'Error getting device info for ' + deviceID,
          });
        }

        this.getOpFlags(deviceID, (error, response) => {
          if (error) {
            sse.emit('push', {
              message: 'Error getting operating flags for ' + deviceID,
            });
          }

          this.getDatabaseDelta(deviceID, (error, dbdelta) => {
            const databaseDelta = dbdelta;

            let recentDelta;
            if (
              typeof this.insteonJSON.devices[devIndex].databaseDelta !==
                        'undefined'
            ) {
              recentDelta = this.insteonJSON.devices[devIndex].databaseDelta;
            } else {
              recentDelta = '';
            }

            if (recentDelta == databaseDelta) {
              sse.emit('push', { message: 'prompt' });
            } else {
              this.insteonJSON.devices[devIndex].databaseDelta = databaseDelta;
              this.getDeviceLinks(deviceID, (error, response) => {
                if (error) {
                  this.log('Error getting links for ' + deviceID);
                  sse.emit('push', {
                    message: 'Error getting links for ' + deviceID,
                  });
                  setTimeout(() => {
                    sse.emit('push', { message: 'close' });
                  }, 3000);
                  callback(error, null);
                } else {
                  this.log('Done getting links for ' + deviceID);
                  callback(null, null);
                }
              });
            }
          });
        });
      });
    }

    getDeviceLinks(deviceID, callback) {
      const devIndex = this.insteonJSON.devices.findIndex((item) => {
        return item.deviceID == deviceID;
      });

      const _getDeviceLinks = (deviceID, at, linkArray, callback) => {
        this.hub.linkAt(deviceID, at, linkArray, (error, links) => {
          if (error) {
            this.log('Error getting links');
            callback(error, null);
            return;
          }

          sse.emit('push', {
            message:
                        'Getting links for ' +
                        deviceID +
                        ' (Found ' +
                        links.length +
                        ' links)',
          });

          if (
            links.length == 0 ||
                    typeof links === 'undefined' ||
                    links[links.length - 1].isLast
          ) {
            callback(null, linkArray);
            return;
          } else {
            const oldAt = at;
            at = links[links.length - 1].at - 8;

            if (at == oldAt) {
              callback(null, linkArray);
              return;
            } else {
              return _getDeviceLinks(deviceID, at, linkArray, callback);
            }
          }
        });
      };

      const at = 4095;
      let linkArray = [];

      this.log('Getting device links for ' + deviceID);
      sse.emit('push', { message: 'Getting links for ' + deviceID });

      _getDeviceLinks(deviceID, at, linkArray, (error, response) => {
        this.log('linkArray: ' + util.inspect(linkArray));

        linkArray = linkArray.filter((item, index, inputArray) => {
          return inputArray.indexOf(item) == index;
        });

        if (linkArray.length == 0) {
          this.log('No links returned from ' + deviceID);
          callback(true, null);
          sse.emit('push', { message: 'close' });
          return;
        }

        linkArray.forEach((item: any) => {
          item.id = item.id.toUpperCase();
        });

        this.insteonJSON.devices[devIndex].links = linkArray;
        sse.emit('push', { message: 'close' });
        callback(null, linkArray);
      });
    }

    getOpFlags(deviceID, callback) {
      const timeout = 0;
      const devIndex = this.insteonJSON.devices.findIndex((item) => {
        return item.deviceID == deviceID;
      });

      let cmd;

      cmd = {
        cmd1: '2E',
        cmd2: '00',
        extended: true,
        userData: ['00', '00', '00'],
      };

      this.log('Getting operating flags for ' + deviceID);
      sse.emit('push', { message: 'Getting operating flags for ' + deviceID });

      this.hub.directCommand(deviceID, cmd, timeout, (error, response) => {
        if (
          error ||
                typeof response.response === 'undefined' ||
                typeof response.response.extended === 'undefined'
        ) {
          this.log('Error getting operating flags (ED)');
        } else {
          const operatingFlags = response.response.extended.userData;
          this.log('Flags (ED): ' + JSON.stringify(operatingFlags));

          if (devIndex !== -1) {
            this.insteonJSON.devices[devIndex].operatingFlags = {
              D1: operatingFlags[0],
              D2: operatingFlags[1],
              D3: operatingFlags[2],
              D4: operatingFlags[3],
              D5: operatingFlags[4],
              D6: operatingFlags[5],
              D7: operatingFlags[6],
              D8: operatingFlags[7],
              D9: operatingFlags[8],
              D10: operatingFlags[9],
              D11: operatingFlags[10],
              D12: operatingFlags[11],
              D13: operatingFlags[12],
              D14: operatingFlags[13],
            };
          }
        }
      });

      cmd = {
        cmd1: '1F',
        cmd2: '00',
      };

      this.hub.directCommand(deviceID, cmd, timeout, (error, response) => {
        if (
          error ||
                typeof response.response === 'undefined' ||
                typeof response.response.standard === 'undefined'
        ) {
          this.log('Error getting operating flags (SD)');
          callback();
        } else {
          const operatingFlagsSD = response.response.standard.command2;
          this.log('Flags (SD): ' + JSON.stringify(operatingFlagsSD));

          let binaryMap = parseInt(operatingFlagsSD, 16).toString(2);
          binaryMap = '0000'.substr(binaryMap.length) + binaryMap; //pad to at least 4 digits
          binaryMap = binaryMap.substring(binaryMap.length - 4, binaryMap.length); //only need last 4 bits

          const progLock =
                    parseInt(binaryMap.substring(3, 1)) == 1 ? 'on' : 'off'; //1=on, 0=off
          const ledEnable =
                    parseInt(binaryMap.substring(2, 1)) == 1 ? 'on' : 'off'; //1=LED on, 0=LED off
          const resumeDim =
                    parseInt(binaryMap.substring(1, 1)) == 1 ? 'on' : 'off'; //1=resume dim enabled, 0=resume dim disabled
          const keys = parseInt(binaryMap.substring(0, 1)) == 1 ? 8 : 6; //1=8 keys, 0=6 keys

          if (devIndex !== -1) {
            if (
              typeof this.insteonJSON.devices[devIndex].operatingFlags ===
                        'undefined'
            ) {
              this.insteonJSON.devices[devIndex].operatingFlags = {};
            }

            this.insteonJSON.devices[devIndex].operatingFlags.programLock =
                        progLock;
            this.insteonJSON.devices[devIndex].operatingFlags.ledEnable =
                        ledEnable;
            this.insteonJSON.devices[devIndex].operatingFlags.resumeDim =
                        resumeDim;

            if (typeof this.hubDevices[devIndex].info !== 'undefined') {
              const filtered = this.deviceDatabase.filter((item) => {
                return (
                  item.category ==
                                this.hubDevices[devIndex].info.deviceCategory.id
                );
              });
              const found = filtered.find((item) => {
                return (
                  item.subcategory ==
                                this.hubDevices[devIndex].info.deviceSubcategory.id
                );
              });

              if (found.name.includes('Keypad')) {
                this.insteonJSON.devices[devIndex].operatingFlags.keys = keys;
              }
            }
          }
          callback();
        }
      });
    }

    linkToHub(deviceID, res, callback) {
      let options = {
        controller: false,
        group: 0,
      };

      this.log('Linking ' + deviceID + ' to hub');

      this.hub.link(deviceID, options, (error, link) => {
        if (error || link == null) {
          this.log('Error linking ' + deviceID + ' to hub');
          callback(error, null);
          return;
        } else {
          this.log(link);
        }

        //link device group 1 as controller to hub
        options = {
          controller: true,
          group: 1,
        };

        this.log('Linking hub to ' + deviceID);
        this.hub.link(deviceID, options, (error, link) => {
          if (error || link == null) {
            this.log('Error linking ' + deviceID + ' to hub' + error);
            callback(error, null);
            return;
          } else {
            this.log(link);
            callback(null, link);
            return;
          }
        });
      });
    }

    unlinkFromHub(deviceID, res) {
      this.log('Unlinking ' + deviceID + ' from hub');

      this.hub.unlink(deviceID, (error, link) => {
        if (error) {
          this.log('Error unlinking ' + deviceID + ' from hub');
        } else {
          this.log(link);
          const devIndex = this.insteonJSON.devices.findIndex((item) => {
            return item.deviceID == deviceID;
          });
          this.log(
            'Removing ' +
                    this.insteonJSON.devices[devIndex].deviceID +
                    ' from devices',
          );
          if (devIndex !== -1) {
            this.insteonJSON.devices.splice(devIndex, 1);
          }
          this.saveInsteonConfig(res);
        }
      });
    }

    removeLinkAt(deviceID, linkAt, res) {
      const devIndex = this.insteonJSON.devices.findIndex((item) => {
        return item.deviceID == deviceID;
      });
      let link = this.insteonJSON.devices[devIndex].links.filter((item) => {
        return item.at == linkAt;
      });
      link = link[0];

      this.log('Deleting link from ' + deviceID);

      this.hub.modLink('remove', deviceID, link, (error, response) => {
        if (error) {
          this.log('Error removing link from device');
          return;
        } else {
          this.log('Link: ' + util.inspect(response));
          const linkIndex = this.insteonJSON.devices[devIndex].links.findIndex(
            (item) => {
              return item.at == linkAt;
            },
          );

          this.log(
            'Successfully removed link at ' + linkAt + ' for ' + deviceID,
          );

          if (devIndex !== -1 && linkIndex !== -1) {
            this.insteonJSON.devices[devIndex].links.splice(linkIndex, 1);
          }

          this.saveInsteonConfig(res);
        }
      });
    }

    removeLink(deviceID, link, callback) {
      const timeout = 0;

      if (deviceID == null || deviceID == this.hubInfo.id) {
        const id = link.id;
        const flags = toByte(link.flags);
        const group = toByte(link.group);
        const data = link.data.join('');
        const command = '6F80' + flags + group + id + data;

        const linkNumber = link.number;

        this.log('Removing link from hub');
        this.hub.sendCommand(command, timeout, (error, response) => {
          if (error || response.success == false) {
            this.log('Error removing link from hub - ' + error);
            if (callback) {
              callback();
            } else {
              return;
            }
          } else if (response.success == true) {
            this.log('Successfully removed link for ' + id + ' from Hub');

            const linkIndex = this.insteonJSON.hub.links.filter((link) => {
              return link.number == linkNumber;
            });

            if (linkIndex != -1) {
              this.insteonJSON.hub.links.splice(linkIndex, 1);
            }

            if (callback) {
              callback();
            } else {
              return;
            }
          }
        });
      }
    }

    createScene(controller, responder, options, callback) {
      this.log('Creating scene...');

      this.hub.scene(controller, responder, options, (error, link) => {
        if (error) {
          this.log('Error creating scene: ' + error);
          callback(error, null);
        } else {
          this.log('Sucessfully created scene!');
          if (callback) {
            callback(null, link);
          }
        }
      });
    }

    buildHubSceneData(callback?) {
      const groups: any = [];
      const scenes: any = [];

      this.log('Building Hub scene data...');

      if (
        typeof this.hubLinks === 'undefined' ||
            Object.keys(this.hubLinks).length == 0
      ) {
        if (callback) {
          callback();
        } else {
          return;
        }
      }
      this.hubLinks.forEach((link) => {
        if (link !== null && link.isInUse) {
          groups.push(link.group);
        }
      });

      //filter for unique groups
      let hubGroups = groups.filter((item, index, inputArray) => {
        return inputArray.indexOf(item) == index;
      });

      hubGroups = hubGroups.sort((x, y) => {
        return x - y;
      });

      //remove groups 0 and 1
      for (let i = 0; i < hubGroups.length - 1; i++) {
        if (hubGroups[i] === 0) {
          hubGroups.splice(i, 1);
        }

        if (hubGroups[i] === 1) {
          hubGroups.splice(i, 1);
        }
      }

      hubGroups.forEach((groupNum) => {
        const responders: any = [];
        const controllers: any = [];
        let controllerID;

        if (
          typeof this.hubInfo === 'undefined' ||
                typeof this.hubInfo.id === 'undefined'
        ) {
          controllerID = '[hub]';
        } else {
          controllerID = this.hubInfo.id;
        }

        //only interested in links where the hub is controller
        const hubhubResponderLinks = this.insteonJSON.hub.links.filter((link) => {
          return (
            link.group == groupNum &&
                    link.isInUse == true &&
                    link.controller == true
          );
        });

        controllers.push({ group: groupNum, id: controllerID });

        const _getRampRate = (deviceID) => {
          let rampVal;

          const linkDevIndex = this.hubDevices.findIndex((item) => {
            return item.deviceID == deviceID;
          });

          if (linkDevIndex == -1) {
            rampVal = '';
          } else if (
            typeof this.insteonJSON.devices[linkDevIndex].operatingFlags !==
                  'undefined' &&
                  typeof this.insteonJSON.devices[linkDevIndex].operatingFlags.D7 !==
                  'undefined'
          ) {
            rampVal = byteToRampRate(
              this.insteonJSON.devices[linkDevIndex].operatingFlags.D7,
            );
          } else {
            rampVal = '';
          }

          return rampVal;
        };

        const _getOnLevel = (deviceID, controllerID, group) => {
          const deviceIndex = this.hubDevices.findIndex((item) => {
            return item.deviceID == deviceID;
          });

          if (
            deviceIndex != -1 &&
                  typeof this.insteonJSON.devices[deviceIndex].links !== 'undefined'
          ) {
            const responderLink = this.insteonJSON.devices[
              deviceIndex
            ].links.filter((link) => {
              return (
                link.group == group &&
                          link.id == controllerID &&
                          link.isInUse == true &&
                          link.controller == false
              );
            });

            if (responderLink.length == 0) {
              return '';
            } else {
              return responderLink[0].onLevel;
            }
          } else {
            return '';
          }
        };

        hubhubResponderLinks.forEach((responder) => {
          //Need to get the on level and ramp rate from the device itthis
          const rampVal = _getRampRate(responder.id);
          const onLevel = _getOnLevel(responder.id, this.hubInfo.id, groupNum);

          const responderData = {
            group: groupNum,
            id: responder.id,
            onLevel: onLevel,
            rampRate: rampVal,
          };
          responders.push(responderData);
        });

        scenes.push({
          group: groupNum,
          controllers: controllers,
          responders: responders,
        });
      });
      this.log(scenes);
      this.scenes = scenes;
      this.insteonJSON.hub.scenes = scenes;

      if (callback) {
        callback();
      } else {
        return;
      }
    }

    beep(deviceID) {
      this.log('Sending beep command to ' + deviceID);
      this.hub.directCommand(deviceID, '30');
      return;
    }

    generateDeviceConfig(deviceID, res, callback) {
      let theDevice = this.hubDevices.filter((item) => {
        return item.deviceID == deviceID;
      });

      theDevice = theDevice[0];

      const _generateDeviceConfig = () => {
        const filtered = this.deviceDatabase.filter((item) => {
          return item.category == theDevice.info.deviceCategory.id;
        });
        const found = filtered.find((item) => {
          return item.subcategory == theDevice.info.deviceSubcategory.id;
        });
        const hkDeviceType = found.deviceType;

        const devConf: any = {};
        devConf.name = theDevice.name || theDevice.deviceID;
        devConf.deviceID = theDevice.deviceID;
        devConf.deviceType = hkDeviceType;

        switch (devConf.deviceType) {
          case 'dimmer':
          case 'lightbulb':
            devConf.dimmable = 'yes';
            break;
          case 'switch':
            devConf.dimmable = 'no';
            break;
        }

        callback(null, devConf, res);
      };


      if (
        typeof theDevice.info === 'undefined' ||
            typeof theDevice.info.deviceCategory === 'undefined'
      ) {
        this.getDeviceInfo(theDevice.deviceID, res, (error, info) => {
          if (typeof theDevice.info === 'undefined') {
            //devInfo error callback broken
            this.log('Could not get device info for ' + theDevice.deviceID);
            error = new Error('Could not get device info');
            callback(error, null, res);
          } else {
            _generateDeviceConfig();
          }
        });
      } else {
        this.log('Already have device info for ' + deviceID);
        _generateDeviceConfig();
      }
    }

    addDeviceToConfig(devConf, res, callback) {
      const configDevice = this.devices.filter((item) => {
        return item.deviceID == devConf.deviceID;
      });

      if (configDevice.length != 0) {
        this.log('Device already in config, not adding.');
        callback(res);
      } else {
        this.log('Device not found in config, adding ' + devConf.name + '.');
        this.config.platforms[this.platformIndex].devices.push(devConf);

        this.log('Config to save: ' + JSON.stringify(this.config));
        //this.saveConfig(res)
        callback(res);
      }
    }

    getScripts() {
      this.addDevRow =
            '<script>' +
            '$("#add").click(function() {' +
            '$("#devTable").append("' +
            this.deviceTemplate +
            '");' +
            '$("#devConfigForm").validator("update");' +
            '});' +
            '</>';

      this.addSceneRow =
            '<script>' +
            '$("#addScene").click(function() {' +
            '$("#sceneTemplate").append("' +
            this.sceneTemplate +
            '");' +
            '$("#sceneTemplate").validator("update");' +
            '});' +
            '</script>';

      this.validator =
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/1000hz-bootstrap-validator/0.11.9/validator.min.js"></script>';

      this.dataTable =
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.12/js/jquery.dataTables.min.js"></script>' +
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.12/js/dataTables.bootstrap.min.js"></script>' +
            '<script>' +
            '$(document).ready(function() {' +
            '$(\'#linkTable\').DataTable({\'pageLength\': 25, \'responsive\': true, \'retrieve\': true});' +
            '});' +
            '</script>';

      this.buttonAnimation =
            '<script>' +
            '$(\'.btn.load\').on(\'click\', function() {' +
            'var $this = $(this);' +
            '$this.button(\'loading\');' +
            'setTimeout(function() {' +
            '$this.button(\'reset\');' +
            '}, 300000);' +
            '});' +
            '</script>';

      this.listHighlight =
            '<script>' +
            '$(\'.list-group-item\').on(\'click\', function() {' +
            'var $this = $(this);' +
            '$(\'.active\').removeClass(\'active\');' +
            '$this.toggleClass(\'active\')' +
            '})' +
            '</script>';

      this.alertFade = `<script>
		$(document).ready (
			function(){
				$("#saveAlert").fadeTo(2000, 500).slideUp(500, function(){
				$("#saveAlert").slideUp(500);
				if(window.location.pathname.indexOf('/devices/') >= 0) {
					var url = window.location.href
				} else {
					var url = document.referrer
				}
					window.location.replace(url);
				});
		});
		</script>`;

      this.sseInit = `<script>
		function sseInit(e) {
			var sender = $(e).attr('id');

			if (!!window.EventSource) {
				var source = new EventSource('/events');
			}

			$('#progressModal').modal({show:true});

			source.addEventListener('message', function(e) {
				this.log(e.data);
				var data = JSON.parse(e.data)
				var message = data.message

			if(message == 'prompt') {
					$('#progressModal .modal-footer').show();
					message = 'No changes to device database.  Update links anyway?'
					$('#progressModal .modal-body').text(message);
				} else if(message == 'close') {
					$('#progressModal').modal({show:false});
				} else {$('#progressModal .modal-body').text(message);}
			}, false);

			source.addEventListener('open', function(e) {
				this.log('Connection opened');
			}, false);

			source.addEventListener('error', function(e) {
				if (e.readyState == EventSource.CLOSED) {
					this.log('Connection closed');
				}
			}, false);
		}
		</script>`;

      /*this.progressModal = "<div id='progressModal' class='modal fade' role='dialog'>" +
                        "<div class='modal-dialog'>" +
                        "<div class='modal-content'>" +
                        "<div class='modal-header'>" +
                        "<button type='button' class='close' data-dismiss='modal'>&times;</button>" +
                        "<h4 class='modal-title'>Getting links and devices from Hub...</h4>" +
                        '</div>' +
                        "<div class='modal-body' hidden='true'>" +
                        '<p> </p>' +
                        '</div>' +
                        "<div class='modal-footer' hidden='true'>" +
                        "<button type='button' class='btn btn-danger' id='progressModalYes'>Yes</button>" +
                        "<button type='button' class='btn btn-default btn-primary' data-dismiss='modal'>Close</button>" +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>'*/

      this.scripts =
            this.validator +
            this.dataTable +
            this.buttonAnimation +
            this.alertFade +
            this.sseInit; //+ this.progressModal
    }

    stripEscapeCodes(chunk) {
      const receivedData = chunk
        .toString()
        .replace(/%7E/g, '~')
        .replace(/%26/g, '&')
        .replace(/%40/g, '@')
        .replace(/%23/g, '#')
        .replace(/%7B/g, '{')
        .replace(/%0D/g, '')
        .replace(/%0A/g, '')
        .replace(/%2C/g, ',')
        .replace(/%7D/g, '}')
        .replace(/%3A/g, ':')
        .replace(/%22/g, '"')
        .replace(/\+/g, ' ')
        .replace(/\+\+/g, '')
        .replace(/%2F/g, '/')
        .replace(/%3C/g, '<')
        .replace(/%3E/g, '>')
        .replace(/%5B/g, '[')
        .replace(/%5D/g, ']');
      return receivedData;
    }

    log(data){
      const timestamp = moment().format('l, h:mm:ss A');
      console.log('[' + timestamp + ']' + chalk.blue(' [InsteonUI] ') + data);
    }
}
