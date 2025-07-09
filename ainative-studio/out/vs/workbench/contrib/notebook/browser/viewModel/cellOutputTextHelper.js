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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dFRleHRIZWxwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvY2VsbE91dHB1dFRleHRIZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFrQixnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBU2xGLE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxRQUEyQixFQUFFLFFBQXdCLEVBQUUsY0FBdUIsS0FBSztJQUNwSCxNQUFNLFVBQVUsR0FBYSxFQUFFLENBQUM7SUFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM1RCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDMUMsSUFBSSxNQUFNLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBRTlFLElBQUksQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLFVBQVUs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