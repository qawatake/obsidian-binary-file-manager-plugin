import dayjs from 'dayjs';
const DATE_REGEXP = /{{DATE:([^}\n\r]*)}}/;
const BASENAME_SYNTAX = '{{BASENAME}}';
const FULLNAME_SYNTAX = '{{FULLNAME}}';
const EXTENSION_SYNTAX = '{{EXTENSION}}';

export class Formatter {
	static format(input: string, basename: string, extension: string): string {
		let output = input;
		output = this.replaceDate(output);
		output = this.replaceFullName(output, `${basename}.${extension}`);
		output = this.replaceBaseName(output, basename);
		output = this.replaceExtension(output, extension);
		return output;
	}

	private static replaceDate(input: string): string {
		const output = input.replace(
			DATE_REGEXP,
			(_matched: string, fmt: string): string => {
				return dayjs().format(fmt);
			}
		);
		return output;
	}

	private static replaceFullName(input: string, fullname: string): string {
		return input.replace(FULLNAME_SYNTAX, fullname);
	}

	private static replaceBaseName(input: string, basename: string): string {
		return input.replace(BASENAME_SYNTAX, basename);
	}

	private static replaceExtension(input: string, extension: string): string {
		return input.replace(EXTENSION_SYNTAX, extension);
	}
}
