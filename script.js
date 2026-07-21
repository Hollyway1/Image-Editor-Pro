// ===============================
// Get HTML Elements
// ===============================

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const fileInput = document.getElementById("fileInput");
const dropArea = document.getElementById("dropArea");
const dropMessage = document.getElementById("dropMessage");

const grayscaleBtn = document.getElementById("grayscale");
const sepiaBtn = document.getElementById("sepia");
const invertBtn = document.getElementById("invert");

const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const saturationSlider = document.getElementById("saturation");
const blurSlider = document.getElementById("blur");

const brightnessValue = document.getElementById("brightnessValue");
const contrastValue = document.getElementById("contrastValue");
const saturationValue = document.getElementById("saturationValue");
const blurValue = document.getElementById("blurValue");

const rotateLeftBtn = document.getElementById("rotateLeft");
const rotateRightBtn = document.getElementById("rotateRight");

const flipHorizontalBtn = document.getElementById("flipHorizontal");
const flipVerticalBtn = document.getElementById("flipVertical");

const resetBtn = document.getElementById("reset");
const downloadBtn = document.getElementById("download");

const cropBtn = document.getElementById("cropBtn");
const applyCropBtn = document.getElementById("applyCropBtn");

const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const fitImageBtn = document.getElementById("fitImage");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

canvas.width = 900;
canvas.height = 600;
canvas.style.touchAction = "none";

let image = new Image();
let imageLoaded = false;

let cropMode = false;
let cropBox = null;
let cropStartX = 0;
let cropStartY = 0;
let cropEndX = 0;
let cropEndY = 0;
let isCropping = false;
let isMovingCrop = false;
let cropDragMode = null;
let cropOffsetX = 0;
let cropOffsetY = 0;
const cropHandleSize = 10;

let history = [];
let redoHistory = [];

const imageSettings = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0,
    rotation: 0,
    flipX: 1,
    flipY: 1,
    zoom: 1,
    offsetX: 0,
    offsetY: 0
};

let isDragging = false;
let startX = 0;
let startY = 0;
let activePointerId = null;

function resetCropState() {
    cropMode = false;
    cropBox = null;
    cropStartX = 0;
    cropStartY = 0;
    cropEndX = 0;
    cropEndY = 0;
    isCropping = false;
    isMovingCrop = false;
    cropDragMode = null;
    cropOffsetX = 0;
    cropOffsetY = 0;
    applyCropBtn.style.display = "none";
    canvas.style.cursor = "default";
}

function normalizeRect(x1, y1, x2, y2) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    return { x, y, w, h };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function pointInRect(x, y, rect) {
    return (
        x >= rect.x &&
        x <= rect.x + rect.w &&
        y >= rect.y &&
        y <= rect.y + rect.h
    );
}

function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function getCropHandle(x, y) {
    if (!cropBox) return null;

    const hs = cropHandleSize;
    const left = cropBox.x;
    const top = cropBox.y;
    const right = cropBox.x + cropBox.w;
    const bottom = cropBox.y + cropBox.h;
    const midX = cropBox.x + cropBox.w / 2;
    const midY = cropBox.y + cropBox.h / 2;

    const handles = [
        { name: "nw", x: left, y: top },
        { name: "n", x: midX, y: top },
        { name: "ne", x: right, y: top },
        { name: "e", x: right, y: midY },
        { name: "se", x: right, y: bottom },
        { name: "s", x: midX, y: bottom },
        { name: "sw", x: left, y: bottom },
        { name: "w", x: left, y: midY }
    ];

    for (const handle of handles) {
        if (
            x >= handle.x - hs &&
            x <= handle.x + hs &&
            y >= handle.y - hs &&
            y <= handle.y + hs
        ) {
            return handle.name;
        }
    }

    return null;
}

function resetTransformOnly() {
    imageSettings.zoom = 1;
    imageSettings.offsetX = 0;
    imageSettings.offsetY = 0;
    imageSettings.rotation = 0;
    imageSettings.flipX = 1;
    imageSettings.flipY = 1;
}

function saveHistory() {
    if (!image.src) return;
    history.push(canvas.toDataURL());
    if (history.length > 20) history.shift();
    redoHistory = [];
}

