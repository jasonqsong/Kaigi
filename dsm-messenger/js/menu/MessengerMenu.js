/**
 * Whiteboard context menu 
 */
evowidget.MessengerMenu = (function() {
    
    var getDef;
    
    /**
     * Returns context menu definition 
     * @param {Object} config JSON configuration:
     *        config.resourcePath - path to the menu resources (images) 
     * @return {string} menu definition as JSON object
     */
    getDef = function(config) {
        
        var resourcePath = config.resourcePath,
            menuDef;
            
        menuDef = [
			{
				id : "btneraser",
				name : "btneraser",
				type : evoappfwk.MenuFactory.BUTTON,
				icons : {
					standard : resourcePath + '/eraser_white.png',
					active : resourcePath + '/eraser_white.png',
					inactive : resourcePath + '/eraser_white.png'
				}
			}
		];
    
        return menuDef;
    };

    return {
        getDef: getDef
    };

})();