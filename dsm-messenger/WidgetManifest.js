WidgetManifest = {
    id: 'MESSENGER',
    type: 'communication',
    genre: 'collaboration',
    capability: 'messenger',
    namespace: 'evowidget',
    vendor: 'Ericsson BUCI DUCN evocom',
    vendorId: "ERICSSON_DUCN",
    version: '0.0.1',
    name: 'Messenger',
    className: 'MessengerWidget',
    path: 'messengerWidget/',
    icons: {
        standard: 'themes/img/messenger_black.png',
        active: 'platform/android_phone/themes/img/messenger_bullet_active.png',
        inactive: 'platform/android_phone/themes/img/messenger_bullet_inactive.png',
        quit: 'themes/img/quit_messenger.png',
    },
    maxInstances: [{
        platform: 'desktop',
        value: '100'
    }]
};
