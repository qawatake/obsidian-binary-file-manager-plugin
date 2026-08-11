export function collisionFileName(
	prefix: string,
	fileName: string,
	timestamp: string,
	attempt: number
): string {
	const suffix = attempt === 0 ? '' : `-${attempt}`;
	return `${prefix}-${timestamp}${suffix}-${fileName}`;
}
