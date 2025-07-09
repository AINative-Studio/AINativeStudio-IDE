/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { FoldingRegions, MAX_LINE_NUMBER } from './foldingRanges.js';
const foldingContext = {};
const ID_SYNTAX_PROVIDER = 'syntax';
export class SyntaxRangeProvider {
    constructor(editorModel, providers, handleFoldingRangesChange, foldingRangesLimit, fallbackRangeProvider // used when all providers return null
    ) {
        this.editorModel = editorModel;
        this.providers = providers;
        this.handleFoldingRangesChange = handleFoldingRangesChange;
        this.foldingRangesLimit = foldingRangesLimit;
        this.fallbackRangeProvider = fallbackRangeProvider;
        this.id = ID_SYNTAX_PROVIDER;
        this.disposables = new DisposableStore();
        if (fallbackRangeProvider) {
            this.disposables.add(fallbackRangeProvider);
        }
        for (const provider of providers) {
            if (typeof provider.onDidChange === 'function') {
                this.disposables.add(provider.onDidChange(handleFoldingRangesChange));
            }
        }
    }
    compute(cancellationToken) {
        return collectSyntaxRanges(this.providers, this.editorModel, cancellationToken).then(ranges => {
            if (this.editorModel.isDisposed()) {
                return null;
            }
            if (ranges) {
                const res = sanitizeRanges(ranges, this.foldingRangesLimit);
                return res;
            }
            return this.fallbackRangeProvider?.compute(cancellationToken) ?? null;
        });
    }
    dispose() {
        this.disposables.dispose();
    }
}
function collectSyntaxRanges(providers, model, cancellationToken) {
    let rangeData = null;
    const promises = providers.map((provider, i) => {
        return Promise.resolve(provider.provideFoldingRanges(model, foldingContext, cancellationToken)).then(ranges => {
            if (cancellationToken.isCancellationRequested) {
                return;
            }
            if (Array.isArray(ranges)) {
                if (!Array.isArray(rangeData)) {
                    rangeData = [];
                }
                const nLines = model.getLineCount();
                for (const r of ranges) {
                    if (r.start > 0 && r.end > r.start && r.end <= nLines) {
                        rangeData.push({ start: r.start, end: r.end, rank: i, kind: r.kind });
                    }
                }
            }
        }, onUnexpectedExternalError);
    });
    return Promise.all(promises).then(_ => {
        return rangeData;
    });
}
class RangesCollector {
    constructor(foldingRangesLimit) {
        this._startIndexes = [];
        this._endIndexes = [];
        this._nestingLevels = [];
        this._nestingLevelCounts = [];
        this._types = [];
        this._length = 0;
        this._foldingRangesLimit = foldingRangesLimit;
    }
    add(startLineNumber, endLineNumber, type, nestingLevel) {
        if (startLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
            return;
        }
        const index = this._length;
        this._startIndexes[index] = startLineNumber;
        this._endIndexes[index] = endLineNumber;
        this._nestingLevels[index] = nestingLevel;
        this._types[index] = type;
        this._length++;
        if (nestingLevel < 30) {
            this._nestingLevelCounts[nestingLevel] = (this._nestingLevelCounts[nestingLevel] || 0) + 1;
        }
    }
    toIndentRanges() {
        const limit = this._foldingRangesLimit.limit;
        if (this._length <= limit) {
            this._foldingRangesLimit.update(this._length, false);
            const startIndexes = new Uint32Array(this._length);
            const endIndexes = new Uint32Array(this._length);
            for (let i = 0; i < this._length; i++) {
                startIndexes[i] = this._startIndexes[i];
                endIndexes[i] = this._endIndexes[i];
            }
            return new FoldingRegions(startIndexes, endIndexes, this._types);
        }
        else {
            this._foldingRangesLimit.update(this._length, limit);
            let entries = 0;
            let maxLevel = this._nestingLevelCounts.length;
            for (let i = 0; i < this._nestingLevelCounts.length; i++) {
                const n = this._nestingLevelCounts[i];
                if (n) {
                    if (n + entries > limit) {
                        maxLevel = i;
                        break;
                    }
                    entries += n;
                }
            }
            const startIndexes = new Uint32Array(limit);
            const endIndexes = new Uint32Array(limit);
            const types = [];
            for (let i = 0, k = 0; i < this._length; i++) {
                const level = this._nestingLevels[i];
                if (level < maxLevel || (level === maxLevel && entries++ < limit)) {
                    startIndexes[k] = this._startIndexes[i];
                    endIndexes[k] = this._endIndexes[i];
                    types[k] = this._types[i];
                    k++;
                }
            }
            return new FoldingRegions(startIndexes, endIndexes, types);
        }
    }
}
export function sanitizeRanges(rangeData, foldingRangesLimit) {
    const sorted = rangeData.sort((d1, d2) => {
        let diff = d1.start - d2.start;
        if (diff === 0) {
            diff = d1.rank - d2.rank;
        }
        return diff;
    });
    const collector = new RangesCollector(foldingRangesLimit);
    let top = undefined;
    const previous = [];
    for (const entry of sorted) {
        if (!top) {
            top = entry;
            collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
        }
        else {
            if (entry.start > top.start) {
                if (entry.end <= top.end) {
                    previous.push(top);
                    top = entry;
                    collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
                }
                else {
                    if (entry.start > top.end) {
                        do {
                            top = previous.pop();
                        } while (top && entry.start > top.end);
                        if (top) {
                            previous.push(top);
                        }
                        top = entry;
                    }
                    collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
                }
            }
        }
    }
    return collector.toIndentRanges();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGF4UmFuZ2VQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvc3ludGF4UmFuZ2VQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQU1yRSxNQUFNLGNBQWMsR0FBbUIsRUFDdEMsQ0FBQztBQUVGLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDO0FBRXBDLE1BQU0sT0FBTyxtQkFBbUI7SUFNL0IsWUFDa0IsV0FBdUIsRUFDdkIsU0FBaUMsRUFDekMseUJBQXFDLEVBQzdCLGtCQUF3QyxFQUN4QyxxQkFBZ0QsQ0FBQyxzQ0FBc0M7O1FBSnZGLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBQ3ZCLGNBQVMsR0FBVCxTQUFTLENBQXdCO1FBQ3pDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBWTtRQUM3Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXNCO1FBQ3hDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBMkI7UUFUekQsT0FBRSxHQUFHLGtCQUFrQixDQUFDO1FBV2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUN6QyxJQUFJLHFCQUFxQixFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNsQyxJQUFJLE9BQU8sUUFBUSxDQUFDLFdBQVcsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7WUFDdkUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLGlCQUFvQztRQUMzQyxPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM3RixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUM1RCxPQUFPLEdBQUcsQ0FBQztZQUNaLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxJQUFJLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxTQUFpQyxFQUFFLEtBQWlCLEVBQUUsaUJBQW9DO0lBQ3RILElBQUksU0FBUyxHQUErQixJQUFJLENBQUM7SUFDakQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM5QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUM3RyxJQUFJLGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQy9DLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQy9CLFNBQVMsR0FBRyxFQUFFLENBQUM7Z0JBQ2hCLENBQUM7Z0JBQ0QsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNwQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUN2RCxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQ3ZFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDckMsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxlQUFlO0lBU3BCLFlBQVksa0JBQXdDO1FBQ25ELElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDO0lBQy9DLENBQUM7SUFFTSxHQUFHLENBQUMsZUFBdUIsRUFBRSxhQUFxQixFQUFFLElBQXdCLEVBQUUsWUFBb0I7UUFDeEcsSUFBSSxlQUFlLEdBQUcsZUFBZSxJQUFJLGFBQWEsR0FBRyxlQUFlLEVBQUUsQ0FBQztZQUMxRSxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxlQUFlLENBQUM7UUFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxhQUFhLENBQUM7UUFDeEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsR0FBRyxZQUFZLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsSUFBSSxZQUFZLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1RixDQUFDO0lBQ0YsQ0FBQztJQUVNLGNBQWM7UUFDcEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQztRQUM3QyxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksS0FBSyxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRXJELE1BQU0sWUFBWSxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLENBQUM7WUFDRCxPQUFPLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRXJELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztZQUNoQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDO1lBQy9DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDUCxJQUFJLENBQUMsR0FBRyxPQUFPLEdBQUcsS0FBSyxFQUFFLENBQUM7d0JBQ3pCLFFBQVEsR0FBRyxDQUFDLENBQUM7d0JBQ2IsTUFBTTtvQkFDUCxDQUFDO29CQUNELE9BQU8sSUFBSSxDQUFDLENBQUM7Z0JBQ2QsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxNQUFNLFVBQVUsR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMxQyxNQUFNLEtBQUssR0FBOEIsRUFBRSxDQUFDO1lBQzVDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckMsSUFBSSxLQUFLLEdBQUcsUUFBUSxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNuRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDeEMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxQixDQUFDLEVBQUUsQ0FBQztnQkFDTCxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sSUFBSSxjQUFjLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RCxDQUFDO0lBRUYsQ0FBQztDQUVEO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxTQUE4QixFQUFFLGtCQUF3QztJQUN0RyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO1FBQ3hDLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUMvQixJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDO1FBQzFCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxTQUFTLEdBQUcsSUFBSSxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUUxRCxJQUFJLEdBQUcsR0FBa0MsU0FBUyxDQUFDO0lBQ25ELE1BQU0sUUFBUSxHQUF3QixFQUFFLENBQUM7SUFDekMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixHQUFHLEdBQUcsS0FBSyxDQUFDO1lBQ1osU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUM3QixJQUFJLEtBQUssQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUMxQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNuQixHQUFHLEdBQUcsS0FBSyxDQUFDO29CQUNaLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN4RixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDM0IsR0FBRyxDQUFDOzRCQUNILEdBQUcsR0FBRyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ3RCLENBQUMsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFO3dCQUN2QyxJQUFJLEdBQUcsRUFBRSxDQUFDOzRCQUNULFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3BCLENBQUM7d0JBQ0QsR0FBRyxHQUFHLEtBQUssQ0FBQztvQkFDYixDQUFDO29CQUNELFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN4RixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDbkMsQ0FBQyJ9