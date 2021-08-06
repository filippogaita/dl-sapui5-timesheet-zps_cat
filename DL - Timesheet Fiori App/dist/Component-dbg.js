sap.ui.define([
        "sap/ui/core/UIComponent",
        //"sap/ui/dom/includeStylesheet",
        "sap/ui/model/json/JSONModel",
		"zfioritimesheet3/zfioritimesheet3n/model/models"
	], 
	function (UIComponent, JSONModel, models) { //function (UIComponent, includeStylesheet, JSONModel, Device, models) {
		"use strict";
		return UIComponent.extend("zfioritimesheet3.zfioritimesheet3n.Component", {
			metadata: {
                manifest: "json"
			},
			/**
			 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
			 * @public
			 * @override
			 */
			init: function () {
                //Include custom CSS:
                //var sCustomCssFilePath = "../css/style.css";
                //includeStylesheet(sCustomCssFilePath);
                //Set core to busy before elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.show();
				// call the base component's init function
				UIComponent.prototype.init.apply(this, arguments);
				// enable routing
				this.getRouter().initialize();
                // set the device model
                this.setModel(models.createDeviceModel(), "device");
                //Get main service model from the manifest and set it:
                var sMainServiceModelName = "mainService",
                    oMainServiceModel = this.getModel(sMainServiceModelName);
                this.setModel(oMainServiceModel, sMainServiceModelName);
                //Set JSON model for data display in "planCaleMain" planning calendar:
                var sJsonModelName = "jsonService",
                    oJsonModel = new JSONModel();
                oJsonModel.setData({ flagExecuted: false, people: [] });
                this.setModel(oJsonModel, sJsonModelName);
                //Set JSON model for data display in "planCaleManager" planning calendar:
                var sJsonManagerModelName = "jsonManagerService",
                    oJsonManagerModel = new JSONModel();
                oJsonManagerModel.setData({ flagExecuted: false, people: [] });
                this.setModel(oJsonManagerModel, sJsonManagerModelName);
                //Set JSON model for logged user team events:
                var sJsonTeamEventsModelName = "jsonTeamEventsService",
                    oJsonTeamEventsModel = new JSONModel();
                oJsonTeamEventsModel.setData({ appointments: [] });
                this.setModel(oJsonTeamEventsModel, sJsonTeamEventsModelName);
			}
		});
	}
);
