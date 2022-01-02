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
import { UncoveredApp } from 'Uncover';

interface Settings {
	extensions: string[];
	folder: string;
	filenameFormat: string;
	templateFile: string;
	useTemplater: boolean;
}

const DEFAULT_SETTINGS: Settings = {
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
	filenameFormat: 'INFO_{{NAME}}_{EXTENSION:UP}}',
	templateFile: '/',
	useTemplater: false,
};

const PLUGIN_NAME = 'obsidian-static-file-manager-plugin';
const REGISTERED_STATIC_FILE_STORAGE_FILE_NAME = '.static_file_list.txt';
const TEMPLATER_PLUGIN_NAME = 'templater-obsidian';

export default class StaticFileManagerPlugin extends Plugin {
	settings: Settings;
	private registeredStaticFiles: Set<string>;
	tpAPI: TemplaterAdapter = new TemplaterAdapter();

	override async onload() {
		await this.loadSettings();
		console.log(this.app);

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

	private async loadRegisteredStaticFiles() {
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

	private async saveRegisteredStaticFiles() {
		const configDir = this.app.vault.configDir;
		const storageFilePath = normalizePath(
			`${configDir}/plugins/${PLUGIN_NAME}/${REGISTERED_STATIC_FILE_STORAGE_FILE_NAME}`
		);

		await this.app.vault.adapter.write(
			storageFilePath,
			Array.from(this.registeredStaticFiles).join('\n')
		);
	}

	private async shouldCreateMetaDataFile(
		file: TAbstractFile
	): Promise<boolean> {
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

	private shouldUnregisterStaticFile(file: TAbstractFile): boolean {
		if (!(file instanceof TFile)) {
			return false;
		}
		return this.registeredStaticFiles.has(file.name);
	}

	private async unregisterStaticFile(file: TFile): Promise<void> {
		this.registeredStaticFiles.delete(file.name);
		await this.saveRegisteredStaticFiles();
	}

	private async unregisterNonExistingStaticFiles() {
		const difference = new Set(this.registeredStaticFiles);
		for (const file of this.app.vault.getFiles()) {
			difference.delete(file.name);
		}
		for (const fileToBeUnregistered of difference) {
			this.registeredStaticFiles.delete(fileToBeUnregistered);
		}
		this.saveRegisteredStaticFiles();
	}

	private generateMetaDataFileName(file: TFile): string {
		const metaDataFileName = `${Formatter.format(
			this.settings.filenameFormat,
			file.path,
			file.stat.ctime
		)}.md`;
		return metaDataFileName;
	}

	private async uniquefyMetaDataFileName(
		metaDataFileName: string
	): Promise<string> {
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

	private async createMetaDataFile(
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

		// process by Templater
		const templaterPlugin = await this.getTemplaterPlugin();
		if (!(this.settings.useTemplater && templaterPlugin)) {
			this.app.vault.create(
				metaDataFilePath,
				Formatter.format(
					await this.app.vault.read(templateFile),
					staticFile.path,
					staticFile.stat.ctime
				)
			);
		} else {
			const targetFile = await this.app.vault.create(
				metaDataFilePath,
				''
			);

			try {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				const content = await templaterPlugin.templater.parse_template(
					{ target_file: targetFile, run_mode: 4 },
					Formatter.format(
						await this.app.vault.read(templateFile),
						staticFile.path,
						staticFile.stat.ctime
					)
				);
				this.app.vault.modify(targetFile, content);
			} catch (err) {
				new Notice(
					'ERROR in Static File Manager Plugin: failed to connect to Templater. Your Templater version may not be supported'
				);
				console.log(err);
			}
		}
	}

	private async getTemplaterPlugin(): Promise<Plugin | undefined> {
		const app = this.app as UncoveredApp;
		return app.plugins.plugins[TEMPLATER_PLUGIN_NAME];
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
