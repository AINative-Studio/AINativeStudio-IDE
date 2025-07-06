/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { SideBySideEditor } from '../../../browser/parts/editor/sideBySideEditor.js';
import { isEditorPaneWithScrolling } from '../../../common/editor.js';
import { ReentrancyBarrier } from '../../../../base/common/controlFlow.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
let SyncScroll = class SyncScroll extends Disposable {
    static { this.ID = 'workbench.contrib.syncScrolling'; }
    constructor(editorService, statusbarService) {
        super();
        this.editorService = editorService;
        this.statusbarService = statusbarService;
        this.paneInitialScrollTop = new Map();
        this.syncScrollDispoasbles = this._register(new DisposableStore());
        this.paneDisposables = new DisposableStore();
        this.statusBarEntry = this._register(new MutableDisposable());
        this.isActive = false;
        // makes sure that the onDidEditorPaneScroll is not called multiple times for the same event
        this._reentrancyBarrier = new ReentrancyBarrier();
        this.registerActions();
    }
    registerActiveListeners() {
        this.syncScrollDispoasbles.add(this.editorService.onDidVisibleEditorsChange(() => this.trackVisiblePanes()));
    }
    activate() {
        this.registerActiveListeners();
        this.trackVisiblePanes();
    }
    toggle() {
        if (this.isActive) {
            this.deactivate();
        }
        else {
            this.activate();
        }
        this.isActive = !this.isActive;
        this.toggleStatusbarItem(this.isActive);
    }
    trackVisiblePanes() {
        this.paneDisposables.clear();
        this.paneInitialScrollTop.clear();
        for (const pane of this.getAllVisiblePanes()) {
            if (!isEditorPaneWithScrolling(pane)) {
                continue;
            }
            this.paneInitialScrollTop.set(pane, pane.getScrollPosition());
            this.paneDisposables.add(pane.onDidChangeScroll(() => this._reentrancyBarrier.runExclusivelyOrSkip(() => {
                this.onDidEditorPaneScroll(pane);
            })));
        }
    }
    onDidEditorPaneScroll(scrolledPane) {
        const scrolledPaneInitialOffset = this.paneInitialScrollTop.get(scrolledPane);
        if (scrolledPaneInitialOffset === undefined) {
            throw new Error('Scrolled pane not tracked');
        }
        if (!isEditorPaneWithScrolling(scrolledPane)) {
            throw new Error('Scrolled pane does not support scrolling');
        }
        const scrolledPaneCurrentPosition = scrolledPane.getScrollPosition();
        const scrolledFromInitial = {
            scrollTop: scrolledPaneCurrentPosition.scrollTop - scrolledPaneInitialOffset.scrollTop,
            scrollLeft: scrolledPaneCurrentPosition.scrollLeft !== undefined && scrolledPaneInitialOffset.scrollLeft !== undefined ? scrolledPaneCurrentPosition.scrollLeft - scrolledPaneInitialOffset.scrollLeft : undefined,
        };
        for (const pane of this.getAllVisiblePanes()) {
            if (pane === scrolledPane) {
                continue;
            }
            if (!isEditorPaneWithScrolling(pane)) {
                continue;
            }
            const initialOffset = this.paneInitialScrollTop.get(pane);
            if (initialOffset === undefined) {
                throw new Error('Could not find initial offset for pane');
            }
            const currentPanePosition = pane.getScrollPosition();
            const newPaneScrollPosition = {
                scrollTop: initialOffset.scrollTop + scrolledFromInitial.scrollTop,
                scrollLeft: initialOffset.scrollLeft !== undefined && scrolledFromInitial.scrollLeft !== undefined ? initialOffset.scrollLeft + scrolledFromInitial.scrollLeft : undefined,
            };
            if (currentPanePosition.scrollTop === newPaneScrollPosition.scrollTop && currentPanePosition.scrollLeft === newPaneScrollPosition.scrollLeft) {
                continue;
            }
            pane.setScrollPosition(newPaneScrollPosition);
        }
    }
    getAllVisiblePanes() {
        const panes = [];
        for (const pane of this.editorService.visibleEditorPanes) {
            if (pane instanceof SideBySideEditor) {
                const primaryPane = pane.getPrimaryEditorPane();
                const secondaryPane = pane.getSecondaryEditorPane();
                if (primaryPane) {
                    panes.push(primaryPane);
                }
                if (secondaryPane) {
                    panes.push(secondaryPane);
                }
                continue;
            }
            panes.push(pane);
        }
        return panes;
    }
    deactivate() {
        this.paneDisposables.clear();
        this.syncScrollDispoasbles.clear();
        this.paneInitialScrollTop.clear();
    }
    // Actions & Commands
    toggleStatusbarItem(active) {
        if (active) {
            if (!this.statusBarEntry.value) {
                const text = localize('mouseScrolllingLocked', 'Scrolling Locked');
                const tooltip = localize('mouseLockScrollingEnabled', 'Lock Scrolling Enabled');
                this.statusBarEntry.value = this.statusbarService.addEntry({
                    name: text,
                    text,
                    tooltip,
                    ariaLabel: text,
                    command: {
                        id: 'workbench.action.toggleLockedScrolling',
                        title: ''
                    },
                    kind: 'prominent',
                    showInAllWindows: true
                }, 'status.scrollLockingEnabled', 1 /* StatusbarAlignment.RIGHT */, 102);
            }
        }
        else {
            this.statusBarEntry.clear();
        }
    }
    registerActions() {
        const $this = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.toggleLockedScrolling',
                    title: {
                        ...localize2('toggleLockedScrolling', "Toggle Locked Scrolling Across Editors"),
                        mnemonicTitle: localize({ key: 'miToggleLockedScrolling', comment: ['&& denotes a mnemonic'] }, "Locked Scrolling"),
                    },
                    category: Categories.View,
                    f1: true,
                    metadata: {
                        description: localize('synchronizeScrolling', "Synchronize Scrolling Editors"),
                    }
                });
            }
            run() {
                $this.toggle();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.holdLockedScrolling',
                    title: {
                        ...localize2('holdLockedScrolling', "Hold Locked Scrolling Across Editors"),
                        mnemonicTitle: localize({ key: 'miHoldLockedScrolling', comment: ['&& denotes a mnemonic'] }, "Locked Scrolling"),
                    },
                    category: Categories.View,
                });
            }
            run(accessor) {
                const keybindingService = accessor.get(IKeybindingService);
                // Enable Sync Scrolling while pressed
                $this.toggle();
                const holdMode = keybindingService.enableKeybindingHoldMode('workbench.action.holdLockedScrolling');
                if (!holdMode) {
                    return;
                }
                holdMode.finally(() => {
                    $this.toggle();
                });
            }
        }));
    }
    dispose() {
        this.deactivate();
        super.dispose();
    }
};
SyncScroll = __decorate([
    __param(0, IEditorService),
    __param(1, IStatusbarService)
], SyncScroll);
export { SyncScroll };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsTG9ja2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Njcm9sbExvY2tpbmcvYnJvd3Nlci9zY3JvbGxMb2NraW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVyRixPQUFPLEVBQTBDLHlCQUF5QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBMkIsaUJBQWlCLEVBQXNCLE1BQU0sa0RBQWtELENBQUM7QUFFM0gsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLFVBQVU7YUFFekIsT0FBRSxHQUFHLGlDQUFpQyxBQUFwQyxDQUFxQztJQVd2RCxZQUNpQixhQUE4QyxFQUMzQyxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUM7UUFIeUIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzFCLHFCQUFnQixHQUFoQixn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