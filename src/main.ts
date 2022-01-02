import {
	normalizePath,
	Notice,
	Plugin,
	TAbstractFile,
	TFile,
	moment,
} from 'obsidian';
import { Formatter } from 'Formatter';
import { TemplaterAdapter } from 'TemplaterAdapter';
import { SampleSettingTab } from 'Setting';

interface MyPluginSettings {
	extensions: string[];
	folder: string;
	filenameFormat: string;
	templateFile: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	extensions: ['png', 'jpg', 'jpeg', 'pdf', 'git'],
	folder: '/',
	filenameFormat: 'INFO_{{NAME}}_{EXTENSION:UP}}',
	templateFile: '/',
};

const PLUGIN_NAME = 'obsidian-static-file-manager-plugin';
const REGISTERED_STATIC_FILE_STORAGE_FILE_NAME = '.static_file_list.txt';

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private registeredStaticFiles: Set<string>;
	tpAPI: TemplaterAdapter = new TemplaterAdapter();

	override async onload() {
		await this.loadSettings();

		this.loadRegisteredStaticFiles();

		this.app.workspace.onLayoutReady(async () => {
			this.unregisterNonExistingStaticFiles();
		});

		this.registerEvent(
			this.app.vault.on('create', async (file: TAbstractFile) => {
				if (!(await this.shouldCreateMetaDataFile(file))) {
					return;
				}

				const metaDataFileName = await this.uniquefyMetaDataFileName(
					this.generateMetaDataFileName(file as TFile)
				);
				const metaDataFilePath = `${this.settings.folder}/${metaDataFileName}`;

				this.tpAPI.setNewArg(
					metaDataFileName,
					file.name,
					(file as TFile).stat.ctime
				);
				await this.createMetaDataFile(metaDataFilePath, file as TFile);
				new Notice(`Meta data file of ${file.name} is created.`);
				this.registeredStaticFiles.add(file.name);
				this.saveRegisteredStaticFiles();
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', async (file: TAbstractFile) => {
				if (!this.shouldUnregisterStaticFile(file)) {
					return;
				}
				await this.unregisterStaticFile(file as TFile);
			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	// onunload() {}

	async loadRegisteredStaticFiles() {
		const configDir = this.app.vault.configDir;
		const storageFilePath = normalizePath(
			`${configDir}/plugins/${PLUGIN_NAME}/${REGISTERED_STATIC_FILE_STORAGE_FILE_NAME}`
		);

		if (!(await this.app.vault.adapter.exists(storageFilePath))) {
			this.registeredStaticFiles = new Set<string>();
			return;
		}

		const staticFiles = (await this.app.vault.adapter.read(storageFilePath))
			.trim()
			.split(/\r?\n/);
		this.registeredStaticFiles = new Set<string>(staticFiles);
	}

	async saveRegisteredStaticFiles() {
		const configDir = this.app.vault.configDir;
		const storageFilePath = normalizePath(
			`${configDir}/plugins/${PLUGIN_NAME}/${REGISTERED_STATIC_FILE_STORAGE_FILE_NAME}`
		);

		await this.app.vault.adapter.write(
			storageFilePath,
			Array.from(this.registeredStaticFiles).join('\n')
		);
	}

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

		return true;
	}

	shouldUnregisterStaticFile(file: TAbstractFile): boolean {
		if (!(file instanceof TFile)) {
			return false;
		}
		return this.registeredStaticFiles.has(file.name);
	}

	async unregisterStaticFile(file: TFile): Promise<void> {
		this.registeredStaticFiles.delete(file.name);
		await this.saveRegisteredStaticFiles();
	}

	async unregisterNonExistingStaticFiles() {
		const difference = new Set(this.registeredStaticFiles);
		for (const file of this.app.vault.getFiles()) {
			difference.delete(file.name);
		}
		for (const fileToBeUnregistered of difference) {
			this.registeredStaticFiles.delete(fileToBeUnregistered);
		}
		this.saveRegisteredStaticFiles();
	}

	generateMetaDataFileName(file: TFile): string {
		const metaDataFileName = `${Formatter.format(
			this.settings.filenameFormat,
			file.path,
			file.stat.ctime
		)}.md`;
		return metaDataFileName;
	}

	async uniquefyMetaDataFileName(metaDataFileName: string): Promise<string> {
		const metaDataFilePath = normalizePath(
			`${this.settings.folder}/${metaDataFileName}`
		);
		if (await this.app.vault.adapter.exists(metaDataFilePath)) {
			return `CONFLICT-${moment().format(
				'YYYY-MM-DD-hh-mm-ss'
			)}-${metaDataFileName}`;
		} else {
			return metaDataFileName;
		}
	}

	async createMetaDataFile(
		metaDataFilePath: string,
		staticFile: TFile
	): Promise<void> {
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
			Formatter.format(
				await this.app.vault.read(templateFile),
				staticFile.path,
				staticFile.stat.ctime
			)
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
}
