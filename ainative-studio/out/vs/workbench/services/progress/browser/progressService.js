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
import './media/progressService.css';
import { localize } from '../../../../nls.js';
import { dispose, DisposableStore, Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IProgressService, Progress } from '../../../../platform/progress/common/progress.js';
import { IStatusbarService } from '../../statusbar/browser/statusbar.js';
import { DeferredPromise, RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { ProgressBadge, IActivityService } from '../../activity/common/activity.js';
import { INotificationService, Severity, NotificationPriority, isNotificationSource, NotificationsFilter } from '../../../../platform/notification/common/notification.js';
import { Action } from '../../../../base/common/actions.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { Dialog } from '../../../../base/browser/ui/dialog/dialog.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../views/common/viewsService.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { IUserActivityService } from '../../userActivity/common/userActivityService.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
let ProgressService = class ProgressService extends Disposable {
    constructor(activityService, paneCompositeService, viewDescriptorService, viewsService, notificationService, statusbarService, layoutService, keybindingService, userActivityService) {
        super();
        this.activityService = activityService;
        this.paneCompositeService = paneCompositeService;
        this.viewDescriptorService = viewDescriptorService;
        this.viewsService = viewsService;
        this.notificationService = notificationService;
        this.statusbarService = statusbarService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.userActivityService = userActivityService;
        this.windowProgressStack = [];
        this.windowProgressStatusEntry = undefined;
    }
    async withProgress(options, originalTask, onDidCancel) {
        const { location } = options;
        const task = async (progress) => {
            const activeLock = this.userActivityService.markActive({ whenHeldFor: 15_000 });
            try {
                return await originalTask(progress);
            }
            finally {
                activeLock.dispose();
            }
        };
        const handleStringLocation = (location) => {
            const viewContainer = this.viewDescriptorService.getViewContainerById(location);
            if (viewContainer) {
                const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
                if (viewContainerLocation !== null) {
                    return this.withPaneCompositeProgress(location, viewContainerLocation, task, { ...options, location });
                }
            }
            if (this.viewDescriptorService.getViewDescriptorById(location) !== null) {
                return this.withViewProgress(location, task, { ...options, location });
            }
            throw new Error(`Bad progress location: ${location}`);
        };
        if (typeof location === 'string') {
            return handleStringLocation(location);
        }
        switch (location) {
            case 15 /* ProgressLocation.Notification */: {
                let priority = options.priority;
                if (priority !== NotificationPriority.URGENT) {
                    if (this.notificationService.getFilter() === NotificationsFilter.ERROR) {
                        priority = NotificationPriority.SILENT;
                    }
                    else if (isNotificationSource(options.source) && this.notificationService.getFilter(options.source) === NotificationsFilter.ERROR) {
                        priority = NotificationPriority.SILENT;
                    }
                }
                return this.withNotificationProgress({ ...options, location, priority }, task, onDidCancel);
            }
            case 10 /* ProgressLocation.Window */: {
                const type = options.type;
                if (options.command) {
                    // Window progress with command get's shown in the status bar
                    return this.withWindowProgress({ ...options, location, type }, task);
                }
                // Window progress without command can be shown as silent notification
                // which will first appear in the status bar and can then be brought to
                // the front when clicking.
                return this.withNotificationProgress({ delay: 150 /* default for ProgressLocation.Window */, ...options, priority: NotificationPriority.SILENT, location: 15 /* ProgressLocation.Notification */, type }, task, onDidCancel);
            }
            case 1 /* ProgressLocation.Explorer */:
                return this.withPaneCompositeProgress('workbench.view.explorer', 0 /* ViewContainerLocation.Sidebar */, task, { ...options, location });
            case 3 /* ProgressLocation.Scm */:
                return handleStringLocation('workbench.scm');
            case 5 /* ProgressLocation.Extensions */:
                return this.withPaneCompositeProgress('workbench.view.extensions', 0 /* ViewContainerLocation.Sidebar */, task, { ...options, location });
            case 20 /* ProgressLocation.Dialog */:
                return this.withDialogProgress(options, task, onDidCancel);
            default:
                throw new Error(`Bad progress location: ${location}`);
        }
    }
    withWindowProgress(options, callback) {
        const task = [options, new Progress(() => this.updateWindowProgress())];
        const promise = callback(task[1]);
        let delayHandle = setTimeout(() => {
            delayHandle = undefined;
            this.windowProgressStack.unshift(task);
            this.updateWindowProgress();
            // show progress for at least 150ms
            Promise.all([
                timeout(150),
                promise
            ]).finally(() => {
                const idx = this.windowProgressStack.indexOf(task);
                this.windowProgressStack.splice(idx, 1);
                this.updateWindowProgress();
            });
        }, 150);
        // cancel delay if promise finishes below 150ms
        return promise.finally(() => clearTimeout(delayHandle));
    }
    updateWindowProgress(idx = 0) {
        // We still have progress to show
        if (idx < this.windowProgressStack.length) {
            const [options, progress] = this.windowProgressStack[idx];
            const progressTitle = options.title;
            const progressMessage = progress.value && progress.value.message;
            const progressCommand = options.command;
            let text;
            let title;
            const source = options.source && typeof options.source !== 'string' ? options.source.label : options.source;
            if (progressTitle && progressMessage) {
                // <title>: <message>
                text = localize('progress.text2', "{0}: {1}", progressTitle, progressMessage);
                title = source ? localize('progress.title3', "[{0}] {1}: {2}", source, progressTitle, progressMessage) : text;
            }
            else if (progressTitle) {
                // <title>
                text = progressTitle;
                title = source ? localize('progress.title2', "[{0}]: {1}", source, progressTitle) : text;
            }
            else if (progressMessage) {
                // <message>
                text = progressMessage;
                title = source ? localize('progress.title2', "[{0}]: {1}", source, progressMessage) : text;
            }
            else {
                // no title, no message -> no progress. try with next on stack
                this.updateWindowProgress(idx + 1);
                return;
            }
            const statusEntryProperties = {
                name: localize('status.progress', "Progress Message"),
                text,
                showProgress: options.type || true,
                ariaLabel: text,
                tooltip: stripIcons(title).trim(),
                command: progressCommand
            };
            if (this.windowProgressStatusEntry) {
                this.windowProgressStatusEntry.update(statusEntryProperties);
            }
            else {
                this.windowProgressStatusEntry = this.statusbarService.addEntry(statusEntryProperties, 'status.progress', 0 /* StatusbarAlignment.LEFT */, -Number.MAX_VALUE /* almost last entry */);
            }
        }
        // Progress is done so we remove the status entry
        else {
            this.windowProgressStatusEntry?.dispose();
            this.windowProgressStatusEntry = undefined;
        }
    }
    withNotificationProgress(options, callback, onDidCancel) {
        const progressStateModel = new class extends Disposable {
            get step() { return this._step; }
            get done() { return this._done; }
            constructor() {
                super();
                this._onDidReport = this._register(new Emitter());
                this.onDidReport = this._onDidReport.event;
                this._onWillDispose = this._register(new Emitter());
                this.onWillDispose = this._onWillDispose.event;
                this._step = undefined;
                this._done = false;
                this.promise = callback(this);
                this.promise.finally(() => {
                    this.dispose();
                });
            }
            report(step) {
                this._step = step;
                this._onDidReport.fire(step);
            }
            cancel(choice) {
                onDidCancel?.(choice);
                this.dispose();
            }
            dispose() {
                this._done = true;
                this._onWillDispose.fire();
                super.dispose();
            }
        };
        const createWindowProgress = () => {
            // Create a promise that we can resolve as needed
            // when the outside calls dispose on us
            const promise = new DeferredPromise();
            this.withWindowProgress({
                location: 10 /* ProgressLocation.Window */,
                title: options.title ? parseLinkedText(options.title).toString() : undefined, // convert markdown links => string
                command: 'notifications.showList',
                type: options.type
            }, progress => {
                function reportProgress(step) {
                    if (step.message) {
                        progress.report({
                            message: parseLinkedText(step.message).toString() // convert markdown links => string
                        });
                    }
                }
                // Apply any progress that was made already
                if (progressStateModel.step) {
                    reportProgress(progressStateModel.step);
                }
                // Continue to report progress as it happens
                const onDidReportListener = progressStateModel.onDidReport(step => reportProgress(step));
                promise.p.finally(() => onDidReportListener.dispose());
                // When the progress model gets disposed, we are done as well
                Event.once(progressStateModel.onWillDispose)(() => promise.complete());
                return promise.p;
            });
            // Dispose means completing our promise
            return toDisposable(() => promise.complete());
        };
        const createNotification = (message, priority, increment) => {
            const notificationDisposables = new DisposableStore();
            const primaryActions = options.primaryActions ? Array.from(options.primaryActions) : [];
            const secondaryActions = options.secondaryActions ? Array.from(options.secondaryActions) : [];
            if (options.buttons) {
                options.buttons.forEach((button, index) => {
                    const buttonAction = new class extends Action {
                        constructor() {
                            super(`progress.button.${button}`, button, undefined, true);
                        }
                        async run() {
                            progressStateModel.cancel(index);
                        }
                    };
                    notificationDisposables.add(buttonAction);
                    primaryActions.push(buttonAction);
                });
            }
            if (options.cancellable) {
                const cancelAction = new class extends Action {
                    constructor() {
                        super('progress.cancel', typeof options.cancellable === 'string' ? options.cancellable : localize('cancel', "Cancel"), undefined, true);
                    }
                    async run() {
                        progressStateModel.cancel();
                    }
                };
                notificationDisposables.add(cancelAction);
                primaryActions.push(cancelAction);
            }
            const notification = this.notificationService.notify({
                severity: Severity.Info,
                message: stripIcons(message), // status entries support codicons, but notifications do not (https://github.com/microsoft/vscode/issues/145722)
                source: options.source,
                actions: { primary: primaryActions, secondary: secondaryActions },
                progress: typeof increment === 'number' && increment >= 0 ? { total: 100, worked: increment } : { infinite: true },
                priority
            });
            // Switch to window based progress once the notification
            // changes visibility to hidden and is still ongoing.
            // Remove that window based progress once the notification
            // shows again.
            let windowProgressDisposable = undefined;
            const onVisibilityChange = (visible) => {
                // Clear any previous running window progress
                dispose(windowProgressDisposable);
                // Create new window progress if notification got hidden
                if (!visible && !progressStateModel.done) {
                    windowProgressDisposable = createWindowProgress();
                }
            };
            notificationDisposables.add(notification.onDidChangeVisibility(onVisibilityChange));
            if (priority === NotificationPriority.SILENT) {
                onVisibilityChange(false);
            }
            // Clear upon dispose
            Event.once(notification.onDidClose)(() => {
                notificationDisposables.dispose();
                dispose(windowProgressDisposable);
            });
            return notification;
        };
        const updateProgress = (notification, increment) => {
            if (typeof increment === 'number' && increment >= 0) {
                notification.progress.total(100); // always percentage based
                notification.progress.worked(increment);
            }
            else {
                notification.progress.infinite();
            }
        };
        let notificationHandle;
        let notificationTimeout;
        let titleAndMessage; // hoisted to make sure a delayed notification shows the most recent message
        const updateNotification = (step) => {
            // full message (inital or update)
            if (step?.message && options.title) {
                titleAndMessage = `${options.title}: ${step.message}`; // always prefix with overall title if we have it (https://github.com/microsoft/vscode/issues/50932)
            }
            else {
                titleAndMessage = options.title || step?.message;
            }
            if (!notificationHandle && titleAndMessage) {
                // create notification now or after a delay
                if (typeof options.delay === 'number' && options.delay > 0) {
                    if (typeof notificationTimeout !== 'number') {
                        notificationTimeout = setTimeout(() => notificationHandle = createNotification(titleAndMessage, options.priority, step?.increment), options.delay);
                    }
                }
                else {
                    notificationHandle = createNotification(titleAndMessage, options.priority, step?.increment);
                }
            }
            if (notificationHandle) {
                if (titleAndMessage) {
                    notificationHandle.updateMessage(titleAndMessage);
                }
                if (typeof step?.increment === 'number') {
                    updateProgress(notificationHandle, step.increment);
                }
            }
        };
        // Show initially
        updateNotification(progressStateModel.step);
        const listener = progressStateModel.onDidReport(step => updateNotification(step));
        Event.once(progressStateModel.onWillDispose)(() => listener.dispose());
        // Clean up eventually
        (async () => {
            try {
                // with a delay we only wait for the finish of the promise
                if (typeof options.delay === 'number' && options.delay > 0) {
                    await progressStateModel.promise;
                }
                // without a delay we show the notification for at least 800ms
                // to reduce the chance of the notification flashing up and hiding
                else {
                    await Promise.all([timeout(800), progressStateModel.promise]);
                }
            }
            finally {
                clearTimeout(notificationTimeout);
                notificationHandle?.close();
            }
        })();
        return progressStateModel.promise;
    }
    withPaneCompositeProgress(paneCompositeId, viewContainerLocation, task, options) {
        // show in viewlet
        const progressIndicator = this.paneCompositeService.getProgressIndicator(paneCompositeId, viewContainerLocation);
        const promise = progressIndicator ? this.withCompositeProgress(progressIndicator, task, options) : task({ report: () => { } });
        // show on activity bar
        if (viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
            this.showOnActivityBar(paneCompositeId, options, promise);
        }
        return promise;
    }
    withViewProgress(viewId, task, options) {
        // show in viewlet
        const progressIndicator = this.viewsService.getViewProgressIndicator(viewId);
        const promise = progressIndicator ? this.withCompositeProgress(progressIndicator, task, options) : task({ report: () => { } });
        const viewletId = this.viewDescriptorService.getViewContainerByViewId(viewId)?.id;
        if (viewletId === undefined) {
            return promise;
        }
        // show on activity bar
        this.showOnActivityBar(viewletId, options, promise);
        return promise;
    }
    showOnActivityBar(viewletId, options, promise) {
        let activityProgress;
        let delayHandle = setTimeout(() => {
            delayHandle = undefined;
            const handle = this.activityService.showViewContainerActivity(viewletId, { badge: new ProgressBadge(() => '') });
            const startTimeVisible = Date.now();
            const minTimeVisible = 300;
            activityProgress = {
                dispose() {
                    const d = Date.now() - startTimeVisible;
                    if (d < minTimeVisible) {
                        // should at least show for Nms
                        setTimeout(() => handle.dispose(), minTimeVisible - d);
                    }
                    else {
                        // shown long enough
                        handle.dispose();
                    }
                }
            };
        }, options.delay || 300);
        promise.finally(() => {
            clearTimeout(delayHandle);
            dispose(activityProgress);
        });
    }
    withCompositeProgress(progressIndicator, task, options) {
        let discreteProgressRunner = undefined;
        function updateProgress(stepOrTotal) {
            // Figure out whether discrete progress applies
            // by figuring out the "total" progress to show
            // and the increment if any.
            let total = undefined;
            let increment = undefined;
            if (typeof stepOrTotal !== 'undefined') {
                if (typeof stepOrTotal === 'number') {
                    total = stepOrTotal;
                }
                else if (typeof stepOrTotal.increment === 'number') {
                    total = stepOrTotal.total ?? 100; // always percentage based
                    increment = stepOrTotal.increment;
                }
            }
            // Discrete
            if (typeof total === 'number') {
                if (!discreteProgressRunner) {
                    discreteProgressRunner = progressIndicator.show(total, options.delay);
                    promise.catch(() => undefined /* ignore */).finally(() => discreteProgressRunner?.done());
                }
                if (typeof increment === 'number') {
                    discreteProgressRunner.worked(increment);
                }
            }
            // Infinite
            else {
                discreteProgressRunner?.done();
                progressIndicator.showWhile(promise, options.delay);
            }
            return discreteProgressRunner;
        }
        const promise = task({
            report: progress => {
                updateProgress(progress);
            }
        });
        updateProgress(options.total);
        return promise;
    }
    withDialogProgress(options, task, onDidCancel) {
        const disposables = new DisposableStore();
        let dialog;
        let taskCompleted = false;
        const createDialog = (message) => {
            const buttons = options.buttons || [];
            if (!options.sticky) {
                buttons.push(options.cancellable
                    ? (typeof options.cancellable === 'boolean' ? localize('cancel', "Cancel") : options.cancellable)
                    : localize('dismiss', "Dismiss"));
            }
            dialog = new Dialog(this.layoutService.activeContainer, message, buttons, createWorkbenchDialogOptions({
                type: 'pending',
                detail: options.detail,
                cancelId: buttons.length - 1,
                disableCloseAction: options.sticky,
                disableDefaultAction: options.sticky
            }, this.keybindingService, this.layoutService));
            disposables.add(dialog);
            dialog.show().then(dialogResult => {
                if (!taskCompleted) {
                    onDidCancel?.(dialogResult.button);
                }
                dispose(dialog);
            });
            return dialog;
        };
        // In order to support the `delay` option, we use a scheduler
        // that will guard each access to the dialog behind a delay
        // that is either the original delay for one invocation and
        // otherwise runs without delay.
        let delay = options.delay ?? 0;
        let latestMessage = undefined;
        const scheduler = disposables.add(new RunOnceScheduler(() => {
            delay = 0; // since we have run once, we reset the delay
            if (latestMessage && !dialog) {
                dialog = createDialog(latestMessage);
            }
            else if (latestMessage) {
                dialog.updateMessage(latestMessage);
            }
        }, 0));
        const updateDialog = function (message) {
            latestMessage = message;
            // Make sure to only run one dialog update and not multiple
            if (!scheduler.isScheduled()) {
                scheduler.schedule(delay);
            }
        };
        const promise = task({
            report: progress => {
                updateDialog(progress.message);
            }
        });
        promise.finally(() => {
            taskCompleted = true;
            dispose(disposables);
        });
        if (options.title) {
            updateDialog(options.title);
        }
        return promise;
    }
};
ProgressService = __decorate([
    __param(0, IActivityService),
    __param(1, IPaneCompositePartService),
    __param(2, IViewDescriptorService),
    __param(3, IViewsService),
    __param(4, INotificationService),
    __param(5, IStatusbarService),
    __param(6, ILayoutService),
    __param(7, IKeybindingService),
    __param(8, IUserActivityService)
], ProgressService);
export { ProgressService };
registerSingleton(IProgressService, ProgressService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcm9ncmVzcy9icm93c2VyL3Byb2dyZXNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQWUsT0FBTyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkgsT0FBTyxFQUFFLGdCQUFnQixFQUFnRSxRQUFRLEVBQWdKLE1BQU0sa0RBQWtELENBQUM7QUFDMVMsT0FBTyxFQUFzQixpQkFBaUIsRUFBNEMsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2SSxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUF1QixvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hNLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLE1BQU0s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