import {
	App,
	Command,
	Editor,
	MarkdownView,
	Modal,
	normalizePath,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	moment,
	TFile,
} from 'obsidian';
import { AppExtension } from './uncover';
import { FolderSuggest } from 'suggesters/FolderSuggester';
import { Formatter } from 'Formatter';
import { FileSuggest } from 'FileSuggester';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	extensions: string[];
	folder: string;
	filenameFormat: string;
	templateFile: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	extensions: ['png', 'jpg', 'jpeg', 'pdf', 'git'],
	folder: '/',
	filenameFormat: 'INFO_{{BASENAME}}_{EXTENSION:UP}}',
	templateFile: '/',
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerEvent(
			this.app.vault.on('create', async (file: TAbstractFile) => {
				if (!(await this.shouldCreateMetaDataFile(file))) {
					return;
				}

				this.createMetaDataFile(file as TFile);
			})
		);

		const app = this.app as AppExtension;
		console.log(app);

		// const command = await this.waitUntilCommandsFound();
		// console.log(command);

		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon(
		// 	'dice',
		// 	'Sample Plugin',
		// 	(evt: MouseEvent) => {
		// 		// Called when the user clicks the icon.
		// 		const app = this.app as AppExtension;
		// 		console.log('a');
		// 		console.log(app);
		// 		console.log(app.commands.commands);
		// 		new Notice('This is a notice!');
		// 	}
		// );
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	},
		// });
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	},
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView =
		// 			this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	},
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000)
		// );
	}

	onunload() {}

	async shouldCreateMetaDataFile(file: TAbstractFile): Promise<boolean> {
		if (!(file instanceof TFile)) {
			return false;
		}

		if (!file.extension) {
			console.log('file.extension is undefined');
			return false;
		}

		if (
			!this.settings.extensions.some((ext) =>
				file.name.endsWith(`.${ext}`)
			)
		) {
			return false;
		}

		const basename = file.name.split('.')[0];
		const metaDataFilePath = normalizePath(
			`${this.settings.folder}/${Formatter.format(
				this.settings.filenameFormat,
				basename ?? '',
				file.extension,
				file.stat.ctime / 1000
			)}.md`
		);

		if (
			await this.app.vault.adapter.exists(normalizePath(metaDataFilePath))
		) {
			return false;
		}
		return true;
	}

	createMetaDataFile(file: TFile): void {
		const basename = file.name.split('.')[0];
		const newpath = normalizePath(
			`${this.settings.folder}/${Formatter.format(
				this.settings.filenameFormat,
				basename ?? '',
				file.extension,
				file.stat.ctime / 1000
			)}.md`
		);
		this.app.vault.create(
			newpath,
			`---
date: ${file.stat.ctime}
---
# Meta Data about ${file.name} #static
![[${file.name}]]
`
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async waitUntilCommandsFound(): Promise<Command> {
		const app = this.app as AppExtension;
		for (let i = 0; i < 100; i++) {
			const command = app.commands.commands['command-palette:open'];
			if (command) {
				console.log(i);
				return command;
			}
			await new Promise((s) => {
				setTimeout(s, 1);
			});
		}
		return Promise.reject('timeout: failed to load commands');
	}
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const { contentEl } = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

		new Setting(containerEl)
			.setName('New file location')
			.setDesc('New meta data file will be placed here')
			.addSearch((component) => {
				new FolderSuggest(this.app, component.inputEl);
				component
					.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.folder)
					.onChange((newFolder) => {
						this.plugin.settings.folder = newFolder;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl).setName('File name format').then((setting) => {
			setting.addText((component) => {
				component
					.setValue(this.plugin.settings.filenameFormat)
					.onChange((input) => {
						const newFormat = input.trim().replace(/\.md$/, '');
						if (newFormat === '') {
							new Notice('File name format must not be blanck');
							return;
						}
						// display sample file name before validation
						this.displaySampleFileNameDesc(
							setting.descEl,
							newFormat
						);

						// const { valid, included } = validFileName(
						// 	Formatter.format(newFormat, 'sample', 'png')
						// );
						// if (!valid) {
						// 	new Notice(
						// 		`File name must not include "${included}"`
						// 	);
						// 	return;
						// }
						this.plugin.settings.filenameFormat = newFormat;
						this.plugin.saveSettings();
					});
			});
			this.displaySampleFileNameDesc(
				setting.descEl,
				this.plugin.settings.filenameFormat
			);
		});

		new Setting(containerEl)
			.setName('Template file location')
			.addSearch((component) => {
				new FileSuggest(this.app, component.inputEl);
				component
					.setPlaceholder('Example: folder1/note')
					.setValue(this.plugin.settings.templateFile)
					.onChange((newTemplateFile) => {
						this.plugin.settings.templateFile = newTemplateFile;
						this.plugin.saveSettings();
					});
			});

		let extensionToBeAdded: string;
		new Setting(containerEl)
			.setName('Extension to be watched')
			.addText((text) =>
				text.setPlaceholder('Example: pdf').onChange((value) => {
					extensionToBeAdded = value.trim().replace(/^\./, '');
				})
			)
			.addButton((cb) => {
				cb.setButtonText('Add').onClick(async () => {
					if (extensionToBeAdded === 'md') {
						new Notice('extension "md" is prohibited');
						return;
					}
					if (
						this.plugin.settings.extensions.includes(
							extensionToBeAdded
						)
					) {
						new Notice(
							`${extensionToBeAdded} is already registered`
						);
						return;
					}
					this.plugin.settings.extensions.push(extensionToBeAdded);
					await this.plugin.saveSettings();
					this.display();
				});
			});

		this.plugin.settings.extensions.forEach((ext, index) => {
			new Setting(containerEl).setName(ext).addExtraButton((cb) => {
				cb.setIcon('cross').onClick(async () => {
					this.plugin.settings.extensions.splice(index, 1);
					await this.plugin.saveSettings();
					this.display();
				});
			});
		});
	}

	displaySampleFileNameDesc(descEl: HTMLElement, format: string): void {
		descEl.empty();
		descEl.appendChild(
			createFragment((fragment) => {
				fragment.appendText('Your current syntax looks like this: ');
				fragment.createEl('b', {
					text: Formatter.format(
						format,
						'sample',
						'png',
						moment.now() / 1000
					),
				});
			})
		);
	}
}

// const INVALID_CHARS_IN_FILE_NAME = [
// 	'\\',
// 	'/',
// 	':',
// 	'*',
// 	'?',
// 	'"',
// 	'<',
// 	'>',
// 	'|',
// ];
// function validFileName(fileName: string): {
// 	valid: boolean;
// 	included?: string;
// } {
// 	for (const char of fileName) {
// 		if (INVALID_CHARS_IN_FILE_NAME.includes(char)) {
// 			return { valid: false, included: char };
// 		}
// 	}

// 	return { valid: true };
// }
