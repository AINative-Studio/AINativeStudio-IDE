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
var QuickDiffDecorator_1;
import * as nls from '../../../../nls.js';
import './media/dirtydiffDecorator.css';
import { Disposable, DisposableStore, DisposableMap } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ChangeType, getChangeType, minimapGutterAddedBackground, minimapGutterDeletedBackground, minimapGutterModifiedBackground, overviewRulerAddedForeground, overviewRulerDeletedForeground, overviewRulerModifiedForeground } from '../common/quickDiff.js';
import { IQuickDiffModelService } from './quickDiffModel.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { autorun, autorunWithStore, observableFromEvent } from '../../../../base/common/observable.js';
export const quickDiffDecorationCount = new RawContextKey('quickDiffDecorationCount', 0);
let QuickDiffDecorator = QuickDiffDecorator_1 = class QuickDiffDecorator extends Disposable {
    static createDecoration(className, tooltip, options) {
        const decorationOptions = {
            description: 'dirty-diff-decoration',
            isWholeLine: options.isWholeLine,
        };
        if (options.gutter) {
            decorationOptions.linesDecorationsClassName = `dirty-diff-glyph ${className}`;
            decorationOptions.linesDecorationsTooltip = tooltip;
        }
        if (options.overview.active) {
            decorationOptions.overviewRuler = {
                color: themeColorFromId(options.overview.color),
                position: OverviewRulerLane.Left
            };
        }
        if (options.minimap.active) {
            decorationOptions.minimap = {
                color: themeColorFromId(options.minimap.color),
                position: 2 /* MinimapPosition.Gutter */
            };
        }
        return ModelDecorationOptions.createDynamic(decorationOptions);
    }
    constructor(codeEditor, quickDiffModelRef, configurationService) {
        super();
        this.codeEditor = codeEditor;
        this.quickDiffModelRef = quickDiffModelRef;
        this.configurationService = configurationService;
        const decorations = configurationService.getValue('scm.diffDecorations');
        const gutter = decorations === 'all' || decorations === 'gutter';
        const overview = decorations === 'all' || decorations === 'overview';
        const minimap = decorations === 'all' || decorations === 'minimap';
        const diffAdded = nls.localize('diffAdded', 'Added lines');
        this.addedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-added', diffAdded, {
            gutter,
            overview: { active: overview, color: overviewRulerAddedForeground },
            minimap: { active: minimap, color: minimapGutterAddedBackground },
            isWholeLine: true
        });
        this.addedPatternOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-added-pattern', diffAdded, {
            gutter,
            overview: { active: overview, color: overviewRulerAddedForeground },
            minimap: { active: minimap, color: minimapGutterAddedBackground },
            isWholeLine: true
        });
        const diffModified = nls.localize('diffModified', 'Changed lines');
        this.modifiedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-modified', diffModified, {
            gutter,
            overview: { active: overview, color: overviewRulerModifiedForeground },
            minimap: { active: minimap, color: minimapGutterModifiedBackground },
            isWholeLine: true
        });
        this.modifiedPatternOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-modified-pattern', diffModified, {
            gutter,
            overview: { active: overview, color: overviewRulerModifiedForeground },
            minimap: { active: minimap, color: minimapGutterModifiedBackground },
            isWholeLine: true
        });
        this.deletedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-deleted', nls.localize('diffDeleted', 'Removed lines'), {
            gutter,
            overview: { active: overview, color: overviewRulerDeletedForeground },
            minimap: { active: minimap, color: minimapGutterDeletedBackground },
            isWholeLine: false
        });
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('scm.diffDecorationsGutterPattern')) {
                this.onDidChange();
            }
        }));
        this._register(Event.runAndSubscribe(this.quickDiffModelRef.object.onDidChange, () => this.onDidChange()));
    }
    onDidChange() {
        if (!this.codeEditor.hasModel()) {
            return;
        }
        const visibleQuickDiffs = this.quickDiffModelRef.object.quickDiffs.filter(quickDiff => quickDiff.visible);
        const pattern = this.configurationService.getValue('scm.diffDecorationsGutterPattern');
        const decorations = this.quickDiffModelRef.object.changes
            .filter(labeledChange => visibleQuickDiffs.some(quickDiff => quickDiff.label === labeledChange.label))
            .map((labeledChange) => {
            const change = labeledChange.change;
            const changeType = getChangeType(change);
            const startLineNumber = change.modifiedStartLineNumber;
            const endLineNumber = change.modifiedEndLineNumber || startLineNumber;
            switch (changeType) {
                case ChangeType.Add:
                    return {
                        range: {
                            startLineNumber: startLineNumber, startColumn: 1,
                            endLineNumber: endLineNumber, endColumn: 1
                        },
                        options: pattern.added ? this.addedPatternOptions : this.addedOptions
                    };
                case ChangeType.Delete:
                    return {
                        range: {
                            startLineNumber: startLineNumber, startColumn: Number.MAX_VALUE,
                            endLineNumber: startLineNumber, endColumn: Number.MAX_VALUE
                        },
                        options: this.deletedOptions
                    };
                case ChangeType.Modify:
                    return {
                        range: {
                            startLineNumber: startLineNumber, startColumn: 1,
                            endLineNumber: endLineNumber, endColumn: 1
                        },
                        options: pattern.modified ? this.modifiedPatternOptions : this.modifiedOptions
                    };
            }
        });
        if (!this.decorationsCollection) {
            this.decorationsCollection = this.codeEditor.createDecorationsCollection(decorations);
        }
        else {
            this.decorationsCollection.set(decorations);
        }
    }
    dispose() {
        if (this.decorationsCollection) {
            this.decorationsCollection.clear();
        }
        this.decorationsCollection = undefined;
        this.quickDiffModelRef.dispose();
        super.dispose();
    }
};
QuickDiffDecorator = QuickDiffDecorator_1 = __decorate([
    __param(2, IConfigurationService)
], QuickDiffDecorator);
let QuickDiffWorkbenchController = class QuickDiffWorkbenchController extends Disposable {
    constructor(editorService, configurationService, quickDiffModelService, uriIdentityService, contextKeyService) {
        super();
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.quickDiffModelService = quickDiffModelService;
        this.uriIdentityService = uriIdentityService;
        this.enabled = false;
        // Resource URI -> Code Editor Id -> Decoration (Disposable)
        this.decorators = new ResourceMap();
        this.viewState = { width: 3, visibility: 'always' };
        this.transientDisposables = this._register(new DisposableStore());
        this.stylesheet = domStylesheetsJs.createStyleSheet(undefined, undefined, this._store);
        this.quickDiffDecorationCount = quickDiffDecorationCount.bindTo(contextKeyService);
        this.activeEditor = observableFromEvent(this, this.editorService.onDidActiveEditorChange, () => this.editorService.activeEditor);
        const onDidChangeConfiguration = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.diffDecorations'));
        this._register(onDidChangeConfiguration(this.onDidChangeConfiguration, this));
        this.onDidChangeConfiguration();
        const onDidChangeDiffWidthConfiguration = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.diffDecorationsGutterWidth'));
        this._register(onDidChangeDiffWidthConfiguration(this.onDidChangeDiffWidthConfiguration, this));
        this.onDidChangeDiffWidthConfiguration();
        const onDidChangeDiffVisibilityConfiguration = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.diffDecorationsGutterVisibility'));
        this._register(onDidChangeDiffVisibilityConfiguration(this.onDidChangeDiffVisibilityConfiguration, this));
        this.onDidChangeDiffVisibilityConfiguration();
    }
    onDidChangeConfiguration() {
        const enabled = this.configurationService.getValue('scm.diffDecorations') !== 'none';
        if (enabled) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    onDidChangeDiffWidthConfiguration() {
        let width = this.configurationService.getValue('scm.diffDecorationsGutterWidth');
        if (isNaN(width) || width <= 0 || width > 5) {
            width = 3;
        }
        this.setViewState({ ...this.viewState, width });
    }
    onDidChangeDiffVisibilityConfiguration() {
        const visibility = this.configurationService.getValue('scm.diffDecorationsGutterVisibility');
        this.setViewState({ ...this.viewState, visibility });
    }
    setViewState(state) {
        this.viewState = state;
        this.stylesheet.textContent = `
			.monaco-editor .dirty-diff-added,
			.monaco-editor .dirty-diff-modified {
				border-left-width:${state.width}px;
			}
			.monaco-editor .dirty-diff-added-pattern,
			.monaco-editor .dirty-diff-added-pattern:before,
			.monaco-editor .dirty-diff-modified-pattern,
			.monaco-editor .dirty-diff-modified-pattern:before {
				background-size: ${state.width}px ${state.width}px;
			}
			.monaco-editor .dirty-diff-added,
			.monaco-editor .dirty-diff-added-pattern,
			.monaco-editor .dirty-diff-modified,
			.monaco-editor .dirty-diff-modified-pattern,
			.monaco-editor .dirty-diff-deleted {
				opacity: ${state.visibility === 'always' ? 1 : 0};
			}
		`;
    }
    enable() {
        if (this.enabled) {
            this.disable();
        }
        this.transientDisposables.add(Event.any(this.editorService.onDidCloseEditor, this.editorService.onDidVisibleEditorsChange)(() => this.onEditorsChanged()));
        this.onEditorsChanged();
        this.onDidActiveEditorChange();
        this.enabled = true;
    }
    disable() {
        if (!this.enabled) {
            return;
        }
        this.transientDisposables.clear();
        this.quickDiffDecorationCount.set(0);
        for (const [uri, decoratorMap] of this.decorators.entries()) {
            decoratorMap.dispose();
            this.decorators.delete(uri);
        }
        this.enabled = false;
    }
    onDidActiveEditorChange() {
        this.transientDisposables.add(autorunWithStore((reader, store) => {
            const activeEditor = this.activeEditor.read(reader);
            const activeTextEditorControl = this.editorService.activeTextEditorControl;
            if (!isCodeEditor(activeTextEditorControl) || !activeEditor?.resource) {
                this.quickDiffDecorationCount.set(0);
                return;
            }
            const quickDiffModelRef = this.quickDiffModelService.createQuickDiffModelReference(activeEditor.resource);
            if (!quickDiffModelRef) {
                this.quickDiffDecorationCount.set(0);
                return;
            }
            store.add(quickDiffModelRef);
            const visibleDecorationCount = observableFromEvent(this, quickDiffModelRef.object.onDidChange, () => {
                const visibleQuickDiffs = quickDiffModelRef.object.quickDiffs.filter(quickDiff => quickDiff.visible);
                return quickDiffModelRef.object.changes.filter(labeledChange => visibleQuickDiffs.some(quickDiff => quickDiff.label === labeledChange.label)).length;
            });
            store.add(autorun(reader => {
                const count = visibleDecorationCount.read(reader);
                this.quickDiffDecorationCount.set(count);
            }));
        }));
    }
    onEditorsChanged() {
        for (const editor of this.editorService.visibleTextEditorControls) {
            if (!isCodeEditor(editor)) {
                continue;
            }
            const textModel = editor.getModel();
            if (!textModel) {
                continue;
            }
            const editorId = editor.getId();
            if (this.decorators.get(textModel.uri)?.has(editorId)) {
                continue;
            }
            const quickDiffModelRef = this.quickDiffModelService.createQuickDiffModelReference(textModel.uri);
            if (!quickDiffModelRef) {
                continue;
            }
            if (!this.decorators.has(textModel.uri)) {
                this.decorators.set(textModel.uri, new DisposableMap());
            }
            this.decorators.get(textModel.uri).set(editorId, new QuickDiffDecorator(editor, quickDiffModelRef, this.configurationService));
        }
        // Dispose decorators for editors that are no longer visible.
        for (const [uri, decoratorMap] of this.decorators.entries()) {
            for (const editorId of decoratorMap.keys()) {
                const codeEditor = this.editorService.visibleTextEditorControls
                    .find(editor => isCodeEditor(editor) && editor.getId() === editorId &&
                    this.uriIdentityService.extUri.isEqual(editor.getModel()?.uri, uri));
                if (!codeEditor) {
                    decoratorMap.deleteAndDispose(editorId);
                }
            }
            if (decoratorMap.size === 0) {
                decoratorMap.dispose();
                this.decorators.delete(uri);
            }
        }
    }
    dispose() {
        this.disable();
        super.dispose();
    }
};
QuickDiffWorkbenchController = __decorate([
    __param(0, IEditorService),
    __param(1, IConfigurationService),
    __param(2, IQuickDiffModelService),
    __param(3, IUriIdentityService),
    __param(4, IContextKeyService)
], QuickDiffWorkbenchController);
export { QuickDiffWorkbenchController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmRGVjb3JhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3F1aWNrRGlmZkRlY29yYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBYyxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRixPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFeEYsT0FBTyxFQUFFLGlCQUFpQixFQUE0QyxNQUFNLG9DQUFvQyxDQUFDO0FBQ2pILE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsNEJBQTRCLEVBQUUsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsNEJBQTRCLEVBQUUsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNqUSxPQUFPLEVBQWtCLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFN0UsT0FBTyxFQUFF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