export interface ReferencePosition {
	start: { line: number; col: number };
	end: { line: number; col: number };
}

export interface CachedReference {
	link: string;
	original: string;
	position: ReferencePosition;
}

export interface DuplicateReferenceVault {
	getMarkdownFiles(): Array<{ path: string }>;
	getReferences(_note: { path: string }): CachedReference[];
	resolvesTo(_link: string, _sourcePath: string): string | undefined;
	linktextFor(_targetPath: string, _sourcePath: string): string;
	read(_note: { path: string }): Promise<string>;
	modify(_note: { path: string }, _content: string): Promise<void>;
}

export async function replaceDuplicateReferences(
	vault: DuplicateReferenceVault,
	sourcePath: string,
	targetPath: string
): Promise<void> {
	await Promise.all(
		vault.getMarkdownFiles().map(async (note) => {
			let content = await vault.read(note);
			const references = vault
				.getReferences(note)
				.filter(
					(reference) =>
						vault.resolvesTo(reference.link, note.path) ===
						sourcePath
				)
				.sort(
					(left, right) =>
						positionToOffset(right.position.start, content) -
						positionToOffset(left.position.start, content)
				);
			if (references.length === 0) {
				return;
			}

			for (const reference of references) {
				const start = positionToOffset(
					reference.position.start,
					content
				);
				const end = positionToOffset(reference.position.end, content);
				if (content.slice(start, end) !== reference.original) {
					continue;
				}
				const replacement = reference.original.replace(
					reference.link,
					vault.linktextFor(targetPath, note.path)
				);
				content =
					content.slice(0, start) + replacement + content.slice(end);
			}
			await vault.modify(note, content);
		})
	);
}

function positionToOffset(
	position: { line: number; col: number },
	content: string
): number {
	let offset = 0;
	for (let line = 0; line < position.line; line++) {
		const newline = content.indexOf('\n', offset);
		if (newline === -1) {
			return content.length;
		}
		offset = newline + 1;
	}
	return offset + position.col;
}
