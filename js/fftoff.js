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
	this.url = url,							// audio file url
	this.audioBuffer = undefined,
	this.frameBuffersArray = [],			// array containing the overlaped audio buffers
	this.fftArray = undefined,				// array containing the fft for each frame buffer
	this.fftSize = 2048,					// also frame-buffer size
	this.sampleRate = 44100,
	this.percentOverlap = 50,

	/*
	Function fftAnalysis()
	Applies windowing and fft (from external libraries) to each frame buffer
	*/
	this.fftAnalysis = function(){
		this.fftArray = [];
		var fft = new FFT(this.fftSize, this.sampleRate);	// create instance of dsp.js fft
		var windowType = 6;									// (window types Hamming = 6; Hann = 7;)
		var wind = new WindowFunction(windowType);			// create instance of dsp.js window function

		// for each frame buffer apply window and fft
		for (var i = 0; i < this.frameBuffersArray.length; i++){
			var frameBuffer = this.frameBuffersArray[i].slice();	// copy frame buffer into variable
			wind.process(frameBuffer);								// apply window function from dsp.js
			fft.forward(frameBuffer);								// apply fft from dsp.js
			this.fftArray.push(fft.spectrum.slice());				// store fft spectrum in array
		}
	};


	/*
	Function divideInFrameBuffers()
	Divides the audioBuffer data (mono channel) in frame buffers applying overlap
	*/
	this.divideInFrameBuffers = function(){
		var frameBuffer = [];										// variable to fill with each frame samples
		var newDataBuffer = [];										// section of new (non-overlaped) samples
		var newDataSize = Math.round((100 - this.percentOverlap) * this.fftSize / 100);	// size in samples of the new data
		var overlapSize = this.fftSize - newDataSize;				// size in samples of overlaped data
		var prevFrameBuffer = new Array(this.fftSize);				// array containing previous frame buffer

		for (i = 0; i < this.audioBuffer.getChannelData(0).length; i++){
			if(i < this.fftSize){													// first frame without overlap
				frameBuffer.push(this.audioBuffer.getChannelData(0)[i]);
			}
			else if(i >= this.fftSize && (i % newDataSize) != 0){					// not first frame and not a multiple of newDataSize -> populate newDataBuffer
				newDataBuffer.push(this.audioBuffer.getChannelData(0)[i]);
			}
			else{																	// every newDataSize samples
																					// if its not the first frame buffer
				if(prevFrameBuffer[0] != null){										// populate new frame buffer with: overlapSize previous frame + newDataSize new samples
					frameBuffer = prevFrameBuffer.slice(prevFrameBuffer.length - overlapSize, prevFrameBuffer.length);
					frameBuffer = frameBuffer.concat(newDataBuffer);
				}
				this.frameBuffersArray.push(frameBuffer);

				newDataBuffer = [];														// reset newDataBuffer
				newDataBuffer.push(this.audioBuffer.getChannelData(0)[i]);				// start populating the next newDataBuffer
				prevFrameBuffer = frameBuffer;											// update previous frame buffer with actual frame buffer
			}

			if(i === this.audioBuffer.getChannelData(0).length -1){						// last element
				if( i % newDataSize !== 0){												// if in last buffer newDataBuffer smaller than newDataSize
					var zerosArray = this.zeros(newDataSize - newDataBuffer.length);	// zero pad last frame buffer
					frameBuffer = prevFrameBuffer.slice(prevFrameBuffer.length - overlapSize, prevFrameBuffer.length);
					frameBuffer = frameBuffer.concat(newDataBuffer);
					frameBuffer = frameBuffer.concat(zerosArray);
					this.frameBuffersArray.push(frameBuffer);
				}
				this.fftAnalysis();
			}
		}
	};

	/*
	Function zeroPad(end, numZeros)
	adds zeros at the begging or the end of the audioBuffer
	* end (boolean). determines if the padding is at the beggining or at the end
	* numZeros (int). add especific number of zeros
	*/
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

	/*
	Function zeros(length)
	returns an array with a determined length filled with zeros
	*length (int). length of the returned array
	*/
	this.zeros = function(length){
		return [].slice.apply(new Uint8Array(new Array(length)));
	};


	/*
	Function loadBuffer()
	loads an audio file and decodes the data into an audioBuffer
	*/
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



