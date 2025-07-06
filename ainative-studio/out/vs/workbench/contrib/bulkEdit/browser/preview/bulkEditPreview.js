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
var BulkFileOperations_1, BulkEditPreviewProvider_1;
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../../editor/common/model/textModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { coalesceInPlace } from '../../../../../base/common/arrays.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ConflictDetector } from '../conflicts.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { localize } from '../../../../../nls.js';
import { extUri } from '../../../../../base/common/resources.js';
import { ResourceFileEdit, ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { SnippetParser } from '../../../../../editor/contrib/snippet/browser/snippetParser.js';
import { MicrotaskDelay } from '../../../../../base/common/symbols.js';
export class CheckedStates {
    constructor() {
        this._states = new WeakMap();
        this._checkedCount = 0;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        this._onDidChange.dispose();
    }
    get checkedCount() {
        return this._checkedCount;
    }
    isChecked(obj) {
        return this._states.get(obj) ?? false;
    }
    updateChecked(obj, value) {
        const valueNow = this._states.get(obj);
        if (valueNow === value) {
            return;
        }
        if (valueNow === undefined) {
            if (value) {
                this._checkedCount += 1;
            }
        }
        else {
            if (value) {
                this._checkedCount += 1;
            }
            else {
                this._checkedCount -= 1;
            }
        }
        this._states.set(obj, value);
        this._onDidChange.fire(obj);
    }
}
export class BulkTextEdit {
    constructor(parent, textEdit) {
        this.parent = parent;
        this.textEdit = textEdit;
    }
}
export var BulkFileOperationType;
(function (BulkFileOperationType) {
    BulkFileOperationType[BulkFileOperationType["TextEdit"] = 1] = "TextEdit";
    BulkFileOperationType[BulkFileOperationType["Create"] = 2] = "Create";
    BulkFileOperationType[BulkFileOperationType["Delete"] = 4] = "Delete";
    BulkFileOperationType[BulkFileOperationType["Rename"] = 8] = "Rename";
})(BulkFileOperationType || (BulkFileOperationType = {}));
export class BulkFileOperation {
    constructor(uri, parent) {
        this.uri = uri;
        this.parent = parent;
        this.type = 0;
        this.textEdits = [];
        this.originalEdits = new Map();
    }
    addEdit(index, type, edit) {
        this.type |= type;
        this.originalEdits.set(index, edit);
        if (edit instanceof ResourceTextEdit) {
            this.textEdits.push(new BulkTextEdit(this, edit));
        }
        else if (type === 8 /* BulkFileOperationType.Rename */) {
            this.newUri = edit.newResource;
        }
    }
    needsConfirmation() {
        for (const [, edit] of this.originalEdits) {
            if (!this.parent.checked.isChecked(edit)) {
                return true;
            }
        }
        return false;
    }
}
export class BulkCategory {
    static { this._defaultMetadata = Object.freeze({
        label: localize('default', "Other"),
        icon: Codicon.symbolFile,
        needsConfirmation: false
    }); }
    static keyOf(metadata) {
        return metadata?.label || '<default>';
    }
    constructor(metadata = BulkCategory._defaultMetadata) {
        this.metadata = metadata;
        this.operationByResource = new Map();
    }
    get fileOperations() {
        return this.operationByResource.values();
    }
}
let BulkFileOperations = BulkFileOperations_1 = class BulkFileOperations {
    static async create(accessor, bulkEdit) {
        const result = accessor.get(IInstantiationService).createInstance(BulkFileOperations_1, bulkEdit);
        return await result._init();
    }
    constructor(_bulkEdit, _fileService, instaService) {
        this._bulkEdit = _bulkEdit;
        this._fileService = _fileService;
        this.checked = new CheckedStates();
        this.fileOperations = [];
        this.categories = [];
        this.conflicts = instaService.createInstance(ConflictDetector, _bulkEdit);
    }
    dispose() {
        this.checked.dispose();
        this.conflicts.dispose();
    }
    async _init() {
        const operationByResource = new Map();
        const operationByCategory = new Map();
        const newToOldUri = new ResourceMap();
        for (let idx = 0; idx < this._bulkEdit.length; idx++) {
            const edit = this._bulkEdit[idx];
            let uri;
            let type;
            // store inital checked state
            this.checked.updateChecked(edit, !edit.metadata?.needsConfirmation);
            if (edit instanceof ResourceTextEdit) {
                type = 1 /* BulkFileOperationType.TextEdit */;
                uri = edit.resource;
            }
            else if (edit instanceof ResourceFileEdit) {
                if (edit.newResource && edit.oldResource) {
                    type = 8 /* BulkFileOperationType.Rename */;
                    uri = edit.oldResource;
                    if (edit.options?.overwrite === undefined && edit.options?.ignoreIfExists && await this._fileService.exists(uri)) {
                        // noop -> "soft" rename to something that already exists
                        continue;
                    }
                    // map newResource onto oldResource so that text-edit appear for
                    // the same file element
                    newToOldUri.set(edit.newResource, uri);
                }
                else if (edit.oldResource) {
                    type = 4 /* BulkFileOperationType.Delete */;
                    uri = edit.oldResource;
                    if (edit.options?.ignoreIfNotExists && !await this._fileService.exists(uri)) {
                        // noop -> "soft" delete something that doesn't exist
                        continue;
                    }
                }
                else if (edit.newResource) {
                    type = 2 /* BulkFileOperationType.Create */;
                    uri = edit.newResource;
                    if (edit.options?.overwrite === undefined && edit.options?.ignoreIfExists && await this._fileService.exists(uri)) {
                        // noop -> "soft" create something that already exists
                        continue;
                    }
                }
                else {
                    // invalid edit -> skip
                    continue;
                }
            }
            else {
                // unsupported edit
                continue;
            }
            const insert = (uri, map) => {
                let key = extUri.getComparisonKey(uri, true);
                let operation = map.get(key);
                // rename
                if (!operation && newToOldUri.has(uri)) {
                    uri = newToOldUri.get(uri);
                    key = extUri.getComparisonKey(uri, true);
                    operation = map.get(key);
                }
                if (!operation) {
                    operation = new BulkFileOperation(uri, this);
                    map.set(key, operation);
                }
                operation.addEdit(idx, type, edit);
            };
            insert(uri, operationByResource);
            // insert into "this" category
            const key = BulkCategory.keyOf(edit.metadata);
            let category = operationByCategory.get(key);
            if (!category) {
                category = new BulkCategory(edit.metadata);
                operationByCategory.set(key, category);
            }
            insert(uri, category.operationByResource);
        }
        operationByResource.forEach(value => this.fileOperations.push(value));
        operationByCategory.forEach(value => this.categories.push(value));
        // "correct" invalid parent-check child states that is
        // unchecked file edits (rename, create, delete) uncheck
        // all edits for a file, e.g no text change without rename
        for (const file of this.fileOperations) {
            if (file.type !== 1 /* BulkFileOperationType.TextEdit */) {
                let checked = true;
                for (const edit of file.originalEdits.values()) {
                    if (edit instanceof ResourceFileEdit) {
                        checked = checked && this.checked.isChecked(edit);
                    }
                }
                if (!checked) {
                    for (const edit of file.originalEdits.values()) {
                        this.checked.updateChecked(edit, checked);
                    }
                }
            }
        }
        // sort (once) categories atop which have unconfirmed edits
        this.categories.sort((a, b) => {
            if (a.metadata.needsConfirmation === b.metadata.needsConfirmation) {
                return a.metadata.label.localeCompare(b.metadata.label);
            }
            else if (a.metadata.needsConfirmation) {
                return -1;
            }
            else {
                return 1;
            }
        });
        return this;
    }
    getWorkspaceEdit() {
        const result = [];
        let allAccepted = true;
        for (let i = 0; i < this._bulkEdit.length; i++) {
            const edit = this._bulkEdit[i];
            if (this.checked.isChecked(edit)) {
                result[i] = edit;
                continue;
            }
            allAccepted = false;
        }
        if (allAccepted) {
            return this._bulkEdit;
        }
        // not all edits have been accepted
        coalesceInPlace(result);
        return result;
    }
    async getFileEditOperation(edit) {
        const content = await edit.options.contents;
        if (!content) {
            return undefined;
        }
        return EditOperation.replaceMove(Range.lift({ startLineNumber: 0, startColumn: 0, endLineNumber: Number.MAX_VALUE, endColumn: 0 }), content.toString());
    }
    async getFileEdits(uri) {
        for (const file of this.fileOperations) {
            if (file.uri.toString() === uri.toString()) {
                const result = [];
                let ignoreAll = false;
                for (const edit of file.originalEdits.values()) {
                    if (edit instanceof ResourceFileEdit) {
                        result.push(this.getFileEditOperation(edit));
                    }
                    else if (edit instanceof ResourceTextEdit) {
                        if (this.checked.isChecked(edit)) {
                            result.push(Promise.resolve(EditOperation.replaceMove(Range.lift(edit.textEdit.range), !edit.textEdit.insertAsSnippet ? edit.textEdit.text : SnippetParser.asInsertText(edit.textEdit.text))));
                        }
                    }
                    else if (!this.checked.isChecked(edit)) {
                        // UNCHECKED WorkspaceFileEdit disables all text edits
                        ignoreAll = true;
                    }
                }
                if (ignoreAll) {
                    return [];
                }
                return (await Promise.all(result)).filter(r => r !== undefined).sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
            }
        }
        return [];
    }
    getUriOfEdit(edit) {
        for (const file of this.fileOperations) {
            for (const value of file.originalEdits.values()) {
                if (value === edit) {
                    return file.uri;
                }
            }
        }
        throw new Error('invalid edit');
    }
};
BulkFileOperations = BulkFileOperations_1 = __decorate([
    __param(1, IFileService),
    __param(2, IInstantiationService)
], BulkFileOperations);
export { BulkFileOperations };
let BulkEditPreviewProvider = class BulkEditPreviewProvider {
    static { BulkEditPreviewProvider_1 = this; }
    static { this.Schema = 'vscode-bulkeditpreview-editor'; }
    static { this.emptyPreview = URI.from({ scheme: this.Schema, fragment: 'empty' }); }
    static fromPreviewUri(uri) {
        return URI.parse(uri.query);
    }
    constructor(_operations, _languageService, _modelService, _textModelResolverService) {
        this._operations = _operations;
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._textModelResolverService = _textModelResolverService;
        this._disposables = new DisposableStore();
        this._modelPreviewEdits = new Map();
        this._instanceId = generateUuid();
        this._disposables.add(this._textModelResolverService.registerTextModelContentProvider(BulkEditPreviewProvider_1.Schema, this));
        this._ready = this._init();
    }
    dispose() {
        this._disposables.dispose();
    }
    asPreviewUri(uri) {
        return URI.from({ scheme: BulkEditPreviewProvider_1.Schema, authority: this._instanceId, path: uri.path, query: uri.toString() });
    }
    async _init() {
        for (const operation of this._operations.fileOperations) {
            await this._applyTextEditsToPreviewModel(operation.uri);
        }
        this._disposables.add(Event.debounce(this._operations.checked.onDidChange, (_last, e) => e, MicrotaskDelay)(e => {
            const uri = this._operations.getUriOfEdit(e);
            this._applyTextEditsToPreviewModel(uri);
        }));
    }
    async _applyTextEditsToPreviewModel(uri) {
        const model = await this._getOrCreatePreviewModel(uri);
        // undo edits that have been done before
        const undoEdits = this._modelPreviewEdits.get(model.id);
        if (undoEdits) {
            model.applyEdits(undoEdits);
        }
        // apply new edits and keep (future) undo edits
        const newEdits = await this._operations.getFileEdits(uri);
        const newUndoEdits = model.applyEdits(newEdits, true);
        this._modelPreviewEdits.set(model.id, newUndoEdits);
    }
    async _getOrCreatePreviewModel(uri) {
        const previewUri = this.asPreviewUri(uri);
        let model = this._modelService.getModel(previewUri);
        if (!model) {
            try {
                // try: copy existing
                const ref = await this._textModelResolverService.createModelReference(uri);
                const sourceModel = ref.object.textEditorModel;
                model = this._modelService.createModel(createTextBufferFactoryFromSnapshot(sourceModel.createSnapshot()), this._languageService.createById(sourceModel.getLanguageId()), previewUri);
                ref.dispose();
            }
            catch {
                // create NEW model
                model = this._modelService.createModel('', this._languageService.createByFilepathOrFirstLine(previewUri), previewUri);
            }
            // this is a little weird but otherwise editors and other cusomers
            // will dispose my models before they should be disposed...
            // And all of this is off the eventloop to prevent endless recursion
            queueMicrotask(async () => {
                this._disposables.add(await this._textModelResolverService.createModelReference(model.uri));
            });
        }
        return model;
    }
    async provideTextContent(previewUri) {
        if (previewUri.toString() === BulkEditPreviewProvider_1.emptyPreview.toString()) {
            return this._modelService.createModel('', null, previewUri);
        }
        await this._ready;
        return this._modelService.getModel(previewUri);
    }
};
BulkEditPreviewProvider = BulkEditPreviewProvider_1 = __decorate([
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, ITextModelService)
], BulkEditPreviewProvider);
export { BulkEditPreviewProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRQcmV2aWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9wcmV2aWV3L2J1bGtFZGl0UHJldmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUE2QixpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSxvREFBb0QsQ0FBQztBQUN6RyxPQUFPLEVBQW9CLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDeEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDbkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFB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