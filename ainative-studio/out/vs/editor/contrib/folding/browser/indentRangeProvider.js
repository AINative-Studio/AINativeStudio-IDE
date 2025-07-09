/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { computeIndentLevel } from '../../../common/model/utils.js';
import { FoldingRegions, MAX_LINE_NUMBER } from './foldingRanges.js';
const MAX_FOLDING_REGIONS_FOR_INDENT_DEFAULT = 5000;
const ID_INDENT_PROVIDER = 'indent';
export class IndentRangeProvider {
    constructor(editorModel, languageConfigurationService, foldingRangesLimit) {
        this.editorModel = editorModel;
        this.languageConfigurationService = languageConfigurationService;
        this.foldingRangesLimit = foldingRangesLimit;
        this.id = ID_INDENT_PROVIDER;
    }
    dispose() { }
    compute(cancelationToken) {
        const foldingRules = this.languageConfigurationService.getLanguageConfiguration(this.editorModel.getLanguageId()).foldingRules;
        const offSide = foldingRules && !!foldingRules.offSide;
        const markers = foldingRules && foldingRules.markers;
        return Promise.resolve(computeRanges(this.editorModel, offSide, markers, this.foldingRangesLimit));
    }
}
// public only for testing
export class RangesCollector {
    constructor(foldingRangesLimit) {
        this._startIndexes = [];
        this._endIndexes = [];
        this._indentOccurrences = [];
        this._length = 0;
        this._foldingRangesLimit = foldingRangesLimit;
    }
    insertFirst(startLineNumber, endLineNumber, indent) {
        if (startLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
            return;
        }
        const index = this._length;
        this._startIndexes[index] = startLineNumber;
        this._endIndexes[index] = endLineNumber;
        this._length++;
        if (indent < 1000) {
            this._indentOccurrences[indent] = (this._indentOccurrences[indent] || 0) + 1;
        }
    }
    toIndentRanges(model) {
        const limit = this._foldingRangesLimit.limit;
        if (this._length <= limit) {
            this._foldingRangesLimit.update(this._length, false);
            // reverse and create arrays of the exact length
            const startIndexes = new Uint32Array(this._length);
            const endIndexes = new Uint32Array(this._length);
            for (let i = this._length - 1, k = 0; i >= 0; i--, k++) {
                startIndexes[k] = this._startIndexes[i];
                endIndexes[k] = this._endIndexes[i];
            }
            return new FoldingRegions(startIndexes, endIndexes);
        }
        else {
            this._foldingRangesLimit.update(this._length, limit);
            let entries = 0;
            let maxIndent = this._indentOccurrences.length;
            for (let i = 0; i < this._indentOccurrences.length; i++) {
                const n = this._indentOccurrences[i];
                if (n) {
                    if (n + entries > limit) {
                        maxIndent = i;
                        break;
                    }
                    entries += n;
                }
            }
            const tabSize = model.getOptions().tabSize;
            // reverse and create arrays of the exact length
            const startIndexes = new Uint32Array(limit);
            const endIndexes = new Uint32Array(limit);
            for (let i = this._length - 1, k = 0; i >= 0; i--) {
                const startIndex = this._startIndexes[i];
                const lineContent = model.getLineContent(startIndex);
                const indent = computeIndentLevel(lineContent, tabSize);
                if (indent < maxIndent || (indent === maxIndent && entries++ < limit)) {
                    startIndexes[k] = startIndex;
                    endIndexes[k] = this._endIndexes[i];
                    k++;
                }
            }
            return new FoldingRegions(startIndexes, endIndexes);
        }
    }
}
const foldingRangesLimitDefault = {
    limit: MAX_FOLDING_REGIONS_FOR_INDENT_DEFAULT,
    update: () => { }
};
export function computeRanges(model, offSide, markers, foldingRangesLimit = foldingRangesLimitDefault) {
    const tabSize = model.getOptions().tabSize;
    const result = new RangesCollector(foldingRangesLimit);
    let pattern = undefined;
    if (markers) {
        pattern = new RegExp(`(${markers.start.source})|(?:${markers.end.source})`);
    }
    const previousRegions = [];
    const line = model.getLineCount() + 1;
    previousRegions.push({ indent: -1, endAbove: line, line }); // sentinel, to make sure there's at least one entry
    for (let line = model.getLineCount(); line > 0; line--) {
        const lineContent = model.getLineContent(line);
        const indent = computeIndentLevel(lineContent, tabSize);
        let previous = previousRegions[previousRegions.length - 1];
        if (indent === -1) {
            if (offSide) {
                // for offSide languages, empty lines are associated to the previous block
                // note: the next block is already written to the results, so this only
                // impacts the end position of the block before
                previous.endAbove = line;
            }
            continue; // only whitespace
        }
        let m;
        if (pattern && (m = lineContent.match(pattern))) {
            // folding pattern match
            if (m[1]) { // start pattern match
                // discard all regions until the folding pattern
                let i = previousRegions.length - 1;
                while (i > 0 && previousRegions[i].indent !== -2) {
                    i--;
                }
                if (i > 0) {
                    previousRegions.length = i + 1;
                    previous = previousRegions[i];
                    // new folding range from pattern, includes the end line
                    result.insertFirst(line, previous.line, indent);
                    previous.line = line;
                    previous.indent = indent;
                    previous.endAbove = line;
                    continue;
                }
                else {
                    // no end marker found, treat line as a regular line
                }
            }
            else { // end pattern match
                previousRegions.push({ indent: -2, endAbove: line, line });
                continue;
            }
        }
        if (previous.indent > indent) {
            // discard all regions with larger indent
            do {
                previousRegions.pop();
                previous = previousRegions[previousRegions.length - 1];
            } while (previous.indent > indent);
            // new folding range
            const endLineNumber = previous.endAbove - 1;
            if (endLineNumber - line >= 1) { // needs at east size 1
                result.insertFirst(line, endLineNumber, indent);
            }
        }
        if (previous.indent === indent) {
            previous.endAbove = line;
        }
        else { // previous.indent < indent
            // new region with a bigger indent
            previousRegions.push({ indent, endAbove: line, line });
        }
    }
    return result.toIndentRanges(model);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50UmFuZ2VQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvaW5kZW50UmFuZ2VQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBR3JFLE1BQU0sc0NBQXNDLEdBQUcsSUFBSSxDQUFDO0FBRXBELE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDO0FBRXBDLE1BQU0sT0FBTyxtQkFBbUI7SUFHL0IsWUFDa0IsV0FBdUIsRUFDdkIsNEJBQTJELEVBQzNELGtCQUF3QztRQUZ4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBWTtRQUN2QixpQ0FBNEIsR0FBNUIsNEJBQTRCLENBQStCO1FBQzNELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBc0I7UUFMakQsT0FBRSxHQUFHLGtCQUFrQixDQUFDO0lBTTdCLENBQUM7SUFFTCxPQUFPLEtBQUssQ0FBQztJQUViLE9BQU8sQ0FBQyxnQkFBbUM7UUFDMUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUM7UUFDL0gsTUFBTSxPQUFPLEdBQUcsWUFBWSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO1FBQ3ZELE1BQU0sT0FBTyxHQUFHLFlBQVksSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDO1FBQ3JELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxD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