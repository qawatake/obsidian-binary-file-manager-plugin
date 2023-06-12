import { Notice, Plugin, TAbstractFile, TFile } from 'obsidian';
import { Formatter } from 'Formatter';
import { BinaryFileManagerSettingTab } from 'Setting';
import { FileExtensionManager } from 'Extension';
import { FileListAdapter } from 'FileList';
import { MetaDataGenerator } from 'Generator';

interface BinaryFileManagerSettings {
	autoDetection: boolean;
	extensions: string[];
	folder: string;
	binaryFilePath: string;
	filenameFormat: string;
	templatePath: string;
	useTemplater: boolean;
}

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
	folder: '/',
	binaryFilePath: '/',
	filenameFormat: 'INFO_{{NAME}}_{{EXTENSION:UP}}',
	templatePath: '',
	useTemplater: false,
};

export default class BinaryFileManagerPlugin extends Plugin {
	settings: BinaryFileManagerSettings;
	formatter: Formatter;
	metaDataGenerator: MetaDataGenerator;
	fileExtensionManager: FileExtensionManager;
	fileListAdapter: FileListAdapter;

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

				await this.metaDataGenerator.create(file as TFile);
				new Notice(`Metadata file of ${file.name} is created.`);
				this.fileListAdapter.add(file.path);
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
			name: 'Create metadata for binary files',
			callback: async () => {
				const promises: Promise<void>[] = [];
				const allFiles = this.app.vault.getFiles();
				for (const file of allFiles) {
					if (
						!(await this.metaDataGenerator.shouldCreateMetaDataFile(
							file
						))
					) {
						continue;
					}

					promises.push(
						this.metaDataGenerator
							.create(file as TFile)
							.then(() => {
								new Notice(
									`Metadata file of ${file.name} is created.`
								);
								this.fileListAdapter.add(file.path);
							})
					);
				}
				await Promise.all(promises);
				this.fileListAdapter.save();
			},
		});

		this.addCommand({
			id: 'binary-file-manager-detect-unlinked-binary-files',
			name: 'Create metadata for unlinked binary files',
			callback: async () => {
				const promises: Promise<void>[] = [];
				const unlinkedFiles =
					this.metaDataGenerator.findUnlinkedBinaries();
				unlinkedFiles.forEach((file) => {
					promises.push(
						this.metaDataGenerator
							.create(file as TFile)
							.then(() => {
								new Notice(
									`Metadata file of ${file.name} is created.`
								);
								this.fileListAdapter.add(file.path);
							})
					);
				});
				await Promise.all(promises);
				this.fileListAdapter.save();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BinaryFileManagerSettingTab(this.app, this));
	}

	// onunload() {}

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
}
