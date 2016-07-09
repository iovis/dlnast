#!/usr/bin/env node

var address = require('network-address'),
    Browser = require('nodecast-js'),
    Client  = require('upnp-mediarenderer-client'),
    fs = require('fs'),
    glob = require('glob'),
    http = require('http'),
    keypress = require('keypress'),
    mime = require('mime'),
    optimist = require('optimist'),
    path = require('path'),
    rc = require('rc');

process.title = 'dlnast';

var argv = rc('dlnast', {}, optimist
  .usage('Usage: $0 [options] file')
  .alias('s', 'auto-sub').describe('s', 'auto load subtitles with the same video name').boolean('s')
  .alias('t', 'sub-file').describe('t', 'load subtitles file')
  .alias('p', 'port').describe('p', 'change the server port').default('p', 8888)
  .alias('v', 'version').describe('v', 'prints current version').boolean('v')
  .argv)

if (argv.version) {
  console.error(require('./package').version)
  process.exit(0)
}

// If no filename, show help
var video_path = argv._[0];
if (!video_path) {
  optimist.showHelp()
  process.exit(1)
}

var host = address(),
    port = argv.port,
    href = "http://" + host + ":" + port + "/",
    filename = path.basename(video_path)
    video_mime = mime.lookup(video_path);

// If auto load subtitles
if (argv.s) {
  var ext = path.extname(video_path),
      basename = path.basename(video_path, ext),
      glob_pattern = basename + '!(*' + ext + ')',  // 'filename!(*.mkv)'
      subs_files = glob.sync(path.join(path.dirname(video_path), glob_pattern));

  // Overwrite the 't' parameter if file found
  if (subs_files.length) argv.t = subs_files[0];
}

// If subtitles given
if (argv.t) {
  var subs_path = argv.t,
      subtitles_url = href + "subtitles",
      subs_mime = mime.lookup(subs_path);
}

// Create server
var server = http.createServer(function (req, res) {
  var video_total = fs.statSync(video_path).size;
  var url = req.url;

  if (req.headers.range) {   // meaning client (browser) has moved the forward/back slider
    var range = req.headers.range;
    var parts = range.replace(/bytes=/, "").split("-");
    var partialstart = parts[0];
    var partialend = parts[1];

    var start = parseInt(partialstart, 10);
    var end = partialend ? parseInt(partialend, 10) : total-1;
    var chunksize = (end - start) + 1;
    console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

    var file = fs.createReadStream(video_path, {start: start, end: end});

    res.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + video_total,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': video_mime
    });

    file.pipe(res);
  }

  if (url === '/') {
    res.writeHead(200, {
      'Content-Length': video_total,
      'transferMode.dlna.org': 'Streaming',
      'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
      'CaptionInfo.sec': subtitles_url,
      'Content-Type': video_mime
    });

    fs.createReadStream(video_path).pipe(res);
  } else if (argv.t && url === '/subtitles') {
    var subs_total = fs.statSync(subs_path).size;

    res.writeHead(200, {
      'Content-Length': subs_total,
      'transferMode.dlna.org': 'Streaming',
      'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
      'CaptionInfo.sec': subtitles_url,
      'Content-Type': subs_mime
    });

    fs.createReadStream(subs_path).pipe(res);
  }
})

server.listen(port, host);
console.log("Server started: " + href);

// Send to dlna
var browser = new Browser();
browser.onDevice(function (device) {
  device.onError(function (err) {
    throw err;
  });

  client = new Client(device.xml);
  console.log("Sending " + filename + " to " + device.name);
  if (subtitles_url) console.log("Subtitles file " + subs_path)

  client.load(href, {
    autoplay: true,
    metadata: {
      title: filename,
      type: 'video',
      subtitlesUrl: subtitles_url || false
    }
  }, function (err, result) {
    if (err) throw err;
    console.log('Playing...');
    console.log('Press <Space> to Play/Pause and q to quit.');
  });

  paused = false;

  // listen for keypresses
  keypress(process.stdin);
  process.stdin.on('keypress', function (ch, key) {
    if (!key) return;

    if (key.name == 'space') {
      (paused) ? client.play() : client.pause();
      paused = !paused;
    }

    if (key.name == 'q' || (key.ctrl && key.name == 'c')) {
      client.stop(function () {
        console.log('Stopped.');
        server.close();
        process.exit(0);
      });
    }
  });

  process.stdin.setRawMode(true)
});

browser.start();
