/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { isIMenuItem, MenuId, MenuRegistry } from '../../common/actions.js';
import { MenuService } from '../../common/menuService.js';
import { NullCommandService } from '../../../commands/test/common/nullCommandService.js';
import { MockContextKeyService, MockKeybindingService } from '../../../keybinding/test/common/mockKeybindingService.js';
import { InMemoryStorageService } from '../../../storage/common/storage.js';
// --- service instances
const contextKeyService = new class extends MockContextKeyService {
    contextMatchesRules() {
        return true;
    }
};
// --- tests
suite('MenuService', function () {
    let menuService;
    const disposables = new DisposableStore();
    let testMenuId;
    setup(function () {
        menuService = new MenuService(NullCommandService, new MockKeybindingService(), new InMemoryStorageService());
        testMenuId = new MenuId(`testo/${generateUuid()}`);
        disposables.clear();
    });
    teardown(function () {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('group sorting', function () {
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'one', title: 'FOO' },
            group: '0_hello'
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'two', title: 'FOO' },
            group: 'hello'
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'three', title: 'FOO' },
            group: 'Hello'
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'four', title: 'FOO' },
            group: ''
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'five', title: 'FOO' },
            group: 'navigation'
        }));
        const groups = disposables.add(menuService.createMenu(testMenuId, contextKeyService)).getActions();
        assert.strictEqual(groups.length, 5);
        const [one, two, three, four, five] = groups;
        assert.strictEqual(one[0], 'navigation');
        assert.strictEqual(two[0], '0_hello');
        assert.strictEqual(three[0], 'hello');
        assert.strictEqual(four[0], 'Hello');
        assert.strictEqual(five[0], '');
    });
    test('in group sorting, by title', function () {
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'a', title: 'aaa' },
            group: 'Hello'
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'b', title: 'fff' },
            group: 'Hello'
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'c', title: 'zzz' },
            group: 'Hello'
        }));
        const groups = disposables.add(menuService.createMenu(testMenuId, contextKeyService)).getActions();
        assert.strictEqual(groups.length, 1);
        const [, actions] = groups[0];
        assert.strictEqual(actions.length, 3);
        const [one, two, three] = actions;
        assert.strictEqual(one.id, 'a');
        assert.strictEqual(two.id, 'b');
        assert.strictEqual(three.id, 'c');
    });
    test('in group sorting, by title and order', function () {
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'a', title: 'aaa' },
            group: 'Hello',
            order: 10
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'b', title: 'fff' },
            group: 'Hello'
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'c', title: 'zzz' },
            group: 'Hello',
            order: -1
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'd', title: 'yyy' },
            group: 'Hello',
            order: -1
        }));
        const groups = disposables.add(menuService.createMenu(testMenuId, contextKeyService)).getActions();
        assert.strictEqual(groups.length, 1);
        const [, actions] = groups[0];
        assert.strictEqual(actions.length, 4);
        const [one, two, three, four] = actions;
        assert.strictEqual(one.id, 'd');
        assert.strictEqual(two.id, 'c');
        assert.strictEqual(three.id, 'b');
        assert.strictEqual(four.id, 'a');
    });
    test('in group sorting, special: navigation', function () {
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'a', title: 'aaa' },
            group: 'navigation',
            order: 1.3
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'b', title: 'fff' },
            group: 'navigation',
            order: 1.2
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'c', title: 'zzz' },
            group: 'navigation',
            order: 1.1
        }));
        const groups = disposables.add(menuService.createMenu(testMenuId, contextKeyService)).getActions();
        assert.strictEqual(groups.length, 1);
        const [[, actions]] = groups;
        assert.strictEqual(actions.length, 3);
        const [one, two, three] = actions;
        assert.strictEqual(one.id, 'c');
        assert.strictEqual(two.id, 'b');
        assert.strictEqual(three.id, 'a');
    });
    test('special MenuId palette', function () {
        disposables.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: { id: 'a', title: 'Explicit' }
        }));
        disposables.add(MenuRegistry.addCommand({ id: 'b', title: 'Implicit' }));
        let foundA = false;
        let foundB = false;
        for (const item of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
            if (isIMenuItem(item)) {
                if (item.command.id === 'a') {
                    assert.strictEqual(item.command.title, 'Explicit');
                    foundA = true;
                }
                if (item.command.id === 'b') {
                    assert.strictEqual(item.command.title, 'Implicit');
                    foundB = true;
                }
            }
        }
        assert.strictEqual(foundA, true);
        assert.strictEqual(foundB, true);
    });
    test('Extension contributed submenus missing with errors in output #155030', function () {
        const id = generateUuid();
        const menu = new MenuId(id);
        assert.throws(() => new MenuId(id));
        assert.ok(menu === MenuId.for(id));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL3Rlc3QvY29tbW9uL21lbnVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVFLHdCQUF3QjtBQUV4QixNQUFNLGlCQUFpQixHQUFHLElBQUksS0FBTSxTQUFRLHFCQUFxQjtJQUN2RCxtQkFBbUI7UUFDM0IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QsQ0FBQztBQUVGLFlBQVk7QUFFWixLQUFLLENBQUMsYUFBYSxFQUFFO0lBRXBCLElBQUksV0FBd0IsQ0FBQztJQUM3QixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLElBQUksVUFBa0IsQ0FBQztJQUV2QixLQUFLLENBQUM7UUFDTCxXQUFXLEdB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