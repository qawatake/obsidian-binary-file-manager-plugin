import BinaryFileManagerPlugin, { WatchedFolderSettings } from 'main';
import {
	App,
	normalizePath,
	TAbstractFile,
	TFile,
	moment,
	Notice,
	Plugin,
} from 'obsidian';
import { UncoveredApp } from 'Uncover';
import { retry } from 'Util';

const TEMPLATER_PLUGIN_NAME = 'templater-obsidian';
const DEFAULT_TEMPLATE_CONTENT = ``;

const RETRY_NUMBER = 1000;
const TIMEOUT_MILLISECOND = 1000;

export class MetaDataGenerator {
	private app: App;
	private plugin: BinaryFileManagerPlugin;

	constructor(app: App, plugin: BinaryFileManagerPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	async shouldCreateMetaDataFile(file: TAbstractFile): Promise<boolean> {
		if (!(file instanceof TFile)) {
			return false;
		}

		const filePath = file.path.toString();
		const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));

		if (!this.getWatchedFolderSettings(folderPath)) {
			return false;
		}

		const matchedExtension =
			this.plugin.fileExtensionManager.getExtensionMatchedBest(file.name);
		if (!matchedExtension) {
			return false;
		}

		if (this.plugin.fileListAdapter.has(file.path)) {
			return false;
		}

