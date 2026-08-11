import BinaryFileManagerPlugin, { WatchedFolderSettings } from 'main';
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
import { normalizeFolderPath } from 'Settings';

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
				'Detects new binary files and creates notes automatically.'
			)
			.addToggle((component) => {
				component
					.setValue(this.plugin.settings.autoDetection)
					.onChange(async (value: boolean) => {
						this.plugin.settings.autoDetection = value;
						await this.plugin.saveSettings();
					});
			});

		containerEl.createEl('h3', { text: 'Watched folders' });
		const defaultFolderSection = containerEl.createEl('details', {
			cls: 'binary-file-manager-watched-folder',
		});
		defaultFolderSection.createEl('summary', {
			text:
				this.plugin.settings.binaryFilePath || 'Default watched folder',
		});

		new Setting(defaultFolderSection)
			.setName('Watched folder')
			.setDesc(
				'Only this folder will be watched for new files (subfolders will not be watched)'
			)
			.addSearch((component) => {
				new FolderSuggest(this.app, component.inputEl);
				component
					.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.binaryFilePath)
					.onChange((newFolder) => {
						this.plugin.settings.binaryFilePath = newFolder;
						this.plugin.saveSettings();
					});
			});

		new Setting(defaultFolderSection)
			.setName('Attachments folder')
			.setDesc('Binary files will be moved here after note creation')
			.addSearch((component) => {
				new FolderSuggest(this.app, component.inputEl);
				component
					.setPlaceholder('Example: folder1/folder2')
					.setValue(this.plugin.settings.attachmentsFilePath)
					.onChange((newFolder) => {
						this.plugin.settings.attachmentsFilePath = newFolder;
						this.plugin.saveSettings();
					});
			});

		new Setting(defaultFolderSection)
			.setName('Note location')
			.setDesc('New note will be placed here')
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

		new Setting(defaultFolderSection)
			.setName('File name format')
			.then((setting) => {
				setting.addText((component) => {
					component
						.setValue(this.plugin.settings.filenameFormat)
						.onChange((input) => {
							const newFormat = input.trim().replace(/\.md$/, '');
							if (newFormat === '') {
								new Notice(
									'File name format must not be blanck'
								);
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
					this.displaySampleFileNameDesc(
						setting.descEl,
						sampleFileName
					);
				});
			});

		// Create the "Use Templater" toggle setting
		new Setting(defaultFolderSection)
			.setName('Use Templater')
			.addToggle(async (component) => {
				component
					.setValue(this.plugin.settings.useTemplater)
					.onChange((value) => {
						this.plugin.settings.useTemplater = value;
						this.plugin.saveSettings();

						// Show or hide the Template file location setting based on the toggle value
						templateSetting.settingEl.style.display = value
							? 'block'
							: 'none';
					});
			});

		// Create the "Template file location" search setting and initially hide or show it
		const templateSetting = new Setting(defaultFolderSection)
			.setName('Template file location (watched folder)')
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

		// Set the initial visibility of the "Template file location" setting
		templateSetting.settingEl.style.display = this.plugin.settings
			.useTemplater
			? 'block'
			: 'none';

		this.plugin.settings.watchedFolders.forEach((watched, index) => {
			const section = containerEl.createEl('details', {
				cls: 'binary-file-manager-watched-folder',
			});
			section.createEl('summary', {
				text: watched.binaryFilePath || `Watched folder ${index + 1}`,
			});
			section.createEl('h4', { text: `Watched folder ${index + 1}` });
			this.addFolderSetting(
				section,
				watched,
				'Watched folder',
				'binaryFilePath'
			);
			this.addFolderSetting(
				section,
				watched,
				'Attachments folder',
				'attachmentsFilePath'
			);
			this.addFolderSetting(section, watched, 'Note location', 'folder');
			new Setting(section).setName('File name format').addText((input) =>
				input
					.setValue(watched.filenameFormat)
					.onChange(async (value) => {
						watched.filenameFormat = value
							.trim()
							.replace(/\.md$/, '');
						await this.plugin.saveSettings();
					})
			);
			new Setting(section).setName('Use Templater').addToggle((toggle) =>
				toggle
					.setValue(watched.useTemplater)
					.onChange(async (value) => {
						watched.useTemplater = value;
						await this.plugin.saveSettings();
					})
			);
			new Setting(section)
				.setName('Template file location')
				.addSearch((input) => {
					new FileSuggest(this.app, input.inputEl);
					input
						.setValue(watched.templatePath)
						.onChange(async (value) => {
							watched.templatePath = value;
							await this.plugin.saveSettings();
						});
				});
			new Setting(section).addButton((button) =>
				button
					.setButtonText('Remove folder')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.watchedFolders.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					})
			);
		});
		new Setting(containerEl).addButton((button) =>
			button.setButtonText('Add watched folder').onClick(async () => {
				this.plugin.settings.watchedFolders.push({
					binaryFilePath: '',
					attachmentsFilePath: '_attachments',
					folder: '',
					filenameFormat: this.plugin.settings.filenameFormat,
					templatePath: '',
					useTemplater: false,
				});
				await this.plugin.saveSettings();
				this.display();
			})
		);

		containerEl.createEl('h3', { text: 'Context menu' });
		const contextMenuSection = containerEl.createEl('details', {
			cls: 'binary-file-manager-context-menu',
		});
		contextMenuSection.createEl('summary', {
			text: 'Right-click conversion',
		});
		new Setting(contextMenuSection)
			.setName('Template file location')
			.setDesc(
				'Template to use when creating a note from the right-click menu. Leave blank to use the default.'
			)
			.addSearch((component) => {
				new FileSuggest(this.app, component.inputEl);
				component
					.setPlaceholder('Example: folder1/context-menu-template')
					.setValue(this.plugin.settings.contextMenuTemplatePath)
					.onChange((newTemplateFile) => {
						this.plugin.settings.contextMenuTemplatePath =
							newTemplateFile;
						this.plugin.saveSettings();
					});
			});

		containerEl.createEl('h3', { text: 'Watched extensions' });
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

		// Render extensions as inline chips
		const extContainer = containerEl.createDiv(
			'binary-file-manager-extensions-container'
		);
		this.plugin.settings.extensions.forEach((ext) => {
			const chip = extContainer.createDiv(
				'binary-file-manager-extension-chip'
			);
			chip.setText(ext);
			const removeBtn = chip.createEl('button', { text: '✕' });
			removeBtn.addClass('remove-btn');
			removeBtn.setAttr('aria-label', `Remove ${ext}`);
			removeBtn.onclick = async (e) => {
				e.preventDefault();
				this.plugin.fileExtensionManager.delete(ext);
				this.plugin.settings.extensions =
					this.plugin.fileExtensionManager.toArray();
				await this.plugin.saveSettings();
				this.display();
			};
		});

		new Setting(containerEl)
			.setName('Forget all binary files')
			.setDesc(
				'Binary File Manager remembers binary files for which it has created notes. If it forgets, then it recognizes all binary files as newly created files and tries to create their notes again.'
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

	private addFolderSetting(
		container: HTMLElement,
		watched: WatchedFolderSettings,
		name: string,
		key: 'binaryFilePath' | 'attachmentsFilePath' | 'folder'
	): void {
		new Setting(container).setName(name).addSearch((input) => {
			new FolderSuggest(this.app, input.inputEl);
			input.setValue(String(watched[key])).onChange(async (value) => {
				if (
					key === 'binaryFilePath' &&
					!this.isValidWatchedFolder(value, watched)
				) {
					return;
				}
				watched[key] = value.trim();
				await this.plugin.saveSettings();
			});
		});
	}

	private isValidWatchedFolder(
		path: string,
		current: WatchedFolderSettings
	): boolean {
		const normalized = normalizeFolderPath(path);
		if (normalized === '') {
			new Notice('A watched folder cannot be blank. Remove it instead.');
			return false;
		}
		const isDuplicate = [
			this.plugin.settings.binaryFilePath,
			...this.plugin.settings.watchedFolders
				.filter((watched) => watched !== current)
				.map((watched) => watched.binaryFilePath),
		].some(
			(watchedPath) => normalizeFolderPath(watchedPath) === normalized
		);
		if (isDuplicate) {
			new Notice('That folder is already being watched.');
			return false;
		}
		return true;
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
