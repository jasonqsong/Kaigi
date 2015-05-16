/**
 * Kaigi Gui handler
 * @param config.globalSrc      OPTIONAL: url to the global sources (themes, js files)
 * @param config.dependencies   OPTIONAL: array of files which the widget is dependent on, to be loaded by widget
 * @param config.syncManager        MANDATORY: SyncManager managing all the sync widgets and creating this panel
 * @param config.kaigiPanel MANDATORY: KaigiPanel
 * @param config.environment        MANDATORY: DSM environment
 * @param config.remoteUserUri  MANDATORY: uri of the remote user
 **/
evowidget.kaigiwidget.KaigiGui = function(config, resultHandler) {

    evoappfwk.Logger.log("KaigiGui", "Creating", evoappfwk.Logger.FUNCTION);

    var self = this,
        $tag,
        kaigiWidgetId = config.kaigiPanel.getId(),
        resourceUrl = config.platformPath,
        notification,
        tagId = config.tagId = utilities.getIdfromUri(config.remoteUserUri),
        progressConfig,
        kaigiWindow,
        kaigiWrapper,
        html,
        coreHtml,
        navigationEvent,
        contextMenus = {};

    if (config.tag == undefined) {
        $tag = $("body");
    } else if (typeof config.tag == "string") {
        $tag = $('#' + config.tag);
    } else {
        $tag = config.tag;
    }

    var widgetIcons = {
            activeIcon: resourceUrl + "themes/img/wb_k.png",
            inactiveIcon: resourceUrl + "themes/img/wb_blue.png"
        },
        notificationIcon = resourceUrl + "themes/img/wb_orange.png";

    //  var iconAddMenu = resourceUrl + "themes/img/add.png";   
    var iconToolMenu = resourceUrl + "themes/img/tool_menu.png";

    var menuSpeed = 200;

    var dummyAreaTag = "kaigi_dummy_storage_" + tagId;
    var dummyAreaTagHeart = "kaigi_dummy_storage_heart_" + tagId,
        contextMenusArea = 'wb_context_menus_' + tagId;

    self.currentActivity = evowidget.kaigiwidget.Activity.DRAWING;

    // indicates whether right (tool) menu is displayed or not
    self.toolMenuActive = false;

    // indicates whether window is visible on the screen
    self.displayed = false;

    // URI of the remote party
    self.remoteUri = config.remoteUserUri;

    if (config.displayName) {
        self.displayName = config.displayName;
    } else {
        self.displayName = utilities.getDisplayNameFromUri(config.remoteUserUri);
    }

    self.progressIconLive = resourceUrl + "themes/img/progress_wb_live.gif";

    self.progressUi = undefined;

    navigationEvent = new evoappfwk.WidgetGuiStateEvent(evoappfwk.EventService.WIDGET, undefined);
    navigationEvent.setWidgetInstanceId(config.kaigiPanel.getInstanceId());

    /* UI variables START */

    var btnBoxTabNavBackward;
    var btnBoxTabNavForward;

    var btnRight;
    var btnLeft;

    /* UI variables END */

    self.bgImageFile = undefined;

    coreHtml = new evowidget.kaigiwidget.KaigiHtml(config).getHtml();

    if (config.showProgress === true) {
        progressConfig = {
            serviceTag: "wb",
            remoteTag: tagId,
            //            platform: config.platform,
            msg1: 'starting kaigi session with',
            msg2: self.displayName + " ...",
            data: {
                iconSet: {
                    iconLive: this.progressIconLive
                }
            },
            endable: true,
            endHandler: onWindowClose
        };

        this.progressUi = new evoappfwk.CommunicationProgress(progressConfig, progressReady);
    } else {
        html = coreHtml;
        htmlReady();
    }

    function progressReady() {
        // html = self.progressUi.getHtml() + html; TODO watch here
        html = self.progressUi.getHtml();
        htmlReady();
    }

    function htmlReady() {
        var sourceConfig = {
            styles: [{
                type: "style",
                filename: resourceUrl + "themes/css/style_kaigi.css"
            }]
        };
        evoappfwk.FileLoader.loadSources(sourceConfig.styles, init);
    }

    function initUiVars() {
        // tabs navigation
        btnBoxTabNavBackward = $("#wb_tab_nav_backward_box_" + tagId);
        btnBoxTabNavForward = $("#wb_tab_nav_forward_box_" + tagId);

        // navigation bar
        btnLeft = $('#wb_add_menu_btn_' + tagId);
        btnRight = $('#wb_tool_menu_btn_' + tagId);
    }

    function init() {
        var wbContainerEl,
            frameConfig;

        evoappfwk.Logger.log("KaigiGui", "Initializing WB GUI", evoappfwk.Logger.FUNCTION);

        $("body").append('<div id="' + dummyAreaTag + '" style="display: none !important; z-index: -1000"></div>');
        $("body").append('<div id="' + dummyAreaTagHeart + '" style="display: none !important; z-index: -1000"></div>');
        wbContainerEl = document.getElementById(dummyAreaTag);

        frameConfig = {
            content: html,
            contentName: 'kaigi',
            icons: widgetIcons,
            remoteUserId: tagId, // TODO user URI parameter should be finally removed
            parent: wbContainerEl,
            mainContainerTag: config.mainContainerTag,
            baseTag: config.kaigiPanel.getInstanceId()
        };
        kaigiWindow = new evoappfwk.Frame(frameConfig); // storing in a hidden area until showing requested
        kaigiWrapper = kaigiWindow.getMainTag();

        if (config.showProgress === true) {
            $("#" + dummyAreaTagHeart).append($(coreHtml));
        }

        kaigiWindow.addEventListener(evoappfwk.Frame.EVENT.FRAME_CLOSE, function() {
            onWindowClose();
        });
        kaigiWindow.addEventListener(evoappfwk.Frame.EVENT.FRAME_CLICK, function() {
            onWidgetClick();
        });

        kaigiWindow.setTitle(self.displayName);
        kaigiWindow.activateActionHandlers(false);

        initUiVars();

        if (config.showProgress === true) {
            self.progressUi.initialize();
        }

        if (config.showProgress === true) {
            $("#kaigi_body_" + tagId).hide();
            self.show('progress');
        }

        btnBoxTabNavBackward.click(function() {
            config.kaigiPanel.onTabNavBackward();
        });
        btnBoxTabNavForward.click(function() {
            config.kaigiPanel.onTabNavForward();
        });

        btnLeft.click(function() {
            openKaigi();
        });

        // right (tool) menu 
        btnRight.click(function() {
            openToolMenu();
        });

        if (typeof resultHandler === 'function') {
            resultHandler();
        }

        evoappfwk.Logger.log("KaigiGui", "GUI init complete", evoappfwk.Logger.FUNCTION);

        return;
    }

    this.activate = function(config, resultHandler) {
        if (typeof resultHandler === 'function') {
            resultHandler();
        }
        // TODO should activate be about showing/hiding?
        /*
        if(this.progressUi) {
            this.progressUi.hide();
        }
        $("#" + this.mainTag).show();
        */
        // show target content (after initialization)
        // init implementation
    };

    this.setZIndex = function(value, remoteUri, top) {
        kaigiWindow.setZIndex(value, remoteUri, top);
    };

    this.getZIndex = function() {
        return kaigiWindow.getZIndex();
    };

    this.setPosition = function(position, positionType) {
        evoappfwk.DOMUtils.setPosition(kaigiWrapper, position, positionType);
    };

    this.getPosition = function() {
        return evoappfwk.DOMUtils.getPosition(kaigiWrapper);
    };

    this.getId = function() {
        return kaigiWrapper;
    };

    this.hide = function() {
        evoappfwk.Logger.log("KaigiGui", "Hide", evoappfwk.Logger.FUNCTION);
        kaigiWindow.close(false);
        this.setDisplayed(false);
        config.kaigiPanel.setVisibility(evoappfwk.WidgetVisibility.HIDDEN);
    };

    this.show = function(mode) {
        evoappfwk.Logger.log("KaigiGui", "Show, mode: " + mode, evoappfwk.Logger.FUNCTION);
        if ($("#" + dummyAreaTag).length > 0) {
            evoappfwk.Logger.log("KaigiGui", "moving widget to the visible area", evoappfwk.Logger.FUNCTION);
            $tag.append($("#" + dummyAreaTag).children()[0]);
            $("#" + dummyAreaTag).remove();
        }

        if (!this.isDisplayed()) {
            requestPosition();
        }

        if (mode === 'progress') {
            if (this.progressUi) {
                this.progressUi.show();
            }
            $("#kaigi_body_" + tagId).hide();
        } else {
            // show target content
            if (this.progressUi) {
                this.progressUi.hide();

                // insert target content to the main frame
                if ($("#" + dummyAreaTagHeart).length > 0) {
                    evoappfwk.Logger.log("KaigiGui", "Moving widget to the visible area", evoappfwk.Logger.FUNCTION);

                    $("#" + this.progressUi.getMainTag()).after($("#" + dummyAreaTagHeart).children()[0]);
                    $("#" + dummyAreaTagHeart).remove();
                }
            }
            $("#kaigi_body_" + tagId).show();
        }

        window.setTimeout(function() {
            // a delay to obtain position to avoid blik effect
            kaigiWindow.show();
            config.kaigiPanel.setVisibility(evoappfwk.WidgetVisibility.SHOWN);
        }, 50);

        this.setDisplayed(true, mode);


        // report click, even if not physically clicked, to bring on top
        onWidgetClick();
    };

    this.remove = function() {
        kaigiWindow.remove();
        $("#" + dummyAreaTag).remove();
        $("#" + dummyAreaTagHeart).remove();
        this.setDisplayed(false);
    };

    this.getCurrentLayering = function() {
        return currentLayering;
    };
    /**
     * @param {String} mode indicates ui display mode/state: 'progress': in progress; 'final': target, workable view; undefined: any mode 
     */
    this.isDisplayed = function(mode) {
        if (mode === undefined) {
            return this.displayedProgress || this.displayedFinal;
        }
        if (mode === 'final') {
            return this.displayedFinal;
        }
        if (mode === 'progress') {
            return this.displayedProgress;
        }
    };

    this.setDisplayed = function(displayed, mode) {
        if (mode === undefined) {
            // this.displayedProgress = _displayed;
            this.displayedProgress = false;
            this.displayedFinal = displayed;
        }
        if (mode === 'final') {
            this.displayedFinal = displayed;
        }
        if (mode === 'progress') {
            this.displayedProgress = displayed;
        }
    };

    function paintButton(button) {
        switch (self.getCurrentLayering()) {
            case windowLayerState.ACTIVE:
                if (button.data('active') == true || button.data('active-subbutton') == true) {
                    setColorClass(button, "kaigi_black");
                }
                if (button.data('active') == false) {
                    setColorClass(button, "kaigi_sweetblue");
                }
                if (button.data('active-subbutton') == false) {
                    setColorClass(button, "kaigi_lightblue");
                }
                break;
            case windowLayerState.FRONT_BACK:
                if (button.data('active') == true || button.data('active-subbutton') == true) {
                    setColorClass(button, "kaigi_sweetblue");
                }
                if (button.data('active') == false) {
                    setColorClass(button, "kaigi_black");
                }
                if (button.data('active-subbutton') == false) {
                    setColorClass(button, "kaigi_lightblack");
                }
                break;
            case windowLayerState.INACTIVE:
                if (button.data('active') == true || button.data('active-subbutton') == true) {
                    setColorClass(button, "kaigi_inactive_darkgray");
                }
                if (button.data('active') == false) {
                    setColorClass(button, "kaigi_inactive_gray");
                }
                if (button.data('active-subbutton') == false) {
                    setColorClass(button, "kaigi_inactive_lightgray");
                }
                break;
        }
    };

    function setColorClass(button, colorClass) {
        var i;
        var colorClasses = ["kaigi_sweetblue", "kaigi_lightblue", "kaigi_black", "kaigi_lightblack", "kaigi_inactive_gray", "kaigi_inactive_darkgray", "kaigi_inactive_lightgray"];
        for (i = 0; i < colorClasses.length; i++) {
            if (colorClasses[i] == colorClass) {
                button.addClass(colorClasses[i]);
            } else {
                button.removeClass(colorClasses[i]);
            }
        }
    };

    this.updatePanelTitle = function(title) {
        kaigiWindow.setTitle(title);
    };

    /**
     * @param {jCommunicator.UserProfileData} profileData 
     */
    this.updateRemoteData = function(profileData) {
        var progressData;

        if (profileData.displayName) {
            kaigiWindow.setTitle(profileData.displayName);
            if (this.progressUi) {
                progressData = {
                    msg2: profileData.displayName + " ..."
                }
                this.progressUi.updateData(progressData);
            }
        }
    };

    this.alert = function(slogan1, slogan2) {
        new evoappfwk.AlertPanel({
            message: slogan1,
            additional_message: slogan2,
            timeout: 5000
        });
    };

    function onWindowClose() {
        evoappfwk.Logger.log("KaigiGui", "Closing window of " + self.remoteUri, evoappfwk.Logger.FUNCTION);

        self.hide();
        config.kaigiPanel.setVisibility(evoappfwk.WidgetVisibility.HIDDEN);
        config.kaigiPanel.close(self.remoteUri);

        navigationEvent.setGuiAction(evoappfwk.Widget.EVENT.WIDGET_CLOSE);
        evoappfwk.EventBus.notify(navigationEvent);
    };

    function onWidgetClick() {
        evoappfwk.Logger.log("KaigiGui", "Clicked widget of " + self.remoteUri, evoappfwk.Logger.FUNCTION);

        navigationEvent.setGuiAction(evoappfwk.Widget.EVENT.WIDGET_CLICK);
        evoappfwk.EventBus.notify(navigationEvent);
    };

    window.onclick = function(e) {
        if ($('div').hasClass('ui-focus'))
            $('div').removeClass('ui-focus');
    };

    function openKaigi() {
        evoappfwk.Logger.log("KaigiGui", "New kaigi open", evoappfwk.Logger.FUNCTION);

        // TODO unify event
        var evt = new evoappfwk.Event("SYNC_SESSION_" + kaigiWidgetId + "_ACTION", config.remoteUserUri);
        evt.code = "ADD_" + kaigiWidgetId + "_TAB";
        evt.id = tagId; // TODO needed?

        if (config.kaigiAction) {
            config.kaigiAction(evt);
        }

        showToolMenuButton();
    };

    function openToolMenu() {
        evoappfwk.Logger.log("KaigiGui", "Opening context menu", evoappfwk.Logger.FUNCTION);

        self.setToolMenuActive(true);

        // TODO unify event
        var evt = new evoappfwk.Event("SYNC_SESSION_" + kaigiWidgetId + "_ACTION", config.remoteUserUri);
        evt.code = "SHOW_CONTEXT_MENU";

        if (config.kaigiAction) {
            config.kaigiAction(evt);
        }

    };

    function showToolMenuButton() {
        btnRight.css('display', 'block');
    }
    this.hideToolMenuButton = function() {
        btnRight.css('display', 'none');
    }


    /*
        this.closeTabRequest = function(id) { // TODO what ID?
            console.log("closeTabRequest START, id: " + id);

            var removeInfo = mainGui.removeWidget(id + "mainPage");
            
            console.log("removeInfo: " + removeInfo.id + " " + removeInfo.name);
            
            if(removeInfo != null) {
                switch(removeInfo.name) {
                    case KaigiGui.name:
                        var event = {
                            service: "SYNC_SESSION_"+kaigiWidgetId+"_ACTION",
                            code: "REMOVE_"+kaigiWidgetId+"_TAB",
                            tabId: removeInfo.id
                        }
                        evoappfwk.EventBus.notify(event);
                        break;
                    default:
                        break;
                }
            }
            syncSession.publishLocalAppStateChange(id, "PAGE_DELETE");
            
            $('#' +parseInt(id)+ 'smallPageHistory').remove();
            $('#' +parseInt(id)+ 'bottomBtnHistory').remove();
            $('#' +parseInt(id)+ 'mainPage').remove();
            count--;
            
            resize();
            evt1.stopImmediatePropagation();
        }
    */

    function activateButton(button, isSubbutton) {
        if (isSubbutton == true) {
            button.data('active-subbutton', true);
        } else {
            button.data('active', true);
        }
        paintButton(button);
    };

    function deactivateButton(button, isSubbutton) {
        if (isSubbutton == true) {
            button.data('active-subbutton', false);
        } else {
            button.data('active', false);
        }
        paintButton(button);
    };

    function toggleActivation(button, isSubbutton) {
        if (isSubbutton == true) {
            button.data('active-subbutton', !button.data('active-subbutton'));
        } else {
            button.data('active', !button.data('active'));
        }
        paintButton(button);
    };

    function isButtonActive(button, isSubbutton) {
        if (isSubbutton == true) {
            return button.data('active-subbutton');
        } else {
            return button.data('active');
        }
    };

    this.isToolMenuActive = function() {
        return this.toolMenuActive;
    };
    this.setToolMenuActive = function(active) {
        this.toolMenuActive = active;
    };

    this.update = function(activeTabId) {
        var prop;

        // shows only context menu related to specific
        for (prop in contextMenus) {
            if (contextMenus.hasOwnProperty(prop)) {
                if (prop === activeTabId) {
                    contextMenus[prop].show();
                } else {
                    contextMenus[prop].hide();
                }
            }
        }
    };

    /**
     * @param {Object} activity evowidget.kaigiwidget.Activity
     */
    this.setCurrentActivity = function(activity) {
        console.log("setting current activity to " + activity);
        this.currentActivity = activity;
    };
    this.getCurrentActivity = function() {
        return this.currentActivity;
    };

    this.turnTabNavigationBtn = function(data) {
        var btnType = data.navButtonType,
            visibility = data.visibility;

        evoappfwk.Logger.log("KaigiGui", "turnTabNavigationBtn button: " + btnType + ", visibility: " + visibility, evoappfwk.Logger.FUNCTION);
        var navBtn = (btnType == "backward" ? btnBoxTabNavBackward : btnBoxTabNavForward);
        if (visibility == "on") {
            navBtn.addClass('wb_tab_nav_box_active');
            navBtn.removeClass('wb_tab_nav_box_inactive');
        } else {
            navBtn.addClass('wb_tab_nav_box_inactive');
            navBtn.removeClass('wb_tab_nav_box_active');
        }
    };

    this.showRemoteWidgetStartedNotification = function(user) {
        var config = {
            slogan: user + " started kaigi session",
            icon: notificationIcon,
            timeout: 10000
        };

        evoappfwk.Logger.log("KaigiGui", "issuing notification, config: " + JSON.stringify(config), evoappfwk.Logger.FUNCTION);

        notification = utilities.Notification(config);
        if (notification) {
            notification.onclose = onRemoteStartedNotificationClosed;
        }
        // notification.onclick = onRemoteStartedNotificationClicked;
    };

    /*
    function onRemoteStartedNotificationClicked() {
        window.focus();
        notification.close();
        delete notification;
    };
    */

    function onRemoteStartedNotificationClosed() {
        delete notification;
    };

    this.allCtxMenusOff = function() {
        showToolMenuButton();
    };

    /**
     * Returns ID of the menu tag 
     */
    this.getContextMenuContainerTag = function(pageId) {
        return 'wb_context_menu_' + tagId + '_' + pageId;
    };

    /**
     * Returns context menu container ID
     */
    this.getContextMenusContainerTag = function() {
        showToolMenuButton();
        return contextMenusArea;
    };

    /**
     * Sends a request to position itself in the UI 
     */
    function requestPosition() {
        var positionEvent = new evoappfwk.WidgetGuiStateEvent(evoappfwk.EventService.WIDGET, undefined);
        positionEvent.setWidgetInstanceId(config.kaigiPanel.getInstanceId());
        positionEvent.setGuiAction(evoappfwk.Widget.EVENT.WIDGET_POSITION);
        evoappfwk.EventBus.notify(positionEvent);
    }

    this.updateSubtitle = function(text) {}
    var danmakuList = {}
    this.updateDanmaku = function(danmakuId, text) {
        if (danmakuList[danmakuId] === undefined) {
            var danmakuElement =
                '<div id="kaigi_danmaku_%danmakuId%" class="kaigi_danmaku">%text%</div>';
            danmakuElement = danmakuElement.replace(/%danmakuId%/g, danmakuId);
            danmakuElement = danmakuElement.replace(/%text%/g, text);
            $('#kaigi_subtitle_layer' + tagId).append(danmakuElement);
            $('#kaigi_danmaku_' + danmakuId).css("left", $('#kaigi_subtitle_layer' + tagId).width() + 'px');
            var line = 0;
            var occupy = {};
            for (var danmakuId in danmakuList) {
                danmakuObj = $('#kaigi_danmaku_' + danmakuId);
                if (danmakuObj.offset().left + danmakuObj.width() > $('#kaigi_subtitle_layer' + tagId).offset().left) {
                    occupy[danmakuList[danmakuId]] = true;
                }
            }
            while (occupy[line] === undefined) line++;
            $('#kaigi_danmaku_' + danmakuId).css("top", (line * 60 + 30) + 'px');
        } else {
            $('#kaigi_danmaku_' + danmakuId).text(text);
        }
    }
    this.scrollDanmaku = function(danmakuId) {
            $('#kaigi_danmaku_' + danmakuId).animate({
                left: '-=50px',
            },'slow',function(){
                this.scrollDanmaku(danmakuId);
            });
    }

};
