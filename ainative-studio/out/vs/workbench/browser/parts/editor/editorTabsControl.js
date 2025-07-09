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
var EditorTabsControl_1;
import './media/editortabscontrol.css';
import { localize } from '../../../../nls.js';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, getActiveWindow, getWindow, isMouseEvent } from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { prepareActions } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { DraggedEditorGroupIdentifier, fillEditorsDragData, isWindowDraggedOver } from '../../dnd.js';
import { EditorPane } from './editorPane.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { ResourceContextKey, ActiveEditorPinnedContext, ActiveEditorStickyContext, ActiveEditorGroupLockedContext, ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext, ActiveEditorFirstInGroupContext, ActiveEditorAvailableEditorIdsContext, applyAvailableEditorIds, ActiveEditorLastInGroupContext } from '../../../common/contextkeys.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { isFirefox } from '../../../../base/browser/browser.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { EDITOR_CORE_NAVIGATION_COMMANDS } from './editorCommands.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
export class EditorCommandsContextActionRunner extends ActionRunner {
    constructor(context) {
        super();
        this.context = context;
    }
    run(action, context) {
        // Even though we have a fixed context for editor commands,
        // allow to preserve the context that is given to us in case
        // it applies.
        let mergedContext = this.context;
        if (context?.preserveFocus) {
            mergedContext = {
                ...this.context,
                preserveFocus: true
            };
        }
        return super.run(action, mergedContext);
    }
}
let EditorTabsControl = class EditorTabsControl extends Themable {
    static { EditorTabsControl_1 = this; }
    static { this.EDITOR_TAB_HEIGHT = {
        normal: 35,
        compact: 22
    }; }
    constructor(parent, editorPartsView, groupsView, groupView, tabsModel, contextMenuService, instantiationService, contextKeyService, keybindingService, notificationService, quickInputService, themeService, editorResolverService, hostService) {
        super(themeService);
        this.parent = parent;
        this.editorPartsView = editorPartsView;
        this.groupsView = groupsView;
        this.groupView = groupView;
        this.tabsModel = tabsModel;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.quickInputService = quickInputService;
        this.editorResolverService = editorResolverService;
        this.hostService = hostService;
        this.editorTransfer = LocalSelectionTransfer.getInstance();
        this.groupTransfer = LocalSelectionTransfer.getInstance();
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this.editorActionsToolbarDisposables = this._register(new DisposableStore());
        this.editorActionsDisposables = this._register(new DisposableStore());
        this.renderDropdownAsChildElement = false;
        const container = this.create(parent);
        // Context Keys
        this.contextMenuContextKeyService = this._register(this.contextKeyService.createScoped(container));
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextMenuContextKeyService])));
        this.resourceContext = this._register(scopedInstantiationService.createInstance(ResourceContextKey));
        this.editorPinnedContext = ActiveEditorPinnedContext.bindTo(this.contextMenuContextKeyService);
        this.editorIsFirstContext = ActiveEditorFirstInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.editorIsLastContext = ActiveEditorLastInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.editorStickyContext = ActiveEditorStickyContext.bindTo(this.contextMenuContextKeyService);
        this.editorAvailableEditorIds = ActiveEditorAvailableEditorIdsContext.bindTo(this.contextMenuContextKeyService);
        this.editorCanSplitInGroupContext = ActiveEditorCanSplitInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.sideBySideEditorContext = SideBySideEditorActiveContext.bindTo(this.contextMenuContextKeyService);
        this.groupLockedContext = ActiveEditorGroupLockedContext.bindTo(this.contextMenuContextKeyService);
    }
    create(parent) {
        this.updateTabHeight();
        return parent;
    }
    get editorActionsEnabled() {
        return this.groupsView.partOptions.editorActionsLocation === 'default' && this.groupsView.partOptions.showTabs !== 'none';
    }
    createEditorActionsToolBar(parent, classes) {
        this.editorActionsToolbarContainer = $('div');
        this.editorActionsToolbarContainer.classList.add(...classes);
        parent.appendChild(this.editorActionsToolbarContainer);
        this.handleEditorActionToolBarVisibility(this.editorActionsToolbarContainer);
    }
    handleEditorActionToolBarVisibility(container) {
        const editorActionsEnabled = this.editorActionsEnabled;
        const editorActionsVisible = !!this.editorActionsToolbar;
        // Create toolbar if it is enabled (and not yet created)
        if (editorActionsEnabled && !editorActionsVisible) {
            this.doCreateEditorActionsToolBar(container);
        }
        // Remove toolbar if it is not enabled (and is visible)
        else if (!editorActionsEnabled && editorActionsVisible) {
            this.editorActionsToolbar?.getElement().remove();
            this.editorActionsToolbar = undefined;
            this.editorActionsToolbarDisposables.clear();
            this.editorActionsDisposables.clear();
        }
        container.classList.toggle('hidden', !editorActionsEnabled);
    }
    doCreateEditorActionsToolBar(container) {
        const context = { groupId: this.groupView.id };
        // Toolbar Widget
        this.editorActionsToolbar = this.editorActionsToolbarDisposables.add(this.instantiationService.createInstance(WorkbenchToolBar, container, {
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            ariaLabel: localize('ariaLabelEditorActions', "Editor actions"),
            getKeyBinding: action => this.getKeybinding(action),
            actionRunner: this.editorActionsToolbarDisposables.add(new EditorCommandsContextActionRunner(context)),
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            renderDropdownAsChildElement: this.renderDropdownAsChildElement,
            telemetrySource: 'editorPart',
            resetMenu: MenuId.EditorTitle,
            overflowBehavior: { maxItems: 9, exempted: EDITOR_CORE_NAVIGATION_COMMANDS },
            highlightToggledItems: true
        }));
        // Context
        this.editorActionsToolbar.context = context;
        // Action Run Handling
        this.editorActionsToolbarDisposables.add(this.editorActionsToolbar.actionRunner.onDidRun(e => {
            // Notify for Error
            if (e.error && !isCancellationError(e.error)) {
                this.notificationService.error(e.error);
            }
        }));
    }
    actionViewItemProvider(action, options) {
        const activeEditorPane = this.groupView.activeEditorPane;
        // Check Active Editor
        if (activeEditorPane instanceof EditorPane) {
            const result = activeEditorPane.getActionViewItem(action, options);
            if (result) {
                return result;
            }
        }
        // Check extensions
        return createActionViewItem(this.instantiationService, action, { ...options, menuAsChild: this.renderDropdownAsChildElement });
    }
    updateEditorActionsToolbar() {
        if (!this.editorActionsEnabled) {
            return;
        }
        this.editorActionsDisposables.clear();
        const editorActions = this.groupView.createEditorActions(this.editorActionsDisposables);
        this.editorActionsDisposables.add(editorActions.onDidChange(() => this.updateEditorActionsToolbar()));
        const editorActionsToolbar = assertIsDefined(this.editorActionsToolbar);
        const { primary, secondary } = this.prepareEditorActions(editorActions.actions);
        editorActionsToolbar.setActions(prepareActions(primary), prepareActions(secondary));
    }
    getEditorPaneAwareContextKeyService() {
        return this.groupView.activeEditorPane?.scopedContextKeyService ?? this.contextKeyService;
    }
    clearEditorActionsToolbar() {
        if (!this.editorActionsEnabled) {
            return;
        }
        const editorActionsToolbar = assertIsDefined(this.editorActionsToolbar);
        editorActionsToolbar.setActions([], []);
    }
    onGroupDragStart(e, element) {
        if (e.target !== element) {
            return false; // only if originating from tabs container
        }
        const isNewWindowOperation = this.isNewWindowOperation(e);
        // Set editor group as transfer
        this.groupTransfer.setData([new DraggedEditorGroupIdentifier(this.groupView.id)], DraggedEditorGroupIdentifier.prototype);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copyMove';
        }
        // Drag all tabs of the group if tabs are enabled
        let hasDataTransfer = false;
        if (this.groupsView.partOptions.showTabs === 'multiple') {
            hasDataTransfer = this.doFillResourceDataTransfers(this.groupView.getEditors(1 /* EditorsOrder.SEQUENTIAL */), e, isNewWindowOperation);
        }
        // Otherwise only drag the active editor
        else {
            if (this.groupView.activeEditor) {
                hasDataTransfer = this.doFillResourceDataTransfers([this.groupView.activeEditor], e, isNewWindowOperation);
            }
        }
        // Firefox: requires to set a text data transfer to get going
        if (!hasDataTransfer && isFirefox) {
            e.dataTransfer?.setData(DataTransfers.TEXT, String(this.groupView.label));
        }
        // Drag Image
        if (this.groupView.activeEditor) {
            let label = this.groupView.activeEditor.getName();
            if (this.groupsView.partOptions.showTabs === 'multiple' && this.groupView.count > 1) {
                label = localize('draggedEditorGroup', "{0} (+{1})", label, this.groupView.count - 1);
            }
            applyDragImage(e, element, label);
        }
        return isNewWindowOperation;
    }
    async onGroupDragEnd(e, previousDragEvent, element, isNewWindowOperation) {
        this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype);
        if (e.target !== element ||
            !isNewWindowOperation ||
            isWindowDraggedOver()) {
            return; // drag to open in new window is disabled
        }
        const auxiliaryEditorPart = await this.maybeCreateAuxiliaryEditorPartAt(e, element);
        if (!auxiliaryEditorPart) {
            return;
        }
        const targetGroup = auxiliaryEditorPart.activeGroup;
        this.groupsView.mergeGroup(this.groupView, targetGroup.id, {
            mode: this.isMoveOperation(previousDragEvent ?? e, targetGroup.id) ? 1 /* MergeGroupMode.MOVE_EDITORS */ : 0 /* MergeGroupMode.COPY_EDITORS */
        });
        targetGroup.focus();
    }
    async maybeCreateAuxiliaryEditorPartAt(e, offsetElement) {
        const { point, display } = await this.hostService.getCursorScreenPoint() ?? { point: { x: e.screenX, y: e.screenY } };
        const window = getActiveWindow();
        if (window.document.visibilityState === 'visible' && window.document.hasFocus()) {
            if (point.x >= window.screenX && point.x <= window.screenX + window.outerWidth && point.y >= window.screenY && point.y <= window.screenY + window.outerHeight) {
                return; // refuse to create as long as the mouse was released over active focused window to reduce chance of opening by accident
            }
        }
        const offsetX = offsetElement.offsetWidth / 2;
        const offsetY = 30 /* take title bar height into account (approximation) */ + offsetElement.offsetHeight / 2;
        const bounds = {
            x: point.x - offsetX,
            y: point.y - offsetY
        };
        if (display) {
            if (bounds.x < display.x) {
                bounds.x = display.x; // prevent overflow to the left
            }
            if (bounds.y < display.y) {
                bounds.y = display.y; // prevent overflow to the top
            }
        }
        return this.editorPartsView.createAuxiliaryEditorPart({ bounds });
    }
    isNewWindowOperation(e) {
        if (this.groupsView.partOptions.dragToOpenWindow) {
            return !e.altKey;
        }
        return e.altKey;
    }
    isMoveOperation(e, sourceGroup, sourceEditor) {
        if (sourceEditor?.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            return true; // Singleton editors cannot be split
        }
        const isCopy = (e.ctrlKey && !isMacintosh) || (e.altKey && isMacintosh);
        return (!isCopy || sourceGroup === this.groupView.id);
    }
    doFillResourceDataTransfers(editors, e, disableStandardTransfer) {
        if (editors.length) {
            this.instantiationService.invokeFunction(fillEditorsDragData, editors.map(editor => ({ editor, groupId: this.groupView.id })), e, { disableStandardTransfer });
            return true;
        }
        return false;
    }
    onTabContextMenu(editor, e, node) {
        // Update contexts based on editor picked and remember previous to restore
        this.resourceContext.set(EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }));
        this.editorPinnedContext.set(this.tabsModel.isPinned(editor));
        this.editorIsFirstContext.set(this.tabsModel.isFirst(editor));
        this.editorIsLastContext.set(this.tabsModel.isLast(editor));
        this.editorStickyContext.set(this.tabsModel.isSticky(editor));
        this.groupLockedContext.set(this.tabsModel.isLocked);
        this.editorCanSplitInGroupContext.set(editor.hasCapability(32 /* EditorInputCapabilities.CanSplitInGroup */));
        this.sideBySideEditorContext.set(editor.typeId === SideBySideEditorInput.ID);
        applyAvailableEditorIds(this.editorAvailableEditorIds, editor, this.editorResolverService);
        // Find target anchor
        let anchor = node;
        if (isMouseEvent(e)) {
            anchor = new StandardMouseEvent(getWindow(node), e);
        }
        // Show it
        this.contextMenuService.showContextMenu({
            getAnchor: () => anchor,
            menuId: MenuId.EditorTitleContext,
            menuActionOptions: { shouldForwardArgs: true, arg: this.resourceContext.get() },
            contextKeyService: this.contextMenuContextKeyService,
            getActionsContext: () => ({ groupId: this.groupView.id, editorIndex: this.groupView.getIndexOfEditor(editor) }),
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id, this.contextMenuContextKeyService),
            onHide: () => this.groupsView.activeGroup.focus() // restore focus to active group
        });
    }
    getKeybinding(action) {
        return this.keybindingService.lookupKeybinding(action.id, this.getEditorPaneAwareContextKeyService());
    }
    getKeybindingLabel(action) {
        const keybinding = this.getKeybinding(action);
        return keybinding ? keybinding.getLabel() ?? undefined : undefined;
    }
    get tabHeight() {
        return this.groupsView.partOptions.tabHeight !== 'compact' ? EditorTabsControl_1.EDITOR_TAB_HEIGHT.normal : EditorTabsControl_1.EDITOR_TAB_HEIGHT.compact;
    }
    getHoverTitle(editor) {
        const title = editor.getTitle(2 /* Verbosity.LONG */);
        if (!this.tabsModel.isPinned(editor)) {
            return {
                markdown: new MarkdownString('', { supportThemeIcons: true, isTrusted: true }).
                    appendText(title).
                    appendMarkdown(' (_preview_ [$(gear)](command:workbench.action.openSettings?%5B%22workbench.editor.enablePreview%22%5D "Configure Preview Mode"))'),
                markdownNotSupportedFallback: title + ' (preview)'
            };
        }
        return title;
    }
    updateTabHeight() {
        this.parent.style.setProperty('--editor-group-tab-height', `${this.tabHeight}px`);
    }
    updateOptions(oldOptions, newOptions) {
        // Update tab height
        if (oldOptions.tabHeight !== newOptions.tabHeight) {
            this.updateTabHeight();
        }
        // Update Editor Actions Toolbar
        if (oldOptions.editorActionsLocation !== newOptions.editorActionsLocation ||
            oldOptions.showTabs !== newOptions.showTabs) {
            if (this.editorActionsToolbarContainer) {
                this.handleEditorActionToolBarVisibility(this.editorActionsToolbarContainer);
                this.updateEditorActionsToolbar();
            }
        }
    }
};
EditorTabsControl = EditorTabsControl_1 = __decorate([
    __param(5, IContextMenuService),
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IQuickInputService),
    __param(11, IThemeService),
    __param(12, IEditorResolverService),
    __param(13, IHostService)
], EditorTabsControl);
export { EditorTabsControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGFic0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvclRhYnNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLCtCQUErQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLENBQUMsRUFBYSxlQUFlLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVFLE9BQU8sRUFBdUMsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDekgsT0FBTyxFQUFXLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN2RyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFlLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERB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