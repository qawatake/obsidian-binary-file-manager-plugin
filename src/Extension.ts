import BinaryFileManagerPlugin from 'main';

export class FileExtensionManager {
	private plugin: BinaryFileManagerPlugin;
	private extensions: Set<string>;

	constructor(plugin: BinaryFileManagerPlugin) {
		this.plugin = plugin;
		this.extensions = new Set<string>(
			this.plugin.settings.extensions.map((ext) => ext.toLowerCase())
		);
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
			if (this.extensions.has(ext.toLowerCase())) {
				return ext;
			}
		}
		return undefined;
	}

	public add(ext: string): void {
		this.extensions.add(ext.trim().replace(/^\./, '').toLowerCase());
	}

	public delete(ext: string): void {
		this.extensions.delete(ext.toLowerCase());
	}

	public has(ext: string): boolean {
		return this.extensions.has(ext.toLowerCase());
	}

	public verify(filepath: string): boolean {
		// i want to use return so avoid to use forEach
		const lowerPath = filepath.toLowerCase();
		for (const ext of this.extensions) {
			if (lowerPath.endsWith('.' + ext)) {
				return true;
			}
		}
		return false;
	}

	public toArray(): string[] {
		return Array.from(this.extensions);
	}
}
