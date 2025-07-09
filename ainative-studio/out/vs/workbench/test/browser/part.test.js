/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Part } from '../../browser/part.js';
import { isEmptyObject } from '../../../base/common/types.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { append, $, hide } from '../../../base/browser/dom.js';
import { TestLayoutService } from './workbenchTestServices.js';
import { TestStorageService } from '../common/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { mainWindow } from '../../../base/browser/window.js';
suite('Workbench parts', () => {
    const disposables = new DisposableStore();
    class SimplePart extends Part {
        constructor() {
            super(...arguments);
            this.minimumWidth = 50;
            this.maximumWidth = 50;
            this.minimumHeight = 50;
            this.maximumHeight = 50;
        }
        layout(width, height) {
            throw new Error('Method not implemented.');
        }
        toJSON() {
            throw new Error('Method not implemented.');
        }
    }
    class MyPart extends SimplePart {
        constructor(expectedParent) {
            super('myPart', { hasTitle: true }, new TestThemeService(), disposables.add(new TestStorageService()), new TestLayoutService());
            this.expectedParent = expectedParent;
        }
        createTitleArea(parent) {
            assert.strictEqual(parent, this.expectedParent);
            return super.createTitleArea(parent);
        }
        createContentArea(parent) {
            assert.strictEqual(parent, this.expectedParent);
            return super.createContentArea(parent);
        }
        testGetMemento(scope, target) {
            return super.getMemento(scope, target);
        }
        testSaveState() {
            return super.saveState();
        }
    }
    class MyPart2 extends SimplePart {
        constructor() {
            super('myPart2', { hasTitle: true }, new TestThemeService(), disposables.add(new TestStorageService()), new TestLayoutService());
        }
        createTitleArea(parent) {
            const titleContainer = append(parent, $('div'));
            const titleLabel = append(titleContainer, $('span'));
            titleLabel.id = 'myPart.title';
            titleLabel.innerText = 'Title';
            return titleContainer;
        }
        createContentArea(parent) {
            const contentContainer = append(parent, $('div'));
            const contentSpan = append(contentContainer, $('span'));
            contentSpan.id = 'myPart.content';
            contentSpan.innerText = 'Content';
            return contentContainer;
        }
    }
    class MyPart3 extends SimplePart {
        constructor() {
            super('myPart2', { hasTitle: false }, new TestThemeService(), disposables.add(new TestStorageService()), new TestLayoutService());
        }
        createTitleArea(parent) {
            return null;
        }
        createContentArea(parent) {
            const contentContainer = append(parent, $('div'));
            const contentSpan = append(contentContainer, $('span'));
            contentSpan.id = 'myPart.content';
            contentSpan.innerText = 'Content';
            return contentContainer;
        }
    }
    let fixture;
    const fixtureId = 'workbench-part-fixture';
    setup(() => {
        fixture = document.createElement('div');
        fixture.id = fixtureId;
        mainWindow.document.body.appendChild(fixture);
    });
    teardown(() => {
        fixture.remove();
        disposables.clear();
    });
    test('Creation', () => {
        const b = document.createElement('div');
        mainWindow.document.getElementById(fixtureId).appendChild(b);
        hide(b);
        let part = disposables.add(new MyPart(b));
        part.create(b);
        assert.strictEqual(part.getId(), 'myPart');
        // Memento
        let memento = part.testGetMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'bar';
        memento.bar = [1, 2, 3];
        part.testSaveState();
        // Re-Create to assert memento contents
        part = disposables.add(new MyPart(b));
        memento = part.testGetMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        assert.strictEqual(memento.foo, 'bar');
        assert.strictEqual(memento.bar.length, 3);
        // Empty Memento stores empty object
        delete memento.foo;
        delete memento.bar;
        part.testSaveState();
        part = disposables.add(new MyPart(b));
        memento = part.testGetMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        assert.strictEqual(isEmptyObject(memento), true);
    });
    test('Part Layout with Title and Content', function () {
        const b = document.createElement('div');
        mainWindow.document.getElementById(fixtureId).appendChild(b);
        hide(b);
        const part = disposables.add(new MyPart2());
        part.create(b);
        assert(mainWindow.document.getElementById('myPart.title'));
        assert(mainWindow.document.getElementById('myPart.content'));
    });
    test('Part Layout with Content only', function () {
        const b = document.createElement('div');
        mainWindow.document.getElementById(fixtureId).appendChild(b);
        hide(b);
        const part = disposables.add(new MyPart3());
        part.create(b);
        assert(!mainWindow.document.getElementById('myPart.title'));
        assert(mainWindow.document.getElementById('myPart.content'));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRS9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0QsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUU3QixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBRTFDLE1BQU0sVUFBVyxTQUFRLElBQUk7UUFBN0I7O1lBRUMsaUJBQVksR0FBVyxFQUFFLENBQUM7WUFDMUIsaUJBQVksR0FBVyxFQUFFLENBQUM7WUFDMUIsa0JBQWEsR0FBVyxFQUFFLENBQUM7WUFDM0Isa0JBQWEsR0FBVyxFQUFFLENBQUM7UUFTNUIsQ0FBQztRQVBTLE1BQU0sQ0FBQyxLQUFh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