/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IndentAction } from '../../../../common/languages/languageConfiguration.js';
export const javascriptOnEnterRules = [
    {
        // e.g. /** | */
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        afterText: /^\s*\*\/$/,
        action: { indentAction: IndentAction.IndentOutdent, appendText: ' * ' }
    }, {
        // e.g. /** ...|
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        action: { indentAction: IndentAction.None, appendText: ' * ' }
    }, {
        // e.g.  * ...|
        beforeText: /^(\t|[ ])*[ ]\*([ ]([^\*]|\*(?!\/))*)?$/,
        previousLineText: /(?=^(\s*(\/\*\*|\*)).*)(?=(?!(\s*\*\/)))/,
        action: { indentAction: IndentAction.None, appendText: '* ' }
    }, {
        // e.g.  */|
        beforeText: /^(\t|[ ])*[ ]\*\/\s*$/,
        action: { indentAction: IndentAction.None, removeText: 1 }
    },
    {
        // e.g.  *-----*/|
        beforeText: /^(\t|[ ])*[ ]\*[^/]*\*\/\s*$/,
        action: { indentAction: IndentAction.None, removeText: 1 }
    },
    {
        beforeText: /^\s*(\bcase\s.+:|\bdefault:)$/,
        afterText: /^(?!\s*(\bcase\b|\bdefault\b))/,
        action: { indentAction: IndentAction.Indent }
    },
    {
        previousLineText: /^\s*(((else ?)?if|for|while)\s*\(.*\)\s*|else\s*)$/,
        beforeText: /^\s+([^{i\s]|i(?!f\b))/,
        action: { indentAction: IndentAction.Outdent }
    },
    // Indent when pressing enter from inside ()
    {
        beforeText: /^.*\([^\)]*$/,
        afterText: /^\s*\).*$/,
        action: { indentAction: IndentAction.IndentOutdent, appendText: '\t' }
    },
    // Indent when pressing enter from inside {}
    {
        beforeText: /^.*\{[^\}]*$/,
        afterText: /^\s*\}.*$/,
        action: { indentAction: IndentAction.IndentOutdent, appendText: '\t' }
    },
    // Indent when pressing enter from inside []
    {
        beforeText: /^.*\[[^\]]*$/,
        afterText: /^\s*\].*$/,
        action: { indentAction: IndentAction.IndentOutdent, appendText: '\t' }
    },
];
export const phpOnEnterRules = [
    {
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        afterText: /^\s*\*\/$/,
        action: {
            indentAction: IndentAction.IndentOutdent,
            appendText: ' * ',
        }
    },
    {
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        action: {
            indentAction: IndentAction.None,
            appendText: ' * ',
        }
    },
    {
        beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
        action: {
            indentAction: IndentAction.None,
            appendText: '* ',
        }
    },
    {
        beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
        action: {
            indentAction: IndentAction.None,
            removeText: 1,
        }
    },
    {
        beforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/,
        action: {
            indentAction: IndentAction.None,
            removeText: 1,
        }
    },
    {
        beforeText: /^\s+([^{i\s]|i(?!f\b))/,
        previousLineText: /^\s*(((else ?)?if|for(each)?|while)\s*\(.*\)\s*|else\s*)$/,
        action: {
            indentAction: IndentAction.Outdent
        }
    },
];
export const cppOnEnterRules = [
    {
        previousLineText: /^\s*(((else ?)?if|for|while)\s*\(.*\)\s*|else\s*)$/,
        beforeText: /^\s+([^{i\s]|i(?!f\b))/,
        action: {
            indentAction: IndentAction.Outdent
        }
    }
];
export const htmlOnEnterRules = [
    {
        beforeText: /<(?!(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr))([_:\w][_:\w\-.\d]*)(?:(?:[^'"/>]|"[^"]*"|'[^']*')*?(?!\/)>)[^<]*$/i,
        afterText: /^<\/([_:\w][_:\w\-.\d]*)\s*>/i,
        action: {
            indentAction: IndentAction.IndentOutdent
        }
    },
    {
        beforeText: /<(?!(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr))([_:\w][_:\w\-.\d]*)(?:(?:[^'"/>]|"[^"]*"|'[^']*')*?(?!\/)>)[^<]*$/i,
        action: {
            indentAction: IndentAction.Indent
        }
    }
];
/*
export enum IndentAction {
    None = 0,
    Indent = 1,
    IndentOutdent = 2,
    Outdent = 3
}
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25FbnRlclJ1bGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvc3VwcG9ydHMvb25FbnRlclJ1bGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVyRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRztJQUNyQztRQUNDLGdCQUFnQjtRQUNoQixVQUFVLEVBQUUsb0NBQW9DO1FBQ2hELFNBQVMsRUFBRSxXQUFXO1FBQ3RCLE1BQU0sRUFBRSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUU7S0FDdkUsRUFBRTtRQUNGLGdCQUFnQjtRQUNoQixVQUFVLEVBQUUsb0NBQW9DO1FBQ2hELE1BQU0sRUFBRSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUU7S0FDOUQsRUFBRTtRQUNGLGVBQWU7UUFDZixVQUFVLEVBQUUseUNBQXlDO1FBQ3JELGdCQUFnQixFQUFFLDBDQUEwQztRQUM1RCxNQUFNLEVBQUUsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO0tBQzdELEVBQUU7UUFDRixZQUFZO1FBQ1osVUFBVSxFQUFFLHVCQUF1QjtRQUNuQyxNQUFNLEVBQUUsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO0tBQzFEO0lBQ0Q7UUFDQyxrQkFBa0I7UUFDbEIsVUFBVSxFQUFFLDhCQUE4QjtRQUMxQyxNQUFNLEVBQUUsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFO0tBQzFEO0lBQ0Q7UUFDQyxVQUFVLEVBQUUsK0JBQStCO1FBQzNDLFNBQVMsRUFBRSxnQ0FBZ0M7UUFDM0MsTUFBTSxFQUFFLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUU7S0FDN0M7SUFDRDtRQUNDLGdCQUFnQixFQUFFLG9EQUFvRDtRQUN0RSxVQUFVLEVBQUUsd0JBQXdCO1FBQ3BDLE1BQU0sRUFBRSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsT0FBTyxFQUFFO0tBQzlDO0lBQ0QsNENBQTRDO0lBQzVDO1FBQ0MsVUFBVSxFQUFFLGNBQWM7UUFDMUIsU0FBUyxFQUFFLFdBQVc7UUFDdEIsTUFBTSxFQUFFLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRTtLQUN0RTtJQUNELDRDQUE0QztJQUM1QztRQUNDLFVBQVUsRUFBRSxjQUFjO1FBQzFCLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLE1BQU0sRUFBRSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUU7S0FDdEU7SUFDRCw0Q0FBNEM7SUFDNUM7UUFDQyxVQUFVLEVBQUUsY0FBYztRQUMxQixTQUFTLEVBQUUsV0FBVztRQUN0QixNQUFNLEVBQUUsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO0tBQ3RFO0NBQ0QsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRztJQUM5QjtRQUNDLFVBQVUsRUFBRSxvQ0FBb0M7UUFDaEQsU0FBUyxFQUFFLFdBQVc7UUFDdEIsTUFBTSxFQUFFO1lBQ1AsWUFBWSxFQUFFLFlBQVksQ0FBQyxhQUFhO1lBQ3hDLFVBQVUsRUFBRSxLQUFLO1NBQ2pCO0tBQ0Q7SUFDRDtRQUNDLFVBQVUsRUFBRSxvQ0FBb0M7UUFDaEQsTUFBTSxFQUFFO1lBQ1AsWUFBWSxFQUFFLFlBQVksQ0FBQyxJQUFJO1lBQy9CLFVBQVUsRUFBRSxLQUFLO1NBQ2pCO0tBQ0Q7SUFDRDtRQUNDLFVBQVUsRUFBRSwwQ0FBMEM7UUFDdEQsTUFBTSxFQUFFO1lBQ1AsWUFBWSxFQUFFLFlBQVksQ0FBQyxJQUFJO1lBQy9CLFVBQVUsRUFBRSxJQUFJO1NBQ2hCO0tBQ0Q7SUFDRDtRQUNDLFVBQVUsRUFBRSx5QkFBeUI7UUFDckMsTUFBTSxFQUFFO1lBQ1AsWUFBWSxFQUFFLFlBQVksQ0FBQyxJQUFJO1lBQy9CLFVBQVUsRUFBRSxDQUFDO1NBQ2I7S0FDRDtJQUNEO1FBQ0MsVUFBVSxFQUFFLGdDQUFnQztRQUM1QyxNQUFNLEVBQUU7WUFDUCxZQUFZLEVBQUUsWUFBWSxDQUFDLElBQUk7WUFDL0IsVUFBVSxFQUFFLENBQUM7U0FDYjtLQUNEO0lBQ0Q7UUFDQyxVQUFVLEVBQUUsd0JBQXdCO1FBQ3BDLGdCQUFnQixFQUFFLDJEQUEyRDtRQUM3RSxNQUFNLEVBQUU7WUFDUCxZQUFZLEVBQUUsWUFBWSxDQUFDLE9BQU87U0FDbEM7S0FDRDtDQUNELENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUc7SUFDOUI7UUFDQyxnQkFBZ0IsRUFBRSxvREFBb0Q7UUFDdEUsVUFBVSxFQUFFLHdCQUF3QjtRQUNwQyxNQUFNLEVBQUU7WUFDUCxZQUFZLEVBQUUsWUFBWSxDQUFDLE9BQU87U0FDbEM7S0FDRDtDQUNELENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRztJQUMvQjtRQUNDLFVBQVUsRUFBRSxrS0FBa0s7UUFDOUssU0FBUyxFQUFFLCtCQUErQjtRQUMxQyxNQUFNLEVBQUU7WUFDUCxZQUFZLEVBQUUsWUFBWSxDQUFDLGFBQWE7U0FDeEM7S0FDRDtJQUNEO1FBQ0MsVUFBVSxFQUFFLGtLQUFrSztRQUM5SyxNQUFNLEVBQUU7WUFDUCxZQUFZLEVBQUUsWUFBWSxDQUFDLE1BQU07U0FDakM7S0FDRDtDQUNELENBQUM7QUFFRjs7Ozs7OztFQU9FIn0=