function restoreImage(dataURL) {
    const img = new Image();
    img.onload = function () {
        image = img;
        imageLoaded = true;
        dropMessage.style.display = "none";
        drawImage();
    };
    img.src = dataURL;
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function loadImage(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please upload an image file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        image = new Image();
        image.onload = function () {
            imageLoaded = true;
            dropMessage.style.display = "none";
            history = [];
            redoHistory = [];
            resetCropState();
            drawImage();
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawCropOverlay() {
    if (!cropMode || !cropBox || cropBox.w <= 0 || cropBox.h <= 0) return;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.clearRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);

    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);

    ctx.setLineDash([]);
    ctx.fillStyle = "#00ff88";

    const handles = [
        [cropBox.x, cropBox.y],
        [cropBox.x + cropBox.w / 2, cropBox.y],
        [cropBox.x + cropBox.w, cropBox.y],
        [cropBox.x + cropBox.w, cropBox.y + cropBox.h / 2],
        [cropBox.x + cropBox.w, cropBox.y + cropBox.h],
        [cropBox.x + cropBox.w / 2, cropBox.y + cropBox.h],
        [cropBox.x, cropBox.y + cropBox.h],
        [cropBox.x, cropBox.y + cropBox.h / 2]
    ];

    handles.forEach(([hx, hy]) => {
        ctx.fillRect(hx - cropHandleSize / 2, hy - cropHandleSize / 2, cropHandleSize, cropHandleSize);
    });

    ctx.restore();
}

function renderToSourceCanvas() {
    const sourceCanvas = document.createElement("canvas");
    const sourceCtx = sourceCanvas.getContext("2d");
    sourceCanvas.width = canvas.width;
    sourceCanvas.height = canvas.height;

    sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceCtx.save();

    sourceCtx.translate(sourceCanvas.width / 2, sourceCanvas.height / 2);
    sourceCtx.translate(imageSettings.offsetX, imageSettings.offsetY);
    sourceCtx.scale(imageSettings.zoom, imageSettings.zoom);
    sourceCtx.rotate(imageSettings.rotation * Math.PI / 180);
    sourceCtx.scale(imageSettings.flipX, imageSettings.flipY);

    sourceCtx.filter = `
        brightness(${imageSettings.brightness}%)
        contrast(${imageSettings.contrast}%)
        saturate(${imageSettings.saturation}%)
        blur(${imageSettings.blur}px)
        grayscale(${imageSettings.grayscale}%)
        sepia(${imageSettings.sepia}%)
        invert(${imageSettings.invert}%)
    `;

    const scale = Math.min(sourceCanvas.width / image.width, sourceCanvas.height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    sourceCtx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    sourceCtx.restore();

    return sourceCanvas;
}

fileInput.addEventListener("change", (e) => {
    loadImage(e.target.files[0]);
});

["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.addEventListener(eventName, preventDefaults, false);
});

dropArea.addEventListener("dragenter", () => dropArea.classList.add("drag-over"));
dropArea.addEventListener("dragover", () => dropArea.classList.add("drag-over"));
dropArea.addEventListener("dragleave", () => dropArea.classList.remove("drag-over"));
dropArea.addEventListener("drop", () => dropArea.classList.remove("drag-over"));

dropArea.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    loadImage(file);
});

function drawImage() {
    if (!imageLoaded || !image.src) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(imageSettings.offsetX, imageSettings.offsetY);
    ctx.scale(imageSettings.zoom, imageSettings.zoom);
    ctx.rotate(imageSettings.rotation * Math.PI / 180);
    ctx.scale(imageSettings.flipX, imageSettings.flipY);

    ctx.filter = `
        brightness(${imageSettings.brightness}%)
        contrast(${imageSettings.contrast}%)
        saturate(${imageSettings.saturation}%)
        blur(${imageSettings.blur}px)
        grayscale(${imageSettings.grayscale}%)
        sepia(${imageSettings.sepia}%)
        invert(${imageSettings.invert}%)
    `;

    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    if (cropMode && cropBox && cropBox.w > 0 && cropBox.h > 0) {
        drawCropOverlay();
    }
}

