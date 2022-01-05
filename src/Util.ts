export async function retry<T>(
	callback: () => T | undefined,
	timeoutMilliSecond: number,
	trials: number,
	check: (_value: T) => boolean = (_: T) => true
): Promise<T | undefined> {
	if (!Number.isInteger(trials)) {
		throw `arg trials: ${trials} is not an integer
		`;
	}
	const result = await Promise.race([
		delay(timeoutMilliSecond),
		(async (): Promise<T | undefined> => {
			for (let i = 0; i < trials; i++) {
				const t = callback();
				if (t !== undefined && check(t)) {
					return t;
				}
				await delay(1);
			}
			return undefined;
		})(),
	]);

	if (result === undefined) {
		return undefined;
	}
	return result as T;
}

async function delay(milliSecond: number): Promise<undefined> {
	await new Promise((resolve) => setTimeout(resolve, milliSecond));
	return undefined;
}

const INVALID_CHARS_IN_FILE_NAME = new Set<string>([
	'\\',
	'/',
	':',
	'*',
	'?',
	'"',
	'<',
	'>',
	'|',
]);

export function validFileName(fileName: string): {
	valid: boolean;
	included?: string;
} {
	for (const char of fileName) {
		if (INVALID_CHARS_IN_FILE_NAME.has(char)) {
			return { valid: false, included: char };
		}
	}

	return { valid: true };
}
