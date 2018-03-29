# dlnast #

Stream your favorite media to a DLNA device in your local network

## Installation ##

```
$ npm install -g dlnast
```

## Usage ##
```
  Usage: dlnast [options] <file>

  Options:

    -v, --version           output the version number
    -n --no-dlna            Only start media server (no DLNA streaming)
    -l --list               Choose from the available devices in your network
    -s, --subtitles [file]  Add subtitles or auto load subtitles file with the same name
    -p, --port <port>       Change media server port (default: 8888)
    -h, --help              output usage information
```

## Examples ##

The default action streams a video of your choice to the first DLNA device it finds:

```
$ dlnast my_amazing_video.mp4
```

If you have more than one device, you can choose from a list with `-l`:
```
$ dlnast -l my_amazing_video.mp4
```

## Note on Little Snitch and Homebrew ##

If you're using Homebrew's node and Little Snitch, LS will block node's processes because Homebrew's version is unsigned.
