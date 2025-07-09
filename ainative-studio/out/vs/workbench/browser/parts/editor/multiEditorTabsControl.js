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
var MultiEditorTabsControl_1;
import './media/multieditortabscontrol.css';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { shorten } from '../../../../base/common/labels.js';
import { EditorResourceAccessor, SideBySideEditor, DEFAULT_EDITOR_ASSOCIATION, preventEditorClose, EditorCloseMethod } from '../../../common/editor.js';
import { computeEditorAriaLabel } from '../../editor.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { EventType as TouchEventType, Gesture } from '../../../../base/browser/touch.js';
import { ResourceLabels, DEFAULT_LABELS_CONTAINER } from '../../labels.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { EditorCommandsContextActionRunner, EditorTabsControl } from './editorTabsControl.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { dispose, DisposableStore, combinedDisposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { getOrSet } from '../../../../base/common/map.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { TAB_INACTIVE_BACKGROUND, TAB_ACTIVE_BACKGROUND, TAB_BORDER, EDITOR_DRAG_AND_DROP_BACKGROUND, TAB_UNFOCUSED_ACTIVE_BACKGROUND, TAB_UNFOCUSED_ACTIVE_BORDER, TAB_ACTIVE_BORDER, TAB_HOVER_BACKGROUND, TAB_HOVER_BORDER, TAB_UNFOCUSED_HOVER_BACKGROUND, TAB_UNFOCUSED_HOVER_BORDER, EDITOR_GROUP_HEADER_TABS_BACKGROUND, WORKBENCH_BACKGROUND, TAB_ACTIVE_BORDER_TOP, TAB_UNFOCUSED_ACTIVE_BORDER_TOP, TAB_ACTIVE_MODIFIED_BORDER, TAB_INACTIVE_MODIFIED_BORDER, TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER, TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER, TAB_UNFOCUSED_INACTIVE_BACKGROUND, TAB_HOVER_FOREGROUND, TAB_UNFOCUSED_HOVER_FOREGROUND, EDITOR_GROUP_HEADER_TABS_BORDER, TAB_LAST_PINNED_BORDER, TAB_SELECTED_BORDER_TOP } from '../../../common/theme.js';
import { activeContrastBorder, contrastBorder, editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { ResourcesDropHandler, DraggedEditorIdentifier, DraggedEditorGroupIdentifier, extractTreeDropData, isWindowDraggedOver } from '../../dnd.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { addDisposableListener, EventType, EventHelper, Dimension, scheduleAtNextAnimationFrame, findParentWithClass, clearNode, DragAndDropObserver, isMouseEvent, getWindow, $ } from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { prepareMoveCopyEditors } from './editor.js';
import { CloseEditorTabAction, UnpinEditorAction } from './editorActions.js';
import { assertAllDefined, assertIsDefined } from '../../../../base/common/types.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { basenameOrAuthority } from '../../../../base/common/resources.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { win32, posix } from '../../../../base/common/path.js';
import { coalesce, insert } from '../../../../base/common/arrays.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { isSafari } from '../../../../base/browser/browser.js';
import { equals } from '../../../../base/common/objects.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { UNLOCK_GROUP_COMMAND_ID } from './editorCommands.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { ITreeViewsDnDService } from '../../../../editor/common/services/treeViewsDndService.js';
import { DraggedTreeItemsIdentifier } from '../../../../editor/common/services/treeViewsDnd.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { StickyEditorGroupModel, UnstickyEditorGroupModel } from '../../../common/editor/filteredEditorGroupModel.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
let MultiEditorTabsControl = class MultiEditorTabsControl extends EditorTabsControl {
    static { MultiEditorTabsControl_1 = this; }
    static { this.SCROLLBAR_SIZES = {
        default: 3,
        large: 10
    }; }
    static { this.TAB_WIDTH = {
        compact: 38,
        shrink: 80,
        fit: 120
    }; }
    static { this.DRAG_OVER_OPEN_TAB_THRESHOLD = 1500; }
    static { this.MOUSE_WHEEL_EVENT_THRESHOLD = 150; }
    static { this.MOUSE_WHEEL_DISTANCE_THRESHOLD = 1.5; }
    constructor(parent, editorPartsView, groupsView, groupView, tabsModel, contextMenuService, instantiationService, contextKeyService, keybindingService, notificationService, quickInputService, themeService, editorService, pathService, treeViewsDragAndDropService, editorResolverService, hostService) {
        super(parent, editorPartsView, groupsView, groupView, tabsModel, contextMenuService, instantiationService, contextKeyService, keybindingService, notificationService, quickInputService, themeService, editorResolverService, hostService);
        this.editorService = editorService;
        this.pathService = pathService;
        this.treeViewsDragAndDropService = treeViewsDragAndDropService;
        this.closeEditorAction = this._register(this.instantiationService.createInstance(CloseEditorTabAction, CloseEditorTabAction.ID, CloseEditorTabAction.LABEL));
        this.unpinEditorAction = this._register(this.instantiationService.createInstance(UnpinEditorAction, UnpinEditorAction.ID, UnpinEditorAction.LABEL));
        this.tabResourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER));
        this.tabLabels = [];
        this.tabActionBars = [];
        this.tabDisposables = [];
        this.dimensions = {
            container: Dimension.None,
            available: Dimension.None
        };
        this.layoutScheduler = this._register(new MutableDisposable());
        this.path = isWindows ? win32 : posix;
        this.lastMouseWheelEventTime = 0;
        this.isMouseOverTabs = false;
        this.updateEditorLabelScheduler = this._register(new RunOnceScheduler(() => this.doUpdateEditorLabels(), 0));
        // Resolve the correct path library for the OS we are on
        // If we are connected to remote, this accounts for the
        // remote OS.
        (async () => this.path = await this.pathService.path)();
        // React to decorations changing for our resource labels
        this._register(this.tabResourceLabels.onDidChangeDecorations(() => this.doHandleDecorationsChange()));
    }
    create(parent) {
        super.create(parent);
        this.titleContainer = parent;
        // Tabs and Actions Container (are on a single row with flex side-by-side)
        this.tabsAndActionsContainer = $('.tabs-and-actions-container');
        this.titleContainer.appendChild(this.tabsAndActionsContainer);
        // Tabs Container
        this.tabsContainer = $('.tabs-container', {
            role: 'tablist',
            draggable: true
        });
        this._register(Gesture.addTarget(this.tabsContainer));
        this.tabSizingFixedDisposables = this._register(new DisposableStore());
        this.updateTabSizing(false);
        // Tabs Scrollbar
        this.tabsScrollbar = this.createTabsScrollbar(this.tabsContainer);
        this.tabsAndActionsContainer.appendChild(this.tabsScrollbar.getDomNode());
        // Tabs Container listeners
        this.registerTabsContainerListeners(this.tabsContainer, this.tabsScrollbar);
        // Create Editor Toolbar
        this.createEditorActionsToolBar(this.tabsAndActionsContainer, ['editor-actions']);
        // Set tabs control visibility
        this.updateTabsControlVisibility();
        return this.tabsAndActionsContainer;
    }
    createTabsScrollbar(scrollable) {
        const tabsScrollbar = this._register(new ScrollableElement(scrollable, {
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            horizontalScrollbarSize: this.getTabsScrollbarSizing(),
            vertical: 2 /* ScrollbarVisibility.Hidden */,
            scrollYToX: true,
            useShadows: false
        }));
        this._register(tabsScrollbar.onScroll(e => {
            if (e.scrollLeftChanged) {
                scrollable.scrollLeft = e.scrollLeft;
            }
        }));
        return tabsScrollbar;
    }
    updateTabsScrollbarSizing() {
        this.tabsScrollbar?.updateOptions({
            horizontalScrollbarSize: this.getTabsScrollbarSizing()
        });
    }
    updateTabSizing(fromEvent) {
        const [tabsContainer, tabSizingFixedDisposables] = assertAllDefined(this.tabsContainer, this.tabSizingFixedDisposables);
        tabSizingFixedDisposables.clear();
        const options = this.groupsView.partOptions;
        if (options.tabSizing === 'fixed') {
            tabsContainer.style.setProperty('--tab-sizing-fixed-min-width', `${options.tabSizingFixedMinWidth}px`);
            tabsContainer.style.setProperty('--tab-sizing-fixed-max-width', `${options.tabSizingFixedMaxWidth}px`);
            // For https://github.com/microsoft/vscode/issues/40290 we want to
            // preserve the current tab widths as long as the mouse is over the
            // tabs so that you can quickly close them via mouse click. For that
            // we track mouse movements over the tabs container.
            tabSizingFixedDisposables.add(addDisposableListener(tabsContainer, EventType.MOUSE_ENTER, () => {
                this.isMouseOverTabs = true;
            }));
            tabSizingFixedDisposables.add(addDisposableListener(tabsContainer, EventType.MOUSE_LEAVE, () => {
                this.isMouseOverTabs = false;
                this.updateTabsFixedWidth(false);
            }));
        }
        else if (fromEvent) {
            tabsContainer.style.removeProperty('--tab-sizing-fixed-min-width');
            tabsContainer.style.removeProperty('--tab-sizing-fixed-max-width');
            this.updateTabsFixedWidth(false);
        }
    }
    updateTabsFixedWidth(fixed) {
        this.forEachTab((editor, tabIndex, tabContainer) => {
            if (fixed) {
                const { width } = tabContainer.getBoundingClientRect();
                tabContainer.style.setProperty('--tab-sizing-current-width', `${width}px`);
            }
            else {
                tabContainer.style.removeProperty('--tab-sizing-current-width');
            }
        });
    }
    getTabsScrollbarSizing() {
        if (this.groupsView.partOptions.titleScrollbarSizing !== 'large') {
            return MultiEditorTabsControl_1.SCROLLBAR_SIZES.default;
        }
        return MultiEditorTabsControl_1.SCROLLBAR_SIZES.large;
    }
    registerTabsContainerListeners(tabsContainer, tabsScrollbar) {
        // Forward scrolling inside the container to our custom scrollbar
        this._register(addDisposableListener(tabsContainer, EventType.SCROLL, () => {
            if (tabsContainer.classList.contains('scroll')) {
                tabsScrollbar.setScrollPosition({
                    scrollLeft: tabsContainer.scrollLeft // during DND the container gets scrolled so we need to update the custom scrollbar
                });
            }
        }));
        // New file when double-clicking on tabs container (but not tabs)
        for (const eventType of [TouchEventType.Tap, EventType.DBLCLICK]) {
            this._register(addDisposableListener(tabsContainer, eventType, (e) => {
                if (eventType === EventType.DBLCLICK) {
                    if (e.target !== tabsContainer) {
                        return; // ignore if target is not tabs container
                    }
                }
                else {
                    if (e.tapCount !== 2) {
                        return; // ignore single taps
                    }
                    if (e.initialTarget !== tabsContainer) {
                        return; // ignore if target is not tabs container
                    }
                }
                EventHelper.stop(e);
                this.editorService.openEditor({
                    resource: undefined,
                    options: {
                        pinned: true,
                        index: this.groupView.count, // always at the end
                        override: DEFAULT_EDITOR_ASSOCIATION.id
                    }
                }, this.groupView.id);
            }));
        }
        // Prevent auto-scrolling (https://github.com/microsoft/vscode/issues/16690)
        this._register(addDisposableListener(tabsContainer, EventType.MOUSE_DOWN, e => {
            if (e.button === 1) {
                e.preventDefault();
            }
        }));
        // Prevent auto-pasting (https://github.com/microsoft/vscode/issues/201696)
        if (isLinux) {
            this._register(addDisposableListener(tabsContainer, EventType.MOUSE_UP, e => {
                if (e.button === 1) {
                    e.preventDefault();
                }
            }));
        }
        // Drag & Drop support
        let lastDragEvent = undefined;
        let isNewWindowOperation = false;
        this._register(new DragAndDropObserver(tabsContainer, {
            onDragStart: e => {
                isNewWindowOperation = this.onGroupDragStart(e, tabsContainer);
            },
            onDrag: e => {
                lastDragEvent = e;
            },
            onDragEnter: e => {
                // Always enable support to scroll while dragging
                tabsContainer.classList.add('scroll');
                // Return if the target is not on the tabs container
                if (e.target !== tabsContainer) {
                    return;
                }
                // Return if transfer is unsupported
                if (!this.isSupportedDropTransfer(e)) {
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'none';
                    }
                    return;
                }
                // Update the dropEffect to "copy" if there is no local data to be dragged because
                // in that case we can only copy the data into and not move it from its source
                if (!this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'copy';
                    }
                }
                this.updateDropFeedback(tabsContainer, true, e);
            },
            onDragLeave: e => {
                this.updateDropFeedback(tabsContainer, false, e);
                tabsContainer.classList.remove('scroll');
            },
            onDragEnd: e => {
                this.updateDropFeedback(tabsContainer, false, e);
                tabsContainer.classList.remove('scroll');
                this.onGroupDragEnd(e, lastDragEvent, tabsContainer, isNewWindowOperation);
            },
            onDrop: e => {
                this.updateDropFeedback(tabsContainer, false, e);
                tabsContainer.classList.remove('scroll');
                if (e.target === tabsContainer) {
                    const isGroupTransfer = this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype);
                    this.onDrop(e, isGroupTransfer ? this.groupView.count : this.tabsModel.count, tabsContainer);
                }
            }
        }));
        // Mouse-wheel support to switch to tabs optionally
        this._register(addDisposableListener(tabsContainer, EventType.MOUSE_WHEEL, (e) => {
            const activeEditor = this.groupView.activeEditor;
            if (!activeEditor || this.groupView.count < 2) {
                return; // need at least 2 open editors
            }
            // Shift-key enables or disables this behaviour depending on the setting
            if (this.groupsView.partOptions.scrollToSwitchTabs === true) {
                if (e.shiftKey) {
                    return; // 'on': only enable this when Shift-key is not pressed
                }
            }
            else {
                if (!e.shiftKey) {
                    return; // 'off': only enable this when Shift-key is pressed
                }
            }
            // Ignore event if the last one happened too recently (https://github.com/microsoft/vscode/issues/96409)
            // The restriction is relaxed according to the absolute value of `deltaX` and `deltaY`
            // to support discrete (mouse wheel) and contiguous scrolling (touchpad) equally well
            const now = Date.now();
            if (now - this.lastMouseWheelEventTime < MultiEditorTabsControl_1.MOUSE_WHEEL_EVENT_THRESHOLD - 2 * (Math.abs(e.deltaX) + Math.abs(e.deltaY))) {
                return;
            }
            this.lastMouseWheelEventTime = now;
            // Figure out scrolling direction but ignore it if too subtle
            let tabSwitchDirection;
            if (e.deltaX + e.deltaY < -MultiEditorTabsControl_1.MOUSE_WHEEL_DISTANCE_THRESHOLD) {
                tabSwitchDirection = -1;
            }
            else if (e.deltaX + e.deltaY > MultiEditorTabsControl_1.MOUSE_WHEEL_DISTANCE_THRESHOLD) {
                tabSwitchDirection = 1;
            }
            else {
                return;
            }
            const nextEditor = this.groupView.getEditorByIndex(this.groupView.getIndexOfEditor(activeEditor) + tabSwitchDirection);
            if (!nextEditor) {
                return;
            }
            // Open it
            this.groupView.openEditor(nextEditor);
            // Disable normal scrolling, opening the editor will already reveal it properly
            EventHelper.stop(e, true);
        }));
        // Context menu
        const showContextMenu = (e) => {
            EventHelper.stop(e);
            // Find target anchor
            let anchor = tabsContainer;
            if (isMouseEvent(e)) {
                anchor = new StandardMouseEvent(getWindow(this.parent), e);
            }
            // Show it
            this.contextMenuService.showContextMenu({
                getAnchor: () => anchor,
                menuId: MenuId.EditorTabsBarContext,
                contextKeyService: this.contextKeyService,
                menuActionOptions: { shouldForwardArgs: true },
                getActionsContext: () => ({ groupId: this.groupView.id }),
                getKeyBinding: action => this.getKeybinding(action),
                onHide: () => this.groupView.focus()
            });
        };
        this._register(addDisposableListener(tabsContainer, TouchEventType.Contextmenu, e => showContextMenu(e)));
        this._register(addDisposableListener(tabsContainer, EventType.CONTEXT_MENU, e => showContextMenu(e)));
    }
    doHandleDecorationsChange() {
        // A change to decorations potentially has an impact on the size of tabs
        // so we need to trigger a layout in that case to adjust things
        this.layout(this.dimensions);
    }
    updateEditorActionsToolbar() {
        super.updateEditorActionsToolbar();
        // Changing the actions in the toolbar can have an impact on the size of the
        // tab container, so we need to layout the tabs to make sure the active is visible
        this.layout(this.dimensions);
    }
    openEditor(editor, options) {
        const changed = this.handleOpenedEditors();
        // Respect option to focus tab control if provided
        if (options?.focusTabControl) {
            this.withTab(editor, (editor, tabIndex, tabContainer) => tabContainer.focus());
        }
        return changed;
    }
    openEditors(editors) {
        return this.handleOpenedEditors();
    }
    handleOpenedEditors() {
        // Set tabs control visibility
        this.updateTabsControlVisibility();
        // Create tabs as needed
        const [tabsContainer, tabsScrollbar] = assertAllDefined(this.tabsContainer, this.tabsScrollbar);
        for (let i = tabsContainer.children.length; i < this.tabsModel.count; i++) {
            tabsContainer.appendChild(this.createTab(i, tabsContainer, tabsScrollbar));
        }
        // Make sure to recompute tab labels and detect
        // if a label change occurred that requires a
        // redraw of tabs.
        const activeEditorChanged = this.didActiveEditorChange();
        const oldTabLabels = this.tabLabels;
        this.computeTabLabels();
        // Redraw and update in these cases
        let didChange = false;
        if (activeEditorChanged || // active editor changed
            oldTabLabels.length !== this.tabLabels.length || // number of tabs changed
            oldTabLabels.some((label, index) => !this.equalsEditorInputLabel(label, this.tabLabels.at(index))) // editor labels changed
        ) {
            this.redraw({ forceRevealActiveTab: true });
            didChange = true;
        }
        // Otherwise only layout for revealing
        else {
            this.layout(this.dimensions, { forceRevealActiveTab: true });
        }
        return didChange;
    }
    didActiveEditorChange() {
        if (!this.activeTabLabel?.editor && this.tabsModel.activeEditor || // active editor changed from null => editor
            this.activeTabLabel?.editor && !this.tabsModel.activeEditor || // active editor changed from editor => null
            (!this.activeTabLabel?.editor || !this.tabsModel.isActive(this.activeTabLabel.editor)) // active editor changed from editorA => editorB
        ) {
            return true;
        }
        return false;
    }
    equalsEditorInputLabel(labelA, labelB) {
        if (labelA === labelB) {
            return true;
        }
        if (!labelA || !labelB) {
            return false;
        }
        return labelA.name === labelB.name &&
            labelA.description === labelB.description &&
            labelA.forceDescription === labelB.forceDescription &&
            labelA.title === labelB.title &&
            labelA.ariaLabel === labelB.ariaLabel;
    }
    beforeCloseEditor(editor) {
        // Fix tabs width if the mouse is over tabs and before closing
        // a tab (except the last tab) when tab sizing is 'fixed'.
        // This helps keeping the close button stable under
        // the mouse and allows for rapid closing of tabs.
        if (this.isMouseOverTabs && this.groupsView.partOptions.tabSizing === 'fixed') {
            const closingLastTab = this.tabsModel.isLast(editor);
            this.updateTabsFixedWidth(!closingLastTab);
        }
    }
    closeEditor(editor) {
        this.handleClosedEditors();
    }
    closeEditors(editors) {
        this.handleClosedEditors();
    }
    handleClosedEditors() {
        // There are tabs to show
        if (this.tabsModel.count) {
            // Remove tabs that got closed
            const tabsContainer = assertIsDefined(this.tabsContainer);
            while (tabsContainer.children.length > this.tabsModel.count) {
                // Remove one tab from container (must be the last to keep indexes in order!)
                tabsContainer.lastChild?.remove();
                // Remove associated tab label and widget
                dispose(this.tabDisposables.pop());
            }
            // A removal of a label requires to recompute all labels
            this.computeTabLabels();
            // Redraw all tabs
            this.redraw({ forceRevealActiveTab: true });
        }
        // No tabs to show
        else {
            if (this.tabsContainer) {
                clearNode(this.tabsContainer);
            }
            this.tabDisposables = dispose(this.tabDisposables);
            this.tabResourceLabels.clear();
            this.tabLabels = [];
            this.activeTabLabel = undefined;
            this.tabActionBars = [];
            this.clearEditorActionsToolbar();
            this.updateTabsControlVisibility();
        }
    }
    moveEditor(editor, fromTabIndex, targeTabIndex) {
        // Move the editor label
        const editorLabel = this.tabLabels[fromTabIndex];
        this.tabLabels.splice(fromTabIndex, 1);
        this.tabLabels.splice(targeTabIndex, 0, editorLabel);
        // Redraw tabs in the range of the move
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => {
            this.redrawTab(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar);
        }, Math.min(fromTabIndex, targeTabIndex), // from: smallest of fromTabIndex/targeTabIndex
        Math.max(fromTabIndex, targeTabIndex) //   to: largest of fromTabIndex/targeTabIndex
        );
        // Moving an editor requires a layout to keep the active editor visible
        this.layout(this.dimensions, { forceRevealActiveTab: true });
    }
    pinEditor(editor) {
        this.withTab(editor, (editor, tabIndex, tabContainer, tabLabelWidget, tabLabel) => this.redrawTabLabel(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel));
    }
    stickEditor(editor) {
        this.doHandleStickyEditorChange(editor);
    }
    unstickEditor(editor) {
        this.doHandleStickyEditorChange(editor);
    }
    doHandleStickyEditorChange(editor) {
        // Update tab
        this.withTab(editor, (editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => this.redrawTab(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar));
        // Sticky change has an impact on each tab's border because
        // it potentially moves the border to the last pinned tab
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel) => {
            this.redrawTabBorders(tabIndex, tabContainer);
        });
        // A change to the sticky state requires a layout to keep the active editor visible
        this.layout(this.dimensions, { forceRevealActiveTab: true });
    }
    setActive(isGroupActive) {
        // Activity has an impact on each tab's active indication
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => {
            this.redrawTabSelectedActiveAndDirty(isGroupActive, editor, tabContainer, tabActionBar);
        });
        // Activity has an impact on the toolbar, so we need to update and layout
        this.updateEditorActionsToolbar();
        this.layout(this.dimensions, { forceRevealActiveTab: true });
    }
    updateEditorSelections() {
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => {
            this.redrawTabSelectedActiveAndDirty(this.groupsView.activeGroup === this.groupView, editor, tabContainer, tabActionBar);
        });
    }
    updateEditorLabel(editor) {
        // Update all labels to account for changes to tab labels
        // Since this method may be called a lot of times from
        // individual editors, we collect all those requests and
        // then run the update once because we have to update
        // all opened tabs in the group at once.
        this.updateEditorLabelScheduler.schedule();
    }
    doUpdateEditorLabels() {
        // A change to a label requires to recompute all labels
        this.computeTabLabels();
        // As such we need to redraw each label
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel) => {
            this.redrawTabLabel(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel);
        });
        // A change to a label requires a layout to keep the active editor visible
        this.layout(this.dimensions);
    }
    updateEditorDirty(editor) {
        this.withTab(editor, (editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => this.redrawTabSelectedActiveAndDirty(this.groupsView.activeGroup === this.groupView, editor, tabContainer, tabActionBar));
    }
    updateOptions(oldOptions, newOptions) {
        super.updateOptions(oldOptions, newOptions);
        // A change to a label format options requires to recompute all labels
        if (oldOptions.labelFormat !== newOptions.labelFormat) {
            this.computeTabLabels();
        }
        // Update tabs scrollbar sizing
        if (oldOptions.titleScrollbarSizing !== newOptions.titleScrollbarSizing) {
            this.updateTabsScrollbarSizing();
        }
        // Update editor actions
        if (oldOptions.alwaysShowEditorActions !== newOptions.alwaysShowEditorActions) {
            this.updateEditorActionsToolbar();
        }
        // Update tabs sizing
        if (oldOptions.tabSizingFixedMinWidth !== newOptions.tabSizingFixedMinWidth ||
            oldOptions.tabSizingFixedMaxWidth !== newOptions.tabSizingFixedMaxWidth ||
            oldOptions.tabSizing !== newOptions.tabSizing) {
            this.updateTabSizing(true);
        }
        // Redraw tabs when other options change
        if (oldOptions.labelFormat !== newOptions.labelFormat ||
            oldOptions.tabActionLocation !== newOptions.tabActionLocation ||
            oldOptions.tabActionCloseVisibility !== newOptions.tabActionCloseVisibility ||
            oldOptions.tabActionUnpinVisibility !== newOptions.tabActionUnpinVisibility ||
            oldOptions.tabSizing !== newOptions.tabSizing ||
            oldOptions.pinnedTabSizing !== newOptions.pinnedTabSizing ||
            oldOptions.showIcons !== newOptions.showIcons ||
            oldOptions.hasIcons !== newOptions.hasIcons ||
            oldOptions.highlightModifiedTabs !== newOptions.highlightModifiedTabs ||
            oldOptions.wrapTabs !== newOptions.wrapTabs ||
            !equals(oldOptions.decorations, newOptions.decorations)) {
            this.redraw();
        }
    }
    updateStyles() {
        this.redraw();
    }
    forEachTab(fn, fromTabIndex, toTabIndex) {
        this.tabsModel.getEditors(1 /* EditorsOrder.SEQUENTIAL */).forEach((editor, tabIndex) => {
            if (typeof fromTabIndex === 'number' && fromTabIndex > tabIndex) {
                return; // do nothing if we are not yet at `fromIndex`
            }
            if (typeof toTabIndex === 'number' && toTabIndex < tabIndex) {
                return; // do nothing if we are beyond `toIndex`
            }
            this.doWithTab(tabIndex, editor, fn);
        });
    }
    withTab(editor, fn) {
        this.doWithTab(this.tabsModel.indexOf(editor), editor, fn);
    }
    doWithTab(tabIndex, editor, fn) {
        const tabsContainer = assertIsDefined(this.tabsContainer);
        const tabContainer = tabsContainer.children[tabIndex];
        const tabResourceLabel = this.tabResourceLabels.get(tabIndex);
        const tabLabel = this.tabLabels[tabIndex];
        const tabActionBar = this.tabActionBars[tabIndex];
        if (tabContainer && tabResourceLabel && tabLabel) {
            fn(editor, tabIndex, tabContainer, tabResourceLabel, tabLabel, tabActionBar);
        }
    }
    createTab(tabIndex, tabsContainer, tabsScrollbar) {
        // Tab Container
        const tabContainer = $('.tab', {
            draggable: true,
            role: 'tab'
        });
        // Gesture Support
        this._register(Gesture.addTarget(tabContainer));
        // Tab Border Top
        const tabBorderTopContainer = $('.tab-border-top-container');
        tabContainer.appendChild(tabBorderTopContainer);
        // Tab Editor Label
        const editorLabel = this.tabResourceLabels.create(tabContainer, { hoverTargetOverride: tabContainer });
        // Tab Actions
        const tabActionsContainer = $('.tab-actions');
        tabContainer.appendChild(tabActionsContainer);
        const that = this;
        const tabActionRunner = new EditorCommandsContextActionRunner({
            groupId: this.groupView.id,
            get editorIndex() { return that.toEditorIndex(tabIndex); }
        });
        const tabActionBar = new ActionBar(tabActionsContainer, { ariaLabel: localize('ariaLabelTabActions', "Tab actions"), actionRunner: tabActionRunner });
        const tabActionListener = tabActionBar.onWillRun(e => {
            if (e.action.id === this.closeEditorAction.id) {
                this.blockRevealActiveTabOnce();
            }
        });
        const tabActionBarDisposable = combinedDisposable(tabActionRunner, tabActionBar, tabActionListener, toDisposable(insert(this.tabActionBars, tabActionBar)));
        // Tab Fade Hider
        // Hides the tab fade to the right when tab action left and sizing shrink/fixed, ::after, ::before are already used
        const tabShadowHider = $('.tab-fade-hider');
        tabContainer.appendChild(tabShadowHider);
        // Tab Border Bottom
        const tabBorderBottomContainer = $('.tab-border-bottom-container');
        tabContainer.appendChild(tabBorderBottomContainer);
        // Eventing
        const eventsDisposable = this.registerTabListeners(tabContainer, tabIndex, tabsContainer, tabsScrollbar);
        this.tabDisposables.push(combinedDisposable(eventsDisposable, tabActionBarDisposable, tabActionRunner, editorLabel));
        return tabContainer;
    }
    toEditorIndex(tabIndex) {
        // Given a `tabIndex` that is relative to the tabs model
        // returns the `editorIndex` relative to the entire group
        const editor = assertIsDefined(this.tabsModel.getEditorByIndex(tabIndex));
        return this.groupView.getIndexOfEditor(editor);
    }
    registerTabListeners(tab, tabIndex, tabsContainer, tabsScrollbar) {
        const disposables = new DisposableStore();
        const handleClickOrTouch = async (e, preserveFocus) => {
            tab.blur(); // prevent flicker of focus outline on tab until editor got focus
            if (isMouseEvent(e) && (e.button !== 0 /* middle/right mouse button */ || (isMacintosh && e.ctrlKey /* macOS context menu */))) {
                if (e.button === 1) {
                    e.preventDefault(); // required to prevent auto-scrolling (https://github.com/microsoft/vscode/issues/16690)
                }
                return;
            }
            if (this.originatesFromTabActionBar(e)) {
                return; // not when clicking on actions
            }
            // Open tabs editor
            const editor = this.tabsModel.getEditorByIndex(tabIndex);
            if (editor) {
                if (e.shiftKey) {
                    let anchor;
                    if (this.lastSingleSelectSelectedEditor && this.tabsModel.isSelected(this.lastSingleSelectSelectedEditor)) {
                        // The last selected editor is the anchor
                        anchor = this.lastSingleSelectSelectedEditor;
                    }
                    else {
                        // The active editor is the anchor
                        const activeEditor = assertIsDefined(this.groupView.activeEditor);
                        this.lastSingleSelectSelectedEditor = activeEditor;
                        anchor = activeEditor;
                    }
                    await this.selectEditorsBetween(editor, anchor);
                }
                else if ((e.ctrlKey && !isMacintosh) || (e.metaKey && isMacintosh)) {
                    if (this.tabsModel.isSelected(editor)) {
                        await this.unselectEditor(editor);
                    }
                    else {
                        await this.selectEditor(editor);
                        this.lastSingleSelectSelectedEditor = editor;
                    }
                }
                else {
                    // Even if focus is preserved make sure to activate the group.
                    // If a new active editor is selected, keep the current selection on key
                    // down such that drag and drop can operate over the selection. The selection
                    // is removed on key up in this case.
                    const inactiveSelection = this.tabsModel.isSelected(editor) ? this.groupView.selectedEditors.filter(e => !e.matches(editor)) : [];
                    await this.groupView.openEditor(editor, { preserveFocus, activation: EditorActivation.ACTIVATE }, { inactiveSelection, focusTabControl: true });
                }
            }
        };
        const showContextMenu = (e) => {
            EventHelper.stop(e);
            const editor = this.tabsModel.getEditorByIndex(tabIndex);
            if (editor) {
                this.onTabContextMenu(editor, e, tab);
            }
        };
        // Open on Click / Touch
        disposables.add(addDisposableListener(tab, EventType.MOUSE_DOWN, e => handleClickOrTouch(e, false)));
        disposables.add(addDisposableListener(tab, TouchEventType.Tap, (e) => handleClickOrTouch(e, true))); // Preserve focus on touch #125470
        // Touch Scroll Support
        disposables.add(addDisposableListener(tab, TouchEventType.Change, (e) => {
            tabsScrollbar.setScrollPosition({ scrollLeft: tabsScrollbar.getScrollPosition().scrollLeft - e.translationX });
        }));
        // Update selection & prevent flicker of focus outline on tab until editor got focus
        disposables.add(addDisposableListener(tab, EventType.MOUSE_UP, async (e) => {
            EventHelper.stop(e);
            tab.blur();
            if (isMouseEvent(e) && (e.button !== 0 /* middle/right mouse button */ || (isMacintosh && e.ctrlKey /* macOS context menu */))) {
                return;
            }
            if (this.originatesFromTabActionBar(e)) {
                return; // not when clicking on actions
            }
            const isCtrlCmd = (e.ctrlKey && !isMacintosh) || (e.metaKey && isMacintosh);
            if (!isCtrlCmd && !e.shiftKey && this.groupView.selectedEditors.length > 1) {
                await this.unselectAllEditors();
            }
        }));
        // Close on mouse middle click
        disposables.add(addDisposableListener(tab, EventType.AUXCLICK, e => {
            if (e.button === 1 /* Middle Button*/) {
                EventHelper.stop(e, true /* for https://github.com/microsoft/vscode/issues/56715 */);
                const editor = this.tabsModel.getEditorByIndex(tabIndex);
                if (editor) {
                    if (preventEditorClose(this.tabsModel, editor, EditorCloseMethod.MOUSE, this.groupsView.partOptions)) {
                        return;
                    }
                    this.blockRevealActiveTabOnce();
                    this.closeEditorAction.run({ groupId: this.groupView.id, editorIndex: this.groupView.getIndexOfEditor(editor) });
                }
            }
        }));
        // Context menu on Shift+F10
        disposables.add(addDisposableListener(tab, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.shiftKey && event.keyCode === 68 /* KeyCode.F10 */) {
                showContextMenu(e);
            }
        }));
        // Context menu on touch context menu gesture
        disposables.add(addDisposableListener(tab, TouchEventType.Contextmenu, (e) => {
            showContextMenu(e);
        }));
        // Keyboard accessibility
        disposables.add(addDisposableListener(tab, EventType.KEY_UP, e => {
            const event = new StandardKeyboardEvent(e);
            let handled = false;
            // Run action on Enter/Space
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                handled = true;
                const editor = this.tabsModel.getEditorByIndex(tabIndex);
                if (editor) {
                    this.groupView.openEditor(editor);
                }
            }
            // Navigate in editors
            else if ([15 /* KeyCode.LeftArrow */, 17 /* KeyCode.RightArrow */, 16 /* KeyCode.UpArrow */, 18 /* KeyCode.DownArrow */, 14 /* KeyCode.Home */, 13 /* KeyCode.End */].some(kb => event.equals(kb))) {
                let editorIndex = this.toEditorIndex(tabIndex);
                if (event.equals(15 /* KeyCode.LeftArrow */) || event.equals(16 /* KeyCode.UpArrow */)) {
                    editorIndex = editorIndex - 1;
                }
                else if (event.equals(17 /* KeyCode.RightArrow */) || event.equals(18 /* KeyCode.DownArrow */)) {
                    editorIndex = editorIndex + 1;
                }
                else if (event.equals(14 /* KeyCode.Home */)) {
                    editorIndex = 0;
                }
                else {
                    editorIndex = this.groupView.count - 1;
                }
                const target = this.groupView.getEditorByIndex(editorIndex);
                if (target) {
                    handled = true;
                    this.groupView.openEditor(target, { preserveFocus: true }, { focusTabControl: true });
                }
            }
            if (handled) {
                EventHelper.stop(e, true);
            }
            // moving in the tabs container can have an impact on scrolling position, so we need to update the custom scrollbar
            tabsScrollbar.setScrollPosition({
                scrollLeft: tabsContainer.scrollLeft
            });
        }));
        // Double click: either pin or toggle maximized
        for (const eventType of [TouchEventType.Tap, EventType.DBLCLICK]) {
            disposables.add(addDisposableListener(tab, eventType, (e) => {
                if (eventType === EventType.DBLCLICK) {
                    EventHelper.stop(e);
                }
                else if (e.tapCount !== 2) {
                    return; // ignore single taps
                }
                const editor = this.tabsModel.getEditorByIndex(tabIndex);
                if (editor && this.tabsModel.isPinned(editor)) {
                    switch (this.groupsView.partOptions.doubleClickTabToToggleEditorGroupSizes) {
                        case 'maximize':
                            this.groupsView.toggleMaximizeGroup(this.groupView);
                            break;
                        case 'expand':
                            this.groupsView.toggleExpandGroup(this.groupView);
                            break;
                        case 'off':
                            break;
                    }
                }
                else {
                    this.groupView.pinEditor(editor);
                }
            }));
        }
        // Context menu
        disposables.add(addDisposableListener(tab, EventType.CONTEXT_MENU, e => {
            EventHelper.stop(e, true);
            const editor = this.tabsModel.getEditorByIndex(tabIndex);
            if (editor) {
                this.onTabContextMenu(editor, e, tab);
            }
        }, true /* use capture to fix https://github.com/microsoft/vscode/issues/19145 */));
        // Drag & Drop support
        let lastDragEvent = undefined;
        let isNewWindowOperation = false;
        disposables.add(new DragAndDropObserver(tab, {
            onDragStart: e => {
                const editor = this.tabsModel.getEditorByIndex(tabIndex);
                if (!editor) {
                    return;
                }
                isNewWindowOperation = this.isNewWindowOperation(e);
                const selectedEditors = this.groupView.selectedEditors;
                this.editorTransfer.setData(selectedEditors.map(e => new DraggedEditorIdentifier({ editor: e, groupId: this.groupView.id })), DraggedEditorIdentifier.prototype);
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'copyMove';
                    if (selectedEditors.length > 1) {
                        const label = `${editor.getName()} + ${selectedEditors.length - 1}`;
                        applyDragImage(e, tab, label);
                    }
                    else {
                        e.dataTransfer.setDragImage(tab, 0, 0); // top left corner of dragged tab set to cursor position to make room for drop-border feedback
                    }
                }
                // Apply some datatransfer types to allow for dragging the element outside of the application
                this.doFillResourceDataTransfers(selectedEditors, e, isNewWindowOperation);
                scheduleAtNextAnimationFrame(getWindow(this.parent), () => this.updateDropFeedback(tab, false, e, tabIndex));
            },
            onDrag: e => {
                lastDragEvent = e;
            },
            onDragEnter: e => {
                // Return if transfer is unsupported
                if (!this.isSupportedDropTransfer(e)) {
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'none';
                    }
                    return;
                }
                // Update the dropEffect to "copy" if there is no local data to be dragged because
                // in that case we can only copy the data into and not move it from its source
                if (!this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
                    if (e.dataTransfer) {
                        e.dataTransfer.dropEffect = 'copy';
                    }
                }
                this.updateDropFeedback(tab, true, e, tabIndex);
            },
            onDragOver: (e, dragDuration) => {
                if (dragDuration >= MultiEditorTabsControl_1.DRAG_OVER_OPEN_TAB_THRESHOLD) {
                    const draggedOverTab = this.tabsModel.getEditorByIndex(tabIndex);
                    if (draggedOverTab && this.tabsModel.activeEditor !== draggedOverTab) {
                        this.groupView.openEditor(draggedOverTab, { preserveFocus: true });
                    }
                }
                this.updateDropFeedback(tab, true, e, tabIndex);
            },
            onDragEnd: async (e) => {
                this.updateDropFeedback(tab, false, e, tabIndex);
                const draggedEditors = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
                this.editorTransfer.clearData(DraggedEditorIdentifier.prototype);
                if (!isNewWindowOperation ||
                    isWindowDraggedOver() ||
                    !draggedEditors ||
                    draggedEditors.length === 0) {
                    return; // drag to open in new window is disabled
                }
                const auxiliaryEditorPart = await this.maybeCreateAuxiliaryEditorPartAt(e, tab);
                if (!auxiliaryEditorPart) {
                    return;
                }
                const targetGroup = auxiliaryEditorPart.activeGroup;
                const editorsWithOptions = prepareMoveCopyEditors(this.groupView, draggedEditors.map(editor => editor.identifier.editor));
                if (this.isMoveOperation(lastDragEvent ?? e, targetGroup.id, draggedEditors[0].identifier.editor)) {
                    this.groupView.moveEditors(editorsWithOptions, targetGroup);
                }
                else {
                    this.groupView.copyEditors(editorsWithOptions, targetGroup);
                }
                targetGroup.focus();
            },
            onDrop: e => {
                this.updateDropFeedback(tab, false, e, tabIndex);
                // compute the target index
                let targetIndex = tabIndex;
                if (this.getTabDragOverLocation(e, tab) === 'right') {
                    targetIndex++;
                }
                this.onDrop(e, targetIndex, tabsContainer);
            }
        }));
        return disposables;
    }
    isSupportedDropTransfer(e) {
        if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
            const data = this.groupTransfer.getData(DraggedEditorGroupIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const group = data[0];
                if (group.identifier === this.groupView.id) {
                    return false; // groups cannot be dropped on group it originates from
                }
            }
            return true;
        }
        if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
            return true; // (local) editors can always be dropped
        }
        if (e.dataTransfer && e.dataTransfer.types.length > 0) {
            return true; // optimistically allow external data (// see https://github.com/microsoft/vscode/issues/25789)
        }
        return false;
    }
    updateDropFeedback(element, isDND, e, tabIndex) {
        const isTab = (typeof tabIndex === 'number');
        let dropTarget;
        if (isDND) {
            if (isTab) {
                dropTarget = this.computeDropTarget(e, tabIndex, element);
            }
            else {
                dropTarget = { leftElement: element.lastElementChild, rightElement: undefined };
            }
        }
        else {
            dropTarget = undefined;
        }
        this.updateDropTarget(dropTarget);
    }
    updateDropTarget(newTarget) {
        const oldTargets = this.dropTarget;
        if (oldTargets === newTarget || oldTargets && newTarget && oldTargets.leftElement === newTarget.leftElement && oldTargets.rightElement === newTarget.rightElement) {
            return;
        }
        const dropClassLeft = 'drop-target-left';
        const dropClassRight = 'drop-target-right';
        if (oldTargets) {
            oldTargets.leftElement?.classList.remove(dropClassLeft);
            oldTargets.rightElement?.classList.remove(dropClassRight);
        }
        if (newTarget) {
            newTarget.leftElement?.classList.add(dropClassLeft);
            newTarget.rightElement?.classList.add(dropClassRight);
        }
        this.dropTarget = newTarget;
    }
    getTabDragOverLocation(e, tab) {
        const rect = tab.getBoundingClientRect();
        const offsetXRelativeToParent = e.clientX - rect.left;
        return offsetXRelativeToParent <= rect.width / 2 ? 'left' : 'right';
    }
    computeDropTarget(e, tabIndex, targetTab) {
        const isLeftSideOfTab = this.getTabDragOverLocation(e, targetTab) === 'left';
        const isLastTab = tabIndex === this.tabsModel.count - 1;
        const isFirstTab = tabIndex === 0;
        // Before first tab
        if (isLeftSideOfTab && isFirstTab) {
            return { leftElement: undefined, rightElement: targetTab };
        }
        // After last tab
        if (!isLeftSideOfTab && isLastTab) {
            return { leftElement: targetTab, rightElement: undefined };
        }
        // Between two tabs
        const tabBefore = isLeftSideOfTab ? targetTab.previousElementSibling : targetTab;
        const tabAfter = isLeftSideOfTab ? targetTab : targetTab.nextElementSibling;
        return { leftElement: tabBefore, rightElement: tabAfter };
    }
    async selectEditor(editor) {
        if (this.groupView.isActive(editor)) {
            return;
        }
        await this.groupView.setSelection(editor, this.groupView.selectedEditors);
    }
    async selectEditorsBetween(target, anchor) {
        const editorIndex = this.groupView.getIndexOfEditor(target);
        if (editorIndex === -1) {
            throw new BugIndicatingError();
        }
        const anchorEditorIndex = this.groupView.getIndexOfEditor(anchor);
        if (anchorEditorIndex === -1) {
            throw new BugIndicatingError();
        }
        let selection = this.groupView.selectedEditors;
        // Unselect editors on other side of anchor in relation to the target
        let currentEditorIndex = anchorEditorIndex;
        while (currentEditorIndex >= 0 && currentEditorIndex <= this.groupView.count - 1) {
            currentEditorIndex = anchorEditorIndex < editorIndex ? currentEditorIndex - 1 : currentEditorIndex + 1;
            const currentEditor = this.groupView.getEditorByIndex(currentEditorIndex);
            if (!currentEditor) {
                break;
            }
            if (!this.groupView.isSelected(currentEditor)) {
                break;
            }
            selection = selection.filter(editor => !editor.matches(currentEditor));
        }
        // Select editors between anchor and target
        const fromEditorIndex = anchorEditorIndex < editorIndex ? anchorEditorIndex : editorIndex;
        const toEditorIndex = anchorEditorIndex < editorIndex ? editorIndex : anchorEditorIndex;
        const editorsToSelect = this.groupView.getEditors(1 /* EditorsOrder.SEQUENTIAL */).slice(fromEditorIndex, toEditorIndex + 1);
        for (const editor of editorsToSelect) {
            if (!this.groupView.isSelected(editor)) {
                selection.push(editor);
            }
        }
        const inactiveSelectedEditors = selection.filter(editor => !editor.matches(target));
        await this.groupView.setSelection(target, inactiveSelectedEditors);
    }
    async unselectEditor(editor) {
        const isUnselectingActiveEditor = this.groupView.isActive(editor);
        // If there is only one editor selected, do not unselect it
        if (isUnselectingActiveEditor && this.groupView.selectedEditors.length === 1) {
            return;
        }
        let newActiveEditor = assertIsDefined(this.groupView.activeEditor);
        // If active editor is bing unselected then find the most recently opened selected editor
        // that is not the editor being unselected
        if (isUnselectingActiveEditor) {
            const recentEditors = this.groupView.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
            for (let i = 1; i < recentEditors.length; i++) { // First one is the active editor
                const recentEditor = recentEditors[i];
                if (this.groupView.isSelected(recentEditor)) {
                    newActiveEditor = recentEditor;
                    break;
                }
            }
        }
        const inactiveSelectedEditors = this.groupView.selectedEditors.filter(e => !e.matches(editor) && !e.matches(newActiveEditor));
        await this.groupView.setSelection(newActiveEditor, inactiveSelectedEditors);
    }
    async unselectAllEditors() {
        if (this.groupView.selectedEditors.length > 1) {
            const activeEditor = assertIsDefined(this.groupView.activeEditor);
            await this.groupView.setSelection(activeEditor, []);
        }
    }
    computeTabLabels() {
        const { labelFormat } = this.groupsView.partOptions;
        const { verbosity, shortenDuplicates } = this.getLabelConfigFlags(labelFormat);
        // Build labels and descriptions for each editor
        const labels = [];
        let activeEditorTabIndex = -1;
        this.tabsModel.getEditors(1 /* EditorsOrder.SEQUENTIAL */).forEach((editor, tabIndex) => {
            labels.push({
                editor,
                name: editor.getName(),
                description: editor.getDescription(verbosity),
                forceDescription: editor.hasCapability(64 /* EditorInputCapabilities.ForceDescription */),
                title: editor.getTitle(2 /* Verbosity.LONG */),
                ariaLabel: computeEditorAriaLabel(editor, tabIndex, this.groupView, this.editorPartsView.count)
            });
            if (editor === this.tabsModel.activeEditor) {
                activeEditorTabIndex = tabIndex;
            }
        });
        // Shorten labels as needed
        if (shortenDuplicates) {
            this.shortenTabLabels(labels);
        }
        // Remember for fast lookup
        this.tabLabels = labels;
        this.activeTabLabel = labels[activeEditorTabIndex];
    }
    shortenTabLabels(labels) {
        // Gather duplicate titles, while filtering out invalid descriptions
        const mapNameToDuplicates = new Map();
        for (const label of labels) {
            if (typeof label.description === 'string') {
                getOrSet(mapNameToDuplicates, label.name, []).push(label);
            }
            else {
                label.description = '';
            }
        }
        // Identify duplicate names and shorten descriptions
        for (const [, duplicateLabels] of mapNameToDuplicates) {
            // Remove description if the title isn't duplicated
            // and we have no indication to enforce description
            if (duplicateLabels.length === 1 && !duplicateLabels[0].forceDescription) {
                duplicateLabels[0].description = '';
                continue;
            }
            // Identify duplicate descriptions
            const mapDescriptionToDuplicates = new Map();
            for (const duplicateLabel of duplicateLabels) {
                getOrSet(mapDescriptionToDuplicates, duplicateLabel.description, []).push(duplicateLabel);
            }
            // For editors with duplicate descriptions, check whether any long descriptions differ
            let useLongDescriptions = false;
            for (const [, duplicateLabels] of mapDescriptionToDuplicates) {
                if (!useLongDescriptions && duplicateLabels.length > 1) {
                    const [first, ...rest] = duplicateLabels.map(({ editor }) => editor.getDescription(2 /* Verbosity.LONG */));
                    useLongDescriptions = rest.some(description => description !== first);
                }
            }
            // If so, replace all descriptions with long descriptions
            if (useLongDescriptions) {
                mapDescriptionToDuplicates.clear();
                for (const duplicateLabel of duplicateLabels) {
                    duplicateLabel.description = duplicateLabel.editor.getDescription(2 /* Verbosity.LONG */);
                    getOrSet(mapDescriptionToDuplicates, duplicateLabel.description, []).push(duplicateLabel);
                }
            }
            // Obtain final set of descriptions
            const descriptions = [];
            for (const [description] of mapDescriptionToDuplicates) {
                descriptions.push(description);
            }
            // Remove description if all descriptions are identical unless forced
            if (descriptions.length === 1) {
                for (const label of mapDescriptionToDuplicates.get(descriptions[0]) || []) {
                    if (!label.forceDescription) {
                        label.description = '';
                    }
                }
                continue;
            }
            // Shorten descriptions
            const shortenedDescriptions = shorten(descriptions, this.path.sep);
            descriptions.forEach((description, tabIndex) => {
                for (const label of mapDescriptionToDuplicates.get(description) || []) {
                    label.description = shortenedDescriptions[tabIndex];
                }
            });
        }
    }
    getLabelConfigFlags(value) {
        switch (value) {
            case 'short':
                return { verbosity: 0 /* Verbosity.SHORT */, shortenDuplicates: false };
            case 'medium':
                return { verbosity: 1 /* Verbosity.MEDIUM */, shortenDuplicates: false };
            case 'long':
                return { verbosity: 2 /* Verbosity.LONG */, shortenDuplicates: false };
            default:
                return { verbosity: 1 /* Verbosity.MEDIUM */, shortenDuplicates: true };
        }
    }
    redraw(options) {
        // Border below tabs if any with explicit high contrast support
        if (this.tabsAndActionsContainer) {
            let tabsContainerBorderColor = this.getColor(EDITOR_GROUP_HEADER_TABS_BORDER);
            if (!tabsContainerBorderColor && isHighContrast(this.theme.type)) {
                tabsContainerBorderColor = this.getColor(TAB_BORDER) || this.getColor(contrastBorder);
            }
            if (tabsContainerBorderColor) {
                this.tabsAndActionsContainer.classList.add('tabs-border-bottom');
                this.tabsAndActionsContainer.style.setProperty('--tabs-border-bottom-color', tabsContainerBorderColor.toString());
            }
            else {
                this.tabsAndActionsContainer.classList.remove('tabs-border-bottom');
                this.tabsAndActionsContainer.style.removeProperty('--tabs-border-bottom-color');
            }
        }
        // For each tab
        this.forEachTab((editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) => {
            this.redrawTab(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar);
        });
        // Update Editor Actions Toolbar
        this.updateEditorActionsToolbar();
        // Ensure the active tab is always revealed
        this.layout(this.dimensions, options);
    }
    redrawTab(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel, tabActionBar) {
        const isTabSticky = this.tabsModel.isSticky(tabIndex);
        const options = this.groupsView.partOptions;
        // Label
        this.redrawTabLabel(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel);
        // Action
        const hasUnpinAction = isTabSticky && options.tabActionUnpinVisibility;
        const hasCloseAction = !hasUnpinAction && options.tabActionCloseVisibility;
        const hasAction = hasUnpinAction || hasCloseAction;
        let tabAction;
        if (hasAction) {
            tabAction = hasUnpinAction ? this.unpinEditorAction : this.closeEditorAction;
        }
        else {
            // Even if the action is not visible, add it as it contains the dirty indicator
            tabAction = isTabSticky ? this.unpinEditorAction : this.closeEditorAction;
        }
        if (!tabActionBar.hasAction(tabAction)) {
            if (!tabActionBar.isEmpty()) {
                tabActionBar.clear();
            }
            tabActionBar.push(tabAction, { icon: true, label: false, keybinding: this.getKeybindingLabel(tabAction) });
        }
        tabContainer.classList.toggle(`pinned-action-off`, isTabSticky && !hasUnpinAction);
        tabContainer.classList.toggle(`close-action-off`, !hasUnpinAction && !hasCloseAction);
        for (const option of ['left', 'right']) {
            tabContainer.classList.toggle(`tab-actions-${option}`, hasAction && options.tabActionLocation === option);
        }
        const tabSizing = isTabSticky && options.pinnedTabSizing === 'shrink' ? 'shrink' /* treat sticky shrink tabs as tabSizing: 'shrink' */ : options.tabSizing;
        for (const option of ['fit', 'shrink', 'fixed']) {
            tabContainer.classList.toggle(`sizing-${option}`, tabSizing === option);
        }
        tabContainer.classList.toggle('has-icon', options.showIcons && options.hasIcons);
        tabContainer.classList.toggle('sticky', isTabSticky);
        for (const option of ['normal', 'compact', 'shrink']) {
            tabContainer.classList.toggle(`sticky-${option}`, isTabSticky && options.pinnedTabSizing === option);
        }
        // If not wrapping tabs, sticky compact/shrink tabs need a position to remain at their location
        // when scrolling to stay in view (requirement for position: sticky)
        if (!options.wrapTabs && isTabSticky && options.pinnedTabSizing !== 'normal') {
            let stickyTabWidth = 0;
            switch (options.pinnedTabSizing) {
                case 'compact':
                    stickyTabWidth = MultiEditorTabsControl_1.TAB_WIDTH.compact;
                    break;
                case 'shrink':
                    stickyTabWidth = MultiEditorTabsControl_1.TAB_WIDTH.shrink;
                    break;
            }
            tabContainer.style.left = `${tabIndex * stickyTabWidth}px`;
        }
        else {
            tabContainer.style.left = 'auto';
        }
        // Borders / outline
        this.redrawTabBorders(tabIndex, tabContainer);
        // Selection / active / dirty state
        this.redrawTabSelectedActiveAndDirty(this.groupsView.activeGroup === this.groupView, editor, tabContainer, tabActionBar);
    }
    redrawTabLabel(editor, tabIndex, tabContainer, tabLabelWidget, tabLabel) {
        const options = this.groupsView.partOptions;
        // Unless tabs are sticky compact, show the full label and description
        // Sticky compact tabs will only show an icon if icons are enabled
        // or their first character of the name otherwise
        let name;
        let forceLabel = false;
        let fileDecorationBadges = Boolean(options.decorations?.badges);
        const fileDecorationColors = Boolean(options.decorations?.colors);
        let description;
        if (options.pinnedTabSizing === 'compact' && this.tabsModel.isSticky(tabIndex)) {
            const isShowingIcons = options.showIcons && options.hasIcons;
            name = isShowingIcons ? '' : tabLabel.name?.charAt(0).toUpperCase();
            description = '';
            forceLabel = true;
            fileDecorationBadges = false; // not enough space when sticky tabs are compact
        }
        else {
            name = tabLabel.name;
            description = tabLabel.description || '';
        }
        if (tabLabel.ariaLabel) {
            tabContainer.setAttribute('aria-label', tabLabel.ariaLabel);
            // Set aria-description to empty string so that screen readers would not read the title as well
            // More details https://github.com/microsoft/vscode/issues/95378
            tabContainer.setAttribute('aria-description', '');
        }
        // Label
        tabLabelWidget.setResource({ name, description, resource: EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH }) }, {
            title: this.getHoverTitle(editor),
            extraClasses: coalesce(['tab-label', fileDecorationBadges ? 'tab-label-has-badge' : undefined].concat(editor.getLabelExtraClasses())),
            italic: !this.tabsModel.isPinned(editor),
            forceLabel,
            fileDecorations: {
                colors: fileDecorationColors,
                badges: fileDecorationBadges
            },
            icon: editor.getIcon(),
            hideIcon: options.showIcons === false,
        });
        // Tests helper
        const resource = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (resource) {
            tabContainer.setAttribute('data-resource-name', basenameOrAuthority(resource));
        }
        else {
            tabContainer.removeAttribute('data-resource-name');
        }
    }
    redrawTabSelectedActiveAndDirty(isGroupActive, editor, tabContainer, tabActionBar) {
        const isTabActive = this.tabsModel.isActive(editor);
        const hasModifiedBorderTop = this.doRedrawTabDirty(isGroupActive, isTabActive, editor, tabContainer);
        this.doRedrawTabActive(isGroupActive, !hasModifiedBorderTop, editor, tabContainer, tabActionBar);
    }
    doRedrawTabActive(isGroupActive, allowBorderTop, editor, tabContainer, tabActionBar) {
        const isActive = this.tabsModel.isActive(editor);
        const isSelected = this.tabsModel.isSelected(editor);
        tabContainer.classList.toggle('active', isActive);
        tabContainer.classList.toggle('selected', isSelected);
        tabContainer.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tabContainer.tabIndex = isActive ? 0 : -1; // Only active tab can be focused into
        tabActionBar.setFocusable(isActive);
        // Set border BOTTOM if theme defined color
        if (isActive) {
            const activeTabBorderColorBottom = this.getColor(isGroupActive ? TAB_ACTIVE_BORDER : TAB_UNFOCUSED_ACTIVE_BORDER);
            tabContainer.classList.toggle('tab-border-bottom', !!activeTabBorderColorBottom);
            tabContainer.style.setProperty('--tab-border-bottom-color', activeTabBorderColorBottom ?? '');
        }
        // Set border TOP if theme defined color
        let tabBorderColorTop = null;
        if (allowBorderTop) {
            if (isActive) {
                tabBorderColorTop = this.getColor(isGroupActive ? TAB_ACTIVE_BORDER_TOP : TAB_UNFOCUSED_ACTIVE_BORDER_TOP);
            }
            if (tabBorderColorTop === null && isSelected) {
                tabBorderColorTop = this.getColor(TAB_SELECTED_BORDER_TOP);
            }
        }
        tabContainer.classList.toggle('tab-border-top', !!tabBorderColorTop);
        tabContainer.style.setProperty('--tab-border-top-color', tabBorderColorTop ?? '');
    }
    doRedrawTabDirty(isGroupActive, isTabActive, editor, tabContainer) {
        let hasModifiedBorderColor = false;
        // Tab: dirty (unless saving)
        if (editor.isDirty() && !editor.isSaving()) {
            tabContainer.classList.add('dirty');
            // Highlight modified tabs with a border if configured
            if (this.groupsView.partOptions.highlightModifiedTabs) {
                let modifiedBorderColor;
                if (isGroupActive && isTabActive) {
                    modifiedBorderColor = this.getColor(TAB_ACTIVE_MODIFIED_BORDER);
                }
                else if (isGroupActive && !isTabActive) {
                    modifiedBorderColor = this.getColor(TAB_INACTIVE_MODIFIED_BORDER);
                }
                else if (!isGroupActive && isTabActive) {
                    modifiedBorderColor = this.getColor(TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER);
                }
                else {
                    modifiedBorderColor = this.getColor(TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER);
                }
                if (modifiedBorderColor) {
                    hasModifiedBorderColor = true;
                    tabContainer.classList.add('dirty-border-top');
                    tabContainer.style.setProperty('--tab-dirty-border-top-color', modifiedBorderColor);
                }
            }
            else {
                tabContainer.classList.remove('dirty-border-top');
                tabContainer.style.removeProperty('--tab-dirty-border-top-color');
            }
        }
        // Tab: not dirty
        else {
            tabContainer.classList.remove('dirty', 'dirty-border-top');
            tabContainer.style.removeProperty('--tab-dirty-border-top-color');
        }
        return hasModifiedBorderColor;
    }
    redrawTabBorders(tabIndex, tabContainer) {
        const isTabSticky = this.tabsModel.isSticky(tabIndex);
        const isTabLastSticky = isTabSticky && this.tabsModel.stickyCount === tabIndex + 1;
        const showLastStickyTabBorderColor = this.tabsModel.stickyCount !== this.tabsModel.count;
        // Borders / Outline
        const borderRightColor = ((isTabLastSticky && showLastStickyTabBorderColor ? this.getColor(TAB_LAST_PINNED_BORDER) : undefined) || this.getColor(TAB_BORDER) || this.getColor(contrastBorder));
        tabContainer.style.borderRight = borderRightColor ? `1px solid ${borderRightColor}` : '';
        tabContainer.style.outlineColor = this.getColor(activeContrastBorder) || '';
    }
    prepareEditorActions(editorActions) {
        const isGroupActive = this.groupsView.activeGroup === this.groupView;
        // Active: allow all actions
        if (isGroupActive) {
            return editorActions;
        }
        // Inactive: only show "Unlock" and secondary actions
        else {
            return {
                primary: this.groupsView.partOptions.alwaysShowEditorActions ? editorActions.primary : editorActions.primary.filter(action => action.id === UNLOCK_GROUP_COMMAND_ID),
                secondary: editorActions.secondary
            };
        }
    }
    getHeight() {
        // Return quickly if our used dimensions are known
        if (this.dimensions.used) {
            return this.dimensions.used.height;
        }
        // Otherwise compute via browser APIs
        else {
            return this.computeHeight();
        }
    }
    computeHeight() {
        let height;
        if (!this.visible) {
            height = 0;
        }
        else if (this.groupsView.partOptions.wrapTabs && this.tabsAndActionsContainer?.classList.contains('wrapping')) {
            // Wrap: we need to ask `offsetHeight` to get
            // the real height of the title area with wrapping.
            height = this.tabsAndActionsContainer.offsetHeight;
        }
        else {
            height = this.tabHeight;
        }
        return height;
    }
    layout(dimensions, options) {
        // Remember dimensions that we get
        Object.assign(this.dimensions, dimensions);
        if (this.visible) {
            if (!this.layoutScheduler.value) {
                // The layout of tabs can be an expensive operation because we access DOM properties
                // that can result in the browser doing a full page layout to validate them. To buffer
                // this a little bit we try at least to schedule this work on the next animation frame
                // when we have restored or when idle otherwise.
                const disposable = scheduleAtNextAnimationFrame(getWindow(this.parent), () => {
                    this.doLayout(this.dimensions, this.layoutScheduler.value?.options /* ensure to pick up latest options */);
                    this.layoutScheduler.clear();
                });
                this.layoutScheduler.value = { options, dispose: () => disposable.dispose() };
            }
            // Make sure to keep options updated
            if (options?.forceRevealActiveTab) {
                this.layoutScheduler.value.options = {
                    ...this.layoutScheduler.value.options,
                    forceRevealActiveTab: true
                };
            }
        }
        // First time layout: compute the dimensions and store it
        if (!this.dimensions.used) {
            this.dimensions.used = new Dimension(dimensions.container.width, this.computeHeight());
        }
        return this.dimensions.used;
    }
    doLayout(dimensions, options) {
        // Layout tabs
        if (dimensions.container !== Dimension.None && dimensions.available !== Dimension.None) {
            this.doLayoutTabs(dimensions, options);
        }
        // Remember the dimensions used in the control so that we can
        // return it fast from the `layout` call without having to
        // compute it over and over again
        const oldDimension = this.dimensions.used;
        const newDimension = this.dimensions.used = new Dimension(dimensions.container.width, this.computeHeight());
        // In case the height of the title control changed from before
        // (currently only possible if wrapping changed on/off), we need
        // to signal this to the outside via a `relayout` call so that
        // e.g. the editor control can be adjusted accordingly.
        if (oldDimension && oldDimension.height !== newDimension.height) {
            this.groupView.relayout();
        }
    }
    doLayoutTabs(dimensions, options) {
        // Always first layout tabs with wrapping support even if wrapping
        // is disabled. The result indicates if tabs wrap and if not, we
        // need to proceed with the layout without wrapping because even
        // if wrapping is enabled in settings, there are cases where
        // wrapping is disabled (e.g. due to space constraints)
        const tabsWrapMultiLine = this.doLayoutTabsWrapping(dimensions);
        if (!tabsWrapMultiLine) {
            this.doLayoutTabsNonWrapping(options);
        }
    }
    doLayoutTabsWrapping(dimensions) {
        const [tabsAndActionsContainer, tabsContainer, editorToolbarContainer, tabsScrollbar] = assertAllDefined(this.tabsAndActionsContainer, this.tabsContainer, this.editorActionsToolbarContainer, this.tabsScrollbar);
        // Handle wrapping tabs according to setting:
        // - enabled: only add class if tabs wrap and don't exceed available dimensions
        // - disabled: remove class and margin-right variable
        const didTabsWrapMultiLine = tabsAndActionsContainer.classList.contains('wrapping');
        let tabsWrapMultiLine = didTabsWrapMultiLine;
        function updateTabsWrapping(enabled) {
            tabsWrapMultiLine = enabled;
            // Toggle the `wrapped` class to enable wrapping
            tabsAndActionsContainer.classList.toggle('wrapping', tabsWrapMultiLine);
            // Update `last-tab-margin-right` CSS variable to account for the absolute
            // positioned editor actions container when tabs wrap. The margin needs to
            // be the width of the editor actions container to avoid screen cheese.
            tabsContainer.style.setProperty('--last-tab-margin-right', tabsWrapMultiLine ? `${editorToolbarContainer.offsetWidth}px` : '0');
            // Remove old css classes that are not needed anymore
            for (const tab of tabsContainer.children) {
                tab.classList.remove('last-in-row');
            }
        }
        // Setting enabled: selectively enable wrapping if possible
        if (this.groupsView.partOptions.wrapTabs) {
            const visibleTabsWidth = tabsContainer.offsetWidth;
            const allTabsWidth = tabsContainer.scrollWidth;
            const lastTabFitsWrapped = () => {
                const lastTab = this.getLastTab();
                if (!lastTab) {
                    return true; // no tab always fits
                }
                const lastTabOverlapWithToolbarWidth = lastTab.offsetWidth + editorToolbarContainer.offsetWidth - dimensions.available.width;
                if (lastTabOverlapWithToolbarWidth > 1) {
                    // Allow for slight rounding errors related to zooming here
                    // https://github.com/microsoft/vscode/issues/116385
                    return false;
                }
                return true;
            };
            // If tabs wrap or should start to wrap (when width exceeds visible width)
            // we must trigger `updateWrapping` to set the `last-tab-margin-right`
            // accordingly based on the number of actions. The margin is important to
            // properly position the last tab apart from the actions
            //
            // We already check here if the last tab would fit when wrapped given the
            // editor toolbar will also show right next to it. This ensures we are not
            // enabling wrapping only to disable it again in the code below (this fixes
            // flickering issue https://github.com/microsoft/vscode/issues/115050)
            if (tabsWrapMultiLine || (allTabsWidth > visibleTabsWidth && lastTabFitsWrapped())) {
                updateTabsWrapping(true);
            }
            // Tabs wrap multiline: remove wrapping under certain size constraint conditions
            if (tabsWrapMultiLine) {
                if ((tabsContainer.offsetHeight > dimensions.available.height) || // if height exceeds available height
                    (allTabsWidth === visibleTabsWidth && tabsContainer.offsetHeight === this.tabHeight) || // if wrapping is not needed anymore
                    (!lastTabFitsWrapped()) // if last tab does not fit anymore
                ) {
                    updateTabsWrapping(false);
                }
            }
        }
        // Setting disabled: remove CSS traces only if tabs did wrap
        else if (didTabsWrapMultiLine) {
            updateTabsWrapping(false);
        }
        // If we transitioned from non-wrapping to wrapping, we need
        // to update the scrollbar to have an equal `width` and
        // `scrollWidth`. Otherwise a scrollbar would appear which is
        // never desired when wrapping.
        if (tabsWrapMultiLine && !didTabsWrapMultiLine) {
            const visibleTabsWidth = tabsContainer.offsetWidth;
            tabsScrollbar.setScrollDimensions({
                width: visibleTabsWidth,
                scrollWidth: visibleTabsWidth
            });
        }
        // Update the `last-in-row` class on tabs when wrapping
        // is enabled (it doesn't do any harm otherwise). This
        // class controls additional properties of tab when it is
        // the last tab in a row
        if (tabsWrapMultiLine) {
            // Using a map here to change classes after the for loop is
            // crucial for performance because changing the class on a
            // tab can result in layouts of the rendering engine.
            const tabs = new Map();
            let currentTabsPosY = undefined;
            let lastTab = undefined;
            for (const child of tabsContainer.children) {
                const tab = child;
                const tabPosY = tab.offsetTop;
                // Marks a new or the first row of tabs
                if (tabPosY !== currentTabsPosY) {
                    currentTabsPosY = tabPosY;
                    if (lastTab) {
                        tabs.set(lastTab, true); // previous tab must be last in row then
                    }
                }
                // Always remember last tab and ensure the
                // last-in-row class is not present until
                // we know the tab is last
                lastTab = tab;
                tabs.set(tab, false);
            }
            // Last tab overally is always last-in-row
            if (lastTab) {
                tabs.set(lastTab, true);
            }
            for (const [tab, lastInRow] of tabs) {
                tab.classList.toggle('last-in-row', lastInRow);
            }
        }
        return tabsWrapMultiLine;
    }
    doLayoutTabsNonWrapping(options) {
        const [tabsContainer, tabsScrollbar] = assertAllDefined(this.tabsContainer, this.tabsScrollbar);
        //
        // Synopsis
        // - allTabsWidth:   			sum of all tab widths
        // - stickyTabsWidth:			sum of all sticky tab widths (unless `pinnedTabSizing: normal`)
        // - visibleContainerWidth: 	size of tab container
        // - availableContainerWidth: 	size of tab container minus size of sticky tabs
        //
        // [------------------------------ All tabs width ---------------------------------------]
        // [------------------- Visible container width -------------------]
        //                         [------ Available container width ------]
        // [ Sticky A ][ Sticky B ][ Tab C ][ Tab D ][ Tab E ][ Tab F ][ Tab G ][ Tab H ][ Tab I ]
        //                 Active Tab Width [-------]
        // [------- Active Tab Pos X -------]
        // [-- Sticky Tabs Width --]
        //
        const visibleTabsWidth = tabsContainer.offsetWidth;
        const allTabsWidth = tabsContainer.scrollWidth;
        // Compute width of sticky tabs depending on pinned tab sizing
        // - compact: sticky-tabs * TAB_SIZES.compact
        // -  shrink: sticky-tabs * TAB_SIZES.shrink
        // -  normal: 0 (sticky tabs inherit look and feel from non-sticky tabs)
        let stickyTabsWidth = 0;
        if (this.tabsModel.stickyCount > 0) {
            let stickyTabWidth = 0;
            switch (this.groupsView.partOptions.pinnedTabSizing) {
                case 'compact':
                    stickyTabWidth = MultiEditorTabsControl_1.TAB_WIDTH.compact;
                    break;
                case 'shrink':
                    stickyTabWidth = MultiEditorTabsControl_1.TAB_WIDTH.shrink;
                    break;
            }
            stickyTabsWidth = this.tabsModel.stickyCount * stickyTabWidth;
        }
        const activeTabAndIndex = this.tabsModel.activeEditor ? this.getTabAndIndex(this.tabsModel.activeEditor) : undefined;
        const [activeTab, activeTabIndex] = activeTabAndIndex ?? [undefined, undefined];
        // Figure out if active tab is positioned static which has an
        // impact on whether to reveal the tab or not later
        let activeTabPositionStatic = this.groupsView.partOptions.pinnedTabSizing !== 'normal' && typeof activeTabIndex === 'number' && this.tabsModel.isSticky(activeTabIndex);
        // Special case: we have sticky tabs but the available space for showing tabs
        // is little enough that we need to disable sticky tabs sticky positioning
        // so that tabs can be scrolled at naturally.
        let availableTabsContainerWidth = visibleTabsWidth - stickyTabsWidth;
        if (this.tabsModel.stickyCount > 0 && availableTabsContainerWidth < MultiEditorTabsControl_1.TAB_WIDTH.fit) {
            tabsContainer.classList.add('disable-sticky-tabs');
            availableTabsContainerWidth = visibleTabsWidth;
            stickyTabsWidth = 0;
            activeTabPositionStatic = false;
        }
        else {
            tabsContainer.classList.remove('disable-sticky-tabs');
        }
        let activeTabPosX;
        let activeTabWidth;
        if (!this.blockRevealActiveTab && activeTab) {
            activeTabPosX = activeTab.offsetLeft;
            activeTabWidth = activeTab.offsetWidth;
        }
        // Update scrollbar
        const { width: oldVisibleTabsWidth, scrollWidth: oldAllTabsWidth } = tabsScrollbar.getScrollDimensions();
        tabsScrollbar.setScrollDimensions({
            width: visibleTabsWidth,
            scrollWidth: allTabsWidth
        });
        const dimensionsChanged = oldVisibleTabsWidth !== visibleTabsWidth || oldAllTabsWidth !== allTabsWidth;
        // Revealing the active tab is skipped under some conditions:
        if (this.blockRevealActiveTab || // explicitly disabled
            typeof activeTabPosX !== 'number' || // invalid dimension
            typeof activeTabWidth !== 'number' || // invalid dimension
            activeTabPositionStatic || // static tab (sticky)
            (!dimensionsChanged && !options?.forceRevealActiveTab) // dimensions did not change and we have low layout priority (https://github.com/microsoft/vscode/issues/133631)
        ) {
            this.blockRevealActiveTab = false;
            return;
        }
        // Reveal the active one
        const tabsContainerScrollPosX = tabsScrollbar.getScrollPosition().scrollLeft;
        const activeTabFits = activeTabWidth <= availableTabsContainerWidth;
        const adjustedActiveTabPosX = activeTabPosX - stickyTabsWidth;
        //
        // Synopsis
        // - adjustedActiveTabPosX: the adjusted tabPosX takes the width of sticky tabs into account
        //   conceptually the scrolling only begins after sticky tabs so in order to reveal a tab fully
        //   the actual position needs to be adjusted for sticky tabs.
        //
        // Tab is overflowing to the right: Scroll minimally until the element is fully visible to the right
        // Note: only try to do this if we actually have enough width to give to show the tab fully!
        //
        // Example: Tab G should be made active and needs to be fully revealed as such.
        //
        // [-------------------------------- All tabs width -----------------------------------------]
        // [-------------------- Visible container width --------------------]
        //                           [----- Available container width -------]
        //     [ Sticky A ][ Sticky B ][ Tab C ][ Tab D ][ Tab E ][ Tab F ][ Tab G ][ Tab H ][ Tab I ]
        //                     Active Tab Width [-------]
        //     [------- Active Tab Pos X -------]
        //                             [-------- Adjusted Tab Pos X -------]
        //     [-- Sticky Tabs Width --]
        //
        //
        if (activeTabFits && tabsContainerScrollPosX + availableTabsContainerWidth < adjustedActiveTabPosX + activeTabWidth) {
            tabsScrollbar.setScrollPosition({
                scrollLeft: tabsContainerScrollPosX + ((adjustedActiveTabPosX + activeTabWidth) /* right corner of tab */ - (tabsContainerScrollPosX + availableTabsContainerWidth) /* right corner of view port */)
            });
        }
        //
        // Tab is overlflowing to the left or does not fit: Scroll it into view to the left
        //
        // Example: Tab C should be made active and needs to be fully revealed as such.
        //
        // [----------------------------- All tabs width ----------------------------------------]
        //     [------------------ Visible container width ------------------]
        //                           [----- Available container width -------]
        // [ Sticky A ][ Sticky B ][ Tab C ][ Tab D ][ Tab E ][ Tab F ][ Tab G ][ Tab H ][ Tab I ]
        //                 Active Tab Width [-------]
        // [------- Active Tab Pos X -------]
        //      Adjusted Tab Pos X []
        // [-- Sticky Tabs Width --]
        //
        //
        else if (tabsContainerScrollPosX > adjustedActiveTabPosX || !activeTabFits) {
            tabsScrollbar.setScrollPosition({
                scrollLeft: adjustedActiveTabPosX
            });
        }
    }
    updateTabsControlVisibility() {
        const tabsAndActionsContainer = assertIsDefined(this.tabsAndActionsContainer);
        tabsAndActionsContainer.classList.toggle('empty', !this.visible);
        // Reset dimensions if hidden
        if (!this.visible && this.dimensions) {
            this.dimensions.used = undefined;
        }
    }
    get visible() {
        return this.tabsModel.count > 0;
    }
    getTabAndIndex(editor) {
        const tabIndex = this.tabsModel.indexOf(editor);
        const tab = this.getTabAtIndex(tabIndex);
        if (tab) {
            return [tab, tabIndex];
        }
        return undefined;
    }
    getTabAtIndex(tabIndex) {
        if (tabIndex >= 0) {
            const tabsContainer = assertIsDefined(this.tabsContainer);
            return tabsContainer.children[tabIndex];
        }
        return undefined;
    }
    getLastTab() {
        return this.getTabAtIndex(this.tabsModel.count - 1);
    }
    blockRevealActiveTabOnce() {
        // When closing tabs through the tab close button or gesture, the user
        // might want to rapidly close tabs in sequence and as such revealing
        // the active tab after each close would be annoying. As such we block
        // the automated revealing of the active tab once after the close is
        // triggered.
        this.blockRevealActiveTab = true;
    }
    originatesFromTabActionBar(e) {
        let element;
        if (isMouseEvent(e)) {
            element = (e.target || e.srcElement);
        }
        else {
            element = e.initialTarget;
        }
        return !!findParentWithClass(element, 'action-item', 'tab');
    }
    async onDrop(e, targetTabIndex, tabsContainer) {
        EventHelper.stop(e, true);
        this.updateDropFeedback(tabsContainer, false, e, targetTabIndex);
        tabsContainer.classList.remove('scroll');
        let targetEditorIndex = this.tabsModel instanceof UnstickyEditorGroupModel ? targetTabIndex + this.groupView.stickyCount : targetTabIndex;
        const options = {
            sticky: this.tabsModel instanceof StickyEditorGroupModel && this.tabsModel.stickyCount === targetEditorIndex,
            index: targetEditorIndex
        };
        // Check for group transfer
        if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
            const data = this.groupTransfer.getData(DraggedEditorGroupIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const sourceGroup = this.editorPartsView.getGroup(data[0].identifier);
                if (sourceGroup) {
                    const mergeGroupOptions = { index: targetEditorIndex };
                    if (!this.isMoveOperation(e, sourceGroup.id)) {
                        mergeGroupOptions.mode = 0 /* MergeGroupMode.COPY_EDITORS */;
                    }
                    this.groupsView.mergeGroup(sourceGroup, this.groupView, mergeGroupOptions);
                }
                this.groupView.focus();
                this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype);
            }
        }
        // Check for editor transfer
        else if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
            const data = this.editorTransfer.getData(DraggedEditorIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const sourceGroup = this.editorPartsView.getGroup(data[0].identifier.groupId);
                if (sourceGroup) {
                    for (const de of data) {
                        const editor = de.identifier.editor;
                        // Only allow moving/copying from a single group source
                        if (sourceGroup.id !== de.identifier.groupId) {
                            continue;
                        }
                        // Keep the same order when moving / copying editors within the same group
                        const sourceEditorIndex = sourceGroup.getIndexOfEditor(editor);
                        if (sourceGroup === this.groupView && sourceEditorIndex < targetEditorIndex) {
                            targetEditorIndex--;
                        }
                        if (this.isMoveOperation(e, de.identifier.groupId, editor)) {
                            sourceGroup.moveEditor(editor, this.groupView, { ...options, index: targetEditorIndex });
                        }
                        else {
                            sourceGroup.copyEditor(editor, this.groupView, { ...options, index: targetEditorIndex });
                        }
                        targetEditorIndex++;
                    }
                }
            }
            this.groupView.focus();
            this.editorTransfer.clearData(DraggedEditorIdentifier.prototype);
        }
        // Check for tree items
        else if (this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)) {
            const data = this.treeItemsTransfer.getData(DraggedTreeItemsIdentifier.prototype);
            if (Array.isArray(data) && data.length > 0) {
                const editors = [];
                for (const id of data) {
                    const dataTransferItem = await this.treeViewsDragAndDropService.removeDragOperationTransfer(id.identifier);
                    if (dataTransferItem) {
                        const treeDropData = await extractTreeDropData(dataTransferItem);
                        editors.push(...treeDropData.map(editor => ({ ...editor, options: { ...editor.options, pinned: true, index: targetEditorIndex } })));
                    }
                }
                this.editorService.openEditors(editors, this.groupView, { validateTrust: true });
            }
            this.treeItemsTransfer.clearData(DraggedTreeItemsIdentifier.prototype);
        }
        // Check for URI transfer
        else {
            const dropHandler = this.instantiationService.createInstance(ResourcesDropHandler, { allowWorkspaceOpen: false });
            dropHandler.handleDrop(e, getWindow(this.parent), () => this.groupView, () => this.groupView.focus(), options);
        }
    }
    dispose() {
        super.dispose();
        this.tabDisposables = dispose(this.tabDisposables);
    }
};
MultiEditorTabsControl = MultiEditorTabsControl_1 = __decorate([
    __param(5, IContextMenuService),
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IQuickInputService),
    __param(11, IThemeService),
    __param(12, IEditorService),
    __param(13, IPathService),
    __param(14, ITreeViewsDnDService),
    __param(15, IEditorResolverService),
    __param(16, IHostService)
], MultiEditorTabsControl);
export { MultiEditorTabsControl };
registerThemingParticipant((theme, collector) => {
    // Add bottom border to tabs when wrapping
    const borderColor = theme.getColor(TAB_BORDER);
    if (borderColor) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title > .tabs-and-actions-container.wrapping .tabs-container > .tab {
				border-bottom: 1px solid ${borderColor};
			}
		`);
    }
    // Styling with Outline color (e.g. high contrast theme)
    const activeContrastBorderColor = theme.getColor(activeContrastBorder);
    if (activeContrastBorderColor) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab.active,
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab.active:hover  {
				outline: 1px solid;
				outline-offset: -5px;
			}

			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.selected:not(.active):not(:hover)  {
				outline: 1px dotted;
				outline-offset: -5px;
			}

			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab.active:focus {
				outline-style: dashed;
			}

			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active {
				outline: 1px dotted;
				outline-offset: -5px;
			}

			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:hover  {
				outline: 1px dashed;
				outline-offset: -5px;
			}

			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active > .tab-actions .action-label,
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active:hover > .tab-actions .action-label,
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.dirty > .tab-actions .action-label,
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.sticky > .tab-actions .action-label,
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:hover > .tab-actions .action-label {
				opacity: 1 !important;
			}
		`);
    }
    // High Contrast Border Color for Editor Actions
    const contrastBorderColor = theme.getColor(contrastBorder);
    if (contrastBorderColor) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title .editor-actions {
				outline: 1px solid ${contrastBorderColor}
			}
		`);
    }
    // Hover Background
    const tabHoverBackground = theme.getColor(TAB_HOVER_BACKGROUND);
    if (tabHoverBackground) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab:not(.selected):hover {
				background-color: ${tabHoverBackground} !important;
			}
		`);
    }
    const tabUnfocusedHoverBackground = theme.getColor(TAB_UNFOCUSED_HOVER_BACKGROUND);
    if (tabUnfocusedHoverBackground) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:not(.selected):hover  {
				background-color: ${tabUnfocusedHoverBackground} !important;
			}
		`);
    }
    // Hover Foreground
    const tabHoverForeground = theme.getColor(TAB_HOVER_FOREGROUND);
    if (tabHoverForeground) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab:not(.selected):hover  {
				color: ${tabHoverForeground} !important;
			}
		`);
    }
    const tabUnfocusedHoverForeground = theme.getColor(TAB_UNFOCUSED_HOVER_FOREGROUND);
    if (tabUnfocusedHoverForeground) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:not(.selected):hover  {
				color: ${tabUnfocusedHoverForeground} !important;
			}
		`);
    }
    // Hover Border
    //
    // Unfortunately we need to copy a lot of CSS over from the
    // multiEditorTabsControl.css because we want to reuse the same
    // styles we already have for the normal bottom-border.
    const tabHoverBorder = theme.getColor(TAB_HOVER_BORDER);
    if (tabHoverBorder) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container.active > .title .tabs-container > .tab:hover > .tab-border-bottom-container {
				display: block;
				position: absolute;
				left: 0;
				pointer-events: none;
				width: 100%;
				z-index: 10;
				bottom: 0;
				height: 1px;
				background-color: ${tabHoverBorder};
			}
		`);
    }
    const tabUnfocusedHoverBorder = theme.getColor(TAB_UNFOCUSED_HOVER_BORDER);
    if (tabUnfocusedHoverBorder) {
        collector.addRule(`
			.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab:hover > .tab-border-bottom-container  {
				display: block;
				position: absolute;
				left: 0;
				pointer-events: none;
				width: 100%;
				z-index: 10;
				bottom: 0;
				height: 1px;
				background-color: ${tabUnfocusedHoverBorder};
			}
		`);
    }
    // Fade out styles via linear gradient (when tabs are set to shrink or fixed)
    // But not when:
    // - in high contrast theme
    // - if we have a contrast border (which draws an outline - https://github.com/microsoft/vscode/issues/109117)
    // - on Safari (https://github.com/microsoft/vscode/issues/108996)
    if (!isHighContrast(theme.type) && !isSafari && !activeContrastBorderColor) {
        const workbenchBackground = WORKBENCH_BACKGROUND(theme);
        const editorBackgroundColor = theme.getColor(editorBackground);
        const editorGroupHeaderTabsBackground = theme.getColor(EDITOR_GROUP_HEADER_TABS_BACKGROUND);
        const editorDragAndDropBackground = theme.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND);
        let adjustedTabBackground;
        if (editorGroupHeaderTabsBackground && editorBackgroundColor) {
            adjustedTabBackground = editorGroupHeaderTabsBackground.flatten(editorBackgroundColor, editorBackgroundColor, workbenchBackground);
        }
        let adjustedTabDragBackground;
        if (editorGroupHeaderTabsBackground && editorBackgroundColor && editorDragAndDropBackground && editorBackgroundColor) {
            adjustedTabDragBackground = editorGroupHeaderTabsBackground.flatten(editorBackgroundColor, editorDragAndDropBackground, editorBackgroundColor, workbenchBackground);
        }
        // Adjust gradient for focused and unfocused hover background
        const makeTabHoverBackgroundRule = (color, colorDrag, hasFocus = false) => `
			.monaco-workbench .part.editor > .content:not(.dragged-over) .editor-group-container${hasFocus ? '.active' : ''} > .title .tabs-container > .tab.sizing-shrink:not(.dragged):not(.sticky-compact):hover > .tab-label > .monaco-icon-label-container::after,
			.monaco-workbench .part.editor > .content:not(.dragged-over) .editor-group-container${hasFocus ? '.active' : ''} > .title .tabs-container > .tab.sizing-fixed:not(.dragged):not(.sticky-compact):hover > .tab-label > .monaco-icon-label-container::after {
				background: linear-gradient(to left, ${color}, transparent) !important;
			}

			.monaco-workbench .part.editor > .content.dragged-over .editor-group-container${hasFocus ? '.active' : ''} > .title .tabs-container > .tab.sizing-shrink:not(.dragged):not(.sticky-compact):hover > .tab-label > .monaco-icon-label-container::after,
			.monaco-workbench .part.editor > .content.dragged-over .editor-group-container${hasFocus ? '.active' : ''} > .title .tabs-container > .tab.sizing-fixed:not(.dragged):not(.sticky-compact):hover > .tab-label > .monaco-icon-label-container::after {
				background: linear-gradient(to left, ${colorDrag}, transparent) !important;
			}
		`;
        // Adjust gradient for (focused) hover background
        if (tabHoverBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabHoverBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabHoverBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabHoverBackgroundRule(adjustedColor, adjustedColorDrag, true));
        }
        // Adjust gradient for unfocused hover background
        if (tabUnfocusedHoverBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabUnfocusedHoverBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabUnfocusedHoverBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabHoverBackgroundRule(adjustedColor, adjustedColorDrag));
        }
        // Adjust gradient for drag and drop background
        if (editorDragAndDropBackground && adjustedTabDragBackground) {
            const adjustedColorDrag = editorDragAndDropBackground.flatten(adjustedTabDragBackground);
            collector.addRule(`
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container.active > .title .tabs-container > .tab.sizing-shrink.dragged-over:not(.active):not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container:not(.active) > .title .tabs-container > .tab.sizing-shrink.dragged-over:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container.active > .title .tabs-container > .tab.sizing-fixed.dragged-over:not(.active):not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container:not(.active) > .title .tabs-container > .tab.sizing-fixed.dragged-over:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after {
					background: linear-gradient(to left, ${adjustedColorDrag}, transparent) !important;
				}
		`);
        }
        const makeTabBackgroundRule = (color, colorDrag, focused, active) => `
				.monaco-workbench .part.editor > .content:not(.dragged-over) .editor-group-container${focused ? '.active' : ':not(.active)'} > .title .tabs-container > .tab.sizing-shrink${active ? '.active' : ''}:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content:not(.dragged-over) .editor-group-container${focused ? '.active' : ':not(.active)'} > .title .tabs-container > .tab.sizing-fixed${active ? '.active' : ''}:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after {
					background: linear-gradient(to left, ${color}, transparent);
				}

				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container${focused ? '.active' : ':not(.active)'} > .title .tabs-container > .tab.sizing-shrink${active ? '.active' : ''}:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after,
				.monaco-workbench .part.editor > .content.dragged-over .editor-group-container${focused ? '.active' : ':not(.active)'} > .title .tabs-container > .tab.sizing-fixed${active ? '.active' : ''}:not(.dragged):not(.sticky-compact) > .tab-label > .monaco-icon-label-container::after {
					background: linear-gradient(to left, ${colorDrag}, transparent);
				}
		`;
        // Adjust gradient for focused active tab background
        const tabActiveBackground = theme.getColor(TAB_ACTIVE_BACKGROUND);
        if (tabActiveBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabActiveBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabActiveBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabBackgroundRule(adjustedColor, adjustedColorDrag, true, true));
        }
        // Adjust gradient for unfocused active tab background
        const tabUnfocusedActiveBackground = theme.getColor(TAB_UNFOCUSED_ACTIVE_BACKGROUND);
        if (tabUnfocusedActiveBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabUnfocusedActiveBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabUnfocusedActiveBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabBackgroundRule(adjustedColor, adjustedColorDrag, false, true));
        }
        // Adjust gradient for focused inactive tab background
        const tabInactiveBackground = theme.getColor(TAB_INACTIVE_BACKGROUND);
        if (tabInactiveBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabInactiveBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabInactiveBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabBackgroundRule(adjustedColor, adjustedColorDrag, true, false));
        }
        // Adjust gradient for unfocused inactive tab background
        const tabUnfocusedInactiveBackground = theme.getColor(TAB_UNFOCUSED_INACTIVE_BACKGROUND);
        if (tabUnfocusedInactiveBackground && adjustedTabBackground && adjustedTabDragBackground) {
            const adjustedColor = tabUnfocusedInactiveBackground.flatten(adjustedTabBackground);
            const adjustedColorDrag = tabUnfocusedInactiveBackground.flatten(adjustedTabDragBackground);
            collector.addRule(makeTabBackgroundRule(adjustedColor, adjustedColorDrag, false, false));
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlFZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvbXVsdGlFZGl0b3JUYWJzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxvQ0FBb0MsQ0FBQztBQUM1QyxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLHNCQUFzQixFQUFpQyxnQkFBZ0IsRUFBRSwwQkFBMEIsRUFBZ0Qsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQWlDLE1BQU0sMkJBQTJCLENBQUM7QUFFcFEsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQWdCLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXZHLE9BQU8sRUFBRSxjQUFjLEVBQWtCLHdCQUF3QixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFz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