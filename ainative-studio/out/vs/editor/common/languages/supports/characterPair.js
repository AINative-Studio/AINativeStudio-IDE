/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardAutoClosingPairConditional } from '../languageConfiguration.js';
export class CharacterPairSupport {
    static { this.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED_QUOTES = ';:.,=}])> \n\t'; }
    static { this.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED_BRACKETS = '\'"`;:.,=}])> \n\t'; }
    static { this.DEFAULT_AUTOCLOSE_BEFORE_WHITESPACE = ' \n\t'; }
    constructor(config) {
        if (config.autoClosingPairs) {
            this._autoClosingPairs = config.autoClosingPairs.map(el => new StandardAutoClosingPairConditional(el));
        }
        else if (config.brackets) {
            this._autoClosingPairs = config.brackets.map(b => new StandardAutoClosingPairConditional({ open: b[0], close: b[1] }));
        }
        else {
            this._autoClosingPairs = [];
        }
        if (config.__electricCharacterSupport && config.__electricCharacterSupport.docComment) {
            const docComment = config.__electricCharacterSupport.docComment;
            // IDocComment is legacy, only partially supported
            this._autoClosingPairs.push(new StandardAutoClosingPairConditional({ open: docComment.open, close: docComment.close || '' }));
        }
        this._autoCloseBeforeForQuotes = typeof config.autoCloseBefore === 'string' ? config.autoCloseBefore : CharacterPairSupport.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED_QUOTES;
        this._autoCloseBeforeForBrackets = typeof config.autoCloseBefore === 'string' ? config.autoCloseBefore : CharacterPairSupport.DEFAULT_AUTOCLOSE_BEFORE_LANGUAGE_DEFINED_BRACKETS;
        this._surroundingPairs = config.surroundingPairs || this._autoClosingPairs;
    }
    getAutoClosingPairs() {
        return this._autoClosingPairs;
    }
    getAutoCloseBeforeSet(forQuotes) {
        return (forQuotes ? this._autoCloseBeforeForQuotes : this._autoCloseBeforeForBrackets);
    }
    getSurroundingPairs() {
        return this._surroundingPairs;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyUGFpci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9zdXBwb3J0cy9jaGFyYWN0ZXJQYWlyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBb0Isa0NBQWtDLEVBQXlCLE1BQU0sNkJBQTZCLENBQUM7QUFFMUgsTUFBTSxPQUFPLG9CQUFvQjthQUVoQixxREFBZ0QsR0FBRyxnQkFBZ0IsQ0FBQzthQUNwRSx1REFBa0QsR0FBRyxvQkFBb0IsQ0FBQzthQUMxRSx3Q0FBbUMsR0FBRyxPQUFPLENBQUM7SUFPOUQsWUFBWSxNQUE2QjtRQUN4QyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxrQ0FBa0MsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLENBQUM7YUFBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGtDQUFrQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hILENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsMEJBQTBCLElBQUksTUFBTSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3ZGLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUM7WUFDaEUsa0RBQWtEO1lBQ2xELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxrQ0FBa0MsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvSCxDQUFDO1FBRUQsSUFBSSxDQUFDLHlCQUF5QixHQUFHLE9BQU8sTUFBTSxDQUFDLGVBQWUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGdEQUFnRCxDQUFDO1FBQzdLLElBQUksQ0FBQywyQkFBMkIsR0FBRyxPQUFPLE1BQU0sQ0FBQyxlQUFlLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxrREFBa0QsQ0FBQztRQUVqTCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztJQUM1RSxDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQy9CLENBQUM7SUFFTSxxQkFBcUIsQ0FBQyxTQUFrQjtRQUM5QyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFFTSxtQkFBbUI7UUFDekIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDL0IsQ0FBQyJ9