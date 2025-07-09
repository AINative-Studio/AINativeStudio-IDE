/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { InvalidBracketAstNode, ListAstNode, PairAstNode, TextAstNode } from './ast.js';
import { BeforeEditPositionMapper } from './beforeEditPositionMapper.js';
import { SmallImmutableSet } from './smallImmutableSet.js';
import { lengthIsZero, lengthLessThan } from './length.js';
import { concat23Trees, concat23TreesOfSameHeight } from './concat23Trees.js';
import { NodeReader } from './nodeReader.js';
/**
 * Non incrementally built ASTs are immutable.
*/
export function parseDocument(tokenizer, edits, oldNode, createImmutableLists) {
    const parser = new Parser(tokenizer, edits, oldNode, createImmutableLists);
    return parser.parseDocument();
}
/**
 * Non incrementally built ASTs are immutable.
*/
class Parser {
    /**
     * Reports how many nodes were constructed in the last parse operation.
    */
    get nodesConstructed() {
        return this._itemsConstructed;
    }
    /**
     * Reports how many nodes were reused in the last parse operation.
    */
    get nodesReused() {
        return this._itemsFromCache;
    }
    constructor(tokenizer, edits, oldNode, createImmutableLists) {
        this.tokenizer = tokenizer;
        this.createImmutableLists = createImmutableLists;
        this._itemsConstructed = 0;
        this._itemsFromCache = 0;
        if (oldNode && createImmutableLists) {
            throw new Error('Not supported');
        }
        this.oldNodeReader = oldNode ? new NodeReader(oldNode) : undefined;
        this.positionMapper = new BeforeEditPositionMapper(edits);
    }
    parseDocument() {
        this._itemsConstructed = 0;
        this._itemsFromCache = 0;
        let result = this.parseList(SmallImmutableSet.getEmpty(), 0);
        if (!result) {
            result = ListAstNode.getEmpty();
        }
        return result;
    }
    parseList(openedBracketIds, level) {
        const items = [];
        while (true) {
            let child = this.tryReadChildFromCache(openedBracketIds);
            if (!child) {
                const token = this.tokenizer.peek();
                if (!token ||
                    (token.kind === 2 /* TokenKind.ClosingBracket */ &&
                        token.bracketIds.intersects(openedBracketIds))) {
                    break;
                }
                child = this.parseChild(openedBracketIds, level + 1);
            }
            if (child.kind === 4 /* AstNodeKind.List */ && child.childrenLength === 0) {
                continue;
            }
            items.push(child);
        }
        // When there is no oldNodeReader, all items are created from scratch and must have the same height.
        const result = this.oldNodeReader ? concat23Trees(items) : concat23TreesOfSameHeight(items, this.createImmutableLists);
        return result;
    }
    tryReadChildFromCache(openedBracketIds) {
        if (this.oldNodeReader) {
            const maxCacheableLength = this.positionMapper.getDistanceToNextChange(this.tokenizer.offset);
            if (maxCacheableLength === null || !lengthIsZero(maxCacheableLength)) {
                const cachedNode = this.oldNodeReader.readLongestNodeAt(this.positionMapper.getOffsetBeforeChange(this.tokenizer.offset), curNode => {
                    // The edit could extend the ending token, thus we cannot re-use nodes that touch the edit.
                    // If there is no edit anymore, we can re-use the node in any case.
                    if (maxCacheableLength !== null && !lengthLessThan(curNode.length, maxCacheableLength)) {
                        // Either the node contains edited text or touches edited text.
                        // In the latter case, brackets might have been extended (`end` -> `ending`), so even touching nodes cannot be reused.
                        return false;
                    }
                    const canBeReused = curNode.canBeReused(openedBracketIds);
                    return canBeReused;
                });
                if (cachedNode) {
                    this._itemsFromCache++;
                    this.tokenizer.skip(cachedNode.length);
                    return cachedNode;
                }
            }
        }
        return undefined;
    }
    parseChild(openedBracketIds, level) {
        this._itemsConstructed++;
        const token = this.tokenizer.read();
        switch (token.kind) {
            case 2 /* TokenKind.ClosingBracket */:
                return new InvalidBracketAstNode(token.bracketIds, token.length);
            case 0 /* TokenKind.Text */:
                return token.astNode;
            case 1 /* TokenKind.OpeningBracket */: {
                if (level > 300) {
                    // To prevent stack overflows
                    return new TextAstNode(token.length);
                }
                const set = openedBracketIds.merge(token.bracketIds);
                const child = this.parseList(set, level + 1);
                const nextToken = this.tokenizer.peek();
                if (nextToken &&
                    nextToken.kind === 2 /* TokenKind.ClosingBracket */ &&
                    (nextToken.bracketId === token.bracketId || nextToken.bracketIds.intersects(token.bracketIds))) {
                    this.tokenizer.read();
                    return PairAstNode.create(token.astNode, child, nextToken.astNode);
                }
                else {
                    return PairAstNode.create(token.astNode, child, null);
                }
            }
            default:
                throw new Error('unexpected');
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL3BhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXdDLHFCQUFxQixFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzlILE9BQU8sRUFBRSx3QkFBd0IsRUFBZ0IsTUFBTSwrQkFBK0IsQ0FBQztBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRzdDOztFQUVFO0FBQ0YsTUFBTSxVQUFVLGFBQWEsQ0FBQyxTQUFvQixFQUFFLEtBQXFCLEVBQUUsT0FBNEIsRUFBRSxvQkFBNkI7SUFDckksTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUMzRSxPQUFPLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQztBQUMvQixDQUFDO0FBRUQ7O0VBRUU7QUFDRixNQUFNLE1BQU07SUFNWDs7TUFFRTtJQUNGLElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQy9CLENBQUM7SUFFRDs7TUFFRTtJQUNGLElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM3QixDQUFDO0lBRUQsWUFDa0IsU0FBb0IsRUFDckMsS0FBcUIsRUFDckIsT0FBNEIsRUFDWCxvQkFBNkI7UUFIN0IsY0FBUyxHQUFULFNBQVMsQ0FBVztRQUdwQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQVM7UUFyQnZDLHNCQUFpQixHQUFXLENBQUMsQ0FBQztRQUM5QixvQkFBZSxHQUFXLENBQUMsQ0FBQztRQXNCbkMsSUFBSSxPQUFPLElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNuRSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELGFBQWE7UUFDWixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO1FBRXpCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU8sU0FBUyxDQUNoQixnQkFBcUQsRUFDckQsS0FBYTtRQUViLE1BQU0sS0FBSyxHQUFjLEVBQUUsQ0FBQztRQUU1QixPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFFekQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BDLElBQ0MsQ0FBQyxLQUFLO29CQUNOLENBQUMsS0FBSyxDQUFDLElBQUkscUNBQTZCO3dCQUN2QyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQzlDLENBQUM7b0JBQ0YsTUFBTTtnQkFDUCxDQUFDO2dCQUVELEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN0RCxDQUFDO1lBRUQsSUFBSSxLQUFLLENBQUMsSUFBSSw2QkFBcUIsSUFBSSxLQUFLLENBQUMsY0FBYyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNuRSxTQUFTO1lBQ1YsQ0FBQztZQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsQ0FBQztRQUVELG9HQUFvRztRQUNwRyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN2SCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxnQkFBMkM7UUFDeEUsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUYsSUFBSSxrQkFBa0IsS0FBSyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO2dCQUN0RSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBRTtvQkFDbkksMkZBQTJGO29CQUMzRixtRUFBbUU7b0JBQ25FLElBQUksa0JBQWtCLEtBQUssSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDO3dCQUN4RiwrREFBK0Q7d0JBQy9ELHNIQUFzSDt3QkFDdEgsT0FBTyxLQUFLLENBQUM7b0JBQ2QsQ0FBQztvQkFDRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7b0JBQzFELE9BQU8sV0FBVyxDQUFDO2dCQUNwQixDQUFDLENBQUMsQ0FBQztnQkFFSCxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDdkMsT0FBTyxVQUFVLENBQUM7Z0JBQ25CLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFTyxVQUFVLENBQ2pCLGdCQUEyQyxFQUMzQyxLQUFhO1FBRWIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUcsQ0FBQztRQUVyQyxRQUFRLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQjtnQkFDQyxPQUFPLElBQUkscUJBQXFCLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbEU7Z0JBQ0MsT0FBTyxLQUFLLENBQUMsT0FBc0IsQ0FBQztZQUVyQyxxQ0FBNkIsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLElBQUksS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDO29CQUNqQiw2QkFBNkI7b0JBQzdCLE9BQU8sSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0QyxDQUFDO2dCQUVELE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFFN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDeEMsSUFDQyxTQUFTO29CQUNULFNBQVMsQ0FBQyxJQUFJLHFDQUE2QjtvQkFDM0MsQ0FBQyxTQUFTLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQzdGLENBQUM7b0JBQ0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDdEIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUN4QixLQUFLLENBQUMsT0FBeUIsRUFDL0IsS0FBSyxFQUNMLFNBQVMsQ0FBQyxPQUF5QixDQUNuQyxDQUFDO2dCQUNILENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQ3hCLEtBQUssQ0FBQyxPQUF5QixFQUMvQixLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUM7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7WUFDRDtnQkFDQyxNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==