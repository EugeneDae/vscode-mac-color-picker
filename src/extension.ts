import * as vscode from 'vscode';
import * as colorString from 'color-string';
import * as colorConvert from 'color-convert';
import * as applescript from 'applescript';

type ColorModel = 'rgb' | 'hsl' | 'hwb' | 'vec';
type AppleColor = [number, number, number];

function showInformationMessage(msg: string): void {
    vscode.window.showInformationMessage('[macOS Color Picker] ' + msg);
}

function showErrorMessage(msg: string): void {
    vscode.window.showErrorMessage('[macOS Color Picker] ' + msg);
}

function getColorPickerScript(defaultColor: AppleColor): string {
    return `tell current application to choose color default color {${defaultColor}}`;
}

function runScript(script: string): Promise<any> {
    return new Promise((resolve, reject) => {
        applescript.execString(script, (err: any, rtn: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(rtn);
            }
       });
    });
}

function colorStringExtGetVec(text: string): number[] | null {
    let vec = /^vec[34]\(\s*([+-]?[\d\.]+)\s*,?\s*([+-]?[\d\.]+)\s*,?\s*([+-]?[\d\.]+)\s*(?:[,|\/]\s*([+-]?[\d\.]+)\s*)?\)$/;
    var rgb = [0, 0, 0];
    let match;
    let i;
    if (match = text.match(vec)) {
        for (i = 0; i < 3; i++) {
            rgb[i] = parseFloat(match[i + 1]);
        }
        if (match[4]) {
            rgb[3] = parseFloat(match[4]);
        }
    } else {
        return null;
    }
    return rgb;
}

function floatToFixedTrim(value: number): string {
    let s = value.toFixed(4);
    while (s[s.length - 1] === '0') {
        s = s.slice(0, -1)
        if (s[s.length - 1] !== '0' || s[s.length - 2] === '.') break;
    }
    return s;
}

let swizzle = require('simple-swizzle');
let colorStringExt = {
    get: function(text: string) {
        let model: ColorModel = 'vec';
        let val = colorStringExtGetVec(text);
        if (!val) {
            return null;
        }
        return {model: model, value: val};
    },
    to: {
        vec: function (): string {
            let rgba = swizzle(arguments);

            return rgba.length < 4 || rgba[3] === null
                ? 'vec3(' + floatToFixedTrim(rgba[0]) + ', ' + floatToFixedTrim(rgba[1]) + ', ' + floatToFixedTrim(rgba[2]) + ')'
                : 'vec4(' + floatToFixedTrim(rgba[0]) + ', ' + floatToFixedTrim(rgba[1]) + ', ' + floatToFixedTrim(rgba[2]) + ', ' + floatToFixedTrim(rgba[3]) + ')';
        }
    }
};

function colorConvertVecApple(value: number[]): AppleColor {
    let apple_color: AppleColor;
    apple_color = [value[0] * 65535, value[1] * 65535, value[2] * 65535];
    return apple_color;
}

function colorConvertAppleVec(value: AppleColor): number[] {
    let color = [value[0] / 65535, value[1] / 65535, value[2] / 65535];
    return color;
}

function toHexEnhanced(intLiteral: boolean) {
    return (color: colorString.Color) => {
        const config = vscode.workspace.getConfiguration('macColorPicker');

        let result = colorString.to.hex(color);

        if (config.get('lowercaseHexColors')) {
            result = result.toLowerCase();
        }

        if (config.get('shortHexColors')) {
            result = shortenHex(result);
        }

        if (intLiteral) {
            result = '0x' + result.slice(1);
        }

        return result;
    };
}

function getDefaultColorModel(): ColorModel {
    const config = vscode.workspace.getConfiguration('macColorPicker');

    switch (config.get('defaultColorNotation')) {
        case 'hsl':
            return 'hsl';
        case 'hwb':
            return 'hwb';
        case 'vec':
            return 'vec';
        default: // hex, 'hex int literal', rgb -> rgb
            return 'rgb';
    }
}

