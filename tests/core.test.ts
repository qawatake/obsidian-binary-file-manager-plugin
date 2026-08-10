import assert from 'node:assert/strict';
import test from 'node:test';
import { collisionFileName } from '../src/Filename';
import { normalizeWatchedFolders, SETTINGS_VERSION } from '../src/Settings';
import { SerialQueue } from '../src/SerialQueue';
import { replaceDuplicateReferences } from '../src/DuplicateReferences';

const watchedFolder = (binaryFilePath: string) => ({
	binaryFilePath,
	attachmentsFilePath: '_attachments',
	folder: 'notes',
	filenameFormat: '{{NAME}}',
	templatePath: '',
	useTemplater: false,
});

test('migrates the legacy primary watched-folder entry out of the list', () => {
	assert.deepEqual(normalizeWatchedFolders('inbox', [watchedFolder('inbox')]), []);
});

test('exports the current persisted settings schema version', () => {
	assert.equal(SETTINGS_VERSION, 2);
});

test('drops stale, blank, and duplicate secondary watched folders', () => {
	assert.deepEqual(
		normalizeWatchedFolders('inbox', [
			watchedFolder('old-inbox'),
			watchedFolder(''),
			watchedFolder('receipts'),
			watchedFolder('/receipts/'),
		]),
		[watchedFolder('receipts')]
	);
});

test('builds collision names that preserve the original filename', () => {
	assert.equal(
		collisionFileName('CONFLICT', 'scan.pdf.md', '2026-08-06-12-00-00-123', 0),
		'CONFLICT-2026-08-06-12-00-00-123-scan.pdf.md'
	);
	assert.equal(
		collisionFileName('CONFLICT', 'scan.pdf.md', '2026-08-06-12-00-00-123', 2),
		'CONFLICT-2026-08-06-12-00-00-123-2-scan.pdf.md'
	);
});

test('serializes queued conversions after a failed conversion', async () => {
	const queue = new SerialQueue();
	const events: string[] = [];
	const failed = queue.enqueue(async () => {
		events.push('first');
		throw new Error('expected failure');
	});
	const succeeded = queue.enqueue(async () => {
		events.push('second');
	});
	await assert.rejects(failed, /expected failure/);
	await succeeded;
	assert.deepEqual(events, ['first', 'second']);
});

test('rewrites mocked vault links before a duplicate source is removed', async () => {
	const note = { path: 'notes/index.md' };
	const writes: string[] = [];
	await replaceDuplicateReferences(
		{
			getMarkdownFiles: () => [note],
			getReferences: () => [
				{
					link: 'inbox/scan.pdf',
					original: '![[inbox/scan.pdf|Scan]]',
					position: {
						start: { line: 0, col: 7 },
						end: { line: 0, col: 31 },
					},
				},
			],
			resolvesTo: () => 'inbox/scan.pdf',
			linktextFor: () => 'attachments/scan.pdf',
			read: async () => 'Asset: ![[inbox/scan.pdf|Scan]]',
			modify: async (_note, content) => writes.push(content),
		},
		'inbox/scan.pdf',
		'attachments/scan.pdf'
	);
	assert.deepEqual(writes, ['Asset: ![[attachments/scan.pdf|Scan]]']);
});
