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
import * as assert from '../../../base/common/assert.js';
import { Emitter } from '../../../base/common/event.js';
import { dispose } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { MainContext } from './extHost.protocol.js';
import { ExtHostDocumentData } from './extHostDocumentData.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtHostTextEditor } from './extHostTextEditor.js';
import * as typeConverters from './extHostTypeConverters.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ResourceMap } from '../../../base/common/map.js';
import { Schemas } from '../../../base/common/network.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Lazy } from '../../../base/common/lazy.js';
class Reference {
    constructor(value) {
        this.value = value;
        this._count = 0;
    }
    ref() {
        this._count++;
    }
    unref() {
        return --this._count === 0;
    }
}
let ExtHostDocumentsAndEditors = class ExtHostDocumentsAndEditors {
    constructor(_extHostRpc, _logService) {
        this._extHostRpc = _extHostRpc;
        this._logService = _logService;
        this._activeEditorId = null;
        this._editors = new Map();
        this._documents = new ResourceMap();
        this._onDidAddDocuments = new Emitter();
        this._onDidRemoveDocuments = new Emitter();
        this._onDidChangeVisibleTextEditors = new Emitter();
        this._onDidChangeActiveTextEditor = new Emitter();
        this.onDidAddDocuments = this._onDidAddDocuments.event;
        this.onDidRemoveDocuments = this._onDidRemoveDocuments.event;
        this.onDidChangeVisibleTextEditors = this._onDidChangeVisibleTextEditors.event;
        this.onDidChangeActiveTextEditor = this._onDidChangeActiveTextEditor.event;
    }
    $acceptDocumentsAndEditorsDelta(delta) {
        this.acceptDocumentsAndEditorsDelta(delta);
    }
    acceptDocumentsAndEditorsDelta(delta) {
        const removedDocuments = [];
        const addedDocuments = [];
        const removedEditors = [];
        if (delta.removedDocuments) {
            for (const uriComponent of delta.removedDocuments) {
                const uri = URI.revive(uriComponent);
                const data = this._documents.get(uri);
                if (data?.unref()) {
                    this._documents.delete(uri);
                    removedDocuments.push(data.value);
                }
            }
        }
        if (delta.addedDocuments) {
            for (const data of delta.addedDocuments) {
                const resource = URI.revive(data.uri);
                let ref = this._documents.get(resource);
                // double check -> only notebook cell documents should be
                // referenced/opened more than once...
                if (ref) {
                    if (resource.scheme !== Schemas.vscodeNotebookCell && resource.scheme !== Schemas.vscodeInteractiveInput) {
                        throw new Error(`document '${resource} already exists!'`);
                    }
                }
                if (!ref) {
                    ref = new Reference(new ExtHostDocumentData(this._extHostRpc.getProxy(MainContext.MainThreadDocuments), resource, data.lines, data.EOL, data.versionId, data.languageId, data.isDirty, data.encoding));
                    this._documents.set(resource, ref);
                    addedDocuments.push(ref.value);
                }
                ref.ref();
            }
        }
        if (delta.removedEditors) {
            for (const id of delta.removedEditors) {
                const editor = this._editors.get(id);
                this._editors.delete(id);
                if (editor) {
                    removedEditors.push(editor);
                }
            }
        }
        if (delta.addedEditors) {
            for (const data of delta.addedEditors) {
                const resource = URI.revive(data.documentUri);
                assert.ok(this._documents.has(resource), `document '${resource}' does not exist`);
                assert.ok(!this._editors.has(data.id), `editor '${data.id}' already exists!`);
                const documentData = this._documents.get(resource).value;
                const editor = new ExtHostTextEditor(data.id, this._extHostRpc.getProxy(MainContext.MainThreadTextEditors), this._logService, new Lazy(() => documentData.document), data.selections.map(typeConverters.Selection.to), data.options, data.visibleRanges.map(range => typeConverters.Range.to(range)), typeof data.editorPosition === 'number' ? typeConverters.ViewColumn.to(data.editorPosition) : undefined);
                this._editors.set(data.id, editor);
            }
        }
        if (delta.newActiveEditor !== undefined) {
            assert.ok(delta.newActiveEditor === null || this._editors.has(delta.newActiveEditor), `active editor '${delta.newActiveEditor}' does not exist`);
            this._activeEditorId = delta.newActiveEditor;
        }
        dispose(removedDocuments);
        dispose(removedEditors);
        // now that the internal state is complete, fire events
        if (delta.removedDocuments) {
            this._onDidRemoveDocuments.fire(removedDocuments);
        }
        if (delta.addedDocuments) {
            this._onDidAddDocuments.fire(addedDocuments);
        }
        if (delta.removedEditors || delta.addedEditors) {
            this._onDidChangeVisibleTextEditors.fire(this.allEditors().map(editor => editor.value));
        }
        if (delta.newActiveEditor !== undefined) {
            this._onDidChangeActiveTextEditor.fire(this.activeEditor());
        }
    }
    getDocument(uri) {
        return this._documents.get(uri)?.value;
    }
    allDocuments() {
        return Iterable.map(this._documents.values(), ref => ref.value);
    }
    getEditor(id) {
        return this._editors.get(id);
    }
    activeEditor(internal) {
        if (!this._activeEditorId) {
            return undefined;
        }
        const editor = this._editors.get(this._activeEditorId);
        if (internal) {
            return editor;
        }
        else {
            return editor?.value;
        }
    }
    allEditors() {
        return [...this._editors.values()];
    }
};
ExtHostDocumentsAndEditors = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService)
], ExtHostDocumentsAndEditors);
export { ExtHostDocumentsAndEditors };
export const IExtHostDocumentsAndEditors = createDecorator('IExtHostDocumentsAndEditors');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50c0FuZEVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERvY3VtZW50c0FuZEVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUE4RCxXQUFXLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNoSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFcEQsTUFBTSxT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