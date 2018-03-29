const Dlnacasts = require('dlnacasts');
const chalk     = require('chalk');
const ora       = require('ora');
const readline  = require('readline');
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
    const options = { title: video.path, type: video.mime };
    let info = `Sending ${chalk.blue(video.path)} to ${chalk.blue(player.name)} `;

    if (subtitles) {
      options.subtitles = [subtitles.url];
      info += `with subtitles ${chalk.blue(subtitles.path)}`;
    }

    player.play(video.url, options);

    console.log(info);
    console.log('\nUsage:');
    console.log(`Press ${chalk.blue('<Space>')} to Play/Pause`);
    console.log(`Press ${chalk.blue('q')} to quit`);

    this._bindKeys({ player, server });
  }

  // private

  _bindKeys({ player, server }) {
    let paused = false;
    const rl = readline.createInterface({ input: process.stdin });

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (character, key) => {
      if (key.name === 'space') {
        (paused) ? player.resume() : player.pause();
        paused = !paused;
      }

      if (key.name == 'q' || (key.ctrl && key.name == 'c')) {
        player.stop(() => {
          console.log(chalk.red('Stopped'));
          rl.close();
          server.close();
          process.exit();
        });
      }
    });
  }
}

module.exports = Dlna;
