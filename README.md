# macOS Color Picker (VS Code extension)

Native macOS color picker for web-development and other uses. Supports various CSS3 color notations. Works like “Insert Color” in TextMate.

**Sorry, this extension does not support Windows or Linux.**

## Why native color picker?

[<img align="right" width="533" height="470" src="res/illustration.png">](res/illustration.png)

1. Works very fast because it’s built-in into macOS.
2. Has an eyedropper, which can also be used outside VS Code.
3. Keeps your favorite colors, which can be reused in other applications.
4. Has lots of modes (HSB, web-safe colors etc) and other useful stuff.

## Installation

Click the **Install** button on the [Marketplace](https://marketplace.visualstudio.com/items?itemName=dae.vscode-mac-color-picker), or run the following in the command palette:

```
ext install dae.mac-color-picker
```

## Usage

Select `Open macOS Color Picker` in the command palette (Cmd-Shift-P) to open the color picker.

**It is highly recommended to configure a keybinding, such as Cmd-Shift-C.**

If a color expression is selected, the extension will parse it and pass it into the color picker. The following color notations are supported:
- CSS keywords, for example: `transparent`, `black`, `red` (but not `currentcolor`).
- 6 digit hex codes, for example: `#FFF`, `#563D7C`.
- 8 digit hex codes, for example: `#563D7CAB` *(see note below)*.
- rgb() / rgba() notations, for example:
    - `rgb(255, 255, 255)`
    - `rgba(255, 255, 255, 0.5)` *(see note below)*
- hsl() / hsla() notations, for example:
    - `hsl(360, 100%, 50%)`
    - `hsla(360, 100%, 50%, 0.5)` *(see note below)*
- hwb() notation, for example: `hwb(60, 3%, 60%)`

**Note:** the color picker currently cannot change the alpha channel value (opacity).

## Settings

- `macColorPicker.defaultColorNotation` — which notation to use when inserting (rather than updating) a color. Default: `hex`.
- `macColorPicker.lowercaseHexColors` — output hex colors in lowercase, e.g.: `#fff` instead of `#FFF`. On by default.
- `macColorPicker.shortHexColors` — shorten hex colors when possible, e.g.: `#777` instead of `#777777`. On by default.

## Feedback

If you have a problem or a suggestion, please open an issue on [GitHub](https://github.com/EugeneDae/vscode-mac-color-picker/issues).

## Special thanks

- Nathan Rajlich ([@TooTallNate](https://github.com/TooTallNate)) for [node-applescript](https://github.com/TooTallNate/node-applescript).
- Josh Junon ([@Qix-](https://github.com/Qix-)) for [color-string](https://github.com/Qix-/color-string) and [color-convert](https://github.com/Qix-/color-convert).
- Dustin Specker ([@dustinspecker](https://github.com/dustinspecker/)) for [shorten-css-hex](https://github.com/dustinspecker/shorten-css-hex).

## License

MIT License © Eugene ‘Dae’ Zuyev (dae@dae.me).
