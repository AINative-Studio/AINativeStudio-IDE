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
import { distinct } from '../../../../base/common/arrays.js';
import { createCancelablePromise, Promises, raceCancellablePromises, raceCancellation, timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RecommendationSourceToString } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkbenchExtensionManagementService, IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
const ignoreImportantExtensionRecommendationStorageKey = 'extensionsAssistant/importantRecommendationsIgnore';
const donotShowWorkspaceRecommendationsStorageKey = 'extensionsAssistant/workspaceRecommendationsIgnore';
class RecommendationsNotification extends Disposable {
    constructor(severity, message, choices, notificationService) {
        super();
        this.severity = severity;
        this.message = message;
        this.choices = choices;
        this.notificationService = notificationService;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.cancelled = false;
        this.onDidCloseDisposable = this._register(new MutableDisposable());
        this.onDidChangeVisibilityDisposable = this._register(new MutableDisposable());
    }
    show() {
        if (!this.notificationHandle) {
            this.updateNotificationHandle(this.notificationService.prompt(this.severity, this.message, this.choices, { sticky: true, onCancel: () => this.cancelled = true }));
        }
    }
    hide() {
        if (this.notificationHandle) {
            this.onDidCloseDisposable.clear();
            this.notificationHandle.close();
            this.cancelled = false;
            this.updateNotificationHandle(this.notificationService.prompt(this.severity, this.message, this.choices, { priority: NotificationPriority.SILENT, onCancel: () => this.cancelled = true }));
        }
    }
    isCancelled() {
        return this.cancelled;
    }
    updateNotificationHandle(notificationHandle) {
        this.onDidCloseDisposable.clear();
        this.onDidChangeVisibilityDisposable.clear();
        this.notificationHandle = notificationHandle;
        this.onDidCloseDisposable.value = this.notificationHandle.onDidClose(() => {
            this.onDidCloseDisposable.dispose();
            this.onDidChangeVisibilityDisposable.dispose();
            this._onDidClose.fire();
            this._onDidClose.dispose();
            this._onDidChangeVisibility.dispose();
        });
        this.onDidChangeVisibilityDisposable.value = this.notificationHandle.onDidChangeVisibility((e) => this._onDidChangeVisibility.fire(e));
    }
}
let ExtensionRecommendationNotificationService = class ExtensionRecommendationNotificationService extends Disposable {
    // Ignored Important Recommendations
    get ignoredRecommendations() {
        return distinct([...JSON.parse(this.storageService.get(ignoreImportantExtensionRecommendationStorageKey, 0 /* StorageScope.PROFILE */, '[]'))].map(i => i.toLowerCase()));
    }
    constructor(configurationService, storageService, notificationService, telemetryService, extensionsWorkbenchService, extensionManagementService, extensionEnablementService, extensionIgnoredRecommendationsService, userDataSyncEnablementService, workbenchEnvironmentService, uriIdentityService) {
        super();
        this.configurationService = configurationService;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionIgnoredRecommendationsService = extensionIgnoredRecommendationsService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.workbenchEnvironmentService = workbenchEnvironmentService;
        this.uriIdentityService = uriIdentityService;
        this.recommendedExtensions = [];
        this.recommendationSources = [];
        this.pendingNotificaitons = [];
    }
    hasToIgnoreRecommendationNotifications() {
        const config = this.configurationService.getValue('extensions');
        return config.ignoreRecommendations || !!config.showRecommendationsOnlyOnDemand;
    }
    async promptImportantExtensionsInstallNotification(extensionRecommendations) {
        const ignoredRecommendations = [...this.extensionIgnoredRecommendationsService.ignoredRecommendations, ...this.ignoredRecommendations];
        const extensions = extensionRecommendations.extensions.filter(id => !ignoredRecommendations.includes(id));
        if (!extensions.length) {
            return "ignored" /* RecommendationsNotificationResult.Ignored */;
        }
        return this.promptRecommendationsNotification({ ...extensionRecommendations, extensions }, {
            onDidInstallRecommendedExtensions: (extensions) => extensions.forEach(extension => this.telemetryService.publicLog2('extensionRecommendations:popup', { userReaction: 'install', extensionId: extension.identifier.id, source: RecommendationSourceToString(extensionRecommendations.source) })),
            onDidShowRecommendedExtensions: (extensions) => extensions.forEach(extension => this.telemetryService.publicLog2('extensionRecommendations:popup', { userReaction: 'show', extensionId: extension.identifier.id, source: RecommendationSourceToString(extensionRecommendations.source) })),
            onDidCancelRecommendedExtensions: (extensions) => extensions.forEach(extension => this.telemetryService.publicLog2('extensionRecommendations:popup', { userReaction: 'cancelled', extensionId: extension.identifier.id, source: RecommendationSourceToString(extensionRecommendations.source) })),
            onDidNeverShowRecommendedExtensionsAgain: (extensions) => {
                for (const extension of extensions) {
                    this.addToImportantRecommendationsIgnore(extension.identifier.id);
                    this.telemetryService.publicLog2('extensionRecommendations:popup', { userReaction: 'neverShowAgain', extensionId: extension.identifier.id, source: RecommendationSourceToString(extensionRecommendations.source) });
                }
                this.notificationService.prompt(Severity.Info, localize('ignoreExtensionRecommendations', "Do you want to ignore all extension recommendations?"), [{
                        label: localize('ignoreAll', "Yes, Ignore All"),
                        run: () => this.setIgnoreRecommendationsConfig(true)
                    }, {
                        label: localize('no', "No"),
                        run: () => this.setIgnoreRecommendationsConfig(false)
                    }]);
            },
        });
    }
    async promptWorkspaceRecommendations(recommendations) {
        if (this.storageService.getBoolean(donotShowWorkspaceRecommendationsStorageKey, 1 /* StorageScope.WORKSPACE */, false)) {
            return;
        }
        let installed = await this.extensionManagementService.getInstalled();
        installed = installed.filter(l => this.extensionEnablementService.getEnablementState(l) !== 1 /* EnablementState.DisabledByExtensionKind */); // Filter extensions disabled by kind
        recommendations = recommendations.filter(recommendation => installed.every(local => isString(recommendation) ? !areSameExtensions({ id: recommendation }, local.identifier) : !this.uriIdentityService.extUri.isEqual(recommendation, local.location)));
        if (!recommendations.length) {
            return;
        }
        await this.promptRecommendationsNotification({ extensions: recommendations, source: 2 /* RecommendationSource.WORKSPACE */, name: localize({ key: 'this repository', comment: ['this repository means the current repository that is opened'] }, "this repository") }, {
            onDidInstallRecommendedExtensions: () => this.telemetryService.publicLog2('extensionWorkspaceRecommendations:popup', { userReaction: 'install' }),
            onDidShowRecommendedExtensions: () => this.telemetryService.publicLog2('extensionWorkspaceRecommendations:popup', { userReaction: 'show' }),
            onDidCancelRecommendedExtensions: () => this.telemetryService.publicLog2('extensionWorkspaceRecommendations:popup', { userReaction: 'cancelled' }),
            onDidNeverShowRecommendedExtensionsAgain: () => {
                this.telemetryService.publicLog2('extensionWorkspaceRecommendations:popup', { userReaction: 'neverShowAgain' });
                this.storageService.store(donotShowWorkspaceRecommendationsStorageKey, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            },
        });
    }
    async promptRecommendationsNotification({ extensions: extensionIds, source, name, searchValue }, recommendationsNotificationActions) {
        if (this.hasToIgnoreRecommendationNotifications()) {
            return "ignored" /* RecommendationsNotificationResult.Ignored */;
        }
        // Do not show exe based recommendations in remote window
        if (source === 3 /* RecommendationSource.EXE */ && this.workbenchEnvironmentService.remoteAuthority) {
            return "incompatibleWindow" /* RecommendationsNotificationResult.IncompatibleWindow */;
        }
        // Ignore exe recommendation if the window
        // 		=> has shown an exe based recommendation already
        // 		=> or has shown any two recommendations already
        if (source === 3 /* RecommendationSource.EXE */ && (this.recommendationSources.includes(3 /* RecommendationSource.EXE */) || this.recommendationSources.length >= 2)) {
            return "toomany" /* RecommendationsNotificationResult.TooMany */;
        }
        this.recommendationSources.push(source);
        // Ignore exe recommendation if recommendations are already shown
        if (source === 3 /* RecommendationSource.EXE */ && extensionIds.every(id => isString(id) && this.recommendedExtensions.includes(id))) {
            return "ignored" /* RecommendationsNotificationResult.Ignored */;
        }
        const extensions = await this.getInstallableExtensions(extensionIds);
        if (!extensions.length) {
            return "ignored" /* RecommendationsNotificationResult.Ignored */;
        }
        this.recommendedExtensions = distinct([...this.recommendedExtensions, ...extensionIds.filter(isString)]);
        let extensionsMessage = '';
        if (extensions.length === 1) {
            extensionsMessage = localize('extensionFromPublisher', "'{0}' extension from {1}", extensions[0].displayName, extensions[0].publisherDisplayName);
        }
        else {
            const publishers = [...extensions.reduce((result, extension) => result.add(extension.publisherDisplayName), new Set())];
            if (publishers.length > 2) {
                extensionsMessage = localize('extensionsFromMultiplePublishers', "extensions from {0}, {1} and others", publishers[0], publishers[1]);
            }
            else if (publishers.length === 2) {
                extensionsMessage = localize('extensionsFromPublishers', "extensions from {0} and {1}", publishers[0], publishers[1]);
            }
            else {
                extensionsMessage = localize('extensionsFromPublisher', "extensions from {0}", publishers[0]);
            }
        }
        let message = localize('recommended', "Do you want to install the recommended {0} for {1}?", extensionsMessage, name);
        if (source === 3 /* RecommendationSource.EXE */) {
            message = localize({ key: 'exeRecommended', comment: ['Placeholder string is the name of the software that is installed.'] }, "You have {0} installed on your system. Do you want to install the recommended {1} for it?", name, extensionsMessage);
        }
        if (!searchValue) {
            searchValue = source === 2 /* RecommendationSource.WORKSPACE */ ? '@recommended' : extensions.map(extensionId => `@id:${extensionId.identifier.id}`).join(' ');
        }
        const donotShowAgainLabel = source === 2 /* RecommendationSource.WORKSPACE */ ? localize('donotShowAgain', "Don't Show Again for this Repository")
            : extensions.length > 1 ? localize('donotShowAgainExtension', "Don't Show Again for these Extensions") : localize('donotShowAgainExtensionSingle', "Don't Show Again for this Extension");
        return raceCancellablePromises([
            this._registerP(this.showRecommendationsNotification(extensions, message, searchValue, donotShowAgainLabel, source, recommendationsNotificationActions)),
            this._registerP(this.waitUntilRecommendationsAreInstalled(extensions))
        ]);
    }
    showRecommendationsNotification(extensions, message, searchValue, donotShowAgainLabel, source, { onDidInstallRecommendedExtensions, onDidShowRecommendedExtensions, onDidCancelRecommendedExtensions, onDidNeverShowRecommendedExtensionsAgain }) {
        return createCancelablePromise(async (token) => {
            let accepted = false;
            const choices = [];
            const installExtensions = async (isMachineScoped) => {
                this.extensionsWorkbenchService.openSearch(searchValue);
                onDidInstallRecommendedExtensions(extensions);
                const galleryExtensions = [], resourceExtensions = [];
                for (const extension of extensions) {
                    if (extension.gallery) {
                        galleryExtensions.push(extension.gallery);
                    }
                    else if (extension.resourceExtension) {
                        resourceExtensions.push(extension);
                    }
                }
                await Promises.settled([
                    Promises.settled(extensions.map(extension => this.extensionsWorkbenchService.open(extension, { pinned: true }))),
                    galleryExtensions.length ? this.extensionManagementService.installGalleryExtensions(galleryExtensions.map(e => ({ extension: e, options: { isMachineScoped } }))) : Promise.resolve(),
                    resourceExtensions.length ? Promise.allSettled(resourceExtensions.map(r => this.extensionsWorkbenchService.install(r))) : Promise.resolve()
                ]);
            };
            choices.push({
                label: localize('install', "Install"),
                run: () => installExtensions(false),
                menu: this.userDataSyncEnablementService.isEnabled() && this.userDataSyncEnablementService.isResourceEnabled("extensions" /* SyncResource.Extensions */) ? [{
                        label: localize('install and do no sync', "Install (Do not sync)"),
                        run: () => installExtensions(true)
                    }] : undefined,
            });
            choices.push(...[{
                    label: localize('show recommendations', "Show Recommendations"),
                    run: async () => {
                        onDidShowRecommendedExtensions(extensions);
                        for (const extension of extensions) {
                            this.extensionsWorkbenchService.open(extension, { pinned: true });
                        }
                        this.extensionsWorkbenchService.openSearch(searchValue);
                    }
                }, {
                    label: donotShowAgainLabel,
                    isSecondary: true,
                    run: () => {
                        onDidNeverShowRecommendedExtensionsAgain(extensions);
                    }
                }]);
            try {
                accepted = await this.doShowRecommendationsNotification(Severity.Info, message, choices, source, token);
            }
            catch (error) {
                if (!isCancellationError(error)) {
                    throw error;
                }
            }
            if (accepted) {
                return "reacted" /* RecommendationsNotificationResult.Accepted */;
            }
            else {
                onDidCancelRecommendedExtensions(extensions);
                return "cancelled" /* RecommendationsNotificationResult.Cancelled */;
            }
        });
    }
    waitUntilRecommendationsAreInstalled(extensions) {
        const installedExtensions = [];
        const disposables = new DisposableStore();
        return createCancelablePromise(async (token) => {
            disposables.add(token.onCancellationRequested(e => disposables.dispose()));
            return new Promise((c, e) => {
                disposables.add(this.extensionManagementService.onInstallExtension(e => {
                    installedExtensions.push(e.identifier.id.toLowerCase());
                    if (extensions.every(e => installedExtensions.includes(e.identifier.id.toLowerCase()))) {
                        c("reacted" /* RecommendationsNotificationResult.Accepted */);
                    }
                }));
            });
        });
    }
    /**
     * Show recommendations in Queue
     * At any time only one recommendation is shown
     * If a new recommendation comes in
     * 		=> If no recommendation is visible, show it immediately
     *		=> Otherwise, add to the pending queue
     * 			=> If it is not exe based and has higher or same priority as current, hide the current notification after showing it for 3s.
     * 			=> Otherwise wait until the current notification is hidden.
     */
    async doShowRecommendationsNotification(severity, message, choices, source, token) {
        const disposables = new DisposableStore();
        try {
            const recommendationsNotification = disposables.add(new RecommendationsNotification(severity, message, choices, this.notificationService));
            disposables.add(Event.once(Event.filter(recommendationsNotification.onDidChangeVisibility, e => !e))(() => this.showNextNotification()));
            if (this.visibleNotification) {
                const index = this.pendingNotificaitons.length;
                disposables.add(token.onCancellationRequested(() => this.pendingNotificaitons.splice(index, 1)));
                this.pendingNotificaitons.push({ recommendationsNotification, source, token });
                if (source !== 3 /* RecommendationSource.EXE */ && source <= this.visibleNotification.source) {
                    this.hideVisibleNotification(3000);
                }
            }
            else {
                this.visibleNotification = { recommendationsNotification, source, from: Date.now() };
                recommendationsNotification.show();
            }
            await raceCancellation(new Promise(c => disposables.add(Event.once(recommendationsNotification.onDidClose)(c))), token);
            return !recommendationsNotification.isCancelled();
        }
        finally {
            disposables.dispose();
        }
    }
    showNextNotification() {
        const index = this.getNextPendingNotificationIndex();
        const [nextNotificaiton] = index > -1 ? this.pendingNotificaitons.splice(index, 1) : [];
        // Show the next notification after a delay of 500ms (after the current notification is dismissed)
        timeout(nextNotificaiton ? 500 : 0)
            .then(() => {
            this.unsetVisibileNotification();
            if (nextNotificaiton) {
                this.visibleNotification = { recommendationsNotification: nextNotificaiton.recommendationsNotification, source: nextNotificaiton.source, from: Date.now() };
                nextNotificaiton.recommendationsNotification.show();
            }
        });
    }
    /**
     * Return the recent high priroity pending notification
     */
    getNextPendingNotificationIndex() {
        let index = this.pendingNotificaitons.length - 1;
        if (this.pendingNotificaitons.length) {
            for (let i = 0; i < this.pendingNotificaitons.length; i++) {
                if (this.pendingNotificaitons[i].source <= this.pendingNotificaitons[index].source) {
                    index = i;
                }
            }
        }
        return index;
    }
    hideVisibleNotification(timeInMillis) {
        if (this.visibleNotification && !this.hideVisibleNotificationPromise) {
            const visibleNotification = this.visibleNotification;
            this.hideVisibleNotificationPromise = timeout(Math.max(timeInMillis - (Date.now() - visibleNotification.from), 0));
            this.hideVisibleNotificationPromise.then(() => visibleNotification.recommendationsNotification.hide());
        }
    }
    unsetVisibileNotification() {
        this.hideVisibleNotificationPromise?.cancel();
        this.hideVisibleNotificationPromise = undefined;
        this.visibleNotification = undefined;
    }
    async getInstallableExtensions(recommendations) {
        const result = [];
        if (recommendations.length) {
            const galleryExtensions = [];
            const resourceExtensions = [];
            for (const recommendation of recommendations) {
                if (typeof recommendation === 'string') {
                    galleryExtensions.push(recommendation);
                }
                else {
                    resourceExtensions.push(recommendation);
                }
            }
            if (galleryExtensions.length) {
                const extensions = await this.extensionsWorkbenchService.getExtensions(galleryExtensions.map(id => ({ id })), { source: 'install-recommendations' }, CancellationToken.None);
                for (const extension of extensions) {
                    if (extension.gallery && await this.extensionManagementService.canInstall(extension.gallery) === true) {
                        result.push(extension);
                    }
                }
            }
            if (resourceExtensions.length) {
                const extensions = await this.extensionsWorkbenchService.getResourceExtensions(resourceExtensions, true);
                for (const extension of extensions) {
                    if (await this.extensionsWorkbenchService.canInstall(extension) === true) {
                        result.push(extension);
                    }
                }
            }
        }
        return result;
    }
    addToImportantRecommendationsIgnore(id) {
        const importantRecommendationsIgnoreList = [...this.ignoredRecommendations];
        if (!importantRecommendationsIgnoreList.includes(id.toLowerCase())) {
            importantRecommendationsIgnoreList.push(id.toLowerCase());
            this.storageService.store(ignoreImportantExtensionRecommendationStorageKey, JSON.stringify(importantRecommendationsIgnoreList), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
    setIgnoreRecommendationsConfig(configVal) {
        this.configurationService.updateValue('extensions.ignoreRecommendations', configVal);
    }
    _registerP(o) {
        this._register(toDisposable(() => o.cancel()));
        return o;
    }
};
ExtensionRecommendationNotificationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IStorageService),
    __param(2, INotificationService),
    __param(3, ITelemetryService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IWorkbenchExtensionManagementService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, IExtensionIgnoredRecommendationsService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IUriIdentityService)
], ExtensionRecommendationNotificationService);
export { ExtensionRecommendationNotificationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25Ob3RpZmljYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvblJlY29tbWVuZGF0aW9uTm90aWZpY2F0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxRQUFRLEVBQUUsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUosT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQy9HLE9BQU8sRUFBbUksNEJBQTRCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUNqUSxPQUFPLEVBQXVCLG9CQUFvQixFQUF3QyxvQkFB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