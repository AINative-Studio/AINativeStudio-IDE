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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25Ob3RpZmljYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25SZWNvbW1lbmRhdGlvbk5vdGlmaWNhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsUUFBUSxFQUFFLHVCQUF1QixFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVKLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUMvRyxPQUFPLEVBQW1JLDRCQUE0QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDalEsT0FBTyxFQUF1QixvQkFBb0IsRUFBd0Msb0JB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