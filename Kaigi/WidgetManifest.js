WidgetManifest = {
    id: 'KAIGI',
    type: 'communication',
    genre: 'collaboration',
    capability: 'kaigi',
    supportedActions: evoappfwk.WidgetActionEvent.action.SERVE_PICTURE,
    namespace: 'evowidget',
    vendor: 'Ericsson BUCI DUCN evocom',
    vendorId: "ERICSSON_DUCN",
    version: '0.0.1',
    name: 'Kaigi',
    className: 'KaigiWidget',
    path: 'kaigiWidget/',
    icons: {
        standard: 'themes/img/kaigi_black.png',
        active: 'platform/android_phone/themes/img/wb_bullet_active.png',
        inactive: 'platform/android_phone/themes/img/wb_bullet_inactive.png',
        quit: 'themes/img/quit_kaigi.png',
        firstMenu: {
            white: {
                large: 'themes/img/firstMenu/white/large/kaigi.png',
                medium: 'themes/img/firstMenu/white/medium/kaigi.png',
                small: 'themes/img/firstMenu/white/small/kaigi.png'
            },
            black: {
                large: 'themes/img/firstMenu/black/large/kaigi.png',
                medium: 'themes/img/firstMenu/black/medium/kaigi.png',
                small: 'themes/img/firstMenu/black/small/kaigi.png'
            }
        }
    },
    maxInstances: [{
        platform: 'android_phone',
        value: '10'
    }]
};