function getDefaultOutputFunction(): Function {
    const config = vscode.workspace.getConfiguration('macColorPicker');

    switch (config.get('defaultColorNotation')) {
        case 'rgb':
            return colorString.to.rgb;
        case 'hsl':
            return colorString.to.hsl;
        case 'hwb':
            return colorString.to.hwb;
        case 'vec':
            return colorStringExt.to.vec;

        case 'hex int literal': //'hex int literal' -> rgb
            return toHexEnhanced(true);

        default: // hex -> rgb
            return toHexEnhanced(false);
    }
}

// Copyright (c) 2015 Dustin Specker — MIT License
// https://github.com/dustinspecker/shorten-css-hex
function shortenHex(hex: string) {
    if (hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]) {
        if (hex.length === 7) {
            return `#${hex[1]}${hex[3]}${hex[5]}`;
        }

        if (hex[7] === hex[8]) {
            return `#${hex[1]}${hex[3]}${hex[5]}${hex[7]}`;
        }
    }

    return hex;
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.macColorPicker', () => {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            let replaceTarget : vscode.Range | vscode.Selection = editor.selection;
            let selectedColorModel: ColorModel = getDefaultColorModel();
            let selectedColorValue: AppleColor = [65535, 0, 65535]; // UnrealEd :)
            let selectedColorAlpha: number | null = null;
            let outputFunction : Function = getDefaultOutputFunction();

            const selections = [
                editor.selection, // what is actually selected (order is important)
                editor.document.getWordRangeAtPosition(editor.selection.start) // the "word" where the cursor is
            ];

            // Loop over both selections to see if one of them contains a color recognizable by colorString
            for (const selection of selections) {
                if (selection !== undefined) {
                    let selectedText = editor.document.getText(selection).trim();
                    if (selectedText.startsWith('vec')) {
                        const selectedColorDescriptor = colorStringExt.get(selectedText);
                        if (selectedColorDescriptor === null) {
                            return showInformationMessage('Please select the entire color expression.');
                        } else {
                            replaceTarget = selection;
                            selectedColorModel = selectedColorDescriptor.model;
                            selectedColorValue = colorConvertVecApple([
                                selectedColorDescriptor.value[0],
                                selectedColorDescriptor.value[1],
                                selectedColorDescriptor.value[2]
                            ]);
                            if (selectedColorDescriptor.value[3]) {
                                selectedColorAlpha = selectedColorDescriptor.value[3];
                            } else {
                                selectedColorAlpha = null;
                            }

                            outputFunction = colorStringExt.to.vec;
                            break;
                        }
                    }

                    const isIntLiteral = selectedText.startsWith('0x');

                    if (isIntLiteral) {
                        selectedText = '#' + selectedText.slice(2);
                    }

                    const selectedColorDescriptor = colorString.get(selectedText);

                    if (selectedColorDescriptor === null) {
                        // colorString does not recognize a color notation in this selection
                        if (selectedText.startsWith('rgb') ||
                            selectedText.startsWith('hsl') ||
                            selectedText.startsWith('hwb')) {
                                return showInformationMessage('Please select the entire color expression.');
                        }
                    } else {
                        // colorString recognized a color notation in this selection
                        replaceTarget = selection;
                        selectedColorModel = selectedColorDescriptor.model;
                        selectedColorValue = colorConvert[selectedColorModel].apple([
                            selectedColorDescriptor.value[0],
                            selectedColorDescriptor.value[1],
                            selectedColorDescriptor.value[2]
                        ]);
                        selectedColorAlpha = selectedColorDescriptor.value[3];

                        if (selectedColorModel === 'rgb') {
                            if (selectedText.startsWith('rgb')) {
                                outputFunction = colorString.to.rgb;
                            } else {
                                outputFunction = toHexEnhanced(isIntLiteral);
                            }
                        } else {
                            outputFunction = colorString.to[selectedColorModel];
                        }

                        break;
                    }
                }
            }

            runScript(getColorPickerScript(selectedColorValue)).then((rtn) => {
                editor.edit(editBuilder => {
                    let color;
                    if (selectedColorModel === 'vec') {
                        color = colorConvertAppleVec(rtn);
                    } else {
                        color = colorConvert.apple[selectedColorModel](rtn);
                    }
                    editBuilder.replace(replaceTarget, outputFunction([color[0], color[1], color[2], selectedColorAlpha]));
                });
            }).catch((err) => {
                if (!err.message.includes('(-128)')) {
                    console.log(err);
                    showErrorMessage(err.message);
                }
            });
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
