/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './promptToken.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { INVALID_NAME_CHARACTERS, STOP_CHARACTERS } from '../parsers/promptVariableParser.js';
/**
 * All prompt variables start with `#` character.
 */
const START_CHARACTER = '#';
/**
 * Character that separates name of a prompt variable from its data.
 */
const DATA_SEPARATOR = ':';
/**
 * Represents a `#variable` token in a prompt text.
 */
export class PromptVariable extends PromptToken {
    constructor(range, 
    /**
     * The name of a prompt variable, excluding the `#` character at the start.
     */
    name) {
        // sanity check of characters used in the provided variable name
        for (const character of name) {
            assert((INVALID_NAME_CHARACTERS.includes(character) === false) &&
                (STOP_CHARACTERS.includes(character) === false), `Variable 'name' cannot contain character '${character}', got '${name}'.`);
        }
        super(range);
        this.name = name;
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return `${START_CHARACTER}${this.name}`;
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.sameRange(other.range)) {
            return false;
        }
        if ((other instanceof PromptVariable) === false) {
            return false;
        }
        if (this.text.length !== other.text.length) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Return a string representation of the token.
     */
    toString() {
        return `${this.text}${this.range}`;
    }
}
/**
 * Represents a {@link PromptVariable} with additional data token in a prompt text.
 * (e.g., `#variable:/path/to/file.md`)
 */
export class PromptVariableWithData extends PromptVariable {
    constructor(fullRange, 
    /**
     * The name of the variable, excluding the starting `#` character.
     */
    name, 
    /**
     * The data of the variable, excluding the starting {@link DATA_SEPARATOR} character.
     */
    data) {
        super(fullRange, name);
        this.data = data;
        // sanity check of characters used in the provided variable data
        for (const character of data) {
            assert((STOP_CHARACTERS.includes(character) === false), `Variable 'data' cannot contain character '${character}', got '${data}'.`);
        }
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return `${START_CHARACTER}${this.name}${DATA_SEPARATOR}${this.data}`;
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if ((other instanceof PromptVariableWithData) === false) {
            return false;
        }
        return super.equals(other);
    }
    /**
     * Range of the `data` part of the variable.
     */
    get dataRange() {
        const { range } = this;
        // calculate the start column number of the `data` part of the variable
        const dataStartColumn = range.startColumn +
            START_CHARACTER.length + this.name.length +
            DATA_SEPARATOR.length;
        // create `range` of the `data` part of the variable
        const result = new Range(range.startLineNumber, dataStartColumn, range.endLineNumber, range.endColumn);
        // if the resulting range is empty, return `undefined`
        // because there is no `data` part present in the variable
        if (result.isEmpty()) {
            return undefined;
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFyaWFibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3Rva2Vucy9wcm9tcHRWYXJpYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3BFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFOUY7O0dBRUc7QUFDSCxNQUFNLGVBQWUsR0FBVyxHQUFHLENBQUM7QUFFcEM7O0dBRUc7QUFDSCxNQUFNLGNBQWMsR0FBVyxHQUFHLENBQUM7QUFFbkM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLFdBQVc7SUFDOUMsWUFDQyxLQUFZO0lBQ1o7O09BRUc7SUFDYSxJQUFZO1FBRTVCLGdFQUFnRTtRQUNoRSxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzlCLE1BQU0sQ0FDTCxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxLQUFLLENBQUM7Z0JBQ3ZELENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxLQUFLLENBQUMsRUFDL0MsNkNBQTZDLFNBQVMsV0FBVyxJQUFJLElBQUksQ0FDekUsQ0FBQztRQUNILENBQUM7UUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFYRyxTQUFJLEdBQUosSUFBSSxDQUFRO0lBWTdCLENBQUM7SUFFRDs7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