/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LcsDiff } from '../../../../../base/common/diff/diff.js';
import { getLeadingWhitespace } from '../../../../../base/common/strings.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { GhostText, GhostTextPart } from './ghostText.js';
import { singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
/**
 * @param previewSuffixLength Sets where to split `inlineCompletion.text`.
 * 	If the text is `hello` and the suffix length is 2, the non-preview part is `hel` and the preview-part is `lo`.
*/
export function computeGhostText(edit, model, mode, cursorPosition, previewSuffixLength = 0) {
    let e = singleTextRemoveCommonPrefix(edit, model);
    if (e.range.endLineNumber !== e.range.startLineNumber) {
        // This edit might span multiple lines, but the first lines must be a common prefix.
        return undefined;
    }
    const sourceLine = model.getLineContent(e.range.startLineNumber);
    const sourceIndentationLength = getLeadingWhitespace(sourceLine).length;
    const suggestionTouchesIndentation = e.range.startColumn - 1 <= sourceIndentationLength;
    if (suggestionTouchesIndentation) {
        // source:      ··········[······abc]
        //                         ^^^^^^^^^ inlineCompletion.range
        //              ^^^^^^^^^^ ^^^^^^ sourceIndentationLength
        //                         ^^^^^^ replacedIndentation.length
        //                               ^^^ rangeThatDoesNotReplaceIndentation
        // inlineCompletion.text: '··foo'
        //                         ^^ suggestionAddedIndentationLength
        const suggestionAddedIndentationLength = getLeadingWhitespace(e.text).length;
        const replacedIndentation = sourceLine.substring(e.range.startColumn - 1, sourceIndentationLength);
        const [startPosition, endPosition] = [e.range.getStartPosition(), e.range.getEndPosition()];
        const newStartPosition = startPosition.column + replacedIndentation.length <= endPosition.column
            ? startPosition.delta(0, replacedIndentation.length)
            : endPosition;
        const rangeThatDoesNotReplaceIndentation = Range.fromPositions(newStartPosition, endPosition);
        const suggestionWithoutIndentationChange = e.text.startsWith(replacedIndentation)
            // Adds more indentation without changing existing indentation: We can add ghost text for this
            ? e.text.substring(replacedIndentation.length)
            // Changes or removes existing indentation. Only add ghost text for the non-indentation part.
            : e.text.substring(suggestionAddedIndentationLength);
        e = new SingleTextEdit(rangeThatDoesNotReplaceIndentation, suggestionWithoutIndentationChange);
    }
    // This is a single line string
    const valueToBeReplaced = model.getValueInRange(e.range);
    const changes = cachingDiff(valueToBeReplaced, e.text);
    if (!changes) {
        // No ghost text in case the diff would be too slow to compute
        return undefined;
    }
    const lineNumber = e.range.startLineNumber;
    const parts = new Array();
    if (mode === 'prefix') {
        const filteredChanges = changes.filter(c => c.originalLength === 0);
        if (filteredChanges.length > 1 || filteredChanges.length === 1 && filteredChanges[0].originalStart !== valueToBeReplaced.length) {
            // Prefixes only have a single change.
            return undefined;
        }
    }
    const previewStartInCompletionText = e.text.length - previewSuffixLength;
    for (const c of changes) {
        const insertColumn = e.range.startColumn + c.originalStart + c.originalLength;
        if (mode === 'subwordSmart' && cursorPosition && cursorPosition.lineNumber === e.range.startLineNumber && insertColumn < cursorPosition.column) {
            // No ghost text before cursor
            return undefined;
        }
        if (c.originalLength > 0) {
            return undefined;
        }
        if (c.modifiedLength === 0) {
            continue;
        }
        const modifiedEnd = c.modifiedStart + c.modifiedLength;
        const nonPreviewTextEnd = Math.max(c.modifiedStart, Math.min(modifiedEnd, previewStartInCompletionText));
        const nonPreviewText = e.text.substring(c.modifiedStart, nonPreviewTextEnd);
        const italicText = e.text.substring(nonPreviewTextEnd, Math.max(c.modifiedStart, modifiedEnd));
        if (nonPreviewText.length > 0) {
            parts.push(new GhostTextPart(insertColumn, nonPreviewText, false));
        }
        if (italicText.length > 0) {
            parts.push(new GhostTextPart(insertColumn, italicText, true));
        }
    }
    return new GhostText(lineNumber, parts);
}
let lastRequest = undefined;
function cachingDiff(originalValue, newValue) {
    if (lastRequest?.originalValue === originalValue && lastRequest?.newValue === newValue) {
        return lastRequest?.changes;
    }
    else {
        let changes = smartDiff(originalValue, newValue, true);
        if (changes) {
            const deletedChars = deletedCharacters(changes);
            if (deletedChars > 0) {
                // For performance reasons, don't compute diff if there is nothing to improve
                const newChanges = smartDiff(originalValue, newValue, false);
                if (newChanges && deletedCharacters(newChanges) < deletedChars) {
                    // Disabling smartness seems to be better here
                    changes = newChanges;
                }
            }
        }
        lastRequest = {
            originalValue,
            newValue,
            changes
        };
        return changes;
    }
}
function deletedCharacters(changes) {
    let sum = 0;
    for (const c of changes) {
        sum += c.originalLength;
    }
    return sum;
}
/**
 * When matching `if ()` with `if (f() = 1) { g(); }`,
 * align it like this:        `if (       )`
 * Not like this:			  `if (  )`
 * Also not like this:		  `if (             )`.
 *
 * The parenthesis are preprocessed to ensure that they match correctly.
 */
export function smartDiff(originalValue, newValue, smartBracketMatching) {
    if (originalValue.length > 5000 || newValue.length > 5000) {
        // We don't want to work on strings that are too big
        return undefined;
    }
    function getMaxCharCode(val) {
        let maxCharCode = 0;
        for (let i = 0, len = val.length; i < len; i++) {
            const charCode = val.charCodeAt(i);
            if (charCode > maxCharCode) {
                maxCharCode = charCode;
            }
        }
        return maxCharCode;
    }
    const maxCharCode = Math.max(getMaxCharCode(originalValue), getMaxCharCode(newValue));
    function getUniqueCharCode(id) {
        if (id < 0) {
            throw new Error('unexpected');
        }
        return maxCharCode + id + 1;
    }
    function getElements(source) {
        let level = 0;
        let group = 0;
        const characters = new Int32Array(source.length);
        for (let i = 0, len = source.length; i < len; i++) {
            // TODO support more brackets
            if (smartBracketMatching && source[i] === '(') {
                const id = group * 100 + level;
                characters[i] = getUniqueCharCode(2 * id);
                level++;
            }
            else if (smartBracketMatching && source[i] === ')') {
                level = Math.max(level - 1, 0);
                const id = group * 100 + level;
                characters[i] = getUniqueCharCode(2 * id + 1);
                if (level === 0) {
                    group++;
                }
            }
            else {
                characters[i] = source.charCodeAt(i);
            }
        }
        return characters;
    }
    const elements1 = getElements(originalValue);
    const elements2 = getElements(newValue);
    return new LcsDiff({ getElements: () => elements1 }, { getElements: () => elements2 }).ComputeDiff(false).changes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZUdob3N0VGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2NvbXB1dGVHaG9zdFRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUUxRTs7O0VBR0U7QUFDRixNQUFNLFVBQVUsZ0JBQWdCLENBQy9CLElBQW9CLEVBQ3BCLEtBQWlCLEVBQ2pCLElBQTJDLEVBQzNDLGNBQXlCLEVBQ3pCLG1CQUFtQixHQUFHLENBQUM7SUFFdkIsSUFBSSxDQUFDLEdBQUcsNEJBQTRCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRWxELElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN2RCxvRkFBb0Y7UUFDcEYsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNqRSxNQUFNLHVCQUF1QixHQUFHLG9C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