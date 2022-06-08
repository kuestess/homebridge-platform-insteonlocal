/* eslint-disable max-len */

import deviceDatabase from '../deviceDatabase.json';
const byteToRampRate =
  require('home-controller/lib/Insteon/utils').byteToRampRate;
const toByte = require('home-controller/lib/Insteon/utils').toByte;
const rampRates = require('home-controller/lib/Insteon/utils').RAMP_RATES;
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

  constructor(private readonly configPath: any, private readonly hub: any) {
    this.configDir = configPath.replace('config.json', '');
    this.init(configPath, hub);

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

  init(configPath, hub, callback) {
    console.log('Initializing Insteon UI ');

    this.loadConfig();

    this.loadInsteonConfig(() => {
      this.buildDeviceList();
    });

    if (callback) {
      callback();
    }
  }

  loadConfig() {
    console.log('Reading config from ' + this.configPath);

    const configJSON = fs.readFileSync(this.configPath);
    this.config = JSON.parse(configJSON);

    this.platforms = this.config.platforms;
    console.log('Found ' + this.platforms.length + ' platform(s) in config');

    this.platformIndex = this.config.platforms.findIndex((item) => {
      return item.platform == 'InsteonLocal';
    });

    const platform = this.platforms.filter((item) => {
      return item.platform == 'InsteonLocal';
    });

    this.platform = platform[0];
    this.devices = this.platform.devices;
  }

  loadInsteonConfig(callback) {
    if (fs.existsSync(this.configDir + './insteon.json')) {
      console.log('Reading devices from insteon.json');
      const insteonJSON = fs.readFileSync(this.configDir + './insteon.json');

      this.insteonJSON = JSON.parse(insteonJSON);
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

      console.log('Creating new insteon.json');

      if (callback) {
        callback();
      }
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
      '</script>';

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
		  $(document).ready (function(){
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
		  function sseInit() {
			  $('#progressModal').modal({show:true});

			  if (!!window.EventSource) {
				  var source = new EventSource('/events');
			  }

			  source.addEventListener('message', function(e) {
				  console.log(e.data);
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
				  console.log('Connection opened');
			  }, false);

			  source.addEventListener('error', function(e) {
				  if (e.readyState == EventSource.CLOSED) {
					  console.log('Connection closed');
				  }
			  }, false);
		  }
		  </script>`;

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

    this.scripts =
      this.validator +
      this.dataTable +
      this.buttonAnimation +
      this.alertFade +
      this.sseInit +
      this.progressModal;
  }

  stripEscapeCodes(chunk) {
    const receivedData = chunk
      .toString()
      .replace(/\%7E/g, '~')
      .replace(/\%26/g, '&')
      .replace(/\%40/g, '@')
      .replace(/\%23/g, '#')
      .replace(/\%7B/g, '{')
      .replace(/\%0D/g, '')
      .replace(/\%0A/g, '')
      .replace(/\%2C/g, ',')
      .replace(/\%7D/g, '}')
      .replace(/\%3A/g, ':')
      .replace(/\%22/g, '"')
      .replace(/\+/g, ' ')
      .replace(/\+\+/g, '')
      .replace(/\%2F/g, '/')
      .replace(/\%3C/g, '<')
      .replace(/\%3E/g, '>')
      .replace(/\%5B/g, '[')
      .replace(/\%5D/g, ']');
    return receivedData;
  }
}
