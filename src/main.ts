import {
	App,
	Command,
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
import { TemplaterAdapter } from 'TemplaterAdapter';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	extensions: string[];
	folder: string;
	filenameFormat: string;
	templateFile: string;
	registeredStaticFiles: string[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	extensions: ['png', 'jpg', 'jpeg', 'pdf', 'git'],
	folder: '/',
	filenameFormat: 'INFO_{{BASENAME}}_{EXTENSION:UP}}',
	templateFile: '/',
	registeredStaticFiles: [],
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private registeredStaticFiles: Set<string>;
	tpAPI: TemplaterAdapter = new TemplaterAdapter();

	async onload() {
		await this.loadSettings();

		this.registeredStaticFiles = new Set<string>(
			this.settings.registeredStaticFiles
		);

		this.registerEvent(
			this.app.vault.on('create', async (file: TAbstractFile) => {
				if (!(await this.shouldCreateMetaDataFile(file))) {
					return;
				}

				this.tpAPI.setNewArg(
					this.generateMetaDataFileName(file as TFile),
					file.name,
					(file as TFile).stat.ctime
				);
				this.createMetaDataFile(file as TFile);
				this.registeredStaticFiles.add(file.name);
				this.settings.registeredStaticFiles.push(file.name);
				this.saveSettings();
			})
		);

		const app = this.app as AppExtension;
		console.log(app);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
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

		if (this.registeredStaticFiles.has(file.name)) {
			return false;
		}

		const metaDataFilePath = normalizePath(
			`${this.settings.folder}/${this.generateMetaDataFileName(file)}`
		);

		if (await this.app.vault.adapter.exists(metaDataFilePath)) {
			return false;
		}
		return true;
	}

	generateMetaDataFileName(file: TFile): string {
		const basename = file.name.split('.')[0];
		const metaDataFileName = `${Formatter.format(
			this.settings.filenameFormat,
			basename ?? '',
			file.extension,
			file.stat.ctime / 1000
		)}.md`;
		return metaDataFileName;
	}

	async createMetaDataFile(file: TFile): Promise<void> {
		const metaDataFilePath = normalizePath(
			`${this.settings.folder}/${this.generateMetaDataFileName(file)}`
		);

		const templateFile = this.app.vault.getAbstractFileByPath(
			this.settings.templateFile
		);
		if (!(templateFile instanceof TFile)) {
			console.log(this.settings.templateFile);
			new Notice(`Template file ${templateFile} is invalid`);
			return;
		}
		this.app.vault.create(
			metaDataFilePath,
			await this.app.vault.read(templateFile)
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

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

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
