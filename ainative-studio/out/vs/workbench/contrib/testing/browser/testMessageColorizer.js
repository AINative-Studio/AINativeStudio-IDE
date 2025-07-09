/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { renderStringAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { GraphemeIterator, forAnsiStringParts, removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import './media/testMessageColorizer.css';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
const colorAttrRe = /^\x1b\[([0-9]+)m$/;
var Classes;
(function (Classes) {
    Classes["Prefix"] = "tstm-ansidec-";
    Classes["ForegroundPrefix"] = "tstm-ansidec-fg";
    Classes["BackgroundPrefix"] = "tstm-ansidec-bg";
    Classes["Bold"] = "tstm-ansidec-1";
    Classes["Faint"] = "tstm-ansidec-2";
    Classes["Italic"] = "tstm-ansidec-3";
    Classes["Underline"] = "tstm-ansidec-4";
})(Classes || (Classes = {}));
export const renderTestMessageAsText = (tm) => typeof tm === 'string' ? removeAnsiEscapeCodes(tm) : renderStringAsPlaintext(tm);
/**
 * Applies decorations based on ANSI styles from the test message in the editor.
 * ANSI sequences are stripped from the text displayed in editor, and this
 * re-applies their colorization.
 *
 * This uses decorations rather than language features because the string
 * rendered in the editor lacks the ANSI codes needed to actually apply the
 * colorization.
 *
 * Note: does not support TrueColor.
 */
export const colorizeTestMessageInEditor = (message, editor) => {
    const decos = [];
    editor.changeDecorations(changeAccessor => {
        let start = new Position(1, 1);
        let cls = [];
        for (const part of forAnsiStringParts(message)) {
            if (part.isCode) {
                const colorAttr = colorAttrRe.exec(part.str)?.[1];
                if (!colorAttr) {
                    continue;
                }
                const n = Number(colorAttr);
                if (n === 0) {
                    cls.length = 0;
                }
                else if (n === 22) {
                    cls = cls.filter(c => c !== "tstm-ansidec-1" /* Classes.Bold */ && c !== "tstm-ansidec-3" /* Classes.Italic */);
                }
                else if (n === 23) {
                    cls = cls.filter(c => c !== "tstm-ansidec-3" /* Classes.Italic */);
                }
                else if (n === 24) {
                    cls = cls.filter(c => c !== "tstm-ansidec-4" /* Classes.Underline */);
                }
                else if ((n >= 30 && n <= 39) || (n >= 90 && n <= 99)) {
                    cls = cls.filter(c => !c.startsWith("tstm-ansidec-fg" /* Classes.ForegroundPrefix */));
                    cls.push("tstm-ansidec-fg" /* Classes.ForegroundPrefix */ + colorAttr);
                }
                else if ((n >= 40 && n <= 49) || (n >= 100 && n <= 109)) {
                    cls = cls.filter(c => !c.startsWith("tstm-ansidec-bg" /* Classes.BackgroundPrefix */));
                    cls.push("tstm-ansidec-bg" /* Classes.BackgroundPrefix */ + colorAttr);
                }
                else {
                    cls.push("tstm-ansidec-" /* Classes.Prefix */ + colorAttr);
                }
            }
            else {
                let line = start.lineNumber;
                let col = start.column;
                const graphemes = new GraphemeIterator(part.str);
                for (let i = 0; !graphemes.eol(); i += graphemes.nextGraphemeLength()) {
                    if (part.str[i] === '\n') {
                        line++;
                        col = 1;
                    }
                    else {
                        col++;
                    }
                }
                const end = new Position(line, col);
                if (cls.length) {
                    decos.push(changeAccessor.addDecoration(Range.fromPositions(start, end), {
                        inlineClassName: cls.join(' '),
                        description: 'test-message-colorized',
                    }));
                }
                start = end;
            }
        }
    });
    return toDisposable(() => editor.removeDecorations(decos));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE1lc3NhZ2VDb2xvcml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RNZXNzYWdlQ29sb3JpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXZGLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqSCxPQUFPLGtDQUFrQyxDQUFDO0FBRTFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFaEUsTUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUM7QUFFeEMsSUFBVyxPQVFWO0FBUkQsV0FBVyxPQUFPO0lBQ2pCLG1DQUF3QixDQUFBO0lBQ3hCLCtDQUF3QyxDQUFBO0lBQ3hDLCtDQUF3QyxDQUFBO0lBQ3hDLGtDQUEyQixDQUFBO0lBQzNCLG1DQUE0QixDQUFBO0lBQzVCLG9DQUE2QixDQUFBO0lBQzdCLHVDQUFnQyxDQUFBO0FBQ2pDLENBQUMsRUFSVSxPQUFPLEtBQVAsT0FBTyxRQVFqQjtBQUVELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLENBQUMsRUFBNEIsRUFBRSxFQUFFLENBQ3ZFLE9BQU8sRUFBRSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBR2xGOzs7Ozs7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