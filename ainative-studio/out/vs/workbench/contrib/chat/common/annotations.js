/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { appendMarkdownString, canMergeMarkdownStrings } from './chatModel.js';
export const contentRefUrl = 'http://_vscodecontentref_'; // must be lowercase for URI
export function annotateSpecialMarkdownContent(response) {
    let refIdPool = 0;
    const result = [];
    for (const item of response) {
        const previousItem = result.filter(p => p.kind !== 'textEditGroup').at(-1);
        const previousItemIndex = result.findIndex(p => p === previousItem);
        if (item.kind === 'inlineReference') {
            let label = item.name;
            if (!label) {
                if (URI.isUri(item.inlineReference)) {
                    label = basename(item.inlineReference);
                }
                else if ('name' in item.inlineReference) {
                    label = item.inlineReference.name;
                }
                else {
                    label = basename(item.inlineReference.uri);
                }
            }
            const refId = refIdPool++;
            const printUri = URI.parse(contentRefUrl).with({ path: String(refId) });
            const markdownText = `[${label}](${printUri.toString()})`;
            const annotationMetadata = { [refId]: item };
            if (previousItem?.kind === 'markdownContent') {
                const merged = appendMarkdownString(previousItem.content, new MarkdownString(markdownText));
                result[previousItemIndex] = { ...previousItem, content: merged, inlineReferences: { ...annotationMetadata, ...(previousItem.inlineReferences || {}) } };
            }
            else {
                result.push({ content: new MarkdownString(markdownText), inlineReferences: annotationMetadata, kind: 'markdownContent' });
            }
        }
        else if (item.kind === 'markdownContent' && previousItem?.kind === 'markdownContent' && canMergeMarkdownStrings(previousItem.content, item.content)) {
            const merged = appendMarkdownString(previousItem.content, item.content);
            result[previousItemIndex] = { ...previousItem, content: merged };
        }
        else if (item.kind === 'markdownVuln') {
            const vulnText = encodeURIComponent(JSON.stringify(item.vulnerabilities));
            const markdownText = `<vscode_annotation details='${vulnText}'>${item.content.value}</vscode_annotation>`;
            if (previousItem?.kind === 'markdownContent') {
                // Since this is inside a codeblock, it needs to be merged into the previous markdown content.
                const merged = appendMarkdownString(previousItem.content, new MarkdownString(markdownText));
                result[previousItemIndex] = { ...previousItem, content: merged };
            }
            else {
                result.push({ content: new MarkdownString(markdownText), kind: 'markdownContent' });
            }
        }
        else if (item.kind === 'codeblockUri') {
            if (previousItem?.kind === 'markdownContent') {
                const isEditText = item.isEdit ? ` isEdit` : '';
                const markdownText = `<vscode_codeblock_uri${isEditText}>${item.uri.toString()}</vscode_codeblock_uri>`;
                const merged = appendMarkdownString(previousItem.content, new MarkdownString(markdownText));
                result[previousItemIndex] = { ...previousItem, content: merged };
            }
        }
        else {
            result.push(item);
        }
    }
    return result;
}
export function annotateVulnerabilitiesInText(response) {
    const result = [];
    for (const item of response) {
        const previousItem = result[result.length - 1];
        if (item.kind === 'markdownContent') {
            if (previousItem?.kind === 'markdownContent') {
                result[result.length - 1] = { content: new MarkdownString(previousItem.content.value + item.content.value, { isTrusted: previousItem.content.isTrusted }), kind: 'markdownContent' };
            }
            else {
                result.push(item);
            }
        }
        else if (item.kind === 'markdownVuln') {
            const vulnText = encodeURIComponent(JSON.stringify(item.vulnerabilities));
            const markdownText = `<vscode_annotation details='${vulnText}'>${item.content.value}</vscode_annotation>`;
            if (previousItem?.kind === 'markdownContent') {
                result[result.length - 1] = { content: new MarkdownString(previousItem.content.value + markdownText, { isTrusted: previousItem.content.isTrusted }), kind: 'markdownContent' };
            }
            else {
                result.push({ content: new MarkdownString(markdownText), kind: 'markdownContent' });
            }
        }
    }
    return result;
}
export function extractCodeblockUrisFromText(text) {
    const match = /<vscode_codeblock_uri( isEdit)?>(.*?)<\/vscode_codeblock_uri>/ms.exec(text);
    if (match) {
        const [all, isEdit, uriString] = match;
        if (uriString) {
            const result = URI.parse(uriString);
            const textWithoutResult = text.substring(0, match.index) + text.substring(match.index + all.length);
            return { uri: result, textWithoutResult, isEdit: !!isEdit };
        }
    }
    return undefined;
}
export function extractVulnerabilitiesFromText(text) {
    const vulnerabilities = [];
    let newText = text;
    let match;
    while ((match = /<vscode_annotation details='(.*?)'>(.*?)<\/vscode_annotation>/ms.exec(newText)) !== null) {
        const [full, details, content] = match;
        const start = match.index;
        const textBefore = newText.substring(0, start);
        const linesBefore = textBefore.split('\n').length - 1;
        const linesInside = content.split('\n').length - 1;
        const previousNewlineIdx = textBefore.lastIndexOf('\n');
        const startColumn = start - (previousNewlineIdx + 1) + 1;
        const endPreviousNewlineIdx = (textBefore + content).lastIndexOf('\n');
        const endColumn = start + content.length - (endPreviousNewlineIdx + 1) + 1;
        try {
            const vulnDetails = JSON.parse(decodeURIComponent(details));
            vulnDetails.forEach(({ title, description }) => vulnerabilities.push({
                title, description, range: { startLineNumber: linesBefore + 1, startColumn, endLineNumber: linesBefore + linesInside + 1, endColumn }
            }));
        }
        catch (err) {
            // Something went wrong with encoding this text, just ignore it
        }
        newText = newText.substring(0, start) + content + newText.substring(start + full.length);
    }
    return { newText, vulnerabilities };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vYW5ub3RhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUF3RSxvQkFBb0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBR3JKLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRywyQkFBMkIsQ0FBQyxDQUFDLDRCQUE0QjtBQUV0RixNQUFNLFVBQVUsOEJBQThCLENBQUMsUUFBZ0Q7SUFDOUYsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRWxCLE1BQU0sTUFBTSxHQUE2QyxFQUFFLENBQUM7SUFDNUQsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUM3QixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssWUFBWSxDQUFDLENBQUM7UUFDcEUsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDckMsSUFBSSxLQUFLLEdBQXVCLElBQUksQ0FBQyxJQUFJLENBQUM7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