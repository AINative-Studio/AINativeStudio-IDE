import { isWindows } from '../../../../base/common/platform.js';
import { Mimes } from '../../../../base/common/mime.js';
export function getDataToCopy(viewModel, modelSelections, emptySelectionClipboard, copyWithSyntaxHighlighting) {
    const rawTextToCopy = viewModel.getPlainTextToCopy(modelSelections, emptySelectionClipboard, isWindows);
    const newLineCharacter = viewModel.model.getEOL();
    const isFromEmptySelection = (emptySelectionClipboard && modelSelections.length === 1 && modelSelections[0].isEmpty());
    const multicursorText = (Array.isArray(rawTextToCopy) ? rawTextToCopy : null);
    const text = (Array.isArray(rawTextToCopy) ? rawTextToCopy.join(newLineCharacter) : rawTextToCopy);
    let html = undefined;
    let mode = null;
    if (CopyOptions.forceCopyWithSyntaxHighlighting || (copyWithSyntaxHighlighting && text.length < 65536)) {
        const richText = viewModel.getRichTextToCopy(modelSelections, emptySelectionClipboard);
        if (richText) {
            html = richText.html;
            mode = richText.mode;
        }
    }
    const dataToCopy = {
        isFromEmptySelection,
        multicursorText,
        text,
        html,
        mode
    };
    return dataToCopy;
}
/**
 * Every time we write to the clipboard, we record a bit of extra metadata here.
 * Every time we read from the cipboard, if the text matches our last written text,
 * we can fetch the previous metadata.
 */
export class InMemoryClipboardMetadataManager {
    static { this.INSTANCE = new InMemoryClipboardMetadataManager(); }
    constructor() {
        this._lastState = null;
    }
    set(lastCopiedValue, data) {
        this._lastState = { lastCopiedValue, data };
    }
    get(pastedText) {
        if (this._lastState && this._lastState.lastCopiedValue === pastedText) {
            // match!
            return this._lastState.data;
        }
        this._lastState = null;
        return null;
    }
}
export const CopyOptions = {
    forceCopyWithSyntaxHighlighting: false
};
export const ClipboardEventUtils = {
    getTextData(clipboardData) {
        const text = clipboardData.getData(Mimes.text);
        let metadata = null;
        const rawmetadata = clipboardData.getData('vscode-editor-data');
        if (typeof rawmetadata === 'string') {
            try {
                metadata = JSON.parse(rawmetadata);
                if (metadata.version !== 1) {
                    metadata = null;
                }
            }
            catch (err) {
                // no problem!
            }
        }
        if (text.length === 0 && metadata === null && clipboardData.files.length > 0) {
            // no textual data pasted, generate text from file names
            const files = Array.prototype.slice.call(clipboardData.files, 0);
            return [files.map(file => file.name).join('\n'), null];
        }
        return [text, metadata];
    },
    setTextData(clipboardData, text, html, metadata) {
        clipboardData.setData(Mimes.text, text);
        if (typeof html === 'string') {
            clipboardData.setData('text/html', html);
        }
        clipboardData.setData('vscode-editor-data', JSON.stringify(metadata));
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC9jbGlwYm9hcmRVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXhELE1BQU0sVUFBVSxhQUFhLENBQUMsU0FBcUIsRUFBRSxlQUF3QixFQUFFLHVCQUFnQyxFQUFFLDBCQUFtQztJQUNuSixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLHVCQUF1QixFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3hHLE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUVsRCxNQUFNLG9CQUFvQixHQUFHLENBQUMsdUJBQXVCLElBQUksZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDdkgsTUFBTSxlQUFlLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlFLE1BQU0sSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUVuRyxJQUFJLElBQUksR0FBOEIsU0FBUyxDQUFDO0lBQ2hELElB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