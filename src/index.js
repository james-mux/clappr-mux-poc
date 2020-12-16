import mux from 'mux-embed';

const log = mux.log;
const secondsToMs = mux.utils.secondsToMs;
const assign = mux.utils.assign;

// Helper function to generate "unique" IDs for the player if your player does not have one built in
const generateShortId = function () {
  return ('000000' + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-6);
};

const initClapprPlayerMux = function (player, options, clappr = window.Clappr) {
  // Make sure we got a player - Check properties to ensure that a player was passed
  if (typeof player !== 'object') {
    log.warn('[clappr-mux] You must provide a valid yourPlayer to initYourPlayerMux.');
    return;
  }

  // Prepare the data passed in
  options = options || {};

  options.data = assign({
    player_software_name: 'Clappr',
    player_software_version: clappr.version,
    player_mux_plugin_name: 'clappr-mux',
    player_mux_plugin_version: '[AIV]{version}[/AIV]'
  }, options.data);

  // Retrieve the ID and the player element
  const playerID = generateShortId();

  let isSeeking = false;
  let sourceHeight = 0;
  let sourceWidth = 0;

  // Enable customers to emit events through the player instance
  player.mux = {};
  player.mux.emit = function (eventType, data) {
    mux.emit(playerID, eventType, data);
  };

  // Allow mux to retrieve the current time - used to track buffering from the mux side
  // Return current playhead time in milliseconds
  options.getPlayheadTime = () => {
    return calculatePlayheadTime();
  };

  const getIsLive = function () {
    if (player.core.getCurrentPlayback().getPlaybackType() === 'vod' && player.getDuration() === 0) {
      return null;
    }
    return player.core.getCurrentPlayback().getPlaybackType() === 'live';
  };

  const calculatePlayheadTime = function () {
    if (getIsLive()) {
      return secondsToMs(player.getCurrentTime()) + secondsToMs(player.getStartTimeOffset());
    }
    return secondsToMs(player.getCurrentTime());
  };

  options.getStateData = () => {
    return {
      // Required properties - these must be provided every time this is called
      player_is_paused: isPaused(),
      player_width: player.options.width,
      player_height: player.options.height,
      video_source_height: sourceHeight,
      video_source_width: sourceWidth,

      // Preferred properties - these should be provided in this callback if possible
      player_is_fullscreen: false,
      // player_autoplay_on: false,
      // player_preload_on: false,
      video_source_url: player.options.source,
      // video_source_mime_type: player.src().mimeType,
      video_source_duration: secondsToMs(player.getDuration())

      // Optional properties - if you have them, send them, but if not, no big deal
      // video_poster_url: player.poster().url(), // Return the URL of the poster image used
      // player_language_code: player.language() // Return the language code (e.g. `en`, `en-us`)
    };
  };

  const isPaused = function () {
    if (player.isPlaying()) {
      return false;
    } else {
      return true;
    }
  };

  // Emit the `pause` event when the player is instructed to pause playback
  player.core.getCurrentPlayback().on(clappr.Events.PLAYBACK_PAUSE, () => {
    player.mux.emit('pause');
  });

  // Emit the `play` event when the player is instructed to start playback of the content
  player.core.getCurrentPlayback().on(clappr.Events.PLAYBACK_PLAY_INTENT, () => {
    player.mux.emit('play');
  });

  // Emit the `playing` event when the player begins actual playback of the content
  player.core.getCurrentPlayback().on(clappr.Events.PLAYBACK_PLAY, () => {
    if (isSeeking) {
      player.mux.emit('seeked');
      isSeeking = false;
    }
    player.mux.emit('playing');
  });

  // Emit the `seeking` event when the player begins seeking to a new position in playback
  player.on(clappr.Events.PLAYER_SEEK, () => {
    isSeeking = true;
    player.mux.emit('seeking');
  });

  // Emit the `timeupdate` event when the current playhead position has progressed in playback
  // This event should happen at least every 250 milliseconds
  player.on(clappr.Events.PLAYER_TIMEUPDATE, (e) => {
    player.mux.emit('timeupdate', {
      player_playhead_time: calculatePlayheadTime()
    });
  });

  // Emit the `error` event when the current playback has encountered a fatal error
  player.core.getCurrentPlayback().on(clappr.Events.PLAYBACK_ERROR, (e) => {
    log.warn(e);
    player.mux.emit('error', {
      player_error_code: e.code, // The code of the error
      player_error_message: e.description // The message of the error
    });
  });

  // Emit the `ended` event when the current asset has played to completion,
  // without error.
  player.core.getCurrentPlayback().on(clappr.Events.PLAYBACK_ENDED, () => {
    player.mux.emit('ended');
  });

  // Emit the 'renditionchange' event so Mux can calculate bitrate consumption metrics
  player.core.getCurrentPlayback().on(clappr.Events.PLAYBACK_BITRATE, (e) => {
    sourceHeight = e.height;
    sourceWidth = e.width;
    player.mux.emit('renditionchange', {
      video_source_bitrate: e.bandwidth,
      video_source_height: e.height,
      video_source_width: e.width
    });
  });

  // If your player has a destroy/dispose event to clean up the player, pass
  // this on to Mux as a `destroy` event.
  player.on('destroyEvent', () => {
    // Turn off all listeners for your player if that's possible/needed
    // Then emit `destroy`
    player.mux.emit('destroy');
  });

  // Lastly, initialize the tracking
  mux.init(playerID, options);
  // Emit 'playerready' as Clappr doesn't seem to have an event we can use for this
  player.mux.emit('playerready');
};

export default initClapprPlayerMux;
