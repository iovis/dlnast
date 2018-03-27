#!/usr/bin/env node

const address = require('network-address');
const clivas = require('clivas');
const glob = require('glob');
const path = require('path');
const program = require('commander');

const Dlna = require('./src/Dlna');
const fileInfo = require('./src/fileInfo');
const mediaServer = require('./src/mediaServer');

process.title = 'dlnast';

program
  .version(require('./package').version, '-v, --version')
  .description('Stream your favorite media to a DLNA device in your local network')
  .usage('[options] <file>')
  .option('-s, --subtitles [file]', 'Add subtitles or auto load subtitles file with the same name')
  .option('-p, --port <port>', 'Change media server port', parseInt, 8888)
  .parse(process.argv);


// If not passed one argument, show help
if (program.args.length !== 1) program.help();

const video = fileInfo(program.args[0]);
if (!video) {
  clivas.line('{red:File not found}');
  process.exit(1);
}

let subtitles;
if (program.subtitles) {
  subtitles = fileInfo(program.subtitles);

  if (!subtitles) {
    // Select same filename but different extensions: filename!(*.mkv)
    const globPattern = `${video.basename}!(*${video.extension})`;
    const subsFiles = glob.sync(path.join(path.dirname(video.path), globPattern));

    subtitles = fileInfo(subsFiles[0]);
  }
}

// Create server
const host = address();
const port = program.port;

video.url = `http://${host}:${port}/`;
if (subtitles) subtitles.url = video.url + 'subtitles';

const server = mediaServer(video, subtitles);
server.listen(port, host);

clivas.clear();
clivas.line(`{green:Server started at} {blue:${video.url}}`);

const dlna = new Dlna();
dlna.start({ video, subtitles, server });
