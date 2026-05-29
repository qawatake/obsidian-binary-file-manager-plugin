import BinaryFileManagerPlugin from 'main';
import {
	PluginSettingTab,
	Setting,
	App,
	Notice,
	moment,
	Modal,
	ButtonComponent,
} from 'obsidian';
import { FolderSuggest } from 'suggesters/FolderSuggester';
import { FileSuggest } from 'suggesters/FileSuggester';
import { validFileName } from 'Util';

export class BinaryFileManagerSettingTab extends PluginSettingTab {
	plugin: BinaryFileManagerPlugin;

	constructor(app: App, plugin: BinaryFileManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable auto detection')
			.setDesc(
				'Detects new binary files and create metadata automatically.'
			)
			.addToggle((component) => {
				component
					.setValue(this.plugin.settings.autoDetection)
					.onChange(async (value: boolean) => {
						this.plugin.settings.autoDetection = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Ignored directories')
			.setDesc(
				'Directory paths to ignore during auto detection. One path per line. Wildcards supported (e.g., archives/*, *inbox)'
			)
			.addTextArea((textArea) => {
				textArea
					.setPlaceholder('archives/*\n*inbox\ntemp/')
					.setValue(this.plugin.settings.ignoredPaths.join('\n'))
					.onChange(async (value: string) => {
						this.plugin.settings.ignoredPaths = value
							.split('\n')
							.map((path) => path.trim())
							.filter((path) => path.length > 0);
						await this.plugin.saveSettings();
					});
				textArea.inputEl.rows = 4;
			});

		new Setting(containerEl)
			.setName('New file location')
			.setDesc('New metadata file will be placed here')
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

						const sampleFileName = this.plugin.formatter.format(
							newFormat,
							'folder/sample.png',
							moment.now()
						);

						this.displaySampleFileNameDesc(
							setting.descEl,
							sampleFileName
						);

						// check if file name contains valid letters like "/" or ":"
						const { valid } = validFileName(sampleFileName);
						if (!valid) {
							return;
						}

						this.plugin.settings.filenameFormat = newFormat;
						this.plugin.saveSettings();
					});

				const sampleFileName = this.plugin.formatter.format(
					this.plugin.settings.filenameFormat,
					'folder/sample.png',
					moment.now()
				);
				this.displaySampleFileNameDesc(setting.descEl, sampleFileName);
			});
		});

		new Setting(containerEl)
			.setName('Template file location')
			.addSearch((component) => {
				new FileSuggest(this.app, component.inputEl);
				component
					.setPlaceholder('Example: folder1/note')
					.setValue(this.plugin.settings.templatePath)
					.onChange((newTemplateFile) => {
						this.plugin.settings.templatePath = newTemplateFile;
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
						this.plugin.fileExtensionManager.has(extensionToBeAdded)
					) {
						new Notice(
							`${extensionToBeAdded} is already registered`
						);
						return;
					}
					this.plugin.fileExtensionManager.add(extensionToBeAdded);
					this.plugin.settings.extensions.push(extensionToBeAdded);
					await this.plugin.saveSettings();
					this.display();
				});
			});

		this.plugin.settings.extensions.forEach((ext) => {
			new Setting(containerEl).setName(ext).addExtraButton((cb) => {
				cb.setIcon('cross').onClick(async () => {
					this.plugin.fileExtensionManager.delete(ext);
					this.plugin.settings.extensions =
						this.plugin.fileExtensionManager.toArray();
					await this.plugin.saveSettings();
					this.display();
				});
			});
		});

		new Setting(containerEl)
			.setName('Forget all binary files')
			.setDesc(
				'Binary File Manager remembers binary files for which it has created metadata. If it forgets, then it recognizes all binary files as newly created files and tries to create their metadata again.'
			)
			.addButton((component) => {
				component
					.setButtonText('Forget')
					.setWarning()
					.onClick(() => {
						new ForgetAllModal(this.app, this.plugin).open();
					});
			});
	}

	displaySampleFileNameDesc(
		descEl: HTMLElement,
		sampleFileName: string
	): void {
		descEl.empty();
		descEl.appendChild(
			createFragment((fragment) => {
				fragment.appendText('For more syntax, refer to ');
				fragment.createEl('a', {
					href: 'https://github.com/qawatake/obsidian-binary-file-manager-plugin#format-syntax',
					text: 'format reference',
				});
				fragment.createEl('br');
				fragment.appendText('Your current syntax looks like this: ');
				fragment.createEl('b', {
					text: sampleFileName,
				});

				const { valid, included } = validFileName(sampleFileName);
				if (!valid && included !== undefined) {
					fragment.createEl('br');
					const msgEl = fragment.createEl('span');
					msgEl.appendText(`${included} must not be included`);
					msgEl.addClass('binary-file-manager-text-error');
				}
			})
		);
	}
}

class ForgetAllModal extends Modal {
	plugin: BinaryFileManagerPlugin;

	constructor(app: App, plugin: BinaryFileManagerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	override onOpen() {
		const { contentEl, titleEl } = this;
		titleEl.setText('Forget all');
		contentEl
			.createEl('p', {
				text: 'Are you sure? You cannot undo this action.',
			})
			.addClass('mod-warning');

		const buttonContainerEl = contentEl.createEl('div');
		buttonContainerEl.addClass('modal-button-container');

		new ButtonComponent(buttonContainerEl)
			.setButtonText('Forget')
			.setWarning()
			.onClick(async () => {
				this.plugin.fileListAdapter.deleteAll();
				await this.plugin.fileListAdapter.save();
				new Notice('Binary File Manager forgets all!');
				this.close();
			});

		new ButtonComponent(buttonContainerEl)
			.setButtonText('Cancel')
			.onClick(() => {
				this.close();
			});
	}

	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
