import {
	Command,
	normalizePath,
	Notice,
	Plugin,
	TAbstractFile,
	TFile,
} from 'obsidian';
import { AppExtension } from './uncover';
import { Formatter } from 'Formatter';
import { TemplaterAdapter } from 'TemplaterAdapter';
import { SampleSettingTab } from 'Setting';

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
				await this.createMetaDataFile(file as TFile);
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
}
