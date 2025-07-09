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
var DropIntoEditorController_1;
import { coalesce } from '../../../../base/common/arrays.js';
import { createCancelablePromise, raceCancellation } from '../../../../base/common/async.js';
import { VSDataTransfer } from '../../../../base/common/dataTransfer.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { toExternalVSDataTransfer } from '../../../browser/dnd.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { DraggedTreeItemsIdentifier } from '../../../common/services/treeViewsDnd.js';
import { ITreeViewsDnDService } from '../../../common/services/treeViewsDndService.js';
import { EditorStateCancellationTokenSource } from '../../editorState/browser/editorState.js';
import { InlineProgressManager } from '../../inlineProgress/browser/inlineProgress.js';
import { sortEditsByYieldTo } from './edit.js';
import { PostEditWidgetManager } from './postEditWidget.js';
export const dropAsPreferenceConfig = 'editor.dropIntoEditor.preferences';
export const changeDropTypeCommandId = 'editor.changeDropType';
export const dropWidgetVisibleCtx = new RawContextKey('dropWidgetVisible', false, localize('dropWidgetVisible', "Whether the drop widget is showing"));
let DropIntoEditorController = class DropIntoEditorController extends Disposable {
    static { DropIntoEditorController_1 = this; }
    static { this.ID = 'editor.contrib.dropIntoEditorController'; }
    static get(editor) {
        return editor.getContribution(DropIntoEditorController_1.ID);
    }
    static setConfigureDefaultAction(action) {
        this._configureDefaultAction = action;
    }
    constructor(editor, instantiationService, _configService, _languageFeaturesService, _treeViewsDragAndDropService) {
        super();
        this._configService = _configService;
        this._languageFeaturesService = _languageFeaturesService;
        this._treeViewsDragAndDropService = _treeViewsDragAndDropService;
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this._dropProgressManager = this._register(instantiationService.createInstance(InlineProgressManager, 'dropIntoEditor', editor));
        this._postDropWidgetManager = this._register(instantiationService.createInstance(PostEditWidgetManager, 'dropIntoEditor', editor, dropWidgetVisibleCtx, { id: changeDropTypeCommandId, label: localize('postDropWidgetTitle', "Show drop options...") }, () => DropIntoEditorController_1._configureDefaultAction ? [DropIntoEditorController_1._configureDefaultAction] : []));
        this._register(editor.onDropIntoEditor(e => this.onDropIntoEditor(editor, e.position, e.event)));
    }
    clearWidgets() {
        this._postDropWidgetManager.clear();
    }
    changeDropType() {
        this._postDropWidgetManager.tryShowSelector();
    }
    async onDropIntoEditor(editor, position, dragEvent) {
        if (!dragEvent.dataTransfer || !editor.hasModel()) {
            return;
        }
        DropIntoEditorController_1._currentDropOperation?.cancel();
        editor.focus();
        editor.setPosition(position);
        const p = createCancelablePromise(async (token) => {
            const disposables = new DisposableStore();
            const tokenSource = disposables.add(new EditorStateCancellationTokenSource(editor, 1 /* CodeEditorStateFlag.Value */, undefined, token));
            try {
                const ourDataTransfer = await this.extractDataTransferData(dragEvent);
                if (ourDataTransfer.size === 0 || tokenSource.token.isCancellationRequested) {
                    return;
                }
                const model = editor.getModel();
                if (!model) {
                    return;
                }
                const providers = this._languageFeaturesService.documentDropEditProvider
                    .ordered(model)
                    .filter(provider => {
                    if (!provider.dropMimeTypes) {
                        // Keep all providers that don't specify mime types
                        return true;
                    }
                    return provider.dropMimeTypes.some(mime => ourDataTransfer.matches(mime));
                });
                const editSession = disposables.add(await this.getDropEdits(providers, model, position, ourDataTransfer, tokenSource.token));
                if (tokenSource.token.isCancellationRequested) {
                    return;
                }
                if (editSession.edits.length) {
                    const activeEditIndex = this.getInitialActiveEditIndex(model, editSession.edits);
                    const canShowWidget = editor.getOption(36 /* EditorOption.dropIntoEditor */).showDropSelector === 'afterDrop';
                    // Pass in the parent token here as it tracks cancelling the entire drop operation
                    await this._postDropWidgetManager.applyEditAndShowIfNeeded([Range.fromPositions(position)], { activeEditIndex, allEdits: editSession.edits }, canShowWidget, async (edit) => edit, token);
                }
            }
            finally {
                disposables.dispose();
                if (DropIntoEditorController_1._currentDropOperation === p) {
                    DropIntoEditorController_1._currentDropOperation = undefined;
                }
            }
        });
        this._dropProgressManager.showWhile(position, localize('dropIntoEditorProgress', "Running drop handlers. Click to cancel"), p, { cancel: () => p.cancel() });
        DropIntoEditorController_1._currentDropOperation = p;
    }
    async getDropEdits(providers, model, position, dataTransfer, token) {
        const disposables = new DisposableStore();
        const results = await raceCancellation(Promise.all(providers.map(async (provider) => {
            try {
                const edits = await provider.provideDocumentDropEdits(model, position, dataTransfer, token);
                if (edits) {
                    disposables.add(edits);
                }
                return edits?.edits.map(edit => ({ ...edit, providerId: provider.id }));
            }
            catch (err) {
                if (!isCancellationError(err)) {
                    console.error(err);
                }
                console.error(err);
            }
            return undefined;
        })), token);
        const edits = coalesce(results ?? []).flat();
        return {
            edits: sortEditsByYieldTo(edits),
            dispose: () => disposables.dispose()
        };
    }
    getInitialActiveEditIndex(model, edits) {
        const preferredProviders = this._configService.getValue(dropAsPreferenceConfig, { resource: model.uri });
        for (const config of Array.isArray(preferredProviders) ? preferredProviders : []) {
            const desiredKind = new HierarchicalKind(config);
            const editIndex = edits.findIndex(edit => edit.kind && desiredKind.contains(edit.kind));
            if (editIndex >= 0) {
                return editIndex;
            }
        }
        return 0;
    }
    async extractDataTransferData(dragEvent) {
        if (!dragEvent.dataTransfer) {
            return new VSDataTransfer();
        }
        const dataTransfer = toExternalVSDataTransfer(dragEvent.dataTransfer);
        if (this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)) {
            const data = this.treeItemsTransfer.getData(DraggedTreeItemsIdentifier.prototype);
            if (Array.isArray(data)) {
                for (const id of data) {
                    const treeDataTransfer = await this._treeViewsDragAndDropService.removeDragOperationTransfer(id.identifier);
                    if (treeDataTransfer) {
                        for (const [type, value] of treeDataTransfer) {
                            dataTransfer.replace(type, value);
                        }
                    }
                }
            }
        }
        return dataTransfer;
    }
};
DropIntoEditorController = DropIntoEditorController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, ILanguageFeaturesService),
    __param(4, ITreeViewsDnDService)
], DropIntoEditorController);
export { DropIntoEditorController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcEludG9FZGl0b3JDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2Ryb3BJbnRvRWRpdG9yQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVoSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBSW5FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUl0RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FB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