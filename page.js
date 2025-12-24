function rand(min, max) {
	return min + ~~(Math.random() * (1 + max - min))
}

function randArray(array) {
	return array[rand(0, array.length - 1)];
}

function generate() {
	var canvas = document.getElementById('noisy');
	var lengthH = document.getElementById('lengthH').value;
	var lengthV = document.getElementById('lengthV').value;
	var size = document.getElementById('size').value;
	var context = canvas.getContext('2d');
	var colours = d3.select("#colours").node().value;
	var bias = d3.select("#bias").node().value;
	var overlaySrc = document.getElementById('overlayImage').value;
	
	generationId++;
	var currentGen = generationId;

	// Stop any running animation
	if (animationId) cancelAnimationFrame(animationId);
	animating = false;

	d3.select('#noisy').attr('width', lengthH * size).attr('height', lengthV * size);
	
	function handleOverlay(src) {
		if (src !== 'none') {
			// Animation Mode
			d3.select('#noisy').style('display', 'block').style('border', size + 'px solid rgb(200, 200, 200)').style('margin', '0 auto');
			d3.select('#output').style('display', 'none');

			// Save the noise background
			noiseCanvas.width = canvas.width;
			noiseCanvas.height = canvas.height;
			noiseCanvas.getContext('2d').drawImage(canvas, 0, 0);

			overlayImg.src = src;
			overlayImg.onload = function() {
				if (currentGen !== generationId) return;
				var scale = document.getElementById('imageScale').value / 100;
				imageX = -overlayImg.width * scale; // Start off-screen left
				offsetY = 0;
				animating = true;
				isPaused = false;
				animate();
			};
		} else {
			// Static Mode
			d3.select('#noisy').style('display', 'none');
			d3.select('#output').attr('width', lengthH * size).attr('height', lengthV * size).style('display', 'block');
			
			var dataURL = canvas.toDataURL();
			document.getElementById('output').src = dataURL;
			d3.select('#output').style('border-width', size + 'px');
		}
	}

	function proceed() {
		if (currentGen !== generationId) return;

		if (overlaySrc === 'upload') {
			var fileInput = document.getElementById('overlayUpload');
			if (fileInput.files && fileInput.files[0]) {
				var reader = new FileReader();
				reader.onload = function(e) {
					if (currentGen !== generationId) return;
					handleOverlay(e.target.result);
				};
				reader.readAsDataURL(fileInput.files[0]);
			} else {
				handleOverlay('none');
			}
		} else {
			handleOverlay(overlaySrc);
		}
	}

	if (colours === 'upload') {
		var fileInput = document.getElementById('bgUpload');
		if (fileInput.files && fileInput.files[0]) {
			var reader = new FileReader();
			reader.onload = function(e) {
				if (currentGen !== generationId) return;
				var bgImg = new Image();
				bgImg.onload = function() {
					if (currentGen !== generationId) return;
					context.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
					proceed();
				};
				bgImg.src = e.target.result;
			};
			reader.readAsDataURL(fileInput.files[0]);
		} else {
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, lengthH * size, lengthV * size);
			proceed();
		}
	} else if (colours.startsWith('bg_image:')) {
		var bgSrc = 'background/' + colours.split(':')[1];
		var bgImg = new Image();
		bgImg.onload = function() {
			if (currentGen !== generationId) return;
			context.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
			proceed();
		};
		bgImg.src = bgSrc;
	} else {
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, lengthH * size, lengthV * size);

		for (var x = 0; x < lengthH; x++) {
			for (var y = 0; y < lengthV; y++) {
				handleColours(colours, context, size, x, y, bias);
			}
		}
		proceed();
	}
}

var animationId;
var isPaused = false;
var imageX = 0;
var offsetY = 0;
var noiseCanvas = document.createElement('canvas');
var overlayImg = new Image();
var animating = false;
var generationId = 0;

function animate() {
	if (!animating) return;

	var canvas = document.getElementById('noisy');
	var ctx = canvas.getContext('2d');

	// Restore noise background
	ctx.drawImage(noiseCanvas, 0, 0);

	// Draw overlay image
	if (overlayImg.complete) {
		var scale = document.getElementById('imageScale').value / 100;
		var dWidth = overlayImg.width * scale;
		var dHeight = overlayImg.height * scale;

		var imageY = (canvas.height - dHeight) / 2 + offsetY;
		ctx.drawImage(overlayImg, imageX, imageY, dWidth, dHeight);
		
		if (!isPaused) {
			// Move right
			imageX += 2;
			
			// Loop
			if (imageX > canvas.width) {
				imageX = -dWidth;
			}
		}
	}
	
	animationId = requestAnimationFrame(animate);
}

function togglePause() {
	isPaused = !isPaused;
}

function restartAnimation() {
	var scale = document.getElementById('imageScale').value / 100;
	imageX = -overlayImg.width * scale;
	offsetY = 0;
}

function adjustPosition(direction) {
	var step = 10;
	if (direction === 'up') offsetY -= step;
	if (direction === 'down') offsetY += step;
	if (direction === 'left') imageX -= step;
	if (direction === 'right') imageX += step;
}

function setMonochrome(context, size, x, y, bias) {
	context.fillStyle = '#000000';
	var isDrawing = Math.random() > .5;
	var chance = { verylight: .833, light: .666, none: .5, dark: .333, verydark: .166 };
	isDrawing = Math.random() > chance[bias];
	if (isDrawing) {
		context.fillRect(x * size, y * size, size, size);
	}
}

