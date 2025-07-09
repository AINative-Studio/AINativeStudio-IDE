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
var TypeHierarchyTreePeekWidget_1;
import './media/typeHierarchy.css';
import { Dimension, isKeyboardEvent } from '../../../../base/browser/dom.js';
import { Sizing, SplitView } from '../../../../base/browser/ui/splitview/splitview.js';
import { TreeMouseEventTarget } from '../../../../base/browser/ui/tree/tree.js';
import { Color } from '../../../../base/common/color.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Range } from '../../../../editor/common/core/range.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import * as peekView from '../../../../editor/contrib/peekView/browser/peekView.js';
import { localize } from '../../../../nls.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService, themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import * as typeHTree from './typeHierarchyTree.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
// Todo: copied from call hierarchy, to extract
var State;
(function (State) {
    State["Loading"] = "loading";
    State["Message"] = "message";
    State["Data"] = "data";
})(State || (State = {}));
class LayoutInfo {
    static store(info, storageService) {
        storageService.store('typeHierarchyPeekLayout', JSON.stringify(info), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    static retrieve(storageService) {
        const value = storageService.get('typeHierarchyPeekLayout', 0 /* StorageScope.PROFILE */, '{}');
        const defaultInfo = { ratio: 0.7, height: 17 };
        try {
            return { ...defaultInfo, ...JSON.parse(value) };
        }
        catch {
            return defaultInfo;
        }
    }
    constructor(ratio, height) {
        this.ratio = ratio;
        this.height = height;
    }
}
class TypeHierarchyTree extends WorkbenchAsyncDataTree {
}
let TypeHierarchyTreePeekWidget = class TypeHierarchyTreePeekWidget extends peekView.PeekViewWidget {
    static { TypeHierarchyTreePeekWidget_1 = this; }
    static { this.TitleMenu = new MenuId('typehierarchy/title'); }
    constructor(editor, _where, _direction, themeService, _peekViewService, _editorService, _textModelService, _storageService, _menuService, _contextKeyService, _instantiationService) {
        super(editor, { showFrame: true, showArrow: true, isResizeable: true, isAccessible: true }, _instantiationService);
        this._where = _where;
        this._direction = _direction;
        this._peekViewService = _peekViewService;
        this._editorService = _editorService;
        this._textModelService = _textModelService;
        this._storageService = _storageService;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._treeViewStates = new Map();
        this._previewDisposable = new DisposableStore();
        this.create();
        this._peekViewService.addExclusiveWidget(editor, this);
        this._applyTheme(themeService.getColorTheme());
        this._disposables.add(themeService.onDidColorThemeChange(this._applyTheme, this));
        this._disposables.add(this._previewDisposable);
    }
    dispose() {
        LayoutInfo.store(this._layoutInfo, this._storageService);
        this._splitView.dispose();
        this._tree.dispose();
        this._editor.dispose();
        super.dispose();
    }
    get direction() {
        return this._direction;
    }
    _applyTheme(theme) {
        const borderColor = theme.getColor(peekView.peekViewBorder) || Color.transparent;
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
            headerBackgroundColor: theme.getColor(peekView.peekViewTitleBackground) || Color.transparent,
            primaryHeadingColor: theme.getColor(peekView.peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekView.peekViewTitleInfoForeground)
        });
    }
    _fillHead(container) {
        super._fillHead(container, true);
        const menu = this._menuService.createMenu(TypeHierarchyTreePeekWidget_1.TitleMenu, this._contextKeyService);
        const updateToolbar = () => {
            const actions = getFlatActionBarActions(menu.getActions());
            this._actionbarWidget.clear();
            this._actionbarWidget.push(actions, { label: false, icon: true });
        };
        this._disposables.add(menu);
        this._disposables.add(menu.onDidChange(updateToolbar));
        updateToolbar();
    }
    _fillBody(parent) {
        this._layoutInfo = LayoutInfo.retrieve(this._storageService);
        this._dim = new Dimension(0, 0);
        this._parent = parent;
        parent.classList.add('type-hierarchy');
        const message = document.createElement('div');
        message.classList.add('message');
        parent.appendChild(message);
        this._message = message;
        this._message.tabIndex = 0;
        const container = document.createElement('div');
        container.classList.add('results');
        parent.appendChild(container);
        this._splitView = new SplitView(container, { orientation: 1 /* Orientation.HORIZONTAL */ });
        // editor stuff
        const editorContainer = document.createElement('div');
        editorContainer.classList.add('editor');
        container.appendChild(editorContainer);
        const editorOptions = {
            scrollBeyondLastLine: false,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false
            },
            overviewRulerLanes: 2,
            fixedOverflowWidgets: true,
            minimap: {
                enabled: false
            }
        };
        this._editor = this._instantiationService.createInstance(EmbeddedCodeEditorWidget, editorContainer, editorOptions, {}, this.editor);
        // tree stuff
        const treeContainer = document.createElement('div');
        treeContainer.classList.add('tree');
        container.appendChild(treeContainer);
        const options = {
            sorter: new typeHTree.Sorter(),
            accessibilityProvider: new typeHTree.AccessibilityProvider(() => this._direction),
            identityProvider: new typeHTree.IdentityProvider(() => this._direction),
            expandOnlyOnTwistieClick: true,
            overrideStyles: {
                listBackground: peekView.peekViewResultsBackground
            }
        };
        this._tree = this._instantiationService.createInstance(TypeHierarchyTree, 'TypeHierarchyPeek', treeContainer, new typeHTree.VirtualDelegate(), [this._instantiationService.createInstance(typeHTree.TypeRenderer)], this._instantiationService.createInstance(typeHTree.DataSource, () => this._direction), options);
        // split stuff
        this._splitView.addView({
            onDidChange: Event.None,
            element: editorContainer,
            minimumSize: 200,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                if (this._dim.height) {
                    this._editor.layout({ height: this._dim.height, width });
                }
            }
        }, Sizing.Distribute);
        this._splitView.addView({
            onDidChange: Event.None,
            element: treeContainer,
            minimumSize: 100,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                if (this._dim.height) {
                    this._tree.layout(this._dim.height, width);
                }
            }
        }, Sizing.Distribute);
        this._disposables.add(this._splitView.onDidSashChange(() => {
            if (this._dim.width) {
                this._layoutInfo.ratio = this._splitView.getViewSize(0) / this._dim.width;
            }
        }));
        // update editor
        this._disposables.add(this._tree.onDidChangeFocus(this._updatePreview, this));
        this._disposables.add(this._editor.onMouseDown(e => {
            const { event, target } = e;
            if (event.detail !== 2) {
                return;
            }
            const [focus] = this._tree.getFocus();
            if (!focus) {
                return;
            }
            this.dispose();
            this._editorService.openEditor({
                resource: focus.item.uri,
                options: { selection: target.range }
            });
        }));
        this._disposables.add(this._tree.onMouseDblClick(e => {
            if (e.target === TreeMouseEventTarget.Twistie) {
                return;
            }
            if (e.element) {
                this.dispose();
                this._editorService.openEditor({
                    resource: e.element.item.uri,
                    options: { selection: e.element.item.selectionRange, pinned: true }
                });
            }
        }));
        this._disposables.add(this._tree.onDidChangeSelection(e => {
            const [element] = e.elements;
            // don't close on click
            if (element && isKeyboardEvent(e.browserEvent)) {
                this.dispose();
                this._editorService.openEditor({
                    resource: element.item.uri,
                    options: { selection: element.item.selectionRange, pinned: true }
                });
            }
        }));
    }
    async _updatePreview() {
        const [element] = this._tree.getFocus();
        if (!element) {
            return;
        }
        this._previewDisposable.clear();
        // update: editor and editor highlights
        const options = {
            description: 'type-hierarchy-decoration',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            className: 'type-decoration',
            overviewRuler: {
                color: themeColorFromId(peekView.peekViewEditorMatchHighlight),
                position: OverviewRulerLane.Center
            },
        };
        let previewUri;
        if (this._direction === "supertypes" /* TypeHierarchyDirection.Supertypes */) {
            // supertypes: show super types and highlight focused type
            previewUri = element.parent ? element.parent.item.uri : element.model.root.uri;
        }
        else {
            // subtypes: show sub types and highlight focused type
            previewUri = element.item.uri;
        }
        const value = await this._textModelService.createModelReference(previewUri);
        this._editor.setModel(value.object.textEditorModel);
        // set decorations for type ranges
        const decorations = [];
        let fullRange;
        const loc = { uri: element.item.uri, range: element.item.selectionRange };
        if (loc.uri.toString() === previewUri.toString()) {
            decorations.push({ range: loc.range, options });
            fullRange = !fullRange ? loc.range : Range.plusRange(loc.range, fullRange);
        }
        if (fullRange) {
            this._editor.revealRangeInCenter(fullRange, 1 /* ScrollType.Immediate */);
            const decorationsCollection = this._editor.createDecorationsCollection(decorations);
            this._previewDisposable.add(toDisposable(() => decorationsCollection.clear()));
        }
        this._previewDisposable.add(value);
        // update: title
        const title = this._direction === "supertypes" /* TypeHierarchyDirection.Supertypes */
            ? localize('supertypes', "Supertypes of '{0}'", element.model.root.name)
            : localize('subtypes', "Subtypes of '{0}'", element.model.root.name);
        this.setTitle(title);
    }
    showLoading() {
        this._parent.dataset['state'] = "loading" /* State.Loading */;
        this.setTitle(localize('title.loading', "Loading..."));
        this._show();
    }
    showMessage(message) {
        this._parent.dataset['state'] = "message" /* State.Message */;
        this.setTitle('');
        this.setMetaTitle('');
        this._message.innerText = message;
        this._show();
        this._message.focus();
    }
    async showModel(model) {
        this._show();
        const viewState = this._treeViewStates.get(this._direction);
        await this._tree.setInput(model, viewState);
        const root = this._tree.getNode(model).children[0];
        await this._tree.expand(root.element);
        if (root.children.length === 0) {
            this.showMessage(this._direction === "supertypes" /* TypeHierarchyDirection.Supertypes */
                ? localize('empt.supertypes', "No supertypes of '{0}'", model.root.name)
                : localize('empt.subtypes', "No subtypes of '{0}'", model.root.name));
        }
        else {
            this._parent.dataset['state'] = "data" /* State.Data */;
            if (!viewState || this._tree.getFocus().length === 0) {
                this._tree.setFocus([root.children[0].element]);
            }
            this._tree.domFocus();
            this._updatePreview();
        }
    }
    getModel() {
        return this._tree.getInput();
    }
    getFocused() {
        return this._tree.getFocus()[0];
    }
    async updateDirection(newDirection) {
        const model = this._tree.getInput();
        if (model && newDirection !== this._direction) {
            this._treeViewStates.set(this._direction, this._tree.getViewState());
            this._direction = newDirection;
            await this.showModel(model);
        }
    }
    _show() {
        if (!this._isShowing) {
            this.editor.revealLineInCenterIfOutsideViewport(this._where.lineNumber, 0 /* ScrollType.Smooth */);
            super.show(Range.fromPositions(this._where), this._layoutInfo.height);
        }
    }
    _onWidth(width) {
        if (this._dim) {
            this._doLayoutBody(this._dim.height, width);
        }
    }
    _doLayoutBody(height, width) {
        if (this._dim.height !== height || this._dim.width !== width) {
            super._doLayoutBody(height, width);
            this._dim = new Dimension(width, height);
            this._layoutInfo.height = this._viewZone ? this._viewZone.heightInLines : this._layoutInfo.height;
            this._splitView.layout(width);
            this._splitView.resizeView(0, width * this._layoutInfo.ratio);
        }
    }
};
TypeHierarchyTreePeekWidget = TypeHierarchyTreePeekWidget_1 = __decorate([
    __param(3, IThemeService),
    __param(4, peekView.IPeekViewService),
    __param(5, IEditorService),
    __param(6, ITextModelService),
    __param(7, IStorageService),
    __param(8, IMenuService),
    __param(9, IContextKeyService),
    __param(10, IInstantiationService)
], TypeHierarchyTreePeekWidget);
export { TypeHierarchyTreePeekWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUhpZXJhcmNoeVBlZWsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdHlwZUhpZXJhcmNoeS9icm93c2VyL3R5cGVIaWVyYXJjaHlQZWVrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0UsT0FBTyxFQUFlLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVwRyxPQUFPLEVBQWEsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHckYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFHcEgsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXhFLE9BQU8sRUFBMEUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEtBQUssUUFBUSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUMxRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFB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