brightnessSlider.addEventListener("input", () => {
    saveHistory();
    imageSettings.brightness = Number(brightnessSlider.value);
    brightnessValue.textContent = brightnessSlider.value + "%";
    drawImage();
});

contrastSlider.addEventListener("input", () => {
    saveHistory();
    imageSettings.contrast = Number(contrastSlider.value);
    contrastValue.textContent = contrastSlider.value + "%";
    drawImage();
});

saturationSlider.addEventListener("input", () => {
    saveHistory();
    imageSettings.saturation = Number(saturationSlider.value);
    saturationValue.textContent = saturationSlider.value + "%";
    drawImage();
});

blurSlider.addEventListener("input", () => {
    saveHistory();
    imageSettings.blur = Number(blurSlider.value);
    blurValue.textContent = blurSlider.value + "px";
    drawImage();
});

grayscaleBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.grayscale = imageSettings.grayscale === 100 ? 0 : 100;
    grayscaleBtn.classList.toggle("active");
    drawImage();
});

sepiaBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.sepia = imageSettings.sepia === 100 ? 0 : 100;
    sepiaBtn.classList.toggle("active");
    drawImage();
});

invertBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.invert = imageSettings.invert === 100 ? 0 : 100;
    invertBtn.classList.toggle("active");
    drawImage();
});

rotateLeftBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.rotation -= 90;
    if (imageSettings.rotation <= -360) imageSettings.rotation = 0;
    drawImage();
});

rotateRightBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.rotation += 90;
    if (imageSettings.rotation >= 360) imageSettings.rotation = 0;
    drawImage();
});

flipHorizontalBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.flipX *= -1;
    drawImage();
});

flipVerticalBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.flipY *= -1;
    drawImage();
});

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!image.src) return;

    saveHistory();

    if (e.deltaY < 0) imageSettings.zoom += 0.1;
    else imageSettings.zoom -= 0.1;

    imageSettings.zoom = Math.max(0.2, Math.min(imageSettings.zoom, 5));
    drawImage();
}, { passive: false });

