const Dlnacasts = require('dlnacasts');
const clivas    = require('clivas');
const keypress  = require('keypress');

class Dlna {
  constructor() {
    this.dlnacasts = Dlnacasts();
    this._bindPlayer = this._bindPlayer.bind(this);
  }

  start({ video, subtitles, server }) {
    this.dlnacasts.on('update', player => this._bindPlayer({ player, video, subtitles, server }));
  }

  // private

  _bindPlayer({ player, video, subtitles, server }) {
    clivas.line(`{green:Sending} {blue:${video.path}} {green:to} {blue:${player.name}}`);

    const options = { title: video.path, type: video.mime };

    if (subtitles) {
      options.subtitles = [subtitles.url];
      clivas.line(`{green:Subtitles file} {blue:${subtitles.path}}`);
    }

    player.play(video.url, options);

    clivas.line('{green:Press} {blue:<Space>} {green:to Play/Pause and} {blue:q} {green:to quit}');

    this._bindKeys({ player, server });
  }

  _bindKeys({ player, server }) {
    let paused = false;
    keypress(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (ch, key) => {
      if (!key) return;

      if (key.name == 'space') {
        (paused) ? player.resume() : player.pause();
        paused = !paused;
      }

      if (key.name == 'q' || (key.ctrl && key.name == 'c')) {
        player.stop(() => {
          clivas.line('{red:Stopped}');
          server.close();
          process.exit(0);
        });
      }
    });
  }
}

module.exports = Dlna;
