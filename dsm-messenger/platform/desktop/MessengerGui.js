/**
* Handler of the Messenger GUI which visualizes a message flow.
* @param config.tag				MANDATORY: the tag of the document element where the widget will be appended
* @param config.userUri			MANDATORY: SIP uri of the remote user
* @param config.displayName		MANDATORY: display name of the remote user
* @param config.platformPath
* @param config.parent
* @param config.mainContainerTag
* @pram config.localUser
*/
evowidget.MessengerGui = function(config, onsuccess, onerror) {
    evoappfwk.Logger.log('MessengerGui', 'Creating messenger GUI', evoappfwk.Logger.FUNCTION);
	var self = this,	
		loadFiles = [],
		platform = evoappfwk.PlatformSelector.getPlatform(),
		progressBar = {},
		platformPath = config.platformPath,
		messengerContainerEl,
		localPhoto = (evoappfwk.myProfile && evoappfwk.myProfile.getPhoto() ? evoappfwk.myProfile.getPhoto().dataURL : anonymousIconBase64_blue), 
		remotePhoto = anonymousIconBase64_blue,
		tagId = utilities.getIdfromUri(config.remoteUser.uri),
		messengerOutput = 'messenger_output_' + tagId,
		messengerInputBoxId = 'messenger_input_box_' + tagId,
		messengerInputId = 'messenger_input_' + tagId,
		messengerSendBtnId = 'messenger_send_btn_' + tagId,
		contextMenuBtnId = "messenger_context_menu_btn_" + tagId,
		contextMenuBtn,
		contextMenu,
		contextMenuContainerId = "messenger_context_menu_" + tagId,
		contextMenuContainerTag = "messenger_context_menu_tag" + tagId,
		contextMenuContainer,
		messengerInput = null,
		messengerSendButton = null,
		messengerBottomBoxId = 'messenger_bottom_box_' + tagId,
		messengerSendMethodChooser = 'messenger_send_method_chooser' +  tagId,
		widgetIcons = {
			activeIcon: config.parent.getPlatformPath() + "themes/img/messenger_active_black.png",
			inactiveIcon: config.parent.getPlatformPath() + "themes/img/messenger_active_blue.png"
		},
		notification,
        notificationIcon = config.parent.getPlatformPath() + "themes/img/messenger_orange.png",
		messengerWindow,
		messengerWrapper,
		activityTimer = null,
		activityTimer_offset = 2000,
		html = 
		//Menu area
		'<div id="' + contextMenuBtnId + '" class=contextMenuButton>' +
			'<img class="wb_control_icon" src="'+config.parent.getPlatformPath()+'themes/img/tool_menu.png">' +
		'</div>' +
		'<div id="' + contextMenuContainerTag + '" class=contextMenu>' +
		'</div>' +
		// output area
		'<div id="' + messengerOutput + '" class="messenger_output">' +
		'</div>' +
		// input area
		'<div id="' + messengerInputBoxId + '" class="messenger_input_box">' +
			'<div class="messenger_input_container">' +
                // text input
				'<textarea id="' + messengerInputId + '" class="messenger_input" autofocus="autofocus" maxlength="1200" ></textarea>' +
			'</div>' +
			'<div class="messenger_send_container">' +
				'<div id="' + messengerSendBtnId + '" class="messenger_send_button">' +
					'<div class="messenger_send_button_arrow">' +
					'</div>' +
				'</div>' +
			'</div>' +
		'</div>' +
		// bottom bar
		'<div id="' + messengerBottomBoxId + '" class="messenger_bottom_box">' +
			// send after ENTER checkbox
			'<div class="messenger_send_method_container">' +
				'<input type="checkbox" id="' + messengerSendMethodChooser + '" class="messenger_send_method_chooser" checked />' +
				'<span class="messenger_send_method_description">Send after ENTER</span>' +
			'</div>' +
			// finfo bar
			'<div class="messenger_info_bar">' +
			'</div>' +
		'</div>',
	navigationEvent = new evoappfwk.WidgetGuiStateEvent(evoappfwk.EventService.WIDGET, undefined),
	positionEvent = new evoappfwk.WidgetGuiStateEvent(evoappfwk.EventService.WIDGET, undefined);
	
	navigationEvent.setWidgetInstanceId(config.parent.getInstanceId());
	positionEvent.setWidgetInstanceId(config.parent.getInstanceId());
    positionEvent.setGuiAction(evoappfwk.Widget.EVENT.WIDGET_POSITION);
    if(config.tag) { 
        messengerContainerEl = document.getElementById(config.tag);
    } else {
        evoappfwk.Logger.warn('MessengerGui', 'Parent tag not provided, using body', evoappfwk.Logger.FUNCTION);
        messengerContainerEl = document.body;
    }
		
	loadFiles.push({type:"style", filename: platformPath + "themes/css/style_messenger.css"});
	evoappfwk.FileLoader.loadSources(loadFiles, init, function() {
	    evoappfwk.Logger.error('MessengerGui', 'error loading files', evoappfwk.Logger.FUNCTION);
	});
	
	function init() {
	    evoappfwk.Logger.log('MessengerGui', 'init()', evoappfwk.Logger.FUNCTION);
		self.createMessengerWindow();
		onsuccess();
	}
//*********************** public methods section	
	/**
	 * Function removes the window frame
	 */
	this.remove = function() {
		messengerWindow.remove();
		self.embeddedImages = null;
		config.parent.setVisibility(evoappfwk.WidgetVisibility.HIDDEN);
	};
		
	/**
	 * Function hides the window frame
	 */
	this.hide = function () {
	    evoappfwk.Logger.log('MessengerGui', 'Hiding messenger window', evoappfwk.Logger.FUNCTION);
		messengerWindow.close();
        config.parent.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.OFF, true);
        config.parent.setVisibility(evoappfwk.WidgetVisibility.HIDDEN);
    };
	
	/**
	 * Function shows the window frame
	 */
	this.show = function () {
	    if(!messengerWindow.isDisplayed()) {
	        evoappfwk.EventBus.notify(positionEvent);
	    }
		messengerWindow.show();
		config.parent.setVisibility(evoappfwk.WidgetVisibility.SHOWN);
		navigationEvent.setGuiAction(evoappfwk.Widget.EVENT.WIDGET_CLICK);
		evoappfwk.EventBus.notify(navigationEvent);

        window.setTimeout(function() {
            messengerWindow.updateComponentDimensions();
        }, 100);
        
	};

	/**
	 * Function shows the received message
	 */
 	this.showMessage = function(data) {
		if (data.origin = 'remote') self.showNotification("Incoming message", "from " + data.userName);
		displayMessage(data);
	}

	/**
	 * Function updates the window with the array of messages
	 */
	this.updateContent = function(messages) {
		self.showNotification("Messanger", "open");
		for (var i = 0; i<messages.length; i++) displayMessage(messages[i]);
	}
	
	/**
	 * Function sclears all the messages in the window
	 */
	this.clearMessages = function() {
		$("#" + messengerOutput).empty();
	}

	/**
	 * Function sets the Z Index of the widget frame
	 * @param {int} 	value		value of z index
	 * @param {string} 	remoteUri	uri of remote user
	 * @param {int}		top
	 */
	this.setZIndex = function(value, remoteUri, top) {
		messengerWindow.setZIndex(value, remoteUri, top);
	};
	
	/**
	 * Function gets the Z Index of the widget frame
	 * @return {int} z index
	 */
	this.getZIndex = function() {
		return messengerWindow.getZIndex();
	};
	
	/**
	 * Function sets the position of the widget frame
	 * @param position		position
	 * @param positionType	position type
	 */
	this.setPosition = function(position, positionType) {
	    evoappfwk.DOMUtils.setPosition(messengerWrapper, position, positionType);
	};
	
	/**
	 * Function gets the position of the widget frame
	 * @return {string} position
	 */
	this.getPosition = function() {
	    return evoappfwk.DOMUtils.getPosition(messengerWrapper);
	};
    
	/**
	 * Function shows the native notification
	 * @param {string} title	title of the notification
	 * @param {string} slogan	slogan of the notification
	 */
    this.showNotification = function(title, slogan) {
		if(!window.document.hasFocus())	{	//Show notification if window in the front
			window.setTimeout(function() {
				evoappfwk.Logger.log('MessengerGui', title,  evoappfwk.Logger.FUNCTION);
				notification = utilities.Notification({
						slogan: title,
						slogan2: slogan,
						icon: config.parent.getBasePath() + "themes/img/messenger_orange.png",
//						sound: config.parent.getBasePath() + "themes/media/new_message.wav",
						timeout: 7000
					});
				if(notification) {
					notification.onclose = notificationClosed;
				}
			}, 50);
		}
 
        function notificationClosed() {
            delete notification;
        };
	}
	
	/**
	 * Function shows info received from DSM
	 * @param {string} msg	the info message
	 */
	this.showInfo = function(msg) {
		$(".messenger_info_bar").text(msg);
		setTimeout(function() {$(".messenger_info_bar").text('');}, activityTimer_offset);
	}
	
	/**
	 * Function creates the window frame
	 */
	this.createMessengerWindow = function() {
	    var frameConfig;
		if(!messengerWindow) {
		    evoappfwk.Logger.log('MessengerGui', 'Creating messenger window', evoappfwk.Logger.FUNCTION); 
            frameConfig = {
                content: html,
                contentName: 'messenger',
                icons: widgetIcons,
                parent: messengerContainerEl,
                mainContainerTag: config.mainContainerTag,
                baseTag: config.parent.getInstanceId()
            };
			messengerWindow = new evoappfwk.Frame(frameConfig);
			messengerWrapper = messengerWindow.getMainTag();
			messengerWindow.addEventListener(evoappfwk.Frame.EVENT.FRAME_CLICK, function() {
				evoappfwk.Logger.log("MessengerGui", "frame has been clicked");
				navigationEvent.setGuiAction(evoappfwk.Widget.EVENT.WIDGET_CLICK);
				evoappfwk.EventBus.notify(navigationEvent);
			});
			messengerWindow.addEventListener(evoappfwk.Frame.EVENT.FRAME_CLOSE, function() {
				evoappfwk.Logger.log("MessengerGui", "frame has been closed");
				onWindowClose();
				navigationEvent.setGuiAction(evoappfwk.Widget.EVENT.WIDGET_CLOSE);
		        evoappfwk.EventBus.notify(navigationEvent);
			});
			messengerWindow.setTitle("Messenger: "+config.remoteUser.displayName);
			// context menu 
			contextMenuBtn = $("#"+contextMenuBtnId);
			contextMenuBtn.click(function() {
				openContextMenu();
			});
			contextMenuContainer = $("#"+contextMenuContainerId);
			messengerInput = document.getElementById(messengerInputId);
			messengerSendButton = document.getElementById(messengerSendBtnId);
			messengerSendButton.addEventListener("click", function() {
				sendMessage();
				messengerInput.focus();
			});
			messengerInput.onkeydown = handleKey;
            $('#' + messengerWrapper).resizable({
                start: function(evt, ui) {
                    if(!self.resizeMinHeight) {
                        $('#' + messengerWrapper).resizable( "option", "minHeight", getMinHeight());
                        self.resizeMinHeight = true;
                    }
                },
                stop: function(evt, ui) {
                    messengerWindow.updateComponentDimensions();
                },
                // minHeight: getMinHeight(),
                minWidth: 100,
                handles: 'e, s, se'
            });
            $('#' + messengerWrapper).css('height', '420');
            $('#' + messengerWrapper).css('width', '300');

            $('#' + messengerWrapper).resize(function(evt) {
                messengerWindow.updateComponentDimensions();
                updateOutputHeight();
                scaleImages();
            });
            self.show();
            config.parent.setVisibility(evoappfwk.WidgetVisibility.SHOWN);            
			evoappfwk.Logger.log('MessengerGui', 'messenger window shown', evoappfwk.Logger.FUNCTION);
			contextMenu = config.parent.createContextMenu(contextMenuContainerId, contextMenuContainerTag);        
	 		contextMenu.onmenuitem	= onmenuitem;
		}
		else {
			self.show();
		}
		
	};
	
