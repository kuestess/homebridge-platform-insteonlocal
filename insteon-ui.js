'use strict'
var deviceDatabase = require('./deviceDatabase.json')
var byteToRampRate = require('home-controller/lib/Insteon/utils').byteToRampRate
var toByte = require('home-controller/lib/Insteon/utils').toByte
var rampRates = require('home-controller/lib/Insteon/utils').RAMP_RATES
var util = require('util')
var fs = require('fs')
var event = require('events')
var sse = new event()
var ui

var InsteonUI = function (configPath, hub) {
	var self = this
	ui = this

	self.configDir = configPath.replace('config.json','')
	self.init(configPath, hub)

	self.deviceDatabase = deviceDatabase
	self.wastebasket = '&#128465'

	self.getScripts()

	var customCSS = `<style>
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
	</style>`

	self.bootstrap = "<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css'>" + customCSS

	self.dataTables = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.12/css/dataTables.bootstrap.min.css" />'

	self.font = "<link href='https://fonts.googleapis.com/css?family=Open+Sans:300,600' rel='stylesheet' type='text/css'>"

	self.tablestyle = '<style>' +
		'.responsive-wrapper { margin-bottom: 15px; }' +
		'.responsive-wrapper .row { display: flex; width: 100%; justify-content: space-between; padding: 1em 0.1em; margin: 0; }' +
		'.responsive-wrapper .row.content:hover { background-color: #e6e6e6; }' +
		'.row.header { border-bottom: 2px solid #ddd; }' +
		'.row.header div { font-weight: 600; font-size: 16px; }' +
		'.row.content { border: 1px solid hsla(0, 0%, 90%, 1); border-top: none; -webkit-transition: all 0.1s cubic-bezier(1, 0, 0.5, 1); transition: all 0.1s cubic-bezier(1, 0, 0.5, 1); }' +
		'</style>'

	self.style = "<style>h1, h2, h3, h4, h5, h6 {font-family: 'Open Sans', sans-serif;}p, div {font-family: 'Open Sans', sans-serif;} input[type='radio'], input[type='checkbox'] {line-height: normal; margin: 0;}</style>"

	self.header = "<html><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'><head><title>InsteonUI - Configuration</title>" + self.bootstrap + self.dataTables + self.font + self.style + self.tablestyle
		+ "<script src='http://code.jquery.com/jquery-latest.min.js' type='text/javascript'></script>"
		+ "<script src='http://code.jquery.com/ui/1.12.1/jquery-ui.min.js'></script>"
		+ "</head><body style='padding-top: 70px;'>"

	self.footer = `</body>
		<script defer='defer' src='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js' type='text/javascript'></script>`
		+ self.scripts + '</html>'

	self.navBar = `<nav class="navbar navbar-default navbar-fixed-top">
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
	</nav>`
}

InsteonUI.prototype.init = function (configPath, hub, callback) {
	var self = this

	console.log('Initializing Insteon UI ')

	self.configPath = configPath
	self.hub = hub
	self.loadConfig()

	self.loadInsteonConfig(function () {
		self.buildDeviceList()
		self.getHubInfo()
	})

	if (callback) {callback()}
}

InsteonUI.prototype.renderMainPage = function (res) {
	var self = this

	self.devList = "<select class='form-control' name='deviceType'> " +
		"<option value='lightbulb'>lightbulb</option>" +
		"<option value='dimmer'>dimmer</option>" +
		"<option value='switch'>switch</option>" +
		"<option value='scene'>scene</option>" +
		"<option value='remote'>remote</option>" +
		"<option value='iolinc'>iolinc</option>" +
		"<option value='motionsensor'>motionsensor</option>" +
		"<option value='leaksensor'>leaksensor</option>" +
		"<option value='outlet'>outlet</option>" +
		"<option value='fan'>fan</option>" +
		'</select>'

	function _getDevList (device) {
		var deviceTypes = ['lightbulb','dimmer','switch','scene','remote','iolinc','motionsensor','leaksensor','outlet','fan']
		var listHeader = "<select class='form-control' name='deviceType'>"
		var listFooter = '</select>'
		var devList = listHeader

		deviceTypes.forEach(function(deviceType){
			if (device.deviceType == deviceType) {
				devList = devList + "<option selected value='" + deviceType + "'>" + deviceType + "</option>"
			} else {
				devList = devList + "<option value='" + deviceType + "'>" + deviceType + "</option>"
			}
		})

		devList = devList + listFooter
		return devList
	}

	self.dimList = "<select class='form-control' name='dimmable'>" +
		"<option value='yes'>yes</option>" +
		"<option value='no'>no</option>" +
		'</select>'

	function _getDimList (device) {
		var dims = ['yes', 'no']
		var listHeader = "<select class='form-control' name='dimmable'>"
		var listFooter = '</select>'
		var dimList = listHeader

		dims.forEach(function(dim){
			if (device.dimmable == dim) {
				dimList = dimList + "<option selected value='" + dim + "'>" + dim + "</option>"
			} else {
				dimList = dimList + "<option value='" + dim + "'>" + dim + "</option>"
			}
		})

		dimList = dimList + listFooter
		return dimList
	}

	buildHubTable()
	buildDeviceTable()

	self.hubDeviceTableHeader = `<div class="responsive-wrapper">
		<div class="row header">
		<div>Name</div>
		<div>Device ID</div>
		<div>Device Type</div>
		<div>Dimmable?</div>
		</div>`

	res.write(self.header + self.navBar);
	res.write("<div class='container'>");
	res.write('<h3>Hub Configuration</h3>');
	res.write("<form enctype='application/x-www-form-urlencoded' action='/saveHubSettings' method='post'>")
	res.write(self.hubTable)
	res.write("<input type='submit' class='btn btn-default center-block' style='width:135px' value='Save' />")
	res.write('</form>')
	res.write('<hr>')
	res.write('<h3>Devices</h3>');

	if (typeof (self.devices) != 'undefined') {
		res.write("<form class='form-inline' width='100%' enctype='application/x-www-form-urlencoded' id='devConfigForm' name='devConfigForm' action='/saveConfigDeviceSettings' data-toggle='validator' novalidate='true' method='post'>")
		res.write(self.hubDeviceTableHeader + self.deviceTable + '</div>')
		res.write("<div class='col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center'>")
		res.write("<div class='btn-group'>")
		res.write("<input href='#' class='btn btn-default center-block' id='add' style='width:135px' value='Add' />")
		res.write("<input class='btn btn-default center-block' type='submit' style='width:135px' value='Save' />")
		res.write('</div>')
		res.write('</form>')
	} else {
		res.write('No devices installed or configured!')
	}

	self.deviceTemplate = "<div class='row content'>" +
		"<div class='input-group'><input type='text' class='form-control' name='name' required='required' data-error='Enter dev name' value=''><div class='help-block with-errors'></div></div>" +
		"<div class='input-group'><input type='text' class='form-control' name='deviceID' required='required' data-error='Enter dev id' value=''><div class='help-block with-errors'></div></div>" +
		"<div class='input-group'>" + self.devList + '</div>' +
		"<div class='input-group'>" + self.dimList + '</div>' +
		"<div class='input-group'><a href='/removeDevice' class='btn btn-default btn-danger' style='outline:none !important'><span class='glyphicon glyphicon-trash'></span></a></div>" +
		"</div class='row content'>"

	self.addDevRow = '<script>' +
		'$("#add").click(function() {' +
		'$("#devTable").append("' + self.deviceTemplate + '");' +
		'$("#devConfigForm").validator("update");' +
		'});' +
		'</script>'

	res.write('</div>')
	res.end(self.addDevRow + self.footer)

	function buildDeviceTable() {
		self.deviceTable = "<div id='devTable'>"

		self.devices.forEach(function (device) {
			var devList = _getDevList(device)
			var dimList = _getDimList(device)

			self.deviceTable = self.deviceTable +
				"<div class='row content'>" +
				"<div class='input-group'><input type='text' class='form-control' name='name' required='required' data-error='Enter dev name' value='" + device.name + "'><div class='help-block with-errors'></div></div>" +
				"<div class='input-group'><input type='text' class='form-control' name='deviceID' required='required' data-error='Enter dev id' value='" + device.deviceID + "'><div class='help-block with-errors'></div></div>" +
				"<div class='input-group'><name='deviceType' value='" + device.deviceType + "'>" + devList + '</div>' +
				"<div class='input-group'><name='dimmable' value='" + device.dimmable + "'>" + dimList + '</div>' +
				"<div class='input-group'><a href='/removeDevice" + device.deviceID + "' class='btn btn-default btn-danger' style='outline:none !important'><span class='glyphicon glyphicon-trash'></span></a></div>" +
				"</div class='row'>"
		})

		self.deviceTable = self.deviceTable + '</div>'
	}

	function buildHubTable() {
		self.hubTable = ''
		var hubUsername = "<div class='form-group'><label for='username'>Username:</label><input type='text' class='form-control' name='hubUsername' value='" + self.platform.user + "'></div>"
		var hubPassword = "<div class='form-group'><label for='password'>Password:</label><input type='text' class='form-control' name='hubPassword' value='" + self.platform.pass + "'></div>"
		var hubAddress = "<div class='form-group'><label for='host'>Hub address:</label><input type='text' class='form-control' name='hubAddress' value='" + self.platform.host + "'></div>"
		var hubPort = "<div class='form-group'><label for='port'>Hub port:</label><input type='text' class='form-control' name='hubPort' value='" + self.platform.port + "'></div>"
		var hubModel = "<div class='form-group'><label for='model'>Hub model:</label><input type='text' class='form-control' name='hubModel' value='" + self.platform.model + "'></div>"
		var hubRefresh = "<div class='form-group'><label for='refresh'>Refresh:</label><input type='text' class='form-control' name='hubRefresh' value='" + self.platform.refresh + "'></div>"
		var hubKeepalive = "<div class='form-group'><label for='keepalive'>Keepalive:</label><input type='text' class='form-control' name='hubKeepalive' value='" + self.platform.keepAlive + "'></div>"

		self.hubTable = hubUsername + hubPassword + hubAddress + hubPort + hubModel + hubRefresh + hubKeepalive
	}
}

