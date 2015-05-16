// var fgColorImageFilenameBase = "colour_";

// color palettes
colorset = {}
colorset.foreground = "fg";
colorset.background = "bg";

// colors
colors = {};

colors.ui = {};
colors.ui.sweetblue = "#00c9ff";
colors.ui.defaultblue = "#0072bc";
colors.ui.greengrass = "#269c31";
colors.ui.black = "#000000";

colors.bg = {};
colors.bg.black = "#000000";
colors.bg.white = "#FFFFFF";
colors.bg.blue = "#999999";
colors.bg.skyblue = "#AAAFD2";
colors.bg.greenpea = "#B7CEE8";
colors.bg.apple = "#C8EEFB";
colors.bg.ocean = "#A1C1AD";
colors.bg.orange = "#A8D0B4";
colors.bg.saffron = "#B4F1B4";
colors.bg.khaki = "#FBC8A6";
colors.bg.tan = "#FDDE99";
colors.bg.red = "#FFF799";
colors.bg.pink = "#DFA7A7";
colors.bg.lavender = "#FC9FA6";
colors.bg.red3rd = "#fdc1b9";
colors.bg.magenta = "#EF9CCF";
colors.bg.rose = "#F9ACD9";
colors.bg.pink3rd = "#fdc6e2";
colors.bg.purple = "#C8A4DB";
colors.bg.violet = "#D4B9D8";
colors.bg.lilac = "#EDD9E9";
colors.bg.boulder = "#58595B";
colors.bg.gray = "#BBBDBF";

colorutils = {};
colorutils.bgColorMap = [{
    index: 1,
    color: colors.bg.black
}, {
    index: 2,
    color: colors.bg.white
}, {
    index: 3,
    color: colors.bg.blue
}, {
    index: 4,
    color: colors.bg.skyblue
}, {
    index: 5,
    color: colors.bg.greenpea
}, {
    index: 6,
    color: colors.bg.apple
}, {
    index: 7,
    color: colors.bg.ocean
}, {
    index: 8,
    color: colors.bg.orange
}, {
    index: 9,
    color: colors.bg.saffron
}, {
    index: 10,
    color: colors.bg.khaki
}, {
    index: 11,
    color: colors.bg.tan
}, {
    index: 12,
    color: colors.bg.red
}, {
    index: 13,
    color: colors.bg.pink
}, {
    index: 14,
    color: colors.bg.lavender
}, {
    index: 15,
    color: colors.bg.red3rd
}, {
    index: 16,
    color: colors.bg.magenta
}, {
    index: 17,
    color: colors.bg.rose
}, {
    index: 18,
    color: colors.bg.pink3rd
}, {
    index: 19,
    color: colors.bg.purple
}, {
    index: 20,
    color: colors.bg.violet
}, {
    index: 21,
    color: colors.bg.lilac
}, {
    index: 22,
    color: colors.bg.boulder
}, {
    index: 23,
    color: colors.bg.gray
}];

colors.fg = {};
colors.fg.black = "#000000";
colors.fg.white = "#FFFFFF";
colors.fg.navy = "#2B388F";
colors.fg.blue = "#4C85C5";
colors.fg.skyblue = "#76D6F4";
colors.fg.greenpea = "#156533";
colors.fg.apple = "#268B43";
colors.fg.ocean = "#43DD43";
colors.fg.orange = "#F47621";
colors.fg.saffron = "#FCAE00";
colors.fg.khaki = "#FFEC00";
colors.fg.tan = "#B12325";
colors.fg.red = "#F91021";
colors.fg.pink = "#FC644F";
colors.fg.lavender = "#D80989";
colors.fg.magenta = "#F2309F";
colors.fg.rose = "#FC72B7";
colors.fg.purple = "#751BA5";
colors.fg.violet = "#954F9E";
colors.fg.lilac = "#D4A1C9";
colors.fg.boulder = "#58595B";
colors.fg.gray = "#BBBDBF";

colorutils.fgColorMap = [{
    index: 1,
    color: colors.fg.black
}, {
    index: 2,
    color: colors.fg.white
}, {
    index: 3,
    color: colors.fg.navy
}, {
    index: 4,
    color: colors.fg.blue
}, {
    index: 5,
    color: colors.fg.skyblue
}, {
    index: 6,
    color: colors.fg.greenpea
}, {
    index: 7,
    color: colors.fg.apple
}, {
    index: 8,
    color: colors.fg.ocean
}, {
    index: 9,
    color: colors.fg.orange
}, {
    index: 10,
    color: colors.fg.saffron
}, {
    index: 11,
    color: colors.fg.khaki
}, {
    index: 12,
    color: colors.fg.tan
}, {
    index: 13,
    color: colors.fg.red
}, {
    index: 14,
    color: colors.fg.pink
}, {
    index: 15,
    color: colors.fg.lavender
}, {
    index: 16,
    color: colors.fg.magenta
}, {
    index: 17,
    color: colors.fg.rose
}, {
    index: 18,
    color: colors.fg.purple
}, {
    index: 19,
    color: colors.fg.violet
}, {
    index: 20,
    color: colors.fg.lilac
}, {
    index: 21,
    color: colors.fg.boulder
}, {
    index: 22,
    color: colors.fg.gray
}];

/**
 * TODO check ready code
 * Gets color in rgb(r,g,b) form 
 * @param {Object} colorIn
 */
colorutils.getColorAsRgb = function(colorIn) {
    var tempDiv = document.createElement("div");
    tempDiv.style.background = colorIn;
    var rgbColor = tempDiv.style.background;
    console.log("for color " + colorIn + " rgb is: " + rgbColor);
    return rgbColor;
};

colorutils.getColorByIndex = function(colorPalette, index) {
    var colorMap = (colorPalette == colorset.foreground ? colorutils.fgColorMap : colorutils.bgColorMap);
    console.log("[getColorByIndex] searching for color by index " + index + " in colorset " + colorPalette);
    for (var i = 0; i < colorMap.length; i++) {
        if (colorMap[i].index == index) {
            console.log("found color: " + colorMap[i].color);
            return colorMap[i].color;
        }
    }
    console.error("no color was found for index " + index);
    return undefined;
};

colorutils.getImageIndexByColor = function(colorPalette, color) {
    var colorHex = colorutils.rgbToHex(color);
    var colorMap = (colorPalette == colorset.foreground ? colorutils.fgColorMap : colorutils.bgColorMap);
    console.log("[getImageIndexByColor] searching for color " + colorHex + " in colorset " + colorPalette);
    for (var i = 0; i < colorMap.length; i++) {
        if (colorMap[i].color.toLowerCase() == colorHex.toLowerCase()) {
            console.log("found color under index " + colorMap[i].index);
            return colorMap[i].index;
        }
    }
    console.error("getImageIndexByColor nothing found");
    return undefined;
};

colorutils.rgbToHex = function(color) {
    if (color.substr(0, 1) === "#") {
        return color;
    }
    var nums = /(.*?)rgb\((\d+),\s*(\d+),\s*(\d+)\)/i.exec(color),
        r = parseInt(nums[2], 10).toString(16),
        g = parseInt(nums[3], 10).toString(16),
        b = parseInt(nums[4], 10).toString(16);
    return "#" + (
        (r.length == 1 ? "0" + r : r) +
        (g.length == 1 ? "0" + g : g) +
        (b.length == 1 ? "0" + b : b)
    );
}
