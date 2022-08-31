import * as vscode from 'vscode';
import * as curlconverter from 'curlconverter';

const languages: {[key: string]: (s: string) => string} = {
	'go': curlconverter.toGo,
	'java': curlconverter.toJava,
	'javascript': curlconverter.toBrowser,
	'typescript': curlconverter.toBrowser, // TODO: actual TypeScript converter
	'javascriptreact': curlconverter.toBrowser,
	'typescriptreact': curlconverter.toBrowser, // TODO: actual TypeScript converter
	'json': curlconverter.toJsonString,
	'jsonc': curlconverter.toJsonString,
	'php': curlconverter.toPhp,
	'python': curlconverter.toPython,
	'r': curlconverter.toR,
	'rust': curlconverter.toRust,
	// TODO: a more reliable way of detecting if Ansible is being used?
	// 'yaml': curlconverter.toAnsible,
	//
	// These languages don't exist in VS Code
	// https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers
	'dart': curlconverter.toDart,
	'elixir': curlconverter.toElixir,
	'matlab': curlconverter.toMATLAB,
};

// Just setting it to languages doesn't work because the values are functions
// https://github.com/microsoft/vscode/issues/140359
vscode.commands.executeCommand('setContext', 'curlconverter.supportedLanguages', Object.keys(languages));

export function activate(context: vscode.ExtensionContext) {

	const fromClipboard = async (editor: vscode.TextEditor, edit: vscode.TextEditorEdit, converter?: (s: string) => string): Promise<void | string | undefined> => {
		const languageId = editor.document.languageId;

		converter = converter ?? languages[languageId];
		if (!converter) {
			return vscode.window.showErrorMessage('Unsupported language: ' + languageId);
		}

		// Remove leading whitespace and '$'
		const clipboardText = (await vscode.env.clipboard.readText()).replace(/^\s*\$?\s*/, '');
		// TODO: something more complicated like making sure there's stuff after the 'curl'
		// with helpful error messages.
		if (!clipboardText.length) {
			return vscode.window.showErrorMessage('No text in clipboard');
		}
		if (!clipboardText.match(/^curl/)) {
			return vscode.window.showErrorMessage('Text in clipboard must start with "curl"');
		}

		let result = '';
		try {
			result = converter(clipboardText);
		} catch (e) {
			// TODO: format error nicely
			return vscode.window.showErrorMessage('Failed to convent curl command: ' + e);
		}
		if (!result) {
			return vscode.window.showErrorMessage('Failed to convent curl command: conversion returned nothing');
		}

		editor.edit(editBuilder => {
			editBuilder.insert(editor.selection.active, result);
		});
	};

	let disposable = vscode.commands.registerTextEditorCommand('curlconverter.fromClipboard', async (editor, edit) => { 
		return fromClipboard(editor, edit); 
	});
	context.subscriptions.push(disposable);

	for (const fn of [... new Set(Object.values(languages))]) {
		let langCommand = vscode.commands.registerTextEditorCommand('curlconverter.' + fn.name, async (editor, edit) => { 
			return fromClipboard(editor, edit, fn); 
		});
		context.subscriptions.push(langCommand);
		langCommand = vscode.commands.registerTextEditorCommand('curlconverter.' + fn.name + 'Short', async (editor, edit) => { 
			return fromClipboard(editor, edit, fn); 
		});
		context.subscriptions.push(langCommand);
	}
}

export function deactivate() {}
