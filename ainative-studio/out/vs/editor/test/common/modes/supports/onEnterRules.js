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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25FbnRlclJ1bGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9zdXBwb3J0cy9vbkVudGVyUnVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXJGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHO0lBQ3JDO1FBQ0MsZ0JBQWdCO1FBQ2hCLFVBQVUsRUFBRSxvQ0FBb0M7UUFDaEQsU0FBUyxFQUFFLFdBQVc7UUFDdEIsTUFBTSxFQUFFLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtLQUN2RSxFQUFFO1FBQ0YsZ0JBQWdCO1FBQ2hCLFVBQVUsRUFBRSxvQ0FBb0M7UUFDaEQsTUFBTSxFQUFFLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtLQUM5RCxFQUFFO1FBQ0YsZUFBZTtRQUNmLFVBQVUsRUFBRSx5Q0FBeUM7UUFDckQsZ0JBQWdCLEVBQUUsMENBQTBDO1FBQzVELE1BQU0sRUFBRSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUU7S0FDN0QsRUFBRTtRQUNGLFlBQVk7UUFDWixVQUFVLEVBQUUsdUJBQXVCO1FBQ25DLE1BQU0sRUFBRSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUU7S0FDMUQ7SUFDRDtRQUNDLGtCQUFrQjtRQUNsQixVQUFVLEVBQUUsOEJBQThCO1FBQzFDLE1BQU0sRUFBRSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLFVB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