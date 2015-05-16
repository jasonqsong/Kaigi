evowidget = evowidget || {};
evowidget.MessengerWidget = function(config, success, error) {
    evoappfwk.CollaborationWidget.apply(this, [ config ]);
    evoappfwk.Logger.log(this.LogTag, "Initializing", evoappfwk.Logger.FUNCTION);
    
	var self = this,
 		environment,
        sources,
        messageStore,
        infoChannel,
        infoKey = "MESSENGER_INFO_CHANNEL";
	sources = [
                {type: "script", filename : "js/menu/MessengerMenu.js"},
                {type: "script", filename: "platform/"+self.platform+"/MessengerGui.js"},
            ];	 
	this.initGuiWidget({sources: sources}, init);
 	
	function init() {
        evoappfwk.Logger.log(self.LogTag, "GUI loaded, init", evoappfwk.Logger.FUNCTION);
        self.gui = new evowidget.MessengerGui(config, self.guiCreated);
 	}

    this.guiCreated = function() {
        if(typeof success === 'function') {
            success(self, true);
        }
    }
    
 	/**
 	 * This is the start point for the widget when everything is prepared for collaboration.
 	 * It means that the connection with the collaboration server is active.
 	 * @param {obj} config	new configuration including the activation parameters
 	 */
 	this.activate = function(config_) {
		config = config_;
		evoappfwk.Logger.log(self.LogTag, "Activation result handler: startWidget", evoappfwk.Logger.FUNCTION);
 		environment = config.environment;
        self.reportCommunicationState(evoappfwk.CommunicationStateEvent.state.ON, true);
		connectDSM();
		self.reportActivation()
	};
	
	/**
	 * This function connects to the collaboration server DSM (Distributed Shared Memory) and meneges the updates from DSM.
	 */
	function connectDSM() {
		var i,
			message,
			origin,
			info;
		messageStore = new DSM.ListReplica("messageStore_"+self.getGlobalId());
		infoChannel = new DSM.HashReplica("infoChannel_"+self.getGlobalId());

		environment.dsm.attachChild([messageStore, infoChannel], function() {
		    evoappfwk.Logger.log(self.LogTag, "Connected to messageStore. Number of messages " + messageStore.size(), evoappfwk.Logger.FUNCTION);
			if (messageStore.size() > 0) {
				var messages = [];
				for (i = 0; i < messageStore.size(); i += 1) {
					message = JSON.parse( messageStore.get(i));
					origin = message.userName == config.displayName ? 'local' : 'remote';
					message.origin = origin;
					messages.push(message)
				}
				self.gui.updateContent(messages);
			}
			else self.gui.showNotification("Messanger", "open");
			messageStore.remoteupdate = function (op) {
				evoappfwk.Logger.log(self.LogTag, "messageStore got type: " + op.type + " on item: " + op.item + " with value: " + op.value, evoappfwk.Logger.FUNCTION);
				switch (op.type) {
				case DSM.Operation.ADD:
				case DSM.Operation.SET:
					message = JSON.parse(op.item);
					message.origin = 'remote';
					self.gui.showMessage(message);
					break;
				case DSM.Operation.CLEAR:
					self.gui.clearMessages();
					break;
				}
			};
			infoChannel.remoteupdate = function (op) {
				self.gui.showInfo(op.value);
			}
		});
	};
	
	/**
	 * This function sends the message via DSM
	 * @param {object} message			JSON representation of the message data
	 * @param {string} message.photo	photo of the user
	 * @param {string} message.userName	user name
	 * @param {string} message.time		time stamp for message
	 * @param {string} message.msg		 message text
	 */
	this.sendMessage = function(message) {
		messageStore.append(JSON.stringify(message));
		messageStore.commit();
	}
	

	/**
	 * This function sends the information text (e.g. "is typing") via DSM
	 * @param {string} info			information text
	 */
	this.sendInfo = function(info) {
		infoChannel.set(config.displayName, info);
		infoChannel.commit();
	}
	
	/**
	 * This function is called on the user action upon the gui to clear 
	 * all the message in DSM
	 * @param {string} info			information text
	 */
	this.clearMessageStore = function() {
        evoappfwk.Logger.log(self.LogTag, "Cleaning MessageStore...", evoappfwk.Logger.FUNCTION);
        if (messageStore.size() > 0) {
			messageStore.clear();
			messageStore.commit();
		}
	}

	/**
	 * Function calls to check if the application can logout.
	 * (Not possible to logout if any widget is active).
	 * @return true if ready for termination 
	 */
    this.isReadyForTermination = function() {
    	if(self.gui && self.gui.isDisplayed()) {
    		return false;
    	}
    	return true;
	};
	
	/**
	 * Function called byt the Gui Frame to quit the widget
	 */
	this.quit = function() {
		evoappfwk.Logger.log(self.LogTag, "QUIT", evoappfwk.Logger.FUNCTION);
		if(messageStore && environment && environment.dsm) {
	    	environment.dsm.detachChild(messageStore);
			environment.dsm.detach(infoChannel);
	    }
		if (self.gui) {
			self.gui.remove();
		}
		self.gui = undefined;
		self.disactivate();
		self.terminated = true;
	};
};

evowidget.MessengerWidget.prototype.constructor = evowidget.MessengerWidget;