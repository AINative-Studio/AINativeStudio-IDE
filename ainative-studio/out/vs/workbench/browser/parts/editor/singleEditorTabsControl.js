/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/singleeditortabscontrol.css';
import { EditorResourceAccessor, SideBySideEditor, preventEditorClose, EditorCloseMethod } from '../../../common/editor.js';
import { EditorTabsControl } from './editorTabsControl.js';
import { ResourceLabel } from '../../labels.js';
import { TAB_ACTIVE_FOREGROUND, TAB_UNFOCUSED_ACTIVE_FOREGROUND } from '../../../common/theme.js';
import { EventType as TouchEventType, Gesture } from '../../../../base/browser/touch.js';
import { addDisposableListener, EventType, EventHelper, Dimension, isAncestor, DragAndDropObserver, isHTMLElement, $ } from '../../../../base/browser/dom.js';
import { CLOSE_EDITOR_COMMAND_ID, UNLOCK_GROUP_COMMAND_ID } from './editorCommands.js';
import { Color } from '../../../../base/common/color.js';
import { assertIsDefined, assertAllDefined } from '../../../../base/common/types.js';
import { equals } from '../../../../base/common/objects.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { defaultBreadcrumbsWidgetStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { BreadcrumbsControlFactory } from './breadcrumbsControl.js';
export class SingleEditorTabsControl extends EditorTabsControl {
    constructor() {
        super(...arguments);
        this.activeLabel = Object.create(null);
    }
    get breadcrumbsControl() { return this.breadcrumbsControlFactory?.control; }
    create(parent) {
        super.create(parent);
        const titleContainer = this.titleContainer = parent;
        titleContainer.draggable = true;
        // Container listeners
        this.registerContainerListeners(titleContainer);
        // Gesture Support
        this._register(Gesture.addTarget(titleContainer));
        const labelContainer = $('.label-container');
        titleContainer.appendChild(labelContainer);
        // Editor Label
        this.editorLabel = this._register(this.instantiationService.createInstance(ResourceLabel, labelContainer, {})).element;
        this._register(addDisposableListener(this.editorLabel.element, EventType.CLICK, e => this.onTitleLabelClick(e)));
        // Breadcrumbs
        this.breadcrumbsControlFactory = this._register(this.instantiationService.createInstance(BreadcrumbsControlFactory, labelContainer, this.groupView, {
            showFileIcons: false,
            showSymbolIcons: true,
            showDecorationColors: false,
            widgetStyles: { ...defaultBreadcrumbsWidgetStyles, breadcrumbsBackground: Color.transparent.toString() },
            showPlaceholder: false,
            dragEditor: true,
        }));
        this._register(this.breadcrumbsControlFactory.onDidEnablementChange(() => this.handleBreadcrumbsEnablementChange()));
        titleContainer.classList.toggle('breadcrumbs', Boolean(this.breadcrumbsControl));
        this._register(toDisposable(() => titleContainer.classList.remove('breadcrumbs'))); // important to remove because the container is a shared dom node
        // Create editor actions toolbar
        this.createEditorActionsToolBar(titleContainer, ['title-actions']);
        return titleContainer;
    }
    registerContainerListeners(titleContainer) {
        // Drag & Drop support
        let lastDragEvent = undefined;
        let isNewWindowOperation = false;
        this._register(new DragAndDropObserver(titleContainer, {
            onDragStart: e => { isNewWindowOperation = this.onGroupDragStart(e, titleContainer); },
            onDrag: e => { lastDragEvent = e; },
            onDragEnd: e => { this.onGroupDragEnd(e, lastDragEvent, titleContainer, isNewWindowOperation); },
        }));
        // Pin on double click
        this._register(addDisposableListener(titleContainer, EventType.DBLCLICK, e => this.onTitleDoubleClick(e)));
        // Detect mouse click
        this._register(addDisposableListener(titleContainer, EventType.AUXCLICK, e => this.onTitleAuxClick(e)));
        // Detect touch
        this._register(addDisposableListener(titleContainer, TouchEventType.Tap, (e) => this.onTitleTap(e)));
        // Context Menu
        for (const event of [EventType.CONTEXT_MENU, TouchEventType.Contextmenu]) {
            this._register(addDisposableListener(titleContainer, event, e => {
                if (this.tabsModel.activeEditor) {
                    this.onTabContextMenu(this.tabsModel.activeEditor, e, titleContainer);
                }
            }));
        }
    }
    onTitleLabelClick(e) {
        EventHelper.stop(e, false);
        // delayed to let the onTitleClick() come first which can cause a focus change which can close quick access
        setTimeout(() => this.quickInputService.quickAccess.show());
    }
    onTitleDoubleClick(e) {
        EventHelper.stop(e);
        this.groupView.pinEditor();
    }
    onTitleAuxClick(e) {
        if (e.button === 1 /* Middle Button */ && this.tabsModel.activeEditor) {
            EventHelper.stop(e, true /* for https://github.com/microsoft/vscode/issues/56715 */);
            if (!preventEditorClose(this.tabsModel, this.tabsModel.activeEditor, EditorCloseMethod.MOUSE, this.groupsView.partOptions)) {
                this.groupView.closeEditor(this.tabsModel.activeEditor);
            }
        }
    }
    onTitleTap(e) {
        // We only want to open the quick access picker when
        // the tap occurred over the editor label, so we need
        // to check on the target
        // (https://github.com/microsoft/vscode/issues/107543)
        const target = e.initialTarget;
        if (!(isHTMLElement(target)) || !this.editorLabel || !isAncestor(target, this.editorLabel.element)) {
            return;
        }
        // TODO@rebornix gesture tap should open the quick access
        // editorGroupView will focus on the editor again when there
        // are mouse/pointer/touch down events we need to wait a bit as
        // `GesureEvent.Tap` is generated from `touchstart` and then
        // `touchend` events, which are not an atom event.
        setTimeout(() => this.quickInputService.quickAccess.show(), 50);
    }
    openEditor(editor) {
        return this.doHandleOpenEditor();
    }
    openEditors(editors) {
        return this.doHandleOpenEditor();
    }
    doHandleOpenEditor() {
        const activeEditorChanged = this.ifActiveEditorChanged(() => this.redraw());
        if (!activeEditorChanged) {
            this.ifActiveEditorPropertiesChanged(() => this.redraw());
        }
        return activeEditorChanged;
    }
    beforeCloseEditor(editor) {
        // Nothing to do before closing an editor
    }
    closeEditor(editor) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    closeEditors(editors) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    moveEditor(editor, fromIndex, targetIndex) {
        this.ifActiveEditorChanged(() => this.redraw());
    }
    pinEditor(editor) {
        this.ifEditorIsActive(editor, () => this.redraw());
    }
    stickEditor(editor) { }
    unstickEditor(editor) { }
    setActive(isActive) {
        this.redraw();
    }
    updateEditorSelections() { }
    updateEditorLabel(editor) {
        this.ifEditorIsActive(editor, () => this.redraw());
    }
    updateEditorDirty(editor) {
        this.ifEditorIsActive(editor, () => {
            const titleContainer = assertIsDefined(this.titleContainer);
            // Signal dirty (unless saving)
            if (editor.isDirty() && !editor.isSaving()) {
                titleContainer.classList.add('dirty');
            }
            // Otherwise, clear dirty
            else {
                titleContainer.classList.remove('dirty');
            }
        });
    }
    updateOptions(oldOptions, newOptions) {
        super.updateOptions(oldOptions, newOptions);
        if (oldOptions.labelFormat !== newOptions.labelFormat || !equals(oldOptions.decorations, newOptions.decorations)) {
            this.redraw();
        }
    }
    updateStyles() {
        this.redraw();
    }
    handleBreadcrumbsEnablementChange() {
        const titleContainer = assertIsDefined(this.titleContainer);
        titleContainer.classList.toggle('breadcrumbs', Boolean(this.breadcrumbsControl));
        this.redraw();
    }
    ifActiveEditorChanged(fn) {
        if (!this.activeLabel.editor && this.tabsModel.activeEditor || // active editor changed from null => editor
            this.activeLabel.editor && !this.tabsModel.activeEditor || // active editor changed from editor => null
            (!this.activeLabel.editor || !this.tabsModel.isActive(this.activeLabel.editor)) // active editor changed from editorA => editorB
        ) {
            fn();
            return true;
        }
        return false;
    }
    ifActiveEditorPropertiesChanged(fn) {
        if (!this.activeLabel.editor || !this.tabsModel.activeEditor) {
            return; // need an active editor to check for properties changed
        }
        if (this.activeLabel.pinned !== this.tabsModel.isPinned(this.tabsModel.activeEditor)) {
            fn(); // only run if pinned state has changed
        }
    }
    ifEditorIsActive(editor, fn) {
        if (this.tabsModel.isActive(editor)) {
            fn(); // only run if editor is current active
        }
    }
    redraw() {
        const editor = this.tabsModel.activeEditor ?? undefined;
        const options = this.groupsView.partOptions;
        const isEditorPinned = editor ? this.tabsModel.isPinned(editor) : false;
        const isGroupActive = this.groupsView.activeGroup === this.groupView;
        this.activeLabel = { editor, pinned: isEditorPinned };
        // Update Breadcrumbs
        if (this.breadcrumbsControl) {
            if (isGroupActive) {
                this.breadcrumbsControl.update();
                this.breadcrumbsControl.domNode.classList.toggle('preview', !isEditorPinned);
            }
            else {
                this.breadcrumbsControl.hide();
            }
        }
        // Clear if there is no editor
        const [titleContainer, editorLabel] = assertAllDefined(this.titleContainer, this.editorLabel);
        if (!editor) {
            titleContainer.classList.remove('dirty');
            editorLabel.clear();
            this.clearEditorActionsToolbar();
        }
        // Otherwise render it
        else {
            // Dirty state
            this.updateEditorDirty(editor);
            // Editor Label
            const { labelFormat } = this.groupsView.partOptions;
            let description;
            if (this.breadcrumbsControl && !this.breadcrumbsControl.isHidden()) {
                description = ''; // hide description when showing breadcrumbs
            }
            else if (labelFormat === 'default' && !isGroupActive) {
                description = ''; // hide description when group is not active and style is 'default'
            }
            else {
                description = editor.getDescription(this.getVerbosity(labelFormat)) || '';
            }
            editorLabel.setResource({
                resource: EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH }),
                name: editor.getName(),
                description
            }, {
                title: this.getHoverTitle(editor),
                italic: !isEditorPinned,
                extraClasses: ['single-tab', 'title-label'].concat(editor.getLabelExtraClasses()),
                fileDecorations: {
                    colors: Boolean(options.decorations?.colors),
                    badges: Boolean(options.decorations?.badges)
                },
                icon: editor.getIcon(),
                hideIcon: options.showIcons === false,
            });
            if (isGroupActive) {
                titleContainer.style.color = this.getColor(TAB_ACTIVE_FOREGROUND) || '';
            }
            else {
                titleContainer.style.color = this.getColor(TAB_UNFOCUSED_ACTIVE_FOREGROUND) || '';
            }
            // Update Editor Actions Toolbar
            this.updateEditorActionsToolbar();
        }
    }
    getVerbosity(style) {
        switch (style) {
            case 'short': return 0 /* Verbosity.SHORT */;
            case 'long': return 2 /* Verbosity.LONG */;
            default: return 1 /* Verbosity.MEDIUM */;
        }
    }
    prepareEditorActions(editorActions) {
        const isGroupActive = this.groupsView.activeGroup === this.groupView;
        // Active: allow all actions
        if (isGroupActive) {
            return editorActions;
        }
        // Inactive: only show "Close, "Unlock" and secondary actions
        else {
            return {
                primary: this.groupsView.partOptions.alwaysShowEditorActions ? editorActions.primary : editorActions.primary.filter(action => action.id === CLOSE_EDITOR_COMMAND_ID || action.id === UNLOCK_GROUP_COMMAND_ID),
                secondary: editorActions.secondary
            };
        }
    }
    getHeight() {
        return this.tabHeight;
    }
    layout(dimensions) {
        this.breadcrumbsControl?.layout(undefined);
        return new Dimension(dimensions.container.width, this.getHeight());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlRWRpdG9yVGFic0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL3NpbmdsZUVkaXRvclRhYnNDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8scUNBQXFDLENBQUM7QUFDN0MsT0FBTyxFQUFFLHNCQUFzQixFQUFpQyxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBbUIsTUFBTSwyQkFBMkIsQ0FBQztBQUU1SyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLGlCQUFpQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2xHLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFnQixPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5SixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1B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