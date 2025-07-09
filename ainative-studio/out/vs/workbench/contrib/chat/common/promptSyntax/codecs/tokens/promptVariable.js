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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFyaWFibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy90b2tlbnMvcHJvbXB0VmFyaWFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFakYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTlGOztHQUVHO0FBQ0gsTUFBTSxlQUFlLEdBQVcsR0FBRyxDQUFDO0FBRXBDOztHQUVHO0FBQ0gsTUFBTSxjQUFjLEdBQVcsR0FBRyxDQUFDO0FBRW5DOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGNBQWUsU0FBUSxXQUFXO0lBQzlDLFlBQ0MsS0FBWTtJQUNaOztPQUVHO0lBQ2EsSUFBWTtRQUU1QixnRUFBZ0U7UUFDaEUsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQ0wsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxDQUFDO2dCQUN2RCxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQy9DLDZDQUE2QyxTQUFTLFdBQVcsSUFBSSxJQUFJLENBQ3pFLENBQUM7UUFDSCxDQUFDO1FBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBWEcsU0FBSSxHQUFKLElBQUksQ0FBUTtJQVk3QixDQUFDO0lBRUQ7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