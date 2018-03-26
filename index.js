#!/usr/bin/env node

const address = require('network-address');
const clivas = require('clivas');
const glob = require('glob');
const keypress = require('keypress');
const optimist = require('optimist');
const path = require('path');
const rc = require('rc');

const fileInfo = require('./src/fileInfo');
const mediaServer = require('./src/mediaServer');

process.title = 'dlnast';

const argv = rc('dlnast', {}, optimist
  .usage('Usage: $0 [options] file')
  .alias('s', 'auto-sub').describe('s', 'auto load subtitles with the same video name').boolean('s')
  .alias('t', 'sub-file').describe('t', 'load subtitles file')
  .alias('p', 'port').describe('p', 'change the server port').default('p', 8888)
  .alias('v', 'version').describe('v', 'prints current version').boolean('v')
  .argv);

if (argv.version) {
  console.log(require('./package').version);
  process.exit(0);
}

// If no filename, show help
const videoPath = argv._[0];
if (!videoPath) {
  optimist.showHelp();
  process.exit(1);
}

const video = fileInfo(videoPath);

if (!video) {
  clivas.line('{red:File not found}');
  process.exit(1);
}

// If auto load subtitles
if (argv.s) {
  const globPattern = `${video.basename}!(*${video.extension})`;  // 'filename!(*.mkv)'
  const subsFiles = glob.sync(path.join(path.dirname(video.path), globPattern));

  // Overwrite the 't' parameter if file found
  if (subsFiles.length) argv.t = subsFiles[0];
}

// If subtitles given
let subtitles;
if (argv.t) {
  subtitles = fileInfo(argv.t);
}

// Create server
const host = address();
const port = argv.port;
const serverUrl = `http://${host}:${port}/`;
if (subtitles) subtitles.url = serverUrl + 'subtitles';

const server = mediaServer(video, subtitles);
server.listen(port, host);

clivas.clear();
clivas.line('{green:Server started at }' + '{blue:' + serverUrl + '}');

// Send to dlna
const dlnacasts = require('dlnacasts')();

dlnacasts.on('update', function (player) {
  const options = { title: video.path, type: video.mime };
  clivas.line('{green:Sending }' + '{blue:' + video.path + '}' + '{green: to }' + '{blue:' + player.name + '}');

  if (subtitles) {
    clivas.line('{green:Subtitles file }' + '{blue:' + subtitles.path + '}');
    options.subtitles = [subtitles.url];
  }

  player.play(serverUrl, options);

  var paused = false;
  clivas.line('{green:Press }' + '{blue:<Space> }' + '{green:to Play/Pause and }' + '{blue:q }' + '{green:to quit}');

  // listen for keypresses
  keypress(process.stdin);
  process.stdin.on('keypress', function (ch, key) {
    if (!key) return;

    if (key.name == 'space') {
      (paused) ? player.resume() : player.pause();
      paused = !paused;
    }

    if (key.name == 'q' || (key.ctrl && key.name == 'c')) {
      player.stop(function () {
        clivas.line('{red:Stopped}');
        server.close();
        process.exit(0);
      });
    }
  });

  process.stdin.setRawMode(true);
});
