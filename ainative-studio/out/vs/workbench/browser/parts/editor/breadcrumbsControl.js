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
var OutlineItem_1, FileItem_1, BreadcrumbsControl_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { BreadcrumbsItem, BreadcrumbsWidget } from '../../../../base/browser/ui/breadcrumbs/breadcrumbsWidget.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { combinedDisposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { basename, extUri } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { OutlineElement } from '../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { fillInSymbolsDragData, LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IListService, WorkbenchAsyncDataTree, WorkbenchDataTree, WorkbenchListFocusContextKey } from '../../../../platform/list/browser/listService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultBreadcrumbsWidgetStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { DraggedEditorIdentifier, fillEditorsDragData } from '../../dnd.js';
import { DEFAULT_LABELS_CONTAINER, ResourceLabels } from '../../labels.js';
import { BreadcrumbsConfig, IBreadcrumbsService } from './breadcrumbs.js';
import { BreadcrumbsModel, FileElement, OutlineElement2 } from './breadcrumbsModel.js';
import { BreadcrumbsFilePicker, BreadcrumbsOutlinePicker } from './breadcrumbsPicker.js';
import './media/breadcrumbscontrol.css';
let OutlineItem = OutlineItem_1 = class OutlineItem extends BreadcrumbsItem {
    constructor(model, element, options, _instantiationService) {
        super();
        this.model = model;
        this.element = element;
        this.options = options;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
    }
    dispose() {
        this._disposables.dispose();
    }
    equals(other) {
        if (!(other instanceof OutlineItem_1)) {
            return false;
        }
        return this.element.element === other.element.element &&
            this.options.showFileIcons === other.options.showFileIcons &&
            this.options.showSymbolIcons === other.options.showSymbolIcons;
    }
    render(container) {
        const { element, outline } = this.element;
        if (element === outline) {
            const element = dom.$('span', undefined, '…');
            container.appendChild(element);
            return;
        }
        const templateId = outline.config.delegate.getTemplateId(element);
        const renderer = outline.config.renderers.find(renderer => renderer.templateId === templateId);
        if (!renderer) {
            container.innerText = '<<NO RENDERER>>';
            return;
        }
        const template = renderer.renderTemplate(container);
        renderer.renderElement({
            element,
            children: [],
            depth: 0,
            visibleChildrenCount: 0,
            visibleChildIndex: 0,
            collapsible: false,
            collapsed: false,
            visible: true,
            filterData: undefined
        }, 0, template, undefined);
        this._disposables.add(toDisposable(() => { renderer.disposeTemplate(template); }));
        if (element instanceof OutlineElement && outline.uri) {
            this._disposables.add(this._instantiationService.invokeFunction(accessor => createBreadcrumbDndObserver(accessor, container, element.symbol.name, { symbol: element.symbol, uri: outline.uri }, this.model, this.options.dragEditor)));
        }
    }
};
OutlineItem = OutlineItem_1 = __decorate([
    __param(3, IInstantiationService)
], OutlineItem);
let FileItem = FileItem_1 = class FileItem extends BreadcrumbsItem {
    constructor(model, element, options, _labels, _hoverDelegate, _instantiationService) {
        super();
        this.model = model;
        this.element = element;
        this.options = options;
        this._labels = _labels;
        this._hoverDelegate = _hoverDelegate;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
    }
    dispose() {
        this._disposables.dispose();
    }
    equals(other) {
        if (!(other instanceof FileItem_1)) {
            return false;
        }
        return (extUri.isEqual(this.element.uri, other.element.uri) &&
            this.options.showFileIcons === other.options.showFileIcons &&
            this.options.showSymbolIcons === other.options.showSymbolIcons);
    }
    render(container) {
        // file/folder
        const label = this._labels.create(container, { hoverDelegate: this._hoverDelegate });
        label.setFile(this.element.uri, {
            hidePath: true,
            hideIcon: this.element.kind === FileKind.FOLDER || !this.options.showFileIcons,
            fileKind: this.element.kind,
            fileDecorations: { colors: this.options.showDecorationColors, badges: false },
        });
        container.classList.add(FileKind[this.element.kind].toLowerCase());
        this._disposables.add(label);
        this._disposables.add(this._instantiationService.invokeFunction(accessor => createBreadcrumbDndObserver(accessor, container, basename(this.element.uri), this.element.uri, this.model, this.options.dragEditor)));
    }
};
FileItem = FileItem_1 = __decorate([
    __param(5, IInstantiationService)
], FileItem);
function createBreadcrumbDndObserver(accessor, container, label, item, model, dragEditor) {
    const instantiationService = accessor.get(IInstantiationService);
    container.draggable = true;
    return new dom.DragAndDropObserver(container, {
        onDragStart: event => {
            if (!event.dataTransfer) {
                return;
            }
            // Set data transfer
            event.dataTransfer.effectAllowed = 'copyMove';
            instantiationService.invokeFunction(accessor => {
                if (URI.isUri(item)) {
                    fillEditorsDragData(accessor, [item], event);
                }
                else { // Symbol
                    fillEditorsDragData(accessor, [{ resource: item.uri, selection: item.symbol.range }], event);
                    fillInSymbolsDragData([{
                            name: item.symbol.name,
                            fsPath: item.uri.fsPath,
                            range: item.symbol.range,
                            kind: item.symbol.kind
                        }], event);
                }
                if (dragEditor && model.editor && model.editor?.input) {
                    const editorTransfer = LocalSelectionTransfer.getInstance();
                    editorTransfer.setData([new DraggedEditorIdentifier({ editor: model.editor.input, groupId: model.editor.group.id })], DraggedEditorIdentifier.prototype);
                }
            });
            applyDragImage(event, container, label);
        }
    });
}
const separatorIcon = registerIcon('breadcrumb-separator', Codicon.chevronRight, localize('separatorIcon', 'Icon for the separator in the breadcrumbs.'));
let BreadcrumbsControl = class BreadcrumbsControl {
    static { BreadcrumbsControl_1 = this; }
    static { this.HEIGHT = 22; }
    static { this.SCROLLBAR_SIZES = {
        default: 3,
        large: 8
    }; }
    static { this.Payload_Reveal = {}; }
    static { this.Payload_RevealAside = {}; }
    static { this.Payload_Pick = {}; }
    static { this.CK_BreadcrumbsPossible = new RawContextKey('breadcrumbsPossible', false, localize('breadcrumbsPossible', "Whether the editor can show breadcrumbs")); }
    static { this.CK_BreadcrumbsVisible = new RawContextKey('breadcrumbsVisible', false, localize('breadcrumbsVisible', "Whether breadcrumbs are currently visible")); }
    static { this.CK_BreadcrumbsActive = new RawContextKey('breadcrumbsActive', false, localize('breadcrumbsActive', "Whether breadcrumbs have focus")); }
    get onDidVisibilityChange() { return this._onDidVisibilityChange.event; }
    constructor(container, _options, _editorGroup, _contextKeyService, _contextViewService, _instantiationService, _quickInputService, _fileService, _editorService, _labelService, configurationService, breadcrumbsService) {
        this._options = _options;
        this._editorGroup = _editorGroup;
        this._contextKeyService = _contextKeyService;
        this._contextViewService = _contextViewService;
        this._instantiationService = _instantiationService;
        this._quickInputService = _quickInputService;
        this._fileService = _fileService;
        this._editorService = _editorService;
        this._labelService = _labelService;
        this._disposables = new DisposableStore();
        this._breadcrumbsDisposables = new DisposableStore();
        this._model = new MutableDisposable();
        this._breadcrumbsPickerShowing = false;
        this._onDidVisibilityChange = this._disposables.add(new Emitter());
        this.domNode = document.createElement('div');
        this.domNode.classList.add('breadcrumbs-control');
        dom.append(container, this.domNode);
        this._cfUseQuickPick = BreadcrumbsConfig.UseQuickPick.bindTo(configurationService);
        this._cfShowIcons = BreadcrumbsConfig.Icons.bindTo(configurationService);
        this._cfTitleScrollbarSizing = BreadcrumbsConfig.TitleScrollbarSizing.bindTo(configurationService);
        this._labels = this._instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER);
        const sizing = this._cfTitleScrollbarSizing.getValue() ?? 'default';
        const styles = _options.widgetStyles ?? defaultBreadcrumbsWidgetStyles;
        this._widget = new BreadcrumbsWidget(this.domNode, BreadcrumbsControl_1.SCROLLBAR_SIZES[sizing], separatorIcon, styles);
        this._widget.onDidSelectItem(this._onSelectEvent, this, this._disposables);
        this._widget.onDidFocusItem(this._onFocusEvent, this, this._disposables);
        this._widget.onDidChangeFocus(this._updateCkBreadcrumbsActive, this, this._disposables);
        this._ckBreadcrumbsPossible = BreadcrumbsControl_1.CK_BreadcrumbsPossible.bindTo(this._contextKeyService);
        this._ckBreadcrumbsVisible = BreadcrumbsControl_1.CK_BreadcrumbsVisible.bindTo(this._contextKeyService);
        this._ckBreadcrumbsActive = BreadcrumbsControl_1.CK_BreadcrumbsActive.bindTo(this._contextKeyService);
        this._hoverDelegate = getDefaultHoverDelegate('mouse');
        this._disposables.add(breadcrumbsService.register(this._editorGroup.id, this._widget));
        this.hide();
    }
    dispose() {
        this._disposables.dispose();
        this._breadcrumbsDisposables.dispose();
        this._ckBreadcrumbsPossible.reset();
        this._ckBreadcrumbsVisible.reset();
        this._ckBreadcrumbsActive.reset();
        this._cfUseQuickPick.dispose();
        this._cfShowIcons.dispose();
        this._widget.dispose();
        this._labels.dispose();
        this.domNode.remove();
    }
    get model() {
        return this._model.value;
    }
    layout(dim) {
        this._widget.layout(dim);
    }
    isHidden() {
        return this.domNode.classList.contains('hidden');
    }
    hide() {
        const wasHidden = this.isHidden();
        this._breadcrumbsDisposables.clear();
        this._ckBreadcrumbsVisible.set(false);
        this.domNode.classList.toggle('hidden', true);
        if (!wasHidden) {
            this._onDidVisibilityChange.fire();
        }
    }
    show() {
        const wasHidden = this.isHidden();
        this._ckBreadcrumbsVisible.set(true);
        this.domNode.classList.toggle('hidden', false);
        if (wasHidden) {
            this._onDidVisibilityChange.fire();
        }
    }
    revealLast() {
        this._widget.revealLast();
    }
    update() {
        this._breadcrumbsDisposables.clear();
        // honor diff editors and such
        const uri = EditorResourceAccessor.getCanonicalUri(this._editorGroup.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        const wasHidden = this.isHidden();
        if (!uri || !this._fileService.hasProvider(uri)) {
            // cleanup and return when there is no input or when
            // we cannot handle this input
            this._ckBreadcrumbsPossible.set(false);
            if (!wasHidden) {
                this.hide();
                return true;
            }
            else {
                return false;
            }
        }
        // display uri which can be derived from certain inputs
        const fileInfoUri = EditorResourceAccessor.getOriginalUri(this._editorGroup.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        this.show();
        this._ckBreadcrumbsPossible.set(true);
        const model = this._instantiationService.createInstance(BreadcrumbsModel, fileInfoUri ?? uri, this._editorGroup.activeEditorPane);
        this._model.value = model;
        this.domNode.classList.toggle('backslash-path', this._labelService.getSeparator(uri.scheme, uri.authority) === '\\');
        const updateBreadcrumbs = () => {
            this.domNode.classList.toggle('relative-path', model.isRelative());
            const showIcons = this._cfShowIcons.getValue();
            const options = {
                ...this._options,
                showFileIcons: this._options.showFileIcons && showIcons,
                showSymbolIcons: this._options.showSymbolIcons && showIcons
            };
            const items = model.getElements().map(element => element instanceof FileElement
                ? this._instantiationService.createInstance(FileItem, model, element, options, this._labels, this._hoverDelegate)
                : this._instantiationService.createInstance(OutlineItem, model, element, options));
            if (items.length === 0) {
                this._widget.setEnabled(false);
                this._widget.setItems([new class extends BreadcrumbsItem {
                        render(container) {
                            container.innerText = localize('empty', "no elements");
                        }
                        equals(other) {
                            return other === this;
                        }
                        dispose() {
                        }
                    }]);
            }
            else {
                this._widget.setEnabled(true);
                this._widget.setItems(items);
                this._widget.reveal(items[items.length - 1]);
            }
        };
        const listener = model.onDidUpdate(updateBreadcrumbs);
        const configListener = this._cfShowIcons.onDidChange(updateBreadcrumbs);
        updateBreadcrumbs();
        this._breadcrumbsDisposables.clear();
        this._breadcrumbsDisposables.add(listener);
        this._breadcrumbsDisposables.add(toDisposable(() => this._model.clear()));
        this._breadcrumbsDisposables.add(configListener);
        this._breadcrumbsDisposables.add(toDisposable(() => this._widget.setItems([])));
        const updateScrollbarSizing = () => {
            const sizing = this._cfTitleScrollbarSizing.getValue() ?? 'default';
            this._widget.setHorizontalScrollbarSize(BreadcrumbsControl_1.SCROLLBAR_SIZES[sizing]);
        };
        updateScrollbarSizing();
        const updateScrollbarSizeListener = this._cfTitleScrollbarSizing.onDidChange(updateScrollbarSizing);
        this._breadcrumbsDisposables.add(updateScrollbarSizeListener);
        // close picker on hide/update
        this._breadcrumbsDisposables.add({
            dispose: () => {
                if (this._breadcrumbsPickerShowing) {
                    this._contextViewService.hideContextView({ source: this });
                }
            }
        });
        return wasHidden !== this.isHidden();
    }
    _onFocusEvent(event) {
        if (event.item && this._breadcrumbsPickerShowing) {
            this._breadcrumbsPickerIgnoreOnceItem = undefined;
            this._widget.setSelection(event.item);
        }
    }
    _onSelectEvent(event) {
        if (!event.item) {
            return;
        }
        if (event.item === this._breadcrumbsPickerIgnoreOnceItem) {
            this._breadcrumbsPickerIgnoreOnceItem = undefined;
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            return;
        }
        const { element } = event.item;
        this._editorGroup.focus();
        const group = this._getEditorGroup(event.payload);
        if (group !== undefined) {
            // reveal the item
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            this._revealInEditor(event, element, group);
            return;
        }
        if (this._cfUseQuickPick.getValue()) {
            // using quick pick
            this._widget.setFocused(undefined);
            this._widget.setSelection(undefined);
            this._quickInputService.quickAccess.show(element instanceof OutlineElement2 ? '@' : '');
            return;
        }
        // show picker
        let picker;
        let pickerAnchor;
        this._contextViewService.showContextView({
            render: (parent) => {
                if (event.item instanceof FileItem) {
                    picker = this._instantiationService.createInstance(BreadcrumbsFilePicker, parent, event.item.model.resource);
                }
                else if (event.item instanceof OutlineItem) {
                    picker = this._instantiationService.createInstance(BreadcrumbsOutlinePicker, parent, event.item.model.resource);
                }
                const selectListener = picker.onWillPickElement(() => this._contextViewService.hideContextView({ source: this, didPick: true }));
                const zoomListener = PixelRatio.getInstance(dom.getWindow(this.domNode)).onDidChange(() => this._contextViewService.hideContextView({ source: this }));
                const focusTracker = dom.trackFocus(parent);
                const blurListener = focusTracker.onDidBlur(() => {
                    this._breadcrumbsPickerIgnoreOnceItem = this._widget.isDOMFocused() ? event.item : undefined;
                    this._contextViewService.hideContextView({ source: this });
                });
                this._breadcrumbsPickerShowing = true;
                this._updateCkBreadcrumbsActive();
                return combinedDisposable(picker, selectListener, zoomListener, focusTracker, blurListener);
            },
            getAnchor: () => {
                if (!pickerAnchor) {
                    const window = dom.getWindow(this.domNode);
                    const maxInnerWidth = window.innerWidth - 8 /*a little less the full widget*/;
                    let maxHeight = Math.min(window.innerHeight * 0.7, 300);
                    const pickerWidth = Math.min(maxInnerWidth, Math.max(240, maxInnerWidth / 4.17));
                    const pickerArrowSize = 8;
                    let pickerArrowOffset;
                    const data = dom.getDomNodePagePosition(event.node.firstChild);
                    const y = data.top + data.height + pickerArrowSize;
                    if (y + maxHeight >= window.innerHeight) {
                        maxHeight = window.innerHeight - y - 30 /* room for shadow and status bar*/;
                    }
                    let x = data.left;
                    if (x + pickerWidth >= maxInnerWidth) {
                        x = maxInnerWidth - pickerWidth;
                    }
                    if (event.payload instanceof StandardMouseEvent) {
                        const maxPickerArrowOffset = pickerWidth - 2 * pickerArrowSize;
                        pickerArrowOffset = event.payload.posx - x;
                        if (pickerArrowOffset > maxPickerArrowOffset) {
                            x = Math.min(maxInnerWidth - pickerWidth, x + pickerArrowOffset - maxPickerArrowOffset);
                            pickerArrowOffset = maxPickerArrowOffset;
                        }
                    }
                    else {
                        pickerArrowOffset = (data.left + (data.width * 0.3)) - x;
                    }
                    picker.show(element, maxHeight, pickerWidth, pickerArrowSize, Math.max(0, pickerArrowOffset));
                    pickerAnchor = { x, y };
                }
                return pickerAnchor;
            },
            onHide: (data) => {
                if (!data?.didPick) {
                    picker.restoreViewState();
                }
                this._breadcrumbsPickerShowing = false;
                this._updateCkBreadcrumbsActive();
                if (data?.source === this) {
                    this._widget.setFocused(undefined);
                    this._widget.setSelection(undefined);
                }
                picker.dispose();
            }
        });
    }
    _updateCkBreadcrumbsActive() {
        const value = this._widget.isDOMFocused() || this._breadcrumbsPickerShowing;
        this._ckBreadcrumbsActive.set(value);
    }
    async _revealInEditor(event, element, group, pinned = false) {
        if (element instanceof FileElement) {
            if (element.kind === FileKind.FILE) {
                await this._editorService.openEditor({ resource: element.uri, options: { pinned } }, group);
            }
            else {
                // show next picker
                const items = this._widget.getItems();
                const idx = items.indexOf(event.item);
                this._widget.setFocused(items[idx + 1]);
                this._widget.setSelection(items[idx + 1], BreadcrumbsControl_1.Payload_Pick);
            }
        }
        else {
            element.outline.reveal(element, { pinned }, group === SIDE_GROUP, false);
        }
    }
    _getEditorGroup(data) {
        if (data === BreadcrumbsControl_1.Payload_RevealAside) {
            return SIDE_GROUP;
        }
        else if (data === BreadcrumbsControl_1.Payload_Reveal) {
            return ACTIVE_GROUP;
        }
        else {
            return undefined;
        }
    }
};
BreadcrumbsControl = BreadcrumbsControl_1 = __decorate([
    __param(3, IContextKeyService),
    __param(4, IContextViewService),
    __param(5, IInstantiationService),
    __param(6, IQuickInputService),
    __param(7, IFileService),
    __param(8, IEditorService),
    __param(9, ILabelService),
    __param(10, IConfigurationService),
    __param(11, IBreadcrumbsService)
], BreadcrumbsControl);
export { BreadcrumbsControl };
let BreadcrumbsControlFactory = class BreadcrumbsControlFactory {
    get control() { return this._control; }
    get onDidEnablementChange() { return this._onDidEnablementChange.event; }
    get onDidVisibilityChange() { return this._onDidVisibilityChange.event; }
    constructor(_container, _editorGroup, _options, configurationService, _instantiationService, fileService) {
        this._container = _container;
        this._editorGroup = _editorGroup;
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._disposables = new DisposableStore();
        this._controlDisposables = new DisposableStore();
        this._onDidEnablementChange = this._disposables.add(new Emitter());
        this._onDidVisibilityChange = this._disposables.add(new Emitter());
        const config = this._disposables.add(BreadcrumbsConfig.IsEnabled.bindTo(configurationService));
        this._disposables.add(config.onDidChange(() => {
            const value = config.getValue();
            if (!value && this._control) {
                this._controlDisposables.clear();
                this._control = undefined;
                this._onDidEnablementChange.fire();
            }
            else if (value && !this._control) {
                this._control = this.createControl();
                this._control.update();
                this._onDidEnablementChange.fire();
            }
        }));
        if (config.getValue()) {
            this._control = this.createControl();
        }
        this._disposables.add(fileService.onDidChangeFileSystemProviderRegistrations(e => {
            if (this._control?.model && this._control.model.resource.scheme !== e.scheme) {
                // ignore if the scheme of the breadcrumbs resource is not affected
                return;
            }
            if (this._control?.update()) {
                this._onDidEnablementChange.fire();
            }
        }));
    }
    createControl() {
        const control = this._controlDisposables.add(this._instantiationService.createInstance(BreadcrumbsControl, this._container, this._options, this._editorGroup));
        this._controlDisposables.add(control.onDidVisibilityChange(() => this._onDidVisibilityChange.fire()));
        return control;
    }
    dispose() {
        this._disposables.dispose();
        this._controlDisposables.dispose();
    }
};
BreadcrumbsControlFactory = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IFileService)
], BreadcrumbsControlFactory);
export { BreadcrumbsControlFactory };
//#region commands
// toggle command
registerAction2(class ToggleBreadcrumb extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.toggle',
            title: {
                ...localize2('cmd.toggle', "Toggle Breadcrumbs"),
                mnemonicTitle: localize({ key: 'miBreadcrumbs', comment: ['&& denotes a mnemonic'] }, "Toggle &&Breadcrumbs"),
            },
            category: Categories.View,
            toggled: {
                condition: ContextKeyExpr.equals('config.breadcrumbs.enabled', true),
                title: localize('cmd.toggle2', "Toggle Breadcrumbs"),
                mnemonicTitle: localize({ key: 'miBreadcrumbs2', comment: ['&& denotes a mnemonic'] }, "Toggle &&Breadcrumbs")
            },
            menu: [
                { id: MenuId.CommandPalette },
                { id: MenuId.MenubarAppearanceMenu, group: '4_editor', order: 2 },
                { id: MenuId.NotebookToolbar, group: 'notebookLayout', order: 2 },
                { id: MenuId.StickyScrollContext },
                { id: MenuId.NotebookStickyScrollContext, group: 'notebookView', order: 2 },
                { id: MenuId.NotebookToolbarContext, group: 'notebookView', order: 2 }
            ]
        });
    }
    run(accessor) {
        const config = accessor.get(IConfigurationService);
        const value = BreadcrumbsConfig.IsEnabled.bindTo(config).getValue();
        BreadcrumbsConfig.IsEnabled.bindTo(config).updateValue(!value);
    }
});
// focus/focus-and-select
function focusAndSelectHandler(accessor, select) {
    // find widget and focus/select
    const groups = accessor.get(IEditorGroupsService);
    const breadcrumbs = accessor.get(IBreadcrumbsService);
    const widget = breadcrumbs.getWidget(groups.activeGroup.id);
    if (widget) {
        const item = widget.getItems().at(-1);
        widget.setFocused(item);
        if (select) {
            widget.setSelection(item, BreadcrumbsControl.Payload_Pick);
        }
    }
}
registerAction2(class FocusAndSelectBreadcrumbs extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.focusAndSelect',
            title: localize2('cmd.focusAndSelect', "Focus and Select Breadcrumbs"),
            precondition: BreadcrumbsControl.CK_BreadcrumbsVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
                when: BreadcrumbsControl.CK_BreadcrumbsPossible,
            },
            f1: true
        });
    }
    run(accessor, ...args) {
        focusAndSelectHandler(accessor, true);
    }
});
registerAction2(class FocusBreadcrumbs extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.focus',
            title: localize2('cmd.focus', "Focus Breadcrumbs"),
            precondition: BreadcrumbsControl.CK_BreadcrumbsVisible,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 85 /* KeyCode.Semicolon */,
                when: BreadcrumbsControl.CK_BreadcrumbsPossible,
            },
            f1: true
        });
    }
    run(accessor, ...args) {
        focusAndSelectHandler(accessor, false);
    }
});
// this commands is only enabled when breadcrumbs are
// disabled which it then enables and focuses
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.toggleToOn',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */,
    when: ContextKeyExpr.not('config.breadcrumbs.enabled'),
    handler: async (accessor) => {
        const instant = accessor.get(IInstantiationService);
        const config = accessor.get(IConfigurationService);
        // check if enabled and iff not enable
        const isEnabled = BreadcrumbsConfig.IsEnabled.bindTo(config);
        if (!isEnabled.getValue()) {
            await isEnabled.updateValue(true);
            await timeout(50); // hacky - the widget might not be ready yet...
        }
        return instant.invokeFunction(focusAndSelectHandler, true);
    }
});
// navigation
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 17 /* KeyCode.RightArrow */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */],
    mac: {
        primary: 17 /* KeyCode.RightArrow */,
        secondary: [512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */],
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusNext();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 15 /* KeyCode.LeftArrow */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */],
    mac: {
        primary: 15 /* KeyCode.LeftArrow */,
        secondary: [512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */],
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusPrev();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusNextWithPicker',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusNext();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.focusPreviousWithPicker',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
    },
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.focusPrev();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.selectFocused',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 3 /* KeyCode.Enter */,
    secondary: [18 /* KeyCode.DownArrow */],
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setSelection(widget.getFocused(), BreadcrumbsControl.Payload_Pick);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.revealFocused',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 10 /* KeyCode.Space */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */],
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setSelection(widget.getFocused(), BreadcrumbsControl.Payload_Reveal);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.selectEditor',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    primary: 9 /* KeyCode.Escape */,
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive),
    handler(accessor) {
        const groups = accessor.get(IEditorGroupsService);
        const breadcrumbs = accessor.get(IBreadcrumbsService);
        const widget = breadcrumbs.getWidget(groups.activeGroup.id);
        if (!widget) {
            return;
        }
        widget.setFocused(undefined);
        widget.setSelection(undefined);
        groups.activeGroup.activeEditorPane?.focus();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'breadcrumbs.revealFocusedFromTreeAside',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    when: ContextKeyExpr.and(BreadcrumbsControl.CK_BreadcrumbsVisible, BreadcrumbsControl.CK_BreadcrumbsActive, WorkbenchListFocusContextKey),
    handler(accessor) {
        const editors = accessor.get(IEditorService);
        const lists = accessor.get(IListService);
        const tree = lists.lastFocusedList;
        if (!(tree instanceof WorkbenchDataTree) && !(tree instanceof WorkbenchAsyncDataTree)) {
            return;
        }
        const element = tree.getFocus()[0];
        if (URI.isUri(element?.resource)) {
            // IFileStat: open file in editor
            return editors.openEditor({
                resource: element.resource,
                options: { pinned: true }
            }, SIDE_GROUP);
        }
        // IOutline: check if this the outline and iff so reveal element
        const input = tree.getInput();
        if (input && typeof input.outlineKind === 'string') {
            return input.reveal(element, {
                pinned: true,
                preserveFocus: false
            }, true, false);
        }
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNDb250cm9sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9icmVhZGNydW1ic0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQW1ELE1BQU0sOERBQThELENBQUM7QUFDbkssT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXhFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JB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