import BinaryFileManagerPlugin from 'main';

export class FileExtensionManager {
	private plugin: BinaryFileManagerPlugin;
	private extensions: Set<string>;

	constructor(plugin: BinaryFileManagerPlugin) {
		this.plugin = plugin;
		this.extensions = new Set<string>(this.plugin.settings.extensions);
	}

	public getExtensionMatchedBest(filename: string): string | undefined {
		// investigate extensions from longer to shorter
		for (let id = 0; id < filename.length; id++) {
			if (filename[id] !== '.') {
				continue;
			}
			const ext = filename.slice(id).replace(/^\./, '');
			if (ext === '') {
				return undefined;
			}
			if (this.extensions.has(ext)) {
				return ext;
			}
		}
		return undefined;
	}

	public add(ext: string): void {
		this.extensions.add(ext);
	}

	public delete(ext: string): void {
		this.extensions.delete(ext);
	}

	public has(ext: string): boolean {
		return this.extensions.has(ext);
	}

	public toArray(): string[] {
		return Array.from(this.extensions);
	}
}
