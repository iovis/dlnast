const address = require('network-address');
const clivas = require('clivas');
const glob = require('glob');
const path = require('path');

const Dlna = require('./Dlna');
const fileInfo = require('./fileInfo');
const mediaServer = require('./mediaServer');

class CLI {
  constructor(program) {
    this.program = program;
  }

  stream() {
    this.video = this._initVideo();
    this.subtitles = this._initSubtitles();
    this.server = this._initServer();
    this.dlna = new Dlna();

    this.dlna.start({
      video: this.video,
      subtitles: this.subtitles,
      server: this.server
    });
  }

  // private

  _initVideo() {
    const video = fileInfo(this.program.args[0]);

    if (!video) {
      clivas.line('{red:File not found}');
      process.exit(1);
    }

    return video;
  }

  _initSubtitles() {
    if (!this.program.subtitles) return null;

    let subtitles = fileInfo(this.program.subtitles);

    if (!subtitles) {
      // Select same filename but different extensions: filename!(*.mkv)
      const globPattern = `${this.video.basename}!(*${this.video.extension})`;
      const subsFiles = glob.sync(path.join(path.dirname(this.video.path), globPattern));

      subtitles = fileInfo(subsFiles[0]);
    }

    return subtitles;
  }

  _initServer() {
    const host = address();
    const port = this.program.port;

    this.video.url = `http://${host}:${port}/`;
    if (this.subtitles) this.subtitles.url = this.video.url + 'subtitles';

    const server = mediaServer(this.video, this.subtitles);
    server.listen(port, host);

    clivas.clear();
    clivas.line(`{green:Server started at} {blue:${this.video.url}}`);

    return server;
  }
}

module.exports = CLI;
