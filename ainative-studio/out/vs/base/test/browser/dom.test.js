/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { $, h, multibyteAwareBtoa, trackAttributes, copyAttributes, disposableWindowInterval, getWindows, getWindowsCount, getWindowId, getWindowById, hasWindow, getWindow, getDocument, isHTMLElement, SafeTriangle } from '../../browser/dom.js';
import { asCssValueWithDefault } from '../../../base/browser/cssValue.js';
import { ensureCodeWindow, isAuxiliaryWindow, mainWindow } from '../../browser/window.js';
import { DeferredPromise, timeout } from '../../common/async.js';
import { runWithFakedTimers } from '../common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('dom', () => {
    test('hasClass', () => {
        const element = document.createElement('div');
        element.className = 'foobar boo far';
        assert(element.classList.contains('foobar'));
        assert(element.classList.contains('boo'));
        assert(element.classList.contains('far'));
        assert(!element.classList.contains('bar'));
        assert(!element.classList.contains('foo'));
        assert(!element.classList.contains(''));
    });
    test('removeClass', () => {
        let element = document.createElement('div');
        element.className = 'foobar boo far';
        element.classList.remove('boo');
        assert(element.classList.contains('far'));
        assert(!element.classList.contains('boo'));
        assert(element.classList.contains('foobar'));
        assert.strictEqual(element.className, 'foobar far');
        element = document.createElement('div');
        element.className = 'foobar boo far';
        element.classList.remove('far');
        assert(!element.classList.contains('far'));
        assert(element.classList.contains('boo'));
        assert(element.classList.contains('foobar'));
        assert.strictEqual(element.className, 'foobar boo');
        element.classList.remove('boo');
        assert(!element.classList.contains('far'));
        assert(!element.classList.contains('boo'));
        assert(element.classList.contains('foobar'));
        assert.strictEqual(element.className, 'foobar');
        element.classList.remove('foobar');
        assert(!element.classList.contains('far'));
        assert(!element.classList.contains('boo'));
        assert(!element.classList.contains('foobar'));
        assert.strictEqual(element.className, '');
    });
    test('removeClass should consider hyphens', function () {
        const element = document.createElement('div');
        element.classList.add('foo-bar');
        element.classList.add('bar');
        assert(element.classList.contains('foo-bar'));
        assert(element.classList.contains('bar'));
        element.classList.remove('bar');
        assert(element.classList.contains('foo-bar'));
        assert(!element.classList.contains('bar'));
        element.classList.remove('foo-bar');
        assert(!element.classList.contains('foo-bar'));
        assert(!element.classList.contains('bar'));
    });
    test('multibyteAwareBtoa', () => {
        assert.ok(multibyteAwareBtoa('hello world').length > 0);
        assert.ok(multibyteAwareBtoa('平仮名').length > 0);
        assert.ok(multibyteAwareBtoa(new Array(100000).fill('vs').join('')).length > 0); // https://github.com/microsoft/vscode/issues/112013
    });
    suite('$', () => {
        test('should build simple nodes', () => {
            const div = $('div');
            assert(div);
            assert(isHTMLElement(div));
            assert.strictEqual(div.tagName, 'DIV');
            assert(!div.firstChild);
        });
        test('should build nodes with id', () => {
            const div = $('div#foo');
            assert(div);
            assert(isHTMLElement(div));
            assert.strictEqual(div.tagName, 'DIV');
            assert.strictEqual(div.id, 'foo');
        });
        test('should build nodes with class-name', () => {
            const div = $('div.foo');
            assert(div);
            assert(isHTMLElement(div));
            assert.strictEqual(div.tagName, 'DIV');
            assert.strictEqual(div.className, 'foo');
        });
        test('should build nodes with attributes', () => {
            let div = $('div', { class: 'test' });
            assert.strictEqual(div.className, 'test');
            div = $('div', undefined);
            assert.strictEqual(div.className, '');
        });
        test('should build nodes with children', () => {
            let div = $('div', undefined, $('span', { id: 'demospan' }));
            const firstChild = div.firstChild;
            assert.strictEqual(firstChild.tagName, 'SPAN');
            assert.strictEqual(firstChild.id, 'demospan');
            div = $('div', undefined, 'hello');
            assert.strictEqual(div.firstChild && div.firstChild.textContent, 'hello');
        });
        test('should build nodes with text children', () => {
            const div = $('div', undefined, 'foobar');
            const firstChild = div.firstChild;
            assert.strictEqual(firstChild.tagName, undefined);
            assert.strictEqual(firstChild.textContent, 'foobar');
        });
    });
    suite('h', () => {
        test('should build simple nodes', () => {
            const div = h('div');
            assert(isHTMLElement(div.root));
            assert.strictEqual(div.root.tagName, 'DIV');
            const span = h('span');
            assert(isHTMLElement(span.root));
            assert.strictEqual(span.root.tagName, 'SPAN');
            const img = h('img');
            assert(isHTMLElement(img.root));
            assert.strictEqual(img.root.tagName, 'IMG');
        });
        test('should handle ids and classes', () => {
            const divId = h('div#myid');
            assert.strictEqual(divId.root.tagName, 'DIV');
            assert.strictEqual(divId.root.id, 'myid');
            const divClass = h('div.a');
            assert.strictEqual(divClass.root.tagName, 'DIV');
            assert.strictEqual(divClass.root.classList.length, 1);
            assert(divClass.root.classList.contains('a'));
            const divClasses = h('div.a.b.c');
            assert.strictEqual(divClasses.root.tagName, 'DIV');
            assert.strictEqual(divClasses.root.classList.length, 3);
            assert(divClasses.root.classList.contains('a'));
            assert(divClasses.root.classList.contains('b'));
            assert(divClasses.root.classList.contains('c'));
            const divAll = h('div#myid.a.b.c');
            assert.strictEqual(divAll.root.tagName, 'DIV');
            assert.strictEqual(divAll.root.id, 'myid');
            assert.strictEqual(divAll.root.classList.length, 3);
            assert(divAll.root.classList.contains('a'));
            assert(divAll.root.classList.contains('b'));
            assert(divAll.root.classList.contains('c'));
            const spanId = h('span#myid');
            assert.strictEqual(spanId.root.tagName, 'SPAN');
            assert.strictEqual(spanId.root.id, 'myid');
            const spanClass = h('span.a');
            assert.strictEqual(spanClass.root.tagName, 'SPAN');
            assert.strictEqual(spanClass.root.classList.length, 1);
            assert(spanClass.root.classList.contains('a'));
            const spanClasses = h('span.a.b.c');
            assert.strictEqual(spanClasses.root.tagName, 'SPAN');
            assert.strictEqual(spanClasses.root.classList.length, 3);
            assert(spanClasses.root.classList.contains('a'));
            assert(spanClasses.root.classList.contains('b'));
            assert(spanClasses.root.classList.contains('c'));
            const spanAll = h('span#myid.a.b.c');
            assert.strictEqual(spanAll.root.tagName, 'SPAN');
            assert.strictEqual(spanAll.root.id, 'myid');
            assert.strictEqual(spanAll.root.classList.length, 3);
            assert(spanAll.root.classList.contains('a'));
            assert(spanAll.root.classList.contains('b'));
            assert(spanAll.root.classList.contains('c'));
        });
        test('should implicitly handle ids and classes', () => {
            const divId = h('#myid');
            assert.strictEqual(divId.root.tagName, 'DIV');
            assert.strictEqual(divId.root.id, 'myid');
            const divClass = h('.a');
            assert.strictEqual(divClass.root.tagName, 'DIV');
            assert.strictEqual(divClass.root.classList.length, 1);
            assert(divClass.root.classList.contains('a'));
            const divClasses = h('.a.b.c');
            assert.strictEqual(divClasses.root.tagName, 'DIV');
            assert.strictEqual(divClasses.root.classList.length, 3);
            assert(divClasses.root.classList.contains('a'));
            assert(divClasses.root.classList.contains('b'));
            assert(divClasses.root.classList.contains('c'));
            const divAll = h('#myid.a.b.c');
            assert.strictEqual(divAll.root.tagName, 'DIV');
            assert.strictEqual(divAll.root.id, 'myid');
            assert.strictEqual(divAll.root.classList.length, 3);
            assert(divAll.root.classList.contains('a'));
            assert(divAll.root.classList.contains('b'));
            assert(divAll.root.classList.contains('c'));
        });
        test('should handle @ identifiers', () => {
            const implicit = h('@el');
            assert.strictEqual(implicit.root, implicit.el);
            assert.strictEqual(implicit.el.tagName, 'DIV');
            const explicit = h('div@el');
            assert.strictEqual(explicit.root, explicit.el);
            assert.strictEqual(explicit.el.tagName, 'DIV');
            const implicitId = h('#myid@el');
            assert.strictEqual(implicitId.root, implicitId.el);
            assert.strictEqual(implicitId.el.tagName, 'DIV');
            assert.strictEqual(implicitId.root.id, 'myid');
            const explicitId = h('div#myid@el');
            assert.strictEqual(explicitId.root, explicitId.el);
            assert.strictEqual(explicitId.el.tagName, 'DIV');
            assert.strictEqual(explicitId.root.id, 'myid');
            const implicitClass = h('.a@el');
            assert.strictEqual(implicitClass.root, implicitClass.el);
            assert.strictEqual(implicitClass.el.tagName, 'DIV');
            assert.strictEqual(implicitClass.root.classList.length, 1);
            assert(implicitClass.root.classList.contains('a'));
            const explicitClass = h('div.a@el');
            assert.strictEqual(explicitClass.root, explicitClass.el);
            assert.strictEqual(explicitClass.el.tagName, 'DIV');
            assert.strictEqual(explicitClass.root.classList.length, 1);
            assert(explicitClass.root.classList.contains('a'));
        });
    });
    test('should recurse', () => {
        const result = h('div.code-view', [
            h('div.title@title'),
            h('div.container', [
                h('div.gutter@gutterDiv'),
                h('span@editor'),
            ]),
        ]);
        assert.strictEqual(result.root.tagName, 'DIV');
        assert.strictEqual(result.root.className, 'code-view');
        assert.strictEqual(result.root.childElementCount, 2);
        assert.strictEqual(result.root.firstElementChild, result.title);
        assert.strictEqual(result.title.tagName, 'DIV');
        assert.strictEqual(result.title.className, 'title');
        assert.strictEqual(result.title.childElementCount, 0);
        assert.strictEqual(result.gutterDiv.tagName, 'DIV');
        assert.strictEqual(result.gutterDiv.className, 'gutter');
        assert.strictEqual(result.gutterDiv.childElementCount, 0);
        assert.strictEqual(result.editor.tagName, 'SPAN');
        assert.strictEqual(result.editor.className, '');
        assert.strictEqual(result.editor.childElementCount, 0);
    });
    test('cssValueWithDefault', () => {
        assert.strictEqual(asCssValueWithDefault('red', 'blue'), 'red');
        assert.strictEqual(asCssValueWithDefault(undefined, 'blue'), 'blue');
        assert.strictEqual(asCssValueWithDefault('var(--my-var)', 'blue'), 'var(--my-var, blue)');
        assert.strictEqual(asCssValueWithDefault('var(--my-var, red)', 'blue'), 'var(--my-var, red)');
        assert.strictEqual(asCssValueWithDefault('var(--my-var, var(--my-var2))', 'blue'), 'var(--my-var, var(--my-var2, blue))');
    });
    test('copyAttributes', () => {
        const elementSource = document.createElement('div');
        elementSource.setAttribute('foo', 'bar');
        elementSource.setAttribute('bar', 'foo');
        const elementTarget = document.createElement('div');
        copyAttributes(elementSource, elementTarget);
        assert.strictEqual(elementTarget.getAttribute('foo'), 'bar');
        assert.strictEqual(elementTarget.getAttribute('bar'), 'foo');
    });
    test('trackAttributes (unfiltered)', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const elementSource = document.createElement('div');
            const elementTarget = document.createElement('div');
            const disposable = trackAttributes(elementSource, elementTarget);
            elementSource.setAttribute('foo', 'bar');
            elementSource.setAttribute('bar', 'foo');
            await timeout(1);
            assert.strictEqual(elementTarget.getAttribute('foo'), 'bar');
            assert.strictEqual(elementTarget.getAttribute('bar'), 'foo');
            disposable.dispose();
        });
    });
    test('trackAttributes (filtered)', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const elementSource = document.createElement('div');
            const elementTarget = document.createElement('div');
            const disposable = trackAttributes(elementSource, elementTarget, ['foo']);
            elementSource.setAttribute('foo', 'bar');
            elementSource.setAttribute('bar', 'foo');
            await timeout(1);
            assert.strictEqual(elementTarget.getAttribute('foo'), 'bar');
            assert.strictEqual(elementTarget.getAttribute('bar'), null);
            disposable.dispose();
        });
    });
    test('window utilities', () => {
        const windows = Array.from(getWindows());
        assert.strictEqual(windows.length, 1);
        assert.strictEqual(getWindowsCount(), 1);
        const windowId = getWindowId(mainWindow);
        assert.ok(typeof windowId === 'number');
        assert.strictEqual(getWindowById(windowId)?.window, mainWindow);
        assert.strictEqual(getWindowById(undefined, true).window, mainWindow);
        assert.strictEqual(hasWindow(windowId), true);
        assert.strictEqual(isAuxiliaryWindow(mainWindow), false);
        ensureCodeWindow(mainWindow, 1);
        assert.ok(typeof mainWindow.vscodeWindowId === 'number');
        const div = document.createElement('div');
        assert.strictEqual(getWindow(div), mainWindow);
        assert.strictEqual(getDocument(div), mainWindow.document);
        const event = document.createEvent('MouseEvent');
        assert.strictEqual(getWindow(event), mainWindow);
        assert.strictEqual(getDocument(event), mainWindow.document);
    });
    suite('disposableWindowInterval', () => {
        test('basics', async () => {
            let count = 0;
            const promise = new DeferredPromise();
            const interval = disposableWindowInterval(mainWindow, () => {
                count++;
                if (count === 3) {
                    promise.complete(undefined);
                    return true;
                }
                else {
                    return false;
                }
            }, 0, 10);
            await promise.p;
            assert.strictEqual(count, 3);
            interval.dispose();
        });
        test('iterations', async () => {
            let count = 0;
            const interval = disposableWindowInterval(mainWindow, () => {
                count++;
                return false;
            }, 0, 0);
            await timeout(5);
            assert.strictEqual(count, 0);
            interval.dispose();
        });
        test('dispose', async () => {
            let count = 0;
            const interval = disposableWindowInterval(mainWindow, () => {
                count++;
                return false;
            }, 0, 10);
            interval.dispose();
            await timeout(5);
            assert.strictEqual(count, 0);
        });
    });
    suite('SafeTriangle', () => {
        const fakeElement = (left, right, top, bottom) => {
            return { getBoundingClientRect: () => ({ left, right, top, bottom }) };
        };
        test('works', () => {
            const safeTriangle = new SafeTriangle(0, 0, fakeElement(10, 20, 10, 20));
            assert.strictEqual(safeTriangle.contains(5, 5), true); // in triangle region
            assert.strictEqual(safeTriangle.contains(15, 5), false);
            assert.strictEqual(safeTriangle.contains(25, 5), false);
            assert.strictEqual(safeTriangle.contains(5, 15), false);
            assert.strictEqual(safeTriangle.contains(15, 15), true);
            assert.strictEqual(safeTriangle.contains(25, 15), false);
            assert.strictEqual(safeTriangle.contains(5, 25), false);
            assert.strictEqual(safeTriangle.contains(15, 25), false);
            assert.strictEqual(safeTriangle.contains(25, 25), false);
        });
        test('other dirations', () => {
            const a = new SafeTriangle(30, 30, fakeElement(10, 20, 10, 20));
            assert.strictEqual(a.contains(25, 25), true);
            const b = new SafeTriangle(0, 30, fakeElement(10, 20, 10, 20));
            assert.strictEqual(b.contains(5, 25), true);
            const c = new SafeTriangle(30, 0, fakeElement(10, 20, 10, 20));
            assert.strictEqual(c.contains(25, 5), true);
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvZG9tLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNwUCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU3RSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtJQUNqQixJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUVyQixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUM7UUFFckMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUV4QixJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsZ0JBQWdCLENBQUM7UUFFckMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFcEQsT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQztRQUVyQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVwRCxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRWhELE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFD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