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
import { decodeBase64 } from '../../../base/common/buffer.js';
import { revive } from '../../../base/common/marshalling.js';
import { IBulkEditService, ResourceFileEdit, ResourceTextEdit } from '../../../editor/browser/services/bulkEditService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { MainContext } from '../common/extHost.protocol.js';
import { ResourceNotebookCellEdit } from '../../contrib/bulkEdit/browser/bulkCellEdits.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadBulkEdits = class MainThreadBulkEdits {
    constructor(_extHostContext, _bulkEditService, _logService, _uriIdentService) {
        this._bulkEditService = _bulkEditService;
        this._logService = _logService;
        this._uriIdentService = _uriIdentService;
    }
    dispose() { }
    $tryApplyWorkspaceEdit(dto, undoRedoGroupId, isRefactoring) {
        const edits = reviveWorkspaceEditDto(dto.value, this._uriIdentService);
        return this._bulkEditService.apply(edits, { undoRedoGroupId, respectAutoSaveConfig: isRefactoring }).then((res) => res.isApplied, err => {
            this._logService.warn(`IGNORING workspace edit: ${err}`);
            return false;
        });
    }
};
MainThreadBulkEdits = __decorate([
    extHostNamedCustomer(MainContext.MainThreadBulkEdits),
    __param(1, IBulkEditService),
    __param(2, ILogService),
    __param(3, IUriIdentityService)
], MainThreadBulkEdits);
export { MainThreadBulkEdits };
export function reviveWorkspaceEditDto(data, uriIdentityService, resolveDataTransferFile) {
    if (!data || !data.edits) {
        return data;
    }
    const result = revive(data);
    for (const edit of result.edits) {
        if (ResourceTextEdit.is(edit)) {
            edit.resource = uriIdentityService.asCanonicalUri(edit.resource);
        }
        if (ResourceFileEdit.is(edit)) {
            if (edit.options) {
                const inContents = edit.options?.contents;
                if (inContents) {
                    if (inContents.type === 'base64') {
                        edit.options.contents = Promise.resolve(decodeBase64(inContents.value));
                    }
                    else {
                        if (resolveDataTransferFile) {
                            edit.options.contents = resolveDataTransferFile(inContents.id);
                        }
                        else {
                            throw new Error('Could not revive data transfer file');
                        }
                    }
                }
            }
            edit.newResource = edit.newResource && uriIdentityService.asCanonicalUri(edit.newResource);
            edit.oldResource = edit.oldResource && uriIdentityService.asCanonicalUri(edit.oldResource);
        }
        if (ResourceNotebookCellEdit.is(edit)) {
            edit.resource = uriIdentityService.asCanonicalUri(edit.resource);
            const cellEdit = edit.cellEdit;
            if (cellEdit.editType === 1 /* CellEditType.Replace */) {
                edit.cellEdit = {
                    ...cellEdit,
                    cells: cellEdit.cells.map(cell => ({
                        ...cell,
                        outputs: cell.outputs.map(output => ({
                            ...output,
                            outputs: output.items.map(item => {
                                return {
                                    mime: item.mime,
                                    data: item.valueBytes
                                };
                            })
                        }))
                    }))
                };
            }
        }
    }
    return data;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEJ1bGtFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEJ1bGtFZGl0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVksWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTNILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQW1FLFdBQVcsRUFBNEIsTUFBTSwrQkFBK0IsQ0FBQztBQUN2SixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUUzRixPQUFPLEVBQW1CLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFLdEcsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFFL0IsWUFDQyxlQUFnQyxFQUNHLGdCQUFrQyxFQUN2QyxXQUF3QixFQUNoQixnQkFBcUM7UUFGeEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUN2QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNoQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXFCO0lBQ3hFLENBQUM7SUFFTCxPQUFPLEtBQVcsQ0FBQztJQUVuQixzQkFBc0IsQ0FBQyxHQUFxRCxFQUFFLGVBQXdCLEVBQUUsYUFBdUI7UUFDOUgsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENB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