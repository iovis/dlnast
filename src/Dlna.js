const Dlnacasts = require('dlnacasts');
const clivas    = require('clivas');
const keypress  = require('keypress');
const ora       = require('ora');
const sleep     = require('./sleep');

class Dlna {
  constructor() {
    this.dlnacasts = Dlnacasts();
    this.startPlayer = this.startPlayer.bind(this);
  }

  start({ video, subtitles, server }) {
    const spinner = ora('Searching for devices...').start();

    this.dlnacasts.once('update', player => {
      spinner.stop();
      this.startPlayer({ player, video, subtitles, server });
    });
  }

  searchPlayers() {
    return new Promise(async (resolve, reject) => {
      if (this.dlnacasts.players.length) resolve(this.dlnacasts.players);

      try {
        this.dlnacasts.update();
        await sleep(2000);
        resolve(this.dlnacasts.players);
      } catch (error) {
        reject(error);
      }
    });
  }

  startPlayer({ player, video, subtitles, server }) {
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

  // private

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
