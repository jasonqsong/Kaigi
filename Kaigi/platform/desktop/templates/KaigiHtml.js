evowidget.kaigiwidget.KaigiHtml = function(config) {
    var self = this,
        html;

    html = 
'<div id="kaigi_body_' + config.tagId + '" class="kaigi_body">' + // main widget contents area (with menus)
    // add danmaku layer
    '<div id="kaigi_danmaku_layer'+ config.tagId+ '" class="kaigi_danmaku_layer">' +
    '</div>' +
    // add danmaku layer
    '<div id="kaigi_subtitle_layer'+ config.tagId+ '" class="kaigi_subtitle_layer">' +
    '</div>' +
    // widget control buttons
    '<div id="wb_add_menu_btn_' + config.tagId + '" class="widget_add_menu_btn">' +
        '<img class="wb_control_icon" src="' + config.platformPath + 'themes/img/add.png" />' +
    '</div>' +

    '<div id="wb_tool_menu_btn_' + config.tagId + '" class="wb_tool_menu_btn">' +
        '<img class="wb_control_icon" src="' + config.platformPath + 'themes/img/tool_menu.png" />' +
    '</div>' +

    // container 
    '<div id="wb_context_menus_' + config.tagId + '" class="wb_context_menus">' +
    '</div>' +

    // tabs
    '<div class="wb_tabs_bar">' +
        '<div id="wb_tab_nav_backward_box_' + config.tagId + '" class="wb_tab_nav_backward_box wb_tab_nav_box_inactive">' +
            '<div class="wb_tab_nav_backward">' +
            '</div>' +
        '</div>' +
        '<div class="wb_tabs_container">' +
            '<table id="wb_tab_table_' + config.tagId + '" class="wb_tab_table" border="0" border-spacing="0">' +
            '<tr>' +
            '</tr>' +
            '</table>' +
        '</div>' +
        '<div id="wb_tab_nav_forward_box_' + config.tagId + '" class="wb_tab_nav_forward_box wb_tab_nav_box_inactive">' +
            '<div class="wb_tab_nav_forward">' +
            '</div>' +
        '</div>' +
    '</div>' +

    // tabs separator
    '<div class="tabsSeparator">' +
    '</div>' +

    // drawing canvas
    '<div id="canvaspanel_' + config.tagId + '" class="wb_canvaspanel" >' +
    '</div>' +


    // slide layer
    '<div id="kaigi_slide_layer' + config.tagId + '" class="kaigi_slide_layer" >' +
    '</div>' +

'</div>'; // end widget_body

    self.getHtml = function() {
        return html;
    };

};
