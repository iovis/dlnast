#!/usr/bin/env node

const address = require('network-address');
const clivas = require('clivas');
const fs = require('fs');
const glob = require('glob');
const http = require('http');
const keypress = require('keypress');
const mime = require('mime');
const optimist = require('optimist');
const path = require('path');
const rc = require('rc');

const fileInfo = require('./src/fileInfo');

process.title = 'dlnast';

var argv = rc('dlnast', {}, optimist
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
var videoPath = argv._[0];
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
const subtitlesUrl = serverUrl + 'subtitles';

var server = http.createServer(function (req, res) {
  var url = req.url;

  if (req.headers.range) {   // meaning client (browser) has moved the forward/back slider
    var range = req.headers.range;
    var parts = range.replace(/bytes=/, '').split('-');
    var partialstart = parts[0];
    var partialend = parts[1];

    var start = parseInt(partialstart, 10);
    var end = partialend ? parseInt(partialend, 10) : video.size - 1;
    var chunksize = (end - start) + 1;
    // clivas.line('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

    var file = fs.createReadStream(video.path, {start: start, end: end});

    res.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + video.size,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': video.mime
    });

    file.pipe(res);
  }

  if (url === '/') {
    const headers = {
      'Content-Length': video.size,
      'transferMode.dlna.org': 'Streaming',
      'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
      'Content-Type': video.mime
    };

    if (subtitles) headers['CaptionInfo.sec'] = subtitlesUrl;

    res.writeHead(200, headers);

    fs.createReadStream(video.path).pipe(res);
  } else if (subtitles && url === '/subtitles') {
    var subs_total = fs.statSync(subtitles.path).size;

    res.writeHead(200, {
      'Content-Length': subs_total,
      'transferMode.dlna.org': 'Streaming',
      'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
      'CaptionInfo.sec': subtitlesUrl,
      'Content-Type': subtitles.mime
    });

    fs.createReadStream(subtitles.path).pipe(res);
  }
});

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
    options.subtitles = [subtitlesUrl];
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
