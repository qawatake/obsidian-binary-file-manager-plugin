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

	binaryFileName(metaDataFileName: string): string | undefined {
		const fileNameWithMd = metaDataFileName.endsWith('.md')
			? metaDataFileName
			: metaDataFileName + '.md';
		const binaryFileName =
			this.templaterArgMap.get(fileNameWithMd)?.binaryFileName;
		if (!binaryFileName) {
			return undefined;
		}
		return binaryFileName;
	}

	setNewArg(
		metaDataFileName: string,
		binaryFileName: string,
		createdAt: number
	): void {
		this.templaterArgMap.set(metaDataFileName, {
			binaryFileName: binaryFileName,
			createdAt: createdAt,
		});
	}
}

type TemplaterArgs = {
	createdAt: number;
	binaryFileName: string;
};
