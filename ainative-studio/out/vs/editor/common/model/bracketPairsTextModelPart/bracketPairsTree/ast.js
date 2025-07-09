/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { CursorColumns } from '../../../core/cursorColumns.js';
import { lengthAdd, lengthGetLineCount, lengthToObj, lengthZero } from './length.js';
import { SmallImmutableSet } from './smallImmutableSet.js';
export var AstNodeKind;
(function (AstNodeKind) {
    AstNodeKind[AstNodeKind["Text"] = 0] = "Text";
    AstNodeKind[AstNodeKind["Bracket"] = 1] = "Bracket";
    AstNodeKind[AstNodeKind["Pair"] = 2] = "Pair";
    AstNodeKind[AstNodeKind["UnexpectedClosingBracket"] = 3] = "UnexpectedClosingBracket";
    AstNodeKind[AstNodeKind["List"] = 4] = "List";
})(AstNodeKind || (AstNodeKind = {}));
/**
 * The base implementation for all AST nodes.
*/
class BaseAstNode {
    /**
     * The length of the entire node, which should equal the sum of lengths of all children.
    */
    get length() {
        return this._length;
    }
    constructor(length) {
        this._length = length;
    }
}
/**
 * Represents a bracket pair including its child (e.g. `{ ... }`).
 * Might be unclosed.
 * Immutable, if all children are immutable.
*/
export class PairAstNode extends BaseAstNode {
    static create(openingBracket, child, closingBracket) {
        let length = openingBracket.length;
        if (child) {
            length = lengthAdd(length, child.length);
        }
        if (closingBracket) {
            length = lengthAdd(length, closingBracket.length);
        }
        return new PairAstNode(length, openingBracket, child, closingBracket, child ? child.missingOpeningBracketIds : SmallImmutableSet.getEmpty());
    }
    get kind() {
        return 2 /* AstNodeKind.Pair */;
    }
    get listHeight() {
        return 0;
    }
    get childrenLength() {
        return 3;
    }
    getChild(idx) {
        switch (idx) {
            case 0: return this.openingBracket;
            case 1: return this.child;
            case 2: return this.closingBracket;
        }
        throw new Error('Invalid child index');
    }
    /**
     * Avoid using this property, it allocates an array!
    */
    get children() {
        const result = [];
        result.push(this.openingBracket);
        if (this.child) {
            result.push(this.child);
        }
        if (this.closingBracket) {
            result.push(this.closingBracket);
        }
        return result;
    }
    constructor(length, openingBracket, child, closingBracket, missingOpeningBracketIds) {
        super(length);
        this.openingBracket = openingBracket;
        this.child = child;
        this.closingBracket = closingBracket;
        this.missingOpeningBracketIds = missingOpeningBracketIds;
    }
    canBeReused(openBracketIds) {
        if (this.closingBracket === null) {
            // Unclosed pair ast nodes only
            // end at the end of the document
            // or when a parent node is closed.
            // This could be improved:
            // Only return false if some next token is neither "undefined" nor a bracket that closes a parent.
            return false;
        }
        if (openBracketIds.intersects(this.missingOpeningBracketIds)) {
            return false;
        }
        return true;
    }
    flattenLists() {
        return PairAstNode.create(this.openingBracket.flattenLists(), this.child && this.child.flattenLists(), this.closingBracket && this.closingBracket.flattenLists());
    }
    deepClone() {
        return new PairAstNode(this.length, this.openingBracket.deepClone(), this.child && this.child.deepClone(), this.closingBracket && this.closingBracket.deepClone(), this.missingOpeningBracketIds);
    }
    computeMinIndentation(offset, textModel) {
        return this.child ? this.child.computeMinIndentation(lengthAdd(offset, this.openingBracket.length), textModel) : Number.MAX_SAFE_INTEGER;
    }
}
export class ListAstNode extends BaseAstNode {
    /**
     * This method uses more memory-efficient list nodes that can only store 2 or 3 children.
    */
    static create23(item1, item2, item3, immutable = false) {
        let length = item1.length;
        let missingBracketIds = item1.missingOpeningBracketIds;
        if (item1.listHeight !== item2.listHeight) {
            throw new Error('Invalid list heights');
        }
        length = lengthAdd(length, item2.length);
        missingBracketIds = missingBracketIds.merge(item2.missingOpeningBracketIds);
        if (item3) {
            if (item1.listHeight !== item3.listHeight) {
                throw new Error('Invalid list heights');
            }
            length = lengthAdd(length, item3.length);
            missingBracketIds = missingBracketIds.merge(item3.missingOpeningBracketIds);
        }
        return immutable
            ? new Immutable23ListAstNode(length, item1.listHeight + 1, item1, item2, item3, missingBracketIds)
            : new TwoThreeListAstNode(length, item1.listHeight + 1, item1, item2, item3, missingBracketIds);
    }
    static create(items, immutable = false) {
        if (items.length === 0) {
            return this.getEmpty();
        }
        else {
            let length = items[0].length;
            let unopenedBrackets = items[0].missingOpeningBracketIds;
            for (let i = 1; i < items.length; i++) {
                length = lengthAdd(length, items[i].length);
                unopenedBrackets = unopenedBrackets.merge(items[i].missingOpeningBracketIds);
            }
            return immutable
                ? new ImmutableArrayListAstNode(length, items[0].listHeight + 1, items, unopenedBrackets)
                : new ArrayListAstNode(length, items[0].listHeight + 1, items, unopenedBrackets);
        }
    }
    static getEmpty() {
        return new ImmutableArrayListAstNode(lengthZero, 0, [], SmallImmutableSet.getEmpty());
    }
    get kind() {
        return 4 /* AstNodeKind.List */;
    }
    get missingOpeningBracketIds() {
        return this._missingOpeningBracketIds;
    }
    /**
     * Use ListAstNode.create.
    */
    constructor(length, listHeight, _missingOpeningBracketIds) {
        super(length);
        this.listHeight = listHeight;
        this._missingOpeningBracketIds = _missingOpeningBracketIds;
        this.cachedMinIndentation = -1;
    }
    throwIfImmutable() {
        // NOOP
    }
    makeLastElementMutable() {
        this.throwIfImmutable();
        const childCount = this.childrenLength;
        if (childCount === 0) {
            return undefined;
        }
        const lastChild = this.getChild(childCount - 1);
        const mutable = lastChild.kind === 4 /* AstNodeKind.List */ ? lastChild.toMutable() : lastChild;
        if (lastChild !== mutable) {
            this.setChild(childCount - 1, mutable);
        }
        return mutable;
    }
    makeFirstElementMutable() {
        this.throwIfImmutable();
        const childCount = this.childrenLength;
        if (childCount === 0) {
            return undefined;
        }
        const firstChild = this.getChild(0);
        const mutable = firstChild.kind === 4 /* AstNodeKind.List */ ? firstChild.toMutable() : firstChild;
        if (firstChild !== mutable) {
            this.setChild(0, mutable);
        }
        return mutable;
    }
    canBeReused(openBracketIds) {
        if (openBracketIds.intersects(this.missingOpeningBracketIds)) {
            return false;
        }
        if (this.childrenLength === 0) {
            // Don't reuse empty lists.
            return false;
        }
        let lastChild = this;
        while (lastChild.kind === 4 /* AstNodeKind.List */) {
            const lastLength = lastChild.childrenLength;
            if (lastLength === 0) {
                // Empty lists should never be contained in other lists.
                throw new BugIndicatingError();
            }
            lastChild = lastChild.getChild(lastLength - 1);
        }
        return lastChild.canBeReused(openBracketIds);
    }
    handleChildrenChanged() {
        this.throwIfImmutable();
        const count = this.childrenLength;
        let length = this.getChild(0).length;
        let unopenedBrackets = this.getChild(0).missingOpeningBracketIds;
        for (let i = 1; i < count; i++) {
            const child = this.getChild(i);
            length = lengthAdd(length, child.length);
            unopenedBrackets = unopenedBrackets.merge(child.missingOpeningBracketIds);
        }
        this._length = length;
        this._missingOpeningBracketIds = unopenedBrackets;
        this.cachedMinIndentation = -1;
    }
    flattenLists() {
        const items = [];
        for (const c of this.children) {
            const normalized = c.flattenLists();
            if (normalized.kind === 4 /* AstNodeKind.List */) {
                items.push(...normalized.children);
            }
            else {
                items.push(normalized);
            }
        }
        return ListAstNode.create(items);
    }
    computeMinIndentation(offset, textModel) {
        if (this.cachedMinIndentation !== -1) {
            return this.cachedMinIndentation;
        }
        let minIndentation = Number.MAX_SAFE_INTEGER;
        let childOffset = offset;
        for (let i = 0; i < this.childrenLength; i++) {
            const child = this.getChild(i);
            if (child) {
                minIndentation = Math.min(minIndentation, child.computeMinIndentation(childOffset, textModel));
                childOffset = lengthAdd(childOffset, child.length);
            }
        }
        this.cachedMinIndentation = minIndentation;
        return minIndentation;
    }
}
class TwoThreeListAstNode extends ListAstNode {
    get childrenLength() {
        return this._item3 !== null ? 3 : 2;
    }
    getChild(idx) {
        switch (idx) {
            case 0: return this._item1;
            case 1: return this._item2;
            case 2: return this._item3;
        }
        throw new Error('Invalid child index');
    }
    setChild(idx, node) {
        switch (idx) {
            case 0:
                this._item1 = node;
                return;
            case 1:
                this._item2 = node;
                return;
            case 2:
                this._item3 = node;
                return;
        }
        throw new Error('Invalid child index');
    }
    get children() {
        return this._item3 ? [this._item1, this._item2, this._item3] : [this._item1, this._item2];
    }
    get item1() {
        return this._item1;
    }
    get item2() {
        return this._item2;
    }
    get item3() {
        return this._item3;
    }
    constructor(length, listHeight, _item1, _item2, _item3, missingOpeningBracketIds) {
        super(length, listHeight, missingOpeningBracketIds);
        this._item1 = _item1;
        this._item2 = _item2;
        this._item3 = _item3;
    }
    deepClone() {
        return new TwoThreeListAstNode(this.length, this.listHeight, this._item1.deepClone(), this._item2.deepClone(), this._item3 ? this._item3.deepClone() : null, this.missingOpeningBracketIds);
    }
    appendChildOfSameHeight(node) {
        if (this._item3) {
            throw new Error('Cannot append to a full (2,3) tree node');
        }
        this.throwIfImmutable();
        this._item3 = node;
        this.handleChildrenChanged();
    }
    unappendChild() {
        if (!this._item3) {
            throw new Error('Cannot remove from a non-full (2,3) tree node');
        }
        this.throwIfImmutable();
        const result = this._item3;
        this._item3 = null;
        this.handleChildrenChanged();
        return result;
    }
    prependChildOfSameHeight(node) {
        if (this._item3) {
            throw new Error('Cannot prepend to a full (2,3) tree node');
        }
        this.throwIfImmutable();
        this._item3 = this._item2;
        this._item2 = this._item1;
        this._item1 = node;
        this.handleChildrenChanged();
    }
    unprependChild() {
        if (!this._item3) {
            throw new Error('Cannot remove from a non-full (2,3) tree node');
        }
        this.throwIfImmutable();
        const result = this._item1;
        this._item1 = this._item2;
        this._item2 = this._item3;
        this._item3 = null;
        this.handleChildrenChanged();
        return result;
    }
    toMutable() {
        return this;
    }
}
/**
 * Immutable, if all children are immutable.
*/
class Immutable23ListAstNode extends TwoThreeListAstNode {
    toMutable() {
        return new TwoThreeListAstNode(this.length, this.listHeight, this.item1, this.item2, this.item3, this.missingOpeningBracketIds);
    }
    throwIfImmutable() {
        throw new Error('this instance is immutable');
    }
}
/**
 * For debugging.
*/
class ArrayListAstNode extends ListAstNode {
    get childrenLength() {
        return this._children.length;
    }
    getChild(idx) {
        return this._children[idx];
    }
    setChild(idx, child) {
        this._children[idx] = child;
    }
    get children() {
        return this._children;
    }
    constructor(length, listHeight, _children, missingOpeningBracketIds) {
        super(length, listHeight, missingOpeningBracketIds);
        this._children = _children;
    }
    deepClone() {
        const children = new Array(this._children.length);
        for (let i = 0; i < this._children.length; i++) {
            children[i] = this._children[i].deepClone();
        }
        return new ArrayListAstNode(this.length, this.listHeight, children, this.missingOpeningBracketIds);
    }
    appendChildOfSameHeight(node) {
        this.throwIfImmutable();
        this._children.push(node);
        this.handleChildrenChanged();
    }
    unappendChild() {
        this.throwIfImmutable();
        const item = this._children.pop();
        this.handleChildrenChanged();
        return item;
    }
    prependChildOfSameHeight(node) {
        this.throwIfImmutable();
        this._children.unshift(node);
        this.handleChildrenChanged();
    }
    unprependChild() {
        this.throwIfImmutable();
        const item = this._children.shift();
        this.handleChildrenChanged();
        return item;
    }
    toMutable() {
        return this;
    }
}
/**
 * Immutable, if all children are immutable.
*/
class ImmutableArrayListAstNode extends ArrayListAstNode {
    toMutable() {
        return new ArrayListAstNode(this.length, this.listHeight, [...this.children], this.missingOpeningBracketIds);
    }
    throwIfImmutable() {
        throw new Error('this instance is immutable');
    }
}
const emptyArray = [];
class ImmutableLeafAstNode extends BaseAstNode {
    get listHeight() {
        return 0;
    }
    get childrenLength() {
        return 0;
    }
    getChild(idx) {
        return null;
    }
    get children() {
        return emptyArray;
    }
    flattenLists() {
        return this;
    }
    deepClone() {
        return this;
    }
}
export class TextAstNode extends ImmutableLeafAstNode {
    get kind() {
        return 0 /* AstNodeKind.Text */;
    }
    get missingOpeningBracketIds() {
        return SmallImmutableSet.getEmpty();
    }
    canBeReused(_openedBracketIds) {
        return true;
    }
    computeMinIndentation(offset, textModel) {
        const start = lengthToObj(offset);
        // Text ast nodes don't have partial indentation (ensured by the tokenizer).
        // Thus, if this text node does not start at column 0, the first line cannot have any indentation at all.
        const startLineNumber = (start.columnCount === 0 ? start.lineCount : start.lineCount + 1) + 1;
        const endLineNumber = lengthGetLineCount(lengthAdd(offset, this.length)) + 1;
        let result = Number.MAX_SAFE_INTEGER;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const firstNonWsColumn = textModel.getLineFirstNonWhitespaceColumn(lineNumber);
            const lineContent = textModel.getLineContent(lineNumber);
            if (firstNonWsColumn === 0) {
                continue;
            }
            const visibleColumn = CursorColumns.visibleColumnFromColumn(lineContent, firstNonWsColumn, textModel.getOptions().tabSize);
            result = Math.min(result, visibleColumn);
        }
        return result;
    }
}
export class BracketAstNode extends ImmutableLeafAstNode {
    static create(length, bracketInfo, bracketIds) {
        const node = new BracketAstNode(length, bracketInfo, bracketIds);
        return node;
    }
    get kind() {
        return 1 /* AstNodeKind.Bracket */;
    }
    get missingOpeningBracketIds() {
        return SmallImmutableSet.getEmpty();
    }
    constructor(length, bracketInfo, 
    /**
     * In case of a opening bracket, this is the id of the opening bracket.
     * In case of a closing bracket, this contains the ids of all opening brackets it can close.
    */
    bracketIds) {
        super(length);
        this.bracketInfo = bracketInfo;
        this.bracketIds = bracketIds;
    }
    get text() {
        return this.bracketInfo.bracketText;
    }
    get languageId() {
        return this.bracketInfo.languageId;
    }
    canBeReused(_openedBracketIds) {
        // These nodes could be reused,
        // but not in a general way.
        // Their parent may be reused.
        return false;
    }
    computeMinIndentation(offset, textModel) {
        return Number.MAX_SAFE_INTEGER;
    }
}
export class InvalidBracketAstNode extends ImmutableLeafAstNode {
    get kind() {
        return 3 /* AstNodeKind.UnexpectedClosingBracket */;
    }
    constructor(closingBrackets, length) {
        super(length);
        this.missingOpeningBracketIds = closingBrackets;
    }
    canBeReused(openedBracketIds) {
        return !openedBracketIds.intersects(this.missingOpeningBracketIds);
    }
    computeMinIndentation(offset, textModel) {
        return Number.MAX_SAFE_INTEGER;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL2FzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHL0QsT0FBTyxFQUFVLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRzNELE1BQU0sQ0FBTixJQUFrQixXQU1qQjtBQU5ELFdBQWtCLFdBQVc7SUFDNUIsNkNBQVEsQ0FBQTtJQUNSLG1EQUFXLENBQUE7SUFDWCw2Q0FBUSxDQUFBO0lBQ1IscUZBQTRCLENBQUE7SUFDNUIsNkNBQVEsQ0FBQTtBQUNULENBQUMsRUFOaUIsV0FBVyxLQUFYLFdBQVcsUUFNNUI7QUFJRDs7RUFFRTtBQUNGLE1BQWUsV0FBVztJQTRCekI7O01BRUU7SUFDRixJQUFXLE1BQU07UUFDaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxZQUFtQixNQUFjO1FBQ2hDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7Q0FvQkQ7QUFFRDs7OztFQUlFO0FBQ0YsTUFBTSxPQUFPLFdBQVksU0FBUSxXQUFXO0lBQ3BDLE1BQU0sQ0FBQyxNQUFNLENBQ25CLGNBQThCLEVBQzlCLEtBQXFCLEVBQ3JCLGNBQXFDO1FBRXJDLElBQUksTUFBTSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDbkMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUNELE9BQU8sSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzlJLENBQUM7SUFFRCxJQUFXLElBQUk7UUFDZCxnQ0FBd0I7SUFDekIsQ0FBQztJQUNELElBQVcsVUFBVTtRQUNwQixPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFDRCxJQUFXLGNBQWM7UUFDeEIsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBQ00sUUFBUSxDQUFDLEdBQVc7UUFDMUIsUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNiLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQ25DLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQzFCLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQ3BDLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVEOztNQUVFO0lBQ0YsSUFBVyxRQUFRO1FBQ2xCLE1BQU0sTUFBTSxHQUFjLEVBQUUsQ0FBQztRQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNqQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELFlBQ0MsTUFBYyxFQUNFLGNBQThCLEVBQzlCLEtBQXFCLEVBQ3JCLGNBQXFDLEVBQ3JDLHdCQUE2RDtRQUU3RSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFMRSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDOUIsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFDckIsbUJBQWMsR0FBZCxjQUFjLENBQXVCO1FBQ3JDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBcUM7SUFHOUUsQ0FBQztJQUVNLFdBQVcsQ0FBQyxjQUFtRDtRQUNyRSxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDbEMsK0JBQStCO1lBQy9CLGlDQUFpQztZQUNqQyxtQ0FBbUM7WUFFbkMsMEJBQTBCO1lBQzFCLGtHQUFrRztZQUVsRyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztZQUM5RCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTSxZQUFZO1FBQ2xCLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsRUFDbEMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUN2QyxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQ3pELENBQUM7SUFDSCxDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sSUFBSSxXQUFXLENBQ3JCLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFDL0IsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUNwQyxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQ3RELElBQUksQ0FBQyx3QkFBd0IsQ0FDN0IsQ0FBQztJQUNILENBQUM7SUFFTSxxQkFBcUIsQ0FBQyxNQUFjLEVBQUUsU0FBcUI7UUFDakUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDO0lBQzFJLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBZ0IsV0FBWSxTQUFRLFdBQVc7SUFDcEQ7O01BRUU7SUFDSyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQWMsRUFBRSxLQUFjLEVBQUUsS0FBcUIsRUFBRSxZQUFxQixLQUFLO1FBQ3ZHLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsd0JBQXdCLENBQUM7UUFFdkQsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFNUUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBQ0QsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBQ0QsT0FBTyxTQUFTO1lBQ2YsQ0FBQyxDQUFDLElBQUksc0JBQXNCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixDQUFDO1lBQ2xHLENBQUMsQ0FBQyxJQUFJLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQWdCLEVBQUUsWUFBcUIsS0FBSztRQUNoRSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO1lBQ3pELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDNUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQzlFLENBQUM7WUFDRCxPQUFPLFNBQVM7Z0JBQ2YsQ0FBQyxDQUFDLElBQUkseUJBQXlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQztnQkFDekYsQ0FBQyxDQUFDLElBQUksZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25GLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFFBQVE7UUFDckIsT0FBTyxJQUFJLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVELElBQVcsSUFBSTtRQUNkLGdDQUF3QjtJQUN6QixDQUFDO0lBRUQsSUFBVyx3QkFBd0I7UUFDbEMsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUM7SUFDdkMsQ0FBQztJQUlEOztNQUVFO0lBQ0YsWUFDQyxNQUFjLEVBQ0UsVUFBa0IsRUFDMUIseUJBQThEO1FBRXRFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUhFLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDMUIsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFxQztRQVIvRCx5QkFBb0IsR0FBVyxDQUFDLENBQUMsQ0FBQztJQVcxQyxDQUFDO0lBRVMsZ0JBQWdCO1FBQ3pCLE9BQU87SUFDUixDQUFDO0lBSU0sc0JBQXNCO1FBQzVCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDdkMsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBRSxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxJQUFJLDZCQUFxQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4RixJQUFJLFNBQVMsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTSx1QkFBdUI7UUFDN0IsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDeEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUN2QyxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsSUFBSSw2QkFBcUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFDM0YsSUFBSSxVQUFVLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTSxXQUFXLENBQUMsY0FBbUQ7UUFDckUsSUFBSSxjQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUM7WUFDOUQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9CLDJCQUEyQjtZQUMzQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLFNBQVMsR0FBZ0IsSUFBSSxDQUFDO1FBQ2xDLE9BQU8sU0FBUyxDQUFDLElBQUksNkJBQXFCLEVBQUUsQ0FBQztZQUM1QyxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFDO1lBQzVDLElBQUksVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN0Qix3REFBd0Q7Z0JBQ3hELE1BQU0sSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ2hDLENBQUM7WUFDRCxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFnQixDQUFDO1FBQy9ELENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVNLHFCQUFxQjtRQUMzQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUV4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBRWxDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFFLENBQUMsTUFBTSxDQUFDO1FBQ3RDLElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQyx3QkFBd0IsQ0FBQztRQUVsRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQztZQUNoQyxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMseUJBQXlCLEdBQUcsZ0JBQWdCLENBQUM7UUFDbEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFTSxZQUFZO1FBQ2xCLE1BQU0sS0FBSyxHQUFjLEVBQUUsQ0FBQztRQUM1QixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMvQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEMsSUFBSSxVQUFVLENBQUMsSUFBSSw2QkFBcUIsRUFBRSxDQUFDO2dCQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTSxxQkFBcUIsQ0FBQyxNQUFjLEVBQUUsU0FBcUI7UUFDakUsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztRQUNsQyxDQUFDO1FBRUQsSUFBSSxjQUFjLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQzdDLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQztRQUN6QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUMvRixXQUFXLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsY0FBYyxDQUFDO1FBQzNDLE9BQU8sY0FBYyxDQUFDO0lBQ3ZCLENBQUM7Q0FXRDtBQUVELE1BQU0sbUJBQW9CLFNBQVEsV0FBVztJQUM1QyxJQUFXLGNBQWM7UUFDeEIsT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUNNLFFBQVEsQ0FBQyxHQUFXO1FBQzFCLFFBQVEsR0FBRyxFQUFFLENBQUM7WUFDYixLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUMzQixLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUMzQixLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUM1QixDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFDUyxRQUFRLENBQUMsR0FBVyxFQUFFLElBQWE7UUFDNUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNiLEtBQUssQ0FBQztnQkFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFBQyxPQUFPO1lBQ25DLEtBQUssQ0FBQztnQkFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFBQyxPQUFPO1lBQ25DLEtBQUssQ0FBQztnQkFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFBQyxPQUFPO1FBQ3BDLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMzRixDQUFDO0lBRUQsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFDRCxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQVcsS0FBSztRQUNmLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsWUFDQyxNQUFjLEVBQ2QsVUFBa0IsRUFDVixNQUFlLEVBQ2YsTUFBZSxFQUNmLE1BQXNCLEVBQzlCLHdCQUE2RDtRQUU3RCxLQUFLLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBTDVDLFdBQU0sR0FBTixNQUFNLENBQVM7UUFDZixXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQ2YsV0FBTSxHQUFOLE1BQU0sQ0FBZ0I7SUFJL0IsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLElBQUksbUJBQW1CLENBQzdCLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQzVDLElBQUksQ0FBQyx3QkFBd0IsQ0FDN0IsQ0FBQztJQUNILENBQUM7SUFFTSx1QkFBdUIsQ0FBQyxJQUFhO1FBQzNDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbkIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVNLGFBQWE7UUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbkIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDN0IsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU0sd0JBQXdCLENBQUMsSUFBYTtRQUM1QyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbkIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVNLGNBQWM7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUVuQixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUM3QixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFUSxTQUFTO1FBQ2pCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEO0FBRUQ7O0VBRUU7QUFDRixNQUFNLHNCQUF1QixTQUFRLG1CQUFtQjtJQUM5QyxTQUFTO1FBQ2pCLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDakksQ0FBQztJQUVrQixnQkFBZ0I7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRDtBQUVEOztFQUVFO0FBQ0YsTUFBTSxnQkFBaUIsU0FBUSxXQUFXO0lBQ3pDLElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0lBQzlCLENBQUM7SUFDRCxRQUFRLENBQUMsR0FBVztRQUNuQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUNTLFFBQVEsQ0FBQyxHQUFXLEVBQUUsS0FBYztRQUM3QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUM3QixDQUFDO0lBQ0QsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxZQUNDLE1BQWMsRUFDZCxVQUFrQixFQUNELFNBQW9CLEVBQ3JDLHdCQUE2RDtRQUU3RCxLQUFLLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBSG5DLGNBQVMsR0FBVCxTQUFTLENBQVc7SUFJdEMsQ0FBQztJQUVELFNBQVM7UUFDUixNQUFNLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBVSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzdDLENBQUM7UUFDRCxPQUFPLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUNwRyxDQUFDO0lBRU0sdUJBQXVCLENBQUMsSUFBYTtRQUMzQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRU0sYUFBYTtRQUNuQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzdCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVNLHdCQUF3QixDQUFDLElBQWE7UUFDNUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVNLGNBQWM7UUFDcEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDeEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUM3QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFZSxTQUFTO1FBQ3hCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEO0FBRUQ7O0VBRUU7QUFDRixNQUFNLHlCQUEwQixTQUFRLGdCQUFnQjtJQUM5QyxTQUFTO1FBQ2pCLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUM5RyxDQUFDO0lBRWtCLGdCQUFnQjtRQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLEdBQXVCLEVBQUUsQ0FBQztBQUUxQyxNQUFlLG9CQUFxQixTQUFRLFdBQVc7SUFDdEQsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUNELElBQVcsY0FBYztRQUN4QixPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFDTSxRQUFRLENBQUMsR0FBVztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDRCxJQUFXLFFBQVE7UUFDbEIsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxJQUFzQixDQUFDO0lBQy9CLENBQUM7SUFDTSxTQUFTO1FBQ2YsT0FBTyxJQUFzQixDQUFDO0lBQy9CLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFZLFNBQVEsb0JBQW9CO0lBQ3BELElBQVcsSUFBSTtRQUNkLGdDQUF3QjtJQUN6QixDQUFDO0lBQ0QsSUFBVyx3QkFBd0I7UUFDbEMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRU0sV0FBVyxDQUFDLGlCQUFzRDtRQUN4RSxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTSxxQkFBcUIsQ0FBQyxNQUFjLEVBQUUsU0FBcUI7UUFDakUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLDRFQUE0RTtRQUM1RSx5R0FBeUc7UUFDekcsTUFBTSxlQUFlLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUYsTUFBTSxhQUFhLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFN0UsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBRXJDLEtBQUssSUFBSSxVQUFVLEdBQUcsZUFBZSxFQUFFLFVBQVUsSUFBSSxhQUFhLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNsRixNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMvRSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3pELElBQUksZ0JBQWdCLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLFNBQVM7WUFDVixDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFFLENBQUM7WUFDNUgsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxjQUFlLFNBQVEsb0JBQW9CO0lBQ2hELE1BQU0sQ0FBQyxNQUFNLENBQ25CLE1BQWMsRUFDZCxXQUF3QixFQUN4QixVQUErQztRQUUvQyxNQUFNLElBQUksR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQVcsSUFBSTtRQUNkLG1DQUEyQjtJQUM1QixDQUFDO0lBRUQsSUFBVyx3QkFBd0I7UUFDbEMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsWUFDQyxNQUFjLEVBQ0UsV0FBd0I7SUFDeEM7OztNQUdFO0lBQ2MsVUFBK0M7UUFFL0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBUEUsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFLeEIsZUFBVSxHQUFWLFVBQVUsQ0FBcUM7SUFHaEUsQ0FBQztJQUVELElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUM7SUFDckMsQ0FBQztJQUVELElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDO0lBQ3BDLENBQUM7SUFFTSxXQUFXLENBQUMsaUJBQXNEO1FBQ3hFLCtCQUErQjtRQUMvQiw0QkFBNEI7UUFDNUIsOEJBQThCO1FBQzlCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVNLHFCQUFxQixDQUFDLE1BQWMsRUFBRSxTQUFxQjtRQUNqRSxPQUFPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztJQUNoQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsb0JBQW9CO0lBQzlELElBQVcsSUFBSTtRQUNkLG9EQUE0QztJQUM3QyxDQUFDO0lBSUQsWUFBbUIsZUFBb0QsRUFBRSxNQUFjO1FBQ3RGLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNkLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxlQUFlLENBQUM7SUFDakQsQ0FBQztJQUVNLFdBQVcsQ0FBQyxnQkFBcUQ7UUFDdkUsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRU0scUJBQXFCLENBQUMsTUFBYyxFQUFFLFNBQXFCO1FBQ2pFLE9BQU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDO0lBQ2hDLENBQUM7Q0FDRCJ9