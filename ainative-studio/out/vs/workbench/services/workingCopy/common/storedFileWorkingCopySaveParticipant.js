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
import { raceCancellation } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
let StoredFileWorkingCopySaveParticipant = class StoredFileWorkingCopySaveParticipant extends Disposable {
    get length() { return this.saveParticipants.size; }
    constructor(logService, progressService) {
        super();
        this.logService = logService;
        this.progressService = progressService;
        this.saveParticipants = new LinkedList();
    }
    addSaveParticipant(participant) {
        const remove = this.saveParticipants.push(participant);
        return toDisposable(() => remove());
    }
    async participate(workingCopy, context, progress, token) {
        const cts = new CancellationTokenSource(token);
        // undoStop before participation
        workingCopy.model?.pushStackElement();
        // report to the "outer" progress
        progress.report({
            message: localize('saveParticipants1', "Running Code Actions and Formatters...")
        });
        let bubbleCancel = false;
        // create an "inner" progress to allow to skip over long running save participants
        await this.progressService.withProgress({
            priority: NotificationPriority.URGENT,
            location: 15 /* ProgressLocation.Notification */,
            cancellable: localize('skip', "Skip"),
            delay: workingCopy.isDirty() ? 5000 : 3000
        }, async (progress) => {
            const participants = Array.from(this.saveParticipants).sort((a, b) => {
                const aValue = a.ordinal ?? 0;
                const bValue = b.ordinal ?? 0;
                return aValue - bValue;
            });
            for (const saveParticipant of participants) {
                if (cts.token.isCancellationRequested || workingCopy.isDisposed()) {
                    break;
                }
                try {
                    const promise = saveParticipant.participate(workingCopy, context, progress, cts.token);
                    await raceCancellation(promise, cts.token);
                }
                catch (err) {
                    if (!isCancellationError(err)) {
                        this.logService.error(err);
                    }
                    else if (!cts.token.isCancellationRequested) {
                        // we see a cancellation error BUT the token didn't signal it
                        // this means the participant wants the save operation to be cancelled
                        cts.cancel();
                        bubbleCancel = true;
                    }
                }
            }
        }, () => {
            cts.cancel();
        });
        // undoStop after participation
        workingCopy.model?.pushStackElement();
        cts.dispose();
        if (bubbleCancel) {
            throw new CancellationError();
        }
    }
    dispose() {
        this.saveParticipants.clear();
        super.dispose();
    }
};
StoredFileWorkingCopySaveParticipant = __decorate([
    __param(0, ILogService),
    __param(1, IProgressService)
], StoredFileWorkingCopySaveParticipant);
export { StoredFileWorkingCopySaveParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5U2F2ZVBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vc3RvcmVkRmlsZVdvcmtpbmdDb3B5U2F2ZVBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFhLGdCQUFnQixFQUFtQyxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hJLE9BQU8sRUFBZSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHN0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV2QyxJQUFNLG9DQUFvQyxHQUExQyxNQUFNLG9DQUFxQyxTQUFRLFVBQVU7SUFJbkUsSUFBSSxNQUFNLEtBQWEsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUUzRCxZQUNjLFVBQXdDLEVBQ25DLGVBQWtEO1FBRXBFLEtBQUssRUFBRSxDQUFDO1FBSHNCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbEIs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