//*********************** internalic methods section	
	function onmenuitem(evt) {
		self.clearMessages()
        if(evt.id === "btneraser") {
				config.parent.clearMessageStore();
            evt.item.setActive(false);
			contextMenu.hide();
		}
	}
	
	function openContextMenu() {
		if (contextMenu) contextMenu.show();
	};

	function showContextMenuButton() {
		contextMenuBtn.css('display', 'block');
	}
	function hideContextMenuButton() {
		contextMenuBtn.css('display', 'none');
	}
	
	function getMinHeight() {
        var outputOffset = $('#' + messengerOutput).position().top,
            inputBoxHeight = $('#' + messengerInputBoxId).height(),
            bottomBoxHeight = $('#' + messengerBottomBoxId).height(),
            minOutputHeight = 50,
            minHeight;
        minHeight = outputOffset + minOutputHeight + inputBoxHeight + bottomBoxHeight;
        evoappfwk.Logger.log('MessengerGui', 'Min height of window: ' + minHeight, evoappfwk.Logger.FUNCTION);
        return minHeight;
	}
	
	function updateOutputHeight() {
        var outputOffset = $('#' + messengerOutput).position().top,
            windowHeight = $('#' + messengerWrapper).height(),
            inputBoxHeight = $('#' + messengerInputBoxId).height(),
            bottomBoxHeight = $('#' + messengerBottomBoxId).height(),            
            newOutputHeight;
        newOutputHeight = windowHeight - inputBoxHeight - bottomBoxHeight - outputOffset;
        evoappfwk.Logger.log('MessengerGui', 'Setting new height of output to ' + newOutputHeight, evoappfwk.Logger.FUNCTION);            
        $('#' + messengerOutput).css('height', newOutputHeight);
	}
	
	function onWindowClose() {
        evoappfwk.Logger.log('MessengerGui', 'Closing window', evoappfwk.Logger.FUNCTION);
        self.hide();	    
		config.parent.quit();
	}
	
	function sendMsgOnEnter() {
		return $("#" + messengerSendMethodChooser).prop('checked');
	}
	
	function handleKey(evt) {
		if (evt.srcElement.id.indexOf("messenger_input_") != -1) {
			if (evt.keyCode == 13) {
				if (evt.srcElement.id.indexOf("messenger_input_") != -1 && sendMsgOnEnter()) {
					evt.preventDefault();
					evt.stopPropagation();
					messengerInput.focus();
					sendMessage();
				}
			}
			else {
				if (!activityTimer) config.parent.sendInfo(config.displayName + " is typing");
				activityTimer = setTimeout(function(){
											activityTimer = null;
										}, activityTimer_offset);
			}
		}
	}
	
	function sendMessage () {
		var msg = messengerInput.value;
		messengerInput.value = "";
		if (msg != "") {
			var msgData = {
				photo: localPhoto,
				userName: config.displayName,
				time: evoappfwk.DateTimeUtils.currentTime(),
				msg: msg
			};
			config.parent.sendMessage(msgData);
			msgData.origin = 'local';
			self.showMessage(msgData);
			if (activityTimer) {
				clearTimeout(activityTimer);
				activityTimer = null;
			}
			config.parent.sendInfo(config.displayName + " sent message");
		}
	}
	
	function displayMessage(data) {
		var msgLines,
            msgLine,
            msgLen,
            windowLinks,
            links,
            msgFormattedLine,
            msgEntryHtml,            
            outputHtml = '',
            outputEl;
		msgLines = data.msg.split(GLOBAL_CONSTANTS.LINE_END_REGEX);	
		for(var i=0; i<msgLines.length; i++) {
            msgLine = msgLines[i];
    		// 1. getting links' substrings
    		links = getLinks(msgLine);
            // 2. tokenizing line 
            var words = msgLine.split(' ');
            // 3. HTML-formatting
            msgFormattedLine = '';
            for(var j=0; j<words.length; j++) {
                if(isLink(links, words[j])) {
                    formattedWord = '<a href="'+ words[j] +'" target="_blank">'+ words[j] +'</a>';
                } else {
                    formattedWord = utilities.escapeHtml(words[j]);
                }
                msgFormattedLine += (formattedWord + '&nbsp;');
            }
    		outputHtml += msgFormattedLine;
    		if(i < msgLines.length-1) {
    		    outputHtml += "<br>";
    		}
        } // end lines loop
        if (outputHtml != '') data.msg = outputHtml;
        outputEl = $("#" + messengerOutput);
        msgEntryHtml = getMessageEntryHtml(data);
        outputEl.append($(msgEntryHtml));
		var displayView = document.getElementById(messengerOutput);
		displayView.scrollTop = displayView.scrollHeight;
		function isLink(links, word) {
		    var result; 
		    if(links) {
                if(links.indexOf(word) >= 0) {
                    result = true;
                } else {
                    result = false;
                }
            } else {
                result = false;
            }
            return result;
		}
		
		function getLinks(line) {
		    var links = [],
                words = line.split(' ');
 		    for(var i=0; i<words.length; i++) {
		        if(utilities.WWW_PAGE_SCHEME_2.test(words[i]) == true) {
		            links.push(words[i]);
		        } else {
		        }
		    }
		    return links;
		}
	}

	function getMessageEntryHtml(data) {
		var containerClass = "msg_container msg_container_" + data.origin;
		if (!data.photo) data.photo = (data.origin == "remote" ? remotePhoto : localPhoto);
		if (!data.time) data.time = evoappfwk.DateTimeUtils.currentTime();
		var msgHtml = 
			'<div class="' + containerClass + '">' +
				'<div class="msg_photo_container">' +
					'<img class="msg_photo" src="' + data.photo + '" />' +
				'</div>' +
				'<div class="msg_message_container">' +
					'<div class="msg_info">' +
						'<div class="msg_user">' +
							data.userName +
						'</div>' +
						'<div class="msg_time">' +
							data.time +
						'</div>' +
					'</div>' +
					'<div class="msg_content">' +
						data.msg +
					'</div>' +
				'</div>' +
			'</div>';
		return msgHtml;
	};
};
