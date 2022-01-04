import {
	normalizePath,
	Notice,
	Plugin,
	TAbstractFile,
	TFile,
	moment,
} from 'obsidian';
import { Formatter } from 'Formatter';
import { BinaryFileManagerSettingTab } from 'Setting';
import { UncoveredApp } from 'Uncover';
import { FileExtensionManager } from 'Extension';
import { FileListAdapter } from 'FileList';

interface BinaryFileManagerSettings {
	extensions: string[];
	folder: string;
	filenameFormat: string;
	templatePath: string;
	useTemplater: boolean;
}

const DEFAULT_SETTINGS: BinaryFileManagerSettings = {
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

const TEMPLATER_PLUGIN_NAME = 'templater-obsidian';
const DEFAULT_TEMPLATE_CONTENT = `![[{{PATH}}]]
LINK: [[{{PATH}}]]
CREATED At: {{CDATE:YYYY-MM-DD}}
FILE TYPE: {{EXTENSION:UP}}
`;

export default class BinaryFileManagerPlugin extends Plugin {
	settings: BinaryFileManagerSettings;
	formatter: Formatter;
	fileExtensionManager: FileExtensionManager;
	fileListAdapter: FileListAdapter;

	override async onload() {
		await this.loadSettings();

		this.formatter = new Formatter(this.app, this);
		this.fileExtensionManager = new FileExtensionManager(this);
		this.fileListAdapter = await new FileListAdapter(this.app, this).load();

		this.registerEvent(
			this.app.vault.on('create', async (file: TAbstractFile) => {
				if (!(await this.shouldCreateMetaDataFile(file))) {
					return;
				}

				const metaDataFileName = this.uniquefyMetaDataFileName(
					this.generateMetaDataFileName(file as TFile)
				);
				const metaDataFilePath = `${this.settings.folder}/${metaDataFileName}`;

				await this.createMetaDataFile(metaDataFilePath, file as TFile);
				new Notice(`Meta data file of ${file.name} is created.`);
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

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BinaryFileManagerSettingTab(this.app, this));
	}

	// onunload() {}

	private async shouldCreateMetaDataFile(
		file: TAbstractFile
	): Promise<boolean> {
		if (!(file instanceof TFile)) {
			return false;
		}

		const matchedExtension =
			this.fileExtensionManager.getExtensionMatchedBest(file.name);
		if (!matchedExtension) {
			return false;
		}

		if (this.fileListAdapter.has(file.path)) {
			return false;
		}

		return true;
	}

	private generateMetaDataFileName(file: TFile): string {
		const metaDataFileName = `${this.formatter.format(
			this.settings.filenameFormat,
			file.path,
			file.stat.ctime
		)}.md`;
		return metaDataFileName;
	}

	private uniquefyMetaDataFileName(metaDataFileName: string): string {
		const metaDataFilePath = normalizePath(
			`${this.settings.folder}/${metaDataFileName}`
		);
		if (this.app.vault.getAbstractFileByPath(metaDataFilePath)) {
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
				this.formatter.format(
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
					this.formatter.format(
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
