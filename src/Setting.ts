import MyPlugin from 'main';
import { PluginSettingTab, Setting, App, Notice, moment } from 'obsidian';
import { FolderSuggest } from 'suggesters/FolderSuggester';
import { FileSuggest } from 'suggesters/FileSuggester';
import { Formatter } from 'Formatter';

export class SampleSettingTab extends PluginSettingTab {
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

		new Setting(containerEl)
			.setName('Use Templater')
			.addToggle(async (component) => {
				component
					.setValue(this.plugin.settings.useTemplater)
					.onChange((value) => {
						this.plugin.settings.useTemplater = value;
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
						'folder/sample.png',
						moment.now()
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
