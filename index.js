#!/usr/bin/env node

const program = require('commander');
const CLI = require('./src/cli');

program
  .version(require('./package').version, '-v, --version')
  .description('Stream your favorite media to a DLNA device in your local network')
  .usage('[options] <file>')
  .option('-l --list', 'Choose from the available devices in your network')
  .option('-s, --subtitles [file]', 'Add subtitles or auto load subtitles file with the same name')
  .option('-p, --port <port>', 'Change media server port', parseInt, 8888)
  .parse(process.argv);

// If not passed one argument, show help
if (program.args.length !== 1) program.help();

const cli = new CLI(program);
cli.stream();
