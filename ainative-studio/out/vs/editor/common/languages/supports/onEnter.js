/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../../base/common/errors.js';
import * as strings from '../../../../base/common/strings.js';
import { IndentAction } from '../languageConfiguration.js';
export class OnEnterSupport {
    constructor(opts) {
        opts = opts || {};
        opts.brackets = opts.brackets || [
            ['(', ')'],
            ['{', '}'],
            ['[', ']']
        ];
        this._brackets = [];
        opts.brackets.forEach((bracket) => {
            const openRegExp = OnEnterSupport._createOpenBracketRegExp(bracket[0]);
            const closeRegExp = OnEnterSupport._createCloseBracketRegExp(bracket[1]);
            if (openRegExp && closeRegExp) {
                this._brackets.push({
                    open: bracket[0],
                    openRegExp: openRegExp,
                    close: bracket[1],
                    closeRegExp: closeRegExp,
                });
            }
        });
        this._regExpRules = opts.onEnterRules || [];
    }
    onEnter(autoIndent, previousLineText, beforeEnterText, afterEnterText) {
        // (1): `regExpRules`
        if (autoIndent >= 3 /* EditorAutoIndentStrategy.Advanced */) {
            for (let i = 0, len = this._regExpRules.length; i < len; i++) {
                const rule = this._regExpRules[i];
                const regResult = [{
                        reg: rule.beforeText,
                        text: beforeEnterText
                    }, {
                        reg: rule.afterText,
                        text: afterEnterText
                    }, {
                        reg: rule.previousLineText,
                        text: previousLineText
                    }].every((obj) => {
                    if (!obj.reg) {
                        return true;
                    }
                    obj.reg.lastIndex = 0; // To disable the effect of the "g" flag.
                    return obj.reg.test(obj.text);
                });
                if (regResult) {
                    return rule.action;
                }
            }
        }
        // (2): Special indent-outdent
        if (autoIndent >= 2 /* EditorAutoIndentStrategy.Brackets */) {
            if (beforeEnterText.length > 0 && afterEnterText.length > 0) {
                for (let i = 0, len = this._brackets.length; i < len; i++) {
                    const bracket = this._brackets[i];
                    if (bracket.openRegExp.test(beforeEnterText) && bracket.closeRegExp.test(afterEnterText)) {
                        return { indentAction: IndentAction.IndentOutdent };
                    }
                }
            }
        }
        // (4): Open bracket based logic
        if (autoIndent >= 2 /* EditorAutoIndentStrategy.Brackets */) {
            if (beforeEnterText.length > 0) {
                for (let i = 0, len = this._brackets.length; i < len; i++) {
                    const bracket = this._brackets[i];
                    if (bracket.openRegExp.test(beforeEnterText)) {
                        return { indentAction: IndentAction.Indent };
                    }
                }
            }
        }
        return null;
    }
    static _createOpenBracketRegExp(bracket) {
        let str = strings.escapeRegExpCharacters(bracket);
        if (!/\B/.test(str.charAt(0))) {
            str = '\\b' + str;
        }
        str += '\\s*$';
        return OnEnterSupport._safeRegExp(str);
    }
    static _createCloseBracketRegExp(bracket) {
        let str = strings.escapeRegExpCharacters(bracket);
        if (!/\B/.test(str.charAt(str.length - 1))) {
            str = str + '\\b';
        }
        str = '^\\s*' + str;
        return OnEnterSupport._safeRegExp(str);
    }
    static _safeRegExp(def) {
        try {
            return new RegExp(def);
        }
        catch (err) {
            onUnexpectedError(err);
            return null;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25FbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9zdXBwb3J0cy9vbkVudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUE4QixZQUFZLEVBQWUsTUFBTSw2QkFBNkIsQ0FBQztBQWVwRyxNQUFNLE9BQU8sY0FBYztJQUsxQixZQUFZLElBQTRCO1FBQ3ZDLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSTtZQUNoQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDVixDQUFDO1FBRUYsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNqQyxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkUsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLElBQUksVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztvQkFDbkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ2hCLFVBQVUsRUFBRSxVQUFVO29CQUN0QixLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDakIsV0FBVyxFQUFFLFdBQVc7aUJBQ3hCLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUM7SUFDN0MsQ0FBQztJQUVNLE9BQU8sQ0FBQyxVQUFvQyxFQUFFLGdCQUF3QixFQUFFLGVBQXVCLEVBQUUsY0FBc0I7UUFDN0gscUJBQXFCO1FBQ3JCLElBQUksVUFBVSw2Q0FBcUMsRUFBRSxDQUFDO1lBQ3JELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLE1BQU0sU0FBUyxHQUFHLENBQUM7d0JBQ2xCLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVTt3QkFDcEIsSUFBSSxFQUFFLGVBQWU7cUJBQ3JCLEVBQUU7d0JBQ0YsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTO3dCQUNuQixJQUFJLEVBQUUsY0FBYztxQkFDcEIsRUFBRTt3QkFDRixHQUFHLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjt3QkFDMUIsSUFBSSxFQUFFLGdCQUFnQjtxQkFDdEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBVyxFQUFFO29CQUN6QixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNkLE9BQU8sSUFBSSxDQUFDO29CQUNiLENBQUM7b0JBRUQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMseUNBQXlDO29CQUNoRSxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0IsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixJQUFJLFVBQVUsNkNBQXFDLEVBQUUsQ0FBQztZQUNyRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzdELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQzt3QkFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3JELENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBR0QsZ0NBQWdDO1FBQ2hDLElBQUksVUFBVSw2Q0FBcUMsRUFBRSxDQUFDO1lBQ3JELElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDM0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO3dCQUM5QyxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDOUMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTyxNQUFNLENBQUMsd0JBQXdCLENBQUMsT0FBZTtRQUN0RCxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDL0IsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUM7UUFDbkIsQ0FBQztRQUNELEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDZixPQUFPLGNBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVPLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxPQUFlO1FBQ3ZELElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVDLEdBQUcsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDO1FBQ25CLENBQUM7UUFDRCxHQUFHLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQztRQUNwQixPQUFPLGNBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBVztRQUNyQyxJQUFJLENBQUM7WUFDSixPQUFPLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=