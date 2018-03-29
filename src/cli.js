const address = require('network-address');
const chalk = require('chalk');
const glob = require('glob');
const inquirer = require('inquirer');
const ora = require('ora');
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
    if (this.program.dlna) this._initDlna();
  }

  // private

  _initVideo() {
    const video = fileInfo(this.program.args[0]);

    if (!video) {
      console.log(chalk.red('File not found'));
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
    server.listen(port, '0.0.0.0');
    console.log(`Server started at ${chalk.blue(this.video.url)}`);

    return server;
  }

  _initDlna() {
    this.dlna = new Dlna();

    if (this.program.list) {
      this._choosePlayer();
    } else {
      this._chooseFirstPlayer();
    }
  }

  _chooseFirstPlayer() {
    this.dlna.start({
      video: this.video,
      subtitles: this.subtitles,
      server: this.server
    });
  }

  async _choosePlayer() {
    // search for players
    const spinner = ora('Searching for devices...').start();
    const players = await this.dlna.searchPlayers();
    spinner.stop();

    if (players.length === 0) {
      console.log(chalk.red("Couldn't find any devices"));
      process.exit();
    }

    // offer choice
    try {
      var { player } = await inquirer.prompt({
        type: 'list',
        name: 'player',
        message: 'Choose a player',
        choices: players,
        filter: (choice) => players.find(player => player.name === choice)
      });
    } catch (error) {
      console.log(chalk.red('Interrupted'));
    }

    // stream to player
    this.dlna.startPlayer({
      player,
      video: this.video,
      subtitles: this.subtitles,
      server: this.server
    });
  }
}

module.exports = CLI;
