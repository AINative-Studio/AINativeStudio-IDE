/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
/**
 * A column in a position is the gap between two adjacent characters. The methods here
 * work with a concept called "visible column". A visible column is a very rough approximation
 * of the horizontal screen position of a column. For example, using a tab size of 4:
 * ```txt
 * |<TAB>|<TAB>|T|ext
 * |     |     | \---- column = 4, visible column = 9
 * |     |     \------ column = 3, visible column = 8
 * |     \------------ column = 2, visible column = 4
 * \------------------ column = 1, visible column = 0
 * ```
 *
 * **NOTE**: Visual columns do not work well for RTL text or variable-width fonts or characters.
 *
 * **NOTE**: These methods work and make sense both on the model and on the view model.
 */
export class CursorColumns {
    static _nextVisibleColumn(codePoint, visibleColumn, tabSize) {
        if (codePoint === 9 /* CharCode.Tab */) {
            return CursorColumns.nextRenderTabStop(visibleColumn, tabSize);
        }
        if (strings.isFullWidthCharacter(codePoint) || strings.isEmojiImprecise(codePoint)) {
            return visibleColumn + 2;
        }
        return visibleColumn + 1;
    }
    /**
     * Returns a visible column from a column.
     * @see {@link CursorColumns}
     */
    static visibleColumnFromColumn(lineContent, column, tabSize) {
        const textLen = Math.min(column - 1, lineContent.length);
        const text = lineContent.substring(0, textLen);
        const iterator = new strings.GraphemeIterator(text);
        let result = 0;
        while (!iterator.eol()) {
            const codePoint = strings.getNextCodePoint(text, textLen, iterator.offset);
            iterator.nextGraphemeLength();
            result = this._nextVisibleColumn(codePoint, result, tabSize);
        }
        return result;
    }
    /**
     * Returns the value to display as "Col" in the status bar.
     * @see {@link CursorColumns}
     */
    static toStatusbarColumn(lineContent, column, tabSize) {
        const text = lineContent.substring(0, Math.min(column - 1, lineContent.length));
        const iterator = new strings.CodePointIterator(text);
        let result = 0;
        while (!iterator.eol()) {
            const codePoint = iterator.nextCodePoint();
            if (codePoint === 9 /* CharCode.Tab */) {
                result = CursorColumns.nextRenderTabStop(result, tabSize);
            }
            else {
                result = result + 1;
            }
        }
        return result + 1;
    }
    /**
     * Returns a column from a visible column.
     * @see {@link CursorColumns}
     */
    static columnFromVisibleColumn(lineContent, visibleColumn, tabSize) {
        if (visibleColumn <= 0) {
            return 1;
        }
        const lineContentLength = lineContent.length;
        const iterator = new strings.GraphemeIterator(lineContent);
        let beforeVisibleColumn = 0;
        let beforeColumn = 1;
        while (!iterator.eol()) {
            const codePoint = strings.getNextCodePoint(lineContent, lineContentLength, iterator.offset);
            iterator.nextGraphemeLength();
            const afterVisibleColumn = this._nextVisibleColumn(codePoint, beforeVisibleColumn, tabSize);
            const afterColumn = iterator.offset + 1;
            if (afterVisibleColumn >= visibleColumn) {
                const beforeDelta = visibleColumn - beforeVisibleColumn;
                const afterDelta = afterVisibleColumn - visibleColumn;
                if (afterDelta < beforeDelta) {
                    return afterColumn;
                }
                else {
                    return beforeColumn;
                }
            }
            beforeVisibleColumn = afterVisibleColumn;
            beforeColumn = afterColumn;
        }
        // walked the entire string
        return lineContentLength + 1;
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     * @see {@link CursorColumns}
     */
    static nextRenderTabStop(visibleColumn, tabSize) {
        return visibleColumn + tabSize - visibleColumn % tabSize;
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     * @see {@link CursorColumns}
     */
    static nextIndentTabStop(visibleColumn, indentSize) {
        return CursorColumns.nextRenderTabStop(visibleColumn, indentSize);
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     * @see {@link CursorColumns}
     */
    static prevRenderTabStop(column, tabSize) {
        return Math.max(0, column - 1 - (column - 1) % tabSize);
    }
    /**
     * ATTENTION: This works with 0-based columns (as opposed to the regular 1-based columns)
     * @see {@link CursorColumns}
     */
    static prevIndentTabStop(column, indentSize) {
        return CursorColumns.prevRenderTabStop(column, indentSize);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29sdW1ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvY3Vyc29yQ29sdW1ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBRTNEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILE1BQU0sT0FBTyxhQUFhO0lBRWpCLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxTQUFpQixFQUFFLGFBQXFCLEVBQUUsT0FBZTtRQUMxRixJQUFJLFNBQVMseUJBQWlCLEVBQUUsQ0FBQztZQUNoQyxPQUFPLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3BGLE9BQU8sYUFBYSxHQUFHLENBQUMsQ0FBQztRQUMxQixDQUFDO1FBQ0QsT0FBTyxhQUFhLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsdUJBQXVCLENBQUMsV0FBbUIsRUFBRSxNQUFjLEVBQUUsT0FBZTtRQUN6RixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLE1BQU0sUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFD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