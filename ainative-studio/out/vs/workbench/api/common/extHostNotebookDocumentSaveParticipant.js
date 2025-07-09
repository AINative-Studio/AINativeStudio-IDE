/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AsyncEmitter } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
import { TextDocumentSaveReason, WorkspaceEdit as WorksapceEditConverter } from './extHostTypeConverters.js';
import { WorkspaceEdit } from './extHostTypes.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
export class ExtHostNotebookDocumentSaveParticipant {
    constructor(_logService, _notebooksAndEditors, _mainThreadBulkEdits, _thresholds = { timeout: 1500, errors: 3 }) {
        this._logService = _logService;
        this._notebooksAndEditors = _notebooksAndEditors;
        this._mainThreadBulkEdits = _mainThreadBulkEdits;
        this._thresholds = _thresholds;
        this._onWillSaveNotebookDocumentEvent = new AsyncEmitter();
    }
    dispose() {
    }
    getOnWillSaveNotebookDocumentEvent(extension) {
        return (listener, thisArg, disposables) => {
            const wrappedListener = function wrapped(e) { listener.call(thisArg, e); };
            wrappedListener.extension = extension;
            return this._onWillSaveNotebookDocumentEvent.event(wrappedListener, undefined, disposables);
        };
    }
    async $participateInSave(resource, reason, token) {
        const revivedUri = URI.revive(resource);
        const document = this._notebooksAndEditors.getNotebookDocument(revivedUri);
        if (!document) {
            throw new Error('Unable to resolve notebook document');
        }
        const edits = [];
        await this._onWillSaveNotebookDocumentEvent.fireAsync({ notebook: document.apiNotebook, reason: TextDocumentSaveReason.to(reason) }, token, async (thenable, listener) => {
            const now = Date.now();
            const data = await await Promise.resolve(thenable);
            if (Date.now() - now > this._thresholds.timeout) {
                this._logService.warn('onWillSaveNotebookDocument-listener from extension', listener.extension.identifier);
            }
            if (token.isCancellationRequested) {
                return;
            }
            if (data) {
                if (data instanceof WorkspaceEdit) {
                    edits.push(data);
                }
                else {
                    // ignore invalid data
                    this._logService.warn('onWillSaveNotebookDocument-listener from extension', listener.extension.identifier, 'ignored due to invalid data');
                }
            }
            return;
        });
        if (token.isCancellationRequested) {
            return false;
        }
        if (edits.length === 0) {
            return true;
        }
        const dto = { edits: [] };
        for (const edit of edits) {
            const { edits } = WorksapceEditConverter.from(edit);
            dto.edits = dto.edits.concat(edits);
        }
        return this._mainThreadBulkEdits.$tryApplyWorkspaceEdit(new SerializableObjectWithBuffers(dto));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRG9jdW1lbnRTYXZlUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE5vdGVib29rRG9jdW1lbnRTYXZlUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFLakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGFBQWEsSUFBSSxzQkFBc0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzdHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVsRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQVFwRyxNQUFNLE9BQU8sc0NBQXNDO0lBSWxELFlBQ2tCLFdBQXdCLEVBQ3hCLG9CQUErQyxFQUMvQyxvQkFBOEMsRUFDOUMsY0FBbUQsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7UUFIL0UsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUEyQjtRQUMvQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTBCO1FBQzlDLGdCQUFXLEdBQVgsV0FBVyxDQUFvRTtRQU5oRixxQ0FBZ0MsR0FBRyxJQUFJLFlBQVksRUFBaUMsQ0FBQztJQVF0RyxDQUFDO0lBRUQsT0FBTztJQUNQLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxTQUFnQztRQUNsRSxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRTtZQUN6QyxNQUFN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