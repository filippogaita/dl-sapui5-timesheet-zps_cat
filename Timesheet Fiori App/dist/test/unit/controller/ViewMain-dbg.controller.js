/*global QUnit*/

sap.ui.define([
	"zfiori_timesheet_3/zfiori_timesheet_3n/controller/ViewMain.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ViewMain Controller");

	QUnit.test("I should test the ViewMain controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
