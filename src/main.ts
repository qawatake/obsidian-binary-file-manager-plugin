import { Notice, Plugin, TAbstractFile, TFile } from 'obsidian';
import { Formatter } from 'Formatter';
import { BinaryFileManagerSettingTab } from 'Setting';
import { FileExtensionManager } from 'Extension';
import { FileListAdapter } from 'FileList';
import { MetaDataGenerator } from 'Generator';
import { normalizeWatchedFolders, WatchedFolderSettings } from 'Settings';

interface BinaryFileManagerSettings {
	autoDetection: boolean;
	extensions: string[];
	folder: string;
	binaryFilePath: string;
	attachmentsFilePath: string;
	filenameFormat: string;
	templatePath: string;
	useTemplater: boolean;
	contextMenuTemplatePath: string; // NEW: separate template for context menu
	watchedFolders: WatchedFolderSettings[];
}
export type { WatchedFolderSettings } from 'Settings';

const DEFAULT_SETTINGS: BinaryFileManagerSettings = {
	autoDetection: false,
	extensions: [
		'png',
		'jpg',
		'jpeg',
		'gif',
		'bmp',
		'svg',
		'mp3',
		'webm',
		'wav',
		'm4a',
		'ogg',
		'3gp',
		'flac',
		'mp4',
		'webm',
		'ogv',
		'pdf',
	],
	folder: '',
	binaryFilePath: '',
	attachmentsFilePath: '_attachments',
	filenameFormat: 'INFO_{{NAME}}_{{EXTENSION:UP}}',
	templatePath: '',
	useTemplater: false,
	contextMenuTemplatePath: '',
	watchedFolders: [],
};

export default class BinaryFileManagerPlugin extends Plugin {
	settings!: BinaryFileManagerSettings;
	formatter!: Formatter;
	metaDataGenerator!: MetaDataGenerator;
	fileExtensionManager!: FileExtensionManager;
	fileListAdapter!: FileListAdapter;

	override async onload() {
		await this.loadSettings();

		this.formatter = new Formatter(this.app, this);
		this.fileExtensionManager = new FileExtensionManager(this);
		this.fileListAdapter = await new FileListAdapter(this.app, this).load();
		this.metaDataGenerator = new MetaDataGenerator(this.app, this);

		this.registerEvent(
			this.app.vault.on('create', async (file: TAbstractFile) => {
				if (!this.settings.autoDetection) {
					return;
				}
				if (
					!(await this.metaDataGenerator.shouldCreateMetaDataFile(
						file
					))
				) {
					return;
				}

				const attachmentPath = await this.metaDataGenerator.create(
					file as TFile
				);
				new Notice(`Note for ${file.name} is created.`);
				this.fileListAdapter.add(attachmentPath);
				await this.fileListAdapter.save();
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', async (file: TAbstractFile) => {
				if (!this.fileListAdapter.has(file.path)) {
					return;
				}
				this.fileListAdapter.delete(file.path);
				await this.fileListAdapter.save();
			})
		);

		// Commands
		this.addCommand({
			id: 'binary-file-manager-manual-detection',
			name: 'Create notes for binary files',
			callback: async () => {
				const allFiles = this.app.vault.getFiles();
				for (const file of allFiles) {
					if (
						!(await this.metaDataGenerator.shouldCreateMetaDataFile(
							file
						))
					) {
						continue;
					}

					await this.createAndRegister(file);
				}
				await this.fileListAdapter.save();
			},
		});

		this.addCommand({
			id: 'binary-file-manager-detect-unlinked-binary-files',
			name: 'Create notes for unlinked binary files',
			callback: async () => {
				const unlinkedFiles =
					this.metaDataGenerator.findUnlinkedBinaries();
				for (const file of unlinkedFiles) {
					await this.createAndRegister(file);
				}
				await this.fileListAdapter.save();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BinaryFileManagerSettingTab(this.app, this));

		// Add context menu option for binary files
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (!(file instanceof TFile)) return;
				const ext = this.fileExtensionManager.getExtensionMatchedBest(
					file.name
				);
				if (!ext) return;

				menu.addItem((item) => {
					item.setTitle('Create note from binary file')
						.setIcon('arrow-right')
						.onClick(async () => {
							// Use the file's current directory as the base
							const fileDir = file.parent?.path || '';
							// Pass contextMenuTemplatePath as override
							await this.metaDataGenerator.create(
								file,
								fileDir,
								this.settings.contextMenuTemplatePath ||
									undefined
							);
							new Notice(
								`Created note from "${file.name}" in "${fileDir}".`
							);
						});
				});
			})
		);
	}

	private async createAndRegister(file: TFile): Promise<void> {
		try {
			const attachmentPath = await this.metaDataGenerator.create(file);
			new Notice(`Note for ${file.name} is created.`);
			this.fileListAdapter.add(attachmentPath);
		} catch (error) {
			console.error('Binary File Manager conversion failed', error);
			new Notice(`Could not create a note for ${file.name}.`);
		}
	}

	// onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		this.settings.watchedFolders = normalizeWatchedFolders(
			this.settings.binaryFilePath,
			this.settings.watchedFolders
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
