/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { renderFormattedText, renderText } from '../../browser/formattedTextRenderer.js';
import { DisposableStore } from '../../common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('FormattedTextRenderer', () => {
    const store = new DisposableStore();
    setup(() => {
        store.clear();
    });
    teardown(() => {
        store.clear();
    });
    test('render simple element', () => {
        const result = renderText('testing');
        assert.strictEqual(result.nodeType, document.ELEMENT_NODE);
        assert.strictEqual(result.textContent, 'testing');
        assert.strictEqual(result.tagName, 'DIV');
    });
    test('render element with class', () => {
        const result = renderText('testing', {
            className: 'testClass'
        });
        assert.strictEqual(result.nodeType, document.ELEMENT_NODE);
        assert.strictEqual(result.className, 'testClass');
    });
    test('simple formatting', () => {
        let result = renderFormattedText('**bold**');
        assert.strictEqual(result.children.length, 1);
        assert.strictEqual(result.firstChild.textContent, 'bold');
        assert.strictEqual(result.firstChild.tagName, 'B');
        assert.strictEqual(result.innerHTML, '<b>bold</b>');
        result = renderFormattedText('__italics__');
        assert.strictEqual(result.innerHTML, '<i>italics</i>');
        result = renderFormattedText('``code``');
        assert.strictEqual(result.innerHTML, '``code``');
        result = renderFormattedText('``code``', { renderCodeSegments: true });
        assert.strictEqual(result.innerHTML, '<code>code</code>');
        result = renderFormattedText('this string has **bold**, __italics__, and ``code``!!', { renderCodeSegments: true });
        assert.strictEqual(result.innerHTML, 'this string has <b>bold</b>, <i>italics</i>, and <code>code</code>!!');
    });
    test('no formatting', () => {
        const result = renderFormattedText('this is just a string');
        assert.strictEqual(result.innerHTML, 'this is just a string');
    });
    test('preserve newlines', () => {
        const result = renderFormattedText('line one\nline two');
        assert.strictEqual(result.innerHTML, 'line one<br>line two');
    });
    test('action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('[[action]]', {
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store
            }
        });
        assert.strictEqual(result.innerHTML, '<a>action</a>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('fancy action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('__**[[action]]**__', {
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store
            }
        });
        assert.strictEqual(result.innerHTML, '<i><b><a>action</a></b></i>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.firstChild.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('fancier action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('``__**[[action]]**__``', {
            renderCodeSegments: true,
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store
            }
        });
        assert.strictEqual(result.innerHTML, '<code><i><b><a>action</a></b></i></code>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.firstChild.firstChild.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('escaped formatting', () => {
        const result = renderFormattedText('\\*\\*bold\\*\\*');
        assert.strictEqual(result.children.length, 0);
        assert.strictEqual(result.innerHTML, '**bold**');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGVkVGV4dFJlbmRlcmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvZm9ybWF0dGVkVGV4dFJlbmRlcmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFN0UsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBRXBDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDZixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDZixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxNQUFNLEdBQWdCLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUs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