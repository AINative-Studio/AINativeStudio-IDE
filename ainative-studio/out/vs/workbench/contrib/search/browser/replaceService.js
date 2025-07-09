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
var ReplaceService_1;
import * as nls from '../../../../nls.js';
import * as network from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IReplaceService } from './replace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../editor/common/model/textModel.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IBulkEditService, ResourceTextEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { dirname } from '../../../../base/common/resources.js';
import { Promises } from '../../../../base/common/async.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { INotebookEditorModelResolverService } from '../../notebook/common/notebookEditorModelResolverService.js';
import { isSearchTreeFileMatch, isSearchTreeMatch } from './searchTreeModel/searchTreeCommon.js';
import { isIMatchInNotebook } from './notebookSearch/notebookSearchModelBase.js';
const REPLACE_PREVIEW = 'replacePreview';
const toReplaceResource = (fileResource) => {
    return fileResource.with({ scheme: network.Schemas.internal, fragment: REPLACE_PREVIEW, query: JSON.stringify({ scheme: fileResource.scheme }) });
};
const toFileResource = (replaceResource) => {
    return replaceResource.with({ scheme: JSON.parse(replaceResource.query)['scheme'], fragment: '', query: '' });
};
let ReplacePreviewContentProvider = class ReplacePreviewContentProvider {
    static { this.ID = 'workbench.contrib.replacePreviewContentProvider'; }
    constructor(instantiationService, textModelResolverService) {
        this.instantiationService = instantiationService;
        this.textModelResolverService = textModelResolverService;
        this.textModelResolverService.registerTextModelContentProvider(network.Schemas.internal, this);
    }
    provideTextContent(uri) {
        if (uri.fragment === REPLACE_PREVIEW) {
            return this.instantiationService.createInstance(ReplacePreviewModel).resolve(uri);
        }
        return null;
    }
};
ReplacePreviewContentProvider = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextModelService)
], ReplacePreviewContentProvider);
export { ReplacePreviewContentProvider };
let ReplacePreviewModel = class ReplacePreviewModel extends Disposable {
    constructor(modelService, languageService, textModelResolverService, replaceService, searchWorkbenchService) {
        super();
        this.modelService = modelService;
        this.languageService = languageService;
        this.textModelResolverService = textModelResolverService;
        this.replaceService = replaceService;
        this.searchWorkbenchService = searchWorkbenchService;
    }
    async resolve(replacePreviewUri) {
        const fileResource = toFileResource(replacePreviewUri);
        const fileMatch = this.searchWorkbenchService.searchModel.searchResult.matches(false).filter(match => match.resource.toString() === fileResource.toString())[0];
        const ref = this._register(await this.textModelResolverService.createModelReference(fileResource));
        const sourceModel = ref.object.textEditorModel;
        const sourceModelLanguageId = sourceModel.getLanguageId();
        const replacePreviewModel = this.modelService.createModel(createTextBufferFactoryFromSnapshot(sourceModel.createSnapshot()), this.languageService.createById(sourceModelLanguageId), replacePreviewUri);
        this._register(fileMatch.onChange(({ forceUpdateModel }) => this.update(sourceModel, replacePreviewModel, fileMatch, forceUpdateModel)));
        this._register(this.searchWorkbenchService.searchModel.onReplaceTermChanged(() => this.update(sourceModel, replacePreviewModel, fileMatch)));
        this._register(fileMatch.onDispose(() => replacePreviewModel.dispose())); // TODO@Sandeep we should not dispose a model directly but rather the reference (depends on https://github.com/microsoft/vscode/issues/17073)
        this._register(replacePreviewModel.onWillDispose(() => this.dispose()));
        this._register(sourceModel.onWillDispose(() => this.dispose()));
        return replacePreviewModel;
    }
    update(sourceModel, replacePreviewModel, fileMatch, override = false) {
        if (!sourceModel.isDisposed() && !replacePreviewModel.isDisposed()) {
            this.replaceService.updateReplacePreview(fileMatch, override);
        }
    }
};
ReplacePreviewModel = __decorate([
    __param(0, IModelService),
    __param(1, ILanguageService),
    __param(2, ITextModelService),
    __param(3, IReplaceService),
    __param(4, ISearchViewModelWorkbenchService)
], ReplacePreviewModel);
let ReplaceService = class ReplaceService {
    static { ReplaceService_1 = this; }
    static { this.REPLACE_SAVE_SOURCE = SaveSourceRegistry.registerSource('searchReplace.source', nls.localize('searchReplace.source', "Search and Replace")); }
    constructor(textFileService, editorService, textModelResolverService, bulkEditorService, labelService, notebookEditorModelResolverService) {
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.textModelResolverService = textModelResolverService;
        this.bulkEditorService = bulkEditorService;
        this.labelService = labelService;
        this.notebookEditorModelResolverService = notebookEditorModelResolverService;
    }
    async replace(arg, progress = undefined, resource = null) {
        const edits = this.createEdits(arg, resource);
        await this.bulkEditorService.apply(edits, { progress });
        const rawTextPromises = edits.map(async (e) => {
            if (e.resource.scheme === network.Schemas.vscodeNotebookCell) {
                const notebookResource = CellUri.parse(e.resource)?.notebook;
                if (notebookResource) {
                    let ref;
                    try {
                        ref = await this.notebookEditorModelResolverService.resolve(notebookResource);
                        await ref.object.save({ source: ReplaceService_1.REPLACE_SAVE_SOURCE });
                    }
                    finally {
                        ref?.dispose();
                    }
                }
                return;
            }
            else {
                return this.textFileService.files.get(e.resource)?.save({ source: ReplaceService_1.REPLACE_SAVE_SOURCE });
            }
        });
        return Promises.settled(rawTextPromises);
    }
    async openReplacePreview(element, preserveFocus, sideBySide, pinned) {
        const fileMatch = isSearchTreeMatch(element) ? element.parent() : element;
        const editor = await this.editorService.openEditor({
            original: { resource: fileMatch.resource },
            modified: { resource: toReplaceResource(fileMatch.resource) },
            label: nls.localize('fileReplaceChanges', "{0} ↔ {1} (Replace Preview)", fileMatch.name(), fileMatch.name()),
            description: this.labelService.getUriLabel(dirname(fileMatch.resource), { relative: true }),
            options: {
                preserveFocus,
                pinned,
                revealIfVisible: true
            }
        });
        const input = editor?.input;
        const disposable = fileMatch.onDispose(() => {
            input?.dispose();
            disposable.dispose();
        });
        await this.updateReplacePreview(fileMatch);
        if (editor) {
            const editorControl = editor.getControl();
            if (isSearchTreeMatch(element) && editorControl) {
                editorControl.revealLineInCenter(element.range().startLineNumber, 1 /* ScrollType.Immediate */);
            }
        }
    }
    async updateReplacePreview(fileMatch, override = false) {
        const replacePreviewUri = toReplaceResource(fileMatch.resource);
        const [sourceModelRef, replaceModelRef] = await Promise.all([this.textModelResolverService.createModelReference(fileMatch.resource), this.textModelResolverService.createModelReference(replacePreviewUri)]);
        const sourceModel = sourceModelRef.object.textEditorModel;
        const replaceModel = replaceModelRef.object.textEditorModel;
        // If model is disposed do not update
        try {
            if (sourceModel && replaceModel) {
                if (override) {
                    replaceModel.setValue(sourceModel.getValue());
                }
                else {
                    replaceModel.undo();
                }
                this.applyEditsToPreview(fileMatch, replaceModel);
            }
        }
        finally {
            sourceModelRef.dispose();
            replaceModelRef.dispose();
        }
    }
    applyEditsToPreview(fileMatch, replaceModel) {
        const resourceEdits = this.createEdits(fileMatch, replaceModel.uri);
        const modelEdits = [];
        for (const resourceEdit of resourceEdits) {
            modelEdits.push(EditOperation.replaceMove(Range.lift(resourceEdit.textEdit.range), resourceEdit.textEdit.text));
        }
        replaceModel.pushEditOperations([], modelEdits.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range)), () => []);
    }
    createEdits(arg, resource = null) {
        const edits = [];
        if (isSearchTreeMatch(arg)) {
            if (!arg.isReadonly) {
                if (isIMatchInNotebook(arg)) {
                    // only apply edits if it's not a webview match, since webview matches are read-only
                    const match = arg;
                    edits.push(this.createEdit(match, match.replaceString, match.cell?.uri));
                }
                else {
                    const match = arg;
                    edits.push(this.createEdit(match, match.replaceString, resource));
                }
            }
        }
        if (isSearchTreeFileMatch(arg)) {
            arg = [arg];
        }
        if (arg instanceof Array) {
            arg.forEach(element => {
                const fileMatch = element;
                if (fileMatch.count() > 0) {
                    edits.push(...fileMatch.matches().flatMap(match => this.createEdits(match, resource)));
                }
            });
        }
        return edits;
    }
    createEdit(match, text, resource = null) {
        const fileMatch = match.parent();
        return new ResourceTextEdit(resource ?? fileMatch.resource, { range: match.range(), text }, undefined, undefined);
    }
};
ReplaceService = ReplaceService_1 = __decorate([
    __param(0, ITextFileService),
    __param(1, IEditorService),
    __param(2, ITextModelService),
    __param(3, IBulkEditService),
    __param(4, ILabelService),
    __param(5, INotebookEditorModelResolverService)
], ReplaceService);
export { ReplaceService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvcmVwbGFjZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFjLE1BQU0sc0NBQXNDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBNkIsTUFBTSx1REFBdUQsQ0FBQztBQUlySCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSxpREFBaUQsQ0FBQztBQUN0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