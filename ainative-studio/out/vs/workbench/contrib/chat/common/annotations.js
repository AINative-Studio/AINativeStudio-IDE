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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9hbm5vdGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQXdFLG9CQUFvQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFHckosTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLDJCQUEyQixDQUFDLENBQUMsNEJBQTRCO0FBRXRGLE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxRQUFnRDtJQUM5RixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFFbEIsTUFBTSxNQUFNLEdBQTZDLEVBQUUsQ0FBQztJQUM1RCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzdCLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxZQUFZLENBQUMsQ0FBQztRQUNwRSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssaUJBQWlCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLEtBQUssR0FBdUIsSUFBSSxDQUFDLElBQUksQ0FBQztZ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