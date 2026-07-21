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

// ===============================
// Canvas
// ===============================

canvas.width = 900;
canvas.height = 600;

// ===============================
// Image
// ===============================

let image = new Image();
let imageLoaded = false;

// ===============================
// Crop Variables
// ===============================

let cropMode = false;
let isCropping = false;
let cropActive = false;
let cropStartX = 0;
let cropStartY = 0;
let cropEndX = 0;
let cropEndY = 0;

// ===============================
// Undo / Redo
// ===============================

let history = [];
let redoHistory = [];

// ===============================
// Image Settings
// ===============================

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

// ===============================
// Helpers
// ===============================

function resetCropState() {
    cropMode = false;
    isCropping = false;
    cropActive = false;
    cropStartX = 0;
    cropStartY = 0;
    cropEndX = 0;
    cropEndY = 0;
    applyCropBtn.style.display = "none";
    canvas.style.cursor = "default";
}

function getCropRect() {
    const x = Math.min(cropStartX, cropEndX);
    const y = Math.min(cropStartY, cropEndY);
    const w = Math.abs(cropEndX - cropStartX);
    const h = Math.abs(cropEndY - cropStartY);
    return { x, y, w, h };
}

function pointInRect(x, y, rect) {
    return (
        x >= rect.x &&
        x <= rect.x + rect.w &&
        y >= rect.y &&
        y <= rect.y + rect.h
    );
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

// ===============================
// Upload Image
// ===============================

fileInput.addEventListener("change", (e) => {
    loadImage(e.target.files[0]);
});

// ===============================
// Drag and Drop
// ===============================

["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.addEventListener(eventName, preventDefaults, false);
});

dropArea.addEventListener("dragenter", () => {
    dropArea.classList.add("drag-over");
});

dropArea.addEventListener("dragover", () => {
    dropArea.classList.add("drag-over");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("drag-over");
});

dropArea.addEventListener("drop", () => {
    dropArea.classList.remove("drag-over");
});

dropArea.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    loadImage(file);
});

// ===============================
// Draw Image
// ===============================

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

    if (cropMode) {
        const { x, y, w, h } = getCropRect();
        ctx.save();
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 5]);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }
}

// ===============================
// Sliders
// ===============================

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

// ===============================
// Filter Buttons
// ===============================

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

// ===============================
// Rotation
// ===============================

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

// ===============================
// Flip
// ===============================

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

// ===============================
// Mouse Wheel Zoom
// ===============================

canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!image.src) return;

    saveHistory();

    if (e.deltaY < 0) imageSettings.zoom += 0.1;
    else imageSettings.zoom -= 0.1;

    imageSettings.zoom = Math.max(0.2, Math.min(imageSettings.zoom, 5));
    drawImage();
}, { passive: false });

// ===============================
// Drag and Crop Handling
// ===============================

let isDragging = false;
let startX = 0;
let startY = 0;

canvas.addEventListener("mousedown", (e) => {
    if (!image.src) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (cropMode) {
        const currentCrop = getCropRect();

        if (cropActive && currentCrop.w > 0 && currentCrop.h > 0 && pointInRect(x, y, currentCrop)) {
            isCropping = true;
            cropStartX = x;
            cropStartY = y;
            cropEndX = x;
            cropEndY = y;
        } else {
            cropActive = true;
            isCropping = true;
            cropStartX = x;
            cropStartY = y;
            cropEndX = x;
            cropEndY = y;
        }

        canvas.style.cursor = "crosshair";
        return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (cropMode && isCropping) {
        cropEndX = x;
        cropEndY = y;
        drawImage();
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

canvas.addEventListener("mouseup", () => {
    isDragging = false;
    isCropping = false;
});

canvas.addEventListener("mouseleave", () => {
    isDragging = false;
    isCropping = false;
});

// ===============================
// Crop Mode
// ===============================

cropBtn.addEventListener("click", () => {
    cropMode = true;
    cropActive = false;
    isCropping = false;
    applyCropBtn.style.display = "block";
    canvas.style.cursor = "crosshair";
});

applyCropBtn.addEventListener("click", () => {
    if (!image.src) return;

    const { x, y, w, h } = getCropRect();
    if (w < 10 || h < 10) return;

    saveHistory();

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = w;
    tempCanvas.height = h;

    tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

    image = new Image();
    image.onload = function () {
        imageLoaded = true;
        resetCropState();
        resetTransformOnly();
        drawImage();
    };
    image.src = tempCanvas.toDataURL("image/png");
});

// ===============================
// Undo / Redo
// ===============================

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

// ===============================
// Reset
// ===============================

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

// ===============================
// Download
// ===============================

downloadBtn.addEventListener("click", () => {
    if (!image.src) return;

    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
});

// ===============================
// Zoom Buttons
// ===============================

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