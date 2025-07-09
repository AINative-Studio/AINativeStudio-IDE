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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGVkVGV4dFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9mb3JtYXR0ZWRUZXh0UmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLENBQUM7QUFpQmhDLE1BQU0sVUFBVSxVQUFVLENBQUMsSUFBWSxFQUFFLFVBQXNDLEVBQUU7SUFDaEYsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQzNCLE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsYUFBcUIsRUFBRSxVQUFzQyxFQUFFO0lBQ2xHLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsRUFBRSxPQUFPLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2xKLE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLE9BQW1DO0lBQ2hFLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2hELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEQsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdkIsT0FBTyxDQUFDLFNB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