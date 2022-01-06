import BinaryFileManagerPlugin from 'main';
import { App, moment } from 'obsidian';
const DATE_REGEXP = /{{CDATE:([^}\n\r]*)}}/g;
const NAME_REGEX = /{{NAME(((:UP)|(:LOW))?)}}/g;
const FULLNAME_REGEX = /{{FULLNAME(((:UP)|(:LOW))?)}}/g;
const EXTENSION_REGEX = /{{EXTENSION(((:UP)|(:LOW))?)}}/g;
const PATH_REGEX = /{{PATH(((:UP)|(:LOW))?)}}/g;
const NOW_REGEXP = /{{NOW:([^}\n\r]*)}}/g;
const LINK_SYNTAX = '{{LINK}}';
const EMBED_SYNTAX = '{{EMBED}}';

export class Formatter {
	app: App;
	plugin: BinaryFileManagerPlugin;

	constructor(app: App, plugin: BinaryFileManagerPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	format(input: string, filepath: string, createdAt: number): string {
		let output = input;
		output = this.replaceDate(output, createdAt);
		output = this.replaceNow(output);
		const fullname = basename(filepath);
		const extension =
			this.plugin.fileExtensionManager.getExtensionMatchedBest(
				fullname
			) ?? '';
		const nameWithoutExtension = basename(fullname, extension); // add "." to get like ".png"
		output = this.replacePath(output, filepath);
		output = this.replaceFullName(output, fullname);
		output = this.replaceName(output, nameWithoutExtension);
		output = this.replaceExtension(output, extension);
		output = this.replaceLink(output, filepath);
		output = this.replaceEmbed(output, filepath);
		return output;
	}

	private replaceDate(input: string, unixMilliSecond: number): string {
		const output = input.replace(
			DATE_REGEXP,
			(_matched: string, fmt: string): string => {
				return moment(unixMilliSecond).format(fmt);
			}
		);
		return output;
	}

	private replaceFullName(input: string, fullname: string): string {
		return input.replace(
			FULLNAME_REGEX,
			(_matched: string, caseMode: string): string => {
				if (!caseMode) {
					return fullname;
				} else if (caseMode == ':UP') {
					return fullname.toUpperCase();
				} else {
					return fullname.toLowerCase();
				}
			}
		);
	}

	private replaceName(input: string, filename: string): string {
		return input.replace(
			NAME_REGEX,
			(_matched: string, caseMode: string): string => {
				if (!caseMode) {
					return filename;
				} else if (caseMode == ':UP') {
					return filename.toUpperCase();
				} else {
					return filename.toLowerCase();
				}
			}
		);
	}

	private replaceExtension(input: string, extension: string): string {
		return input.replace(
			EXTENSION_REGEX,
			(_matched: string, caseMode: string): string => {
				if (!caseMode) {
					return extension;
				} else if (caseMode == ':UP') {
					return extension.toUpperCase();
				} else {
					return extension.toLowerCase();
				}
			}
		);
	}

	private replaceNow(input: string): string {
		const currentDate = moment();
		return input.replace(
			NOW_REGEXP,
			(_matched: string, fmt: string): string => {
				return currentDate.format(fmt);
			}
		);
	}

	private replacePath(input: string, filepath: string): string {
		return input.replace(
			PATH_REGEX,
			(_matched: string, caseMode: string): string => {
				if (!caseMode) {
					return filepath;
				} else if (caseMode == ':UP') {
					return filepath.toUpperCase();
				} else {
					return filepath.toLowerCase();
				}
			}
		);
	}

	private replaceLink(input: string, filepath: string): string {
		return input.replace(LINK_SYNTAX, `[[${filepath}]]`);
	}

	private replaceEmbed(input: string, filepath: string): string {
		return input.replace(EMBED_SYNTAX, `![[${filepath}]]`);
	}
}

function cleanPath(filepath: string): string {
	// Always use forward slash
	let cleanedPath = filepath;
	cleanedPath = cleanedPath.replace(/\\/g, '/');

	// Use '/' for root
	if (cleanedPath === '') {
		cleanedPath = '/';
	}

	// Trim start slash
	for (let i = 0; i < cleanedPath.length; i++) {
		if (cleanedPath[i] !== '/') {
			cleanedPath = cleanedPath.substring(i);
			break;
		} else if (i === cleanedPath.length - 1) {
			cleanedPath = '/';
			break;
		}
	}

	// Trim end slash
	for (let i = cleanedPath.length - 1; i >= 0; i--) {
		if (cleanedPath[i] !== '/') {
			break;
		} else if (i === 0) {
			cleanedPath = '/';
			break;
		}
	}
	return cleanedPath;
}

// extension is like 'png' not '.png'
function basename(filepath: string, extension?: string): string {
	const segments = cleanPath(filepath).split('/');
	const filename = segments.last() ?? '';
	const ext = extension ?? '';
	return filename.replace(new RegExp(`\\.${ext}$`), '');
}
