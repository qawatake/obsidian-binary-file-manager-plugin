// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes/blob/c8b1040f9d84ec8f4b8eae4782b23c2c6bf14e0e/src/ui/file-suggest.ts
import {
	AbstractInputSuggest,
	type App,
	type TAbstractFile,
	TFile,
} from 'obsidian';

export class FileSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		app: App,
		private inputEl: HTMLInputElement
	) {
		super(app, inputEl);
	}

	getSuggestions(inputStr: string): TFile[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const files: TFile[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((file: TAbstractFile) => {
			if (
				file instanceof TFile &&
				file.extension === 'md' &&
				file.path.toLowerCase().contains(lowerCaseInputStr)
			) {
				files.push(file);
			}
		});

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	override selectSuggestion(file: TFile): void {
		this.setValue(file.path);
		this.inputEl.trigger('input');
		this.close();
	}
}
