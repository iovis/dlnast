#!/usr/bin/env node

var argv    = require('minimist')(process.argv.slice(2)),
    Browser = require('nodecast-js'),
    express = require('express'),
    address = require('network-address'),
    Client  = require('upnp-mediarenderer-client'),
    keypress = require('keypress'),
    path = require('path'),
    mime = require('mime'),
    http = require('http'),
    glob = require('glob'),
    fs = require('fs');

var host = address(),
    port = 8888,
    href = "http://" + host + ":" + port + "/",
    video_path = argv._[0],
    filename = path.basename(video_path)
    video_mime = mime.lookup(video_path);

// If discover subtitles
if (argv.s) {
  var ext = path.extname(video_path),
      basename = path.basename(video_path, ext),
      glob_pattern = basename + '!(*' + ext + ')',  // 'filename!(*.mkv)'
      subs_files = glob.sync(path.join(path.dirname(video_path), glob_pattern));

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
    var chunksize = (end-start)+1;
    console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

    var file = fs.createReadStream(video_path, {start: start, end: end});

    res.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
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
  console.log("Sending video to " + device.name);

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
