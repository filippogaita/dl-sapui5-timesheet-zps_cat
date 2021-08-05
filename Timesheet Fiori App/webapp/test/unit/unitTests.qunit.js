/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zfiori_timesheet_3n/zfiori_timesheet_3n/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
