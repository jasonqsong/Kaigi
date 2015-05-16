var canvasutils = {};

canvasutils.getCanvasScaledImgDimensions = function(imgWidth, imgHeight, canvasWidth, canvasHeight) {
    var targetWidth = undefined;
    var targetHeight = undefined;
    var canvasRatio = canvasWidth / canvasHeight;
    var imgRatio = imgWidth / imgHeight;
    var ratio = undefined;

    console.log("loaded image, width: " + imgWidth + ", height: " + imgHeight);
    console.log("canvas width: " + canvasWidth + ", height: " + canvasHeight);
    console.log("image ratio: " + imgRatio);
    console.log("canvas ratio: " + canvasRatio);

    if (imgWidth < canvasWidth) {
        if (imgHeight < canvasHeight) {
            // setting image 'as is'
            targetWidth = imgWidth;
            targetHeight = imgHeight;
        } else {
            // rescaling to fit vertically
            ratio = canvasHeight / imgHeight;
            targetWidth = imgWidth * ratio;
            targetHeight = canvasHeight;
        }
    } else {
        if (imgHeight < canvasHeight) {
            // rescaling to fit horizontally
            ratio = canvasWidth / imgWidth;
            targetHeight = imgHeight * ratio;
            targetWidth = canvasWidth;
        } else {
            if (imgRatio < canvasRatio) {
                // portrait, rescaling to fit vertically
                ratio = canvasHeight / imgHeight;
                targetWidth = imgWidth * ratio;
                targetHeight = canvasHeight;
            } else {
                // landscape, rescaling to fit horizontally
                ratio = canvasWidth / imgWidth;
                targetHeight = imgHeight * ratio;
                targetWidth = canvasWidth;
            }
            // both dimemsions exceeded sca
        }
    }

    console.log("scaled image width: " + targetWidth);
    console.log("scaled image height: " + targetHeight);

    return {
        width: targetWidth,
        height: targetHeight
    };

};

/**
 * Gets x and y coords of the centered image
 * @return 2-property object where "left" is x-axis and "right" is y-axis shift  
 */
canvasutils.getCenteredImagePosition = function(scaledWidth, scaledHeight, canvasWidth, canvasHeight) {
    var x = (scaledWidth < canvasWidth ? (canvasWidth - scaledWidth) / 2 : 0);
    var y = (scaledHeight < canvasHeight ? (canvasHeight - scaledHeight) / 2 : 0);
    console.log("image position x: " + x);
    console.log("image position y: " + y);
    return {
        x: x,
        y: y
    };
};
