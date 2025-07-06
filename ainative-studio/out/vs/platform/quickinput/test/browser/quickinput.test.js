/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { unthemedInboxStyles } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { unthemedButtonStyles } from '../../../../base/browser/ui/button/button.js';
import { unthemedListStyles } from '../../../../base/browser/ui/list/listWidget.js';
import { unthemedToggleStyles } from '../../../../base/browser/ui/toggle/toggle.js';
import { Event } from '../../../../base/common/event.js';
import { raceTimeout } from '../../../../base/common/async.js';
import { unthemedCountStyles } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { unthemedKeybindingLabelOptions } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { unthemedProgressBarOptions } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { QuickInputController } from '../../browser/quickInputController.js';
import { TestThemeService } from '../../../theme/test/common/testThemeService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ItemActivation } from '../../common/quickInput.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { IThemeService } from '../../../theme/common/themeService.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { ILayoutService } from '../../../layout/browser/layoutService.js';
import { IContextViewService } from '../../../contextview/browser/contextView.js';
import { IListService, ListService } from '../../../list/browser/listService.js';
import { IContextKeyService } from '../../../contextkey/common/contextkey.js';
import { ContextKeyService } from '../../../contextkey/browser/contextKeyService.js';
import { NoMatchingKb } from '../../../keybinding/common/keybindingResolver.js';
import { IKeybindingService } from '../../../keybinding/common/keybinding.js';
import { ContextViewService } from '../../../contextview/browser/contextViewService.js';
import { IAccessibilityService } from '../../../accessibility/common/accessibility.js';
import { TestAccessibilityService } from '../../../accessibility/test/common/testAccessibilityService.js';
// Sets up an `onShow` listener to allow us to wait until the quick pick is shown (useful when triggering an `accept()` right after launching a quick pick)
// kick this off before you launch the picker and then await the promise returned after you launch the picker.
async function setupWaitTilShownListener(controller) {
    const result = await raceTimeout(new Promise(resolve => {
        const event = controller.onShow(_ => {
            event.dispose();
            resolve(true);
        });
    }), 2000);
    if (!result) {
        throw new Error('Cancelled');
    }
}
suite('QuickInput', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let controller;
    setup(() => {
        const fixture = document.createElement('div');
        mainWindow.document.body.appendChild(fixture);
        store.add(toDisposable(() => fixture.remove()));
        const instantiationService = new TestInstantiationService();
        // Stub the services the quick input controller needs to function
        instantiationService.stub(IThemeService, new TestThemeService());
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IAccessibilityService, new TestAccessibilityService());
        instantiationService.stub(IListService, store.add(new ListService()));
        instantiationService.stub(ILayoutService, { activeContainer: fixture, onDidLayoutContainer: Event.None });
        instantiationService.stub(IContextViewService, store.add(instantiationService.createInstance(ContextViewService)));
        instantiationService.stub(IContextKeyService, store.add(instantiationService.createInstance(ContextKeyService)));
        instantiationService.stub(IKeybindingService, {
            mightProducePrintableCharacter() { return false; },
            softDispatch() { return NoMatchingKb; },
        });
        controller = store.add(instantiationService.createInstance(QuickInputController, {
            container: fixture,
            idPrefix: 'testQuickInput',
            ignoreFocusOut() { return true; },
            returnFocus() { },
            backKeybindingLabel() { return undefined; },
            setContextKey() { return undefined; },
            linkOpenerDelegate(content) { },
            hoverDelegate: {
                showHover(options, focus) {
                    return undefined;
                },
                delay: 200
            },
            styles: {
                button: unthemedButtonStyles,
                countBadge: unthemedCountStyles,
                inputBox: unthemedInboxStyles,
                toggle: unthemedToggleStyles,
                keybindingLabel: unthemedKeybindingLabelOptions,
                list: unthemedListStyles,
                progressBar: unthemedProgressBarOptions,
                widget: {
                    quickInputBackground: undefined,
                    quickInputForeground: undefined,
                    quickInputTitleBackground: undefined,
                    widgetBorder: undefined,
                    widgetShadow: undefined,
                },
                pickerGroup: {
                    pickerGroupBorder: undefined,
                    pickerGroupForeground: undefined,
                }
            }
        }));
        // initial layout
        controller.layout({ height: 20, width: 40 }, 0);
    });
    test('pick - basecase', async () => {
        const item = { label: 'foo' };
        const wait = setupWaitTilShownListener(controller);
        const pickPromise = controller.pick([item, { label: 'bar' }]);
        await wait;
        controller.accept();
        const pick = await raceTimeout(pickPromise, 2000);
        assert.strictEqual(pick, item);
    });
    test('pick - activeItem is honored', async () => {
        const item = { label: 'foo' };
        const wait = setupWaitTilShownListener(controller);
        const pickPromise = controller.pick([{ label: 'bar' }, item], { activeItem: item });
        await wait;
        controller.accept();
        const pick = await pickPromise;
        assert.strictEqual(pick, item);
    });
    test('input - basecase', async () => {
        const wait = setupWaitTilShownListener(controller);
        const inputPromise = controller.input({ value: 'foo' });
        await wait;
        controller.accept();
        const value = await raceTimeout(inputPromise, 2000);
        assert.strictEqual(value, 'foo');
    });
    test('onDidChangeValue - gets triggered when .value is set', async () => {
        const quickpick = store.add(controller.createQuickPick());
        let value = undefined;
        store.add(quickpick.onDidChangeValue((e) => value = e));
        // Trigger a change
        quickpick.value = 'changed';
        try {
            assert.strictEqual(value, quickpick.value);
        }
        finally {
            quickpick.dispose();
        }
    });
    test('keepScrollPosition - works with activeItems', async () => {
        const quickpick = store.add(controller.createQuickPick());
        const items = [];
        for (let i = 0; i < 1000; i++) {
            items.push({ label: `item ${i}` });
        }
        quickpick.items = items;
        // setting the active item should cause the quick pick to scroll to the bottom
        quickpick.activeItems = [items[items.length - 1]];
        quickpick.show();
        const cursorTop = quickpick.scrollTop;
        assert.notStrictEqual(cursorTop, 0);
        quickpick.keepScrollPosition = true;
        quickpick.activeItems = [items[0]];
        assert.strictEqual(cursorTop, quickpick.scrollTop);
        quickpick.keepScrollPosition = false;
        quickpick.activeItems = [items[0]];
        assert.strictEqual(quickpick.scrollTop, 0);
    });
    test('keepScrollPosition - works with items', async () => {
        const quickpick = store.add(controller.createQuickPick());
        const items = [];
        for (let i = 0; i < 1000; i++) {
            items.push({ label: `item ${i}` });
        }
        quickpick.items = items;
        // setting the active item should cause the quick pick to scroll to the bottom
        quickpick.activeItems = [items[items.length - 1]];
        quickpick.show();
        const cursorTop = quickpick.scrollTop;
        assert.notStrictEqual(cursorTop, 0);
        quickpick.keepScrollPosition = true;
        quickpick.items = items;
        assert.strictEqual(cursorTop, quickpick.scrollTop);
        quickpick.keepScrollPosition = false;
        quickpick.items = items;
        assert.strictEqual(quickpick.scrollTop, 0);
    });
    test('selectedItems - verify previous selectedItems does not hang over to next set of items', async () => {
        const quickpick = store.add(controller.createQuickPick());
        quickpick.items = [{ label: 'step 1' }];
        quickpick.show();
        void (await new Promise(resolve => {
            store.add(quickpick.onDidAccept(() => {
                quickpick.canSelectMany = true;
                quickpick.items = [{ label: 'a' }, { label: 'b' }, { label: 'c' }];
                resolve();
            }));
            // accept 'step 1'
            controller.accept();
        }));
        // accept in multi-select
        controller.accept();
        // Since we don't select any items, the selected items should be empty
        assert.strictEqual(quickpick.selectedItems.length, 0);
    });
    test('activeItems - verify onDidChangeActive is triggered after setting items', async () => {
        const quickpick = store.add(controller.createQuickPick());
        // Setup listener for verification
        const activeItemsFromEvent = [];
        store.add(quickpick.onDidChangeActive(items => activeItemsFromEvent.push(...items)));
        quickpick.show();
        const item = { label: 'step 1' };
        quickpick.items = [item];
        assert.strictEqual(activeItemsFromEvent.length, 1);
        assert.strictEqual(activeItemsFromEvent[0], item);
        assert.strictEqual(quickpick.activeItems.length, 1);
        assert.strictEqual(quickpick.activeItems[0], item);
    });
    test('activeItems - verify setting itemActivation to None still triggers onDidChangeActive after selection #207832', async () => {
        const quickpick = store.add(controller.createQuickPick());
        const item = { label: 'step 1' };
        quickpick.items = [item];
        quickpick.show();
        assert.strictEqual(quickpick.activeItems[0], item);
        // Setup listener for verification
        const activeItemsFromEvent = [];
        store.add(quickpick.onDidChangeActive(items => activeItemsFromEvent.push(...items)));
        // Trigger a change
        quickpick.itemActivation = ItemActivation.NONE;
        quickpick.items = [item];
        assert.strictEqual(activeItemsFromEvent.length, 0);
        assert.strictEqual(quickpick.activeItems.length, 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tpbnB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC90ZXN0L2Jyb3dzZXIvcXVpY2tpbnB1dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2hILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFaEUsT0FBTyxFQUFrQixjQUFj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