InsteonUI.prototype.renderHubPage = function (res) {
	var self = this

	self.buildHubSceneData()

	if (typeof self.hubLinks == 'undefined' || Object.keys(self.hubLinks).length == 0) {
		self.hubLinkTable = '<h4>No links in Insteon config - please click Get Links to get links and devices from Hub</h4>'
	} else { buildHubLinkTable() }

	if (self.hubInfo == undefined || self.hubInfo.length == 0) {
		self.hubInfoTable = '<h4> Please click Get Hub Info</h4>'
	} else {

		self.hubInfoTable = ''
		var hubAddress = "<div class='form-group'><b>Hub address: </b>" + self.platform.host + '</div>'
		var hubPort = "<div class='form-group'><b>Hub port: </b>" + self.platform.port + '</div>'
		var hubModel = "<div class='form-group'><b>Hub model: </b>" + self.platform.model + '</div>'
		var hubID = "<div class='form-group'><b>ID: </b>" + self.hubInfo.id + '</div>'
		var hubFirmwareVersion = "<div class='form-group'><b>Firmware Version: </b>" + self.hubInfo.firmwareVersion + '</div>'

		self.hubInfoTable = hubAddress + hubPort + hubModel + hubID + hubFirmwareVersion
	}

	res.write(self.header + self.navBar)
	res.write("<div class='container'>")
	res.write('<h2>Hub Information</h2>')
	res.write(self.hubInfoTable)
	res.write("<a class='btn btn-default center-block' role='button' href='/getHubInfo' style='width:135px; height:40px;'>Get Hub Info</a>")
	res.write('<hr>')

	self.hubLinkTableHeader = `<table id="linkTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
	<thead>
	<th scope="col">Group</th>
	<th scope="col">Device ID</th>
	<th scope="col">Controller</th>
	<th scope="col">In Use?</th>
	<th scope="col">On Level</th>
	<th scope="col">Ramp Rate</th>
	<th scope="col">Delete?</th>
	</thead>`

	res.write(`<ul class="nav nav-tabs">
	<li class="active"><a data-toggle="tab" href="#links">Links</a></li>
	<li><a data-toggle="tab" href="#scenes">Scenes</a></li>
	<li>
		<div class="btn-group">
		<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
			Action <span class="caret"></span>
		</button>
		<ul class="dropdown-menu">
			<li><a onclick="sseInit()" href="/getHubDevices">Get Devices/Links</a></li>` +
		`</ul>
		</div>
	</li>
	</ul>`)

	res.write("<div class='tab-content'>")
	res.write('<div id="links" class="tab-pane fade in active">')//start links tab
	res.write('<h2>Links</h2>')
	res.write(self.hubLinkTableHeader)
	res.write(self.hubLinkTable)
	res.write('</div>') //end links tab

	res.write('<div id="scenes" class="tab-pane fade">')//start scenes tab

	self.sceneTable = ''
	self.sceneControllerTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
	<thead>
	<th scope="col">Controller Group</th>
	<th scope="col">Device ID</th>
	</thead>`
	self.sceneResponderTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
		<thead>
		<th scope="col">Group</th>
		<th scope="col">Device ID</th>
		<th scope="col">On Level</th>
		<th scope="col">Ramp Rate</th>
		</thead>`

	buildSceneTable(res, function () {
		res.write(self.header + self.navBar)
		res.write("<div class='container'>")
		res.write('<h3>Scenes</h3><hr>')
		res.write(self.sceneTable)
	})

	function buildSceneTable(res, callback) {
		self.sceneTable = ''

		if(typeof self.scenes == 'undefined' || Object.keys(self.scenes).length == 0 || self.scenes.length == 0){
			self.sceneTable = '<div>No scenes defined. Please click Get Device Info to retrieve device/link information from the Hub </div>'
			callback(res)
			return
		}

		self.scenes.forEach(function (scene) {
			var sceneIndex = self.devices.findIndex(function (item) { return item.groupID == scene.group && item.deviceType == 'scene' })
			var sceneNameText

			if (sceneIndex == -1) {
				sceneNameText = 'Scene ' + scene.group
			} else {
				sceneNameText = self.devices[sceneIndex].name + ' (Scene ' + scene.group + ')'
			}

			var controllerTable = '<h4>Controllers - ' + sceneNameText + '</h4>' + self.sceneControllerTableHeader + '<tbody>'
			var responderTable = '<h4>Responders - ' + sceneNameText + '</h4>' + self.sceneResponderTableHeader + '<tbody>'

			scene.controllers.forEach(function (controller) {
				var insteonDevIndex = self.hubDevices.findIndex(function (item) { return item.deviceID == controller.id })
				var nameText

				if (insteonDevIndex == -1) {
					if (controller.id == self.hubInfo.id) {
						nameText = 'Hub' + ' (' + controller.id + ')'
					} else { nameText = controller.id }
				} else {
					var devName = self.hubDevices[insteonDevIndex].name
					if (devName) {
						nameText = devName + ' (' + controller.id + ')'
					} else { nameText = controller.id }
				}

				controllerTable = controllerTable +
					'<tr>' +
					'<td>' + controller.group + '</td>' +
					'<td>' + nameText + '</td>' +
					'</tr>' +
					'</tbody>'
			})

			controllerTable = controllerTable + '</table>'

			scene.responders.forEach(function (responder) {
				var insteonDevIndex = self.hubDevices.findIndex(function (item) { return item.deviceID == responder.id })
				var nameText

				if (insteonDevIndex == -1) {
					if (responder.id == self.hubInfo.id) {
						nameText = 'Hub' + ' (' + responder.id + ')'
					} else { nameText = responder.id }
				} else {
					var devName = self.hubDevices[insteonDevIndex].name
					if (devName) {
						nameText = devName + ' (' + responder.id + ')'
					} else { nameText = responder.id }
				}

				responderTable = responderTable +
					'<tr>' +
					'<td>' + responder.group + '</td>' +
					'<td>' + nameText + '</td>' +
					'<td>' + responder.onLevel + '</td>' +
					'<td>' + (responder.rampRate) / 1000 + '</td>' +
					'</tr>' +
					'</tbody>'
			})

			responderTable = responderTable + '</table>'

			self.sceneTable = self.sceneTable + controllerTable + '<br>' + responderTable + '<br><hr>'
		})
		self.sceneTable = self.sceneTable + '</table>'
		callback(res)
	}

	res.write('</div>') //end scenes tab
	res.write("</div class='tab-content'>")

	self.progressModal = "<div id='progressModal' class='modal fade' role='dialog'>" +
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
	'</div>'

	self.confirmModal = "<div id='confirmModal' class='modal fade' role='dialog'>" +
	"<div class='modal-dialog'>" +
	"<div class='modal-content'>" +
	"<div class='modal-header'>" +
	"<button type='button' class='close' data-dismiss='modal'>&times;</button>" +
	"<h4 class='modal-title'>Delete Link?</h4>" +
	'</div>' +
	"<div class='modal-body'>" +
	'<p>Click yes to delete the link, or close to cancel.</p>' +
	'</div>' +
	"<div class='modal-footer'>" +
	"<button type='button' class='btn btn-danger' data-dismiss='modal' id='confirmModalYes'>Yes</button>" +
	"<button type='button' class='btn btn-default btn-primary' data-dismiss='modal'>Close</button>" +
	'</div>' +
	'</div>' +
	'</div>' +
	'</div>'

	self.modalConfirmScript = '<script>' +
	"$('.open-modal').on('click',function(){" +
	"var link = $(this).attr('data-href');" +
	"$('#confirmModal').modal({show:true});" +
	"$('#confirmModalYes').click(function(e) {" +
	'window.location.replace(link);' +
	'});' +
	'});' +
	'</script>'

	res.end(self.sseInit + self.progressModal + self.confirmModal + self.modalConfirmScript + self.footer)

	function buildHubLinkTable() {
		self.hubLinkTable = '<tbody>'

		self.hubLinks.forEach(function (link) {
			var insteonDevIndex = self.hubDevices.findIndex(function (item) { return item.deviceID == link.id })
			var nameText

			if (insteonDevIndex == -1) {
				nameText = link.id
			} else {
				var devName = self.hubDevices[insteonDevIndex].name
				if (devName) { //check if blank
					nameText = devName + ' (' + link.id + ')'
				} else { nameText = link.id }
			}

			self.hubLinkTable = self.hubLinkTable +
				'<tr>' +
				'<td>' + link.group + '</td>' +
				'<td>' + nameText + '</td>' +
				'<td>' + link.controller + '</td>' +
				'<td>' + link.isInUse + '</td>' +
				'<td>' + link.onLevel + '</td>' +
				'<td>' + (link.rampRate) / 1000 + '</td>' +
				"<td><div><a href='#' data-href='/removeHubLink/" + self.hubInfo.id + '/' + link.number + "' class='btn btn-default center-block open-modal' style='outline:none !important;'><span style='font-size:12px;'>" + self.wastebasket + ';</span></a></div></td>' +
				'</tr>'
		})

		self.hubLinkTable = self.hubLinkTable + '</tbody>' + '</table>'
	}
}

