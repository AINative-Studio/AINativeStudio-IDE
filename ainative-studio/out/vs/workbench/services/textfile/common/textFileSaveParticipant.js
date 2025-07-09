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
import { localize } from '../../../../nls.js';
import { NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
let TextFileSaveParticipant = class TextFileSaveParticipant extends Disposable {
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
    async participate(model, context, progress, token) {
        const cts = new CancellationTokenSource(token);
        // undoStop before participation
        model.textEditorModel?.pushStackElement();
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
            delay: model.isDirty() ? 5000 : 3000
        }, async (progress) => {
            const participants = Array.from(this.saveParticipants).sort((a, b) => {
                const aValue = a.ordinal ?? 0;
                const bValue = b.ordinal ?? 0;
                return aValue - bValue;
            });
            for (const saveParticipant of participants) {
                if (cts.token.isCancellationRequested || !model.textEditorModel /* disposed */) {
                    break;
                }
                try {
                    const promise = saveParticipant.participate(model, context, progress, cts.token);
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
        model.textEditorModel?.pushStackElement();
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
TextFileSaveParticipant = __decorate([
    __param(0, ILogService),
    __param(1, IProgressService)
], TextFileSaveParticipant);
export { TextFileSaveParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTYXZlUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL2NvbW1vbi90ZXh0RmlsZVNhdmVQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBYSxnQkFBZ0IsRUFBbUMsTUFBTSxrREFBa0QsQ0FBQztBQUVoSSxPQUFPLEVBQWUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFcEYsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBSXRELFlBQ2MsVUFBd0MsRUFDbkMsZUFBa0Q7UUFFcEUsS0FBSyxFQUFFLENBQUM7UUFIc0IsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNsQixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFKcEQscUJBQWdCLEdBQUcsSUFBSSxVQUFVLEVBQTRCLENBQUM7SUFPL0UsQ0FBQztJQUVELGtCQUFrQixDQUFDLFdBQXFDO1FB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