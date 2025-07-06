/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from './dom.js';
export function renderText(text, options = {}) {
    const element = createElement(options);
    element.textContent = text;
    return element;
}
export function renderFormattedText(formattedText, options = {}) {
    const element = createElement(options);
    _renderFormattedText(element, parseFormattedText(formattedText, !!options.renderCodeSegments), options.actionHandler, options.renderCodeSegments);
    return element;
}
export function createElement(options) {
    const tagName = options.inline ? 'span' : 'div';
    const element = document.createElement(tagName);
    if (options.className) {
        element.className = options.className;
    }
    return element;
}
class StringStream {
    constructor(source) {
        this.source = source;
        this.index = 0;
    }
    eos() {
        return this.index >= this.source.length;
    }
    next() {
        const next = this.peek();
        this.advance();
        return next;
    }
    peek() {
        return this.source[this.index];
    }
    advance() {
        this.index++;
    }
}
var FormatType;
(function (FormatType) {
    FormatType[FormatType["Invalid"] = 0] = "Invalid";
    FormatType[FormatType["Root"] = 1] = "Root";
    FormatType[FormatType["Text"] = 2] = "Text";
    FormatType[FormatType["Bold"] = 3] = "Bold";
    FormatType[FormatType["Italics"] = 4] = "Italics";
    FormatType[FormatType["Action"] = 5] = "Action";
    FormatType[FormatType["ActionClose"] = 6] = "ActionClose";
    FormatType[FormatType["Code"] = 7] = "Code";
    FormatType[FormatType["NewLine"] = 8] = "NewLine";
})(FormatType || (FormatType = {}));
function _renderFormattedText(element, treeNode, actionHandler, renderCodeSegments) {
    let child;
    if (treeNode.type === 2 /* FormatType.Text */) {
        child = document.createTextNode(treeNode.content || '');
    }
    else if (treeNode.type === 3 /* FormatType.Bold */) {
        child = document.createElement('b');
    }
    else if (treeNode.type === 4 /* FormatType.Italics */) {
        child = document.createElement('i');
    }
    else if (treeNode.type === 7 /* FormatType.Code */ && renderCodeSegments) {
        child = document.createElement('code');
    }
    else if (treeNode.type === 5 /* FormatType.Action */ && actionHandler) {
        const a = document.createElement('a');
        actionHandler.disposables.add(DOM.addStandardDisposableListener(a, 'click', (event) => {
            actionHandler.callback(String(treeNode.index), event);
        }));
        child = a;
    }
    else if (treeNode.type === 8 /* FormatType.NewLine */) {
        child = document.createElement('br');
    }
    else if (treeNode.type === 1 /* FormatType.Root */) {
        child = element;
    }
    if (child && element !== child) {
        element.appendChild(child);
    }
    if (child && Array.isArray(treeNode.children)) {
        treeNode.children.forEach((nodeChild) => {
            _renderFormattedText(child, nodeChild, actionHandler, renderCodeSegments);
        });
    }
}
function parseFormattedText(content, parseCodeSegments) {
    const root = {
        type: 1 /* FormatType.Root */,
        children: []
    };
    let actionViewItemIndex = 0;
    let current = root;
    const stack = [];
    const stream = new StringStream(content);
    while (!stream.eos()) {
        let next = stream.next();
        const isEscapedFormatType = (next === '\\' && formatTagType(stream.peek(), parseCodeSegments) !== 0 /* FormatType.Invalid */);
        if (isEscapedFormatType) {
            next = stream.next(); // unread the backslash if it escapes a format tag type
        }
        if (!isEscapedFormatType && isFormatTag(next, parseCodeSegments) && next === stream.peek()) {
            stream.advance();
            if (current.type === 2 /* FormatType.Text */) {
                current = stack.pop();
            }
            const type = formatTagType(next, parseCodeSegments);
            if (current.type === type || (current.type === 5 /* FormatType.Action */ && type === 6 /* FormatType.ActionClose */)) {
                current = stack.pop();
            }
            else {
                const newCurrent = {
                    type: type,
                    children: []
                };
                if (type === 5 /* FormatType.Action */) {
                    newCurrent.index = actionViewItemIndex;
                    actionViewItemIndex++;
                }
                current.children.push(newCurrent);
                stack.push(current);
                current = newCurrent;
            }
        }
        else if (next === '\n') {
            if (current.type === 2 /* FormatType.Text */) {
                current = stack.pop();
            }
            current.children.push({
                type: 8 /* FormatType.NewLine */
            });
        }
        else {
            if (current.type !== 2 /* FormatType.Text */) {
                const textCurrent = {
                    type: 2 /* FormatType.Text */,
                    content: next
                };
                current.children.push(textCurrent);
                stack.push(current);
                current = textCurrent;
            }
            else {
                current.content += next;
            }
        }
    }
    if (current.type === 2 /* FormatType.Text */) {
        current = stack.pop();
    }
    if (stack.length) {
        // incorrectly formatted string literal
    }
    return root;
}
function isFormatTag(char, supportCodeSegments) {
    return formatTagType(char, supportCodeSegments) !== 0 /* FormatType.Invalid */;
}
function formatTagType(char, supportCodeSegments) {
    switch (char) {
        case '*':
            return 3 /* FormatType.Bold */;
        case '_':
            return 4 /* FormatType.Italics */;
        case '[':
            return 5 /* FormatType.Action */;
        case ']':
            return 6 /* FormatType.ActionClose */;
        case '`':
            return supportCodeSegments ? 7 /* FormatType.Code */ : 0 /* FormatType.Invalid */;
        default:
            return 0 /* FormatType.Invalid */;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGVkVGV4dFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2Zvcm1hdHRlZFRleHRSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQztBQWlCaEMsTUFBTSxVQUFVLFVBQVUsQ0FBQyxJQUFZLEVBQUUsVUFBc0MsRUFBRTtJQUNoRixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsT0FBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDM0IsT0FBTyxPQUFPLENBQUM7QUFDaEIsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxhQUFxQixFQUFFLFVBQXNDLEVBQUU7SUFDbEcsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDbEosT0FBTyxPQUFPLENBQUM7QUFDaEIsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQUMsT0FBbUM7SUFDaEUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDaEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN2QixPQUFPLENBQUMsU0FB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