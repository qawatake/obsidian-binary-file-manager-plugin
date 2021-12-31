import { moment } from 'obsidian';
const DATE_REGEXP = /{{CDATE:([^}\n\r]*)}}/;
const BASENAME_REGEX = /{{BASENAME(((:UP)|(:LOW))?)}}/;
const FULLNAME_REGEX = /{{FULLNAME(((:UP)|(:LOW))?)}}/;
const EXTENSION_REGEX = /{{EXTENSION(((:UP)|(:LOW))?)}}/;

export class Formatter {
	static format(
		input: string,
		basename: string,
		extension: string,
		unixSecond: number
	): string {
		let output = input;
		output = this.replaceDate(output, unixSecond);
		output = this.replaceFullName(output, `${basename}.${extension}`);
		output = this.replaceBaseName(output, basename);
		output = this.replaceExtension(output, extension);
		return output;
	}

	private static replaceDate(input: string, unixSecond: number): string {
		const output = input.replace(
			DATE_REGEXP,
			(_matched: string, fmt: string): string => {
				return moment.unix(unixSecond).format(fmt);
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

	private static replaceBaseName(input: string, basename: string): string {
		return input.replace(
			BASENAME_REGEX,
			(_matched: string, caseMode: string): string => {
				if (!caseMode) {
					return basename;
				} else if (caseMode == ':UP') {
					return basename.toUpperCase();
				} else {
					return basename.toLowerCase();
				}
			}
		);
	}

	private static replaceExtension(input: string, extension: string): string {
		return input.replace(
			EXTENSION_REGEX,
			(_matched: string, caseMode: string): string => {
				console.log(caseMode);
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
}
