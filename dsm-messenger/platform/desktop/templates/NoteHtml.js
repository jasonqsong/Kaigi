evowidget.notewidget.NoteHtml = function(config){
    var self = this,
        html;
    
    html = 
    	'<div id="notes_body_' + config.tagId + '" class="notes_body">' + // main widget contents area (with menus)
            
    	 	// widget control buttons
	        '<div id="notes_add_menu_btn_' + config.tagId + '" class="notes_add_menu_btn">' +
	            '<img class="notes_control_icon" src="' + config.platformPath + 'themes/img/add.png" />' +
	        '</div>' +
	            
	        '<div id="notes_tool_menu_btn_' + config.tagId + '" class="notes_tool_menu_btn">' +
	            '<img class="notes_control_icon" src="' + config.platformPath + 'themes/img/tool_menu.png" />' +
	        '</div>' +
    	
	    	 // container 
			'<div id="note_context_menus_' + config.tagId + '" class="note_context_menus">' +
			'</div>' +
			
	        // tabs
	        '<div class="notes_tabs_bar">' +
	           '<div id="notes_tab_nav_backward_box_' + config.tagId + '" class="notes_tab_nav_backward_box notes_tab_nav_box_inactive">' +
	               '<div class="notes_tab_nav_backward">' +
	               '</div>' +
	           '</div>' +
	           '<div class="notes_tabs_container">' +
	                '<table id="noteTabTable_' + config.tagId + '" class="notes_tab_table" border="0" border-spacing="0">'+
	                  '<tr>' +
	                  '</tr>' +
	                '</table>' +
	           '</div>' + 
	           '<div id="notes_tab_nav_forward_box_' + config.tagId + '" class="notes_tab_nav_forward_box notes_tab_nav_box_inactive">' +
	               '<div class="notes_tab_nav_forward">' +
	               '</div>' +
	           '</div>' +
	        '</div>' +                  
	        
	        // tabs separator
	        /*
	        '<div class="tabsSeparatorNotes">' +
	        '</div>' +          
	        */
	        
	        // tabs separator
			'<div class="tabsSeparator">' +
			'</div>' + 
	      
	        // notearea
	        '<div id="notepanel_' + config.tagId + '" class="notepanel" >' + // NOTE: ID also defined in NoteWidget!
	        '</div>' +
        '</div>'; // end widget_body
    
    self.getHtml = function(){
        return html;
    };
};