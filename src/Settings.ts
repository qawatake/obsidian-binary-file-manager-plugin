export interface WatchedFolderSettings {
	binaryFilePath: string;
	attachmentsFilePath: string;
	folder: string;
	filenameFormat: string;
	templatePath: string;
	useTemplater: boolean;
}

export function normalizeWatchedFolders(
	primaryPath: string,
	legacyWatchedFolders: WatchedFolderSettings[] | undefined
): WatchedFolderSettings[] {
	const paths = new Set<string>([normalizeFolderPath(primaryPath)]);
	return (legacyWatchedFolders ?? []).slice(1).filter((settings) => {
		const path = normalizeFolderPath(settings.binaryFilePath);
		if (path === '' || paths.has(path)) {
			return false;
		}
		paths.add(path);
		return true;
	});
}

export function normalizeFolderPath(path: string): string {
	return path.trim().replace(/^\/+|\/+$/g, '');
}
