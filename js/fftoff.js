/* 
 *  fftoff.js - a javascript 
 * 
 *  Created by Luis Joglar <luis@luisjoglar.com> on 3-14-16 (#piDay)
 *  University of Huddersfield
 *  Copyright 2016 Luis Joglar. All rights reserved.
 *
 */


function fftOffline(url){

	window.AudioContext = window.AudioContext||window.webkitAudioContext;
	this.audioContext = new AudioContext();
	this.url = url,
	this.audioBuffer = undefined,
	this.frameBuffersArray = [],
	this.fftArray = undefined,
	this.fftSize = 2048,					//also frame-buffer size
	this.sampleRate = 44100,
	this.percentOverlap = 50,

	this.fftAnalysis = function(){
		this.fftArray = [];
		// create instance of dsp.js fft
		var fft = new FFT(this.fftSize, this.sampleRate);
		// create instance of dsp.js window function
		// (window types Hamming = 6; Hann = 7;)
		var windowType = 6;											
		var wind = new WindowFunction(windowType);

		// for each frame buffer apply window and fft
		for (var i = 0; i < this.frameBuffersArray.length; i++){
			var frameBuffer = this.frameBuffersArray[i].slice();
			// apply window function from dsp.js
			wind.process(frameBuffer);
		    // apply fft from dsp.js
		    fft.forward(frameBuffer);
		    // store fft spectrum in array
			this.fftArray.push(fft.spectrum.slice());
		}
	};

	this.divideInFrameBuffers = function(){
		var frameBuffer = [];
		var newDataBuffer = [];
		var newDataSize = Math.round((100 - this.percentOverlap) * this.fftSize / 100);
		var overlapSize = this.fftSize - newDataSize;
		var prevFrameBuffer = new Array(this.fftSize);
		var frameBuffersArray = this.frameBuffersArray;

		for (i = 0; i < this.audioBuffer.getChannelData(0).length; i++){
			// frameBuffer = [];
			// first frame without overlap
			if(i < this.fftSize){		
				frameBuffer.push(this.audioBuffer.getChannelData(0)[i]);
			}
			// not first frame and not a multiple of newDataSize -> populate newDataBuffer
			else if(i >= this.fftSize && (i % newDataSize) != 0){
				newDataBuffer.push(this.audioBuffer.getChannelData(0)[i]);
			}
			// every newDataSize samples
			else{
				// if its not the first frame buffer
				// compose the new frame buffer with: % of previous frame + rest new samples
				if(prevFrameBuffer[0] != null){
					frameBuffer = prevFrameBuffer.slice(prevFrameBuffer.length - overlapSize, prevFrameBuffer.length);
					frameBuffer = frameBuffer.concat(newDataBuffer);
				}
				frameBuffersArray.push(frameBuffer);

				// reset newDataBuffer
				newDataBuffer = [];
				// start populating the next newDataBuffer
				newDataBuffer.push(this.audioBuffer.getChannelData(0)[i]);
				//update previous frame buffer with actual frame buffer
				prevFrameBuffer = frameBuffer;
			}
			// last element
			if(i === this.audioBuffer.getChannelData(0).length -1){
				// if in last buffer newDataBuffer smaller than newDataSize
				// if(newDataBuffer.length < newDataSize){
				if( i % newDataSize !== 0){
					// zero pad last frame buffer
					var zerosArray = this.zeros(newDataSize - newDataBuffer.length);
					frameBuffer = prevFrameBuffer.slice(prevFrameBuffer.length - overlapSize, prevFrameBuffer.length);
					frameBuffer = frameBuffer.concat(newDataBuffer);
					frameBuffer = frameBuffer.concat(zerosArray);
					frameBuffersArray.push(frameBuffer);
				}
				this.fftAnalysis();
			}
		}
	};

	this.zeroPad = function(end, numZeros){
		var end = (end !== undefined) ? end : true;
		var length = this.audioBuffer.getChannelData(0).length;
		var module = length % this.fftSize;
		var numZeros = numZeros ? numZeros : this.fftSize - module;
		if(numZeros !== 0){
			var temp = new Float32Array(length + numZeros);
			if(end){
				temp.set(new Float32Array( this.audioBuffer.getChannelData(0)), 0 );
				temp.set(new Float32Array( numZeros ).fill(0), length);
			}
			else{
				temp.set(new Float32Array( numZeros ).fill(0) , 0 );
				temp.set(new Float32Array( this.audioBuffer.getChannelData(0)), numZeros );
			}
			this.audioBuffer = this.audioContext.createBuffer(1, length + numZeros, this.audioContext.sampleRate);
			this.audioBuffer.copyToChannel(temp , 0, 0);
		}
	};

	this.zeros = function(length){
		return [].slice.apply(new Uint8Array(new Array(length)));
	};

	this.loadBuffer = function(){
		// Load buffer asynchronously
		var that = this;
		var request = new XMLHttpRequest();
		var url = this.url;

		request.open("GET", url, true);
		request.responseType = "arraybuffer";

		request.onload = function() {
			// Asynchronously decode the audio file data in request.response
			that.audioContext.decodeAudioData(
				request.response,
				function(buffer) {
					if (!buffer) {
						alert('error decoding file data: ' + url);
						return;
					}
					that.audioBuffer = buffer;
					that.zeroPad(true);
					that.finishedLoading(url);
					that.divideInFrameBuffers();
				},
				function(error) {
					console.error('decodeAudioData error', error);
				}
			);
		};
		request.onerror = function() {
		alert('BufferLoader: XHR error');
		};
		request.send();
	};

	this.finishedLoading = function(loaderTrackUrl) {
		console.log("Finished Loading: " + loaderTrackUrl);
	};
}



