const http = require('http');
const fs = require('fs');

module.exports = (video, subtitles) => {
  return http.createServer(function (req, res) {
    const url = req.url;

    // The client has moved the forward/back slider
    if (req.headers.range) {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, '').split('-');
      const partialstart = parts[0];
      const partialend = parts[1];

      const start = parseInt(partialstart, 10);
      const end = partialend ? parseInt(partialend, 10) : video.size - 1;
      const chunksize = (end - start) + 1;

      const file = fs.createReadStream(video.path, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${video.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.mime
      });

      file.pipe(res);
    }

    // GET /
    if (url === '/') {
      const headers = {
        'Content-Length': video.size,
        'transferMode.dlna.org': 'Streaming',
        'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
        'Content-Type': video.mime
      };

      if (subtitles) headers['CaptionInfo.sec'] = subtitles.url;

      res.writeHead(200, headers);

      fs.createReadStream(video.path).pipe(res);
    // GET /subtitles
    } else if (subtitles && url === '/subtitles') {
      res.writeHead(200, {
        'Content-Length': subtitles.size,
        'transferMode.dlna.org': 'Streaming',
        'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
        'CaptionInfo.sec': subtitles.url,
        'Content-Type': subtitles.mime
      });

      fs.createReadStream(subtitles.path).pipe(res);
    }
  });
};
