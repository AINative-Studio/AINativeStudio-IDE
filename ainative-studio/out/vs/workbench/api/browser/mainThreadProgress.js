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
import { IProgressService } from '../../../platform/progress/common/progress.js';
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { localize } from '../../../nls.js';
import { onUnexpectedExternalError } from '../../../base/common/errors.js';
import { toAction } from '../../../base/common/actions.js';
let MainThreadProgress = class MainThreadProgress {
    constructor(extHostContext, progressService, _commandService) {
        this._commandService = _commandService;
        this._progress = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostProgress);
        this._progressService = progressService;
    }
    dispose() {
        this._progress.forEach(handle => handle.resolve());
        this._progress.clear();
    }
    async $startProgress(handle, options, extensionId) {
        const task = this._createTask(handle);
        if (options.location === 15 /* ProgressLocation.Notification */ && extensionId) {
            const notificationOptions = {
                ...options,
                location: 15 /* ProgressLocation.Notification */,
                secondaryActions: [toAction({
                        id: extensionId,
                        label: localize('manageExtension', "Manage Extension"),
                        run: () => this._commandService.executeCommand('_extensions.manage', extensionId)
                    })]
            };
            options = notificationOptions;
        }
        try {
            this._progressService.withProgress(options, task, () => this._proxy.$acceptProgressCanceled(handle));
        }
        catch (err) {
            // the withProgress-method will throw synchronously when invoked with bad options
            // which is then an enternal/extension error
            onUnexpectedExternalError(err);
        }
    }
    $progressReport(handle, message) {
        const entry = this._progress.get(handle);
        entry?.progress.report(message);
    }
    $progressEnd(handle) {
        const entry = this._progress.get(handle);
        if (entry) {
            entry.resolve();
            this._progress.delete(handle);
        }
    }
    _createTask(handle) {
        return (progress) => {
            return new Promise(resolve => {
                this._progress.set(handle, { resolve, progress });
            });
        };
    }
};
MainThreadProgress = __decorate([
    extHostNamedCustomer(MainContext.MainThreadProgress),
    __param(1, IProgressService),
    __param(2, ICommandService)
], MainThreadProgress);
export { MainThreadProgress };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFByb2dyZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkUHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFhLGdCQUFnQixFQUFtRixNQUFNLCtDQUErQyxDQUFDO0FBQzdLLE9BQU8sRUFBMkIsV0FBVyxFQUF3QixjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzSCxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHcEQsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7SUFNOUIsWUFDQyxjQUErQixFQUNiLGVBQWlDLEVBQ2xDLGVBQWlEO1FBQWhDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQU4zRCxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXVFLENBQUM7UUFRbEcsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENB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