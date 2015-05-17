evowidget.kaigiwidget = evowidget.kaigiwidget || {};

// possible activities within kaigi
evowidget.kaigiwidget.Activity = {};
evowidget.kaigiwidget.Activity.DRAWING = "DRAWING";
evowidget.kaigiwidget.Activity.ERASING = "ERASING";
evowidget.kaigiwidget.Activity.POINTING = "POINTING";

/**
 * Kaigi panel handler
 * @param config.globalSrc      OPTIONAL: url to the global sources (themes, js files)
 * @param config.dependencies   OPTIONAL: array of files which the widget is dependent on, to be loaded by widget
 * @param config.platform       MANDATORY: used for loading gui for dedicated platform, e.g. desktop, iPhone, iPad
 * @param config.syncManager        MANDATORY: SyncManager managing all the sync widgets and creating this panel
 * @param config.environment        MANDATORY: DSM environment
 * @param config.remoteUserUri  MANDATORY: uri of the remote user
 **/
//TestSync.js -> new TestNotes.js -> new TestNotesWidget.js
/* Kaigi
 widget */
evowidget.KaigiWidget = function(config, success, error) {

    evoappfwk.Logger.log("KaigiWidget", "Constructor started.. File: " + config.className + ".js", evoappfwk.Logger.MODULE);
    config.widgetFileName = config.className + ".js";
    evoappfwk.GuiWidget.apply(this, [config]);
    var selfWidget = this;
    var self = this,
        instanceId = config.instanceId,
        kaigiWidgetId = this.getId(),
        uiTag = config.remoteUserUri ? utilities.getIdfromUri(config.remoteUserUri) : null, // available even before sync session setup
        remoteUserId, // = utilities.getIdfromUri(config.remoteUserUri),
        currentUserUri, // = utilities.getIdfromUri(config.currentUserUri),
        subscription,
        environment, // = config.environment,
        displayName, // = (config.displayName != undefined) ? config.displayName : remoteUserUri;
        gui,
        tabs = [],
        applicationControlHash = null,
        tabs_DSMList = null,
        pageCounter = 0,
        canvasWidth,
        canvasHeight,
        highlightMaxX,
        highlightMaxY,
        currentPageID = 0,
        maxPages = config.widgetPages,
        maxVisibleTabs = 3,
        tabManager,
        tabClassName = "wbtab",
        tabSelectedClassName = "wbtabSelected",
        draggableWindow = null,
        canvasPanelId,
        notification,
        sourceConfig,
        sources,
        platformPath,
        platformType = evoappfwk.PlatformSelector.getPlatform(),
        createCtxMenuOnNewTab = (platformType === evoappfwk.PlatformType.DESKTOP || platformType === evoappfwk.PlatformType.ANDROID_TABLET),
        contextMenuDef,
        contextMenuConfig,
        deleteTab,
        deleteTabAndroid,
        readjustTabs,
        queue = [];

    var danmakuHash;

    var queueImage = new jsutils.ConditionalAsyncTaskQueue();

    this.mainContainerTag = config.mainContainerTag;
    this.terminated = false;
    this.onActive = null;

    config.showProgress = true; // indicates that GUI should be shown with progress indicator before being activated

    sources = [{
        type: "script",
        filename: "js/ColorTools.js"
    }, {
        type: "script",
        filename: "js/CanvasUtils.js"
    }, {
        type: "script",
        filename: "js/menu/KaigiMenu.js"
    }, {
        type: "script",
        filename: "platform/" + platformType + "/KaigiGui.js"
    }, {
        type: "script",
        filename: "platform/" + platformType + "/templates/KaigiHtml.js"
    }];
    platformPath = self.getBasePath() + "platform/" + platformType + "/";
    config.platformPath = platformPath;

    this.remoteUri = config.remoteUserUri;

    this.activationReported = false;

    // current state
    this.state = undefined;

    //TODO: proper html from correct template
    self.initGuiWidget({
        sources: sources
    });

    function getTabByUid(uid) {
        var i, len;
        for (i = 0, len = tabs.length; i < len; i++) {
            if (tabs[i].uid === uid) {
                return tabs[i];
            }
        }
        return null;
    };

    this.getTabsLength = function() {
        return tabs.length;
    };

    this.getTabs = function() {
        return tabs;
    };

    this.getTab = function(uid) {
        return getTabByUid(uid);
    };

    /************ LifeCycle events *************/
    this.removeTab = function(uid) {
        deleteTabViaEventBus(uid);
    };

    this.appendTab = function(evt) {
        if (this.activationReported === true) {
            var newTab = addTabViaEventBus(evt); //if (evt.imageUrl) the image will be drawn
            // var tab = getTabByPageId(evt.tabId).tab;
            if (evt.contextMenu) {
                newTab.addMenu(evt.contextMenu);
                //newTab.getMenu().show();
            }
            if (platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
                var evt = {
                    getService: function() {
                        return kaigiWidgetId + '_ACTION';
                    },
                    getSelector: function() {
                        return undefined;
                    },
                    action: "CREATED",
                    instanceId: instanceId,
                    tabId: newTab.uid,
                    tag: newTab.getTag(),
                    state: "CREATED"
                };
                evoappfwk.EventBus.notify(evt);
            }
        } else {
            this.addToQueue(this.appendTab, evt);
        }
    };

    this.onLayoutLoaded = function() {
        evoappfwk.Logger.log("KaigiWidget", "GUI created..", evoappfwk.Logger.FUNCTION);
        init();
    };

    this.show = function(mode) {
        if (mode === 'init') gui.show(mode);
        else
        if (!gui.isDisplayed('final')) { // TODO implement for Android!
            evoappfwk.Logger.log("KaigiWidget", "Kaigi show()", evoappfwk.Logger.FUNCTION);
            gui.show();
            self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.ON, true);
        }
    };

    this.showPage = function(uid) {
        var tab = getTabByUid(uid);
        if (tab !== null) {
            tabs.forEach(function(tab) {
                tab.hasFocus = false;
            });
            tab.hasFocus = true;

            tab.showPage();
        }
    };

    this.hide = function() {
        if (gui.isDisplayed()) { // TODO implement for Android!
            gui.hide();
            self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.OFF, true);
        }
    };

    this.hidePage = function(uid) {
        var tab = getTabByUid(uid);

        if (tab !== null) {
            tab.hidePage();
        }
    };

    this.hidePages = function() {
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].hidePage();
        }
    };

    this.getContainer = function() {
        //return gui.getContainer();
        return document.getElementById(canvasPanelId);
    };

    this.setZIndex = function(value, remoteUri, top) {
        gui.setZIndex(value, remoteUri, top);
    };

    this.getZIndex = function() {
        return gui.getZIndex();
    };

    this.setPosition = function(position, positionType) {
        if (gui) {
            gui.setPosition(position, positionType);
        }
    };

    this.getPosition = function() {
        return gui ? gui.getPosition() : null;
    };

    this.destroy = function() {
        if (tabs_DSMList)
        //environment.dsm.detachChild(tabs_DSMList);
            this.dsmRef.detach(tabs_DSMList);
    };

    this.emulateCrossLine = function(from) {
        var tab = getActiveTab();
        tab.page.emulateCrossLine(from);
    };

    function eventHandler(evt) {
        var action;

        if (self.terminated === true) { // TODO enable state setting
            // if(self.getState() === evoappfwk.WidgetState.QUITING) {
            evoappfwk.Logger.warn("KaigiWidget", "Event received but widget has been terminated", evoappfwk.Logger.FUNCTION);
            return true; // continue
        }

        evoappfwk.Logger.log("KaigiWidget", "Event received, service: " + evt.getService() + ", selector: " + evt.getSelector(), evoappfwk.Logger.FUNCTION);
        if (evt instanceof evoappfwk.WidgetActionEvent) {
            action = evt.getAction();
            if (evt.getWidgetId() === kaigiWidgetId) {
                if (action === evoappfwk.WidgetActionEvent.action.START) {
                    if (tabs.length === 0) {
                        var firstTab = addTab({
                            pageId: currentPageID,
                            tag: canvasPanelId,
                            dsm: environment.dsm,
                            imageUrl: evt.data.data
                        });

                        tabs_DSMList.set(0, firstTab.toString());
                        evoappfwk.Logger.log("KaigiWidget", "got first tab: " + firstTab.toString(), evoappfwk.Logger.FUNCTION);
                        tabs_DSMList.commit();

                        if (platformType !== evoappfwk.PlatformType.DESKTOP) {
                            var evt = {
                                getService: function() {
                                    return kaigiWidgetId + '_ACTION';
                                },
                                getSelector: function() {
                                    return undefined;
                                },
                                action: "CREATED",
                                instanceId: instanceId,
                                tabId: firstTab.uid,
                                tag: firstTab.getTag(),
                                state: "CREATED"
                            };
                            evoappfwk.EventBus.notify(evt);
                        }

                        if (createCtxMenuOnNewTab) {
                            createContextMenu(firstTab);
                        }
                    }
                    if (!gui.isDisplayed('final')) { // TODO implement for Android!
                        gui.show();
                        self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.ON, true);
                    }
                } else if (action === evoappfwk.WidgetActionEvent.action.STOP) {
                    if (gui.isDisplayed()) { // TODO implement for Android!
                        gui.hide();
                        self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.OFF, true);
                    }
                }
            }
        } else if (evt instanceof evoappfwk.ContactDataEvent && evt.getAction() === evoappfwk.ContactDataEvent.action.DATA_REPORT) {
            evoappfwk.Logger.log('KaigiWidget', 'Contact data received', evoappfwk.Logger.FUNCTION);
            contact = evt.getContact();
            if (contact) {
                displayName = contact.userProfileData.displayName;
                //updatePanelTitle method is suitable only for desktop version, and event
                //should be captured by Frame class object
                if (platformType === evoappfwk.PlatformType.DESKTOP) {
                    gui.updatePanelTitle(displayName); // TODO remove eventually

                    if (typeof gui.updateRemoteData === 'function') {
                        gui.updateRemoteData(evt.contact.userProfileData);
                    }
                }
                return true;
            }
        } else if (evt instanceof evoappfwk.CommunicationStateEvent) { // only remote widget state notifications
            if (evt.isRemote() === true && evt.getWidgetId() === kaigiWidgetId) {
                if (evt.getState() === evoappfwk.CommunicationStateEvent.state.ON) {
                    self.remoteKaigiStarted();
                } else if (evt.getState() === evoappfwk.CommunicationStateEvent.state.OFF) {
                    self.remoteKaigiClosed();
                }
            }
        } else if (evt instanceof evoappfwk.QueueEvent && evt.getService() === evoappfwk.EventService.SYSTEM) {
            if (evt.getWidgetId() === kaigiWidgetId) {
                if (evt.getAction() === evoappfwk.QueueEvent.action.EXECUTE_QUEUE) {
                    evoappfwk.Logger.log("KaigiWidget", '[eventHandler] QUEUE event received, executing last one', evoappfwk.Logger.FUNCTION);
                    if (evt.getQueue().length > 0 && evt.getQueue()[evt.getQueue().length - 1]) {
                        eventHandler(evt.getQueue()[evt.getQueue().length - 1]);
                    }
                }
            }
        }
    }

    /**
     * Executed on kaigi action originated at GUI 
     */
    function kaigiActionHandler(evt) {
        var service = evt.getService(),
            code = evt.code,
            activeTab,
            newTab;

        if (self.terminated === true) { // TODO enable state setting
            // if(self.getState() === evoappfwk.WidgetState.QUITING) {
            evoappfwk.Logger.warn("KaigiWidget", "Event received but widget has been terminated", evoappfwk.Logger.FUNCTION);
            return true; // continue
        }

        evoappfwk.Logger.log("KaigiWidget", 'Kaigi action handler, code: ' + code, evoappfwk.Logger.FUNCTION);

        // TODO this handler is common for desktop (callback from gui) and android (event bus listener) so event unification needs to be aliged

        if (service === "SYNC_SESSION_" + kaigiWidgetId + "_ACTION") {
            if (code === "ADD_" + kaigiWidgetId + "_TAB") {
                newTab = addTabViaEventBus(evt); //if (evt.imageUrl) the image will be drawn
                // var tab = getTabByPageId(evt.tabId).tab;
                if (evt.contextMenu) {
                    newTab.addMenu(evt.contextMenu);
                    newTab.getMenu().show();
                }
                if (platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
                    var evt = {
                        getService: function() {
                            return kaigiWidgetId + '_ACTION';
                        },
                        getSelector: function() {
                            return undefined;
                        },
                        action: "CREATED",
                        instanceId: instanceId,
                        tabId: newTab.uid,
                        tag: newTab.getTag(),
                        state: "CREATED"
                    };
                    evoappfwk.EventBus.notify(evt);
                }
                return false;
            } else if (code === "REMOVE_" + kaigiWidgetId + "_TAB") {
                if (evt.tabId !== undefined) {
                    deleteTabViaEventBus(evt.tabId);
                }
                return false;
            } else if (code == "ADD_MENU") {
                //var tab = getTabByPageId(evt.tabId).tab;
                var tab = getTabByUid(evt.tabId);
                tab.addMenu(evt.contextMenu);
                return false;
            } else if (code === "SHOW_CONTEXT_MENU") {
                activeTab = self.getActiveTab();
                if (activeTab && activeTab.getMenu()) {
                    activeTab.getMenu().show();
                }
            }

        }
    }

    /**
     * Function creates a new tab on request of client
     * @param config.tag            DOM tag to be used for the tab
     * @param config.tabId          id of the tab
     * @param config.imageUrl       URL to the image to be used as a backgroun
     * @param config.contextMenu    reference to the contextual menu object
     */
    function addTabViaEventBus(params) {
        if (tabs.length >= maxPages) {
            evoappfwk.Logger.warn("KaigiWidget", "tabs number exceeded max value (" + maxPages + ")", evoappfwk.Logger.FUNCTION);
            return;
        }

        var newTab = addTab({
            pageId: params.tabId || ++currentPageID,
            tag: params.tag || canvasPanelId,
            dsm: environment.dsm,
            imageUrl: params.data,
            contextMenu: params.contextMenu
        });

        tabs_DSMList.append(newTab.toString());
        tabs_DSMList.commit();

        if (params.imageUrl) newTab.page.drawImageFromReader(params.imageUrl);
        //don't need now
        //if (params.tag) document.getElementById(params.tag).appendChild(document.getElementById(canvasPanelId).children[0]);

        if (!params.contextMenu && createCtxMenuOnNewTab) {
            createContextMenu(newTab);
        }

        return newTab;
    };

    function deleteTabViaEventBus(uid) {
        var index;

        if (platformType === evoappfwk.PlatformType.DESKTOP) {
            index = deleteTab(uid);
        } else if (platformType === evoappfwk.PlatformType.ANDROID_PHONE || platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
            index = deleteTabAndroid(uid);
        }

        // begin debugging
        logTabsDSMList("before deleting the tab from list, tab ID: " + index);
        // end debugging
        tabs_DSMList.del(index);
        tabs_DSMList.commit();
        // begin debugging
        logTabsDSMList("after deleting the tab from list tab ID: " + index);
    }

    //-----
    function init() {
        evoappfwk.Logger.log("KaigiWidget", "init()", evoappfwk.Logger.FUNCTION);
        config.kaigiPanel = self;
        config.kaigiAction = kaigiActionHandler;
        config.mainContainerTag = self.mainContainerTag;

        gui = new evowidget.kaigiwidget.KaigiGui(config, guiCreated);
    }

    function guiCreated() {
        if (typeof success === 'function') {
            success(self);
        }
        registerContextMenu();
    }

    function registerContextMenu() {
        evoappfwk.Logger.log("KaigiWidget", "Registering context menu", evoappfwk.Logger.FUNCTION);
        contextMenuConfig = {
            resourcePath: platformPath + "menu-resources"
        };
        contextMenuDef = evowidget.kaigiwidget.KaigiMenu.getDef(contextMenuConfig);

        if (typeof config.registerMenu === 'function') {
            config.registerMenu(contextMenuDef, self.getInstanceId(), self.getId());
        }
    }

    this.activate = function(config_) {
        evoappfwk.Logger.log("KaigiWidget", "Activating", evoappfwk.Logger.FUNCTION);
        config = config_;
        if (!gui) {
            config.kaigiPanel = self;
            config.kaigiAction = kaigiActionHandler;
            config.mainContainerTag = self.mainContainerTag;
            gui = new evowidget.kaigiwidget.KaigiGui(config, resultHandler);
        } else {
            if (typeof gui.activate === 'function') {
                gui.activate(config, resultHandler);
            }
        }
    };

    this.getMiniature = function(uid) {
        var tab = getTabByUid(uid);
        if (tab !== null) {
            return tab.getMiniature();
        }
        return null;
    };

    function resultHandler() {
            remoteUserId = utilities.getIdfromUri(config.remoteUserUri);

            if (platformType == evoappfwk.PlatformType.DESKTOP) {
                tabManager = new evoappfwk.TabManager(tabs, maxVisibleTabs, onTabManagerAction);
            };

            //  if(platformType == evoappfwk.PlatformType.DESKTOP) {
            // tabTableId = "wb_tab_table_" + uiTag;
            canvasPanelId = "canvaspanel_" + uiTag;
            //} else {
            //tabTableId = "tabTable";
            //canvasPanelId = "canvaspanel";
            //}
            currentUserUri = utilities.getIdfromUri(config.currentUserUri);
            environment = config.environment;
            displayName = (config.displayName != undefined) ? config.displayName : utilities.getDisplayNameFromUri(config.remoteUserUri);

            subscription = {
                services: [evoappfwk.EventService.WIDGET_ACTION_SERVICE, evoappfwk.EventService.SYSTEM, "SYNC_SESSION_" + kaigiWidgetId + "_ACTION"],
                selector: self.remoteUri,
                listener: eventHandler
            };
            evoappfwk.EventBus.subscribe(subscription);

            tabEventSubscription = {
                services: ["SYNC_SESSION_" + kaigiWidgetId + "_ACTION"],
                selector: self.remoteUri, // TODO
                listener: kaigiActionHandler
            };
            evoappfwk.EventBus.subscribe(tabEventSubscription);


            requestContactUpdate();

            tabs_DSMList = new DSM.ListReplica("kaigi_pages_");

            environment.dsm.attachChild([tabs_DSMList], function() {
                evoappfwk.Logger.log("KaigiWidget", "tabs on DSM: " + tabs_DSMList.size(), evoappfwk.Logger.FUNCTION);

                tabs_DSMList.forEachItem(function(tabStr) {
                    var tabInfo = JSON.parse(tabStr);
                    currentPageID++;

                    var tab = addTab({
                        pageId: tabInfo.pageId,
                        tag: canvasPanelId,
                        dsm: environment.dsm,
                        imageUrl: tabInfo.image
                    });
                    evoappfwk.Logger.log("KaigiWidget", "adding wb page in activate", evoappfwk.Logger.FUNCTION);

                    // tab.setTitle("Page " + (tab.index+1)); // TODO ?
                    // tab.setTitle(tabInfo.title);

                    if (platformType !== evoappfwk.PlatformType.DESKTOP) {
                        var evt = {
                            getService: function() {
                                return kaigiWidgetId + "_ACTION";
                            },
                            getSelector: function() {
                                return undefined;
                            },
                            action: "CREATED",
                            instanceId: instanceId,
                            tabId: tab.uid,
                            tag: tab.getTag(),
                            state: "CREATED"
                        };
                        evoappfwk.EventBus.notify(evt);
                    }

                    if (createCtxMenuOnNewTab) {
                        createContextMenu(tab);
                    }
                });

                // activation complete
                self.reportActivation();
                self.processQueue();
                if (self.onActive instanceof Function) {
                    self.onActive(self);
                }
            });

            tabs_DSMList.remoteupdate = function(op) {
                var tab;
                if (op.type == Cosmic.Operation.ADD) {
                    evoappfwk.Logger.log("KaigiWidget", "tabs_DSMList.remoteupdate Cosmic.Operation.ADD", evoappfwk.Logger.FUNCTION);

                    var tabInfo = JSON.parse(op.value);
                    if (getTabByPageId(tabInfo.pageId) && getTabByPageId(tabInfo.pageId).tab != null) {
                        // page already exists with this pageId
                        evoappfwk.Logger.log("KaigiWidget", "ignoring remote adding page with id that already exists", evoappfwk.Logger.FUNCTION);
                    } else {
                        currentPageID++;

                        tab = addTab({
                            pageId: tabInfo.pageId,
                            tag: canvasPanelId,
                            dsm: environment.dsm,
                            imageUrl: tabInfo.image,
                            skipReposition: true
                        });

                        if (platformType !== evoappfwk.PlatformType.DESKTOP) {
                            var evt = {
                                getService: function() {
                                    return "SYNC_SESSION_" + kaigiWidgetId + "_ACTION_REMOTE";
                                },
                                getSelector: function() {
                                    return undefined;
                                },
                                action: "SYNC_SESSION_" + kaigiWidgetId + "_ACTION_REMOTE_ADD",
                                //widgetTabId: tabs.indexOf(tab),
                                tabId: tab.uid,
                                tag: tab.getTag()
                            };
                            evoappfwk.EventBus.notify(evt);
                        }

                        if (createCtxMenuOnNewTab) {
                            createContextMenu(tab);
                        }
                    }
                } else if (op.type === Cosmic.Operation.SET) {
                    evoappfwk.Logger.log("KaigiWidget", "tabs_DSMList.remoteupdate Cosmic.Operation.SET", evoappfwk.Logger.FUNCTION);
                    var tabInfo = JSON.parse(op.value);
                    if (getTabByPageId(tabInfo.pageId) === null || getTabByPageId(tabInfo.pageId).tab === null) {
                        // page with this pageId does not exist
                        // so we should create page
                        //currentPageID = tabInfo.pageId;
                        currentPageID++;

                        tab = addTab({
                            pageId: tabInfo.pageId,
                            tag: canvasPanelId,
                            dsm: environment.dsm,
                            imageUrl: tabInfo.image,
                            skipReposition: true
                        });
                        if (platformType !== evoappfwk.PlatformType.DESKTOP) {
                            var evt = {
                                getService: function() {
                                    return "SYNC_SESSION_" + kaigiWidgetId + "_ACTION_REMOTE";
                                },
                                getSelector: function() {
                                    return undefined;
                                },
                                //                          id: "CollaborationGui",
                                action: "SYNC_SESSION_" + kaigiWidgetId + "_ACTION_REMOTE_ADD",
                                //widgetTabId: tabs.indexOf(tab),
                                tabId: tab.getId(),
                                tag: tab.getTag()
                            };
                            evoappfwk.EventBus.notify(evt);
                        }

                        if (createCtxMenuOnNewTab) {
                            createContextMenu(tab);
                        }
                    } else {
                        tabs[op.index].setTitle(tabInfo.title);
                    }
                } else {
                    if (op.type == Cosmic.Operation.DEL) {
                        evoappfwk.Logger.log("KaigiWidget", "tabs_DSMList.remoteupdate Cosmic.Operation.DEL, item: " + JSON.stringify(op.item), evoappfwk.Logger.FUNCTION);
                        var tabInfo = JSON.parse(op.item);
                        if (getTabByPageId(tabInfo.pageId) === null || getTabByPageId(tabInfo.pageId).tab === null) {
                            // page with this pageId does not exist
                            evoappfwk.Logger.log("KaigiWidget", "ignoring remote deleting page with id that does not exist", evoappfwk.Logger.FUNCTION);
                        } else {
                            evoappfwk.Logger.log("KaigiWidget", "deleting wb tab remote update", evoappfwk.Logger.FUNCTION);
                            if (platformType === evoappfwk.PlatformType.DESKTOP) {
                                var tab = getTabByPageId(tabInfo.pageId).tab;
                                deleteTab(tab.uid);
                            } else if (platformType !== evoappfwk.PlatformType.DESKTOP) {
                                var tab = getTabByPageId(tabInfo.pageId).tab;
                                deleteTabAndroid(tab.uid);

                                var event = {
                                    getService: function() {
                                        return "SYNC_SESSION_" + kaigiWidgetId + "_ACTION_REMOTE";
                                    },
                                    getSelector: function() {
                                        return undefined;
                                    },
                                    action: "SYNC_SESSION_" + kaigiWidgetId + "_ACTION_REMOTE_DEL",
                                    //tabId: op.index
                                    tabId: tab.uid,
                                    tag: tab.getTag()
                                };
                                evoappfwk.EventBus.notify(event);
                            }
                        }
                    }
                }
            };

            self.danmakuHash = new DSM.HashReplica("kaigi_danmaku_");
            environment.dsm.attachChild([self.danmakuHash],
                function() {
                    self.danmakuHash.update = function(op) {
                        switch (op.type) {
                            case DSM.Operation.ADD:
                            case DSM.Operation.SET:
                                {
                                    var danmakuId = op.key;
                                    gui.updateDanmaku(op.key, op.value);
                                    break;
                                }
                        }
                    }

                    self.danmakuHash.remoteupdate = function(op) {
                        switch (op.type) {
                            case DSM.Operation.ADD:
                            case DSM.Operation.SET:
                                break;
                        }
                    }

                }
            );
        }
        //end of result handler

    /**
     * Reports widget communication state 
     */
    this.reportCommunicationState = function(state, notifyRemotes) {
        evoappfwk.Logger.log("KaigiWidget", "Reporting communication state: " + state + ", announce: " + notifyRemotes, evoappfwk.Logger.FUNCTION);
        var evt;

        evt = new evoappfwk.CommunicationStateEvent(evoappfwk.EventService.KAIGI, undefined); // explicit lack of selector
        evt.setWidgetId(kaigiWidgetId);
        evt.setState(state);
        evt.setRecipient(self.remoteUri);
        evt.setAnnounceInNetwork(notifyRemotes);

        evoappfwk.EventBus.notify(evt);
    };

    this.reportActivation = function() {
        var evt;
        if (!this.isActivationReported()) {
            evoappfwk.Logger.log("KaigiWidget", "Kaigi widget ACTIVATED, announcing", evoappfwk.Logger.FUNCTION);

            evt = new evoappfwk.WidgetStateEvent(evoappfwk.EventService.KAIGI, self.remoteUri);
            evt.setWidgetId(kaigiWidgetId);
            evt.setRemoteUri(self.remoteUri);
            evt.setState(evoappfwk.WidgetState.ACTIVE);
            evoappfwk.EventBus.notify(evt);

            this.setActivationReported(true);
        }
    };

    this.processQueue = function() {
        var i, len;
        for (i = 0, len = queue.length; i < len; i += 1) {
            //queue[i].func(queue[i].param);
            queue[i].func.apply(this, [queue[i].param]);
        };
    };

    this.addToQueue = function(func, param) {
        queue.push({
            func: func,
            param: param
        });
    };

    this.isReadyForTermination = function() {
        if (gui && gui.isDisplayed()) {
            return false;
        }
        return true;
    };

    this.quit = function() {
        evoappfwk.Logger.log("KaigiWidget", "[quit] START", evoappfwk.Logger.FUNCTION);
        if (tabs_DSMList) {
            //environment.dsm.detachChild(tabs_DSMList);
            //environment.dsm.detach(tabs_DSMList);
        }
        if (gui) {
            gui.remove();
            gui = undefined;
        }

        if (subscription) {
            evoappfwk.EventBus.unsubscribe(subscription);
        }

        self.terminated = true;

        self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.OFF, true);
    };

    var Touch = function(id, point) {
        this.id = id;
        this.point = point;
    };

    var currentlyDrawnPathId = null;
    var Path = function(page, typeOrObject, id, color, lineWidth, who) {

        if (typeof(typeOrObject) != "string") {
            // construct from object
            var obj = typeOrObject;
            this.type = obj.type;
            this.id = obj.id;
            this.state = obj.state;
            this.color = obj.color;
            this.lineWidth = obj.lineWidth;
            this.path = obj.path;
            this.who = obj.who;
            //
        } else {
            // construct from arguments
            this.type = typeOrObject;
            if (id) this.id = id;
            else this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            this.state = "new";
            this.color = color;
            this.lineWidth = lineWidth;
            this.path = [];
            this.who = who;
            //
        }

        var thisPath = this;

        this.update = function(obj) {
            evoappfwk.Logger.log("KaigiWidget", "updating path, color: " + obj.color, evoappfwk.Logger.FUNCTION);
            this.type = obj.type;
            this.id = obj.id;
            this.state = obj.state;
            this.color = obj.color;
            this.lineWidth = obj.lineWidth;
            this.path = obj.path;
            this.who = obj.who;
        };

        this.toString = function() {
            // return JSON.stringify(this);
            return JSON.stringify({
                type: this.type,
                id: this.id,
                state: this.state,
                color: this.color,
                lineWidth: this.lineWidth,
                path: this.path,
                who: this.who
            });
        };

        this.lastPointIndexDrawn = 0;

        this.drawConcurrently = function(from) {
            var i;
            evoappfwk.Logger.log("KaigiWidget", "drawConcurrently path: " + this.id + " from: " + from, evoappfwk.Logger.FUNCTION);
            var context = page.getContext();
            var startIndex = 0;
            if (typeof(from) == "number") {
                if (from >= 0) startIndex = from;
                else startIndex = Math.max(this.path.length - 1 + from, 0);
            }

            if (startIndex >= this.path.length) return;

            if (this.type == "draw") {
                // draw
                var startPoint = this.path[startIndex];

                if (this.id != currentlyDrawnPathId) {
                    evoappfwk.Logger.log("KaigiWidget", "currentlyDrawnPathId set to: " + this.id, evoappfwk.Logger.FUNCTION);
                    currentlyDrawnPathId = this.id;
                    context.globalCompositeOperation = 'source-over';
                    context.beginPath();
                    context.strokeStyle = this.color;
                    context.lineCap = "round";
                    context.lineWidth = this.lineWidth;
                    context.moveTo(startPoint.x, startPoint.y);
                }

                evoappfwk.Logger.log("KaigiWidget", "drawing on context for canvas: " + context.canvas.id, evoappfwk.Logger.FUNCTION);

                for (i = startIndex + 1; i < this.path.length; i++) {
                    var point = this.path[i];
                    context.lineTo(point.x, point.y);
                    context.stroke();
                }
                this.lastPointIndexDrawn = this.path.length - 1;

            } else
            if (this.type == "erase") {
                //erase    

                var startPoint = this.path[startIndex];

                if (this.id != currentlyDrawnPathId) {
                    evoappfwk.Logger.log("KaigiWidget", "currentlyDrawnPathId set to: " + this.id, evoappfwk.Logger.FUNCTION);
                    currentlyDrawnPathId = this.id;
                    context.globalCompositeOperation = 'destination-out';
                    context.beginPath();
                    context.strokeStyle = "black";
                    context.lineCap = "round";
                    context.lineWidth = this.lineWidth;
                    context.moveTo(startPoint.x, startPoint.y);
                }


                evoappfwk.Logger.log("KaigiWidget", "erasing on context for canvas: " + context.canvas.id, evoappfwk.Logger.FUNCTION);

                for (i = startIndex + 1; i < this.path.length; i++) {
                    var point = this.path[i];
                    context.lineTo(point.x, point.y);
                    context.stroke();
                }
                this.lastPointIndexDrawn = this.path.length - 1;
            }
        };

        this.dsmList = null;
        this.dsmListAttached = false;
        this.dsmListToBeDetached = false;
        this.dsmListClearOnDetach = false;

        this.localAttachToDSM = function() {
            evoappfwk.Logger.log("KaigiWidget", "localAttachToDSM for path id: " + this.id, evoappfwk.Logger.FUNCTION);
            if (!this.dsmList && !this.dsmListAttached) {
                this.dsmList = new DSM.ListReplica("kaigi_page_" + page.id + "_path_" + this.id);
                // this is just for test
                // setTimeout(function() {
                environment.dsm.attachChild([thisPath.dsmList], thisPath.localDsmListAttachedCallback);
                // },0);
            }
        };

        this.localDsmListAttachedCallback = function() {
            var i;
            thisPath.dsmListAttached = true;
            evoappfwk.Logger.log("KaigiWidget", "dsmListAttached for path id: " + thisPath.id + " set to: " + thisPath.dsmListAttached, evoappfwk.Logger.FUNCTION);

            if (thisPath.dsmListToBeDetached) {
                // TODO perhaps do this async
                thisPath.detachFromDSM(thisPath.dsmListClearOnDetach);
            } else {
                // send initial points
                evoappfwk.Logger.log("KaigiWidget", "found initial number of points: " + thisPath.path.length, evoappfwk.Logger.FUNCTION);
                for (i = 0; i < thisPath.path.length; i++) {
                    var point = thisPath.path[i];
                    thisPath.dsmList.append(point.toString());
                }
                thisPath.dsmList.commit();
            }
        };

        // this is used only for locally added points
        this.localAddPoint = function(point) {
            evoappfwk.Logger.log("KaigiWidget", "localAddPoint to path id:" + this.id + " while dsmListAttached: " + this.dsmListAttached + " coords: " + point.toString(), evoappfwk.Logger.FUNCTION);
            this.path.push(point);
            this.drawConcurrently(-1);
            if (this.dsmListAttached) {
                this.dsmList.append(point.toString());
                this.dsmList.commit();
            }
        };

        this.remoteAttachToDSM = function() {
            evoappfwk.Logger.log("KaigiWidget", "remoteAttachToDSM for path id: " + this.id, evoappfwk.Logger.FUNCTION);
            if (!this.dsmList && !this.dsmListAttached) {
                this.dsmList = new DSM.ListReplica("kaigi_page_" + page.id + "_path_" + this.id);
                // this is just for test
                // setTimeout(function() {
                environment.dsm.attachChild([thisPath.dsmList], thisPath.remoteDsmListAttachedCallback);
                // },0);
            }
        };

        this.remoteDsmListAttachedCallback = function() {
            var i;
            thisPath.dsmListAttached = true;
            evoappfwk.Logger.log("KaigiWidget", "dsmListAttached for path id: " + thisPath.id + " set to: " + thisPath.dsmListAttached, evoappfwk.Logger.FUNCTION);

            if (thisPath.dsmListToBeDetached) {
                // TODO perhaps do this async
                evoappfwk.Logger.log("KaigiWidget", "Detaching dsmList for path id: " + thisPath.id + "...", evoappfwk.Logger.FUNCTION);
                thisPath.detachFromDSM(thisPath.dsmListClearOnDetach);
            } else {
                // collect initial points
                evoappfwk.Logger.log("KaigiWidget", "found initial number of points: " + thisPath.dsmList.size(), evoappfwk.Logger.FUNCTION);
                for (i = 0; i < thisPath.dsmList.size(); i++) {
                    var pointJSON = thisPath.dsmList.get(i);
                    var point = JSON.parse(pointJSON);
                    thisPath.path.push(point);
                }
                // draw
                if (thisPath.path.length > 0) {
                    thisPath.drawConcurrently(0);
                }
                // handle update
                thisPath.dsmList.remoteupdate = function(op) {
                    evoappfwk.Logger.log("KaigiWidget", "dsmList remoteupdate for path id: " + thisPath.id + " got type: " + op.type + " on item: " + op.item, evoappfwk.Logger.FUNCTION);
                    switch (op.type) {
                        case DSM.Operation.ADD:
                            var pointJSON = op.item;
                            var point = JSON.parse(pointJSON);
                            thisPath.path.push(point);
                            thisPath.drawConcurrently(-1);
                            break;
                        case DSM.Operation.CLEAR:
                            break;
                    }
                };
            }
        };

        this.detachFromDSM = function(clear) {
            evoappfwk.Logger.log("KaigiWidget", "detachFromDSM for path id: " + this.id + " to clear: " + clear + " while dsmListAttached: " + this.dsmListAttached, evoappfwk.Logger.FUNCTION);
            if (this.dsmList && this.dsmListAttached) {
                if (clear) {
                    this.dsmList.clear();
                    this.dsmList.commit();
                }
                evoappfwk.Logger.log("KaigiWidget", "Detaching dsmList for path id: " + this.id + "...", evoappfwk.Logger.FUNCTION);
                environment.dsm.detachChild(this.dsmList);
                this.dsmListAttached = false;
                this.dsmList = null;
                this.dsmListToBeDetached = false;
                this.dsmListClearOnDetach = false;
            } else {
                evoappfwk.Logger.log("KaigiWidget", "Deferring detach of dsmList for path id: " + this.id + "...", evoappfwk.Logger.FUNCTION);
                this.dsmListToBeDetached = true;
                this.dsmListClearOnDetach = clear;
            }
        };
    };

    var Point = function(x, y) {
        if (typeof(x) === 'string') {
            //string construct
            var tempJsonobject = JSON.parse(x);
            this.x = tempJsonobject.x;
            this.y = tempJsonobject.y;
        } else {
            this.x = x;
            this.y = y;
        }

        this.toString = function() {
            return JSON.stringify(this);
        };
    };

    /**
     * Object Page
     * @param dom       DOM tree
     * @param pageDsm   page DSM reference
     * @param id        page id
     * @param imageUrl  imageUrl of the background image
     */
    evowidget.kaigiwidget.Page = function(id, destDiv, pageDsm, imageUrl) {

        // this.randomId = "PAGE_" + utilities.getId(); for test purposes
        // evoappfwk.Logger.log("KaigiWidget", "Creating new page with randomId = " + this.randomId, evoappfwk.Logger.FUNCTION);

        if (platformType === evoappfwk.PlatformType.DESKTOP && draggableWindow === null) {
            draggableWindow = document.getElementById(gui.getId());
            evoappfwk.Logger.log("KaigiWidget", "draggableWindow: " + draggableWindow, evoappfwk.Logger.FUNCTION);
        }
        this.dsmRef = pageDsm;

        if (platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
            var controlButtonsContainer = gui.getControlButtonsContainer();
            var menuContainer = document.createElement("div");
        }

        var canvas;
        var context;
        var highlightCanvas;
        var highlightImageDivSelf;
        var highlightImageDivRemote;
        var highlightContext;
        var backgroundCanvas;
        var backgroundContext;
        var canvasContainer;
        // var dsmIndicator;
        // var saveButton;
        var isErasing = false;
        this.isHighlightingDiv = false;
        var isRemoteHighlighting = false;
        var isHighlighting = false;
        var isDrawingLocally = false;
        var isDrawingRemotely = false;
        var remotePathBuffer = [];
        var remotePathsWaiting = false;
        var lineWidth = 3;
        var eraseSize = 10;
        var willReduceThickness;
        if (platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
            //canvasWidth = 1000;
            //canvasHeight = 1000;
            var spaceContent = document.getElementsByClassName("spaceContent")[0];
            canvasWidth = spaceContent.clientWidth;
            canvasHeight = spaceContent.clientHeight;
        } else {
            canvasWidth = 800; //800px set by defaulr, changed to 100%;
            canvasHeight = 600; //800px set by defaulr, changed to 100%;
            //HD dimension removed! can be restored from WBPanelHD
        }

        highlightMaxX = canvasWidth - 34;
        highlightMaxY = canvasHeight - 34;

        var brushColor = colors.fg.black;
        var backgroundColor = colors.bg.white;

        var highlightDivListener = null;
        var highlightImageListener = null;
        var highlightTitleListener = null;

        var paths = [];
        var currentRemotePath = null;
        var totalStringRepresentation = "";
        this.id = id;
        var destDiv = destDiv;

        var currentTouches = {};
        var addListeners = true;

        var currentPath = null;
        var currentPaths = {};
        var currentPathsDSMList;

        var currentHighlight = null;
        var currentHighlights = {};
        var currentHighlightsDSMHash;

        evoappfwk.Logger.log("KaigiWidget", "assigning imageUrl: " + imageUrl, evoappfwk.Logger.FUNCTION);

        var imageUrl = imageUrl;
        var imageLink;

        var hash;
        var totalPath_DSMList;
        var self = this;

        this.mode = "draw";

        this.setMode = function(m) {
            this.mode = m;
        };
        this.getMode = function() {
            return this.mode;
        };
        this.setColor = function(c) {
            brushColor = c; // = colorutils.getColorAsRgb(c);
        };
        this.getColor = function() {
            return brushColor;
        };

        this.getContext = function() {
            return context;
        };

        this.getMiniature = function() {
            return {
                style: {
                    backgroundColor: backgroundColor,
                    backgroundImage: "url(" + canvas.toDataURL() + ")," + "url(" + (imageUrl || "") + ")"
                }
            };
        };

        this.setContextMenuTag = function(menuTag, sideMenuTag) {
            var menu = document.getElementById(menuTag);
            var sideMenus = document.getElementById(sideMenuTag);
            menuContainer.appendChild(menu);
            menuContainer.appendChild(sideMenus);
            canvasContainer.appendChild(menuContainer);
        };

        this.destroy = function() {
            var i;
            if (currentPathsDSMList) {
                var currentPathsIds = Object.keys(currentPaths);
                for (i = 0; i < currentPathsIds.length; i++) {
                    var path = currentPaths[currentPathsIds[i]];
                    //delete currentPaths[currentPathsIds[i]];
                    path.detachFromDSM(false);
                }
                environment.dsm.detachChild(currentPathsDSMList);
            }
        };

        self.imageFit = true;

        function setUpDomElements() {
            canvasContainer = document.createElement("div");
            if (platformType == evoappfwk.PlatformType.DESKTOP) {
                canvasContainer.style.display = "none";
            }
            canvasContainer.style.width = canvasWidth + "px";
            canvasContainer.style.height = canvasHeight + "px";

            canvas = document.createElement("canvas");
            canvas.style.width = canvasWidth + "px";
            canvas.style.height = canvasHeight + "px";
            canvas.style.position = "absolute";
            canvas.style.zIndex = "2";
            canvas.style.marginTop = "0px";
            if (platformType != evoappfwk.PlatformType.DESKTOP) {
                canvas.style.border = "1px solid gray";
            }
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            canvas.id = "canvas" + id;

            highlightCanvas = document.createElement("div");
            highlightCanvas.style.width = canvasWidth + "px";
            highlightCanvas.style.height = canvasHeight + "px";
            highlightCanvas.style.position = "absolute";
            highlightCanvas.style.zIndex = "1";
            highlightCanvas.style.marginTop = "0px";
            if (platformType != evoappfwk.PlatformType.DESKTOP) {
                highlightCanvas.style.border = "1px solid gray";
            }
            highlightCanvas.width = canvasWidth;
            highlightCanvas.height = canvasHeight;
            highlightCanvas.id = "highlightCanvas" + id;

            highlightImageDivSelf = document.createElement("div");
            highlightImageDivSelf.style.position = "absolute";
            highlightImageDivSelf.style.width = "40px";
            highlightImageDivSelf.style.height = "40px";
            highlightImageDivSelf.style.zIndex = "inherit";

            highlightImageDivRemote = document.createElement("div");
            highlightImageDivRemote.style.position = "absolute";
            highlightImageDivRemote.style.width = "40px";
            highlightImageDivRemote.style.height = "40px";
            highlightImageDivRemote.style.zIndex = "inherit";

            var highlightImageSelf = document.createElement("img");
            highlightImageSelf.style.width = "40px";
            highlightImageSelf.style.height = "40px";
            highlightImageSelf.src = platformPath + "themes/img/ico-pointer.png";

            var highlightImageRemote = document.createElement("img");
            highlightImageRemote.style.width = "40px";
            highlightImageRemote.style.height = "40px";
            highlightImageRemote.draggable = false;
            highlightImageRemote.src = platformPath + "themes/img/ico-pointer.png";

            highlightImageDivSelf.appendChild(highlightImageSelf);
            highlightImageDivRemote.appendChild(highlightImageRemote);

            var highlightTitleSelf = document.createElement("span");
            highlightTitleSelf.style.color = "black";
            highlightImageDivSelf.appendChild(highlightTitleSelf);

            var highlightTitleRemote = document.createElement("span");
            highlightTitleRemote.style.color = "black";
            highlightImageDivRemote.appendChild(highlightTitleRemote);

            backgroundCanvas = document.createElement("div");
            backgroundCanvas.style.width = canvasWidth + "px";
            backgroundCanvas.style.height = canvasHeight + "px";
            backgroundCanvas.style.position = "absolute";
            backgroundCanvas.style.zIndex = "0";
            backgroundCanvas.style.marginTop = "0px";
            if (platformType != evoappfwk.PlatformType.DESKTOP) {
                backgroundCanvas.style.border = "1px solid gray";
            }
            backgroundCanvas.width = canvasWidth;
            backgroundCanvas.height = canvasHeight;
            backgroundCanvas.id = "backgroundCanvas" + id;
            backgroundCanvas.style.backgroundColor = "white";

            canvasContainer.appendChild(highlightCanvas);
            canvasContainer.appendChild(backgroundCanvas);
            canvasContainer.appendChild(canvas);

            if (typeof destDiv === "string") {
                document.getElementById(destDiv).appendChild(canvasContainer);
            } else {
                destDiv.appendChild(canvasContainer);
            }
        }

        setUpDomElements();

        //Public methods
        this.hide = function() {
            evoappfwk.Logger.log("KaigiWidget", "hiding page: " + id, evoappfwk.Logger.FUNCTION);

            if (platformType === evoappfwk.PlatformType.DESKTOP) {
                canvasContainer.style.display = "none";
            } else if (platformType === evoappfwk.PlatformType.ANDROID_PHONE || platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
                canvasContainer.parentNode.style.display = "none";
            }
        };

        this.show = function() {
            evoappfwk.Logger.log("KaigiWidget", "showing page: " + id, evoappfwk.Logger.FUNCTION);

            if (platformType === evoappfwk.PlatformType.DESKTOP) {
                canvasContainer.style.display = "block";
            } else if (platformType === evoappfwk.PlatformType.ANDROID_PHONE || platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
                canvasContainer.parentNode.style.display = "block";
            }

            if (platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
                menuContainer.appendChild(controlButtonsContainer);
            }
        };

        this.getThickness = function() {
            return lineWidth;
        };

        this.getHash = function() {
            return hash;
        };

        this.getCanvas = function() {
            return canvas;
        };

        this.getTag = function() {
            return canvasContainer;
        };

        this.isErasing = function() {
            return isErasing;
        };

        this.setIsErasing = function(value) {
            isErasing = value;
            if (value) {
                this.mode = "erase";
                canvas.style.cursor = "default";
            } else {
                this.mode = "draw";
                canvas.style.cursor = "default";
            }
        };

        var setThickness = function(thicknessIndex) {
            lineWidth = thicknessIndex;
        };

        this.setThickness = function(thicknessIndex) {
            setThickness(thicknessIndex);
        };
        this.setEraseSize = function(newEraseSize) {
            eraseSize = newEraseSize;
        };
        this.getBrushColor = function() {
            return brushColor;
        };
        this.setBrushColor = function(color) {
            evoappfwk.Logger.log("KaigiWidget", "setting up brush color property to " + color, evoappfwk.Logger.FUNCTION);
            brushColor = color;
        };
        this.getBackgroundColor = function() {
            return backgroundColor;
        };
        this.setBackgroundColor = function(bgColor) {
            evoappfwk.Logger.log("KaigiWidget", "setting up page bg color property to " + bgColor, evoappfwk.Logger.FUNCTION);
            backgroundColor = bgColor;
        };

        this.changeBackgroundColorDiv = function(color) {

            //$(backgroundCanvas).css("backgroundColor", color);
            //backgroundColor = color;

            //evoappfwk.Logger.log("KaigiWidget", "semd to dsm changeBackgroundColorDiv color" + color, evoappfwk.Logger.FUNCTION);

            hash.set("changeBackgroundColorDiv", color);
            hash.commit();
        };


        function imageDrawSuccess() {
            evoappfwk.Logger.log("KaigiWidget", "Image loaded", evoappfwk.Logger.FUNCTION);
        }

        function imageDrawFailure() {
            evoappfwk.Logger.log("KaigiWidget", "Image not loaded", evoappfwk.Logger.FUNCTION);
        }

        function drawImage(event, success, failure, args) { //imageUrl
            deleteImage('image', function() {
                var image = new Image();
                if (platformType == evoappfwk.PlatformType.DESKTOP) {
                    image.onload = function() { // TODO align platforms!
                        var scaledDims = canvasutils.getCanvasScaledImgDimensions(image.width, image.height, canvas.width, canvas.height);
                        var pos = canvasutils.getCenteredImagePosition(scaledDims.width, scaledDims.height, canvas.width, canvas.height);

                        image.style.position = "absolute";
                        image.style.width = scaledDims.width + "px";
                        image.style.height = scaledDims.height + "px";
                        image.style.top = pos.y + "px";
                        image.style.left = pos.x + "px";

                        backgroundCanvas.appendChild(image);
                    };
                } else {
                    image.width = 360;
                    backgroundCanvas.style.backgroundRepeat = "no-repeat";
                    image.onload = function() {
                        backgroundCanvas.style.backgroundImage = "url(" + image.src + ")";
                    };
                }
                image.src = args[0];
            }, imageDeleteSuccess, ['']);
            success();
        }

        function drawImageAndSendData(imageUrl) {
            //drawImage(imageUrl);
            hash.set("image", imageUrl);
            hash.commit();
        }

        this.drawImageFromReader = function(imageUrl) {
            drawImageAndSendData(imageUrl);
        };

        function imageDeleteSuccess() {
            evoappfwk.Logger.log("KaigiWidget", "Image deleted", evoappfwk.Logger.FUNCTION);
        }

        function imageDeleteSuccess() {
            evoappfwk.Logger.log("KaigiWidget", "Image not deleted", evoappfwk.Logger.FUNCTION);
        }

        function deleteImage(event, success, failure, args) {
            if (backgroundCanvas.children.length) {
                backgroundCanvas.removeChild(backgroundCanvas.children[0]);
            }
            success();
        }

        this.startHighlightDiv = function() {
            isHighlighting = true;
            if (platformType == evoappfwk.PlatformType.DESKTOP) {
                highlightCanvas.style.cursor = "none";
                enableHighlightDiv("mousemove", positionFromMouseEventInElement);
            } else if (platformType == evoappfwk.PlatformType.ANDROID_PHONE || platformType == evoappfwk.PlatformType.ANDROID_TABLET) {
                enableHighlightDiv("touchmove", positionFromTouchEventInElement);
            }

            if (isRemoteHighlighting == true) {
                disableHighlightListeners();
            }

            hash.set("startHighlight_" + currentUserUri);
            hash.commit();
        };

        this.endHighlightDiv = function() {
            stopHighlightDiv();
        };

        function stopHighlightDiv() {
            isHighlighting = false;
            if (isRemoteHighlighting) {
                setHighlightDivListener();

                evoappfwk.Logger.log("KaigiWidget", "stop highlight but remote is ongoing", evoappfwk.Logger.FUNCTION);
            } else {
                highlightCanvas.style.zIndex = 1;
            }

            highlightCanvas.removeEventListener(highlightCanvasEventListener);
            highlightCanvas.style.cursor = "default";

            endHighlightDiv();

            hash.set("endHighlightDiv_" + currentUserUri);
            hash.commit();
        }

        function endHighlightDiv() {
            highlightCanvas.removeChild(highlightImageDivSelf);
        }

        function enableHighlightDiv(eventType, moveHandler) {
            highlightCanvas.appendChild(highlightImageDivSelf);

            highlightCanvas.style.zIndex = 3;
            highlightCanvasEventListener = highlightCanvas.addEventListener(eventType, function(event) {
                event.preventDefault();
                event.stopPropagation();
                doHighlightDiv(event, moveHandler, this);
            });
            evoappfwk.Logger.log("KaigiWidget", "highlighting has been enabled", evoappfwk.Logger.FUNCTION);
        }
        var countEvents = 0;

        function doHighlightDiv(evt, moveHandler, element) {
            if (countEvents % 3 == 0) {
                var pos = moveHandler(evt, element);
                var x = parseInt(pos.posX);
                var y = parseInt(pos.posY);
                if (x > -1 && x < highlightMaxX && y > -3 && y < highlightMaxY) {
                    highlightDivSelf(pos.posX, pos.posY);
                    hash.set("highlightDiv_" + currentUserUri, JSON.stringify({
                        posX: pos.posX,
                        posY: pos.posY
                    }));
                    hash.commit();
                }
            }
            countEvents++;
        }

        function highlightDivSelf(posX, posY) {
            highlightImageDivSelf.style.left = posX;
            highlightImageDivSelf.style.top = posY;
        }

        function highlightDivRemote(posX, posY, who) {
            highlightImageDivRemote.children[1].innerText = who;
            highlightImageDivRemote.style.left = posX;
            highlightImageDivRemote.style.top = posY;
        }

        function _doHighlightAndroid(evt) {
            draw(pointFromTouchEventInElement(evt, this));
        }

        function setHighlightDivListener() {
            if (platformType == evoappfwk.PlatformType.DESKTOP) {
                highlightCanvas.addEventListener("mousedown", mouseDown, false);
            } else if (platformType == evoappfwk.PlatformType.ANDROID_PHONE || platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
                highlightCanvas.addEventListener("touchstart", touchStart, false);
            }
        }

        function disableHighlightListeners() {
            if (platformType == evoappfwk.PlatformType.DESKTOP) {
                highlightCanvas.removeEventListener("mousedown", mouseDown, false);
            } else if (platformType == evoappfwk.PlatformType.ANDROID_PHONE || platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
                highlightCanvas.removeEventListener("touchstart", touchStart, false);
            }
        }

        function clearBackgroundDiv(event, success, failure, args) {
            backgroundCanvas.style.backgroundColor = "white";

            if (backgroundCanvas.children.length) {
                backgroundCanvas.removeChild(backgroundCanvas.children[0]);
            }
            success();
        }

        function pointFromTouchEventInElement(event, element) {
            var touch = event.targetTouches[0];
            var elementRect = element.getBoundingClientRect();
            return new Point(touch.clientX - elementRect.left, touch.clientY - elementRect.top);
        }

        function positionFromMouseEventInElement(event, element) {
            return {
                posX: event.clientX - parseInt(draggableWindow.style.left) - 20,
                posY: event.clientY - parseInt(draggableWindow.style.top) - 83
            }
        }

        function positionFromTouchEventInElement(event, element) {
            var touch = event.targetTouches[0];
            var elementRect = event.target.getBoundingClientRect();

            return {
                posX: touch.clientX - elementRect.left,
                posY: touch.clientY - elementRect.top
            }
        }

        this.setColorBar = function() {
            privateSetColorBar();
        };

        this.undoLast = function() {
            var i;
            if (currentPathsDSMList) {
                for (i = currentPathsDSMList.size() - 1; i >= 0; i--) {
                    var pathInfo = currentPathsDSMList.get(i);
                    var path = JSON.parse(pathInfo);
                    var upath = currentPaths[path.id];
                    // if (upath && (upath.type != "highlight")) {
                    if (upath) {
                        if (upath.dsmList) {
                            upath.detachFromDSM(true);
                        }
                        currentPathsDSMList.del(i);
                        currentPathsDSMList.commit();
                        delete currentPaths[upath.id];
                        this.drawAllPaths();
                        return;
                    }
                }
            }
        };

        this.eraseAllPaths = function() {
            var i;
            if (currentPathsDSMList) {
                for (i = currentPathsDSMList.size() - 1; i >= 0; i--) {
                    var pathInfo = currentPathsDSMList.get(i);
                    var path = JSON.parse(pathInfo);
                    var epath = currentPaths[path.id];
                    // if (epath && (epath.type != "highlight") && epath.dsmList) {
                    if (epath) {
                        epath.detachFromDSM(true);
                        delete currentPaths[epath.id];
                        // currentPathsDSMList.del(i);
                        // currentPathsDSMList.commit();
                    }
                }
                currentPathsDSMList.clear();
                currentPathsDSMList.commit();
            }
            this.drawAllPaths();
        };

        this.eraseAll = function() {
            this.eraseAllPaths();
            //clearBackgroundDiv('deleteImage', imageDeleteSuccess, null, ['']);
            deleteImage('deleteImage', imageDeleteSuccess, null, ['']);
            hash.set("image", "");
            hash.set("changeBackgroundColorDiv", "");
            hash.commit();
        };

        this.remove = function() {
            //if(platformType == evoappfwk.PlatformType.DESKTOP) {
            /*canvasContainer.removeChild(canvas);
            canvasContainer.removeChild(highlightCanvas);
            canvasContainer.removeChild(backgroundCanvas);
            */
            if (platformType === evoappfwk.PlatformType.DESKTOP) {
                canvasContainer.parentNode.removeChild(canvasContainer);
            }

            this.eraseAllPaths();
            hash.clear();
            hash.commit();
        };

        var emulateId = 0;
        this.emulateCrossLine = function(from) {
            var touch = new Touch("emulate" + ++emulateId);
            if (from == "top left") {
                touch.point = new Point(0, 0);
                var deltaX = canvas.width / 100;
                var deltaY = canvas.height / 100;
                startDrawing(touch);
                var drawingPoint = function() {
                    var dp = new Point(touch.point.x + deltaX, touch.point.y + deltaY);
                    if ((dp.x < canvas.width) && (dp.y < canvas.height)) {
                        touch.point = dp;
                        drawPoint(touch);
                        setTimeout(drawingPoint, 100);
                    } else {
                        stopDrawing(touch);
                    }
                };
                drawingPoint();
            } else
            if (from == "top right") {
                touch.point = new Point(canvas.width - 1, 0);
                var deltaX = canvas.width / 100;
                var deltaY = canvas.height / 100;
                startDrawing(touch);
                var drawingPoint = function() {
                    var dp = new Point(touch.point.x - deltaX, touch.point.y + deltaY);
                    if ((dp.x >= 0) && (dp.y < canvas.height)) {
                        touch.point = dp;
                        drawPoint(touch);
                        setTimeout(drawingPoint, 100);
                    } else {
                        stopDrawing(touch);
                    }
                };
                drawingPoint();
            }
        };

        this.removeAllPaths = function() {
            var i = 0;
            if (currentPathsDSMList) {
                currentPathsDSMList.clear();
                currentPathsDSMList.commit();
            }
            var clearCurrentPaths = currentPaths;
            var clearCurrentPathIds = Object.keys(clearCurrentPaths);
            currentPaths = {};

            for (i = 0; i < clearCurrentPathIds.length; i++) {
                var path = clearCurrentPaths[clearCurrentPathIds[i]];
                path.detachFromDSM(true);
            }

            evoappfwk.Logger.log("KaigiWidget", "we cleared the list!", evoappfwk.Logger.FUNCTION);
        };

        function findPathIndexInDSMList(upath) {
            var i;
            if (currentPathsDSMList) {
                for (i = currentPathsDSMList.size() - 1; i >= 0; i--) {
                    var pathInfo = currentPathsDSMList.get(i);
                    var path = JSON.parse(pathInfo);
                    if (path.id === upath.id) {
                        return i;
                    }
                }
            }
            return -1;
        }

        this.drawAllPaths = function() {
            context.clearRect(0, 0, canvas.width, canvas.height);
            this.drawPaths(Object.keys(currentPaths));
        };

        this.drawPaths = function(inPaths) {
            var j;
            evoappfwk.Logger.log("KaigiWidget", "in draw paths", evoappfwk.Logger.FUNCTION);
            evoappfwk.Logger.log("KaigiWidget", context, evoappfwk.Logger.FUNCTION);

            for (j = 0; j < inPaths.length; j++) {
                var pathId = inPaths[j];
                // if (currentPaths[pathId].type != "highlight") {
                currentPaths[pathId].drawConcurrently(0);
                // }
            }

            //restore context to local settings...
            context.lineWidth = lineWidth;
            context.strokeStyle = colorutils.getColorAsRgb(brushColor); // color;
        };

        /**
         *  new Hubert's implementation
         **/
        function startDrawing(touch) {

            touch.type = self.mode;

            if (self.mode == "highlight") {
                var currentHighlight = new Highlight(self, null, null, eraseSize, remoteUserId);
                currentHighlight.point = touch.point;
                touch.highlight = currentHighlight;
                currentHighlightsDSMHash.set("Highlight_" + currentHighlight.id, currentHighlight.toString());
                currentHighlightsDSMHash.commit();

            } else {

                var currentPath;
                if (self.mode == "erase") {
                    currentPath = new Path(self, "erase", null, null, eraseSize, remoteUserId);
                } else {
                    currentPath = new Path(self, "draw", null, brushColor, lineWidth, remoteUserId);
                }
                touch.path = currentPath;

                currentPathsDSMList.append(currentPath.toString());
                currentPathsDSMList.commit();

                currentPaths[currentPath.id] = currentPath;
                currentPath.localAttachToDSM();
                currentPath.localAddPoint(touch.point);
            }
        }

        var drawPoint = function(touch) {
            // it is done this way because the initial points need to be buffered
            if (touch.type == "highlight") {
                if (touch.highlight && currentHighlights[touch.highlight.id]) {
                    currentHighlightsDSMHash.set("Point_" + touch.highlight.id, touch.point.toString());
                    currentHighlightsDSMHash.commit();
                }
            } else {
                if (touch.path && currentPaths[touch.path.id]) {
                    // currentPaths[touch.path.id].addPoint(touch.point);
                    touch.path.localAddPoint(touch.point);
                }
            }
        };

        function stopDrawing(touch) {
            evoappfwk.Logger.log("KaigiWidget", "stopDrawing touch id: " + touch.id + " type: " + touch.type, evoappfwk.Logger.FUNCTION);
            if (touch.type == "highlight") {
                var currentHighlight = touch.highlight;
                if (currentHighlight && currentHighlights[currentHighlight.id]) {
                    currentHighlightsDSMHash.del("Highlight_" + currentHighlight.id);
                    currentHighlightsDSMHash.del("Point_" + currentHighlight.id);
                    currentHighlightsDSMHash.commit();
                }
            } else {
                var currentPath = touch.path;
                if (currentPath && currentPaths[currentPath.id]) {
                    currentPath.state = "done";
                    var idx = findPathIndexInDSMList(currentPath);
                    if (idx >= 0) {
                        currentPathsDSMList.set(idx, currentPath.toString());
                        currentPath.detachFromDSM(true);
                    }
                }
            }
        }

        //desktop
        if (platformType == evoappfwk.PlatformType.DESKTOP) {
            canvas.addEventListener("mousedown", mouseDown, false);
            //canvas.addEventListener("touchstart", touchStart, false);
            canvas.oncontextmenu = function() {
                return false;
            };

            function mouseDown(mouseEvent) {
                evoappfwk.Logger.log("KaigiWidget", "onmousedown at offsetX: " + mouseEvent.offsetX + " offsetY: " + mouseEvent.offsetY, evoappfwk.Logger.FUNCTION);
                mouseEvent.preventDefault();
                mouseEvent.stopPropagation();
                var _this = mouseEvent.target;
                if (addListeners) {
                    _this.removeEventListener("touchstart", touchStart, false);
                    _this.addEventListener("mousemove", mouseMove, false);
                    _this.addEventListener("mouseleave", mouseUp, false);
                    _this.addEventListener("mouseup", mouseUp, false);
                    addListeners = false;
                }
                var x = 0,
                    y = 0;
                if (_this.tagName == "IMG" || _this.tagName == "SPAN") {
                    x = parseInt(highlightImageDivRemote.style.left);
                    y = parseInt(highlightImageDivRemote.style.top);
                }

                if (self.mode == 'draw')
                    _this.style.cursor = "crosshair";

                if (self.mode == 'erase')
                    _this.style.cursor = "crosshair";

                var p = new Point(mouseEvent.offsetX, mouseEvent.offsetY);
                var id = "mouse";
                var touch = new Touch(id, p);
                currentTouches[id] = touch;
                startDrawing(touch);

                evoappfwk.Logger.log("KaigiWidget", "mouseDown", evoappfwk.Logger.FUNCTION);
            }

            function mouseMove(mouseEvent) {
                var x = 0;
                var y = 0;
                var _this = mouseEvent.target;
                if (_this.tagName == "IMG" || _this.tagName == "SPAN") {
                    x = parseInt(highlightImageDivRemote.style.left);
                    y = parseInt(highlightImageDivRemote.style.top);
                }
                // evoappfwk.Logger.log("KaigiWidget", "onmousemove at offsetX: " + mouseEvent.offsetX + " offsetY: " + mouseEvent.offsetY, evoappfwk.Logger.FUNCTION);
                var p = new Point(mouseEvent.offsetX + x, mouseEvent.offsetY + y);
                var touch = currentTouches["mouse"];
                if (touch) {
                    if ((p.x == touch.point.x) && (p.y == touch.point.y)) return;
                    touch.point = p;
                    drawPoint(touch);
                }
            }

            function mouseUp(mouseEvent) {
                var _this = mouseEvent.target;
                /*
                _this.removeEventListener("mousemove", mouseMove, false);
                _this.removeEventListener("mouseup", mouseUp, false);
                _this.style.cursor = "default";
                */

                if (self.mode != "erase")
                    mouseEvent.target.style.cursor = "default";

                if (self.mode != "draw")
                    mouseEvent.target.style.cursor = "default";

                var touch = currentTouches["mouse"];
                if (touch) {
                    delete currentTouches[touch.id];
                    stopDrawing(touch);
                }

            }

            canvas.oncontextmenu = function() {
                return false;
            };

            canvas.addEventListener("mouseup", mouseUp, false);
        }

        // evoappfwk.Logger.log("KaigiWidget", "will call private method!", evoappfwk.Logger.FUNCTION);
        // privateSetColorBar();
        //end desktop

        //android
        if (platformType == evoappfwk.PlatformType.ANDROID_PHONE || platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
            canvas.addEventListener("touchstart", touchStart, false);
            canvas.addEventListener("touchend", touchEnd, false);

            function touchStart(touchEvent) {
                var i;
                touchEvent.preventDefault();
                touchEvent.stopPropagation();
                var _this = touchEvent.target;
                if (addListeners) {
                    var _this = touchEvent.target;
                    _this.removeEventListener("mousedown", mouseDown, false);
                    _this.addEventListener("touchmove", touchMove, false);
                    _this.addEventListener("touchend", touchEnd, false);
                    _this.addEventListener("touchleave", touchEnd, false);
                    _this.addEventListener("touchcancel", touchEnd, false);
                    addListeners = false;
                }

                var touches = touchEvent.changedTouches;
                var elementRect = touchEvent.target.getBoundingClientRect();
                for (i = 0; i < touches.length; i++) {
                    var p = new Point(touches[i].clientX - elementRect.left, touches[i].clientY - elementRect.top);
                    evoappfwk.Logger.log("KaigiWidget", "ontouchstart for touch id: " + touches[i].identifier + " at point X: " + p.x + " Y: " + p.y, evoappfwk.Logger.FUNCTION);
                    var touch = new Touch(touches[i].identifier, p);
                    currentTouches[touch.id] = touch;
                    startDrawing(touch);
                }
            }

            function touchMove(touchEvent) {
                var i;
                touchEvent.preventDefault();
                touchEvent.stopPropagation();
                var touches = touchEvent.changedTouches;
                var elementRect = touchEvent.target.getBoundingClientRect();
                for (i = 0; i < touches.length; i++) {
                    var p = new Point(touches[i].clientX - elementRect.left, touches[i].clientY - elementRect.top);
                    evoappfwk.Logger.log("KaigiWidget", "ontouchmove for touch id: " + touches[i].identifier + " at point X: " + p.x + " Y: " + p.y, evoappfwk.Logger.FUNCTION);
                    var touch = currentTouches[touches[i].identifier];
                    if (touch) {
                        if ((p.x == touch.point.x) && (p.y == touch.point.y)) break;
                        touch.point = p;
                        drawPoint(touch);
                    }
                }
            }

            function touchEnd(touchEvent) {
                var i;
                touchEvent.preventDefault();
                touchEvent.stopPropagation();
                evoappfwk.Logger.log("KaigiWidget", "touch event: " + touchEvent.type, evoappfwk.Logger.FUNCTION);
                var touches = touchEvent.changedTouches;
                for (i = 0; i < touches.length; i++) {
                    var touch = currentTouches[touches[i].identifier];
                    if (touch) {
                        delete currentTouches[touch.id];
                        stopDrawing(touch);
                    }
                }
            }

            function touchCancel(touchEvent) {
                evoappfwk.Logger.log("KaigiWidget", "ontouchcancel", evoappfwk.Logger.FUNCTION);
                var _this = touchEvent.target;
                _this.removeEventListener("touchmove", touchMove, false);
                _this.removeEventListener("touchend", touchEnd, false);
                _this.removeEventListener("touchcancel", touchCancel, false);
                lastPoint = null;
                setTimeout(function() {
                    stopDrawing();
                }, 0);
            }
        }
        //end android

        var initialize = function() {
            // dsmIndicator.style.backgroundColor="#0c0";
            context = canvas.getContext("2d");
            context.fillStyle = "blue";
            context.strokeStyle = "black";
            context.lineJoin = "round";
            context.lineWidth = lineWidth;
            context.font = "bold 16px sans-serif";
            evoappfwk.Logger.log("KaigiWidget", "filling text!", evoappfwk.Logger.FUNCTION);
        };

        var privateSetColorBar = function() {
            evoappfwk.Logger.log("KaigiWidget", "not valid anymore", evoappfwk.Logger.FUNCTION);
        };

        /**
         *  new Hubert's implementation
         **/
        currentPathsDSMList = new DSM.ListReplica("kaigi_page_" + id + "_paths");
        evoappfwk.Logger.log("KaigiWidget", "will attach currentPathsDSMList", evoappfwk.Logger.FUNCTION);
        currentHighlightsDSMHash = new DSM.HashReplica("kaigi_page_" + id + "_highlights");
        evoappfwk.Logger.log("KaigiWidget", "will attach currentHighlightsDSMHash", evoappfwk.Logger.FUNCTION);
        hash = new DSM.HashReplica("kaigi_page_" + id);
        this.dsmRef.attachChild([currentPathsDSMList, currentHighlightsDSMHash, hash], function() {
            //dsm.attachChild([currentPathsDSMList, currentHighlightsDSMHash, hash], function () {
            var i;
            /* TODO
            if (!self.imageUrl)
              self.imageUrl = hash.get("imageUrl");
            else {
              if (!hash.get("imageUrl")) {
                hash.set("imageUrl", self.imageUrl);
                hash.commit();
              }
            }
            */
            initialize();

            var tempColor = hash.get("changeBackgroundColorDiv");
            if (tempColor) {
                $(backgroundCanvas).css("backgroundColor", tempColor);
                self.setBackgroundColor(tempColor);
                for (i = 0; i < tabs.length; i++) {
                    if (tabs[i].hasFocus) {
                        tabs[i].refreshGui(i);
                        break;
                    }
                }
            }

            if (imageUrl) {
                drawImage('image', imageDrawSuccess, null, [imageUrl]);
                setTimeout(function() {
                    hash.set("image", imageUrl);
                    hash.commit();
                }, 2500);

                //hash.commit();
                //drawImageFromReader(imageUrl);
            } else {
                imageUrl = hash.get("image");
                if (imageUrl) {
                    drawImage('image', imageDrawSuccess, null, [imageUrl]);
                }
            }

            for (i = 0; i < currentPathsDSMList.size(); i += 1) {
                var pathInfo = currentPathsDSMList.get(i);
                var path = JSON.parse(pathInfo);
                if (!currentPaths[path.id]) {
                    currentPaths[path.id] = new Path(self, path);
                    if (currentPaths[path.id].state === "new") {
                        currentPaths[path.id].remoteAttachToDSM();
                    } else if (currentPaths[path.id].state === "done") {
                        currentPaths[path.id].drawConcurrently(0);
                    } else {
                        // ignore
                    }
                }
            }

            // evoappfwk.Logger.log("KaigiWidget", "we have imageUrl: " + self.imageUrl, evoappfwk.Logger.FUNCTION);

            currentPathsDSMList.remoteupdate = function(op) {
                var i;
                evoappfwk.Logger.log("KaigiWidget", "currentPathsDSMList got type: " + op.type + " on item: " + op.item + " with value: " + op.value, evoappfwk.Logger.FUNCTION);
                switch (op.type) {
                    case DSM.Operation.ADD:
                    case DSM.Operation.SET:
                        var pathInfo = op.item;
                        var path = JSON.parse(pathInfo);
                        if (!currentPaths[path.id]) {
                            currentPaths[path.id] = new Path(self, path);
                            if (currentPaths[path.id].state === "new") {
                                currentPaths[path.id].remoteAttachToDSM();
                            } else
                            if (currentPaths[path.id].state === "done") {
                                currentPaths[path.id].drawConcurrently(currentPaths[path.id].lastPointIndexDrawn);
                                currentPaths[path.id].detachFromDSM(false);
                            } else {
                                // ignore
                            }
                        } else {
                            currentPaths[path.id].update(path);
                            if (currentPaths[path.id].state === "done") {
                                currentPaths[path.id].drawConcurrently(currentPaths[path.id].lastPointIndexDrawn);
                                currentPaths[path.id].detachFromDSM(false);
                            }
                        }
                        break;
                    case DSM.Operation.DEL:
                        var pathInfo = op.item;
                        var path = JSON.parse(pathInfo);
                        if (currentPaths[path.id]) {
                            var dpath = currentPaths[path.id];
                            delete currentPaths[dpath.id];
                            dpath.detachFromDSM(false);
                            self.drawAllPaths();
                        }
                        break;
                    case DSM.Operation.CLEAR:
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        //backgroundContext.clearRect(0,0, canvas.width, canvas.height);
                        //highlightContext.clearRect(0,0, canvas.width, canvas.height);
                        var currentPathsIds = Object.keys(currentPaths);
                        for (i = 0; i < currentPathsIds.length; i++) {
                            var dpath = currentPaths[currentPathsIds[i]];
                            delete currentPaths[dpath.id];
                            dpath.detachFromDSM(false);
                        }
                        self.drawAllPaths();
                        // self.imageUrl = null;
                        break;
                }
            };

            if (Object.keys(currentHighlights).length > 0) {
                self.drawAllHighlights();
            }
            hash.update = function(op) {
                //evoappfwk.Logger.log("KaigiWidget", "Got hash update: type: " + op.type + " key: " + op.key + " value: " + op.value, evoappfwk.Logger.FUNCTION); // TODO - remove after debugging
                var JSONTemp;
                if (op.type === DSM.Operation.SET) {
                    if (op.key === "image") {
                        if (op.value) {
                            queueImage.add(drawImage, 'image', imageDrawSuccess, null, [op.value]);
                        } else {
                            evoappfwk.Logger.log("KaigiWidget", "clear background", evoappfwk.Logger.FUNCTION);
                            //clearBackgroundDiv();
                            //queueImage.add(clearBackgroundDiv, 'image', imageDeleteSuccess, null, [op.value]);
                            queueImage.add(deleteImage, 'deleteImage', imageDeleteSuccess, imageDeleteSuccess, [op.value]);
                        }
                    } else if (op.key === "changeBackgroundColorDiv") {
                        if (op.value) {
                            $(backgroundCanvas).css("backgroundColor", op.value);
                            self.setBackgroundColor(op.value);
                            evoappfwk.Logger.log("KaigiWidget", "changeBackgroundColorDiv", evoappfwk.Logger.FUNCTION);
                        } else {
                            $(backgroundCanvas).css("backgroundColor", "white");
                            self.setBackgroundColor(op.value);
                        }
                    }
                } else if (op.type === DSM.Operation.DEL) {
                    /*
                    evoappfwk.Logger.log("KaigiWidget", "hash replica del operation", evoappfwk.Logger.FUNCTION);
                    clearBackgroundDiv();
                    $(backgroundCanvas).css("backgroundColor", "white");
                    */
                }
            };

            hash.remoteupdate = function(op) {
                if (op.key == "startHighlight_" + remoteUserId) {
                    evoappfwk.Logger.log("KaigiWidget", "startHighlight_: " + isHighlighting, evoappfwk.Logger.FUNCTION);
                    isRemoteHighlighting = true;
                    highlightCanvas.style.zIndex = 3;
                    evoappfwk.Logger.log("KaigiWidget", "setting setHighlightDivListener: " + isHighlighting, evoappfwk.Logger.FUNCTION);
                    highlightCanvas.appendChild(highlightImageDivRemote);
                    evoappfwk.Logger.log("KaigiWidget", "setting setHighlightDivListener: " + isHighlighting, evoappfwk.Logger.FUNCTION);
                    if (isHighlighting == false) {
                        setHighlightDivListener();
                        evoappfwk.Logger.log("KaigiWidget", "setting setHighlightDivListener:" + isHighlighting, evoappfwk.Logger.FUNCTION);
                    }
                } else
                if (op.key == "highlightDiv_" + remoteUserId) {
                    setTimeout(function() {
                        JSONTemp = JSON.parse(op.value);
                        highlightDivRemote(JSONTemp.posX, JSONTemp.posY, displayName);
                        //evoappfwk.Logger.log("KaigiWidget", "remote highlight", evoappfwk.Logger.FUNCTION);
                        //evoappfwk.Logger.log("KaigiWidget", JSONTemp.posX + " " + JSONTemp.posY, evoappfwk.Logger.FUNCTION);
                        //evoappfwk.Logger.log("KaigiWidget", "update highlightDiv: " + whoIs, evoappfwk.Logger.FUNCTION);
                    }, 0);
                } else
                if (op.key == "endHighlightDiv_" + remoteUserId) {
                    isRemoteHighlighting = false;
                    highlightCanvas.removeChild(highlightImageDivRemote);
                    if (isHighlighting == false) {
                        disableHighlightListeners();
                        highlightCanvas.style.zIndex = 1;
                    }
                    evoappfwk.Logger.log("KaigiWidget", "end remote highlight", evoappfwk.Logger.FUNCTION);
                }
            }
        });
    }; // end Page

    /**
     * Function creates a new widget tab where a new page is drawn.
     * @param config.tag            reference to the tag where the tab is to be atached
     * @param config.dsm            reference to the dsm object
     * @param config.pageId         id of the page (now tab)
     * @param config.imageUrl       URL of the background image
     * @param {boolean} skipReposition indicates whether repositioning tabs should be skipped (true) or not;
     * @param config.contextMenu    reference to the contextual menu object
     * @param {boolean } create
     * this can be handy when i.e. tab is added by remote user - there is no need to move to that new window
     */
    var addTab = function(config) {
        evoappfwk.Logger.log("KaigiWidget", "now you will get another page, ID: " + config.pageId + ", skipping reposition: " + config.skipReposition, evoappfwk.Logger.FUNCTION);

        var p = new evowidget.kaigiwidget.Page(config.pageId, config.tag, config.dsm, config.imageUrl),
            tabConfig = {
                uiTag: uiTag,
                tabs: tabs
            },
            tab = new evowidget.kaigiwidget.Tab(tabs.length, p, tabConfig, config.contextMenu);

        var skipReposition = (config.skipReposition !== undefined ? config.skipReposition : false);

        tab.setGui(gui);
        tab.setDeleteHandler(deleteTabViaEventBus);
        tabs.push(tab);
        readjustTabs();

        if (evoappfwk.PlatformSelector.getPlatform() != evoappfwk.PlatformType.DESKTOP) {
            tab.focus();
        } else {
            if (!skipReposition || tabs.length == 1) { // not focusing when remote added page/tab (prevents unwanted far jump from our working tab to new one)
                tab.focus();
            }
        }

        if (platformType == evoappfwk.PlatformType.DESKTOP && tabManager != undefined) {
            evoappfwk.Logger.log("KaigiWidget", "addTab - executing tab navigation actions", evoappfwk.Logger.FUNCTION);
            if (skipReposition != true) {
                tabManager.shiftVisibleWindow(evoappfwk.TabManager.shiftaction.GOTO_END);
            } else {
                // perform just 'tiny repositioning'
                tabManager.shiftVisibleWindow(evoappfwk.TabManager.shiftaction.BASIC_SHIFT);
            }
        }
        return tab;
    };

    readjustTabs = function() {
        var i;
        evoappfwk.Logger.log("KaigiWidget", "readjusting tabs, no: " + tabs.length, evoappfwk.Logger.FUNCTION);
        for (i = 0; i < tabs.length; i++) {
            tabs[i].index = i;

            tabs[i].setTitle("Page " + (i + 1));
            /* TODO meaningful ?
            if(tabs[i].title == "Page " + (i+2)){
                tabs[i].setTitle("Page " + (i+1));
            };
            */
            var tabElement = tabs[i].domElement;
            // tabElement.style.width = 93/tabs.length + "%";
            // tabElement.style.width = 100/tabs.length + "%"; //
            tabElement.style.width = "33%"; // NOTE: tab should stretch in case less tabs are present
        }
    };

    function onTabManagerAction(action, actionData) {
        if (action == evoappfwk.TabManager.guiaction.SET_NAVIGATION_BUTTON) {
            gui.turnTabNavigationBtn(actionData);
        }
    };

    deleteTabAndroid = function(uid) {
        var tab = getTabByUid(uid);
        var index = tabs.indexOf(tab);
        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].uid !== uid) {
                tabs[i].focus();
                break;
            }
        }
        tabs[index].remove();
        tabs.splice(index, 1);

        readjustTabs();

        return index;
    };

    deleteTab = function(uid) {
        evoappfwk.Logger.log("KaigiWidget", "deleteTab, uid: " + uid, evoappfwk.Logger.FUNCTION);

        var tab = getTabByUid(uid);
        var index = tabs.indexOf(tab);
        if (tab.hasFocus) {
            if (tab.index !== 0) {
                tabs[tab.index - 1].focus();
            } else {
                if (tabs.length > 1) {
                    tabs[1].focus();
                }
            }
        }
        tab.remove();
        tabs.splice(index, 1);
        readjustTabs();

        if (tabManager) {
            tabManager.shiftVisibleWindow(evoappfwk.TabManager.shiftaction.SHIFT_AFTER_DELETE, {
                removedIdx: index
            });
        }

        if (tabs.length == 0)
            gui.hideToolMenuButton();

        return index;
    };

    function getTabByPageId(pageId) {
        var i;

        evoappfwk.Logger.log("KaigiWidget", "getTabByPageId: " + pageId, evoappfwk.Logger.FUNCTION);

        for (i = 0; i < tabs.length; i += 1) {
            if (tabs[i].page.id === pageId) {
                evoappfwk.Logger.log("KaigiWidget", "getTabByPageId: returning tab from index " + i, evoappfwk.Logger.FUNCTION);
                return {
                    tab: tabs[i],
                    index: i
                };
            }
        }
        evoappfwk.Logger.log("KaigiWidget", "getTabByPageId: returning null", evoappfwk.Logger.FUNCTION);
        return null;
    }

    function logTabsDSMList(title) {
        var i;
        evoappfwk.Logger.log("KaigiWidget", "logTabsDSMList: " + title, evoappfwk.Logger.FUNCTION);
        evoappfwk.Logger.log("KaigiWidget", "size: " + tabs_DSMList.size(), evoappfwk.Logger.FUNCTION);
        for (i = 0; i < tabs_DSMList.size(); i++) {
            evoappfwk.Logger.log("KaigiWidget", "index: " + i + " contains: " + tabs_DSMList.get(i), evoappfwk.Logger.FUNCTION);
        };
    }

    evowidget.kaigiwidget.Tab = function(index, page, config, contextMenu) {
        var self = this,
            tabTableId = "wb_tab_table_" + config.uiTag;

        // this.randomId = "TAB_" + utilities.getId(); for test purposes
        // evoappfwk.Logger.log("KaigiWidget", "Creating new tab with randomId = " + this.randomId, evoappfwk.Logger.FUNCTION);

        Object.defineProperty(this, "uid", {
            value: evowidget.kaigiwidget.Tab.uid++,
            writable: false
        });

        this.tabs = config.tabs;
        this.contextMenu = contextMenu;
        if (this.contextMenu) {
            this.contextMenu.onmenuitem = onmenuitem;
        }

        this.index = index;
        this.page = page;
        this.restoreCtxMenu = false;

        var tabRow = document.getElementById(tabTableId).rows[0];
        this.domElement = tabRow.insertCell(this.index);
        evoappfwk.Logger.log("KaigiWidget", "tab class name: " + tabClassName, evoappfwk.Logger.FUNCTION);
        this.domElement.className = tabClassName;
        this.domElement.style.webkitUserDrag = "element";
        this.titleDiv = document.createElement("div");
        this.titleDiv.id = "wbTitleDiv_" + config.uiTag;
        this.titleDiv.className = "wbTitleDiv";

        this.domElement.appendChild(this.titleDiv);

        this.closeIconDiv = document.createElement("div");
        this.closeIconDiv.id = "wbCloseIconDiv_" + config.uiTag;
        this.closeIconDiv.className = "wbCloseIconDiv";

        this.crossImage = document.createElement("img");
        this.crossImage.id = "wb_close_icon_" + config.uiTag;
        this.crossImage.className = "wb_close_icon";
        //this.crossImage.src = platformPath + "themes/img/retina/wb_menu_close.png";
        this.closeIconDiv.appendChild(this.crossImage);

        this.domElement.appendChild(this.closeIconDiv);

        this.getId = function() {
            return this.page.id;
        };

        this.addMenu = function(menu, menuTag, sideMenuTag) {
            // evoappfwk.Logger.log("KaigiWidget", "Adding context menu: " + menu.randomId + " to tab:randomId = " + this.randomId, evoappfwk.Logger.FUNCTION);
            this.contextMenu = menu;
            this.contextMenu.onmenuitem = onmenuitem;

            if (platformType === evoappfwk.PlatformType.ANDROID_TABLET) {
                this.page.setContextMenuTag(menuTag, sideMenuTag);
            }
        };

        this.getMenu = function() {
            return this.contextMenu;
        };

        this.getMiniature = function() {
            return this.page.getMiniature();
        };

        this.focus = function() {
            var i;
            evoappfwk.Logger.log("KaigiWidget", "focusing start", evoappfwk.Logger.FUNCTION);
            for (i = 0; i < this.tabs.length; i++) {
                this.tabs[i].hide();
            }
            this.show();
            this.hasFocus = true;
            evoappfwk.Logger.log("KaigiWidget", "focusing end", evoappfwk.Logger.FUNCTION);
        };

        this.hide = function() {
            this.domElement.className = tabClassName;

            //temporary solution add by GRLE
            if (platformType != evoappfwk.PlatformType.ANDROID_PHONE || platformType != evoappfwk.PlatformType.ANDROID_TABLET) {
                this.page.hide();
            }
            if (this.getMenu() && this.getMenu().isDisplayed() === true) {
                this.getMenu().hide();
                this.setRestoreContextMenu(true);
            }
            this.hasFocus = false;
        };

        /**
         * Hides only tab, not related contents
         */
        this.hideTab = function() {
            evoappfwk.Logger.log("KaigiWidget", "hiding tab with index: " + this.index, evoappfwk.Logger.FUNCTION);
            this.domElement.style.display = "none";
        };

        /**
         * Hides page
         */
        this.hidePage = function() {
                this.page.hide();

                if (this.getMenu() && this.getMenu().isDisplayed() === true) {
                    this.getMenu().hide();
                    this.setRestoreContextMenu(true);
                }
            }
            /**
             * Shows only tab, not related contents 
             */
        this.showTab = function() {
            evoappfwk.Logger.log("KaigiWidget", "showing tab with index: " + this.index, evoappfwk.Logger.FUNCTION);
            this.domElement.style.display = "block";
        };

        this.showPage = function() {
            this.page.show();

            /*if(this.getMenu() && this.restoreContextMenu() === true) {
                this.getMenu().show();
                this.setRestoreContextMenu(false);
            }*/
        }

        this.show = function() {
            evoappfwk.Logger.log("KaigiWidget", "showing tab: " + this, evoappfwk.Logger.FUNCTION);
            this.domElement.className = tabClassName + " " + tabSelectedClassName;

            //temporary solution add by GRLE
            // TODO SLHU_PCP !
            if (platformType != evoappfwk.PlatformType.ANDROID_PHONE || platformType != evoappfwk.PlatformType.ANDROID_TABLET) {
                this.page.show();
                // this.refreshGui(this.index); // TODO have in mind context menu switch instead!
            } else {
                // is this for android ??
                // this.page.setColorBar();
                // updateThicknessDivs(this.page.getThicknessIndex());
            }

            if (this.getMenu() && this.restoreContextMenu() === true) {
                this.getMenu().show();
                this.setRestoreContextMenu(false);
            }

            evoappfwk.Logger.log("KaigiWidget", "showing tab end", evoappfwk.Logger.FUNCTION);
        };

        /**
         * Indicates whether the context menu should be shown again after showing associated tab 
         */
        this.setRestoreContextMenu = function(restore) {
            this.restoreCtxMenu = restore;
        };

        this.restoreContextMenu = function() {
            return this.restoreCtxMenu;
        };

        /**
         *  
         */
        this.refreshGui = function(activeTabId) {
            evoappfwk.Logger.log("KaigiWidget", "refresh gui start");
            if (typeof this.gui.update === 'function') {
                this.gui.update(activeTabId);
            }
        };

        this.toString = function() {
            var obj = {
                "title": this.title,
                "pageId": this.page.id,
                "index": this.index
            };
            return JSON.stringify(obj);
        };

        this.setTitle = function(newTitle) {
            evoappfwk.Logger.log("KaigiWidget", "setting up tab title to " + newTitle, evoappfwk.Logger.FUNCTION);
            this.title = newTitle;
            //this.domElement.innerHTML = newTitle;
            this.titleDiv.innerHTML = newTitle;
        };

        this.setTitle("Page " + (index + 1));

        /**
         * retrieve tag for this tab
         */
        this.getTag = function() {
            return this.page.getTag();
        };

        this.remove = function() {
            this.contextMenu.remove();
            this.page.remove();
            tabRow.deleteCell(this.tabs.indexOf(this));
        };

        this.setGui = function(gui) {
            this.gui = gui;
        };

        this.setDeleteHandler = function(handler) {
            this.deleteTabHandler = handler;
        };

        //event handlers
        if (platformType == evoappfwk.PlatformType.DESKTOP) {

            // tab delete
            this.closeIconDiv.addEventListener("click", function(evt) {
                evoappfwk.Logger.log("KaigiWidget", "deleting tab clicked, index: " + self.index, evoappfwk.Logger.FUNCTION);
                evt.stopPropagation();
                //deleteTabViaEventBus(self.index);
                self.deleteTabHandler(self.uid);
                // deleteTabViaEventBus(self.uid);

                evoappfwk.Logger.log("KaigiWidget", "click handling end", evoappfwk.Logger.FUNCTION);
            }, false);

            // tab switch
            this.domElement.addEventListener("click", function() {
                evoappfwk.Logger.log("KaigiWidget", "clicked dom element", evoappfwk.Logger.FUNCTION);
                if (self != undefined && self.hasFocus) return true;
                self.focus();
            });

            /*
            this.domElement.addEventListener("dblclick", function () {
                this.style.webkitUserSelect = "text";
                this.contentEditable = "true";
            }, false);*/


            this.domElement.addEventListener("keydown", function(e) {
                if (e.keyCode == 13) {
                    evoappfwk.Logger.log("KaigiWidget", "enter", evoappfwk.Logger.FUNCTION);
                    if (this.contentEditable) {
                        this.contentEditable = "false";
                        this.style.webkitUserSelect = "none";
                        this.blur();
                        //self.title = this.innerHTML;
                        self.title = self.titleDiv.innerHTML;
                        tabs_DSMList.set(self.tabs.indexOf(self), self.toString());
                        tabs_DSMList.commit();
                    }
                }
            }, false);
        }


        //***********************Functions triggered by the contextual menu actions

        function endHighlight() {
            if (self.page.isHighlightingDiv) {
                self.page.endHighlightDiv();
                self.page.isHighlightingDiv = false;
            }
        }


        function startHighlight() {

            if (!self.page.isHighlightingDiv) {
                self.page.isHighlightingDiv = true;
                self.page.startHighlightDiv();
            }
        }


        this.imagelist=new Array();
        this.imageindex=0;
        /**
         * Function receives the actions from the ContextMenu
         */
        function onmenuitem(evt) {

            var i, len,
                allCtxMenusHidden = true;

            if (evt.id === "btnhide") {
                // check if ALL context menus are hidden, if so - notify gui
                for (i = 0, len = self.tabs.length; i < len; i += 1) {
                    if (self.tabs[i].getMenu().isDisplayed() === true) {
                        allCtxMenusHidden = false;
                        break;
                    }
                }
                if (allCtxMenusHidden) {
                    self.gui.allCtxMenusOff();
                }
            }
            if (evt.id === "btnbrush") { //code == "SET_DRAWING_ACTIVE") {
                endHighlight();
                self.page.isHighlightingDiv = false;
                self.page.setIsErasing(false);
            } else
            if (evt.id.indexOf("wbCOLOR_PALETTE") !== -1) { //code == "CHANGE_COLOR"){
                evoappfwk.Logger.log("KaigiWidget", "Changing brush color to: " + evt.color, evoappfwk.Logger.FUNCTION);
                self.page.setBrushColor(evt.color);
            } else
            if (evt.id.indexOf("wbBackgroundCOLOR_PALETTE") !== -1) { //code == "CHANGE_BG_COLOR") {
                evoappfwk.Logger.log("KaigiWidget", "Changing background color to " + evt.color, evoappfwk.Logger.FUNCTION);
                self.page.changeBackgroundColorDiv(evt.color);
            } else
            if (evt.id.indexOf("brushsize") !== -1) { //code == "CHANGE_THICKNESS") {
                endHighlight();
                self.page.setThickness(evt.value);
            } else
            if (evt.id === "btneraser") { //code == "CHANGE_ERASING") {
                endHighlight();
                self.page.setIsErasing(true);
            } else
            if (evt.id === "btneraseall") { //code == "ERASE_ALL") {
                endHighlight();
                self.page.eraseAll();
                evt.item.setActive(false);
                //                self.getMenu().setActive(false, 'btneraseall');   //Alternative way
            } else
            if (evt.id.indexOf("erasersize") !== -1) { //code == "CHANGE_ERASE_THICKNESS") {
                self.page.setEraseSize(evt.value);
            } else
            if (evt.id === "btnpointer") { //code == "CHANGE_HIGHLIGHTING") {
                startHighlight();
            } else
            if (evt.id === "btnaddphoto") {
                self.imagelist.push(evt.data);
                self.imageindex=self.imagelist.length-1;
                self.page.drawImageFromReader(evt.data);
            } else
            if (evt.id === "btnundolast") { //code == "UNDO_LAST") {
                self.page.undoLast();
                evt.item.setActive(false);
                //                self.getMenu().setActive(false, 'btnundolast');   //Alternative way
            } else
            if (evt.id === "btn-speech-danmaku") {
                //TODO 
                var moelist = [
                    'moe',
                    'lol',
                    ':)',
                    'T_T'
                ];
                selfWidget.updateDanmaku(moelist[parseInt(4 * Math.random())]);
                selfWidget.setupSpeechToText();
                evt.item.setActive(false);
            } else
            if (evt.id === "btn-slide-show-upload") {
                //TODO 
                alert("TO BE IMPLEMENT")
                evt.item.setActive(false);
            } else
            if (evt.id === "btn-slide-show-prev") {
                self.imageindex--;
                if(self.imageindex<0)
                    self.imageindex=0;
                if(self.imagelist[self.imageindex]!==undefined)
                    self.page.drawImageFromReader(self.imagelist[self.imageindex]);
                evt.item.setActive(false);
            } else
            if (evt.id === "btn-slide-show-next") {
                self.imageindex++;
                if(self.imageindex>=self.imagelist.length)
                    self.imageindex=self.imagelist.length-1;
                if(self.imagelist[self.imageindex]!==undefined)
                    self.page.drawImageFromReader(self.imagelist[self.imageindex]);
                evt.item.setActive(false);
            }
        }
    }; // end Tab class

    evowidget.kaigiwidget.Tab.uid = 0;

    this.close = function(recipient) {
        evoappfwk.Logger.log("KaigiWidget", "gui hidden, notifying contact list, recipient: " + recipient, evoappfwk.Logger.FUNCTION);
        self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.OFF, true);
    };

    this.onTabNavBackward = function() {
        if (tabManager) {
            tabManager.shiftVisibleWindow(evoappfwk.TabManager.shiftaction.BACKWARD);
        }
    };

    this.onTabNavForward = function() {
        if (tabManager) {
            tabManager.shiftVisibleWindow(evoappfwk.TabManager.shiftaction.FORWARD);
        }
    };

    this.getActiveTab = function() {
        var i;
        for (i = 0; i < tabs.length; i++) {
            if (tabs[i].hasFocus)
                return tabs[i];
        }
        evoappfwk.Logger.error("KaigiWidget", "no tab was active", evoappfwk.Logger.FUNCTION);
        return "ERROR: No active tab";
    };

    this.getActiveTabId = function() {
        var activeTab = this.getActiveTab();
        evoappfwk.Logger.log("KaigiWidget", "active tab id is: " + activeTab.index, evoappfwk.Logger.FUNCTION);
        return activeTab.index;
    };

    this.isActivationReported = function() {
        return this.activationReported;
    };
    this.setActivationReported = function(reported) {
        this.activationReported = reported;
    };

    this.remoteKaigiStarted = function() {
        evoappfwk.Logger.log("KaigiWidget", " remote WB started", evoappfwk.Logger.FUNCTION);
        if (typeof gui.isDisplayed === 'function') {
            if (!gui.isDisplayed('final')) {

                var user = (displayName ? displayName : utilities.getDisplayNameFromUri(config.remoteUserUri));
                gui.showRemoteWidgetStartedNotification(user);
                gui.show();

                requestContactUpdate();

                self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.ON, false);
            }
        }
    };

    this.remoteKaigiClosed = function() {
        evoappfwk.Logger.log("KaigiWidget", "[remoteKaigiClosed]", evoappfwk.Logger.FUNCTION);
        if (typeof gui.isDisplayed === 'function') {
            if (gui.isDisplayed()) {
                gui.hide();
                self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.OFF, false);
            }
        }
    };

    function requestContactUpdate() {
        evoappfwk.Logger.log('KaigiWidget', 'Requesting contact data refresh for ' + self.remoteUri, evoappfwk.Logger.FUNCTION);
        var evt = new evoappfwk.ContactDataEvent(evoappfwk.EventService.KAIGI, undefined);
        evt.setAction(evoappfwk.ContactDataEvent.action.DATA_REQUEST);
        evt.setRecipient(self.remoteUri);
        evoappfwk.EventBus.notify(evt);
    };

    /**
     * Creates a new context menu and associates it with specific tab 
     * @param {evowidget.kaigi.Tab} tab 
     */
    function createContextMenu(tab) {
        var contextMenu,
            widgetMenuConfig,
            contextMenuTag,
            contextMenuContainerTag;

        evoappfwk.Logger.log('KaigiWidget', 'Creating context menu for new tab', evoappfwk.Logger.FUNCTION);

        contextMenuTag = gui.getContextMenuContainerTag(tab.page.id);
        widgetMenuConfig = evoappfwk.WidgetRegistry.getMenuConfig(kaigiWidgetId);
        contextMenuContainerTag = gui.getContextMenusContainerTag();
        evoappfwk.Logger.log('KaigiWidget', 'Menu tag: ' + contextMenuTag + ", container tag: " + contextMenuContainerTag, evoappfwk.Logger.FUNCTION);

        contextMenu = evoappfwk.MenuFactory.getContextMenu(widgetMenuConfig, contextMenuTag, contextMenuContainerTag);
        tab.addMenu(contextMenu, contextMenuTag, contextMenuContainerTag);
    }


    this.updateDanmaku = function(danmakuId,text) {
        self.danmakuHash.set(danmakuId, text);
        self.danmakuHash.commit();
    }
    this.genRandomId = function() {
        return remoteUserId + Math.random().toString(36).substring(2, 15);
    }

    var lastSpeechText='';
    var danmakuId;
    var cutoff=0;
    this.setupSpeechToText=function(){
        self.SpeechToText(function(text){
            if(text==''){
                danmakuId = self.genRandomId();
                cutoff=0;
            }
            if(text.length>cutoff+130){
                self.updateDanmaku(danmakuId,text.substr(cutoff,100));
                cutoff=cutoff+100;
                danmakuId = self.genRandomId();
            }
            self.updateDanmaku(danmakuId,text.substr(cutoff));
            if(text.length<lastSpeechText.length-10){
                danmakuId = self.genRandomId();
            }
            lastSpeechText=text;
        });
    }

    this.SpeechToText = function(callback, callbackForSenEnd) {
        var recognizing = false;
        var ignore_onend;
        var start_timestamp;
        var final_transcript = "";
        if (!('webkitSpeechRecognition' in window)) {
            upgrade();
        } else {
            var recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = function() {
                recognizing = true;
            };

            if (recognizing) {
                recognition.stop();
                return;
            }

            recognition.lang = 'en-US';
            recognition.start();
            ignore_onend = false;

            recognition.onerror = function(event) {
                // can give some alart for microphone status.
            };

            recognition.onend = function() {
                recognizing = false;
                if (ignore_onend) {
                    return;
                }
                if (!final_transcript) {
                    return;
                }

                if (window.getSelection) {
                    window.getSelection().removeAllRanges();
                    var range = document.createRange();
                    window.getSelection().addRange(range);
                }
            };

            recognition.onresult = function(event) {
                var interim_transcript = '';
                for (var i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final_transcript += event.results[i][0].transcript;
                    } else {
                        interim_transcript += event.results[i][0].transcript;
                    }
                }

                final_transcript = capitalize(final_transcript);

                if (final_transcript != "") {
                    final_transcript = "";
                    if(callbackForSenEnd!==undefined)
                        callbackForSenEnd() ;
                }
                if(callback!==undefined)
                    callback(linebreak(interim_transcript));
            };
        }

        function upgrade() {
            //can show notification for user to update the microphone
        }

        var two_line = /\n\n/g;
        var one_line = /\n/g;

        function linebreak(s) {
            return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
        }

        var first_char = /\S/;

        function capitalize(s) {
            return s.replace(first_char, function(m) {
                return m.toUpperCase();
            });
        }
    }


}

evowidget.KaigiWidget.prototype.constructor = evowidget.KaigiWidget;
