AudioSprite = function (src) {
	var _this = this,
	    audio = new Audio();
	
	audio.src = src;
	audio.autobuffer = true;
	audio.load();
		 
	var _forcePauseOnLoad = function () {
		audio.pause();
		audio.removeEventListener('play', _forcePauseOnLoad, false);
	};	
	audio.addEventListener('play', _forcePauseOnLoad, false);

	/////////////////////////////////////////////////////////////////////////////
	// PUBLIC STUFF	
	/////////////////////////////////////////////////////////////////////////////
	this.audio = audio;
	this.playing = false;

	/**
	 * Triggers loading of sprite source
	 */
	this.load = function () {
		audio.play();
	};

	/** 
	 * Pause audio sprute at current position 
	 * @param seekTime (optional) seeking to next sound directly after pause (if 
	 *                            you know what it will be) can reduce time to 
	 *                            play next sound and make it feel more responsive
	 */
	this.pause = function (seekTime) {
		audio.pause();
		if (seekTime) {
			audio.currentTime = seekTime;
		}
		_this.playing = false;
		clearInterval(_this._timer); // Consider using rAF hook instead: Render.stopRender(_this._checkCurrentTime);	
		clearTimeout(_this._backupTimeout);
	};
}


AudioSprite.prototype.play = function (startTime, duration) {
	var _this = this,
			audio = this.audio,
			nextTime = startTime + duration,
			startTime = Math.round(startTime*100)/100; // seeking to time with too many decimals sometimes ignored by audio tag

	// Consider adding something like this to skip sound if frame rate drops
	// if (Global.LAST_FRAME > 1000) {
	//   return;
	// }

	var progress = function () {
		audio.removeEventListener('progress', progress, false);
		if (_this.updateCallback !== null && _this.playing) {
			_this.updateCallback();
		}
	};

	var delayPlay = function () {
		_this.updateCallback = function () {
			_this.updateCallback = null;
			
			if (waitForDuration() || !audio.duration) {
				// still no duration - server probably doesn't send "Accept-Ranges" headers - aborting');
				return;
			}

			audio.currentTime = startTime;
			audio.play();
		};
		audio.addEventListener('progress', progress, false);
	};
	
	// Check if audio tag is missing duration
	// missing audio.duration is NaN in Firefox
	// missing missing audio.duration is Infinity in Mobile Safari
	// missing audio.duration is 100 in Chrome on Android
	var waitForDuration = function () {
		return !isFinite(audio.duration) || audio.duration === 100;
	};

	_this.playing = true; 
	_this.updateCallback = null;
	audio.removeEventListener('progress', progress, false);

	clearTimeout(_this._backupTimeout);
	clearInterval(_this._timer); //Render.stopRender(_this._checkCurrentTime);
	
	audio.pause();

	try {
		// try seeking to sound to play
		if (startTime == 0) startTime = 0.01; // http://remysharp.com/2010/12/23/audio-sprites/
		if (audio.currentTime !== startTime) audio.currentTime = startTime;

		// make sure we can read duration of audio tag, otherwise we can't seek
		if (waitForDuration() || Math.round(audio.currentTime*100)/100 < startTime) {
			delayPlay();
		} else {
			audio.play();
		}
	} catch (e) {
		delayPlay();
	}

	// checks if audio tag has played past current sound and should pause
	_this._checkCurrentTime = function () {
		if (audio.currentTime >= nextTime) {
			_this.pause();
			clearTimeout(_this._backupTimeout);
		}
	}

	// In some cases on Android the audio tag's currentTime doesn't update though the audio is still playing.
	// We setup a fallback timeout to pause 1 second after the current sprite's end time
	// Space sounds more than 1s apart in sprite to be make sure no extra sounds are played
	// Normally this backup timeout is cancelled by _checkCurrentTime()
	_this._backupTimeout = setTimeout(function () {
		_this.pause();
	}, (duration * 1000) + 1000);

	// Consider using requestAnimationFrame instead and hook into your app's 
	// render looop, e.g. Render.startRender(_this._checkCurrentTime);
	_this._timer = setInterval(_this._checkCurrentTime, 10);	
};