canvas.addEventListener("pointerdown", (e) => {
    if (!image.src) return;

    e.preventDefault();
    activePointerId = e.pointerId;
    canvas.setPointerCapture(activePointerId);

    const { x, y } = getCanvasPoint(e);

    if (cropMode) {
        const handle = getCropHandle(x, y);

        if (handle) {
            cropDragMode = handle;
            isCropping = true;
            canvas.style.cursor = "crosshair";
            return;
        }

        if (cropBox && pointInRect(x, y, cropBox)) {
            isMovingCrop = true;
            cropOffsetX = x - cropBox.x;
            cropOffsetY = y - cropBox.y;
            canvas.style.cursor = "move";
            return;
        }

        cropStartX = x;
        cropStartY = y;
        cropEndX = x;
        cropEndY = y;
        cropBox = { x, y, w: 0, h: 0 };
        isCropping = true;
        cropDragMode = "create";
        canvas.style.cursor = "crosshair";
        return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
});

canvas.addEventListener("pointermove", (e) => {
    if (activePointerId !== e.pointerId) return;

    const { x, y } = getCanvasPoint(e);

    if (cropMode) {
        if (isCropping && cropDragMode === "create") {
            cropEndX = x;
            cropEndY = y;
            cropBox = normalizeRect(cropStartX, cropStartY, cropEndX, cropEndY);
            drawImage();
            return;
        }

        if (isCropping && cropDragMode && cropDragMode !== "create") {
            let left = cropBox.x;
            let top = cropBox.y;
            let right = cropBox.x + cropBox.w;
            let bottom = cropBox.y + cropBox.h;

            if (cropDragMode.includes("n")) top = y;
            if (cropDragMode.includes("s")) bottom = y;
            if (cropDragMode.includes("w")) left = x;
            if (cropDragMode.includes("e")) right = x;

            const rect = normalizeRect(left, top, right, bottom);
            cropBox = {
                x: clamp(rect.x, 0, canvas.width),
                y: clamp(rect.y, 0, canvas.height),
                w: clamp(rect.w, 0, canvas.width),
                h: clamp(rect.h, 0, canvas.height)
            };

            drawImage();
            return;
        }

        if (isMovingCrop && cropBox) {
            const newX = clamp(x - cropOffsetX, 0, canvas.width - cropBox.w);
            const newY = clamp(y - cropOffsetY, 0, canvas.height - cropBox.h);
            cropBox.x = newX;
            cropBox.y = newY;
            drawImage();
            return;
        }

        return;
    }

    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    imageSettings.offsetX += dx;
    imageSettings.offsetY += dy;

    startX = e.clientX;
    startY = e.clientY;

    drawImage();
});

canvas.addEventListener("pointerup", (e) => {
    if (activePointerId !== e.pointerId) return;

    isDragging = false;
    isCropping = false;
    isMovingCrop = false;
    cropDragMode = null;
    activePointerId = null;

    try {
        canvas.releasePointerCapture(e.pointerId);
    } catch {}
});

canvas.addEventListener("pointercancel", () => {
    isDragging = false;
    isCropping = false;
    isMovingCrop = false;
    cropDragMode = null;
    activePointerId = null;
});

cropBtn.addEventListener("click", () => {
    cropMode = true;
    cropBox = null;
    cropStartX = 0;
    cropStartY = 0;
    cropEndX = 0;
    cropEndY = 0;
    isCropping = false;
    isMovingCrop = false;
    cropDragMode = null;
    applyCropBtn.style.display = "block";
    canvas.style.cursor = "crosshair";
});

applyCropBtn.addEventListener("click", () => {
    if (!image.src || !cropBox || cropBox.w < 5 || cropBox.h < 5) return;

    saveHistory();

    const cropX = Math.max(0, Math.floor(cropBox.x));
    const cropY = Math.max(0, Math.floor(cropBox.y));
    const cropW = Math.max(1, Math.floor(cropBox.w));
    const cropH = Math.max(1, Math.floor(cropBox.h));

    const sourceCanvas = renderToSourceCanvas();
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = cropW;
    tempCanvas.height = cropH;

    tempCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    image = new Image();
    image.onload = function () {
        imageLoaded = true;
        resetCropState();
        resetTransformOnly();
        drawImage();
    };
    image.src = tempCanvas.toDataURL("image/png");
});

undoBtn.addEventListener("click", () => {
    if (history.length === 0) return;

    redoHistory.push(canvas.toDataURL());
    const previous = history.pop();
    restoreImage(previous);
});

redoBtn.addEventListener("click", () => {
    if (redoHistory.length === 0) return;

    history.push(canvas.toDataURL());
    const next = redoHistory.pop();
    restoreImage(next);
});

resetBtn.addEventListener("click", () => {
    saveHistory();

    imageSettings.brightness = 100;
    imageSettings.contrast = 100;
    imageSettings.saturation = 100;
    imageSettings.blur = 0;
    imageSettings.grayscale = 0;
    imageSettings.sepia = 0;
    imageSettings.invert = 0;
    imageSettings.rotation = 0;
    imageSettings.flipX = 1;
    imageSettings.flipY = 1;
    imageSettings.zoom = 1;
    imageSettings.offsetX = 0;
    imageSettings.offsetY = 0;

    brightnessSlider.value = 100;
    contrastSlider.value = 100;
    saturationSlider.value = 100;
    blurSlider.value = 0;

    brightnessValue.textContent = "100%";
    contrastValue.textContent = "100%";
    saturationValue.textContent = "100%";
    blurValue.textContent = "0px";

    grayscaleBtn.classList.remove("active");
    sepiaBtn.classList.remove("active");
    invertBtn.classList.remove("active");

    resetCropState();
    drawImage();
});

downloadBtn.addEventListener("click", () => {
    if (!image.src) return;

    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
});

zoomInBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.zoom = Math.min(imageSettings.zoom + 0.1, 5);
    drawImage();
});

zoomOutBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.zoom = Math.max(imageSettings.zoom - 0.1, 0.2);
    drawImage();
});

fitImageBtn.addEventListener("click", () => {
    saveHistory();
    imageSettings.zoom = 1;
    imageSettings.offsetX = 0;
    imageSettings.offsetY = 0;
    drawImage();
});