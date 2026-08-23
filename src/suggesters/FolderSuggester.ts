// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes/blob/c8b1040f9d84ec8f4b8eae4782b23c2c6bf14e0e/src/ui/file-suggest.ts
import {
	AbstractInputSuggest,
	type App,
	type TAbstractFile,
	TFolder,
} from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(
		app: App,
		private inputEl: HTMLInputElement
	) {
		super(app, inputEl);
	}

	getSuggestions(inputStr: string): TFolder[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const folders: TFolder[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((folder: TAbstractFile) => {
			if (
				folder instanceof TFolder &&
				folder.path.toLowerCase().contains(lowerCaseInputStr)
			) {
				folders.push(folder);
			}
		});

		return folders;
	}

	renderSuggestion(file: TFolder, el: HTMLElement): void {
		el.setText(file.path);
	}

	override selectSuggestion(file: TFolder): void {
		this.setValue(file.path);
		this.inputEl.trigger('input');
		this.close();
	}
}
