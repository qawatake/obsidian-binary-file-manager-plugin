import { moment } from 'obsidian';

export class TemplaterAdapter {
	templaterArgMap: Map<string, TemplaterArgs> = new Map();

	createdAt(metaDataFileName: string): moment.Moment | undefined {
		const fileNameWithMd = metaDataFileName.endsWith('.md')
			? metaDataFileName
			: metaDataFileName + '.md';
		const createdAt = this.templaterArgMap.get(fileNameWithMd)?.createdAt;
		if (!createdAt) {
			return undefined;
		}
		return moment(createdAt);
	}

	staticFileName(metaDataFileName: string): string | undefined {
		const fileNameWithMd = metaDataFileName.endsWith('.md')
			? metaDataFileName
			: metaDataFileName + '.md';
		const staticFileName =
			this.templaterArgMap.get(fileNameWithMd)?.staticFileName;
		if (!staticFileName) {
			return undefined;
		}
		return staticFileName;
	}

	setNewArg(
		metaDataFileName: string,
		staticFileName: string,
		createdAt: number
	): void {
		this.templaterArgMap.set(metaDataFileName, {
			staticFileName: staticFileName,
			createdAt: createdAt,
		});
	}
}

type TemplaterArgs = {
	createdAt: number;
	staticFileName: string;
};
