sap.ui.define([
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/library",
        "sap/ui/core/Fragment",
        "sap/ui/model/Filter",
        "sap/ui/core/format/DateFormat",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "sap/ui/core/routing/History"
    ],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
    function (Controller, coreLibrary, Fragment, Filter, DateFormat, MessageToast, MessageBox, History) {
        var ValueState = coreLibrary.ValueState;
        "use strict";
        return Controller.extend("zfioritimesheet3.zfioritimesheet3n.controller.ViewManager", {
            // Gestione primo caricamento, evento onBeforeRendering e pulsante per ritorno alla view principale inizio
            onInit: function () { //Initialization.
                //Set core to busy before backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var that = this,
                    oView = that.getView(),
                    oPlanCaleTeam = oView.byId("planCaleTeam"),
                    dCurrentDate = new Date(),
                    sModelName = "mainService",
                    sJsonModelName = "jsonService",
                    sJsonTeamEventsModelName = "jsonTeamEventsService",
                    sJsonManagerModelName = "jsonManagerService",
                    oModel = this.getOwnerComponent().getModel(sModelName),
                    oJsonModel = this.getOwnerComponent().getModel(sJsonModelName),
                    oJsonManagerModel = this.getOwnerComponent().getModel(sJsonManagerModelName),
                    oJsonTeamEventsModel = this.getOwnerComponent().getModel(sJsonTeamEventsModelName),
                    flagTeamExtractionError;
                //Check if backend data has already been read (if not, don't execute the initialization):
                var flagModelExecuted = oJsonManagerModel.getProperty("/flagExecuted");
                if (flagModelExecuted) {
                    //Set core to not busy after backend data fetching:
                    sap.ui.core.BusyIndicator.hide();
                    return false;
                }
                oJsonManagerModel.setProperty("/flagExecuted", true);
                oJsonManagerModel.refresh();
                //Set view switch buttons width, min, max and start date of "planCaleTeam" planning calendar:
                if (oPlanCaleTeam) {
                    if (this.getOwnerComponent().byId("container-zfiori_timesheet_3n---ViewManager--planCaleTeam-Header-ViewSwitch"))
                        this.getOwnerComponent().byId("container-zfiori_timesheet_3n---ViewManager--planCaleTeam-Header-ViewSwitch").setWidth("350px");
                    if (this.getOwnerComponent().byId("application-ZPS_CAT-display-component---ViewManager--planCaleTeam-Header-ViewSwitch"))
                        this.getOwnerComponent().byId("application-ZPS_CAT-display-component---ViewManager--planCaleTeam-Header-ViewSwitch").setWidth("350px");
                    oPlanCaleTeam.setStartDate(new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth(), dCurrentDate.getDate(), 1));
                    oPlanCaleTeam.setMinDate(new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth(), 1));
                    oPlanCaleTeam.setMaxDate(new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth() + 1, 0, 23, 59, 59, 999));
                }
                //Fetch backend data:
                //UserTeamSet:
                var sPathToLoggedUserUname = "/people/0/key",
                    sLoggedUserUname = oJsonModel.getProperty(sPathToLoggedUserUname),
                    oUserTeamFilter = new Filter({
                        filters: [
                            new Filter({
                                path: "InputUname",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sLoggedUserUname
                            })
                        ]
                    }),
                    sUserTeamFilter = "";
                sUserTeamFilter = oUserTeamFilter;
                oModel.read("/UserTeamSet", {
                    filters: [sUserTeamFilter],
                    success: function (oDataUserTeam) {
                        var sPathToPersons = "/people",
                            aPersons = oJsonManagerModel.getProperty(sPathToPersons),
                            i;
                        for (i = 0; i < oDataUserTeam.results.length; i++) {
                            var oTeamUser = {
                                key: oDataUserTeam.results[i].Uname,
                                key2: oDataUserTeam.results[i].Pernr,
                                title: oDataUserTeam.results[i].Uname,
                                text: oDataUserTeam.results[i].Unamex,
                                icon: "sap-icon://employee",
                                manager: false,
                                appointments: []
                            };
                            aPersons.push(oTeamUser);
                        }
                        if (!oJsonManagerModel.setProperty(sPathToPersons, aPersons)) {
                            //Set core to not busy after backend data fetching:
                            sap.ui.core.BusyIndicator.hide();
                            that.showTeamExtractionError();
                            return false;
                        }
                        //UserEventSet:
                        var sPathToTeamAppointments = "/appointments",
                            aTeamAppointments = oJsonTeamEventsModel.getProperty(sPathToTeamAppointments),
                            oUserEvent,
                            n;
                        for (i = 0; i < oDataUserTeam.results.length; i++) {
                            var sPathToPersonAppointments = "/people/" + aPersons.findIndex(obj => obj.key == oDataUserTeam.results[i].Uname) + "/appointments";
                            aPersonAppointments = oJsonManagerModel.getProperty(sPathToPersonAppointments);
                            for (n = 0; n < aTeamAppointments.length; n++) {
                                if (aTeamAppointments[n].user != oDataUserTeam.results[i].Uname)
                                    continue;
                                oUserEvent = aTeamAppointments[n];
                                aPersonAppointments.push(oUserEvent);
                            }
                            if (!oJsonManagerModel.setProperty(sPathToPersonAppointments, aPersonAppointments))
                                flagTeamExtractionError = "X";
                        }
                        if (flagTeamExtractionError) {
                            //Set core to not busy after backend data fetching:
                            sap.ui.core.BusyIndicator.hide();
                            that.showTeamExtractionError();
                        } else {
                            oJsonManagerModel.refresh();
                            //Set core to not busy after backend data fetching:
                            sap.ui.core.BusyIndicator.hide();
                        }
                    },
                    error: function (oError) {
                        //Set core to not busy after backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        that.showTeamExtractionError(oError);
                    }
                });
            },
            onNavBack: function () { //On press of back NavButton.
                if (History.getInstance().getPreviousHash()) {
                    window.history.back();
                } else {
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    if (oRouter)
                        oRouter.navTo("RouteViewMain", null, true);
                }
            },
            // Gestione primo caricamento, evento onBeforeRendering e pulsante per ritorno alla view principale fine
            // Funzioni di calcolo, formattazione e conversione inizio
            msToTime: function (sMs) { //Format input ms (string format) and return time string in format "HH:MM:SS.SSS".
                var pad = (n, z = 2) => ('00' + n).slice(-z);
                return pad(sMs / 3.6e6 | 0) + ':' + pad((sMs % 3.6e6) / 6e4 | 0) + ':' + pad((sMs % 6e4) / 1000 | 0) + '.' + pad(sMs % 1000, 3);
            },
            hoursToMs: function (iHours) { //Format input hours amount (int format) and return ms.
                return iHours * 3600000;
            },
            dateToYyyyMmDd: function (oDate) { //Format input date (Date object) and return a date string in format "YYYY-MM-DD".
                return new Date(oDate.getTime() - (oDate.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
            },
            dateToString: function (oDate) { //Format input date (Date object) and return a date string in format "DD/MM/YYYY at HH:MM".
                if (oDate)
                    return oDate.getDate().toString().padStart(2, "0") +
                        "/" + (oDate.getMonth() + 1).toString().padStart(2, "0") +
                        "/" + oDate.getFullYear().toString().substring(2, 4).padStart(2, "0") +
                        ", " +
                        oDate.getHours().toString().padStart(2, "0") +
                        ":" + oDate.getMinutes().toString().padStart(2, "0");
            },
            formatDateToMediumString: function (oDate) { //Format input date (Date object) and return a date string in format "dd MMM yy".
                return DateFormat.getDateInstance({ style: "medium" }).format(oDate);
            },
            formatDateString: function (sDate) { //Format input date (string format) and return a Date object.
                return new Date(sDate);
            },
            timeStringToDecimal: function (sTime) {
                return sTime.split(':')
                    .map(function(val) { return parseInt(val, 10); })
                    .reduce( function(previousValue, currentValue, index){
                        return previousValue + currentValue / Math.pow(60, index);
                    });
            },
            roundTo2DecimalsString: function (num) {
                var sign = num >= 0 ? 1 : -1;
                return (Math.round((num*Math.pow(10,2)) + (sign*0.001)) / Math.pow(10,2)).toFixed(2).toString();
            },
            // Funzioni di calcolo, formattazione e conversione fine
            // Funzioni di lancio errore inizio
            showTeamExtractionError: function (oError) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    sMessageDetails;
                if (oError) {
                    try {
                        sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                            JSON.parse(oError.responseText).error.innererror.errordetails[0].message + "</p>";
                    } catch (oTryError) {
                        sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                            oError.responseText + "</p>";
                    }
                    MessageBox.error(oI18n.getText("messageBoxTeamExtractionError"), {
                        title: oI18n.getText("messageBoxTeamExtractionErrorTitle"),
                        details: sMessageDetails,
                        styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                    });
                } else {
                    MessageBox.error(oI18n.getText("messageBoxTeamExtractionError"), {
                        title: oI18n.getText("messageBoxTeamExtractionErrorTitle"),
                        styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                    });
                }
            },
            showWbsPrefError: function (oError, sCreateOrDelete) { //Show errors that occured during creating/deleting a preferred WBS.
                var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    sMessageDetails;
                try {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        JSON.parse(oError.responseText).error.innererror.errordetails[0].message + "</p>";
                } catch (oTryError) {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        oError.responseText + "</p>";
                }
                if (sCreateOrDelete == "C") {
                    MessageBox.error(oI18n.getText("messageBoxWbsPrefErrorCreate"), {
                        title: oI18n.getText("messageBoxWbsPrefErrorTitle"),
                        details: sMessageDetails,
                        styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                    });
                } else if (sCreateOrDelete == "D") {
                    MessageBox.error(oI18n.getText("messageBoxWbsPrefErrorDelete"), {
                        title: oI18n.getText("messageBoxWbsPrefErrorTitle"),
                        details: sMessageDetails,
                        styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                    });
                }
            },
            showWbsPrefErrorMoreItems: function () { //Show an error if user selected more than one item for creation/deletion in WBS Overview.
                var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageBox.error(oI18n.getText("messageBoxWbsPrefErrorMoreItems"), {
                    title: oI18n.getText("messageBoxWbsPrefErrorTitle"),
                    styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                });
            },
            showWbsPrefErrorNotPreferred: function () { //Show an error if user selected more than one item for creation/deletion in WBS Overview.
                var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageBox.error(oI18n.getText("messageBoxWbsPrefErrorNotPreferred"), {
                    title: oI18n.getText("msgError"),
                    styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                });
            },
            showErrorNotEditable: function () {
                var sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageBox.error(oI18n.getText("msgErrorNotEditable"), {
                    title: oI18n.getText("msgError"),
                    styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                });
            },
            showDeleteError: function (oError) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    sMessageDetails;
                try {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        JSON.parse(oError.responseText).error.innererror.errordetails[0].message + "</p>";
                } catch (oTryError) {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        oError.responseText + "</p>";
                }
                MessageBox.error(oI18n.getText("msgErrorDeleteText"), {
                    title: oI18n.getText("msgError"),
                    details: sMessageDetails,
                    styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                });
            },
            showUpdateError: function (oError) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    sMessageDetails;
                try {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        JSON.parse(oError.responseText).error.innererror.errordetails[0].message + "</p>";
                } catch (oTryError) {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        oError.responseText + "</p>";
                }
                MessageBox.error(oI18n.getText("msgErrorUpdateText"), {
                    title: oI18n.getText("msgError"),
                    details: sMessageDetails,
                    styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                });
            },
            showCreateError: function (oError) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    sMessageDetails;
                try {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        JSON.parse(oError.responseText).error.innererror.errordetails[0].message + "</p>";
                } catch (oTryError) {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        oError.responseText + "</p>";
                }
                MessageBox.error(oI18n.getText("msgErrorCreateText"), {
                    title: oI18n.getText("msgError"),
                    details: sMessageDetails,
                    styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                });
            },
            showUnknownError: function (oError) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    sResponsivePaddingClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    sMessageDetails;
                try {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        JSON.parse(oError.responseText).error.innererror.errordetails[0].message + "</p>";
                } catch (oTryError) {
                    sMessageDetails = "<p><strong>" + oI18n.getText("messageBoxErrorDetailsText") + "</strong><br/>" +
                        oError.responseText + "</p>";
                }
                MessageBox.error(oI18n.getText("msgGeneralErrorText"), {
                    title: oI18n.getText("msgError"),
                    details: sMessageDetails,
                    styleClass: (!jQuery.support.touch) ? sResponsivePaddingClasses : ""
                });
            },
            // Funzioni di lancio errore fine
            // Gestione WBS Overview Inizio
            onPressBtnWbs: function (oEvent) {
                var oButton = oEvent.getSource(),
                    oView = this.getView();
                if (!this._pDialog) {
                    this._pDialog = Fragment.load({
                        id: oView.getId(),
                        name: "zfioritimesheet3.zfioritimesheet3n.view.FragmentWbs",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pDialog.then(function (oDialog) {
                    this._configDialogWbs(oButton, oDialog);
                    if (oDialog)
                        oDialog.open();
                }.bind(this));
            },
            _configDialogWbs: function (oButton, oDialog) {
                // Set responsive padding:
                var sResponsivePadding = oButton.data("responsivePadding"),
                    sResponsiveStyleClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--subHeader sapUiResponsivePadding--content sapUiResponsivePadding--footer",
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oCancelButton = oDialog._getCancelButton();
                if (sResponsivePadding) {
                    oDialog.addStyleClass(sResponsiveStyleClasses);
                } else {
                    oDialog.removeStyleClass(sResponsiveStyleClasses);
                }
                //Set cancel button text and tooltip:
                oCancelButton.setText(oI18n.getText("textBtnCloseWbs"));
                oCancelButton.setTooltip(oI18n.getText("tooltipBtnCloseWbs"));
                // Set filter to show only preferred WBS by default:
                var oTableSelectDialog = this.getView().byId("tableSelectDialogWbs"),
                    oBinding,
                    oFilter = new Filter({
                        filters: [
                            new Filter({
                                path: "InputExtractOnlyPrefWbs",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: "X"
                            })
                        ]
                    }),
                    oShowAllWbsButton = this.byId("btnShowAllWbs");
                oShowAllWbsButton.setPressed(false);
                oBinding = oTableSelectDialog.getBinding("items");
                oBinding.filter([oFilter]);
            },
            handleSearchTableSelectDialogWbs: function (oEvent) {
                //Set core to busy before elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.show();   
                var sValue = oEvent.getParameter("value"),
                    oFilter = new Filter({
                        filters: [
                            new Filter({
                                path: "InputPosid",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sValue
                            }),
                            new Filter({
                                path: "InputPost1",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sValue
                            }),
                            new Filter({
                                path: "InputSearch",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: "X"
                            })
                        ],
                        and: true
                    }),
                    oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
                //Set core to not busy after elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.hide(); 
            },
            handleCloseTableSelectDialogWbs: function (oEvent) {
                // Reset the filter:
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([]);
            },
            handleSelectTableSelectDialogWbs: function (oEvent) { //Fired when a row of the WBS dialog is selected. Open the activity creation dialog using the selected WBS.
                //Set core to busy before elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var oModel = this.getOwnerComponent().getModel("mainService"),
                    oBinding = oEvent.getSource().getBinding("items"),
                    aSelectedITems = oEvent.getParameters("selectedItems").selectedItems,
                    oSelectedItem,
                    oRow;
                // Reset the filter:
                oBinding.filter([]);
                if (aSelectedITems.length > 1) {
                    //Set core to not busy after backend data fetching:
                    sap.ui.core.BusyIndicator.hide();
                    that.showWbsPrefErrorMoreItems();
                    return false;
                }
                oSelectedItem = aSelectedITems[0];
                //Get the selected row:
                oRow =  oModel.getProperty(oSelectedItem.getBindingContextPath());
                if (!oRow.Pref) {
                    //Set core to not busy after backend data fetching:
                    sap.ui.core.BusyIndicator.hide();
                    this.showWbsPrefErrorNotPreferred();
                    return false;
                }
                //Start dialog rendering using the slected WBS:
                this._arrangeDialogFragmentCreateWithWbs(oRow);
            },
            _arrangeDialogFragmentCreateWithWbs: function (oRow) {
                var oView = this.getView();
                if (!this._pNewAppointmentDialog) {
                    this._pNewAppointmentDialog = Fragment.load({
                        id: oView.getId(),
                        name: "zfioritimesheet3.zfioritimesheet3n.view.FragmentCreazioneManager",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pNewAppointmentDialog.then(function (oDialog) {
                    this._arrangeDialogCreateWithWbs(oDialog, oRow);
                }.bind(this));
            },
            _arrangeDialogCreateWithWbs: function (oDialog, oRow) {
                var sTempTitle = "",
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oInputUser = this.byId("selectDipName"),
                    oInputActivity = this.byId("actType"),
                    oInputWbs = this.byId("wbsType"),
                    oInputStartDate = this.byId("createStartDate"),
                    oInputEndDate = this.byId("createEndDate"),
                    oInputWorkdate = this.byId("createGiornoDate"),
                    oInputWorkedHours = this.byId("oreLavorate"),
                    oInputShortDescription = this.byId("appTitle"),
                    oInputAdditionalInformation = this.byId("moreInfo");
                //Reset the value state of all input values:
                oInputUser.setValueState(ValueState.None);
                oInputActivity.setValueState(ValueState.None);
                oInputWbs.setValueState(ValueState.None);
                oInputStartDate.setValueState(ValueState.None);
                oInputEndDate.setValueState(ValueState.None);
                oInputWorkdate.setValueState(ValueState.None);
                oInputWorkedHours.setValueState(ValueState.None);
                oInputShortDescription.setValueState(ValueState.None);
                oInputAdditionalInformation.setValueState(ValueState.None);
                this._setCreateAppointmentDialogContentCreateWithWbs(oRow);
                sTempTitle = oI18n.getText("titleCreateAppointmentDialog");
                //this.updateButtonEnabledStateCreateWithWbs(oDialog);
                oDialog.setTitle(sTempTitle);
                oDialog.open();
                //Set core to not busy after elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.hide();
            },
            _setCreateAppointmentDialogContentCreateWithWbs: function (oRow) {
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oPlanningCalendar = this.getView().byId("planCaleTeam"),
                    oCurrentSelectedDate, //Selected date (the date on which we are positioned) when opening the create dialog.
                    oDateTimePickerStart = this.byId("createStartDate"),
                    oDateTimePickerEnd = this.byId("createEndDate"),
                    oDatePickerGiornoDate = this.byId("createGiornoDate"),
                    oTitleInput = this.byId("appTitle"),
                    oMoreInfoInput = this.byId("moreInfo"),
                    oPersonSelected = this.byId("selectDipName"),
                    oActType = this.byId("actType"),
                    oWbsType = this.byId("wbsType"),
                    sDefaultActivity = "LAV005",
                    sDefaultActivityText = "Lavoro",
                    decOreLavorate,
                    sRoundedOreLavorate,
                    oSPCStartDate,
                    oSPCEndDate,
                    sStartDateFormatted,
                    sEndDateFormatted,
                    oEvento = this.getOwnerComponent().getModel("paramModel"),
                    oDefaultUser = oJsonModel.getProperty("/people/0");
                if (oPlanningCalendar._dateNav._start) {
                    oCurrentSelectedDate = oPlanningCalendar._dateNav._start;
                } else {
                    oCurrentSelectedDate = new Date();
                }
                if (oEvento) {
                    if (oEvento.oData) {
                        oSPCStartDate = oEvento.oData.startDate;
                        oSPCEndDate = oEvento.oData.endDate;
                        sStartDateFormatted = oSPCStartDate.getHours().toString().padStart(2, "0") + ":" + oSPCStartDate.getMinutes().toString().padStart(2, "0");
                        sEndDateFormatted = oSPCEndDate.getHours().toString().padStart(2, "0") + ":" + oSPCEndDate.getMinutes().toString().padStart(2, "0");
                        decOreLavorate = Math.abs(this.timeStringToDecimal(sEndDateFormatted) - this.timeStringToDecimal(sStartDateFormatted));
                        if (decOreLavorate > 0) {
                            sRoundedOreLavorate = this.roundTo2DecimalsString(decOreLavorate);
                        } else {
                            sRoundedOreLavorate = "";
                        }
                        oEvento.setData(null);
                        oEvento.updateBindings(true);
                    } else {
                        oSPCStartDate = oCurrentSelectedDate;
                        oSPCEndDate = oCurrentSelectedDate;
                        sRoundedOreLavorate = ""; 
                    }
                } else {
                    oSPCStartDate = oCurrentSelectedDate;
                    oSPCEndDate = oCurrentSelectedDate;
                    sRoundedOreLavorate = "";                        
                }
                var oStartDate = new Date(oSPCStartDate),
                    oEndDate = new Date(oSPCEndDate);
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService");
                //Set the person in the first row as selected.
                oPersonSelected.setValue(oDefaultUser.text);
                oPersonSelected.setSelectedItem(oDefaultUser.key);
                oPersonSelected.setSelectedKey(oDefaultUser.key);
                //save selected row key
                var oKey = {
                    "userPernr": oDefaultUser.key2,
                    "user": oDefaultUser.key
                };
                var mKey = new sap.ui.model.json.JSONModel();
                mKey.setData(oKey);
                this.getOwnerComponent().setModel(mKey, "keyModel");
                var oStartDateControl = DateFormat.getDateTimeInstance({ style: "medium" }).format(oStartDate);
                var oEndDateControl = DateFormat.getDateTimeInstance({ style: "medium" }).format(oEndDate);
                var oCre2GiornoDateControl = DateFormat.getDateInstance({ style: "medium" }).format(oStartDate);
                oDateTimePickerStart.setValue(oStartDateControl);
                oDateTimePickerEnd.setValue(oEndDateControl);
                oDatePickerGiornoDate.setValue(oCre2GiornoDateControl);
                oTitleInput.setValue("");
                oMoreInfoInput.setValue("");
                oActType.setValue(sDefaultActivityText);
                oActType.setSelectedItem(sDefaultActivity);
                oActType.setSelectedKey(sDefaultActivity);
                oWbsType.setValue(oRow.Post1);
                oWbsType.setSelectedItem(oRow.Rproj);
                oWbsType.setSelectedKey(oRow.Rproj);
                oWbsType.setEditable(true);
                this.getView().byId("lCreateStartDate").setVisible(false);
                oDateTimePickerStart.setVisible(false);
                this.getView().byId("lCreateEndDate").setVisible(false);
                oDateTimePickerEnd.setVisible(false);
                this.getView().byId("lGiornoDate").setVisible(true);
                oDatePickerGiornoDate.setVisible(true);
                this.getView().byId("lOreLavorate").setVisible(true);
                this.getView().byId("oreLavorate").setVisible(true);
                this.getView().byId("oreLavorate").setValue(sRoundedOreLavorate);
            },
            onPressBtnShowAllWbs: function (oEvent) { //On press of "btnShowAllWbs" button. Show all available WBS in "tableSelectDialogWbs" table select dialog.
                var oTableSelectDialog = this.getView().byId("tableSelectDialogWbs"),
                    oBinding,
                    oFilter,
                    sValue1;
                //Set "selectDialogWbs" TableSelectDialog to busy before backend data fetching:
                oTableSelectDialog.setBusy(true);
                //Filter WBS (only preffered or all):
                oBinding = oTableSelectDialog.getBinding("items");
                if (oEvent.getSource().getPressed()) {
                    sValue1 = "";
                } else {
                    sValue1 = "X";
                }
                oFilter = new Filter({
                    filters: [
                        new Filter({
                            path: "InputExtractOnlyPrefWbs",
                            operator: sap.ui.model.FilterOperator.EQ,
                            value1: sValue1
                        })
                    ]
                });
                oBinding.filter([oFilter]);
                //Set "selectDialogWbs" TableSelectDialog to not busy after backend data fetching:
                oTableSelectDialog.setBusy(false);
            },
            onPressBtnAddRemovePrefWbs: function (oEvent) { //On press of "btnManagePrefWbs" button. Add/remove the selected WBS to favorites.
                //Set core to busy before backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var that = this,
                    sModelName = "mainService",
                    oModel = that.getView().getModel(sModelName),
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    sPath = oEvent.getSource().oParent.oBindingContexts.mainService.sPath,
                    oRow = oModel.getProperty(sPath),
                    oWbs,
                    sPref;
                if (oRow.Pref) { //Selected WBS is currently set as preferred.
                    sPref = "";
                } else { //Selected WBS is currently set as not preferred.
                    sPref = "X";
                };
                oWbs = {
                    "InputUname": "",
                    "InputPernr": "",
                    "InputRproj": "",
                    "Uname": oRow.Uname,
                    "Pernr": oRow.Pernr,
                    "Rproj": oRow.Rproj,
                    "Posid": oRow.Posid,
                    "Post1": oRow.Post1,
                    "Pbukr": oRow.Pbukr,
                    "Werks": oRow.Werks,
                    "Usr00": oRow.Usr00,
                    "Kostl": oRow.Kostl,
                    "Pref": sPref
                };
                if (sPref) { //Call method CREATE of "WbsPrefSet" entity set to set the selected WBS as preferred.
                    oModel.create("/WbsPrefSet", oWbs, {
                        success: function () {
                            oModel.refresh();
                            //Set core to not busy after backend data fetching:
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(oI18n.getText("messageToastWbsPrefSuccess"));
                        },
                        error: function (oError) {
                            //Set core to not busy after backend data fetching:
                            sap.ui.core.BusyIndicator.hide();
                            that.showWbsPrefError(oError, "C");
                        }
                    });
                } else { //Call method DELETE of "WbsPrefSet" entity set to set the selected WBS as not preferred.
                    oModel.remove("/WbsPrefSet(Uname='" + oRow.Uname + "',Pernr='" + oRow.Pernr + "',Rproj='" + oRow.Rproj + "')", {
                        success: function () {
                            oModel.refresh();
                            //Set core to not busy after backend data fetching:
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(oI18n.getText("messageToastWbsPrefSuccess"));     
                        },
                        error: function (oError) {
                            //Set core to not busy after backend data fetching:
                            sap.ui.core.BusyIndicator.hide();
                            that.showWbsPrefError(oError, "D");
                        }
                    });
                }
            },
            // Gestione WBS Overview fine
            // Gestione Days Overview inizio
            onPressBtnTeamDays: function (oEvent) {
                var oButton = oEvent.getSource(),
                    oView = this.getView();
                if (!this._pDialog2) {
                    this._pDialog2 = Fragment.load({
                        id: oView.getId(),
                        name: "zfioritimesheet3.zfioritimesheet3n.view.FragmentDaysManager",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pDialog2.then(function (oDialog) {
                    this._configDialogDaysManager(oButton, oDialog);
                    if (oDialog)
                        oDialog.open();
                }.bind(this));
            },
            _configDialogDaysManager: function (oButton, oDialog) {
                // Set responsive padding:
                if (!oButton)
                    oButton = this.byId("btnDaysManager");
                if (!oDialog)
                    oDialog = this.byId("dialogDaysManager");
                var sResponsivePadding = oButton.data("responsivePadding"),
                    sResponsiveStyleClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--subHeader sapUiResponsivePadding--content sapUiResponsivePadding--footer";
                if (sResponsivePadding) {
                    oDialog.addStyleClass(sResponsiveStyleClasses);
                } else {
                    oDialog.removeStyleClass(sResponsiveStyleClasses);
                }
                var oDateFormatter = DateFormat.getDateInstance({
                        pattern: "yyyy-MM-dd",
                        UTC: false
                    }),
                    oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oDefaultUser = oJsonModel.getProperty("/people/0"),
                    oListDaysOverview = this.getView().byId("listDialogDaysManager"),
                    oSelectUserDialogDays = this.byId("selectUserDialogDaysManager"),
                    oDateRangeWorkdateDays = this.byId("dateRangeWorkdateDialogDaysManager"),
                    oSwitchShowOnlyDaysInError = this.byId("switchShowOnlyDaysInErrorDialogDaysManager"),
                    dCurrentDate = new Date(),
                    sFormattedWorkdateFrom = oDateFormatter.format(new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth() -1, dCurrentDate.getDate())),
                    sFormattedWorkdateTo = oDateFormatter.format(new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth(), dCurrentDate.getDate())),
                    oBinding = oListDaysOverview.getBinding("items"),
                    oFilter = new Filter({
                        filters: [
                            new Filter({
                                path: "InputUname",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oDefaultUser.key
                            }),
                            new Filter({
                                path: "InputPernr",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oDefaultUser.key2
                            }),
                            new Filter({
                                path: "InputWorkdateFrom",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sFormattedWorkdateFrom
                            }),
                            new Filter({
                                path: "InputWorkdateTo",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sFormattedWorkdateTo
                            }),
                            new Filter({
                                path: "InputExtractOnlyDaysError",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: ""
                            })
                        ],
                        and: true
                    });
                //Reset the value state of "dateRangeWorkdateDialogDaysManager" date range and "selectUserDialogDaysManager" select filter values:
                oSelectUserDialogDays.setValueState(ValueState.None);
                oDateRangeWorkdateDays.setValueState(ValueState.None);                    
                //Set default filter values:
                oSelectUserDialogDays.setValue(oDefaultUser.text);
                oSelectUserDialogDays.setSelectedItem(oDefaultUser.key);
                oSelectUserDialogDays.setSelectedKey(oDefaultUser.key);
                oDateRangeWorkdateDays.setValue(DateFormat.getDateInstance({ style: "medium" }).format(new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth() - 1, dCurrentDate.getDate())) + "-" + DateFormat.getDateInstance({ style: "medium" }).format(dCurrentDate));
                oSwitchShowOnlyDaysInError.setState(false);
                oBinding.filter([oFilter]);
            },
            onUpdateFinishedListDialogDaysManager: function (oEvent) {
                //Update the master list object counter after new data is loaded:
                this._updateListItemCountDialogDaysManager(oEvent.getParameter("total"));
            },
            _updateListItemCountDialogDaysManager: function (iTotalItems) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                //Only update the counter if the length is final:
                if (this.byId("listDialogDaysManager").getBinding("items").isLengthFinal())
                    this.byId("labelInfoToolbarDialogDaysManager").setText(oI18n.getText("textDisplaydEntriesDialogDays") + iTotalItems);
            },
            onPressBtnCloseDialogDaysManager: function () {
                // Reset the filter:
                var oBinding = this.byId("listDialogDaysManager").getBinding("items");
                oBinding.filter([]);
                // Close dialog:
                this.byId("dialogDaysManager").close();
            },
            onPressBtnApplySelectedFiltersDialogDaysManager: function () {
                var oListDaysOverview = this.getView().byId("listDialogDaysManager");
                //Set "listDialogDaysManager" list to busy before backend data fetching:
                oListDaysOverview.setBusy(true);
                var oDateFormatter = DateFormat.getDateInstance({
                        pattern: "yyyy-MM-dd",
                        UTC: false
                    }),
                    oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oSelectUserDialogDays = this.byId("selectUserDialogDaysManager"),
                    oDateRangeWorkdateDays = this.byId("dateRangeWorkdateDialogDaysManager"),
                    oSwitchShowOnlyDaysInError = this.byId("switchShowOnlyDaysInErrorDialogDaysManager"),
                    aPersons = oJsonModel.getProperty("/people"),
                    oSelectedUser = oJsonModel.getProperty("/people/" + aPersons.findIndex(obj => obj.key==oSelectUserDialogDays.getSelectedKey())),
                    oSelectedWorkdateFrom = oDateRangeWorkdateDays.getDateValue(),
                    oSelectedWorkdateTo = oDateRangeWorkdateDays.getSecondDateValue(),
                    sFormattedWorkdateFrom = oDateFormatter.format(oSelectedWorkdateFrom),
                    sFormattedWorkdateTo = oDateFormatter.format(oSelectedWorkdateTo),
                    sFlagExtractOnlyDaysError = oSwitchShowOnlyDaysInError.getState() ? "X" : "";
                    oBinding = oListDaysOverview.getBinding("items"),
                    oFilter = new Filter({
                        filters: [
                            new Filter({
                                path: "InputUname",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oSelectedUser.key
                            }),
                            new Filter({
                                path: "InputPernr",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oSelectedUser.key2
                            }),
                            new Filter({
                                path: "InputWorkdateFrom",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sFormattedWorkdateFrom
                            }),
                            new Filter({
                                path: "InputWorkdateTo",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sFormattedWorkdateTo
                            }),
                            new Filter({
                                path: "InputExtractOnlyDaysError",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sFlagExtractOnlyDaysError
                            })
                        ],
                        and: true
                    });
                //Apply selected filter values:
                oBinding.filter([oFilter]);
                //Set "listDialogDaysManager" list to not busy after backend data fetching:
                oListDaysOverview.setBusy(false);
            },
            onChangeSelectUserDialogDaysManager: function () {
                this._validateFilterValuesDialogDaysManager();
            },
            onChangeDateRangeWorkdateDialogDaysManager: function () {
                this._validateFilterValuesDialogDaysManager();
            },
            onChangeSwitchShowOnlyDaysInErrorDialogDaysManager: function () {
                this._validateFilterValuesDialogDaysManager();
            },
            _validateFilterValuesDialogDaysManager: function () {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oSelectUserDialogDays = this.byId("selectUserDialogDaysManager"),
                    oDateRangeWorkdateDays = this.byId("dateRangeWorkdateDialogDaysManager");
                if (!oSelectUserDialogDays.getSelectedKey()) {
                    oSelectUserDialogDays.setValueState(ValueState.Error);
                    oSelectUserDialogDays.setValueStateText(oI18n.getText("validationErrorTextEmtpyUser"));
                } else {
                    //Input is valid.
                    oSelectUserDialogDays.setValueState(ValueState.None);
                }
                if (!oDateRangeWorkdateDays.getValue()) {
                    oDateRangeWorkdateDays.setValueState(ValueState.Error);
                    oDateRangeWorkdateDays.setValueStateText(oI18n.getText("validationErrorTextEmtpyDateRangeDialogDays"));
                } else if (!oDateRangeWorkdateDays._bValid) {
                    oDateRangeWorkdateDays.setValueState(ValueState.Error);
                    oDateRangeWorkdateDays.setValueStateText(oI18n.getText("validationErrorTextInvalidDateRangeDialogDays"));
                } else {
                    //Input is valid.
                    oDateRangeWorkdateDays.setValueState(ValueState.None);
                }
                this._updateEnabledStateBtnApplySelectedFiltersDialogDaysManager();
            },
            _updateEnabledStateBtnApplySelectedFiltersDialogDaysManager: function () {
                var oSelectUserDialogDays = this.byId("selectUserDialogDaysManager"),
                    oDateRangeWorkdateDays = this.byId("dateRangeWorkdateDialogDaysManager"),
                    oButtonApplySelectedFilters = this.byId("btnApplySelectedFiltersDialogDaysManager")
                    bEnabled = oDateRangeWorkdateDays.getValueState() !== ValueState.Error
                        && oSelectUserDialogDays.getValueState() !== ValueState.Error;
                oButtonApplySelectedFilters.setEnabled(bEnabled);
            },
            // Gestione Days Overview fine
            // Gestione selezione evento e apertura popup dettagli con opzioni di edit e delete inizio
            handlePlanCaleTeamAppoSele: function (oEvent) {
                //Set core to busy before backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var oAppointment = oEvent.getParameter("appointment");
                if (oAppointment) {
                    //save selected row key                    
                    var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService");
                    var sPath = oAppointment.mBindingInfos.key.binding.oContext.sPath;
                    var oKey = oJsonModel.getProperty(sPath);
                    var mKey = new sap.ui.model.json.JSONModel();
                    mKey.setData(oKey);
                    this.getOwnerComponent().setModel(mKey, "keyModel");
                    this._handleAppointmentSelection(oAppointment);
                }
            },
            _handleAppointmentSelection: function (oAppointment) {
                var oView = this.getView();
                if (!oAppointment) {
                    //Set core to not busy after elements rendering and backend data fetching:
                    sap.ui.core.BusyIndicator.hide();
                    return;
                }
                if (!oAppointment.getSelected() && this._pDetailsPopover) {
                    this._pDetailsPopover.then(function (oDetailsPopover) {
                        oDetailsPopover.close();
                    });
                    //Set core to not busy after elements rendering and backend data fetching:
                    sap.ui.core.BusyIndicator.hide();
                    return;
                }
                if (!this._pDetailsPopover) {
                    this._pDetailsPopover = Fragment.load({
                        id: oView.getId(),
                        name: "zfioritimesheet3.zfioritimesheet3n.view.FragmentDetails",
                        controller: this
                    }).then(function (oDetailsPopover) {
                        oView.addDependent(oDetailsPopover);
                        return oDetailsPopover;
                    });
                }
                this._pDetailsPopover.then(function (oDetailsPopover) {
                    this._setDetailsDialogContent(oAppointment, oDetailsPopover);
                }.bind(this));
                //Set core to not busy after elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.hide();
            },
            _setDetailsDialogContent: function (oAppointment, oDetailsPopover) {
                var that = this,
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oTextControl = this.byId("moreInfoText"),
                    oShortTextControl = this.byId("shortTextText"),
                    oLongTextControl = this.byId("longTextText"),
                    oWbs = this.byId("wbsText"),
                    labelStartDate = this.byId("labelStartDate"),
                    oStartDate = this.byId("startDateText"),
                    oEndDate = this.byId("endDateText"),
                    oLendDateText = this.byId("lEndDateText"),
                    oEndDateText = this.byId("endDateText"),
                    oLOreLavoro = this.byId("lOreLavoro"),
                    oOreLavoro = this.byId("oreLavoro");
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService");
                var oModel = this.getOwnerComponent().getModel("mainService");
                var sPath = oAppointment.mBindingInfos.key.binding.oContext.sPath;
                var oKey = oJsonModel.getProperty(sPath);
                var sUserEventPath = "UserEventSet(Uname='" + oKey.user + "',Pernr='" + oKey.userPernr + "',Counter='" + oKey.key + "')";
                var oEvent = oModel.oData[sUserEventPath];
                if (oAppointment.mBindingInfos === undefined)
                    oAppointment = oEvent.getParameter("appointment");
                if (oEvent.Status !== "10") {
                    //Set core to not busy after elements rendering and backend data fetching:
                    sap.ui.core.BusyIndicator.hide();
                    that.showErrorNotEditable();
                    return false;
                }
                //Controllo tipo attività e gestisco la valorizzazione del fragment di conseguenza:
                if (oEvent.Tasklevel == "ASS001") {
                    oEndDateText.setVisible(true);
                    oLendDateText.setVisible(true);
                    oLOreLavoro.setVisible(false);
                    oOreLavoro.setVisible(false);
                    labelStartDate.setText(oI18n.getText("textFromLabel2"));
                    var oSPCStartDate = new Date(oKey.startDate);
                    if (oSPCStartDate) {
                        oStartDateControl = DateFormat.getDateTimeInstance({ style: "medium" }).format(oSPCStartDate);
                        oStartDate.setText(oStartDateControl);
                    };
                    var oSPCEndDate = new Date(oKey.endDate);
                    if (oSPCEndDate) {
                        oEndDateControl = DateFormat.getDateTimeInstance({ style: "medium" }).format(oSPCEndDate);
                        oEndDate.setText(oEndDateControl);
                    };
                } else {
                    oEndDateText.setVisible(false);
                    oLendDateText.setVisible(false);
                    oLOreLavoro.setVisible(true);
                    oOreLavoro.setVisible(true);
                    labelStartDate.setText(oI18n.getText("textDayLabel2"));
                    var oSPCStartDate = oEvent.Workdate;
                    var ora = parseInt(this.msToTime(oEvent.Beguz.ms).substring(0, 2));
                    var minuti = parseInt(this.msToTime(oEvent.Beguz.ms).substring(3, 5));
                    oSPCStartDate.setHours(ora);
                    oSPCStartDate.setMinutes(minuti);
                    oStartDateControl = DateFormat.getDateInstance({ style: "medium" }).format(oSPCStartDate);
                    oStartDate.setText(oStartDateControl);
                    oOreLavoro.setText(oEvent.Catshours);
                }
                oTextControl.setText(oKey.text);
                oShortTextControl.setText(oKey.description);
                oLongTextControl.setText(oKey.longDescription);
                oWbs.setText(oKey.wbsDescription);
                oDetailsPopover.openBy(oAppointment);
            },
            // Gestione selezione evento e apertura popup dettagli con opzioni di edit e delete fine
            // Gestione eliminazione evento inizio
            handleDeleteAppointment: function (oEvent) {
                var that = this;
                var oDetailsPopover = this.byId("detailsPopover");
                var oBundle = this.getView().getModel("i18n").getResourceBundle();
                var sMsg = oBundle.getText("msgDelete");
                sap.m.MessageBox.confirm(sMsg, {
                    title: oBundle.getText("msgDeleteTitle"),
                    initialFocus: MessageBox.Action.CANCEL,
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.OK) {
                            //Set core to busy before backend data fetching:
                            sap.ui.core.BusyIndicator.show(); 
                            that._removeAppointment();
                            oDetailsPopover.close();
                        } else {
                        }
                    },
                    styleClass: (!jQuery.support.touch) ? "sapUiSizeCompact" : ""
                });
            },
            _removeAppointment: function () {
                //Set core to busy before elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var oModel = this.getOwnerComponent().getModel("mainService"),
                    oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oKeyModel = this.getOwnerComponent().getModel("keyModel"),
                    oBundle = this.getView().getModel("i18n").getResourceBundle(),
                    that = this,
                    i = 0,
                    j = 0,
                    sPath,
                    oPersonAppointments;
                //get selected key                    
                var oPersonUname = oKeyModel.getData().user,
                    oCounter = oKeyModel.getData().key,
                    aPersons = oJsonModel.getProperty("/people"),
                    iUserIndex = aPersons.findIndex(obj => obj.key==oPersonUname),
                    oUser = oJsonModel.getProperty("/people/" + iUserIndex);
                oModel.remove("/UserEventSet(Uname='" + oUser.key + "',Pernr='" + oUser.key2 + "',Counter='" + oCounter + "')", {
                    success: function () {
                        oJsonModel.getProperty("/people/").forEach(function (oRiga) {
                            if (oRiga.key === oUser.key) {
                                sPath = "/people/" + i.toString();
                                sPath += "/appointments";
                                oPersonAppointments = oJsonModel.getProperty(sPath);
                                oPersonAppointments.forEach(function (oAppoint) {
                                    if (oAppoint.key === oCounter) {
                                        oPersonAppointments.splice(j, 1);
                                    }
                                    j = j + 1;
                                })
                            };
                            i = i + 1;
                        });
                        //Refresh forzato dei dati:
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide()
                        MessageToast.show(oBundle.getText("msgOkDeleted"));
                        that._ricaricaUserEvent();
                    },
                    error: function (oError) {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        that.showDeleteError(oError);
                    }
                });
            },
            // Gestione eliminazione evento fine
            // Gestione modifica evento inizio
            handleEditButton: function (oEvent) {
                var oDetailsPopover = this.byId("detailsPopover");
                oDetailsPopover.close();
                this._arrangeDialogFragmentModifica();
            },
            _arrangeDialogFragmentModifica: function () {
                //Set core to busy before backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var oView = this.getView();
                if (!this._pModAppointmentDialog) {
                    this._pModAppointmentDialog = Fragment.load({
                        id: oView.getId(),
                        name: "zfioritimesheet3.zfioritimesheet3n.view.FragmentModificaManager",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pModAppointmentDialog.then(function (oDialog) {
                    this._arrangeDialogModifica(oDialog);
                }.bind(this));
            },
            _arrangeDialogModifica: function (oDialog) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    sTempTitle = "";
                this._setAppointmentDialogModifica();
                sTempTitle = oI18n.getText("titleEditAppointmentDialog")
                //this.updateButtonEnabledStateModifica(oDialog);
                oDialog.setTitle(sTempTitle);
                //Set core to not busy after backend data fetching:
                sap.ui.core.BusyIndicator.hide();
                oDialog.open();
            },
            _setAppointmentDialogModifica: function () {
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oPersonSelected = this.byId("selectModName"),
                    oAppType = this.byId("modActType"),
                    oWbsType = this.byId("modWbsType"),
                    oLstartDateText = this.byId("lModStartDate"),
                    oStartDate = this.byId("modStartDate"),
                    oLendDateText = this.byId("lModEndDate"),
                    oEndDate = this.byId("modEndDate"),
                    oLgiornoDate = this.byId("lModGiornoDate"),
                    oGiornoDate = this.byId("modGiornoDate"),
                    oLOreLavoro = this.byId("lModOreLavorate"),
                    oOreLavoro = this.byId("modOreLavorate"),
                    oTitleInput = this.byId("modAppTitle"),
                    oMoreInfoInput = this.byId("modMoreInfo"),
                    oSPCStartDate,
                    oSPCEndDate,
                    oStartDateControl,
                    oEndDateControl,
                    oWorkdateRaw,
                    oWorkdate,
                    oInputActivity = this.byId("modActType"),
                    oInputWbs = this.byId("modWbsType"),
                    oInputStartDate = this.byId("modStartDate"),
                    oInputEndDate = this.byId("modEndDate"),
                    oInputWorkdate = this.byId("modGiornoDate"),
                    oInputWorkedHours = this.byId("modOreLavorate"),
                    oInputShortDescription = this.byId("modAppTitle"),
                    oInputAdditionalInformation = this.byId("modMoreInfo");
                //Reset the value state of all input values:
                oInputActivity.setValueState(ValueState.None);
                oInputWbs.setValueState(ValueState.None);
                oInputStartDate.setValueState(ValueState.None);
                oInputEndDate.setValueState(ValueState.None);
                oInputWorkdate.setValueState(ValueState.None);
                oInputWorkedHours.setValueState(ValueState.None);
                oInputShortDescription.setValueState(ValueState.None);
                oInputAdditionalInformation.setValueState(ValueState.None);
                var oModel = this.getOwnerComponent().getModel("mainService");
                var oKeyModel = this.getOwnerComponent().getModel("keyModel");
                var oPersonUname = oKeyModel.getData().user,
                    oCounter = oKeyModel.getData().key;
                var aPersons = oJsonModel.getProperty("/people"),
                    oUser = oJsonModel.getProperty("/people/" + aPersons.findIndex(obj => obj.key==oPersonUname));
                oPersonSelected.setValue(oUser.text);
                oPersonSelected.setSelectedItem(oUser.key);
                oPersonSelected.setSelectedKey(oUser.key);
                oTitleInput.setValue(this.byId("shortTextText").getText());
                oMoreInfoInput.setValue(this.byId("longTextText").getText());
                var sUserEventPath = "UserEventSet(Uname='" + oUser.key + "',Pernr='" + oUser.key2 + "',Counter='" + oCounter + "')";
                var oEvent = oModel.oData[sUserEventPath];
                oAppType.setValue(oEvent.Tasklevelx);
                oAppType.setSelectedItem(oEvent.Tasklevel);
                oAppType.setSelectedKey(oEvent.Tasklevel);
                //Controllo tipo attività e gestisco la valorizzazione del fragment di conseguenza:
                if (oEvent.Tasklevel == "ASS001") {
                    oWbsType.setEditable(false);
                    oStartDate.setVisible(true);
                    oLstartDateText.setVisible(true);
                    oEndDate.setVisible(true);
                    oLendDateText.setVisible(true);
                    oLgiornoDate.setVisible(false);
                    oGiornoDate.setVisible(false);
                    oLOreLavoro.setVisible(false);
                    oOreLavoro.setVisible(false);
                    oWbsType.setValue("");
                    oWbsType.setSelectedItem("");
                    oWbsType.setSelectedKey("");
                    oWorkdateRaw = new Date(oEvent.Workdate.getFullYear(), oEvent.Workdate.getMonth(), oEvent.Workdate.getDate());
                    oWorkdate = DateFormat.getDateTimeInstance({ style: "short" }).format(oWorkdateRaw).substring(0, 8);
                    oSPCStartDate = new Date(oWorkdateRaw);
                    oSPCStartDate.setHours(this.msToTime(oEvent.Beguz.ms).split(":")[0]);
                    oSPCStartDate.setMinutes(this.msToTime(oEvent.Beguz.ms).split(":")[1]);
                    oSPCStartDate.setSeconds(this.msToTime(oEvent.Beguz.ms).split(":")[2].substring(0, 2));
                    oStartDateControl = this.dateToString(oSPCStartDate);
                    oSPCEndDate = new Date(oWorkdateRaw);
                    oSPCEndDate.setHours(this.msToTime(oEvent.Enduz.ms).split(":")[0]);
                    oSPCEndDate.setMinutes(this.msToTime(oEvent.Enduz.ms).split(":")[1]);
                    oSPCEndDate.setSeconds(this.msToTime(oEvent.Enduz.ms).split(":")[2].substring(0, 2));
                    oEndDateControl = this.dateToString(oSPCEndDate);
                    oGiornoDate.setValue(oWorkdate);
                    oStartDate.setValue(oStartDateControl);
                    oEndDate.setValue(oEndDateControl);
                    oOreLavoro.setValue(oEvent.Catshours);
                } else {
                    oWbsType.setEditable(true);
                    oStartDate.setVisible(false);
                    oLstartDateText.setVisible(false);
                    oEndDate.setVisible(false);
                    oLendDateText.setVisible(false);
                    oLgiornoDate.setVisible(true);
                    oGiornoDate.setVisible(true);
                    oLOreLavoro.setVisible(true);
                    oOreLavoro.setVisible(true);
                    oWbsType.setValue(oEvent.Post1);
                    oWbsType.setSelectedItem(oEvent.Rproj);
                    oWbsType.setSelectedKey(oEvent.Rproj);
                    oWorkdateRaw = new Date(oEvent.Workdate.getFullYear(), oEvent.Workdate.getMonth(), oEvent.Workdate.getDate());
                    oWorkdate = DateFormat.getDateTimeInstance({ style: "short" }).format(oWorkdateRaw).substring(0, 8);
                    oSPCStartDate = new Date();
                    oSPCStartDate.setHours(0);
                    oSPCStartDate.setMinutes(0);
                    oSPCStartDate.setSeconds(0);
                    oStartDateControl = this.dateToString(oSPCStartDate);
                    oSPCEndDate = new Date();
                    oSPCEndDate.setHours(0);
                    oSPCEndDate.setMinutes(0);
                    oSPCEndDate.setSeconds(0);
                    oEndDateControl = this.dateToString(oSPCEndDate);
                    oGiornoDate.setValue(oWorkdate);
                    oStartDate.setValue(oStartDateControl);
                    oEndDate.setValue(oEndDateControl);
                    oOreLavoro.setValue(oEvent.Catshours);
                }
            },
            handleChangeSelectActivityModifica: function () {
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService");
                var oModel = this.getOwnerComponent().getModel("mainService");
                var oKeyModel = this.getOwnerComponent().getModel("keyModel");
                var oPersonUname = oKeyModel.getData().user;
                var oCounter = oKeyModel.getData().key;
                var aPersons = oJsonModel.getProperty("/people"),
                    oUser = oJsonModel.getProperty("/people/" + aPersons.findIndex(obj => obj.key==oPersonUname));
                var sUserEventPath = "UserEventSet(Uname='" + oUser.key + "',Pernr='" + oUser.key2 + "',Counter='" + oCounter + "')";
                var oEvent = oModel.oData[sUserEventPath];
                var oAppType = this.getView().byId("modActType");
                var oWbsType = this.byId("modWbsType");
                if (oAppType)
                    var sPath = oAppType.getSelectedItem().mBindingInfos.key.binding.oContext.sPath;
                var oModel = this.getOwnerComponent().getModel("mainService");
                var oRow = oModel.getProperty(sPath);
                //Controllo tipo attività: se l'attività è di tipo assenza, il campo WBS non può essere valorizzato e va disattivato:
                if (oRow.Tasklevel == "ASS001") {
                    oWbsType.setValue("");
                    oWbsType.setSelectedItem("");
                    oWbsType.setSelectedKey("");
                    oWbsType.setEditable(false);
                } else {
                    oWbsType.setValue(oEvent.Post1);
                    oWbsType.setSelectedItem(oEvent.Rproj);
                    oWbsType.setSelectedKey(oEvent.Rproj);
                    oWbsType.setEditable(true);
                }
                if (oRow.FlgInputNumOre === 'X') {
                    this.getView().byId("lModStartDate").setVisible(false);
                    this.getView().byId("modStartDate").setVisible(false);
                    this.getView().byId("lModEndDate").setVisible(false);
                    this.getView().byId("modEndDate").setVisible(false);
                    this.getView().byId("lModGiornoDate").setVisible(true);
                    this.getView().byId("modGiornoDate").setVisible(true);
                    this.getView().byId("lModOreLavorate").setVisible(true);
                    this.getView().byId("modOreLavorate").setVisible(true);
                    var oSPCStartDate = this.getView().byId("planCaleTeam").getStartDate();
                    var oStartDate = DateFormat.getDateInstance({ style: "medium" }).format(oSPCStartDate);
                    this.getView().byId("modGiornoDate").setValue(oStartDate);
                } else {
                    this.getView().byId("lModStartDate").setVisible(true);
                    this.getView().byId("modStartDate").setVisible(true);
                    this.getView().byId("lModEndDate").setVisible(true);
                    this.getView().byId("modEndDate").setVisible(true);
                    this.getView().byId("lModGiornoDate").setVisible(false);
                    this.getView().byId("modGiornoDate").setVisible(false);
                    this.getView().byId("lModOreLavorate").setVisible(false);
                    this.getView().byId("modOreLavorate").setVisible(false);
                    oSPCStartDate = this.getView().byId("planCaleTeam").getStartDate();
                    oStartDate = DateFormat.getDateTimeInstance({ style: "medium" }).format(oSPCStartDate);
                    this.getView().byId("modStartDate").setValue(oStartDate);
                    this.getView().byId("modEndDate").setValue(oStartDate);
                }
                this.onChangeInputValuesModifica();
            },
            handleDialogModificaSaveButton: function () {
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oActivity = this.byId("modActType"),
                    sActivityValue = "",
                    oWbs = this.byId("modWbsType"),
                    sWbsValue = "",
                    oStartDate = this.byId("modStartDate"),
                    oEndDate = this.byId("modEndDate"),
                    oModGiornoDate = this.byId("modGiornoDate"),
                    oModel = this.getOwnerComponent().getModel("mainService"),
                    oKeyModel = this.getOwnerComponent().getModel("keyModel"),
                    oNewAppointmentDialog = this.byId("modificaDialogManager"),
                    oNewAppointment;
                //get selected row key 
                var oPersonUname = oKeyModel.getData().user,
                    aPersons = oJsonModel.getProperty("/people"),
                    oUser = oJsonModel.getProperty("/people/" + aPersons.findIndex(obj => obj.key==oPersonUname));
                if (oEndDate.getDateValue() === null) {
                    oEndDate.setDateValue(oStartDate.getDateValue())
                };
                if (oStartDate.getValueState() !== ValueState.Error && oEndDate.getValueState() !== ValueState.Error) {
                    var oOreLavorate = this.getView().byId("modOreLavorate").getValue();
                    if (!(oOreLavorate > 0)) {
                        var dataInizio = oStartDate.getDateValue();
                        var dataFine = oEndDate.getDateValue();
                    } else {
                        dataInizio = oModGiornoDate.getDateValue();
                        dataFine = oModGiornoDate.getDateValue();
                    };
                    if (oActivity.getSelectedItem()) {
                        sActivityValue = oActivity.getSelectedItem().mProperties.text;
                    }
                    if (oWbs.getSelectedItem()) {
                        sWbsValue = oWbs.getSelectedItem().mProperties.text;
                    }
                    oNewAppointment = {
                        key: "",
                        title: sWbsValue,
                        text: sActivityValue,
                        description: this.byId("modAppTitle").getValue(),
                        longDescription: this.byId("modMoreInfo").getValue(),
                        startDate: dataInizio,
                        endDate: dataFine,
                        icon: "sap-icon://activity-2",
                        selected: false,
                        tentative: false,
                        type: "",
                        user: oUser.key,
                        userPernr: oUser.key2,
                        wbs: this.byId("modWbsType").getSelectedKey(),
                        wbsDescription: sWbsValue
                    };
                    this._addNewAppointmentModifica(oNewAppointment);
                    oModel.updateBindings();
                    oNewAppointmentDialog.close();
                }
            },
            _addNewAppointmentModifica: function (oAppointment) {
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oStartDate = this.byId("modStartDate").getDateValue(),
                    oEndDate = this.byId("modEndDate").getDateValue(),
                    oWorkDate = this.byId("modGiornoDate").getDateValue(),
                    oMainModel = this.getOwnerComponent().getModel("mainService"),
                    oKeyModel = this.getOwnerComponent().getModel("keyModel"),
                    that = this,
                    sPath;
                var formatTime = DateFormat.getDateInstance({
                    pattern: "PTHH'H'mm'M'ss'S'"
                });
                var oAppType = this.getView().byId("modActType");
                var oWbsType = this.getView().byId("modWbsType");
                var oAppTitle = this.getView().byId("modAppTitle");
                var oMoreInfo = this.getView().byId("modMoreInfo");
                var oBeguz,
                    oEnduz;
                var sPath,
                    oRowAct,
                    oRowActValues,
                    oRowWbs,
                    oRowWbsValues;
                if (oAppType.getSelectedItem()) {
                    sPath = oAppType.getSelectedItem().mBindingInfos.key.binding.oContext.sPath;
                    oRowAct = oMainModel.getProperty(sPath);
                    oRowActValues = {
                        Tasktype: oRowAct.Tasktype,
                        Tasklevel: oRowAct.Tasklevel,
                        Tasklevelx: oRowAct.Tasklevelx
                    };
                } else {
                    oRowActValues = {
                        Tasktype: "",
                        Tasklevel: "",
                        Tasklevelx: ""
                    };
                }
                if (oWbsType.getSelectedItem()) {
                    sPath = oWbsType.getSelectedItem().mBindingInfos.key.binding.oContext.sPath;
                    oRowWbs = oMainModel.getProperty(sPath);
                    oRowWbsValues = {
                        Rproj: oRowWbs.Rproj,
                        Posid: oRowWbs.Posid,
                        Post1: oRowWbs.Post1
                    };
                } else {
                    oRowWbsValues = {
                        Rproj: "",
                        Posid: "",
                        Post1: ""
                    };
                }
                if (!oStartDate)
                    oStartDate = oWorkDate;
                if (!oEndDate)
                    oEndDate = oWorkDate;
                var oOreLavorate = this.getView().byId("modOreLavorate").getValue();
                if (oOreLavorate == "") {
                    oBeguz = formatTime.format(oStartDate);
                    oEnduz = formatTime.format(oEndDate);
                } else {
                    var dDummyDate = new Date();
                    dDummyDate.setHours("0");
                    dDummyDate.setMinutes("0");
                    dDummyDate.setSeconds("0");
                    dDummyDate.setMilliseconds("0");
                    oBeguz = oEnduz = formatTime.format(dDummyDate);
                }
                // get selected row key
                var oCounter = oKeyModel.getData().key;
                    oPersonUname = oKeyModel.getData().user,
                    aPersons = oJsonModel.getProperty("/people"),
                    oUser = oJsonModel.getProperty("/people/" + aPersons.findIndex(obj => obj.key==oPersonUname));
                var oData = {
                    "InputUname": oUser.key,
                    "InputPernr": oUser.key2,
                    "InputCounter": oCounter,
                    "InputTsSearchFrom": oStartDate,
                    "InputTsSearchTo": oEndDate,
                    "Uname": oUser.key,
                    "Pernr": oUser.key2,
                    "Counter": oCounter,
                    "Workdate": oWorkDate,
                    "Rproj": oRowWbsValues.Rproj,
                    "Posid": oRowWbsValues.Posid,
                    "Post1": oRowWbsValues.Post1,
                    "Tasktype": oRowActValues.Tasktype,
                    "Tasklevel": oRowActValues.Tasklevel,
                    "Tasklevelx": oRowActValues.Tasklevelx,
                    "Catshours": oOreLavorate,
                    "Beguz": oBeguz,
                    "Enduz": oEnduz,
                    "Ltxa1": oAppTitle.getValue(),
                    "LongText": oMoreInfo.getValue(),
                    "Status": "",
                    "Statusx": "",
                    "TsSearchFrom": oStartDate,
                    "TsSearchTo": oEndDate
                };
                var oModel = this.getOwnerComponent().getModel("mainService");
                //Set core to busy before elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.show();
                oModel.callFunction("/ModificaUserEvent", {
                    method: "GET",
                    urlParameters: oData,
                    success: function (oReturn) {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        if (oReturn.message) {
                            var sMsg = oReturn.ModificaUserEvent.Message;
                            MessageBox.error(sMsg, {
                                title: oI18n.getText("msgError"),
                                styleClass: (!jQuery.support.touch) ? "sapUiSizeCompact" : ""
                            });
                        } else {
                            var oBundle = that.getView().getModel("i18n").getResourceBundle();
                            MessageToast.show(oBundle.getText("msgOkEdited"));
                            that._ricaricaUserEvent();
                        };
                    },
                    error: function (oError) {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        that.showUpdateError(oError);
                    }
                });
            },
            handleDialogModificaCancelButton: function () {
                this.byId("modificaDialogManager").close();
            },
            // Gestione modifica evento fine
            // Gestione creazione evento con button Add Activity ("+") inizio
            onPressBtnTeamAddAppointment: function (oEvent) {
                this._arrangeDialogFragmentCreate();
            },
            _arrangeDialogFragmentCreate: function () {
                //Set core to busy before backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var oView = this.getView();
                if (!this._pNewAppointmentDialog) {
                    this._pNewAppointmentDialog = Fragment.load({
                        id: oView.getId(),
                        name: "zfioritimesheet3.zfioritimesheet3n.view.FragmentCreazioneManager",
                        controller: this
                    }).then(function (oDialog, oEvent) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pNewAppointmentDialog.then(function (oDialog) {
                    this._arrangeDialogCreate(oDialog);
                }.bind(this));
            },
            _arrangeDialogCreate: function (oDialog) {
                var sTempTitle = "",
                    oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oInputUser = this.byId("selectDipName"),
                    oInputActivity = this.byId("actType"),
                    oInputWbs = this.byId("wbsType"),
                    oInputStartDate = this.byId("createStartDate"),
                    oInputEndDate = this.byId("createEndDate"),
                    oInputWorkdate = this.byId("createGiornoDate"),
                    oInputWorkedHours = this.byId("oreLavorate"),
                    oInputShortDescription = this.byId("appTitle"),
                    oInputAdditionalInformation = this.byId("moreInfo");
                //Reset the value state of all input values:
                oInputUser.setValueState(ValueState.None);
                oInputActivity.setValueState(ValueState.None);
                oInputWbs.setValueState(ValueState.None);
                oInputStartDate.setValueState(ValueState.None);
                oInputEndDate.setValueState(ValueState.None);
                oInputWorkdate.setValueState(ValueState.None);
                oInputWorkedHours.setValueState(ValueState.None);
                oInputShortDescription.setValueState(ValueState.None);
                oInputAdditionalInformation.setValueState(ValueState.None);
                this._setCreateAppointmentDialogContentCreate();
                sTempTitle = oI18n.getText("titleCreateAppointmentDialog");
                //this.updateButtonEnabledStateCreate(oDialog);
                oDialog.setTitle(sTempTitle);
                oDialog.open();
                //Set core to not busy after backend data fetching:
                sap.ui.core.BusyIndicator.hide();
            },
            _setCreateAppointmentDialogContentCreate: function () {
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oPlanningCalendar = this.getView().byId("planCaleTeam"),
                    oCurrentSelectedDate,
                    oDateTimePickerStart = this.byId("createStartDate"),
                    oDateTimePickerEnd = this.byId("createEndDate"),
                    oDatePickerGiornoDate = this.byId("createGiornoDate"),
                    oTitleInput = this.byId("appTitle"),
                    oMoreInfoInput = this.byId("moreInfo"),
                    oPersonSelected = this.byId("selectDipName"),
                    oActType = this.byId("actType"),
                    oWbsType = this.byId("wbsType"),
                    sDefaultActivity = "LAV005",
                    sDefaultActivityText = "Lavoro",
                    decOreLavorate,
                    sRoundedOreLavorate,
                    oSPCStartDate,
                    oSPCEndDate,
                    sStartDateFormatted,
                    sEndDateFormatted,
                    oEvento = this.getOwnerComponent().getModel("paramModel"),
                    oDefaultUser = oJsonModel.getProperty("/people/0"),
                    oKey;
                if (oPlanningCalendar._dateNav._start) {
                    oCurrentSelectedDate = oPlanningCalendar._dateNav._start;
                } else {
                    oCurrentSelectedDate = new Date();
                } 
                if (oEvento) {
                    if (oEvento.oData) {
                        oSPCStartDate = oEvento.oData.startDate;
                        oSPCEndDate = oEvento.oData.endDate;
                        sStartDateFormatted = oSPCStartDate.getHours().toString().padStart(2, "0") + ":" + oSPCStartDate.getMinutes().toString().padStart(2, "0");
                        sEndDateFormatted = oSPCEndDate.getHours().toString().padStart(2, "0") + ":" + oSPCEndDate.getMinutes().toString().padStart(2, "0");
                        decOreLavorate = Math.abs(this.timeStringToDecimal(sEndDateFormatted) - this.timeStringToDecimal(sStartDateFormatted));
                        if (decOreLavorate > 0) {
                            sRoundedOreLavorate = this.roundTo2DecimalsString(decOreLavorate);
                        } else {
                            sRoundedOreLavorate = "";
                        }
                        if (oEvento.oData.row) {
                            oPersonSelected.setValue(oEvento.oData.row.mProperties.text);
                            oPersonSelected.setSelectedItem(oEvento.oData.row.mProperties.key);
                            oPersonSelected.setSelectedKey(oEvento.oData.row.mProperties.key);
                            //save selected row key
                            oKey = {
                                "userPernr": oEvento.oData.row.mProperties.key2,
                                "user": oEvento.oData.row.mProperties.key
                            };
                        } else if (oEvento.oData.calendarRow) {
                            oPersonSelected.setValue(oEvento.oData.calendarRow.mProperties.text);
                            oPersonSelected.setSelectedItem(oEvento.oData.calendarRow.mProperties.key);
                            oPersonSelected.setSelectedKey(oEvento.oData.calendarRow.mProperties.key);
                            //save selected row key
                            oKey = {
                                "userPernr": oEvento.oData.calendarRow.mProperties.key2,
                                "user": oEvento.oData.calendarRow.mProperties.key
                            };
                        } else {
                            oPersonSelected.setValue(oDefaultUser.text);
                            oPersonSelected.setSelectedItem(oDefaultUser.key);
                            oPersonSelected.setSelectedKey(oDefaultUser.key);
                            //save selected row key
                            oKey = {
                                "userPernr": oDefaultUser.key2,
                                "user": oDefaultUser.key
                            };
                        }
                        oEvento.setData(null);
                        oEvento.updateBindings(true);
                    } else {
                        oSPCStartDate = oCurrentSelectedDate;
                        oSPCEndDate = oCurrentSelectedDate;
                        sRoundedOreLavorate = "";
                        oPersonSelected.setValue(oDefaultUser.text);
                        oPersonSelected.setSelectedItem(oDefaultUser.key);
                        oPersonSelected.setSelectedKey(oDefaultUser.key);
                        //save selected row key
                        oKey = {
                            "userPernr": oDefaultUser.key2,
                            "user": oDefaultUser.key
                        };
                    }
                } else {
                    oSPCStartDate = oCurrentSelectedDate;
                    oSPCEndDate = oCurrentSelectedDate;
                    sRoundedOreLavorate = "";
                    oPersonSelected.setValue(oDefaultUser.text);
                    oPersonSelected.setSelectedItem(oDefaultUser.key);
                    oPersonSelected.setSelectedKey(oDefaultUser.key);
                    //save selected row key
                    oKey = {
                        "userPernr": oDefaultUser.key2,
                        "user": oDefaultUser.key
                    };
                }
                var oStartDate = new Date(oSPCStartDate),
                    oEndDate = new Date(oSPCEndDate);
                var mKey = new sap.ui.model.json.JSONModel();
                mKey.setData(oKey);
                this.getOwnerComponent().setModel(mKey, "keyModel");
                var oStartDateControl = DateFormat.getDateTimeInstance({ style: "medium" }).format(oStartDate);
                var oEndDateControl = DateFormat.getDateTimeInstance({ style: "medium" }).format(oEndDate);
                var oCre2GiornoDateControl = DateFormat.getDateInstance({ style: "medium" }).format(oStartDate);
                oDateTimePickerStart.setValue(oStartDateControl);
                oDateTimePickerEnd.setValue(oEndDateControl);
                oDatePickerGiornoDate.setValue(oCre2GiornoDateControl);
                oTitleInput.setValue("");
                oMoreInfoInput.setValue("");
                oActType.setValue(sDefaultActivityText);
                oActType.setSelectedItem(sDefaultActivity);
                oActType.setSelectedKey(sDefaultActivity);
                oWbsType.setSelectedKey("");
                oWbsType.setEditable(true);
                this.getView().byId("lCreateStartDate").setVisible(false);
                oDateTimePickerStart.setVisible(false);
                this.getView().byId("lCreateEndDate").setVisible(false);
                oDateTimePickerEnd.setVisible(false);
                this.getView().byId("lGiornoDate").setVisible(true);
                oDatePickerGiornoDate.setVisible(true);
                this.getView().byId("lOreLavorate").setVisible(true);
                this.getView().byId("oreLavorate").setVisible(true);
                this.getView().byId("oreLavorate").setValue(sRoundedOreLavorate);
            },
            handleDialogSaveButtonCreate: function () {
                //Set core to busy before elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var oStartDate = this.byId("createStartDate"),
                    oEndDate = this.byId("createEndDate"),
                    sInfoValue = this.byId("moreInfo").getValue(),
                    sappTitle = this.byId("appTitle").getValue(),
                    oModel = this.getOwnerComponent().getModel("mainService"),
                    oNewAppointmentDialog = this.byId("createDialogManager"),
                    oNewAppointment;
                if (oStartDate.getValueState() !== ValueState.Error
                    && oEndDate.getValueState() !== ValueState.Error) {
                    oNewAppointment = {
                        title: sappTitle,
                        info: sInfoValue,
                        start: oStartDate.getDateValue(),
                        end: oEndDate.getDateValue()
                    };
                    this._addNewAppointmentCreate(oNewAppointment);
                }
                oModel.updateBindings();
                oNewAppointmentDialog.close();
            },
            _addNewAppointmentCreate: function (oAppointment) {
                var that = this,
                    oView = that.getView(),
                    sPath;
                var formatTime = DateFormat.getDateInstance({
                    pattern: "PTHH'H'mm'M'ss'S'"
                });
                var oKeyModel = this.getOwnerComponent().getModel("keyModel");
                var oMainModel = this.getOwnerComponent().getModel("mainService");
                var oEmpty = "";
                var oNull = null;
                var oAppTitle = oView.byId("appTitle");
                var oMoreInfo = oView.byId("moreInfo");
                var oAppType = oView.byId("actType");
                var sPath,
                    oRowAct,
                    oRowWbs;
                sPath = oAppType.getSelectedItem().mBindingInfos.key.binding.oContext.sPath;
                oRowAct = oMainModel.getProperty(sPath);
                var oWbsType = oView.byId("wbsType");
                if (oWbsType.getSelectedItem()) {
                    sPath = oWbsType.getSelectedItem().mBindingInfos.key.binding.oContext.sPath;
                    oRowWbs = oMainModel.getProperty(sPath);
                } else {
                    oRowWbs = {
                        Rproj: "",
                        Posid: "",
                        Post1: ""
                    };
                }
                var oStartDate = oView.byId("createStartDate").getDateValue();
                var oEndDate = oView.byId("createEndDate").getDateValue();
                var oWorkDate = oView.byId("createGiornoDate").getDateValue();
                var oOreLavorate = oView.byId("oreLavorate").getValue();
                var hoursFlag;
                if (oView.byId("oreLavorate").getVisible())
                    hoursFlag = "X";
                if (!hoursFlag) { 
                    oOreLavorate = "0.00";
                    var sData = new Date(oStartDate);
                    sData.setHours(parseInt(oStartDate.getHours()), parseInt(oStartDate.getMinutes()), parseInt(oStartDate.getSeconds()));
                    var oBeguz = formatTime.format(sData);
                    sData = new Date(oEndDate);
                    sData.setHours(parseInt(oEndDate.getHours()), parseInt(oEndDate.getMinutes()), parseInt(oEndDate.getSeconds()));
                    var oEnduz = formatTime.format(sData);
                } else {
                    oBeguz = oNull;
                    oEnduz = oNull;
                };
                if (oEndDate === oNull) {
                    oEndDate = oStartDate;
                };
                var oPersonUname = oKeyModel.getData().user,
                    oPersonPernr = oKeyModel.getData().userPernr,
                    sWorkdateChar = this.dateToYyyyMmDd(oWorkDate);
                var oData = {
                    "InputUname": oEmpty,
                    "InputPernr": oEmpty,
                    "InputCounter": oEmpty,
                    "InputTsSearchFrom": oNull,
                    "InputTsSearchTo": oNull,
                    "Uname": oPersonUname,
                    "Pernr": oPersonPernr,
                    "Counter": "00000000000",
                    "Workdate": oWorkDate,
                    "WorkdateChar": sWorkdateChar,
                    "Rproj": oRowWbs.Rproj,
                    "Posid": oRowWbs.Posid,
                    "Post1": oRowWbs.Post1,
                    "Tasktype": oRowAct.Tasktype,
                    "Tasklevel": oRowAct.Tasklevel,
                    "Tasklevelx": oRowAct.Tasklevelx,
                    "Catshours": oOreLavorate,
                    "Beguz": oBeguz,
                    "Enduz": oEnduz,
                    "Ltxa1": oAppTitle.getValue(),
                    "LongText": oMoreInfo.getValue(),
                    "Status": oEmpty,
                    "Statusx": oEmpty,
                    "TsSearchFrom": oNull,
                    "TsSearchTo": oNull
                };
                var oModel = this.getOwnerComponent().getModel("mainService");
                oModel.create("/UserEventSet", oData, {
                    success: function () {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        var oBundle = oView.getModel("i18n").getResourceBundle();
                        MessageToast.show(oBundle.getText("msgOkInsert"));
                        that._ricaricaUserEvent();
                    },
                    error: function (oError) {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        that.showCreateError(oError);
                    }
                });
            },
            onSelectDipNameChange: function () {
                var oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oKeyModel = this.getOwnerComponent().getModel("keyModel"),
                    sSelectedUname = this.byId("selectDipName").getSelectedKey(),
                    aPersons = oJsonModel.getProperty("/people"),
                    oUser = oJsonModel.getProperty("/people/" + aPersons.findIndex(obj => obj.key==sSelectedUname));
                //save selected row key
                oKey = {
                    "userPernr": oUser.key2,
                    "user": oUser.key
                };
                oKeyModel.setData(null);
                oKeyModel.updateBindings(true);
                var mKey = new sap.ui.model.json.JSONModel();
                mKey.setData(oKey);
                this.getOwnerComponent().setModel(mKey, "keyModel");
                this.onChangeInputValuesCreate();
            },
            _ricaricaUserEvent: function () {
                //UserEventSet:
                var that = this,
                    sModelName = "mainService",
                    sJsonModelName = "jsonManagerService",
                    oModel = this.getOwnerComponent().getModel(sModelName),
                    oJsonModel = this.getOwnerComponent().getModel(sJsonModelName),
                    oKeyModel = this.getOwnerComponent().getModel("keyModel");
                var oPersonUname = oKeyModel.getData().user,
                    aPersons = oJsonModel.getProperty("/people"),
                    oUser = oJsonModel.getProperty("/people/" + aPersons.findIndex(obj => obj.key==oPersonUname));
                var oDateFormatter = DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd",
                    UTC: false
                });
                var dCurrentDate = new Date(),
                    sFormattedSearchFromDate = oDateFormatter.format(new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth() - 1, dCurrentDate.getDate())),
                    sFormattedSearchToDate = oDateFormatter.format(new Date(dCurrentDate.getFullYear(), dCurrentDate.getMonth() + 1, dCurrentDate.getDate())),
                    oUserEventFilter = new Filter({
                        filters: [
                            new Filter({
                                path: "InputUname",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oUser.key
                            }),
                            new Filter({
                                path: "InputPernr",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: oUser.key2
                            }),
                            new Filter({
                                path: "InputTsSearchFrom",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sFormattedSearchFromDate
                            }),
                            new Filter({
                                path: "InputTsSearchTo",
                                operator: sap.ui.model.FilterOperator.EQ,
                                value1: sFormattedSearchToDate
                            })
                        ],
                        and: true
                    }),
                    sUserEventFilter = "";
                sUserEventFilter = oUserEventFilter;
                oModel.read("/UserEventSet", {
                    filters: [sUserEventFilter],
                    success: function (oDataUserEvents) {
                        //Find index of user's appointments on people model:
                        var aPersons = oJsonModel.getProperty("/people"),
                            sPathToPersonAppointments = "/people/" + aPersons.findIndex(obj => obj.key==oUser.key) + "/appointments",
                            aPersonAppointments = oJsonModel.getProperty(sPathToPersonAppointments),
                            oUserEvent,
                            i;
                        aPersonAppointments.splice(0, aPersonAppointments.length);
                        for (i = 0; i < oDataUserEvents.results.length; i++) {
                            if (oDataUserEvents.results[i].Uname === oUser.key) {
                                if (oDataUserEvents.results[i].Tasktype == "AS01")
                                        oDataUserEvents.results[i].Catshours = "0.00";
                                var dEventWorkDate = new Date(oDataUserEvents.results[i].Workdate),
                                    sEventStartDate,
                                    sEventEndDate,
                                    sType;
                                sEventStartDate = that.dateToYyyyMmDd(dEventWorkDate) + "T" + that.msToTime(oDataUserEvents.results[i].Beguz.ms);
                                sEventEndDate = that.dateToYyyyMmDd(dEventWorkDate) + "T" + that.msToTime(oDataUserEvents.results[i].Enduz.ms);
                                switch (oDataUserEvents.results[i].Status) {
                                    case "10": //In elaborazione.
                                        if (oDataUserEvents.results[i].Tasklevel == "LAV005") {
                                            sType = "Type01"
                                        } else {
                                            sType = "Type08"
                                        }
                                        break;
                                    case "20": //Rilasciato per l'autorizzazione.
                                        if (oDataUserEvents.results[i].Tasklevel == "LAV005") {
                                            sType = "Type02"
                                        } else {
                                            sType = "Type09"
                                        }
                                        break;
                                    case "30": //Approvato.
                                        if (oDataUserEvents.results[i].Tasklevel == "LAV005") {
                                            sType = "Type06"
                                        } else {
                                            sType = "Type10"
                                        }
                                        break;
                                    case "40": //Autorizzazione respinta.
                                        if (oDataUserEvents.results[i].Tasklevel == "LAV005") {
                                            sType = "Type03"
                                        } else {
                                            sType = "Type11"
                                        }
                                        break;
                                    case "50": //Modificato dopo l'autorizzazione.
                                        if (oDataUserEvents.results[i].Tasklevel == "LAV005") {
                                            sType = "Type04"
                                        } else {
                                            sType = "Type12"
                                        }
                                        break;
                                    case "60": //Stornato.
                                        if (oDataUserEvents.results[i].Tasklevel == "LAV005") {
                                            sType = "Type05"
                                        } else {
                                            sType = "Type13"
                                        }
                                        break;
                                    default:
                                        sType = "Type07" //Se lo stato è sconosciuto (non indicato), viene impostato un colore diverso da tutti gli altri.
                                }
                                oUserEvent = {
                                    key: oDataUserEvents.results[i].Counter,
                                    title: oDataUserEvents.results[i].Post1,
                                    text: oDataUserEvents.results[i].Tasklevelx,
                                    description: oDataUserEvents.results[i].Ltxa1,
                                    longDescription: oDataUserEvents.results[i].LongText,
                                    startDate: sEventStartDate,
                                    endDate: sEventEndDate,
                                    icon: "sap-icon://activity-2",
                                    selected: false,
                                    tentative: false,
                                    type: sType,
                                    user: oDataUserEvents.results[i].Uname,
                                    userPernr: oDataUserEvents.results[i].Pernr,
                                    wbs: oDataUserEvents.results[i].Posid,
                                    wbsDescription: oDataUserEvents.results[i].Post1
                                };
                                aPersonAppointments.push(oUserEvent);
                            }
                        }
                        if (oJsonModel.setProperty(sPathToPersonAppointments, aPersonAppointments)) {
                            oJsonModel.refresh();
                            //Set core to not busy after elements rendering and backend data fetching:
                            sap.ui.core.BusyIndicator.hide();
                        }
                    },
                    error: function (oError) {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        that.showUnknownError(oError);
                    }
                });
            },
            handleDialogCancelButtonCreate: function () {
                this.byId("createDialogManager").close();
            },
            handleChangeSelectActivityCreate: function () {
                var sPath;
                var oAppType = this.getView().byId("actType");
                if (oAppType)
                    sPath = oAppType.getSelectedItem().mBindingInfos.key.binding.oContext.sPath;
                var oWbsType = this.byId("wbsType");
                var oJsonModel = this.getOwnerComponent().getModel("mainService");
                var oRow = oJsonModel.getProperty(sPath);
                //Controllo tipo attività: se l'attività è di tipo assenza, il campo WBS non può essere valorizzato e va disattivato:
                if (oRow.Tasklevel == "ASS001") {
                    oWbsType.setValue("");
                    oWbsType.setSelectedItem("");
                    oWbsType.setSelectedKey("");
                    oWbsType.setEditable(false);
                } else {
                    oWbsType.setEditable(true);
                }
                if (oRow.FlgInputNumOre === 'X') {
                    this.getView().byId("lCreateStartDate").setVisible(false);
                    this.getView().byId("createStartDate").setVisible(false);
                    this.getView().byId("lCreateEndDate").setVisible(false);
                    this.getView().byId("createEndDate").setVisible(false);
                    this.getView().byId("lGiornoDate").setVisible(true);
                    this.getView().byId("createGiornoDate").setVisible(true);
                    this.getView().byId("lOreLavorate").setVisible(true);
                    this.getView().byId("oreLavorate").setVisible(true);
                } else {
                    this.getView().byId("lCreateStartDate").setVisible(true);
                    this.getView().byId("createStartDate").setVisible(true);
                    this.getView().byId("lCreateEndDate").setVisible(true);
                    this.getView().byId("createEndDate").setVisible(true);
                    this.getView().byId("lGiornoDate").setVisible(false);
                    this.getView().byId("createGiornoDate").setVisible(false);
                    this.getView().byId("lOreLavorate").setVisible(false);
                    this.getView().byId("oreLavorate").setVisible(false);
                }
                this.onChangeInputValuesCreate();
            },
            // Gestione creazione evento con button Add Activity ("+") fine
            // Gestione input validation in tempo reale per form di creazione e modifica inizio
            validateStartEndDateTimePickerCreate: function (oInputStartDate, oInputEndDate) {
				var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oStartDate = oInputStartDate.getDateValue(),
                    oEndDate = oInputEndDate.getDateValue(),
					sValueStateText = oI18n.getText("validationErrorTextStartEndDateTimePicker");
                if (oStartDate && oEndDate && oEndDate.getTime() <= oStartDate.getTime()) {
                    oInputStartDate.setValueState(coreLibrary.ValueState.Error);
                    oInputEndDate.setValueState(coreLibrary.ValueState.Error);
                    oInputStartDate.setValueStateText(sValueStateText);
                    oInputEndDate.setValueStateText(sValueStateText);
                } else {
                    oInputStartDate.setValueState(coreLibrary.ValueState.None);
                    oInputEndDate.setValueState(coreLibrary.ValueState.None);
                }
			},
            onChangeStartEndDateInputValuesCreate: function (oEvent) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oInputStartDate = this.byId("createStartDate"),
                    oInputEndDate = this.byId("createEndDate"),
                    oInputWorkedHours = this.byId("oreLavorate"),
                    flagHours = oInputWorkedHours.getVisible() ? "X" : "";
                if (!flagHours) {
                    if (oEvent.getParameter("valid")) {
                        this.validateStartEndDateTimePickerCreate(oInputStartDate, oInputEndDate);
                    } else {
                        oEvent.getSource().setValueState(coreLibrary.ValueState.Error);
                        oEvent.getSource().setValueStateText(oI18n.getText("validationErrorTextInvalidStartEndDateTimePicker"));
                    }
                    this.updateButtonEnabledStateAfterInputValidationCreate(this.byId("createDialogManager"), flagHours);
                }
            },
            onChangeInputValuesCreate: function () {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oInputUser = this.byId("selectDipName"),
                    oInputActivity = this.byId("actType"),
                    oInputWbs = this.byId("wbsType"),
                    oInputWorkdate = this.byId("createGiornoDate"),
                    oInputWorkedHours = this.byId("oreLavorate"),
                    oInputShortDescription = this.byId("appTitle"),
                    oInputAdditionalInformation = this.byId("moreInfo"),
                    flagHours = oInputWorkedHours.getVisible() ? "X" : "";
                //Input user:
                if (!oInputUser.getSelectedKey()) {
                    oInputUser.setValueState(ValueState.Error);
                    oInputUser.setValueStateText(oI18n.getText("validationErrorTextEmtpyUser"));
                } else {
                    //Input is valid.
                    oInputUser.setValueState(ValueState.None);
                }
                //Input activity:
                if (!oInputActivity.getSelectedKey()) {
                    oInputActivity.setValueState(ValueState.Error);
                    oInputActivity.setValueStateText(oI18n.getText("validationErrorTextEmtpyActivity"));
                } else {
                    //Input is valid.
                    oInputActivity.setValueState(ValueState.None);
                }
                if (flagHours) {
                    //Input WBS:
                    if (!oInputWbs.getSelectedKey()) {
                        oInputWbs.setValueState(ValueState.Error);
                        oInputWbs.setValueStateText(oI18n.getText("validationErrorTextEmtpyWbs"));
                    } else {
                        //Input is valid.
                        oInputWbs.setValueState(ValueState.None);
                    }
                    //Input worked hours:
                    if (!oInputWorkedHours.getValue().toString().replace(/\s+/g,"")) {
                        oInputWorkedHours.setValueState(ValueState.Error);
                        oInputWorkedHours.setValueStateText(oI18n.getText("validationErrorTextEmptyWorkedHours"));
                    } else if (!(parseFloat(oInputWorkedHours.getValue()) > 0)) {
                        oInputWorkedHours.setValueState(ValueState.Error);
                        oInputWorkedHours.setValueStateText(oI18n.getText("validationErrorTextInvalidWorkedHours"));
                    } else if (parseFloat(oInputWorkedHours.getValue()) > 23.99) {
                        oInputWorkedHours.setValueState(ValueState.Error);
                        oInputWorkedHours.setValueStateText(oI18n.getText("validationErrorTextLongerWorkedHours"));
                    } else {
                        //Input is valid.
                        oInputWorkedHours.setValueState(ValueState.None);
                    }
                    //Input workdate:
                    if (!oInputWorkdate.getValue().replace(/\s+/g,"")) {
                        oInputWorkdate.setValueState(ValueState.Error);
                        oInputWorkdate.setValueStateText(oI18n.getText("validationErrorTextEmtpyWorkdate"));
                    } else if (!oInputWorkdate._bValid) {
                        oInputWorkdate.setValueState(ValueState.Error);
                        oInputWorkdate.setValueStateText(oI18n.getText("validationErrorTextInvalidWorkdate"));
                    } else {
                        //Input is valid.
                        oInputWorkdate.setValueState(ValueState.None);
                    }                    
                }
                //Input short description:
                if (oInputShortDescription.getValue().length > 40) {
                    oInputShortDescription.setValueState(ValueState.Error);
                    oInputShortDescription.setValueStateText(oI18n.getText("validationErrorTextLongerShortDescription"));
                } else {
                    //Input is valid.
                    oInputShortDescription.setValueState(ValueState.None);
                }
                //Input additional information:
                if (oInputAdditionalInformation.getValue().length > 132) {
                    oInputAdditionalInformation.setValueState(ValueState.Error);
                    oInputAdditionalInformation.setValueStateText(oI18n.getText("validationErrorTextLongerAdditionalInformation"));
                } else {
                    //Input is valid.
                    oInputAdditionalInformation.setValueState(ValueState.None);
                }
                this.updateButtonEnabledStateAfterInputValidationCreate(this.byId("createDialogManager"), flagHours);
            },
            updateButtonEnabledStateAfterInputValidationCreate: function (oDialog, flagHours) {
                var oInputUser = this.byId("selectDipName"),
                    oInputActivity = this.byId("actType"),
                    oInputWbs = this.byId("wbsType"),
                    oInputStartDate = this.byId("createStartDate"),
                    oInputEndDate = this.byId("createEndDate"),
                    oInputWorkdate = this.byId("createGiornoDate"),
                    oInputWorkedHours = this.byId("oreLavorate"),
                    oInputShortDescription = this.byId("appTitle"),
                    oInputAdditionalInformation = this.byId("moreInfo"),
                    bEnabled;
                if (flagHours) {
                    bEnabled = oInputUser.getValueState() !== ValueState.Error
                        && oInputActivity.getValueState() !== ValueState.Error
                        && oInputWbs.getValueState() !== ValueState.Error
                        && oInputWorkdate.getValueState() !== ValueState.Error
                        && oInputWorkedHours.getValueState() !== ValueState.Error
                        && oInputShortDescription.getValueState() !== ValueState.Error
                        && oInputAdditionalInformation.getValueState() !== ValueState.Error;
                } else {
                    bEnabled = oInputUser.getValueState() !== ValueState.Error
                        && oInputActivity.getValueState() !== ValueState.Error
                        && oInputStartDate.getValueState() !== ValueState.Error
                        && oInputEndDate.getValueState() !== ValueState.Error
                        && oInputShortDescription.getValueState() !== ValueState.Error
                        && oInputAdditionalInformation.getValueState() !== ValueState.Error;
                }
                oDialog.getBeginButton().setEnabled(bEnabled);
            },
            onChangeStartEndDateInputValuesModifica: function (oEvent) {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oInputStartDate = this.byId("modStartDate"),
                    oInputEndDate = this.byId("modEndDate"),
                    oInputWorkedHours = this.byId("modOreLavorate"),
                    flagHours = oInputWorkedHours.getVisible() ? "X" : "";
                if (!flagHours) {
                    if (oEvent.getParameter("valid")) {
                        this.validateStartEndDateTimePickerCreate(oInputStartDate, oInputEndDate);
                    } else {
                        oEvent.getSource().setValueState(coreLibrary.ValueState.Error);
                        oEvent.getSource().setValueStateText(oI18n.getText("validationErrorTextInvalidStartEndDateTimePicker"));
                    }
                    this.updateButtonEnabledStateAfterInputValidationModifica(this.byId("modificaDialogManager"), flagHours);
                }
            },
            onChangeInputValuesModifica: function () {
                var oI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle(),
                    oInputActivity = this.byId("modActType"),
                    oInputWbs = this.byId("modWbsType"),
                    oInputWorkedHours = this.byId("modOreLavorate"),
                    oInputShortDescription = this.byId("modAppTitle"),
                    oInputAdditionalInformation = this.byId("modMoreInfo"),
                    flagHours = oInputWorkedHours.getVisible() ? "X" : "";
                //Input activity:
                if (!oInputActivity.getSelectedKey()) {
                    oInputActivity.setValueState(ValueState.Error);
                    oInputActivity.setValueStateText(oI18n.getText("validationErrorTextEmtpyActivity"));
                } else {
                    //Input is valid.
                    oInputActivity.setValueState(ValueState.None);
                }
                if (flagHours) {
                    //Input WBS:
                    if (!oInputWbs.getSelectedKey()) {
                        oInputWbs.setValueState(ValueState.Error);
                        oInputWbs.setValueStateText(oI18n.getText("validationErrorTextEmtpyWbs"));
                    } else {
                        //Input is valid.
                        oInputWbs.setValueState(ValueState.None);
                    }
                    //Input worked hours:
                    if (!oInputWorkedHours.getValue().toString().replace(/\s+/g,"")) {
                        oInputWorkedHours.setValueState(ValueState.Error);
                        oInputWorkedHours.setValueStateText(oI18n.getText("validationErrorTextEmptyWorkedHours"));
                    } else if (!(parseFloat(oInputWorkedHours.getValue()) > 0)) {
                        oInputWorkedHours.setValueState(ValueState.Error);
                        oInputWorkedHours.setValueStateText(oI18n.getText("validationErrorTextInvalidWorkedHours"));
                    } else if (parseFloat(oInputWorkedHours.getValue()) > 23.99) {
                        oInputWorkedHours.setValueState(ValueState.Error);
                        oInputWorkedHours.setValueStateText(oI18n.getText("validationErrorTextLongerWorkedHours"));
                    } else {
                        //Input is valid.
                        oInputWorkedHours.setValueState(ValueState.None);
                    }                  
                }
                //Input short description:
                if (oInputShortDescription.getValue().length > 40) {
                    oInputShortDescription.setValueState(ValueState.Error);
                    oInputShortDescription.setValueStateText(oI18n.getText("validationErrorTextLongerShortDescription"));
                } else {
                    //Input is valid.
                    oInputShortDescription.setValueState(ValueState.None);
                }
                //Input additional information:
                if (oInputAdditionalInformation.getValue().length > 132) {
                    oInputAdditionalInformation.setValueState(ValueState.Error);
                    oInputAdditionalInformation.setValueStateText(oI18n.getText("validationErrorTextLongerAdditionalInformation"));
                } else {
                    //Input is valid.
                    oInputAdditionalInformation.setValueState(ValueState.None);
                }
                this.updateButtonEnabledStateAfterInputValidationModifica(this.byId("modificaDialogManager"), flagHours);
            },
            updateButtonEnabledStateAfterInputValidationModifica: function (oDialog, flagHours) {
                var oInputActivity = this.byId("modActType"),
                    oInputWbs = this.byId("modWbsType"),
                    oInputStartDate = this.byId("modStartDate"),
                    oInputEndDate = this.byId("modEndDate"),
                    oInputWorkedHours = this.byId("modOreLavorate"),
                    oInputShortDescription = this.byId("modAppTitle"),
                    oInputAdditionalInformation = this.byId("modMoreInfo"),
                    bEnabled;
                if (flagHours) {
                    bEnabled = oInputActivity.getValueState() !== ValueState.Error
                        && oInputWbs.getValueState() !== ValueState.Error
                        && oInputWorkedHours.getValueState() !== ValueState.Error
                        && oInputShortDescription.getValueState() !== ValueState.Error
                        && oInputAdditionalInformation.getValueState() !== ValueState.Error;
                } else {
                    bEnabled = oInputActivity.getValueState() !== ValueState.Error
                        && oInputStartDate.getValueState() !== ValueState.Error
                        && oInputEndDate.getValueState() !== ValueState.Error
                        && oInputShortDescription.getValueState() !== ValueState.Error
                        && oInputAdditionalInformation.getValueState() !== ValueState.Error;
                }
                oDialog.getBeginButton().setEnabled(bEnabled);
            },
            // Gestione input validation in tempo reale per form di creazione e modifica fine
            // Gestione azioni creazione da orario, drag and drop, resize e spostamento inizio
            handleTeamAppointmentAddWithContext: function (oEvent) {
                var oEventParameters = oEvent.getParameters(),
                    oParam = new sap.ui.model.json.JSONModel(),
                    oEndDate = new Date(oEventParameters.endDate);
                //Add 1 second to the end date to set the total interval to an hour:
                oEventParameters.endDate = new Date(oEndDate.getTime() + 1000);
                this.oClickEventParameters = oEventParameters;
                oParam.setData(oEventParameters);
                this.getOwnerComponent().setModel(oParam, "paramModel");
                this._arrangeDialogFragmentCreate();
            },
            onPlanCaleTeamCreate: function (oEvent) {
                var oParam = new sap.ui.model.json.JSONModel();
                oParam.setData(oEvent.getParameters());
                this.getOwnerComponent().setModel(oParam, "paramModel");
                this.onPressBtnTeamAddAppointment(oEvent);
            },
            onPlanCaleTeamDragEnter: function (oEvent) {
                //Drag selection on view handler:
                var mKey = new sap.ui.model.json.JSONModel();
                var oKey = {
                    "counter": oEvent.mParameters.appointment.mProperties.key,
                    "user": oEvent.oSource.mProperties.key
                };
                mKey.setData(oKey);
                this.getOwnerComponent().setModel(mKey, "keyModel");
                if (this.isAppointmentOverlap(oEvent, oEvent.getParameter("calendarRow"))) {
                    oEvent.preventDefault();
                }
            },
            isAppointmentOverlap: function (oEvent, oCalendarRow) {
                var oAppointment = oEvent.getParameter("appointment"),
                    oStartDate = oEvent.getParameter("startDate"),
                    oEndDate = oEvent.getParameter("endDate"),
                    bAppointmentOverlapped;
                bAppointmentOverlapped = oCalendarRow.getAppointments().some(function (oCurrentAppointment) {
                    if (oCurrentAppointment === oAppointment) {
                        return;
                    }
                    var oAppStartTime = oCurrentAppointment.getStartDate().getTime(),
                        oAppEndTime = oCurrentAppointment.getEndDate().getTime();
                    if (oAppStartTime <= oStartDate.getTime() && oStartDate.getTime() < oAppEndTime) {
                        return true;
                    }
                    if (oAppStartTime < oEndDate.getTime() && oEndDate.getTime() <= oAppEndTime) {
                        return true;
                    }
                    if (oStartDate.getTime() <= oAppStartTime && oAppStartTime < oEndDate.getTime()) {
                        return true;
                    }
                });
                return bAppointmentOverlapped;
            },
            /* Gestione per spostamento eventi - Non utilizzato
            onPlanCaleTeamDrop: function (oEvent) {
                //Set core to busy before elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var oAppointment = oEvent.getParameter("appointment"),
                    oStartDate = oEvent.getParameter("startDate"),
                    oEndDate = oEvent.getParameter("endDate"),
                    sTitle = oAppointment.getTitle(),
                    sInfoValue = oAppointment.getText();
                var oNewAppointment = {
                    title: sTitle,
                    info: sInfoValue,
                    start: oStartDate,
                    end: oEndDate
                };
                this._addNewAppointmentDropModifica(oNewAppointment, oEvent);
            },
            _addNewAppointmentDropModifica: function (oAppointment, oEvent) {
                var oStartDate = oEvent.getParameter("startDate"),
                    oEndDate = oEvent.getParameter("endDate"),
                    oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oModel = this.getOwnerComponent().getModel("mainService"),
                    that = this,
                    i = 0,
                    j = 0,
                    sPath,
                    oPersonAppointments;
                var formatTime = DateFormat.getDateInstance({
                    pattern: "PTHH'H'mm'M'ss'S'"
                });
                var sPath;
                if (oAppointment.mBindingInfos === undefined) {
                    oAppointmentPath = oEvent.getParameter("appointment");
                    sPath = oAppointmentPath.mBindingInfos.key.binding.oContext.sPath;
                } else {
                    sPath = oAppointment.mBindingInfos.key.binding.oContext.sPath;
                };
                var oKey = oJsonModel.getProperty(sPath);
                var sUserEventPath = "UserEventSet(Uname='" + oEvent.oSource.getKey() + "',Pernr='" + oKey.userPernr + "',Counter='" + oEvent.getParameters().appointment.getProperty("key") + "')";
                var oEventData = oModel.oData[sUserEventPath];
                if (oEventData.Status !== "10") {
                    //Set core to not busy after elements rendering and backend data fetching:
                    sap.ui.core.BusyIndicator.hide();
                    that.showErrorNotEditable();
                    return false;
                }
                var sData = new Date(oStartDate);
                sData.setHours(parseInt(oStartDate.getHours()), parseInt(oStartDate.getMinutes()), parseInt(oStartDate.getSeconds()));
                var oBeguz = formatTime.format(sData);
                sData = new Date(oEndDate);
                sData.setHours(parseInt(oEndDate.getHours()), parseInt(oEndDate.getMinutes()), parseInt(oEndDate.getSeconds()));
                var oEnduz = formatTime.format(sData);
                if (oEndDate === null) {
                    oEndDate.setDateValue(oStartDate)
                };
                var oWorkDate = oStartDate;
                var oData = {
                    "InputUname": oEventData.InputUname,
                    "InputPernr": oEventData.InputPernr,
                    "InputCounter": oEventData.InputCounter,
                    "InputTsSearchFrom": oStartDate,
                    "InputTsSearchTo": oEndDate,
                    "Uname": oEventData.Uname,
                    "Pernr": oEventData.Pernr,
                    "Counter": oEventData.Counter,
                    "Workdate": oWorkDate,
                    "Rproj": oEventData.Rproj,
                    "Posid": oEventData.Posid,
                    "Post1": oEventData.Post1,
                    "Tasktype": oEventData.Tasktype,
                    "Tasklevel": oEventData.Tasklevel,
                    "Tasklevelx": oEventData.Tasklevelx,
                    "Catshours": oEventData.Catshours,
                    "Beguz": oBeguz,
                    "Enduz": oEnduz,
                    "Ltxa1": oEventData.Ltxa1,
                    "LongText": oEventData.LongText,
                    "Status": oEventData.Status,
                    "Statusx": oEventData.Statusx,
                    "TsSearchFrom": oStartDate,
                    "TsSearchTo": oEndDate
                };
                oModel.callFunction("/ModificaUserEvent", {
                    method: "GET",
                    urlParameters: oData,
                    success: function (oReturn) {
                        if (oReturn.message) {
                            var sMsg = oReturn.ModificaUserEvent.Message;
                            MessageBox.error(sMsg, {
                                title: oMess.getText("msgError"),
                                styleClass: (!jQuery.support.touch) ? "sapUiSizeCompact" : ""
                            });
                        } else {
                            var oJsonModel = that.getOwnerComponent().getModel("jsonManagerService");
                            oJsonModel.getProperty("/people/").forEach(function (oRiga) {
                                //if (oRiga.key === that.getView().byId("selectModName").getValue().toString()) {
                                    sPath = "/people/" + i.toString();
                                    sPath += "/appointments";
                                    oPersonAppointments = oJsonModel.getProperty(sPath);
                                    oPersonAppointments.forEach(function (oAppoint) {
                                        if (oAppoint.key === oEventData.Counter) {
                                            oPersonAppointments.splice(j, 1);
                                        }
                                        j = j + 1;
                                    })
                                    oPersonAppointments.push(oAppointment);
                                //}
                                i = i + 1;
                            });
                            //refresh forzato dei dati
                            that._ricaricaUserEvent();
                        };
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                    },
                    error: function (oError) {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        that.showUpdateError(oError);
                    }
                });
            },
            */
            onPlanCaleTeamResize: function (oEvent) {
                //Set core to busy before elements rendering and backend data fetching:
                sap.ui.core.BusyIndicator.show();
                var oAppointment = oEvent.getParameter("appointment"),
                    mKey = new sap.ui.model.json.JSONModel();
                    oKey = {
                        "counter": oEvent.mParameters.appointment.mProperties.key,
                        "user": oEvent.oSource.mProperties.key
                    };
                mKey.setData(oKey);
                this.getOwnerComponent().setModel(mKey, "keyModel");
                this._appointmentResize(oAppointment, oEvent);
            },
            _appointmentResize: function (oAppointment, oEvent) {
                var oStartDate = oEvent.getParameter("startDate"),
                    oEndDate = oEvent.getParameter("endDate"),
                    oJsonModel = this.getOwnerComponent().getModel("jsonManagerService"),
                    oModel = this.getOwnerComponent().getModel("mainService"),
                    that = this,
                    sPath,
                    formatTime = DateFormat.getDateInstance({
                        pattern: "PTHH'H'mm'M'ss'S'"
                    });
                if (oAppointment.mBindingInfos === undefined) {
                    oAppointmentPath = oEvent.getParameter("appointment");
                    var sPath = oAppointmentPath.mBindingInfos.key.binding.oContext.sPath;
                } else {
                    sPath = oAppointment.mBindingInfos.key.binding.oContext.sPath;
                };
                var oKey = oJsonModel.getProperty(sPath);
                var sUserEventPath = "UserEventSet(Uname='" + oEvent.oSource.getKey() + "',Pernr='" + oKey.userPernr + "',Counter='" + oEvent.getParameters().appointment.getProperty("key") + "')";
                var oEventData = oModel.oData[sUserEventPath];
                if (oEventData.Status !== "10") {
                    //Set core to not busy after elements rendering and backend data fetching:
                    sap.ui.core.BusyIndicator.hide();
                    that.showErrorNotEditable();
                    return false;
                }
                var sData = new Date(oStartDate);
                sData.setHours(parseInt(oStartDate.getHours()), parseInt(oStartDate.getMinutes()), parseInt(oStartDate.getSeconds()));
                var oBeguz = formatTime.format(sData);
                sData = new Date(oEndDate);
                sData.setHours(parseInt(oEndDate.getHours()), parseInt(oEndDate.getMinutes()), parseInt(oEndDate.getSeconds()));
                var oEnduz = formatTime.format(sData);
                if (oEndDate === null) {
                    oEndDate.setDateValue(oStartDate)
                };
                var oWorkDate = oStartDate;
                var sStartDateFormatted = oStartDate.getHours().toString().padStart(2, "0") + ":" + oStartDate.getMinutes().toString().padStart(2, "0");
                var sEndDateFormatted= oEndDate.getHours().toString().padStart(2, "0") + ":" + oEndDate.getMinutes().toString().padStart(2, "0");
                var decEventTotHours = Math.abs(this.timeStringToDecimal(sEndDateFormatted) - this.timeStringToDecimal(sStartDateFormatted));
                var sRoundedOreLavorate = this.roundTo2DecimalsString(decEventTotHours);
                var oData = {
                    "InputUname": oEventData.InputUname,
                    "InputPernr": oEventData.InputPernr,
                    "InputCounter": oEventData.InputCounter,
                    "InputTsSearchFrom": oStartDate,
                    "InputTsSearchTo": oEndDate,
                    "Uname": oEventData.Uname,
                    "Pernr": oEventData.Pernr,
                    "Counter": oEventData.Counter,
                    "Workdate": oWorkDate,
                    "Rproj": oEventData.Rproj,
                    "Posid": oEventData.Posid,
                    "Post1": oEventData.Post1,
                    "Tasktype": oEventData.Tasktype,
                    "Tasklevel": oEventData.Tasklevel,
                    "Tasklevelx": oEventData.Tasklevelx,
                    "Catshours": sRoundedOreLavorate,
                    "Beguz": oBeguz,
                    "Enduz": oEnduz,
                    "Ltxa1": oEventData.Ltxa1,
                    "LongText": oEventData.LongText,
                    "Status": oEventData.Status,
                    "Statusx": oEventData.Statusx,
                    "TsSearchFrom": oStartDate,
                    "TsSearchTo": oEndDate
                };
                oModel.callFunction("/ModificaUserEvent", {
                    method: "GET",
                    urlParameters: oData,
                    success: function (oReturn) {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        if (oReturn.message) {
                            var sMsg = oReturn.ModificaUserEvent.Message;
                            MessageBox.error(sMsg, {
                                title: oI18n.getText("msgError"),
                                styleClass: (!jQuery.support.touch) ? "sapUiSizeCompact" : ""
                            });
                        } else {
                            var oBundle = that.getView().getModel("i18n").getResourceBundle();
                            MessageToast.show(oBundle.getText("msgOkEdited"));
                            that._ricaricaUserEvent();
                        };
                    },
                    error: function (oError) {
                        //Set core to not busy after elements rendering and backend data fetching:
                        sap.ui.core.BusyIndicator.hide();
                        that.showUpdateError(oError);
                    }
                });
            },
            // Gestione azioni creazione da orario, drag and drop, resize e spostamento fine
        });
    }
);
