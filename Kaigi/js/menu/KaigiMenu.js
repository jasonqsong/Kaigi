/**
 * Kaigi context menu 
 */
evowidget.kaigiwidget.KaigiMenu = (function() {

    var brushIconPalette,
        backgroundIconPalette,
        getDef;

    /**
     * Returns context menu definition 
     * @param {Object} config JSON configuration:
     *        config.resourcePath - path to the menu resources (images) 
     * @return {string} menu definition as JSON object
     */
    getDef = function(config) {

        var resourcePath = config.resourcePath,
            colorIconPalettePath = resourcePath + '/colorIconPalette',
            backgroundIconPalettePath = resourcePath + '/backgroundIconPalette',
            menuDef;

        brushIconPalette = [
            colorIconPalettePath + "/c0.png",
            colorIconPalettePath + "/c1.png",
            colorIconPalettePath + "/c2.png",
            colorIconPalettePath + "/c3.png",
            colorIconPalettePath + "/c4.png",
            colorIconPalettePath + "/c5.png",
            colorIconPalettePath + "/c6.png",
            colorIconPalettePath + "/c7.png",
            colorIconPalettePath + "/c8.png",
            colorIconPalettePath + "/c9.png",
            colorIconPalettePath + "/c10.png",
            colorIconPalettePath + "/c11.png",
            colorIconPalettePath + "/c12.png",
            colorIconPalettePath + "/c13.png",
            colorIconPalettePath + "/c14.png",
            colorIconPalettePath + "/c15.png",
            colorIconPalettePath + "/c16.png",
            colorIconPalettePath + "/c17.png",
            colorIconPalettePath + "/c18.png",
            colorIconPalettePath + "/c19.png",
            colorIconPalettePath + "/c20.png",
            colorIconPalettePath + "/c21.png"
        ];

        backgroundIconPalette = [
            backgroundIconPalettePath + "/b0.png",
            backgroundIconPalettePath + "/b1.png",
            backgroundIconPalettePath + "/b2.png",
            backgroundIconPalettePath + "/b3.png",
            backgroundIconPalettePath + "/b4.png",
            backgroundIconPalettePath + "/b5.png",
            backgroundIconPalettePath + "/b6.png",
            backgroundIconPalettePath + "/b7.png",
            backgroundIconPalettePath + "/b8.png",
            backgroundIconPalettePath + "/b9.png",
            backgroundIconPalettePath + "/b10.png",
            backgroundIconPalettePath + "/b11.png",
            backgroundIconPalettePath + "/b12.png",
            backgroundIconPalettePath + "/b13.png",
            backgroundIconPalettePath + "/b14.png",
            backgroundIconPalettePath + "/b15.png",
            backgroundIconPalettePath + "/b16.png",
            backgroundIconPalettePath + "/b17.png",
            backgroundIconPalettePath + "/b18.png",
            backgroundIconPalettePath + "/b19.png",
            backgroundIconPalettePath + "/b20.png"
        ];

        menuDef = [
            /* TODO: seems to be unnecessary
            {
                id : "close",
                name : "close",
                type : evoappfwk.MenuFactory.BUTTON,
                icons : {
                    standard : resourcePath + '/wb_menu_close.png',
                    active : resourcePath + '/wb_menu_close.png',
                    inactive : resourcePath + '/wb_menu_close.png'
                }
            },
            */
            {
                id: "btn-speech-danmaku",
                name: "btn-speech-danmaku",
                type: evoappfwk.MenuFactory.BUTTON,
                icons: {
                    standard: resourcePath + '/microphone.png',
                    active: resourcePath + '/microphone.png',
                    inactive: resourcePath + '/microphone.png'
                },
                soleRight: true,
            }, {
                id: "btnaddphoto",
                name: "btnaddphoto",
                type: evoappfwk.MenuFactory.PICTURE,
                icons: {
                    standard: resourcePath + '/slides.png',
                    active: resourcePath + '/slides.png',
                    inactive: resourcePath + '/slides.png'
                },
                soleRight: true
            }, {
                id: "btn-slide-show-prev",
                name: "btn-slide-show-prev",
                type: evoappfwk.MenuFactory.BUTTON,
                icons: {
                    standard: resourcePath + '/arrow_up.png',
                    active: resourcePath + '/arrow_up.png',
                    inactive: resourcePath + '/arrow_up.png'
                }
            }, {
                id: "btn-slide-show-next",
                name: "btn-slide-show-next",
                type: evoappfwk.MenuFactory.BUTTON,
                icons: {
                    standard: resourcePath + '/arrow_down.png',
                    active: resourcePath + '/arrow_down.png',
                    inactive: resourcePath + '/arrow_down.png'
                }
            }, {
                id: "btnbrush",
                name: "btnbrush",
                type: evoappfwk.MenuFactory.BUTTON,
                state: "active",
                icons: {
                    standard: resourcePath + '/wb_draw.png',
                    active: resourcePath + '/wb_draw.png',
                    inactive: resourcePath + '/wb_draw.png'
                },
                soleRight: true,
                submenu: [{
                    id: "btnbrushsize",
                    name: "btnbrushsize",
                    type: evoappfwk.MenuFactory.BUTTON,
                    icons: {
                        standard: resourcePath + '/wb_brushsize.png',
                        active: resourcePath + '/wb_brushsize.png',
                        inactive: resourcePath + '/wb_brushsize.png'
                    },
                    soleRight: true,
                    sidemenu: {
                        id: "brushsize",
                        name: "brushsize",
                        type: evoappfwk.MenuFactory.BRUSH_THICKNESS
                    }
                }, {
                    id: "btnbrushcolor",
                    name: "btnbrushcolor",
                    type: evoappfwk.MenuFactory.BUTTON,
                    icons: {
                        standard: brushIconPalette[0],
                        active: brushIconPalette[0],
                        inactive: brushIconPalette[0]
                    },
                    iconPalette: brushIconPalette,
                    soleRight: true,
                    sidemenu: {
                        id: "wbCOLOR_PALETTE",
                        name: "wbCOLOR_PALETTE",
                        type: evoappfwk.MenuFactory.COLOR_PALETTE,
                        colorType: "sharp"
                    }
                }, {
                    id: "btnbrushcolorbackground",
                    name: "btnbrushcolorbackground",
                    type: evoappfwk.MenuFactory.BUTTON,
                    icons: {
                        standard: backgroundIconPalette[0],
                        active: backgroundIconPalette[0],
                        inactive: backgroundIconPalette[0]
                    },
                    iconPalette: backgroundIconPalette,
                    soleRight: true,
                    sidemenu: {
                        id: "wbBackgroundCOLOR_PALETTE",
                        name: "wbBackgroundCOLOR_PALETTE",
                        type: evoappfwk.MenuFactory.COLOR_PALETTE,
                        colorType: "light"
                    }
                }]
            }, {
                id: "btneraser",
                name: "btneraser",
                type: evoappfwk.MenuFactory.BUTTON,
                icons: {
                    standard: resourcePath + '/wb_eraser.png',
                    active: resourcePath + '/wb_eraser.png',
                    inactive: resourcePath + '/wb_eraser.png'
                },
                soleRight: true,

                submenu: [{
                    id: "btnerasersize",
                    name: "btnerasersize",
                    type: evoappfwk.MenuFactory.BUTTON,
                    icons: {
                        standard: resourcePath + '/wb_erasersize.png',
                        active: resourcePath + '/wb_erasersize.png',
                        inactive: resourcePath + '/wb_erasersize.png'
                    },
                    sidemenu: {
                        id: "erasersize",
                        name: "erasersize",
                        type: evoappfwk.MenuFactory.BRUSH_THICKNESS
                    }
                }, {
                    id: "btneraseall",
                    name: "btneraseall",
                    type: evoappfwk.MenuFactory.BUTTON,
                    icons: {
                        standard: resourcePath + '/erase_all.png',
                        active: resourcePath + '/erase_all.png',
                        inactive: resourcePath + '/erase_all.png'
                    }
                }]
            }, {
                id: "btnpointer",
                name: "btnpointer",
                type: evoappfwk.MenuFactory.BUTTON,
                icons: {
                    standard: resourcePath + '/wb_pointer.png',
                    active: resourcePath + '/wb_pointer.png',
                    inactive: resourcePath + '/wb_pointer.png'
                },
                soleRight: true
            }, {
                id: "btnundolast",
                name: "btnundolast",
                type: evoappfwk.MenuFactory.BUTTON,
                icons: {
                    standard: resourcePath + '/undo.png',
                    active: resourcePath + '/undo.png',
                    inactive: resourcePath + '/undo.png'
                }
            }
        ];

        return menuDef;
    };

    return {
        getDef: getDef
    };

})();
