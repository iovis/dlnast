#!/usr/bin/env node

const address = require('network-address');
const clivas = require('clivas');
const glob = require('glob');
const optimist = require('optimist');
const path = require('path');
const rc = require('rc');

const Dlna = require('./src/Dlna');
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

video.url = `http://${host}:${port}/`;
if (subtitles) subtitles.url = video.url + 'subtitles';

const server = mediaServer(video, subtitles);
server.listen(port, host);

clivas.clear();
clivas.line(`{green:Server started at} {blue:${video.url}}`);

const dlna = new Dlna();
dlna.start({ video, subtitles, server });
