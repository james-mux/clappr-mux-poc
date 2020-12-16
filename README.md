# Clappr-Mux (PoC)

This repo is a POC Mux Data integration with Clappr.

## Developing

First off, install dependencies:

`yarn install`

Then, open up the index.html and set your video source, as well as any other Mux Metadata you want to use whilst developing and testing.

To get things running locally, run 

`yarn run start`

and you can then test out the integration via:

* http://localhost:8080/index.html

The sample include the `debug: true` value in the options passed to the SDK, which will cause the underlying Mux SDK to log debug information, such as events that are sent (or would have been sent if something had gone wrong).

webpack-dev-server will automatically reload and rebuild the plugin when changes are made to `index.js`.

## Building

Within `package.json`, there is a target to package everything up for hosting/deploying. You can run this via

`yarn run package`

When you do this, it will run a linter automatically, and package everything up so that you should be able to include this within a normal `<script>` tag.

## Current Limitations
- Ad Playback is not currently tracked
- `seeked` event is simulated when playing resumes
- `playheadTime` reporting for live videos needs further work / investigation
- Fullscreen, Autoplay and Preload detection is currently unavailable
- Calling Clappr's `destroy` does not currently destroy Mux too
- Bandwidth Throughput data is not currently tracked
