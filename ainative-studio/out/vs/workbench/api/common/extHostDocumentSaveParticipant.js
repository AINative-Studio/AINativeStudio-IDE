/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { illegalState } from '../../../base/common/errors.js';
import { TextEdit } from './extHostTypes.js';
import { Range, TextDocumentSaveReason, EndOfLine } from './extHostTypeConverters.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
export class ExtHostDocumentSaveParticipant {
    constructor(_logService, _documents, _mainThreadBulkEdits, _thresholds = { timeout: 1500, errors: 3 }) {
        this._logService = _logService;
        this._documents = _documents;
        this._mainThreadBulkEdits = _mainThreadBulkEdits;
        this._thresholds = _thresholds;
        this._callbacks = new LinkedList();
        this._badListeners = new WeakMap();
        //
    }
    dispose() {
        this._callbacks.clear();
    }
    getOnWillSaveTextDocumentEvent(extension) {
        return (listener, thisArg, disposables) => {
            const remove = this._callbacks.push([listener, thisArg, extension]);
            const result = { dispose: remove };
            if (Array.isArray(disposables)) {
                disposables.push(result);
            }
            return result;
        };
    }
    async $participateInSave(data, reason) {
        const resource = URI.revive(data);
        let didTimeout = false;
        const didTimeoutHandle = setTimeout(() => didTimeout = true, this._thresholds.timeout);
        const results = [];
        try {
            for (const listener of [...this._callbacks]) { // copy to prevent concurrent modifications
                if (didTimeout) {
                    // timeout - no more listeners
                    break;
                }
                const document = this._documents.getDocument(resource);
                const success = await this._deliverEventAsyncAndBlameBadListeners(listener, { document, reason: TextDocumentSaveReason.to(reason) });
                results.push(success);
            }
        }
        finally {
            clearTimeout(didTimeoutHandle);
        }
        return results;
    }
    _deliverEventAsyncAndBlameBadListeners([listener, thisArg, extension], stubEvent) {
        const errors = this._badListeners.get(listener);
        if (typeof errors === 'number' && errors > this._thresholds.errors) {
            // bad listener - ignore
            return Promise.resolve(false);
        }
        return this._deliverEventAsync(extension, listener, thisArg, stubEvent).then(() => {
            // don't send result across the wire
            return true;
        }, err => {
            this._logService.error(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' threw ERROR`);
            this._logService.error(err);
            if (!(err instanceof Error) || err.message !== 'concurrent_edits') {
                const errors = this._badListeners.get(listener);
                this._badListeners.set(listener, !errors ? 1 : errors + 1);
                if (typeof errors === 'number' && errors > this._thresholds.errors) {
                    this._logService.info(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' will now be IGNORED because of timeouts and/or errors`);
                }
            }
            return false;
        });
    }
    _deliverEventAsync(extension, listener, thisArg, stubEvent) {
        const promises = [];
        const t1 = Date.now();
        const { document, reason } = stubEvent;
        const { version } = document;
        const event = Object.freeze({
            document,
            reason,
            waitUntil(p) {
                if (Object.isFrozen(promises)) {
                    throw illegalState('waitUntil can not be called async');
                }
                promises.push(Promise.resolve(p));
            }
        });
        try {
            // fire event
            listener.apply(thisArg, [event]);
        }
        catch (err) {
            return Promise.reject(err);
        }
        // freeze promises after event call
        Object.freeze(promises);
        return new Promise((resolve, reject) => {
            // join on all listener promises, reject after timeout
            const handle = setTimeout(() => reject(new Error('timeout')), this._thresholds.timeout);
            return Promise.all(promises).then(edits => {
                this._logService.debug(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' finished after ${(Date.now() - t1)}ms`);
                clearTimeout(handle);
                resolve(edits);
            }).catch(err => {
                clearTimeout(handle);
                reject(err);
            });
        }).then(values => {
            const dto = { edits: [] };
            for (const value of values) {
                if (Array.isArray(value) && value.every(e => e instanceof TextEdit)) {
                    for (const { newText, newEol, range } of value) {
                        dto.edits.push({
                            resource: document.uri,
                            versionId: undefined,
                            textEdit: {
                                range: range && Range.from(range),
                                text: newText,
                                eol: newEol && EndOfLine.from(newEol),
                            }
                        });
                    }
                }
            }
            // apply edits if any and if document
            // didn't change somehow in the meantime
            if (dto.edits.length === 0) {
                return undefined;
            }
            if (version === document.version) {
                return this._mainThreadBulkEdits.$tryApplyWorkspaceEdit(new SerializableObjectWithBuffers(dto));
            }
            return Promise.reject(new Error('concurrent_edits'));
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3REb2N1bWVudFNhdmVQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxzQkFBc0IsRUFBRSxTQUFTLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUl0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHaEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFJcEcsTUFBTSxPQUFPLDhCQUE4QjtJQUsxQyxZQUNrQixXQUF3QixFQUN4QixVQUE0QixFQUM1QixvQkFBOEMsRUFDOUMsY0FBbUQsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFIL0UsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7UUFDNUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUEwQjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FBb0U7UUFQaEYsZUFBVSxHQUFHLElBQUksVUFBVSxFQUFZLENBQUM7UUFDeEMsa0JBQWEsR0FBRyxJQUFJLE9BQU8sRUFBb0IsQ0FBQztRQVFoRSxFQUFFO0lBQ0gsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUss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