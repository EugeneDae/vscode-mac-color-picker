import * as vscode from 'vscode';
import * as colorString from 'color-string';
import * as applescript from 'applescript';

type Color = [number, number, number] | [number, number, number, number];

function rgb65536ToRgb256(rgb65536: Color): Color {
    return rgb65536.map((n) => Math.round(n/257)) as Color;
}

function rgb256To65536(rgb256: Color): Color {
    return rgb256.map((n) => n*257) as Color;
}

function showWarningMessage(msg: string): void {
	vscode.window.showInformationMessage('macOS Color Picker: ' + msg);
}

function showErrorMessage(msg: string): void {
	vscode.window.showErrorMessage('macOS Color Picker: ' + msg);
}

function getColorPickerScript(defaultColor: Color = [255, 0, 255]): string {
	return `tell current application to choose color default color {${rgb256To65536(defaultColor)}}`;
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

function colorStringToHexEnhanced(color: Color) {
	const config = vscode.workspace.getConfiguration('macColorPicker');

	let result = colorString.to.hex(color);

	if (config.get('lowercaseHexColors')) {
		result = result.toLowerCase();
	}

	if (config.get('shortHexColors')) {
		result = shortenHex(result);
	}

	return result;
}

function pickColorStringOutputFunction(colorStr: string, colorDescriptor: colorString.ColorDescriptor): Function {
	switch (colorDescriptor.model) {
		case 'rgb':
			if (colorStr.startsWith('rgb')) {
				return colorString.to.rgb;
			}
			return colorStringToHexEnhanced;
		case 'hsl':
			return colorString.to.hsl;
		case 'hwb':
			return colorString.to.hwb;
		default:
			return colorStringToHexEnhanced;
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
			const wordRange = editor.document.getWordRangeAtPosition(editor.selection.active);
			const replaceTarget = wordRange || editor.selection;
			const selectedText = editor.document.getText(replaceTarget);

			let defColor: Color | undefined;
			let savedAlpha: number = 1;
			let outputFunction : Function = colorStringToHexEnhanced;

			if (selectedText) {
				vscode.window.showInformationMessage(selectedText);
				let selColor = colorString.get(selectedText);

				if (selColor !== null) {
					// Preserve the alpha channel value because the color picker invoked via "choose color"
					// does not have the opacity slider. See https://macscripter.net/viewtopic.php?id=47640
					savedAlpha = selColor.value[3];
					defColor = selColor.value.slice(0,3) as Color;
					outputFunction = pickColorStringOutputFunction(selectedText, selColor);
				}
			}

			runScript(getColorPickerScript(defColor)).then((rtn) => {
				editor.edit(editBuilder => {
					let color = rgb65536ToRgb256(rtn);
					color[3] = savedAlpha;
					let output = outputFunction(color);
					editBuilder.replace(replaceTarget, output);
				});
			}).catch((err) => {
				if (!err.message.includes('User canceled. (-128)')) {
					console.log(err);
					showErrorMessage(err.message);
				}
			});
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
