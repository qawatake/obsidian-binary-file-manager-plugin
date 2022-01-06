import BinaryFileManagerPlugin from 'main';
import { App, normalizePath } from 'obsidian';

const PLUGIN_NAME = 'obsidian-binary-file-manager-plugin';
const REGISTERED_BINARY_FILE_STORAGE_FILE_NAME =
	'.binary-file-manager_binary-file-list.txt';

export class FileListAdapter {
	private app: App;
	private plugin: BinaryFileManagerPlugin;
	private registeredBinaryFilePaths: Set<string>;

	constructor(app: App, plugin: BinaryFileManagerPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.registeredBinaryFilePaths = new Set<string>();
		this.app.workspace.onLayoutReady(async () => {
			this.deleteNonExistingBinaryFiles();
		});
	}

	async load(): Promise<FileListAdapter> {
		await this.loadBinaryFiles();
		return this;
	}

	async save() {
		await this.saveBinaryFiles();
	}

	add(filepath: string): void {
		this.registeredBinaryFilePaths.add(filepath);
	}

	delete(filepath: string): void {
		this.registeredBinaryFilePaths.delete(filepath);
	}

	has(filepath: string): boolean {
		return this.registeredBinaryFilePaths.has(filepath);
	}

	private async loadBinaryFiles() {
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

	private async saveBinaryFiles() {
		const configDir = this.app.vault.configDir;
		const storageFilePath = normalizePath(
			`${configDir}/plugins/${PLUGIN_NAME}/${REGISTERED_BINARY_FILE_STORAGE_FILE_NAME}`
		);

		await this.app.vault.adapter.write(
			storageFilePath,
			Array.from(this.registeredBinaryFilePaths).join('\n')
		);
	}

	private async deleteNonExistingBinaryFiles() {
		const difference = new Set(this.registeredBinaryFilePaths);
		for (const file of this.app.vault.getFiles()) {
			difference.delete(file.path);
		}
		for (const fileToBeUnregistered of difference) {
			this.registeredBinaryFilePaths.delete(fileToBeUnregistered);
		}
		await this.saveBinaryFiles();
	}
}
