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
	templatePath: string;
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
	filenameFormat: 'INFO_{{NAME}}_{{EXTENSION:UP}}',
	templatePath: '',
	useTemplater: false,
};

const PLUGIN_NAME = 'obsidian-binary-file-manager-plugin';
const REGISTERED_BINARY_FILE_STORAGE_FILE_NAME =
	'.binary-file-manager_binary-file-list.txt';
const TEMPLATER_PLUGIN_NAME = 'templater-obsidian';
const DEFAULT_TEMPLATE_CONTENT = `![[{{PATH}}]]
LINK: [[{{PATH}}]]
CREATED At: {{CDATE:YYYY-MM-DD}}
FILE TYPE: {{EXTENSION:UP}}
`;

export default class BinaryFileManagerPlugin extends Plugin {
	settings: Settings;
	private registeredBinaryFilePaths: Set<string>;
	tpAPI: TemplaterAdapter = new TemplaterAdapter();

	override async onload() {
		await this.loadSettings();
		console.log(this.app);

		this.loadRegisteredBinaryFiles();

		this.app.workspace.onLayoutReady(async () => {
			this.unregisterNonExistingBinaryFiles();
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
				this.registeredBinaryFilePaths.add(file.path);
				this.saveRegisteredBinaryFiles();
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', async (file: TAbstractFile) => {
				if (!this.shouldUnregisterBinaryFile(file)) {
					return;
				}
				await this.unregisterBinaryFile(file as TFile);
			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	// onunload() {}

	private async loadRegisteredBinaryFiles() {
		const configDir = this.app.vault.configDir;
		const storageFilePath = normalizePath(
			`${configDir}/plugins/${PLUGIN_NAME}/${REGISTERED_BINARY_FILE_STORAGE_FILE_NAME}`
		);

		if (!(await this.app.vault.adapter.exists(storageFilePath))) {
			this.registeredBinaryFilePaths = new Set<string>();
			return;
		}

		const binaryFiles = (await this.app.vault.adapter.read(storageFilePath))
			.trim()
			.split(/\r?\n/);
		this.registeredBinaryFilePaths = new Set<string>(binaryFiles);
	}

	private async saveRegisteredBinaryFiles() {
		const configDir = this.app.vault.configDir;
		const storageFilePath = normalizePath(
			`${configDir}/plugins/${PLUGIN_NAME}/${REGISTERED_BINARY_FILE_STORAGE_FILE_NAME}`
		);

		await this.app.vault.adapter.write(
			storageFilePath,
			Array.from(this.registeredBinaryFilePaths).join('\n')
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

		if (this.registeredBinaryFilePaths.has(file.path)) {
			return false;
		}

		return true;
	}

	private shouldUnregisterBinaryFile(file: TAbstractFile): boolean {
		if (!(file instanceof TFile)) {
			return false;
		}
		return this.registeredBinaryFilePaths.has(file.name);
	}

	private async unregisterBinaryFile(file: TFile): Promise<void> {
		this.registeredBinaryFilePaths.delete(file.path);
		await this.saveRegisteredBinaryFiles();
	}

	private async unregisterNonExistingBinaryFiles() {
		const difference = new Set(this.registeredBinaryFilePaths);
		for (const file of this.app.vault.getFiles()) {
			difference.delete(file.path);
		}
		for (const fileToBeUnregistered of difference) {
			this.registeredBinaryFilePaths.delete(fileToBeUnregistered);
		}
		this.saveRegisteredBinaryFiles();
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
		binaryFile: TFile
	): Promise<void> {
		const templateContent = await this.fetchTemplateContent();

		// process by Templater
		const templaterPlugin = await this.getTemplaterPlugin();
		if (!(this.settings.useTemplater && templaterPlugin)) {
			this.app.vault.create(
				metaDataFilePath,
				Formatter.format(
					templateContent,
					binaryFile.path,
					binaryFile.stat.ctime
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
						templateContent,
						binaryFile.path,
						binaryFile.stat.ctime
					)
				);
				this.app.vault.modify(targetFile, content);
			} catch (err) {
				new Notice(
					'ERROR in Binary File Manager Plugin: failed to connect to Templater. Your Templater version may not be supported'
				);
				console.log(err);
			}
		}
	}

	private async fetchTemplateContent(): Promise<string> {
		if (this.settings.templatePath === '') {
			return DEFAULT_TEMPLATE_CONTENT;
		}
		const templateFile = this.app.vault.getAbstractFileByPath(
			this.settings.templatePath
		);
		if (!(templateFile instanceof TFile)) {
			console.log(this.settings.templatePath);
			new Notice(`Template file ${templateFile} is invalid`);
			return DEFAULT_TEMPLATE_CONTENT;
		}
		return await this.app.vault.read(templateFile);
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
