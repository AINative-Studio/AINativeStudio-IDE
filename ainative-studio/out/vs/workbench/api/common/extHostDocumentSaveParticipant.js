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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBSXRGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUdoRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUlwRyxNQUFNLE9BQU8sOEJBQThCO0lBSzFDLFlBQ2tCLFdBQXdCLEVBQ3hCLFVBQTRCLEVBQzVCLG9CQUE4QyxFQUM5QyxjQUFtRCxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtRQUgvRSxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUN4QixlQUFVLEdBQVYsVUFBVSxDQUFrQjtRQUM1Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTBCO1FBQzlDLGdCQUFXLEdBQVgsV0FBVyxDQUFvRTtRQVBoRixlQUFVLEdBQUcsSUFBSSxVQUFVLEVBQVksQ0FBQztRQUN4QyxrQkFBYSxHQUFHLElBQUksT0FBTyxFQUFvQixDQUFDO1FBUWhFLEVBQUU7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxF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