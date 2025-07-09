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
var MarkerController_1;
import { Codicon } from '../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IMarkerNavigationService } from './markerNavigationService.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { MarkerNavigationWidget } from './gotoErrorWidget.js';
let MarkerController = class MarkerController {
    static { MarkerController_1 = this; }
    static { this.ID = 'editor.contrib.markerController'; }
    static get(editor) {
        return editor.getContribution(MarkerController_1.ID);
    }
    constructor(editor, _markerNavigationService, _contextKeyService, _editorService, _instantiationService) {
        this._markerNavigationService = _markerNavigationService;
        this._contextKeyService = _contextKeyService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._sessionDispoables = new DisposableStore();
        this._editor = editor;
        this._widgetVisible = CONTEXT_MARKERS_NAVIGATION_VISIBLE.bindTo(this._contextKeyService);
    }
    dispose() {
        this._cleanUp();
        this._sessionDispoables.dispose();
    }
    _cleanUp() {
        this._widgetVisible.reset();
        this._sessionDispoables.clear();
        this._widget = undefined;
        this._model = undefined;
    }
    _getOrCreateModel(uri) {
        if (this._model && this._model.matches(uri)) {
            return this._model;
        }
        let reusePosition = false;
        if (this._model) {
            reusePosition = true;
            this._cleanUp();
        }
        this._model = this._markerNavigationService.getMarkerList(uri);
        if (reusePosition) {
            this._model.move(true, this._editor.getModel(), this._editor.getPosition());
        }
        this._widget = this._instantiationService.createInstance(MarkerNavigationWidget, this._editor);
        this._widget.onDidClose(() => this.close(), this, this._sessionDispoables);
        this._widgetVisible.set(true);
        this._sessionDispoables.add(this._model);
        this._sessionDispoables.add(this._widget);
        // follow cursor
        this._sessionDispoables.add(this._editor.onDidChangeCursorPosition(e => {
            if (!this._model?.selected || !Range.containsPosition(this._model?.selected.marker, e.position)) {
                this._model?.resetIndex();
            }
        }));
        // update markers
        this._sessionDispoables.add(this._model.onDidChange(() => {
            if (!this._widget || !this._widget.position || !this._model) {
                return;
            }
            const info = this._model.find(this._editor.getModel().uri, this._widget.position);
            if (info) {
                this._widget.updateMarker(info.marker);
            }
            else {
                this._widget.showStale();
            }
        }));
        // open related
        this._sessionDispoables.add(this._widget.onDidSelectRelatedInformation(related => {
            this._editorService.openCodeEditor({
                resource: related.resource,
                options: { pinned: true, revealIfOpened: true, selection: Range.lift(related).collapseToStart() }
            }, this._editor);
            this.close(false);
        }));
        this._sessionDispoables.add(this._editor.onDidChangeModel(() => this._cleanUp()));
        return this._model;
    }
    close(focusEditor = true) {
        this._cleanUp();
        if (focusEditor) {
            this._editor.focus();
        }
    }
    showAtMarker(marker) {
        if (!this._editor.hasModel()) {
            return;
        }
        const textModel = this._editor.getModel();
        const model = this._getOrCreateModel(textModel.uri);
        model.resetIndex();
        model.move(true, textModel, new Position(marker.startLineNumber, marker.startColumn));
        if (model.selected) {
            this._widget.showAtMarker(model.selected.marker, model.selected.index, model.selected.total);
        }
    }
    async navigate(next, multiFile) {
        if (!this._editor.hasModel()) {
            return;
        }
        const textModel = this._editor.getModel();
        const model = this._getOrCreateModel(multiFile ? undefined : textModel.uri);
        model.move(next, textModel, this._editor.getPosition());
        if (!model.selected) {
            return;
        }
        if (model.selected.marker.resource.toString() !== textModel.uri.toString()) {
            // show in different editor
            this._cleanUp();
            const otherEditor = await this._editorService.openCodeEditor({
                resource: model.selected.marker.resource,
                options: { pinned: false, revealIfOpened: true, selectionRevealType: 2 /* TextEditorSelectionRevealType.NearTop */, selection: model.selected.marker }
            }, this._editor);
            if (otherEditor) {
                MarkerController_1.get(otherEditor)?.close();
                MarkerController_1.get(otherEditor)?.navigate(next, multiFile);
            }
        }
        else {
            // show in this editor
            this._widget.showAtMarker(model.selected.marker, model.selected.index, model.selected.total);
        }
    }
};
MarkerController = MarkerController_1 = __decorate([
    __param(1, IMarkerNavigationService),
    __param(2, IContextKeyService),
    __param(3, ICodeEditorService),
    __param(4, IInstantiationService)
], MarkerController);
export { MarkerController };
class MarkerNavigationAction extends EditorAction {
    constructor(_next, _multiFile, opts) {
        super(opts);
        this._next = _next;
        this._multiFile = _multiFile;
    }
    async run(_accessor, editor) {
        if (editor.hasModel()) {
            await MarkerController.get(editor)?.navigate(this._next, this._multiFile);
        }
    }
}
export class NextMarkerAction extends MarkerNavigationAction {
    static { this.ID = 'editor.action.marker.next'; }
    static { this.LABEL = nls.localize2('markerAction.next.label', "Go to Next Problem (Error, Warning, Info)"); }
    constructor() {
        super(true, false, {
            id: NextMarkerAction.ID,
            label: NextMarkerAction.LABEL,
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 512 /* KeyMod.Alt */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MarkerNavigationWidget.TitleMenu,
                title: NextMarkerAction.LABEL.value,
                icon: registerIcon('marker-navigation-next', Codicon.arrowDown, nls.localize('nextMarkerIcon', 'Icon for goto next marker.')),
                group: 'navigation',
                order: 1
            }
        });
    }
}
class PrevMarkerAction extends MarkerNavigationAction {
    static { this.ID = 'editor.action.marker.prev'; }
    static { this.LABEL = nls.localize2('markerAction.previous.label', "Go to Previous Problem (Error, Warning, Info)"); }
    constructor() {
        super(false, false, {
            id: PrevMarkerAction.ID,
            label: PrevMarkerAction.LABEL,
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MarkerNavigationWidget.TitleMenu,
                title: PrevMarkerAction.LABEL.value,
                icon: registerIcon('marker-navigation-previous', Codicon.arrowUp, nls.localize('previousMarkerIcon', 'Icon for goto previous marker.')),
                group: 'navigation',
                order: 2
            }
        });
    }
}
class NextMarkerInFilesAction extends MarkerNavigationAction {
    constructor() {
        super(true, true, {
            id: 'editor.action.marker.nextInFiles',
            label: nls.localize2('markerAction.nextInFiles.label', "Go to Next Problem in Files (Error, Warning, Info)"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarGoMenu,
                title: nls.localize({ key: 'miGotoNextProblem', comment: ['&& denotes a mnemonic'] }, "Next &&Problem"),
                group: '6_problem_nav',
                order: 1
            }
        });
    }
}
class PrevMarkerInFilesAction extends MarkerNavigationAction {
    constructor() {
        super(false, true, {
            id: 'editor.action.marker.prevInFiles',
            label: nls.localize2('markerAction.previousInFiles.label', "Go to Previous Problem in Files (Error, Warning, Info)"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 1024 /* KeyMod.Shift */ | 66 /* KeyCode.F8 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarGoMenu,
                title: nls.localize({ key: 'miGotoPreviousProblem', comment: ['&& denotes a mnemonic'] }, "Previous &&Problem"),
                group: '6_problem_nav',
                order: 2
            }
        });
    }
}
registerEditorContribution(MarkerController.ID, MarkerController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(NextMarkerAction);
registerEditorAction(PrevMarkerAction);
registerEditorAction(NextMarkerInFilesAction);
registerEditorAction(PrevMarkerInFilesAction);
const CONTEXT_MARKERS_NAVIGATION_VISIBLE = new RawContextKey('markersNavigationVisible', false);
const MarkerCommand = EditorCommand.bindToContribution(MarkerController.get);
registerEditorCommand(new MarkerCommand({
    id: 'closeMarkersNavigation',
    precondition: CONTEXT_MARKERS_NAVIGATION_VISIBLE,
    handler: x => x.close(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 50,
        kbExpr: EditorContextKeys.focus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
    }
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0Vycm9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9FcnJvci9icm93c2VyL2dvdG9FcnJvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUd2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBbUQsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFDL04sT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsd0JBQXdCLEVBQWMsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRXZELElB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