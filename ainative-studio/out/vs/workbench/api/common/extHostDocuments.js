/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { setWordDefinitionFor } from './extHostDocumentData.js';
import * as TypeConverters from './extHostTypeConverters.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { deepFreeze } from '../../../base/common/objects.js';
import { TextDocumentChangeReason } from './extHostTypes.js';
export class ExtHostDocuments {
    constructor(mainContext, documentsAndEditors) {
        this._onDidAddDocument = new Emitter();
        this._onDidRemoveDocument = new Emitter();
        this._onDidChangeDocument = new Emitter();
        this._onDidSaveDocument = new Emitter();
        this.onDidAddDocument = this._onDidAddDocument.event;
        this.onDidRemoveDocument = this._onDidRemoveDocument.event;
        this.onDidChangeDocument = this._onDidChangeDocument.event;
        this.onDidSaveDocument = this._onDidSaveDocument.event;
        this._toDispose = new DisposableStore();
        this._documentLoader = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadDocuments);
        this._documentsAndEditors = documentsAndEditors;
        this._documentsAndEditors.onDidRemoveDocuments(documents => {
            for (const data of documents) {
                this._onDidRemoveDocument.fire(data.document);
            }
        }, undefined, this._toDispose);
        this._documentsAndEditors.onDidAddDocuments(documents => {
            for (const data of documents) {
                this._onDidAddDocument.fire(data.document);
            }
        }, undefined, this._toDispose);
    }
    dispose() {
        this._toDispose.dispose();
    }
    getAllDocumentData() {
        return [...this._documentsAndEditors.allDocuments()];
    }
    getDocumentData(resource) {
        if (!resource) {
            return undefined;
        }
        const data = this._documentsAndEditors.getDocument(resource);
        if (data) {
            return data;
        }
        return undefined;
    }
    getDocument(resource) {
        const data = this.getDocumentData(resource);
        if (!data?.document) {
            throw new Error(`Unable to retrieve document from URI '${resource}'`);
        }
        return data.document;
    }
    ensureDocumentData(uri, options) {
        const cached = this._documentsAndEditors.getDocument(uri);
        if (cached && (!options?.encoding || cached.document.encoding === options.encoding)) {
            return Promise.resolve(cached);
        }
        let promise = this._documentLoader.get(uri.toString());
        if (!promise) {
            promise = this._proxy.$tryOpenDocument(uri, options).then(uriData => {
                this._documentLoader.delete(uri.toString());
                const canonicalUri = URI.revive(uriData);
                return assertIsDefined(this._documentsAndEditors.getDocument(canonicalUri));
            }, err => {
                this._documentLoader.delete(uri.toString());
                return Promise.reject(err);
            });
            this._documentLoader.set(uri.toString(), promise);
        }
        else {
            if (options?.encoding) {
                promise = promise.then(data => {
                    if (data.document.encoding !== options.encoding) {
                        return this.ensureDocumentData(uri, options);
                    }
                    return data;
                });
            }
        }
        return promise;
    }
    createDocumentData(options) {
        return this._proxy.$tryCreateDocument(options).then(data => URI.revive(data));
    }
    $acceptModelLanguageChanged(uriComponents, newLanguageId) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        // Treat a language change as a remove + add
        this._onDidRemoveDocument.fire(data.document);
        data._acceptLanguageId(newLanguageId);
        this._onDidAddDocument.fire(data.document);
    }
    $acceptModelSaved(uriComponents) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        this.$acceptDirtyStateChanged(uriComponents, false);
        this._onDidSaveDocument.fire(data.document);
    }
    $acceptDirtyStateChanged(uriComponents, isDirty) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptIsDirty(isDirty);
        this._onDidChangeDocument.fire({
            document: data.document,
            contentChanges: [],
            reason: undefined
        });
    }
    $acceptEncodingChanged(uriComponents, encoding) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptEncoding(encoding);
        this._onDidChangeDocument.fire({
            document: data.document,
            contentChanges: [],
            reason: undefined
        });
    }
    $acceptModelChanged(uriComponents, events, isDirty) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptIsDirty(isDirty);
        data.onEvents(events);
        let reason = undefined;
        if (events.isUndoing) {
            reason = TextDocumentChangeReason.Undo;
        }
        else if (events.isRedoing) {
            reason = TextDocumentChangeReason.Redo;
        }
        this._onDidChangeDocument.fire(deepFreeze({
            document: data.document,
            contentChanges: events.changes.map((change) => {
                return {
                    range: TypeConverters.Range.to(change.range),
                    rangeOffset: change.rangeOffset,
                    rangeLength: change.rangeLength,
                    text: change.text
                };
            }),
            reason
        }));
    }
    setWordDefinitionFor(languageId, wordDefinition) {
        setWordDefinitionFor(languageId, wordDefinition);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3REb2N1bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBRWpFLE9BQU8sRUFBdUMsV0FBVyxFQUE0QixNQUFNLHVCQUF1QixDQUFDO0FBQ25ILE9BQU8sRUFBdUIsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVyRixPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBRTdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFN0QsTUFBTSxPQUFPLGdCQUFnQjtJQWlCNUIsWUFBWSxXQUF5QixFQUFFLG1CQUErQztRQWZyRSxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztRQUN2RCx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztRQUMxRCx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBa0MsQ0FBQztRQUNyRSx1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztRQUVoRSxxQkFBZ0IsR0FBK0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztRQUM1RSx3QkFBbUIsR0FBK0IsSUFBSSxDQUFDLG9CQUFv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