InsteonUI.prototype.renderDevicePage = function (res, deviceID) {
	var self = this

	self.deviceSceneControllerTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
	<thead>
	<th scope="col">Controller Group</th>
	<th scope="col">Device ID</th>
	</thead>`

	self.deviceSceneResponderTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
	<thead>
	<th scope="col">Controller Group</th>
	<th scope="col">Device ID</th>
	<th scope="col">On Level</th>
	<th scope="col">Ramp Rate</th>
	</thead>`

	if (deviceID == '' || deviceID == null || typeof deviceID == 'undefined') { //nothing selected
		deviceID = ''
		self.deviceLinkTableHeader = ''
		self.deviceLinkTable = ''
		self.deviceSceneTable = ''
		self.hubDeviceInfoTable = ''
		self.hubDeviceOpFlagsTable = ''
		var devName = ''
	} else {
		var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })
		var device = self.insteonJSON.devices[devIndex]

		if (device.name == '') {
			var devName = device.deviceID
		} else {
			var devName = device.name
		}

		if (typeof device == 'undefined' || typeof device.links == 'undefined' || device.links.length == 0) {
			self.deviceLinkTableHeader = ''
			self.deviceLinkTable = '<div>Please click Get Device Info to retrieve device information from the Hub </div>'
			self.deviceSceneTable = '<div>Please click Get Device Info to retrieve device information from the Hub </div>'
			buildOpFlagsTable()
		} else {
			buildDeviceLinkTable()
			buildDeviceSceneData(function (scenes) {
				if (scenes == false) {
					self.deviceSceneTable = ''
				} else { buildDeviceSceneTable() }
			})
			buildOpFlagsTable()

			self.deviceLinkTableHeader = `<table id="linkTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
			<thead>
			<th scope="col">Group</th>
			<th scope="col">Device ID</th>
			<th scope="col">Controller</th>
			<th scope="col">On Level</th>
			<th scope="col">Ramp Rate</th>
			<th scope="col">At</th>
			<th scope="col">D3</th>
			<th scope="col">Delete</th>
			</thead>`

		}

		if (device.info == undefined || device.info.length == 0) {
			self.hubDeviceInfoTable = "<div class='form-group row'><label for='deviceName'>Name: </label><input type='text' class='form-control' name='name' required value='" + device.name + "'></div>"
		} else {
			buildDeviceInfoTable()
		}
	}

	function buildDeviceInfoTable() {
		self.hubDeviceInfoTable = "<div class='form-group row'><label for='deviceName'>Name: </label><input type='text' class='form-control' name='name' required value='" + device.name + "'></div>"

		if (typeof device.info == 'undefined' || device.info.length == 0) {
			self.hubDeviceInfoTable = self.hubDeviceInfoTable + '<div class="form-group row">Please click Get Device Info to retrieve device information from the Hub </div>'
		} else {
			var deviceIDRow = '<div class="form-group row"><b>Device ID: </b>' + device.deviceID + '</div>'
			var firmware = '<div class="form-group row"><b>Firmware: </b>' + device.info.firmware + '</div>'
			var deviceDim = '<div class="form-group row"><b>Dimmable: </b>' + device.info.isDimmable + '</div>'

			var deviceCat = '<div class="form-group row"><b>Device Category: </b>' + device.info.deviceCategory.id + '</div>'

			var filtered = self.deviceDatabase.filter(function (item) { return item.category == device.info.deviceCategory.id })
			var found = filtered.find(function (item) { return (item.subcategory == device.info.deviceSubcategory.id) })

			var model = found.sku
			var description = found.name

			var deviceModel = '<div class="form-group row"><b>Model: </b>' + model + '</div>'
			var deviceDesc = '<div class="form-group row"><b>Description: </b>' + description + '</div>'

			self.hubDeviceInfoTable = self.hubDeviceInfoTable + deviceIDRow + firmware + deviceCat + deviceDim + deviceModel + deviceDesc
		}
	}

	function buildOpFlagsTable() {
		if (typeof device.operatingFlags == 'undefined') {
			self.hubDeviceOpFlagsTable = '<div>Please click Get Device Info to retrieve device information from the Hub </div>'
		} else {
			var rampRate = byteToRampRate(device.operatingFlags.D7) / 1000
			var onLevel = Math.ceil(parseInt(device.operatingFlags.D8, 16) / 255 * 100)
			var ledBrightness = Math.ceil(parseInt(device.operatingFlags.D9, 16) / 128 * 100)
			var databaseDelta = (typeof device.databaseDelta == 'undefined') ? '' : device.databaseDelta
			var progLock = (typeof device.operatingFlags.programLock == 'undefined') ? '' : device.operatingFlags.programLock
			var resumeDim = (typeof device.operatingFlags.resumeDim == 'undefined') ? '' : device.operatingFlags.resumeDim
			var ledEnable = (typeof device.operatingFlags.ledEnable == 'undefined') ? '' : device.operatingFlags.ledEnable
			var keys = (typeof device.operatingFlags.keys == 'undefined') ? '' : device.operatingFlags.keys

			if(typeof self.hubDevices[devIndex].info != 'undefined'){
				var filtered = self.deviceDatabase.filter(function (item) {return item.category == self.hubDevices[devIndex].info.deviceCategory.id })
				var found = filtered.find(function (item) { return (item.subcategory == self.hubDevices[devIndex].info.deviceSubcategory.id) })

				if (found.name.includes('Keypad')) {
					var keyRow = '<td><b>Button Configuration: </b>' + keys + '</td>'
				} else { var keyRow = '' }
			}

			self.hubDeviceOpFlagsTableHeader = `<table id="flagsTable" class="table" cellspacing="0" cellpadding="0" width="100%">`

			self.hubDeviceOpFlagsTable = '<tr>' +
				'<td><b>Ramp Rate: </b>' + rampRate + '</td>' +
				'<td><b>Programming Lock: </b>' + progLock + '</td>' +
				'</tr>' +
				'<tr>' +
				'<td><b>On Level: </b>' + onLevel + '</td>' +
				'<td><b>Resume Dim: </b>' + resumeDim + '</td>' +
				'</tr>' +
				'<tr>' +
				'<td><b>LED Brightness: </b>' + ledBrightness + '</td>' +
				'<td><b>Database Delta: </b>' + databaseDelta + '</td>' +
				'</tr>' +
				'<tr>' +
				'<td><b>LED Enable: </b>' + ledEnable + '</td>' +
				keyRow +
				'</tr>' +
				'</table>'

			self.hubDeviceOpFlagsTable = self.hubDeviceOpFlagsTableHeader + self.hubDeviceOpFlagsTable
		}
	}

	if (typeof self.hubDevices == 'undefined' || self.hubDevices.length == 0 || Object.keys(self.insteonJSON.devices).length == 0) {
		self.hubDeviceTable = '<p>No devices in Insteon config - please click Get Devices to get links and devices from Hub</p>'
	} else {
		self.hubDeviceTable = "<ul class='list-group' id='hubDevTable'>"

		self.hubDevices.forEach(function (hubDevice) {
			var linkText
			if (hubDevice.name == '') {
				linkText = hubDevice.deviceID
			} else { linkText = hubDevice.name + ' (' + hubDevice.deviceID + ')' }

			if (hubDevice.deviceID == deviceID) {
				var status = 'active'
			} else { var status = '' }

			self.hubDeviceTable = self.hubDeviceTable +
				'<li class="list-group-item ' + status + '" id="' + deviceID + '">' +
				'<a href="/devices/' + hubDevice.deviceID + '">' + linkText + '</a>' +
				'</li class="list-group-item">'
		})

		self.hubDeviceTable = self.hubDeviceTable + '</ul class="list-group">'
	}

	if (typeof self.hubDevices == 'undefined') {
		var numberDevices = 0
	} else {
		var numberDevices = self.hubDevices.length
	}

	res.write(self.header + self.navBar)
	res.write("<div class='container-fluid'>")
	res.write("<div class='btn-toolbar pull-right'>")
	res.write("<a class='btn btn-default load center-block getlinks' onclick='sseInit()' id='getAllLinks' role='button' href='/getAllDeviceLinks' style='width:135px; height:30px;'>Get All Dev Links</a>")
	res.write('</div>')

	res.write("<div class='col-xs-2 col-sm-4 left'>")
	res.write("<div class='row'>")
	res.write("<h4 class='sub-header pull-left'>Devices (" + numberDevices + ')</h4>')
	res.write("<a class='btn btn-default load pull-right' role='button' href='/getHubDevices' style='width:135px; height:30px;'>Get Devices</a>")
	res.write("</div class='row'>")
	res.write("<div class='table-responsive'>")
	res.write(self.hubDeviceTable)
	res.write("</div class='table-responsive'>")
	res.write("</div class='col-xs-6 col-sm-4'>")

	res.write("<div class='col-xs-12 col-sm-6 col-md-8 right'>")

	//Device info form
	res.write("<form enctype='application/x-www-form-urlencoded' action='/saveDeviceSettings' method='post'>")
	res.write("<h3 class='sub-header'>Device Info - " + devName + '</h3>')
	res.write(self.hubDeviceInfoTable)
	res.write("<input class='btn btn-default center-block' type='submit' style='width:135px' value='Save' />")
	res.write('</form>')
	res.write('<hr>')

	res.write(`<ul class="nav nav-tabs">
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
		"<li><a class='ajaxload' id='beep' data-href='/beep/" + deviceID + "' href='#'>Beep</a></li>" +
		`<li><a class='ajaxload' onclick="sseInit()" href="#" data-href="/getDeviceInfo">Get Dev Info/Links</a></li>
		</ul>
		</div>
	</li>
	</ul>`)

	//Device op flags
	res.write("<div class='tab-content'>")
	res.write('<div id="opflags" class="tab-pane fade in active">')//start op flags tab
	res.write("<h3 class='sub-header'>Operating Flags </h3>")
	res.write("<form enctype='application/x-www-form-urlencoded' action='#' method='post'>")
	res.write(self.hubDeviceOpFlagsTable)
	res.write('</form>')
	res.write('</div>') //end op flags tab

	self.getAllLinksScript = '<script>' +
	"$('.getlinks').bind('click', function(e) {" +
	'e.preventDefault();' +
	"$('#getAllLinks').load('/getAllDeviceLinks');" +
	'});' +
	'</script>'

	self.confirmModal = "<div id='confirmModal' class='modal fade' role='dialog'>" +
		"<div class='modal-dialog'>" +
		"<div class='modal-content'>" +
		"<div class='modal-header'>" +
		"<button type='button' class='close' data-dismiss='modal'>&times;</button>" +
		"<h4 class='modal-title'>Delete Link?</h4>" +
		'</div>' +
		"<div class='modal-body'>" +
		'<p>Click yes to delete the link, or close to cancel.</p>' +
		'</div>' +
		"<div class='modal-footer'>" +
		"<button type='button' class='btn btn-danger' data-dismiss='modal' id='confirmModalYes'>Yes</button>" +
		"<button type='button' class='btn btn-default btn-primary' data-dismiss='modal'>Close</button>" +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>'

	self.databaseModal = "<div id='databaseModal' class='modal fade' role='dialog'>" +
		"<div class='modal-dialog'>" +
		"<div class='modal-content'>" +
		"<div class='modal-header'>" +
		"<button type='button' class='close' data-dismiss='modal'>&times;</button>" +
		"<h4 class='modal-title'>Database already up to date</h4>" +
		'</div>' +
		"<div class='modal-body'>" +
		'<p>Click yes update device links anyway, or close to cancel.</p>' +
		'</div>' +
		"<div class='modal-footer'>" +
		"<button type='button' class='btn btn-danger' data-dismiss='modal' id='databaseModalYes'>Yes</button>" +
		"<button type='button' class='btn btn-default btn-primary' data-dismiss='modal'>Close</button>" +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>'

	self.progressModal = "<div id='progressModal' class='modal fade' role='dialog'>" +
		"<div class='modal-dialog'>" +
		"<div class='modal-content'>" +
		"<div class='modal-header'>" +
		"<button type='button' class='close' data-dismiss='modal'>&times;</button>" +
		"<h4 class='modal-title'><b>Updating device...</b></h4>" +
		'</div>' +
		"<div class='modal-body'>" +
		'<p> </p>' +
		'</div>' +
		"<div class='modal-footer' hidden='true'>" +
		"<button type='button' class='btn btn-danger' id='progressModalYes'>Yes</button>" +
		"<button type='button' class='btn btn-default btn-primary' data-dismiss='modal'>Close</button>" +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>'

	self.ajaxLoadScript = '<script>' +
		"$('.ajaxload').bind('click', function(e) {" +
			'e.preventDefault();' +
			"var link = $(this).attr('data-href');" +
			"$('.ajaxload').load(link);" +
		'});' +
		'</script>'

	self.modalConfirmScript = '<script>' +
		"$('.open-modal').on('click',function(){" +
		"var link = $(this).attr('data-href');" +
		"$('#confirmModal').modal({show:true});" +
		"$('#confirmModalYes').click(function(e) {" +
		'window.location.replace(link);' +
		'});' +
		'});' +
		'</script>'

	self.progressModalYes = '<script>' +
		"$('#progressModalYes').click(function(e) {" +
		'e.preventDefault();' +
		"$('#progressModal .modal-footer').hide();" +
		"$('#progressModal').load('/getLinks/" + deviceID + "');" +
		'});' +
		'</script>'

	res.write('<div id="links" class="tab-pane fade">')//start links tab
	res.write("<h3 class='sub-header'>Links</h3>")
	res.write('<div class="table-responsive">')
	res.write(self.deviceLinkTableHeader)
	res.write(self.deviceLinkTable)
	res.write('</div class="table-responsive">')
	res.write('</div>') //end links tab

	res.write('<div id="scenes" class="tab-pane fade">')//start scenes tab
	res.write("<h3 class='sub-header'>Scenes</h3>")
	res.write('<div class="table-responsive">')
	res.write(self.deviceSceneTable)
	res.write('</div class="table-responsive">')
	res.write('</div>') //end scenes tab

	res.write("</div class='tab-content'>")
	res.write("</div class='col-xs-12 col-sm-6 col-md-8'>")

	res.write(self.confirmModal)
	res.write(self.databaseModal)
	res.write(self.progressModal)
	res.end(self.ajaxLoadScript + self.sseInit + self.modalConfirmScript + self.progressModalYes + self.getAllLinksScript + self.footer)

	function buildDeviceLinkTable() {
		self.deviceLinkTable = '<tbody>'

		self.insteonJSON.devices[devIndex].links.forEach(function (link) {
			if (link.isInUse) {
				var insteonDevIndex = self.hubDevices.findIndex(function (item) { return item.deviceID == link.id })
				var nameText
				var rampRateText

				if (insteonDevIndex == -1) {
					if (link.id == self.hubInfo.id) {
						nameText = 'Hub' + ' (' + link.id + ')'
					} else { nameText = link.id }
				} else {
					var devName = self.hubDevices[insteonDevIndex].name
					if (devName) {
						nameText = devName + ' (' + link.id + ')'
					} else { nameText = link.id }
				}

				if (typeof link.rampRate == 'undefined') {
					rampRateText = _getRampRate(deviceID) / 1000
				} else { rampRateText = parseInt(link.rampRate) / 1000 }

				self.deviceLinkTable = self.deviceLinkTable +
					'<tr>' +
					'<td>' + link.group + '</td>' +
					'<td>' + nameText + '</td>' +
					'<td>' + link.controller + '</td>' +
					'<td>' + link.onLevel + '</td>' +
					'<td>' + rampRateText + '</td>' +
					'<td>' + link.at + '</td>' +
					'<td>' + link.data[2] + '</td>' +
					"<td><div><a href='#' class='btn btn-default center-block open-modal' data-href='/removeLink/" + device.deviceID + '/' + link.at + "'' style='outline:none !important;'><span style='font-size:12px;'>" + self.wastebasket + ';</span></a></div></td>' +
					'</tr>'
			}
		})
		self.deviceLinkTable = self.deviceLinkTable + '</tbody>' + '</table>'
	}

	function buildDeviceSceneData(callback) {
		var groups = []
		var scenes = []
		var responders = []

		console.log('Building scene data for ' + self.insteonJSON.devices[devIndex].name + '...')
		self.insteonJSON.devices[devIndex].links.forEach(function (link) {
			if (link !== null && link.isInUse) {
				groups.push(link.group)
			}
		})

		//filter for unique groups
		var deviceGroups = groups.filter(function (item, index, inputArray) {
			return inputArray.indexOf(item) == index
		})

		deviceGroups = deviceGroups.sort(function (x, y) { return x - y })

		if (typeof deviceGroups == 'undefined' || deviceGroups.length == 0) {
			console.log('No scenes for ' + self.insteonJSON.devices[devIndex].name)
			callback(false)
			return
		}

		deviceGroups.forEach(function (groupNum) {
			var responders = []
			var controllers = []

			//get all the links for groupNum
			var groupLinkArray = self.insteonJSON.devices[devIndex].links.filter(function (link) {
				return link.group == groupNum && link.isInUse == true
			})

			//remove groups 0 and 1 if the hub is the controller/responder to clean up the table
			if (groupNum == 0 || groupNum == 1) {
				groupLinkArray = groupLinkArray.filter(function (link) {
					return link.id !== self.hubInfo.id
				})
				if (groupLinkArray.length == 0) { return }
			}

			//get all of the controllers
			groupLinkArray.forEach(function (link) {
				if (link.controller == true) {
					//if true, selected device is controller for group
					var controllerID = deviceID
					var responderID = link.id

					controllers.push({ group: groupNum, id: controllerID })

					var responderIndex = self.hubDevices.findIndex(function (item) {
						return item.deviceID == responderID
					})

					if (responderIndex == -1 || typeof self.insteonJSON.devices[responderIndex].links == 'undefined') {
						//device not in insteon.json
						console.log('No links for ' + responderID + ' found in config')
						return
					}

					var responderLink = self.insteonJSON.devices[responderIndex].links.filter(function (link) {
						return (link.group == groupNum && link.isInUse == true && link.id == controllerID && link.controller == false)
					})

					responderLink = responderLink[0]
					var rampVal = _getRampRate(responderID)

					if (typeof responderLink != 'undefined' && responderLink.length != 0) {
						var responderData = { group: groupNum, id: responderID, onLevel: responderLink.onLevel, rampRate: rampVal }
						responders.push(responderData)
					}
				} else if (link.controller == false) {
					var controllerID = link.id
					var responderID = deviceID

					//first check if the Hub is controller
					if (controllerID == self.hubInfo.id) {
						var hubhubResponderLinks = self.insteonJSON.hub.links.filter(function (link) {
							return link.group == groupNum &&
								link.isInUse == true &&
								link.controller == true
						})

						controllers.push({ group: groupNum, id: controllerID })

						hubhubResponderLinks.forEach(function (responder) {
							//Need to get the on level and ramp rate from the device itself
							var rampVal = _getRampRate(responder.id)
							var onLevel = _getOnLevel(responder.id, self.hubInfo.id, groupNum)

							var responderData = { group: groupNum, id: responder.id, onLevel: onLevel, rampRate: rampVal }
							responders.push(responderData)
						})

					} else { //link.controller == false and controllerID is not the Hub
						//if false, selected device is controlled by device in link; selected device is responder
						controllers.push({ group: groupNum, id: controllerID })

						var rampVal = _getRampRate(responderID)
						var onLevel = _getOnLevel(responderID, controllerID, groupNum)

						var responderData = { group: groupNum, id: responderID, onLevel: onLevel, rampRate: rampVal }
						responders.push(responderData) //Maybe don't need to push this?

						var controllerIndex = self.hubDevices.findIndex(function (item) {
							return item.deviceID == controllerID
						})

						if (controllerIndex == -1 || typeof self.insteonJSON.devices[controllerIndex].links == 'undefined') {
							//device not in insteon.json
							console.log('Device/links for ' + controllerID + ' not found in config')
							return
						}

						var responderLinkArray = [] = self.insteonJSON.devices[controllerIndex].links.filter(function (responderLink) {
							return (responderLink.group == groupNum && responderLink.isInUse == true && responderLink.controller == true)
						})

						responderLinkArray.forEach(function (responderLink) { //for each of the devices controlled by the controller, get link information
							//check here if hub is responder id
							if (responderLink.id == self.hubInfo.id) {
								var responderData = { group: groupNum, id: self.hubInfo.id, onLevel: '', rampRate: '' }
								responders.push(responderData)
							} else {
								var responderIndex = self.hubDevices.findIndex(function (item) {
									return item.deviceID == responderLink.id
								})

								if (responderIndex == -1 || typeof self.insteonJSON.devices[responderIndex].links == 'undefined') {
									//device not in insteon.json
									console.log('Device/links for ' + responderLink.id + ' not found in config')
									return
								}

								var responderDevLink = [] = self.insteonJSON.devices[responderIndex].links.filter(function (link) {
									return (link.group == groupNum && link.isInUse == true && link.controller == false)
								})

								responderDevLink.forEach(function (devLink) {
									var rampVal = _getRampRate(responderID)

									var responderData = { group: groupNum, id: devLink.id, onLevel: devLink.onLevel, rampRate: rampVal }
									responders.push(responderData)
								})
							}
						})
					}
				}
			})

			responders = responders.map(JSON.stringify).reverse() // convert to JSON string the array content, then reverse it (to check from end to begining)
				.filter(function (item, index, arr) { return arr.indexOf(item, index + 1) === -1; }) // check if there is any occurence of the item in whole array
				.reverse().map(JSON.parse)

			controllers = controllers.map(JSON.stringify).reverse() // convert to JSON string the array content, then reverse it (to check from end to begining)
				.filter(function (item, index, arr) { return arr.indexOf(item, index + 1) === -1; }) // check if there is any occurence of the item in whole array
				.reverse().map(JSON.parse)

			scenes.push({ group: groupNum, controllers: controllers, responders: responders })
			self.insteonJSON.devices[devIndex].scenes = scenes
		})

		callback(true)
	}

	function _getRampRate(deviceID) {
		var linkDevIndex = self.hubDevices.findIndex(function (item) {
			return item.deviceID == deviceID
		})

		if (linkDevIndex == -1) {
			var rampVal = ''
		} else if (typeof self.insteonJSON.devices[linkDevIndex].operatingFlags !== 'undefined' && typeof self.insteonJSON.devices[linkDevIndex].operatingFlags.D7 !== 'undefined') {
			var rampVal = byteToRampRate(self.insteonJSON.devices[linkDevIndex].operatingFlags.D7)
		} else {
			var rampVal = ''
		}

		return rampVal
	}

	function _getOnLevel(deviceID, controllerID, group) {
		var deviceIndex = self.hubDevices.findIndex(function (item) {
			return item.deviceID == deviceID
		})

		if (deviceIndex != -1 && typeof self.insteonJSON.devices[deviceIndex].links != 'undefined') {
			var responderLink = self.insteonJSON.devices[deviceIndex].links.filter(function (link) {
				return link.group == group &&
					link.id == controllerID &&
					link.isInUse == true &&
					link.controller == false
			})

			if (responderLink.length == 0) {
				return ''
			} else {
				return responderLink[0].onLevel
			}
		} else { return '' }
	}

	function buildDeviceSceneTable() {
		console.log('Building scene table for ' + self.insteonJSON.devices[devIndex].name + '...')
		self.deviceSceneTable = ''

		self.keypadButtonArray = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

		self.deviceSceneTable = '<tbody>'

		if (typeof self.insteonJSON.devices[devIndex].scenes == 'undefined' || self.insteonJSON.devices[devIndex].scenes.length == 0) {
			self.deviceSceneTable = '<p>No scenes defined for ' + self.insteonJSON.devices[devIndex].name + '</p>'
			console.log('No scenes defined for ' + self.insteonJSON.devices[devIndex].name)
			return
		}

		self.insteonJSON.devices[devIndex].scenes.forEach(function (scene) {
			var controllerTable = '<h4>Controllers - Scene ' + scene.group + '</h4>' + self.deviceSceneControllerTableHeader + '<tbody>'
			var responderTable = '<h4>Responders - Scene ' + scene.group + '</h4>' + self.deviceSceneResponderTableHeader + '<tbody>'

			scene.controllers.forEach(function (controller) {
				var insteonDevIndex = self.hubDevices.findIndex(function (item) { return item.deviceID == controller.id })
				var nameText

				if (insteonDevIndex == -1) {
					if (controller.id == self.hubInfo.id) {
						nameText = 'Hub' + ' (' + controller.id + ')'
					} else { nameText = controller.id }
				} else {
					var devName = self.hubDevices[insteonDevIndex].name
					if (devName) {
						nameText = devName + ' (' + controller.id + ')'
					} else { nameText = controller.id }
				}

				if (insteonDevIndex == -1 || self.hubDevices[insteonDevIndex].info == undefined) {
					groupText = controller.group
				} else {
					var filtered = self.deviceDatabase.filter(function (item) { return item.category == self.hubDevices[insteonDevIndex].info.deviceCategory.id })
					var found = filtered.find(function (item) { return (item.subcategory == self.hubDevices[insteonDevIndex].info.deviceSubcategory.id) })
					var groupText

					if (found.name.includes('Keypad')) {
						groupText = controller.group + ' (' + self.keypadButtonArray[controller.group - 1] + ')'
					} else { groupText = controller.group }
				}
				controllerTable = controllerTable +
					'<tr>' +
					'<td>' + groupText + '</td>' +
					'<td>' + nameText + '</td>' +
					'</tr>' +
					'</tbody>'
			})

			controllerTable = controllerTable + '</table>'

			scene.responders.forEach(function (responder) {
				var insteonDevIndex = self.hubDevices.findIndex(function (item) { return item.deviceID == responder.id })
				var nameText

				if (insteonDevIndex == -1) {
					if (responder.id == self.hubInfo.id) {
						nameText = 'Hub' + ' (' + responder.id + ')'
					} else { nameText = responder.id }
				} else {
					var devName = self.hubDevices[insteonDevIndex].name
					if (devName) {
						nameText = devName + ' (' + responder.id + ')'
					} else { nameText = responder.id }
				}

				if (insteonDevIndex == -1 || self.hubDevices[insteonDevIndex].info == undefined) {
					groupText = responder.group
				} else {
					var filtered = self.deviceDatabase.filter(function (item) { return item.category == self.hubDevices[insteonDevIndex].info.deviceCategory.id })
					var found = filtered.find(function (item) { return (item.subcategory == self.hubDevices[insteonDevIndex].info.deviceSubcategory.id) })
					var groupText
					var responderGroupText

					if (found.name.indexOf('Keypad') > -1) {
						var responderLinkData = self.hubDevices[insteonDevIndex].links.filter(function (link) {
							return link.group == responder.group
						})
						if(responderLinkData.length > 0 && typeof responderLinkData != 'undefined' && typeof responderLinkData[0].data != 'undefined'){
							var responderGroupNum = responderLinkData[0].data[2]
							groupText = responder.group + ' (' + self.keypadButtonArray[responderGroupNum - 1] + ')'
						} else {groupText = responder.group}
					} else {
						groupText = responder.group
						responderGroupText = responder.responderGroup
					}
				}
				responderTable = responderTable +
					'<tr>' +
					'<td>' + groupText + '</td>' +
					'<td>' + nameText + '</td>' +
					'<td>' + responder.onLevel + '</td>' +
					'<td>' + (responder.rampRate) / 1000 + '</td>' +
					'</tr>' +
					'</tbody>'
			})

			responderTable = responderTable + '</table>'

			self.deviceSceneTable = self.deviceSceneTable + controllerTable + '<br>' + responderTable + '<br><hr>'
		})
		self.deviceSceneTable = self.deviceSceneTable + '</tbody>' + '</table>'
	}
}

InsteonUI.prototype.renderAddPage = function (res, type) { //not used
	var self = this

	res.write(self.header + self.navBar);
	res.write("<div class='container-fluid'>");

	self.addDeviceTableHeader = `<div class="responsive-wrapper">
		<div class="row header">
		<div>Name</div>
		<div>Device ID</div>
		<div>Device Type</div>
		<div>Dimmable?</div>
		<div></div>
		<div></div>
		</div>`

	self.devList = "<select class='form-control' name='deviceType'>" +
		"<option value='lightbulb'>lightbulb</option>" +
		"<option value='dimmer'>dimmer</option>" +
		"<option value='switch'>switch</option>" +
		"<option value='scene'>scene</option>" +
		"<option value='remote'>remote</option>" +
		"<option value='iolinc'>iolinc</option>" +
		"<option value='motionsensor'>motionsensor</option>" +
		"<option value='leaksensor'>leaksensor</option>" +
		"<option value='outlet'>outlet</option>" +
		"<option value='fan'>fan</option>" +
		'</select>'

	self.dimList = "<select class='form-control' name='deviceDimmable'>" +
		"<option value='yes'>yes</option>" +
		"<option value='no'>no</option>" +
		'</select>'

	self.deviceTemplate = "<div class='row content'>" +
		"<div class='form-group'><input type='text' class='form-control' name='deviceName' value='" + "'></div>" +
		"<div class='form-group'><input type='text' class='form-control' name='deviceID' value=''></div>" +
		"<div class='form-group'>" + self.devList + '</div>' +
		"<div class='form-group'>" + self.dimList + '</div>' +
		'<div></div>' +
		'<div></div>' +
		"</div class='row content'>"


	self.progressModal = "<div id='progressModal' class='modal fade' role='dialog'>" +
		"<div class='modal-dialog'>" +
		"<div class='modal-content'>" +
		"<div class='modal-header'>" +
		"<button type='button' class='close' data-dismiss='modal'>&times;</button>" +
		"<h4 class='modal-title'><b>Updating device...</b></h4>" +
		'</div>' +
		"<div class='modal-body'>" +
		'<p> </p>' +
		'</div>' +
		"<div class='modal-footer' hidden='true'>" +
		"<button type='button' class='btn btn-danger' id='progressModalYes'>Yes</button>" +
		"<button type='button' class='btn btn-default btn-primary' data-dismiss='modal'>Close</button>" +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>'

	res.write('<h2>Add ' + type + '</h2>');

	res.write("<form enctype='application/x-www-form-urlencoded' action='/save" + type + "Settings' method='post'>")
	res.write(self.addDeviceTableHeader + self.deviceTemplate + '</div>')
	res.write('<br>')
	res.write("<div class='row'>")
	res.write("<div class='col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center'>");
	res.write("<div class='btn-group' data-toggle='buttons'>");
	res.write("<input type='submit' class='btn btn-default center-block' value='Save' onClick='submit()' style='width:135px' />");
	res.write("<input type='submit' class='btn btn-default center-block' value='Cancel' onClick=\"location.href='/'\" style='width:135px' />");
	res.write('</div>')
	res.write('</div>')
	res.write('</form>')

	res.write('<br>')
	res.write('</div>')

	res.end(self.footer)
}

InsteonUI.prototype.renderScenePage = function (res) {
	var self = this
	self.sceneTable = ''

	self.sceneTableHeader = `<table id="sceneTable" class="table table-striped table-bordered table-hover" cellspacing="0" width="100%">
		<thead>
		<th scope="col">Group</th>
		<th scope="col">Device ID</th>
		<th scope="col">On Level</th>
		<th scope="col">Ramp Rate</th>
		</thead>`

	buildSceneTable(res, function () {
		res.write(self.header + self.navBar)
		res.write("<div class='container'>")
		res.write("<div class='btn-toolbar pull-right'>")
		res.write("<a class='btn btn-default load center-block' role='button' href='/buildHubSceneData' style='width:140px; height:30px;'>Refresh Scene Data</a>")
		res.write('</div>')
		res.write('<h3>Scenes</h3><hr>')
		res.write(self.sceneTableHeader)
		res.write(self.sceneTable)
		res.end(self.footer)
	})

	function buildSceneTable(res, callback) {
		self.scenes.forEach(function (scene) {
			var controllerTable = '<h4>Controllers - Scene ' + scene.group + '</h4>' + self.sceneTableHeader + '<tbody>'
			var responderTable = '<h4>Responders - Scene ' + scene.group + '</h4>' + self.sceneTableHeader + '<tbody>'

			scene.controllers.forEach(function (controller) {
				var insteonDevIndex = self.hubDevices.findIndex(function (item) { return item.deviceID == controller.id })
				var nameText

				if (insteonDevIndex == -1) {
					nameText = controller.id
				} else {
					var devName = self.hubDevices[insteonDevIndex].name
					if (devName) {
						nameText = devName + ' (' + controller.id + ')'
					} else { nameText = controller.id }
				}

				controllerTable = controllerTable +
					'<tr>' +
					'<td>' + controller.group + '</td>' +
					'<td>' + nameText + '</td>' +
					'<td>' + controller.onLevel + '</td>' +
					'<td>' + controller.rampRate + '</td>' +
					'</tr>' +
					'</tbody>'
			})

			scene.responders.forEach(function (responder) {
				var insteonDevIndex = self.hubDevices.findIndex(function (item) { return item.deviceID == responder.id })
				var nameText

				if (insteonDevIndex == -1) {
					nameText = responder.id
				} else {
					var devName = self.hubDevices[insteonDevIndex].name
					if (devName) {
						nameText = devName + ' (' + responder.id + ')'
					} else { nameText = responder.id }
				}

				responderTable = responderTable +
					'<tr>' +
					'<td>' + responder.group + '</td>' +
					'<td>' + nameText + '</td>' +
					'<td>' + responder.onLevel + '</td>' +
					'<td>' + responder.rampRate + '</td>' +
					'</tr>' +
					'</tbody>'
			})

			self.sceneTable = self.sceneTable + controllerTable + '<br>' + responderTable + '<br><hr>'
		})
		self.sceneTable = self.sceneTable + '</table>'
		callback(res)
	}
}

InsteonUI.prototype.renderLinkPage = function (res) {
	var self = this

	res.write(self.header + self.navBar);
	res.write("<div class='container'>")

	self.linkTemplate = "<div class='form-group'><label for='deviceID'>Link To Hub</label><input type='text' class='form-control' required='required' data-error='Enter device id' name='deviceID' value='' placeholder='Enter device id to link to hub.  Multiple devices can be separated with a comma.'><div class='help-block with-errors'></div></div>"

	self.unlinkTemplate = "<div class='form-group'><label for='deviceID'>Unlink From Hub</label><input type='text' class='form-control' required='required' data-error='Enter device id' name='deviceID' value='' placeholder='Enter device id to unlink from hub'><div class='help-block with-errors'></div></div>"

	res.write("<form enctype='application/x-www-form-urlencoded' action='/linkToHub' data-toggle='validator' novalidate='true' method='post'>")
	res.write(self.linkTemplate)
	res.write('<br>')
	res.write("<div class='col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center'>");
	res.write("<input type='submit' class='btn btn-default center-block' onclick='sseInit()' value='Link' style='width:135px' />");
	res.write('</div>')
	res.write('</form>')

	res.write('<br><hr>')

	res.write("<form enctype='application/x-www-form-urlencoded' action='/unlinkFromHub' data-toggle='validator' novalidate='true' method='post'>")
	res.write(self.unlinkTemplate)
	res.write('<br>')
	res.write("<div class='col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center'>");
	res.write("<input type='submit' class='btn btn-default center-block' value='Unlink' style='width:135px' />");
	res.write('</div>')
	res.write('</form>')

	res.write('<br><hr>')

	self.cont_respList = "<select class='form-control' id=cont_resp name='cont_resp'>" +
		"<option value='controller'>controller</option>" +
		"<option value='responder'>responder</option>" +
		"<option value='both'>both</option>" +
		'</select>'

	buildDeviceList()

	function buildDeviceList() {
		self.deviceList = "<select class='form-control' name='id'>"

		if (self.hubInfo) {
			self.deviceList = self.deviceList + "<option value='" + self.hubInfo.id + "'>Hub</option>"
		}

		self.insteonJSON.devices.forEach(function (device) {
			if (device.name == '') {
				var listText = device.deviceID
			} else { var listText = device.name }

			self.deviceList = self.deviceList +
				"<option value='" + device.deviceID + "'>" + listText + '</option>'
		})
		self.deviceList = self.deviceList + '</select>'
	}

	self.sceneTemplateHeader = `<div class="responsive-wrapper">
	<div class="row header">
	<div>Create Scene</div>
	</div>`

	self.rateList = "<select class='form-control' name='rate'>"

	rampRates = rampRates.sort(function (x, y) { return x - y })

	rampRates.forEach(function(rate){
		self.rateList = self.rateList + "<option value='" + rate/1000 + "'>" + rate/1000 + '</option>'

	})

	self.rateList = self.rateList + '</select>'

	self.sceneTemplate = "<div class='row content'>" +
		"<div class='form-group'><label for='id'>Device ID</label>" + self.deviceList + "<div class='help-block with-errors'></div></div>" +
		"<div class='form-group'><label for='id'>Group</label><input type='text' class='form-control' name='group' required='required' data-error='Please enter group' value='1'><div class='help-block with-errors'></div></div>" +
		"<div class='form-group'><label for='id'>Level</label><input type='text' class='form-control' name='level' id=rate required='required' data-error='Please enter level' value=''><div class='help-block with-errors'></div></div>" +
		"<div class='form-group'><label for='id'>Ramp Rate</label>" + self.rateList + "<div class='help-block with-errors'></div></div>" +
		"<div class='form-group'><label for='id'>Controller/Responder</label>" + self.cont_respList + "<div class='help-block with-errors'></div></div>" +
		"</div class='row content'>"

	res.write("<form enctype='application/x-www-form-urlencoded' id='sceneTemplateForm' name='sceneTemplateForm' action='/createScene' data-toggle='validator' novalidate='true' method='post'>")
	res.write(self.sceneTemplateHeader + "<div id='sceneTemplateTable'>" + self.sceneTemplate + self.sceneTemplate)
	res.write('</div>')
	res.write('</div>')
	res.write('<br>')

	res.write("<div class='col-xs-offset-1 col-sm-offset-1 col-md-offset-2 col-xs-10 col-sm-9 col-md-8 text-center'>")
	res.write("<div class='btn-group'>")
	res.write("<input href='#' class='btn btn-default center-block' id='addScene' style='width:135px' value='Add' />")
	res.write("<input type='submit' class='btn btn-default center-block' onclick='sseInit()' value='Create Scene' style='width:135px' />")
	res.write('</div>')
	res.write('</div>')
	res.write('</form>')

	self.addSceneRow = '<script>' +
		'$("#addScene").click(function() {' +
		'$("#sceneTemplateTable").append("' + self.sceneTemplate + '");' +
		'$("#sceneTemplateForm").validator("update");' +
		'});' +
		'</script>'

	self.disableFormField = `<script>
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
	</script>`

	self.formToJSON = `<script>
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
				console.log(data);
				sendData(data)
			});
		});
	</script>`
	res.write(self.progressModal)
	res.end(self.sseInit + self.addSceneRow + self.formToJSON + self.footer)
}

InsteonUI.prototype.handleRequest = function (req, res) {
	var self = ui

	switch (req.url) {
	case '/':
		self.renderMainPage(res)
		break
	case '/redirect':
		res.redirect('back')
		break
	case '/saveHubSettings':
		if (req.method == 'POST') {
			req.on('data', function (chunk) {
				var receivedData = chunk.toString()
				var arr = receivedData.split('&')

				self.config.platforms[self.platformIndex].user = self.stripEscapeCodes(arr[0].replace('hubUsername=', ''))
				self.config.platforms[self.platformIndex].pass = self.stripEscapeCodes(arr[1].replace('hubPassword=', ''))
				self.config.platforms[self.platformIndex].host = self.stripEscapeCodes(arr[2].replace('hubAddress=', ''))
				self.config.platforms[self.platformIndex].port = self.stripEscapeCodes(arr[3].replace('hubPort=', ''))
				self.config.platforms[self.platformIndex].model = self.stripEscapeCodes(arr[4].replace('hubModel=', ''))
				self.config.platforms[self.platformIndex].refresh = self.stripEscapeCodes(arr[5].replace('hubRefresh=', ''))
				self.config.platforms[self.platformIndex].keepAlive = self.stripEscapeCodes(arr[6].replace('hubKeepalive=', ''))

				self.saveConfig(res)
			})
			res.redirect('/hub')
			//req.on('end', function (chunk) { })
		} else {
			console.log('[405] ' + req.method + ' to ' + req.url)
		}
		break
	case '/saveDeviceSettings':
		if (req.method == 'POST') {
			req.on('data', function (chunk) {
				var receivedData = chunk.toString()
				var arr = receivedData.split('&')
				var deviceName = arr[0].replace('name=', '')

				var referer = req.header('Referer')
				var deviceID = referer.substring(referer.lastIndexOf('/') + 1, referer.length)

				var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })
				self.insteonJSON.devices[devIndex].name = deviceName

				self.saveInsteonConfig(res)
			})
			req.on('end', function (chunk) { })
		} else {
			console.log('[405] ' + req.method + ' to ' + req.url)
		}
		break
	case '/hub':
		self.renderHubPage(res)
		break
	case '/getHubInfo':
		console.log('Getting Hub info')
		self.hub.info(function (error, info) {
			if (error) {
				console.log('Error getting Hub info')
			} else {
				console.log(info)
				info.id = info.id.toUpperCase()
				self.hubInfo = info
				self.insteonJSON.hub.info = self.hubInfo
				self.saveInsteonConfig(res)
			}
		})
		break
	case '/getHubDevices':
		console.log('Getting devices from Hub')
		self.getHubDevices(res, function (res) {
			self.saveInsteonConfig(res)
		})
		break
	case '/addDevice':
		self.renderAddPage(res, 'Device')
		break
	case '/link':
		self.renderLinkPage(res)
		break
	case '/linkToHub':
		if (req.method == 'POST') {
			req.on('data', function (chunk) {
				var receivedData = chunk.toString()
				var arr = receivedData.split('&')
				arr = self.stripEscapeCodes(arr[0].replace('deviceID=', ''))
				var deviceIDs = arr.split(',')

				_linkToHub(deviceIDs)

				function _linkToHub(devices) {
					if (devices.length == 0) {
						sse.emit('push', { 'message': 'Finished linking devices'})
						setTimeout(function () { sse.emit('push', { 'message': 'close' }) }, 3000)
						self.getHubDevices(res, function (res) {
							self.saveInsteonConfig(res)
						})
						return
					}

					var device = devices.pop()
					sse.emit('push', { 'message': 'Linking ' + device + ' to hub'})

					self.linkToHub(device, res, function(error, response){
						if(error){
							console.log('Error linking ' + device)
							sse.emit('push', { 'message': 'Error linking ' + device})
							setTimeout(function () { sse.emit('push', { 'message': 'close' }) }, 3000)
							return _linkToHub(devices)
						} else {
							sse.emit('push', { 'message': 'Successfully linked ' + device + ' to hub'})
							return _linkToHub(devices)
						}
					})
				}
			})
		} else {
			console.log('[405] ' + req.method + ' to ' + req.url)
		}
		break
	case '/unlinkFromHub':
		if (req.method == 'POST') {
			req.on('data', function (chunk) {
				var receivedData = chunk.toString()
				var arr = receivedData.split('&')
				var deviceID = arr[0].replace('deviceID=', '')

				self.unlinkFromHub(deviceID, res)
			})
			req.on('end', function (chunk) { })
		} else {
			console.log('[405] ' + req.method + ' to ' + req.url)
		}
		break
	case '/createScene':
		var referer = req.header('Referer')
		if (req.method == 'POST') {
			req.on('data', function (data) {
				var receivedData = JSON.parse(data.toString())
				var sceneData = []

				for (var i = 0; i < receivedData.id.length; i++) {
					sceneData.push({ id: receivedData.id[i], group: parseInt(receivedData.group[i]), level: parseInt(receivedData.level[i]), rate: parseFloat(receivedData.rate[i]), cont_resp: receivedData.cont_resp[i] })
				}

				var controllers = []
				var responders = []

				sceneData.forEach(function (item) {
					if(item.cont_resp == 'controller') {
						controllers.push(item)
					} else if(item.cont_resp == 'responder'){
						responders.push(item)
					} else if(item.cont_resp == 'both') {
						controllers.push(item)
						responders.push(item)
					}
				})

				var sceneArray = []

				controllers.forEach(function (controller) {
					for (let i = 0; i < responders.length; i++) {
						if (controller.id == responders[i].id) {continue}

						//convert to 'gw' - Hub Pro uses lower case so using 'gw' takes care of that for us
						if(controller.id.toUpperCase() == self.hubInfo.id.toUpperCase()) {
							controller.id = 'gw'
						}

						if(responders[i].id.toUpperCase() == self.hubInfo.id.toUpperCase()) {
							responders[i].id = 'gw'
						}

						var responderJSON = {
							id: responders[i].id,
							level: responders[i].level,
							rate: responders[i].rate,
							data: ['00', '00', responders[i].group.toString().padStart(2, '0')]
						}
						var options = {
							group: controller.group,
							remove: false
						}

						sceneArray.push({'controller': controller.id, 'responder': responderJSON, 'options': options})
					}
				})

				_createScene(sceneArray)

				function _createScene(scenes) {
					if (scenes.length == 0) {
						sse.emit('push', { 'message': 'Finished creating scene!'})
						setTimeout(function () { sse.emit('push', { 'message': 'close' }) }, 3000)
						self.saveInsteonConfig(res)
						return
					}

					sse.emit('push', { 'message': 'Creating scene...'})
					var scene = scenes.pop()

					sse.emit('push', { 'message': 'Linking ' + scene.responder.id + ' to ' + scene.controller})

					self.createScene(scene.controller, scene.responder, scene.options, function(error,response){
						if(error){
							console.log('Error creating scene')
							sse.emit('push', { 'message': 'Error creating scene'})
							setTimeout(function () { sse.emit('push', { 'message': 'close' }) }, 3000)
							return _createScene(scenes)
						} else {
							sse.emit('push', { 'message': 'Successfully linked ' + scene.responder.id + ' to ' + scene.controller})
							return _createScene(scenes)
						}
					})
				}
			})
		} else {
			console.log('[405] ' + req.method + ' to ' + req.url)
		}
		break
	case '/buildHubSceneData':
		var referer = req.header('Referer')
		self.buildHubSceneData(function () {
			res.redirect(referer)
		})
		break
	case '/devices':
		self.selectedDevice = req.url.replace('/devices/', '')
		self.renderDevicePage(res)
		break
	case '/scenes':
		self.renderScenePage(res)
		break
	case '/getAllDeviceLinks':
		console.log('Getting all device links')
		req.connection.setTimeout(1000 * 60 * 10)

		var linkDevIDs = []

		self.hubDevices.forEach(function (device) {
			linkDevIDs.push(device.deviceID)
		})

		_getAllDevLinks()

		function _getAllDevLinks() {
			if (linkDevIDs.length === 0) {
				console.log('Done getting all device links')
				self.saveInsteonConfig(res)
				return
			}

			var id = linkDevIDs.pop()
			self.getAllDeviceInfo(id, res, function () {
				setTimeout(function(){return _getAllDevLinks()}, 2000) //slight delay to minimize traffic and help eliminate errors
			})
		}

		break
	case '/getDeviceInfo':
		req.connection.setTimeout(1000 * 60 * 10)

		var referer = req.header('Referer')
		var deviceID = referer.substring(referer.lastIndexOf('/') + 1, referer.length)
		var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })
		self.selectedDevice = deviceID

		if (deviceID == 'devices') {
			res.write("<div class='alert alert-warning alert-dismissible fade in out'><a href='/devices' class='close' data-dismiss='success'>&times;</a><strong>Success!</strong>Please select a device first</div>");
			console.log('Error getting device id from url: ' + referer + '  Select a device first.')
			break
		}

		sse.emit('push', { 'message': 'Getting device info for ' + deviceID })
		self.getAllDeviceInfo(deviceID, res, function(){
			console.log('Done getting device info for ' + deviceID)
			setTimeout(function () { sse.emit('push', { 'message': 'close' }) }, 3000)
			self.saveInsteonConfig(res)
		})

		break
	case '/events':
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		})

		sse.on('push', function (data) {
			res.write('data: ' + JSON.stringify(data) + '\n\n');
		})
		break
	case '/saveConfigDeviceSettings':
		if (req.method == 'POST') {
			req.on('data', function (chunk) {
				var receivedData = self.stripEscapeCodes(chunk)
				var arr = receivedData.split('&')
				console.log('Got device data: ' + util.inspect(arr))

				var devJSON = []
				var tmpArray = []
				var index = 0
				var arrLength = arr.length

				arr.forEach(function (item) {
					var tmp = item.split('=')
					var key = tmp[0]
					var value = tmp[1]

					if (key == 'name' && index > 1) {
						devJSON.push(tmpArray)
						tmpArray = []
						tmpArray[key] = value
						index++
					} else {
						tmpArray[key] = value
						index++
					}

					if (index == arrLength) {
						devJSON.push(tmpArray)
					}
				})

				devJSON.forEach(function (savedDev) {
					if (self.config.platforms[self.platformIndex].devices == undefined) {
						console.log('No devices defined - adding to config')
						self.config.platforms[self.platformIndex].devices = []
					}

					var devIndex = self.config.platforms[self.platformIndex].devices.findIndex(function (item) { return item.deviceID == savedDev.deviceID })
					var keys = Object.keys(savedDev)

					if (devIndex == -1) {
						//add to config
						console.log('Adding ' + savedDev.name + ' to config')
						var insertIndex = self.config.platforms[self.platformIndex].devices.length
						self.config.platforms[self.platformIndex].devices[insertIndex] = {}

						keys.forEach(function (key) {
							self.config.platforms[self.platformIndex].devices[insertIndex][key] = savedDev[key]
						})
					} else {
						//modify existing
						console.log('Modifying config for ' + savedDev.name)

						keys.forEach(function (key) {
							console.log('Key ' + key + savedDev[key])
							self.config.platforms[self.platformIndex].devices[devIndex][key] = savedDev[key]
						})
					}
				})
				console.log('Config to save: ' + JSON.stringify(self.config))
				self.saveConfig(res)
			})
			req.on('end', function (chunk) { })
		} else {
			console.log('[405] ' + req.method + ' to ' + req.url);
		}
		break
	default:
		var url = req.url

		if (url.indexOf('/removeDevice') !== -1) {
			var deviceToRemove = req.url.replace('/removeDevice', '')

			var devIndex = self.config.platforms[self.platformIndex].devices.findIndex(function (item) { return item.deviceID == deviceToRemove })
			console.log(devIndex)
			self.config.platforms[self.platformIndex].devices.splice(devIndex, 1)
			console.log('Removing ' + deviceToRemove + ' from config')
			self.saveConfig(res)
		}

		if (url.indexOf('/removeLink') !== -1) {
			var deviceLink = (req.url.replace('/removeLink/', '')).split('/')
			var deviceID = deviceLink[0]
			var linkAt = parseInt(deviceLink[1])
			self.removeLinkAt(deviceID, linkAt, res)
		}

		if (url.indexOf('/removeHubLink') !== -1) {
			var deviceLink = (req.url.replace('/removeHubLink/', '')).split('/')
			var deviceID = deviceLink[0]
			var linkNumber = parseInt(deviceLink[1])

			var linkToDelete = self.hubLinks.filter(function (link) {
				return link.number == linkNumber
			})

			linkToDelete = linkToDelete[0]

			self.removeLink(deviceID, linkToDelete, function(error, response){
				if(error){
					console.log('Error removing link from hub')
				} else {
					console.log('Successfully removed link from hub')
					self.saveInsteonConfig(res)
				}
			})
		}

		if (url.indexOf('/beep') !== -1) {
			var deviceID = req.url.replace('/beep/', '')
			self.beep(deviceID)
		}

		if (url.indexOf('/getLinks') !== -1) {
			var deviceID = req.url.replace('/getLinks/', '')
			self.selectedDevice = deviceID
			self.getDeviceLinks(deviceID, function (error, links) {
				if (error) {
					res.write(self.header + self.navBar);
					res.write("<div class='alert alert-danger alert-dismissible fade in out' id='saveAlert'><a href='/devices/" + self.selectedDevice + "' class='close' data-dismiss='alert'>&times;</a><strong>Note!</strong>Error getting device info/flags/links</div>");
					res.end(self.footer)
				} else { self.saveInsteonConfig(res) }
			})
		}

		if (url.indexOf('/devices') !== -1) {
			var selectedDevice = req.url.replace('/devices/', '')
			var device

			if (typeof selectedDevice == 'undefined' || selectedDevice == null) {
				device = ''
			} else { device = selectedDevice }

			self.renderDevicePage(res, device)
			self.selectedDevice = device
		}
	}
}

InsteonUI.prototype.getDeviceInfo = function (deviceID, res, callback) {
	var self = this

	var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })
	console.log('Getting device info for ' + deviceID)
	self.hub.info(deviceID, function (error, info) {
		if (error || info == null) {
			console.log('Error getting device info')
			callback(error, null)
		} else {
			if (info != null) {
				self.insteonJSON.devices[devIndex].info = info
				callback(null, info)
			}
		}
	})
}

InsteonUI.prototype.getDatabaseDelta = function (deviceID, callback) {
	var self = this
	var timeout = 0
	var cmd = {
		cmd1: '19',
		cmd2: '00'
	}

	console.log('Getting database delta for ' + deviceID)
	sse.emit('push', { 'message': 'Getting database delta for ' + deviceID })

	self.hub.directCommand(deviceID, cmd, timeout, function (error, response) {
		if (error || typeof response.response == 'undefined' || typeof response.response.standard == 'undefined') {
			console.log('Error getting database delta')
			sse.emit('push', { 'message': 'Error getting database delta for ' + deviceID })
			callback(error, null)
		} else {
			var databaseDelta = response.response.standard.command1
			console.log('dbDelta: ' + databaseDelta)
			callback(null, databaseDelta)
		}
	})
}

InsteonUI.prototype.buildDeviceList = function () {
	var self = this

	if (typeof self.insteonJSON.devices == 'undefined' || Object.keys(self.insteonJSON.devices).length == 0) {
		console.log('No devices in config')
		return
	}

	self.deviceList = "<select class='form-control' name='id'>"

	if (self.hubInfo) {
		self.deviceList = self.deviceList + "<option value='" + self.hubInfo.id + "'>Hub</option>"
	}

	self.insteonJSON.devices.forEach(function (device) {
		if (device.name == '') {
			var listText = device.deviceID
		} else { var listText = device.name }

		self.deviceList = self.deviceList +
			"<option value='" + device.deviceID + "'>" + listText + '</option>'
	})
	self.deviceList = self.deviceList + '</select>'
}

InsteonUI.prototype.saveConfig = function (res, backup) {
	var self = this

	var newConfig = JSON.stringify(self.config)
		.replace(/\[,/g, '[')
		.replace(/,null/g, '')
		.replace(/null,/g, '')
		.replace(/null/g, '')
		.replace(/,,/g, ',')
		.replace(/,\]/g, ']')

	newConfig = JSON.stringify(JSON.parse(newConfig), null, 4)

	//make backup of old config
	fs.copyFile(self.configPath, self.configPath + '.bak', function (err) {
		if (err) { console.log('Error creating backup: ' + err) } else { console.log('Created backup of previous config') }
	})

	console.log('Saved new Homebridge config')
	res.write(self.header + self.navBar);
	res.write("<div class='alert alert-info alert-dismissible fade in out id=saveAlert'><a href='/' class='close' data-dismiss='alert'>&times;</a><strong>Note!</strong> Please restart Homebridge to activate your changes.</div>");
	fs.writeFile(self.configPath, newConfig, 'utf8', function (err, data) {
		if (err) {
			return console.log(err)
		} else {
			console.log('Done writing Homebridge config')
			self.loadConfig(res)
		}
	})
}

InsteonUI.prototype.saveInsteonConfig = function (res) {
	var self = this

	var newInsteonJSON = self.stripEscapeCodes(JSON.stringify(self.insteonJSON))
	newInsteonJSON = JSON.stringify(JSON.parse(newInsteonJSON), null, 4)

	//make backup of old config
	fs.copyFile(self.configDir + './insteon.json', self.configDir + './insteon.json.bak', function (err) {
		if (err) { console.log('Error creating backup') } else { console.log('Created backup of previous config') }
	})

	//write new config
	console.log('Saved new insteon config')
	res.write(self.header + self.navBar)

	res.write("<div class='alert alert-success alert-dismissible fade in out' id='saveAlert'><a href='/devices/" + self.selectedDevice + "' class='close' data-dismiss='alert'>&times;</a><strong>Note!</strong> Successfully saved devices/link to Insteon config.</div>")
	res.end(self.footer)
	fs.writeFile(self.configDir + './insteon.json', newInsteonJSON, 'utf8', function (err, data) {
		if (err) {
			return console.log(err)
		} else {
			console.log('Done writing Insteon config')
			self.loadInsteonConfig()
		}
	})
}

InsteonUI.prototype.loadConfig = function () {
	var self = this

	console.log('Reading config from ' + self.configPath)

	var configJSON = fs.readFileSync(self.configPath)
	self.config = JSON.parse(configJSON)

	self.platforms = self.config.platforms
	console.log('Found ' + self.platforms.length + ' platform(s) in config')

	self.platformIndex = self.config.platforms.findIndex(function (item) { return item.platform == 'InsteonLocal' })

	var platform = self.platforms.filter(function (item) {
		return item.platform == 'InsteonLocal'
	})

	self.platform = platform[0]
	self.devices = self.platform.devices || []
}

InsteonUI.prototype.loadInsteonConfig = function (callback) {
	var self = this

	if (fs.existsSync(self.configDir + './insteon.json')) {
		console.log('Reading devices from insteon.json')
		var insteonJSON = fs.readFileSync(self.configDir + './insteon.json')

		self.insteonJSON = JSON.parse(insteonJSON)
		self.hubInfo = self.insteonJSON.hub.info
		self.hubLinks = self.insteonJSON.hub.links
		self.hubDevices = self.insteonJSON.devices
		self.scenes = self.insteonJSON.scenes

		if (callback) {
			callback()
		}

	} else {
		self.insteonJSON = {}
		self.insteonJSON = JSON.parse(JSON.stringify(self.insteonJSON))
		self.insteonJSON.hub = {}
		self.insteonJSON.hub.info = {}
		self.insteonJSON.hub.links = {}
		self.insteonJSON.devices = {}
		self.insteonJSON.scenes = {}

		console.log('Creating new insteon.json')

		if (callback) {
			callback()
		}
	}
}

InsteonUI.prototype.getHubInfo = function() {
	var self = this

	self.hub.info(function (error, info) {
		if (error || typeof info == 'undefined') {
			self.log('Error getting Hub info')
			self.hubInfo = {}
			return
		} else {
			info.id = info.id.toUpperCase()
			self.hubInfo = info
			self.hubID = info.id.toUpperCase()
			self.insteonJSON.hub.info = self.hubInfo
			console.log('[UI] Hub/PLM info is ' + util.inspect(self.hubInfo))
			return
		}
	})
}
InsteonUI.prototype.getHubDevices = function (res, callback) {
	var self = this
	var devices = []

	var oldDevices = self.hubDevices

	self.hubLinks = {}
	self.hubDevices = []
	self.insteonJSON.devices = {}

	self.hub.links(function (error, links) {
		if (error) {
			console.log('Error getting devices')
		} else {
			var num = 0
			links.forEach(function (link) {
				link.number = num
				num++
			})

			self.hubLinks = links

			links.forEach(function (link) {
				if (link !== null && link.isInUse) {
					link.id = link.id.toUpperCase()
					devices.push(link.id)
				}
			})

			self.insteonJSON.hub.links = self.hubLinks

			var hubDevices = devices.filter(function (item, index, inputArray) {
				return inputArray.indexOf(item) == index
			})

			hubDevices.forEach(function (deviceID) {
				var devName
				var configDevIndex = self.config.platforms[self.platformIndex].devices.findIndex(function (item) {return item.deviceID == deviceID && item.deviceType != 'scene'})

				if (typeof oldDevices == 'undefined' || Object.keys(oldDevices).length == 0) {
					var insteonDevIndex = -1
				} else { var insteonDevIndex = oldDevices.findIndex(function (item) { return item.deviceID == deviceID }) }


				if (configDevIndex == -1 && insteonDevIndex == -1) {
					devName = ''
				} else if (configDevIndex != -1) {
					devName = self.config.platforms[self.platformIndex].devices[configDevIndex].name
					console.log('Found ' + devName + ' in homebridge config')
				} else {
					devName = oldDevices[insteonDevIndex].name
					console.log('Found ' + devName + ' in Insteon config')
				}

				if (insteonDevIndex !== -1 && typeof oldDevices[insteonDevIndex].info != 'undefined') {
					var devInfo = oldDevices[insteonDevIndex].info
					var devLinks = oldDevices[insteonDevIndex].links
					var opFlags = oldDevices[insteonDevIndex].operatingFlags
					var dbDelta = oldDevices[insteonDevIndex].databaseDelta

					self.hubDevices.push({ name: devName, deviceID: deviceID, info: devInfo, links: devLinks, operatingFlags: opFlags, databaseDelta: dbDelta})
				} else {
					self.hubDevices.push({ name: devName, deviceID: deviceID })
				}
			})

			self.insteonJSON.devices = self.hubDevices
		}
		callback(res)
	})
}

InsteonUI.prototype.getAllDeviceInfo = function (deviceID, res, callback) {
	var self = this
	var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })

	self.getDeviceInfo(deviceID, res, function (error, response) {
		if (error) {
			sse.emit('push', { 'message': 'Error getting device info for ' + deviceID })
		}

		self.getOpFlags(deviceID, function (error, response) {
			if (error) {
				sse.emit('push', { 'message': 'Error getting operating flags for ' + deviceID })
			}

			self.getDatabaseDelta(deviceID, function (error, dbdelta) {
				var databaseDelta = dbdelta

				if (typeof self.insteonJSON.devices[devIndex].databaseDelta !== 'undefined') {
					var recentDelta = self.insteonJSON.devices[devIndex].databaseDelta
				} else var recentDelta = ''

				if (recentDelta == databaseDelta) {
					sse.emit('push', { 'message': 'prompt' })
				} else {
					self.insteonJSON.devices[devIndex].databaseDelta = databaseDelta
					self.getDeviceLinks(deviceID, function (error, response) {
						if (error) {
							console.log('Error getting links for ' + deviceID)
							sse.emit('push', { 'message': 'Error getting links for ' + deviceID })
							setTimeout(function () { sse.emit('push', { 'message': 'close' }) }, 3000)
							callback(error,null)
						} else {
							console.log('Done getting links for ' + deviceID)
							callback(null,null)
						}
					})
				}
			})
		})
	})
}

InsteonUI.prototype.getDeviceLinks = function (deviceID, callback) {
	var self = this
	var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })

	var at = 4095
	var linkArray = []

	console.log('Getting device links for ' + deviceID)
	sse.emit('push', { 'message': 'Getting links for ' + deviceID })

	_getDeviceLinks(deviceID, at, linkArray, function (error, response) {
		console.log('linkArray: ' + util.inspect(linkArray))

		linkArray = linkArray.filter(function (item, index, inputArray) {
			return inputArray.indexOf(item) == index
		})

		if (linkArray.length == 0) {
			console.log('No links returned from ' + deviceID)
			callback(true, null)
			sse.emit('push', { 'message': 'close' })
			return
		}

		linkArray.forEach(function(item) {
			item.id = item.id.toUpperCase()
		})

		self.insteonJSON.devices[devIndex].links = linkArray
		sse.emit('push', { 'message': 'close' })
		callback(null, linkArray)
	})

	function _getDeviceLinks(deviceID, at, linkArray, callback) {
		self.hub.linkAt(deviceID, at, linkArray, function (error, links) {
			if (error) {
				console.log('Error getting links')
				callback(error, null)
				return
			}

			sse.emit('push', { 'message': 'Getting links for ' + deviceID + ' (Found ' + links.length + ' links)' })

			if (links.length == 0 || typeof links == 'undefined' || links[links.length - 1].isLast) {
				callback(null, linkArray)
				return
			} else {
				var oldAt = at
				at = links[links.length - 1].at - 8

				if (at == oldAt) {
					callback(null, linkArray)
					return
				} else return _getDeviceLinks(deviceID, at, linkArray, callback)
			}
		})
	}
}

InsteonUI.prototype.getOpFlags = function (deviceID, callback) {
	var self = this
	var timeout = 0
	var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })

	var cmd = {
		cmd1: '2E',
		cmd2: '00',
		extended: true,
		userData: ['00', '00', '00']
	}

	console.log('Getting operating flags for ' + deviceID)
	sse.emit('push', { 'message': 'Getting operating flags for ' + deviceID })

	self.hub.directCommand(deviceID, cmd, timeout, function (error, response) {
		if (error || typeof response.response == 'undefined' || typeof response.response.extended == 'undefined') {
			console.log('Error getting operating flags (ED)')
		} else {
			var operatingFlags = response.response.extended.userData
			console.log('Flags (ED): ' + JSON.stringify(operatingFlags))

			if (devIndex !== -1) {
				self.insteonJSON.devices[devIndex].operatingFlags = {
					D1: operatingFlags[0], D2: operatingFlags[1], D3: operatingFlags[2],
					D4: operatingFlags[3], D5: operatingFlags[4], D6: operatingFlags[5], D7: operatingFlags[6], D8: operatingFlags[7],
					D9: operatingFlags[8], D10: operatingFlags[9], D11: operatingFlags[10], D12: operatingFlags[11], D13: operatingFlags[12],
					D14: operatingFlags[13]
				}
			}
		}
	})

	cmd = {
		cmd1: '1F',
		cmd2: '00'
	}

	self.hub.directCommand(deviceID, cmd, timeout, function (error, response) {
		if (error || typeof response.response == 'undefined' || typeof response.response.standard == 'undefined') {
			console.log('Error getting operating flags (SD)')
			callback()
		} else {
			var operatingFlagsSD = response.response.standard.command2
			console.log('Flags (SD): ' + JSON.stringify(operatingFlagsSD))

			var binaryMap = parseInt(operatingFlagsSD, 16).toString(2)
			binaryMap = '0000'.substr(binaryMap.length) + binaryMap //pad to at least 4 digits
			binaryMap = binaryMap.substring(binaryMap.length - 4, binaryMap.length) //only need last 4 bits

			var progLock = (parseInt(binaryMap.substring(3, 1)) == 1) ? 'on' : 'off' //1=on, 0=off
			var ledEnable = (parseInt(binaryMap.substring(2, 1)) == 1) ? 'on' : 'off' //1=LED on, 0=LED off
			var resumeDim = (parseInt(binaryMap.substring(1, 1)) == 1) ? 'on' : 'off' //1=resume dim enabled, 0=resume dim disabled
			var keys = (parseInt(binaryMap.substring(0, 1)) == 1) ? 8 : 6 //1=8 keys, 0=6 keys

			if (devIndex !== -1) {
				if(typeof self.insteonJSON.devices[devIndex].operatingFlags == 'undefined'){
					self.insteonJSON.devices[devIndex].operatingFlags = {}
				}

				self.insteonJSON.devices[devIndex].operatingFlags.programLock = progLock
				self.insteonJSON.devices[devIndex].operatingFlags.ledEnable = ledEnable
				self.insteonJSON.devices[devIndex].operatingFlags.resumeDim = resumeDim

				if (typeof self.hubDevices[devIndex].info !== 'undefined'){
					var filtered = self.deviceDatabase.filter(function (item) { return item.category == self.hubDevices[devIndex].info.deviceCategory.id })
					var found = filtered.find(function (item) { return (item.subcategory == self.hubDevices[devIndex].info.deviceSubcategory.id) })

					if (found.name.includes('Keypad')) {
						self.insteonJSON.devices[devIndex].operatingFlags.keys = keys
					}
				}
			}
			callback()
		}
	})
}

InsteonUI.prototype.linkToHub = function (deviceID, res, callback) {
	var self = this

	var options = {
		controller: false,
		group: 0
	}

	console.log('Linking ' + deviceID + ' to hub')

	self.hub.link(deviceID, options, function (error, link) {
		if (error || link == null) {
			console.log('Error linking ' + deviceID + ' to hub')
			callback (error, null)
			return
		} else {
			console.log(link)
		}

		//link device group 1 as controller to hub
		options = {
			controller: true,
			group: 1
		}

		console.log('Linking hub to ' + deviceID)
		self.hub.link(deviceID, options,function (error, link) {
			if (error || link == null) {
				console.log('Error linking ' + deviceID + ' to hub' + error)
				callback (error, null)
				return
			} else {
				console.log(link)
				callback (null, link)
				return
			}
		})
	})
}

InsteonUI.prototype.unlinkFromHub = function (deviceID, res) {
	var self = this

	console.log('Unlinking ' + deviceID + ' from hub')

	self.hub.unlink(deviceID, function (error, link) {
		if (error) {
			console.log('Error unlinking ' + deviceID + ' from hub')
		} else {
			console.log(link)
			var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })
			console.log('Removing ' + self.insteonJSON.devices[devIndex].deviceID + ' from devices')
			if (devIndex !== -1) {
				self.insteonJSON.devices.splice(devIndex, 1)
			}
			self.saveInsteonConfig(res)
		}
	})
}

InsteonUI.prototype.removeLinkAt = function (deviceID, linkAt, res) {
	var self = this
	var devIndex = self.insteonJSON.devices.findIndex(function (item) { return item.deviceID == deviceID })
	var link = self.insteonJSON.devices[devIndex].links.filter(function (item) { return item.at == linkAt })
	link = link[0]

	console.log('Deleting link from ' + deviceID)

	self.hub.modLink('remove', deviceID, link, function (error, response) {
		if (error) {
			console.log('Error removing link from device')
			return
		} else {
			console.log('Link: ' + util.inspect(response))
			var linkIndex = self.insteonJSON.devices[devIndex].links.findIndex(function (item) { return item.at == linkAt })

			console.log('Successfully removed link at ' + linkAt + ' for ' + deviceID)

			if (devIndex !== -1 && linkIndex !== -1) {
				self.insteonJSON.devices[devIndex].links.splice(linkIndex, 1)
			}

			self.saveInsteonConfig(res)
		}
	})
}

InsteonUI.prototype.removeLink = function (deviceID, link, callback) {
	var self = this
	var timeout = 0

	if (deviceID == null || deviceID == self.hubInfo.id) {
		var id = link.id
		var flags = toByte(link.flags)
		var group = toByte(link.group)
		var data = link.data.join('')
		var command = '6F80' + flags + group + id + data

		var linkNumber = link.number

		console.log('Removing link from hub')
		self.hub.sendCommand(command, timeout, function (error, response) {
			if (error || response.success == false) {
				console.log('Error removing link from hub - ' + error)
				if (callback) {
					callback()
				} else return
			} else if(response.success == true){
				console.log('Successfully removed link for ' + id + ' from Hub')

				var linkIndex = self.insteonJSON.hub.links.filter(function(link){
					return link.number == linkNumber
				})

				if(linkIndex != -1){
					self.insteonJSON.hub.links.splice(linkIndex, 1)
				}

				if (callback) {
					callback()
				} else return
			}
		})
	}
}

InsteonUI.prototype.createScene = function (controller, responder, options, callback) {
	var self = this

	console.log('Creating scene...')

	self.hub.scene(controller, responder, options, function (error, link) {
		if (error) {
			console.log('Error creating scene: ' + error)
			callback(error, null)
		} else {
			console.log('Sucessfully created scene!')
			if (callback) {
				callback(null, link)
			}
		}
	})
}

InsteonUI.prototype.buildHubSceneData = function (callback) {
	var self = this
	var groups = []
	var scenes = []

	console.log('Building Hub scene data...')

	if (typeof self.hubLinks == 'undefined' || Object.keys(self.hubLinks).length == 0) {
		if (callback) {
			callback()
		} else return

	}
	self.hubLinks.forEach(function (link) {
		if (link !== null && link.isInUse) {
			groups.push(link.group)
		}
	})

	//filter for unique groups
	var hubGroups = groups.filter(function (item, index, inputArray) {
		return inputArray.indexOf(item) == index
	})

	hubGroups = hubGroups.sort(function (x, y) { return x - y })

	//remove groups 0 and 1
	for (var i = 0; i < hubGroups.length - 1; i++) {
		if (hubGroups[i] === 0) {
			hubGroups.splice(i, 1)
		}

		if (hubGroups[i] === 1) {
			hubGroups.splice(i, 1)
		}
	}

	hubGroups.forEach(function (groupNum) {
		var responders = []
		var controllers = []
		var controllerID

		if (typeof self.hubinfo == 'undefined' || typeof self.hubInfo.id == 'undefined') {
			controllerID = '[hub]'
		} else {controllerID = self.hubInfo.id}

		//only interested in links where the hub is controller
		var hubhubResponderLinks = self.insteonJSON.hub.links.filter(function (link) {
			return link.group == groupNum &&
				link.isInUse == true &&
				link.controller == true
		})

		controllers.push({group: groupNum, id: controllerID})

		hubhubResponderLinks.forEach(function (responder) {
			//Need to get the on level and ramp rate from the device itself
			var rampVal = _getRampRate(responder.id)
			var onLevel = _getOnLevel(responder.id, self.hubInfo.id, groupNum)

			var responderData = { group: groupNum, id: responder.id, onLevel: onLevel, rampRate: rampVal }
			responders.push(responderData)
		})

		scenes.push({ group: groupNum, controllers: controllers, responders: responders })
	})
	console.log(scenes)
	self.scenes = scenes
	self.insteonJSON.hub.scenes = scenes

	if (callback) {
		callback()
	} else return

	function _getRampRate(deviceID) {
		var linkDevIndex = self.hubDevices.findIndex(function (item) {
			return item.deviceID == deviceID
		})

		if (linkDevIndex == -1) {
			var rampVal = ''
		} else if (typeof self.insteonJSON.devices[linkDevIndex].operatingFlags !== 'undefined' && typeof self.insteonJSON.devices[linkDevIndex].operatingFlags.D7 !== 'undefined') {
			var rampVal = byteToRampRate(self.insteonJSON.devices[linkDevIndex].operatingFlags.D7)
		} else {
			var rampVal = ''
		}

		return rampVal
	}

	function _getOnLevel(deviceID, controllerID, group) {
		var deviceIndex = self.hubDevices.findIndex(function (item) {
			return item.deviceID == deviceID
		})

		if (deviceIndex != -1 && typeof self.insteonJSON.devices[deviceIndex].links != 'undefined') {
			var responderLink = self.insteonJSON.devices[deviceIndex].links.filter(function (link) {
				return link.group == group &&
					link.id == controllerID &&
					link.isInUse == true &&
					link.controller == false
			})

			if (responderLink.length == 0) {
				return ''
			} else {
				return responderLink[0].onLevel
			}
		} else { return '' }
	}

}


InsteonUI.prototype.beep = function (deviceID, res) {
	var self = this

	console.log('Sending beep command to ' + deviceID)
	self.hub.directCommand(deviceID, '30')
	return
}

InsteonUI.prototype.getScripts = function () {
	var self = this

	self.addDevRow = '<script>' +
		'$("#add").click(function() {' +
		'$("#devTable").append("' + self.deviceTemplate + '");' +
		'$("#devConfigForm").validator("update");' +
		'});' +
		'</script>'

	self.addSceneRow = '<script>' +
		'$("#addScene").click(function() {' +
		'$("#sceneTemplate").append("' + self.sceneTemplate + '");' +
		'$("#sceneTemplate").validator("update");' +
		'});' +
		'</script>'

	self.validator = '<script src="https://cdnjs.cloudflare.com/ajax/libs/1000hz-bootstrap-validator/0.11.9/validator.min.js"></script>'

	self.dataTable = '<script src="https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.12/js/jquery.dataTables.min.js"></script>' +
		'<script src="https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.12/js/dataTables.bootstrap.min.js"></script>' +
		'<script>' +
		'$(document).ready(function() {' +
		"$('#linkTable').DataTable({'pageLength': 25, 'responsive': true, 'retrieve': true});" +
		'});' +
		'</script>'

	self.buttonAnimation = '<script>' +
		"$('.btn.load').on('click', function() {" +
		'var $this = $(this);' +
		"$this.button('loading');" +
		'setTimeout(function() {' +
		"$this.button('reset');" +
		'}, 300000);' +
		'});' +
		'</script>'

	self.listHighlight = '<script>' +
		"$('.list-group-item').on('click', function() {" +
		'var $this = $(this);' +
		"$('.active').removeClass('active');" +
		"$this.toggleClass('active')" +
		'})' +
		'</script>'

	self.alertFade = `<script>
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
		</script>`

	self.sseInit = `<script>
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
		</script>`

	self.progressModal = "<div id='progressModal' class='modal fade' role='dialog'>" +
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
		'</div>'

	self.scripts = self.validator + self.dataTable + self.buttonAnimation + self.alertFade + self.sseInit + self.progressModal
}

InsteonUI.prototype.stripEscapeCodes = function (chunk) {
	var receivedData = chunk.toString()
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
		.replace(/\%5D/g, ']')
	return receivedData
}

module.exports = InsteonUI