/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isTextStreamMime } from '../../common/notebookCommon.js';
export function getAllOutputsText(notebook, viewCell, shortErrors = false) {
    const outputText = [];
    for (let i = 0; i < viewCell.outputsViewModels.length; i++) {
        const outputViewModel = viewCell.outputsViewModels[i];
        const outputTextModel = viewCell.model.outputs[i];
        const [mimeTypes, pick] = outputViewModel.resolveMimeTypes(notebook, undefined);
        const mimeType = mimeTypes[pick].mimeType;
        let buffer = outputTextModel.outputs.find(output => output.mime === mimeType);
        if (!buffer || mimeType.startsWith('image')) {
            buffer = outputTextModel.outputs.find(output => !output.mime.startsWith('image'));
        }
        if (!buffer) {
            continue;
        }
        let text = '';
        if (isTextStreamMime(mimeType)) {
            const { text: stream, count } = getOutputStreamText(outputViewModel);
            text = stream;
            if (count > 1) {
                i += count - 1;
            }
        }
        else {
            text = getOutputText(mimeType, buffer, shortErrors);
        }
        outputText.push(text);
    }
    let outputContent;
    if (outputText.length > 1) {
        outputContent = outputText.map((output, i) => {
            return `Cell output ${i + 1} of ${outputText.length}\n${output}`;
        }).join('\n');
    }
    else {
        outputContent = outputText[0] ?? '';
    }
    return outputContent;
}
export function getOutputStreamText(output) {
    let text = '';
    const cellViewModel = output.cellViewModel;
    let index = cellViewModel.outputsViewModels.indexOf(output);
    let count = 0;
    while (index < cellViewModel.model.outputs.length) {
        const nextCellOutput = cellViewModel.model.outputs[index];
        const nextOutput = nextCellOutput.outputs.find(output => isTextStreamMime(output.mime));
        if (!nextOutput) {
            break;
        }
        text = text + decoder.decode(nextOutput.data.buffer);
        index = index + 1;
        count++;
    }
    return { text: text.trim(), count };
}
const decoder = new TextDecoder();
export function getOutputText(mimeType, buffer, shortError = false) {
    let text = `${mimeType}`; // default in case we can't get the text value for some reason.
    const charLimit = 100000;
    text = decoder.decode(buffer.data.slice(0, charLimit).buffer);
    if (buffer.data.byteLength > charLimit) {
        text = text + '...(truncated)';
    }
    else if (mimeType === 'application/vnd.code.notebook.error') {
        text = text.replace(/\\u001b\[[0-9;]*m/gi, '');
        try {
            const error = JSON.parse(text);
            if (!error.stack || shortError) {
                text = `${error.name}: ${error.message}`;
            }
            else {
                text = error.stack;
            }
        }
        catch {
            // just use raw text
        }
    }
    return text.trim();
}
export async function copyCellOutput(mimeType, outputViewModel, clipboardService, logService) {
    const cellOutput = outputViewModel.model;
    const output = mimeType && TEXT_BASED_MIMETYPES.includes(mimeType) ?
        cellOutput.outputs.find(output => output.mime === mimeType) :
        cellOutput.outputs.find(output => TEXT_BASED_MIMETYPES.includes(output.mime));
    mimeType = output?.mime;
    if (!mimeType || !output) {
        return;
    }
    const text = isTextStreamMime(mimeType) ? getOutputStreamText(outputViewModel).text : getOutputText(mimeType, output);
    try {
        await clipboardService.writeText(text);
    }
    catch (e) {
        logService.error(`Failed to copy content: ${e}`);
    }
}
export const TEXT_BASED_MIMETYPES = [
    'text/latex',
    'text/html',
    'application/vnd.code.notebook.error',
    'application/vnd.code.notebook.stdout',
    'application/x.notebook.stdout',
    'application/x.notebook.stream',
    'application/vnd.code.notebook.stderr',
    'application/x.notebook.stderr',
    'text/plain',
    'text/markdown',
    'application/json'
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dFRleHRIZWxwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9jZWxsT3V0cHV0VGV4dEhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQWtCLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFTbEYsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFFBQTJCLEVBQUUsUUFBd0IsRUFBRSxjQUF1QixLQUFLO0lBQ3BILE1BQU0sVUFBVSxHQUFhLEVBQUUsQ0FBQztJQUNoQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDaEYsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUMxQyxJQUFJLE1BQU0sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUM7UUFFOUUsSUFBSSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsVUFBVSxD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