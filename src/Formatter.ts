import { moment } from 'obsidian';
import * as path from 'path';
const DATE_REGEXP = /{{CDATE:([^}\n\r]*)}}/g;
const NAME_REGEX = /{{NAME(((:UP)|(:LOW))?)}}/g;
const FULLNAME_REGEX = /{{FULLNAME(((:UP)|(:LOW))?)}}/g;
const EXTENSION_REGEX = /{{EXTENSION(((:UP)|(:LOW))?)}}/g;
const PATH_REGEX = /{{PATH(((:UP)|(:LOW))?)}}/g;
const NOW_REGEXP = /{{NOW:([^}\n\r]*)}}/g;

export class Formatter {
	static format(input: string, filepath: string, createdAt: number): string {
		let output = input;
		output = this.replaceDate(output, createdAt);
		output = this.replaceNow(output);
		const fullname = path.basename(filepath);
		const nameWithoutExt = fullname.substring(
			0,
			fullname.lastIndexOf(path.extname(filepath))
		);
		output = this.replacePath(output, filepath);
		output = this.replaceFullName(output, fullname);
		output = this.replaceName(output, nameWithoutExt);
		output = this.replaceExtension(
			output,
			path.extname(filepath).replace(/^\./, '')
		); // remove "."
		return output;
	}

	private static replaceDate(input: string, unixMilliSecond: number): string {
		const output = input.replace(
			DATE_REGEXP,
			(_matched: string, fmt: string): string => {
				return moment(unixMilliSecond).format(fmt);
			}
		);
		return output;
	}

	private static replaceFullName(input: string, fullname: string): string {
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

	private static replaceName(input: string, filename: string): string {
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

	private static replaceExtension(input: string, extension: string): string {
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

	private static replaceNow(input: string): string {
		const currentDate = moment();
		return input.replace(
			NOW_REGEXP,
			(_matched: string, fmt: string): string => {
				return currentDate.format(fmt);
			}
		);
	}

	private static replacePath(input: string, filepath: string): string {
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
}
