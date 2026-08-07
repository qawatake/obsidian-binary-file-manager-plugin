import assert from 'node:assert/strict';
import test from 'node:test';
import { collisionFileName } from '../src/Filename';
import { normalizeWatchedFolders } from '../src/Settings';

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