		return true;
	}

	getWatchedFolderSettings(path: string): WatchedFolderSettings | undefined {
		if (
			normalizePath(this.plugin.settings.binaryFilePath || '/') ===
			normalizePath(path || '/')
		) {
			return {
				binaryFilePath: this.plugin.settings.binaryFilePath,
				attachmentsFilePath: this.plugin.settings.attachmentsFilePath,
				folder: this.plugin.settings.folder,
				filenameFormat: this.plugin.settings.filenameFormat,
				templatePath: this.plugin.settings.templatePath,
				useTemplater: this.plugin.settings.useTemplater,
			};
		}
		return this.plugin.settings.watchedFolders.find(
			(settings) =>
				normalizePath(settings.binaryFilePath || '/') ===
				normalizePath(path || '/')
		);
	}

	/**
	 * Create a metadata note for a binary file.
	 * @param file The binary file
	 * @param baseDir Optional base directory for the note and attachments (default: plugin.settings.folder)
	 */
	/**
	 * Create a metadata note for a binary file.
	 * @param file The binary file
	 * @param baseDir Optional base directory for the note and attachments (default: plugin.settings.folder)
	 * @param templatePathOverride Optional template path to use instead of the default
	 */
	async create(file: TFile, baseDir?: string, templatePathOverride?: string) {
		const watchedSettings = this.getWatchedFolderSettings(
			file.parent?.path || ''
		);
		const settings = watchedSettings || this.plugin.settings;
		const folder = baseDir || settings.folder;
		const attachmentsFolder =
			settings.attachmentsFilePath || `${folder}/_attachments`;
		const metaDataFileName = this.uniquefyMetaDataFileName(
			this.generateMetaDataFileName(file),
			folder
		);
		const metaDataFilePath = `${folder}/${metaDataFileName}`;
		await this.createMetaDataFile(
			metaDataFilePath,
			file as TFile,
			attachmentsFolder,
			templatePathOverride
		);
	}

	private generateMetaDataFileName(file: TFile): string {
		const settings =
			this.getWatchedFolderSettings(file.parent?.path || '') ||
			this.plugin.settings;
		const metaDataFileName = `${this.plugin.formatter.format(
			settings.filenameFormat,
			file.path,
			file.stat.ctime
		)}.md`;
		return metaDataFileName;
	}

	private uniquefyMetaDataFileName(
		metaDataFileName: string,
		folder: string
	): string {
		const metaDataFilePath = normalizePath(`${folder}/${metaDataFileName}`);
		if (this.app.vault.getAbstractFileByPath(metaDataFilePath)) {
			return `CONFLICT-${moment().format(
				'YYYY-MM-DD-hh-mm-ss'
			)}-${metaDataFileName}`;
		} else {
			return metaDataFileName;
		}
	}

	private uniquefyBinaryFileName(
		binaryFileName: string,
		attachmentsFolder: string
	): string {
		const attachmentFullFilePath = attachmentsFolder + '/' + binaryFileName;
		if (this.app.vault.getAbstractFileByPath(attachmentFullFilePath)) {
			return `CONFLICT-${moment().format(
				'YYYY-MM-DD-hh-mm-ss'
			)}-${binaryFileName}`;
		} else {
			return binaryFileName;
		}
	}

	private async moveBinaryFile(
		binaryFile: TFile,
		attachmentsFolder: string
	): Promise<string> {
		const binaryFileName = this.uniquefyBinaryFileName(
			binaryFile.basename + '.' + binaryFile.extension,
			attachmentsFolder
		);
		const fullFilePath = attachmentsFolder + '/' + binaryFileName;
		if (normalizePath(binaryFile.path) === normalizePath(fullFilePath)) {
			return binaryFile.path;
		}
		// Ensure attachments folder exists
		const folder = this.app.vault.getAbstractFileByPath(attachmentsFolder);
		if (!folder) {
			await this.app.vault.createFolder(attachmentsFolder);
		}
		// move binary file into the attachments folder
		try {
			await this.app.fileManager.renameFile(binaryFile, fullFilePath);
			new Notice(`Binary file of ${binaryFileName} has been moved.`);
			return fullFilePath;
		} catch (err) {
			new Notice(
				`Problem moving the binary file of ${binaryFileName} into the attachments folder.`
			);
			alert(err);
			return binaryFile.path;
		}
	}

	private async createMetaDataFile(
		metaDataFilePath: string,
		binaryFile: TFile,
		attachmentsFolder: string,
		templatePathOverride?: string
	): Promise<void> {
		const settings =
			this.getWatchedFolderSettings(binaryFile.parent?.path || '') ||
			this.plugin.settings;
		const templateContent = await this.fetchTemplateContent(
			templatePathOverride,
			settings.templatePath
		);
		// Move the binary file to the attachments folder
		const fullFilePath = await this.moveBinaryFile(
			binaryFile,
			attachmentsFolder
		);
		// process by Templater
		const templaterPlugin = await this.getTemplaterPlugin();
		if (!(settings.useTemplater && templaterPlugin)) {
			await this.app.vault.create(
				metaDataFilePath,
				this.plugin.formatter.format(
					templateContent,
					fullFilePath,
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
					this.plugin.formatter.format(
						templateContent,
						fullFilePath,
						binaryFile.stat.ctime
					)
				);
				await this.app.vault.modify(targetFile, content);
			} catch (err) {
				new Notice(
					'ERROR in Binary File Manager Plugin: failed to connect to Templater. Your Templater version may not be supported.'
				);
				console.log(err);
			}
		}
	}

	private async fetchTemplateContent(
		templatePathOverride?: string,
		defaultTemplatePath?: string
	): Promise<string> {
		const templatePath =
			templatePathOverride !== undefined
				? templatePathOverride
				: defaultTemplatePath ?? this.plugin.settings.templatePath;
		if (templatePath === '') {
			return DEFAULT_TEMPLATE_CONTENT;
		}

		const templateFile = await retry(
			() => {
				return this.app.vault.getAbstractFileByPath(templatePath);
			},
			TIMEOUT_MILLISECOND,
			RETRY_NUMBER,
			(abstractFile) => abstractFile !== null
		);

		if (!(templateFile instanceof TFile)) {
			const msg = `Template file ${templatePath} is invalid`;
			console.log(msg);
			new Notice(msg);
			return DEFAULT_TEMPLATE_CONTENT;
		}
		return await this.app.vault.read(templateFile);
	}

	private async getTemplaterPlugin(): Promise<Plugin | undefined> {
		const app = this.app as UncoveredApp;
		return await retry(
			() => {
				return app.plugins.plugins[TEMPLATER_PLUGIN_NAME];
			},
			TIMEOUT_MILLISECOND,
			RETRY_NUMBER
		);
	}

	findUnlinkedBinaries(): TFile[] {
		const unlinkedBinaries: TFile[] = [];
		const linkedPaths = new Set<string>();

		// collect all link destinations
		Object.values(this.app.metadataCache.resolvedLinks).forEach((links) => {
			Object.keys(links).forEach((dest) => {
				linkedPaths.add(dest);
			});
		});

		// collect only unlinked binaries
		this.app.vault.getFiles().forEach((file) => {
			const isUnlinkedBinary =
				!linkedPaths.has(file.path) &&
				this.plugin.fileExtensionManager.verify(file.path);
			if (isUnlinkedBinary) {
				unlinkedBinaries.push(file);
			}
		});

		return unlinkedBinaries;
	}

	findLinkedBinaries(): TFile[] {
		const linkedBinaries: TFile[] = [];
		const linkedPaths = new Set<string>();

		// collect all link destinations
		Object.values(this.app.metadataCache.resolvedLinks).forEach((links) => {
			Object.keys(links).forEach((dest) => {
				linkedPaths.add(dest);
			});
		});

		// collect only unlinked binaries
		this.app.vault.getFiles().forEach((file) => {
			const isUnlinkedBinary =
				!linkedPaths.has(file.path) &&
				this.plugin.fileExtensionManager.verify(file.path);
			if (!isUnlinkedBinary) {
				linkedBinaries.push(file);
			}
		});

		return linkedBinaries;
	}
}
