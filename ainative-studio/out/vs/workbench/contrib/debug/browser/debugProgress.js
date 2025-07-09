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
import { Event } from '../../../../base/common/event.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IDebugService, VIEWLET_ID } from '../common/debug.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
let DebugProgressContribution = class DebugProgressContribution {
    constructor(debugService, progressService, viewsService) {
        this.toDispose = [];
        let progressListener;
        const listenOnProgress = (session) => {
            if (progressListener) {
                progressListener.dispose();
                progressListener = undefined;
            }
            if (session) {
                progressListener = session.onDidProgressStart(async (progressStartEvent) => {
                    const promise = new Promise(r => {
                        // Show progress until a progress end event comes or the session ends
                        const listener = Event.any(Event.filter(session.onDidProgressEnd, e => e.body.progressId === progressStartEvent.body.progressId), session.onDidEndAdapter)(() => {
                            listener.dispose();
                            r();
                        });
                    });
                    if (viewsService.isViewContainerVisible(VIEWLET_ID)) {
                        progressService.withProgress({ location: VIEWLET_ID }, () => promise);
                    }
                    const source = debugService.getAdapterManager().getDebuggerLabel(session.configuration.type);
                    progressService.withProgress({
                        location: 15 /* ProgressLocation.Notification */,
                        title: progressStartEvent.body.title,
                        cancellable: progressStartEvent.body.cancellable,
                        source,
                        delay: 500
                    }, progressStep => {
                        let total = 0;
                        const reportProgress = (progress) => {
                            let increment = undefined;
                            if (typeof progress.percentage === 'number') {
                                increment = progress.percentage - total;
                                total += increment;
                            }
                            progressStep.report({
                                message: progress.message,
                                increment,
                                total: typeof increment === 'number' ? 100 : undefined,
                            });
                        };
                        if (progressStartEvent.body.message) {
                            reportProgress(progressStartEvent.body);
                        }
                        const progressUpdateListener = session.onDidProgressUpdate(e => {
                            if (e.body.progressId === progressStartEvent.body.progressId) {
                                reportProgress(e.body);
                            }
                        });
                        return promise.then(() => progressUpdateListener.dispose());
                    }, () => session.cancel(progressStartEvent.body.progressId));
                });
            }
        };
        this.toDispose.push(debugService.getViewModel().onDidFocusSession(listenOnProgress));
        listenOnProgress(debugService.getViewModel().focusedSession);
        this.toDispose.push(debugService.onWillNewSession(session => {
            if (!progressListener) {
                listenOnProgress(session);
            }
        }));
    }
    dispose() {
        dispose(this.toDispose);
    }
};
DebugProgressContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IProgressService),
    __param(2, IViewsService)
], DebugProgressContribution);
export { DebugProgressContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdQcm9ncmVzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnUHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0sa0RBQWtELENBQUM7QUFFdEcsT0FBTyxFQUFFLGFBQWEsRUFBaUIsVUFBVSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXhFLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCO0lBSXJDLFlBQ2dCLFlBQTJCLEVBQ3hCLGVBQWlDLEVBQ3BDLFlBQTJCO1FBTG5DLGNBQVMsR0FBa0IsRUFBRSxDQUFDO1FBT3JDLElBQUksZ0JBQXlDLENBQUM7UUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLE9BQWtDLEVBQUUsRUFBRTtZQUMvRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3RCLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMzQixnQkFBZ0IsR0FBRyxTQUFTLENBQUM7WUFDOUIsQ0FBQztZQUNELElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBQyxrQkFBa0IsRUFBQyxFQUFFO29CQUN4RSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRTt3QkFDckMscUVBQXFFO3dCQUNyRSxN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