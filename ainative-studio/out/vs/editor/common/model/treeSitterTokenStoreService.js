/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
import { TokenQuality, TokenStore } from './tokenStore.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
export const ITreeSitterTokenizationStoreService = createDecorator('treeSitterTokenizationStoreService');
class TreeSitterTokenizationStoreService {
    constructor() {
        this.tokens = new Map();
    }
    setTokens(model, tokens, tokenQuality) {
        const disposables = new DisposableStore();
        const store = disposables.add(new TokenStore(model));
        this.tokens.set(model, { store: store, accurateVersion: model.getVersionId(), disposables, guessVersion: model.getVersionId() });
        store.buildStore(tokens, tokenQuality);
        disposables.add(model.onWillDispose(() => {
            const storeInfo = this.tokens.get(model);
            if (storeInfo) {
                storeInfo.disposables.dispose();
                this.tokens.delete(model);
            }
        }));
    }
    handleContentChanged(model, e) {
        const storeInfo = this.tokens.get(model);
        if (!storeInfo) {
            return;
        }
        storeInfo.guessVersion = e.versionId;
        for (const change of e.changes) {
            if (change.text.length > change.rangeLength) {
                // If possible, use the token before the change as the starting point for the new token.
                // This is more likely to let the new text be the correct color as typeing is usually at the end of the token.
                const offset = change.rangeOffset > 0 ? change.rangeOffset - 1 : change.rangeOffset;
                const oldToken = storeInfo.store.getTokenAt(offset);
                let newToken;
                if (oldToken) {
                    // Insert. Just grow the token at this position to include the insert.
                    newToken = { startOffsetInclusive: oldToken.startOffsetInclusive, length: oldToken.length + change.text.length - change.rangeLength, token: oldToken.token };
                    // Also mark tokens that are in the range of the change as needing a refresh.
                    storeInfo.store.markForRefresh(offset, change.rangeOffset + (change.text.length > change.rangeLength ? change.text.length : change.rangeLength));
                }
                else {
                    // The document got larger and the change is at the end of the document.
                    newToken = { startOffsetInclusive: offset, length: change.text.length, token: 0 };
                }
                storeInfo.store.update(oldToken?.length ?? 0, [newToken], TokenQuality.EditGuess);
            }
            else if (change.text.length < change.rangeLength) {
                // Delete. Delete the tokens at the corresponding range.
                const deletedCharCount = change.rangeLength - change.text.length;
                storeInfo.store.delete(deletedCharCount, change.rangeOffset);
            }
        }
    }
    rangeHasTokens(model, range, minimumTokenQuality) {
        const tokens = this.tokens.get(model);
        if (!tokens) {
            return false;
        }
        return tokens.store.rangeHasTokens(model.getOffsetAt(range.getStartPosition()), model.getOffsetAt(range.getEndPosition()), minimumTokenQuality);
    }
    hasTokens(model, accurateForRange) {
        const tokens = this.tokens.get(model);
        if (!tokens) {
            return false;
        }
        if (!accurateForRange || (tokens.guessVersion === tokens.accurateVersion)) {
            return true;
        }
        return !tokens.store.rangeNeedsRefresh(model.getOffsetAt(accurateForRange.getStartPosition()), model.getOffsetAt(accurateForRange.getEndPosition()));
    }
    getTokens(model, line) {
        const tokens = this.tokens.get(model)?.store;
        if (!tokens) {
            return undefined;
        }
        const lineStartOffset = model.getOffsetAt({ lineNumber: line, column: 1 });
        const lineTokens = tokens.getTokensInRange(lineStartOffset, model.getOffsetAt({ lineNumber: line, column: model.getLineLength(line) }) + 1);
        const result = new Uint32Array(lineTokens.length * 2);
        for (let i = 0; i < lineTokens.length; i++) {
            result[i * 2] = lineTokens[i].startOffsetInclusive - lineStartOffset + lineTokens[i].length;
            result[i * 2 + 1] = lineTokens[i].token;
        }
        return result;
    }
    updateTokens(model, version, updates, tokenQuality) {
        const existingTokens = this.tokens.get(model);
        if (!existingTokens) {
            return;
        }
        existingTokens.accurateVersion = version;
        for (const update of updates) {
            const lastToken = update.newTokens.length > 0 ? update.newTokens[update.newTokens.length - 1] : undefined;
            let oldRangeLength;
            if (lastToken && (existingTokens.guessVersion >= version)) {
                oldRangeLength = lastToken.startOffsetInclusive + lastToken.length - update.newTokens[0].startOffsetInclusive;
            }
            else if (update.oldRangeLength) {
                oldRangeLength = update.oldRangeLength;
            }
            else {
                oldRangeLength = 0;
            }
            existingTokens.store.update(oldRangeLength, update.newTokens, tokenQuality);
        }
    }
    markForRefresh(model, range) {
        const tree = this.tokens.get(model)?.store;
        if (!tree) {
            return;
        }
        tree.markForRefresh(model.getOffsetAt(range.getStartPosition()), model.getOffsetAt(range.getEndPosition()));
    }
    getNeedsRefresh(model) {
        const needsRefreshOffsetRanges = this.tokens.get(model)?.store.getNeedsRefresh();
        if (!needsRefreshOffsetRanges) {
            return [];
        }
        return needsRefreshOffsetRanges.map(range => ({
            range: Range.fromPositions(model.getPositionAt(range.startOffset), model.getPositionAt(range.endOffset)),
            startOffset: range.startOffset,
            endOffset: range.endOffset
        }));
    }
    delete(model) {
        const storeInfo = this.tokens.get(model);
        if (storeInfo) {
            storeInfo.disposables.dispose();
            this.tokens.delete(model);
        }
    }
    dispose() {
        for (const [, value] of this.tokens) {
            value.disposables.dispose();
        }
    }
}
registerSingleton(ITreeSitterTokenizationStoreService, TreeSitterTokenizationStoreService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuU3RvcmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdHJlZVNpdHRlclRva2VuU3RvcmVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBZSxNQUFNLGlCQUFpQixDQUFDO0FBQ3hFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBZ0JqRixNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxlQUFlLENBQXNDLG9DQUFvQyxDQUFDLENBQUM7QUFPOUksTUFBTSxrQ0FBa0M7SUFLdkM7UUFGaUIsV0FBTSxHQUFHLElBQUksR0FBRyxFQUEySCxDQUFDO0lBRTdJLENBQUM7SUFFakIsU0FBUyxDQUFDLEtBQWlCLEVBQUUsTUFBcUIsRUFBRSxZQUEwQjtRQUM3RSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsWUFB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