function setGreyscale(context, size, x, y, bias) {
	var ranges = { verylight: [255 / 2, 255], light: [255 / 4, 255], none: [0, 255], dark: [0, 255 / 2], verydark: [0, 255 / 4]}
	var start, end;
	[start, end] = ranges[bias];
	var grey = rand(start, end);
	context.fillStyle = 'rgb(' + grey + ',' + grey + ',' + grey + ')';
	context.fillRect(x * size, y * size, size, size);
}

function setRgb3Bit(context, size, x, y, bias) {
	context.fillStyle = 'rgb(' + rand(0, 1) * 255 + ',' + rand(0, 1) * 255 + ',' + rand(0, 1) * 255 + ')';
	switch (bias) {
		case 'verylight':
			context.fillStyle = randArray([ '#0FF', '#F0F', '#FF0', '#FFF' ]);
			break;
		case 'light':
			context.fillStyle = randArray([ '#0FF', '#F0F', '#FF0', '#FFF', '#0FF', '#F0F', '#FF0', '#FFF', '#F00', '#0F0', '#00F' ]);
			break;
		case 'dark':
			context.fillStyle = randArray([ '#0FF', '#F0F', '#FF0', '#000', '#F00', '#0F0', '#00F', '#000', '#F00', '#0F0', '#00F' ]);
			break;
		case 'verydark':
			context.fillStyle = randArray([ '#F00', '#0F0', '#00F', '#000' ]);
			break;
	}
	context.fillRect(x * size, y * size, size, size);
}

function setCustom(context, size, x, y, amount) {
	var colours = []
	for (var a = 1; a <= amount; a++) {
		colours.push(document.getElementById('customcolour'+a).value);
	}
	context.fillStyle = randArray(colours);
	context.fillRect(x * size, y * size, size, size);
}

function handleColours(colours, context, size, x, y, bias) {
	switch (colours) {
		case 'custom_2':
		case 'custom_3':
		case 'custom_4':
		case 'custom_5':
			setCustom(context, size, x, y, +colours.split('_')[1]);
			break;
		case 'monochrome':
			setMonochrome(context, size, x, y, bias);
			break;
		case 'greyscale':
			setGreyscale(context, size, x, y, bias);
			break;
		case 'rgb_3bit':
			setRgb3Bit(context, size, x, y, bias);
			break;
		case 'rgb_6bit':
			var ranges = { verylight: [2, 3], light: [1, 3], none: [0, 3], dark: [0, 2], verydark: [0, 1]}
			var start, end;
			[start, end] = ranges[bias];
			context.fillStyle = 'rgb(' + rand(start, end) * 85 + ',' + rand(start, end) * 85 + ',' + rand(start, end) * 85 + ')';
			context.fillRect(x * size, y * size, size, size);
			break;
		case 'rgb_12bit':
			var ranges = { verylight: [3, 5], light: [1, 5], none: [0, 5], dark: [0, 4], verydark: [0, 2]}
			var start, end;
			[start, end] = ranges[bias];
			context.fillStyle = 'rgb(' + rand(start, end) * 51 + ',' + rand(start, end) * 51 + ',' + rand(start, end) * 51 + ')';
			context.fillRect(x * size, y * size, size, size);
			break;
		case 'rgb_24bit':
		case 'red':
		case 'green':
		case 'blue':
			var ranges = { verylight: [170, 255], light: [128, 255], none: [0, 255], dark: [0, 128], verydark: [0, 85]}
			var start, end;
			[start, end] = ranges[bias];
			switch (colours) {
				case 'red':
					context.fillStyle = 'rgb(' + rand(start, end) + ',0,0)';
					break;
				case 'green':
					context.fillStyle = 'rgb(0,' + rand(start, end) + ',0)';
					break;
				case 'blue':
					context.fillStyle = 'rgb(0,0,' + rand(start, end) + ')';
					break;
				case 'rgb_24bit':
					context.fillStyle = 'rgb(' + rand(start, end) + ',' + rand(start, end) + ',' + rand(start, end) + ')';
					break;
			}
			context.fillRect(x * size, y * size, size, size);
			break;
	}
}

function stats() {
	var lengthH = document.getElementById('lengthH').value;
	var lengthV = document.getElementById('lengthV').value;
	var size = document.getElementById('size').value;
	var uhoh = lengthH * size >= 5000 || lengthV * size >= 5000;
	d3.select('#generate').attr('value', "Generate (" + lengthH * size + "x" + lengthV * size + ")");
	d3.select('#warning').style('display', uhoh ? 'inline' : 'none');
	d3.select('#generate').style('color', uhoh ? 'red' : 'black');
}

function changedColourType() {
	const colourSelect = document.getElementById("colours");
	const customcolourRow = document.getElementById("custom-colour-row");
	const biasRow = document.getElementById("bias-row");
	const bgUploadRow = document.getElementById("bg-upload-row");

	const isCustom = colourSelect.value.startsWith('custom');
	const isUpload = colourSelect.value === 'upload';

	customcolourRow.style.display = isCustom ? "table-row" : "none";
	bgUploadRow.style.display = isUpload ? "table-row" : "none";
	biasRow.style.display = (isCustom || isUpload) ? "none" : "table-row";

	if (isCustom) {
		var amount = colourSelect.value.split('_')[1]
		console.log(amount)
		for (var a = 1; a <= 5; a++) {
			var control = document.getElementById('customcolour' + a);
			control.style.display = a <= amount ? null : 'none';
		}
	}
}

function changedOverlayType() {
	const overlaySelect = document.getElementById("overlayImage");
	const overlayUploadRow = document.getElementById("overlay-upload-row");
	overlayUploadRow.style.display = overlaySelect.value === 'upload' ? "table-row" : "none";
}

stats();
generate();
changedColourType();
changedOverlayType();