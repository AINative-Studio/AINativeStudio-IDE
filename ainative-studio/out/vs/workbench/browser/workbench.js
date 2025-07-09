/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './style.js';
import { runWhenWindowIdle } from '../../base/browser/dom.js';
import { Event, Emitter, setGlobalLeakWarningThreshold } from '../../base/common/event.js';
import { RunOnceScheduler, timeout } from '../../base/common/async.js';
import { isFirefox, isSafari, isChrome } from '../../base/browser/browser.js';
import { mark } from '../../base/common/performance.js';
import { onUnexpectedError, setUnexpectedErrorHandler } from '../../base/common/errors.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { isWindows, isLinux, isWeb, isNative, isMacintosh } from '../../base/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../common/contributions.js';
import { EditorExtensions } from '../common/editor.js';
import { getSingletonServiceDescriptors } from '../../platform/instantiation/common/extensions.js';
import { IWorkbenchLayoutService, positionToString } from '../services/layout/browser/layoutService.js';
import { IStorageService, WillSaveStateReason } from '../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { INotificationService } from '../../platform/notification/common/notification.js';
import { NotificationsCenter } from './parts/notifications/notificationsCenter.js';
import { NotificationsAlerts } from './parts/notifications/notificationsAlerts.js';
import { NotificationsStatus } from './parts/notifications/notificationsStatus.js';
import { registerNotificationCommands } from './parts/notifications/notificationsCommands.js';
import { NotificationsToasts } from './parts/notifications/notificationsToasts.js';
import { setARIAContainer } from '../../base/browser/ui/aria/aria.js';
import { FontMeasurements } from '../../editor/browser/config/fontMeasurements.js';
import { BareFontInfo } from '../../editor/common/config/fontInfo.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { WorkbenchContextKeysHandler } from './contextkeys.js';
import { coalesce } from '../../base/common/arrays.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { Layout } from './layout.js';
import { IHostService } from '../services/host/browser/host.js';
import { IDialogService } from '../../platform/dialogs/common/dialogs.js';
import { mainWindow } from '../../base/browser/window.js';
import { PixelRatio } from '../../base/browser/pixelRatio.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../platform/hover/browser/hover.js';
import { setHoverDelegateFactory } from '../../base/browser/ui/hover/hoverDelegateFactory.js';
import { setBaseLayerHoverDelegate } from '../../base/browser/ui/hover/hoverDelegate2.js';
import { AccessibilityProgressSignalScheduler } from '../../platform/accessibilitySignal/browser/progressAccessibilitySignalScheduler.js';
import { setProgressAcccessibilitySignalScheduler } from '../../base/browser/ui/progressbar/progressAccessibilitySignal.js';
import { AccessibleViewRegistry } from '../../platform/accessibility/browser/accessibleViewRegistry.js';
import { NotificationAccessibleView } from './parts/notifications/notificationAccessibleView.js';
export class Workbench extends Layout {
    constructor(parent, options, serviceCollection, logService) {
        super(parent);
        this.options = options;
        this.serviceCollection = serviceCollection;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._onDidShutdown = this._register(new Emitter());
        this.onDidShutdown = this._onDidShutdown.event;
        this.previousUnexpectedError = { message: undefined, time: 0 };
        // Perf: measure workbench startup time
        mark('code/willStartWorkbench');
        this.registerErrorHandler(logService);
    }
    registerErrorHandler(logService) {
        // Listen on unhandled rejection events
        // Note: intentionally not registered as disposable to handle
        //       errors that can occur during shutdown phase.
        mainWindow.addEventListener('unhandledrejection', (event) => {
            // See https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent
            onUnexpectedError(event.reason);
            // Prevent the printing of this event to the console
            event.preventDefault();
        });
        // Install handler for unexpected errors
        setUnexpectedErrorHandler(error => this.handleUnexpectedError(error, logService));
    }
    handleUnexpectedError(error, logService) {
        const message = toErrorMessage(error, true);
        if (!message) {
            return;
        }
        const now = Date.now();
        if (message === this.previousUnexpectedError.message && now - this.previousUnexpectedError.time <= 1000) {
            return; // Return if error message identical to previous and shorter than 1 second
        }
        this.previousUnexpectedError.time = now;
        this.previousUnexpectedError.message = message;
        // Log it
        logService.error(message);
    }
    startup() {
        try {
            // Configure emitter leak warning threshold
            this._register(setGlobalLeakWarningThreshold(175));
            // Services
            const instantiationService = this.initServices(this.serviceCollection);
            instantiationService.invokeFunction(accessor => {
                const lifecycleService = accessor.get(ILifecycleService);
                const storageService = accessor.get(IStorageService);
                const configurationService = accessor.get(IConfigurationService);
                const hostService = accessor.get(IHostService);
                const hoverService = accessor.get(IHoverService);
                const dialogService = accessor.get(IDialogService);
                const notificationService = accessor.get(INotificationService);
                // Default Hover Delegate must be registered before creating any workbench/layout components
                // as these possibly will use the default hover delegate
                setHoverDelegateFactory((placement, enableInstantHover) => instantiationService.createInstance(WorkbenchHoverDelegate, placement, { instantHover: enableInstantHover }, {}));
                setBaseLayerHoverDelegate(hoverService);
                // Layout
                this.initLayout(accessor);
                // Registries
                Registry.as(WorkbenchExtensions.Workbench).start(accessor);
                Registry.as(EditorExtensions.EditorFactory).start(accessor);
                // Context Keys
                this._register(instantiationService.createInstance(WorkbenchContextKeysHandler));
                // Register Listeners
                this.registerListeners(lifecycleService, storageService, configurationService, hostService, dialogService);
                // Render Workbench
                this.renderWorkbench(instantiationService, notificationService, storageService, configurationService);
                // Workbench Layout
                this.createWorkbenchLayout();
                // Layout
                this.layout();
                // Restore
                this.restore(lifecycleService);
            });
            return instantiationService;
        }
        catch (error) {
            onUnexpectedError(error);
            throw error; // rethrow because this is a critical issue we cannot handle properly here
        }
    }
    initServices(serviceCollection) {
        // Layout Service
        serviceCollection.set(IWorkbenchLayoutService, this);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.desktop.main.ts` if the service
        //       is desktop only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // All Contributed Services
        const contributedServices = getSingletonServiceDescriptors();
        for (const [id, descriptor] of contributedServices) {
            serviceCollection.set(id, descriptor);
        }
        const instantiationService = new InstantiationService(serviceCollection, true);
        // Wrap up
        instantiationService.invokeFunction(accessor => {
            const lifecycleService = accessor.get(ILifecycleService);
            // TODO@Sandeep debt around cyclic dependencies
            const configurationService = accessor.get(IConfigurationService);
            if (typeof configurationService.acquireInstantiationService === 'function') {
                configurationService.acquireInstantiationService(instantiationService);
            }
            // Signal to lifecycle that services are set
            lifecycleService.phase = 2 /* LifecyclePhase.Ready */;
        });
        return instantiationService;
    }
    registerListeners(lifecycleService, storageService, configurationService, hostService, dialogService) {
        // Configuration changes
        this._register(configurationService.onDidChangeConfiguration(e => this.updateFontAliasing(e, configurationService)));
        // Font Info
        if (isNative) {
            this._register(storageService.onWillSaveState(e => {
                if (e.reason === WillSaveStateReason.SHUTDOWN) {
                    this.storeFontInfo(storageService);
                }
            }));
        }
        else {
            this._register(lifecycleService.onWillShutdown(() => this.storeFontInfo(storageService)));
        }
        // Lifecycle
        this._register(lifecycleService.onWillShutdown(event => this._onWillShutdown.fire(event)));
        this._register(lifecycleService.onDidShutdown(() => {
            this._onDidShutdown.fire();
            this.dispose();
        }));
        // In some environments we do not get enough time to persist state on shutdown.
        // In other cases, VSCode might crash, so we periodically save state to reduce
        // the chance of loosing any state.
        // The window loosing focus is a good indication that the user has stopped working
        // in that window so we pick that at a time to collect state.
        this._register(hostService.onDidChangeFocus(focus => {
            if (!focus) {
                storageService.flush();
            }
        }));
        // Dialogs showing/hiding
        this._register(dialogService.onWillShowDialog(() => this.mainContainer.classList.add('modal-dialog-visible')));
        this._register(dialogService.onDidShowDialog(() => this.mainContainer.classList.remove('modal-dialog-visible')));
    }
    updateFontAliasing(e, configurationService) {
        if (!isMacintosh) {
            return; // macOS only
        }
        if (e && !e.affectsConfiguration('workbench.fontAliasing')) {
            return;
        }
        const aliasing = configurationService.getValue('workbench.fontAliasing');
        if (this.fontAliasing === aliasing) {
            return;
        }
        this.fontAliasing = aliasing;
        // Remove all
        const fontAliasingValues = ['antialiased', 'none', 'auto'];
        this.mainContainer.classList.remove(...fontAliasingValues.map(value => `monaco-font-aliasing-${value}`));
        // Add specific
        if (fontAliasingValues.some(option => option === aliasing)) {
            this.mainContainer.classList.add(`monaco-font-aliasing-${aliasing}`);
        }
    }
    restoreFontInfo(storageService, configurationService) {
        const storedFontInfoRaw = storageService.get('editorFontInfo', -1 /* StorageScope.APPLICATION */);
        if (storedFontInfoRaw) {
            try {
                const storedFontInfo = JSON.parse(storedFontInfoRaw);
                if (Array.isArray(storedFontInfo)) {
                    FontMeasurements.restoreFontInfo(mainWindow, storedFontInfo);
                }
            }
            catch (err) {
                /* ignore */
            }
        }
        FontMeasurements.readFontInfo(mainWindow, BareFontInfo.createFromRawSettings(configurationService.getValue('editor'), PixelRatio.getInstance(mainWindow).value));
    }
    storeFontInfo(storageService) {
        const serializedFontInfo = FontMeasurements.serializeFontInfo(mainWindow);
        if (serializedFontInfo) {
            storageService.store('editorFontInfo', JSON.stringify(serializedFontInfo), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
    }
    renderWorkbench(instantiationService, notificationService, storageService, configurationService) {
        // ARIA & Signals
        setARIAContainer(this.mainContainer);
        setProgressAcccessibilitySignalScheduler((msDelayTime, msLoopTime) => instantiationService.createInstance(AccessibilityProgressSignalScheduler, msDelayTime, msLoopTime));
        // State specific classes
        const platformClass = isWindows ? 'windows' : isLinux ? 'linux' : 'mac';
        const workbenchClasses = coalesce([
            'monaco-workbench',
            platformClass,
            isWeb ? 'web' : undefined,
            isChrome ? 'chromium' : isFirefox ? 'firefox' : isSafari ? 'safari' : undefined,
            ...this.getLayoutClasses(),
            ...(this.options?.extraClasses ? this.options.extraClasses : [])
        ]);
        this.mainContainer.classList.add(...workbenchClasses);
        // Apply font aliasing
        this.updateFontAliasing(undefined, configurationService);
        // Warm up font cache information before building up too many dom elements
        this.restoreFontInfo(storageService, configurationService);
        // Create Parts
        for (const { id, role, classes, options } of [
            { id: "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, role: 'none', classes: ['titlebar'] },
            { id: "workbench.parts.banner" /* Parts.BANNER_PART */, role: 'banner', classes: ['banner'] },
            { id: "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */, role: 'none', classes: ['activitybar', this.getSideBarPosition() === 0 /* Position.LEFT */ ? 'left' : 'right'] }, // Use role 'none' for some parts to make screen readers less chatty #114892
            { id: "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, role: 'none', classes: ['sidebar', this.getSideBarPosition() === 0 /* Position.LEFT */ ? 'left' : 'right'] },
            { id: "workbench.parts.editor" /* Parts.EDITOR_PART */, role: 'main', classes: ['editor'], options: { restorePreviousState: this.willRestoreEditors() } },
            { id: "workbench.parts.panel" /* Parts.PANEL_PART */, role: 'none', classes: ['panel', 'basepanel', positionToString(this.getPanelPosition())] },
            { id: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, role: 'none', classes: ['auxiliarybar', 'basepanel', this.getSideBarPosition() === 0 /* Position.LEFT */ ? 'right' : 'left'] },
            { id: "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, role: 'status', classes: ['statusbar'] }
        ]) {
            const partContainer = this.createPart(id, role, classes);
            mark(`code/willCreatePart/${id}`);
            this.getPart(id).create(partContainer, options);
            mark(`code/didCreatePart/${id}`);
        }
        // Notification Handlers
        this.createNotificationsHandlers(instantiationService, notificationService);
        // Add Workbench to DOM
        this.parent.appendChild(this.mainContainer);
    }
    createPart(id, role, classes) {
        const part = document.createElement(role === 'status' ? 'footer' /* Use footer element for status bar #98376 */ : 'div');
        part.classList.add('part', ...classes);
        part.id = id;
        part.setAttribute('role', role);
        if (role === 'status') {
            part.setAttribute('aria-live', 'off');
        }
        return part;
    }
    createNotificationsHandlers(instantiationService, notificationService) {
        // Instantiate Notification components
        const notificationsCenter = this._register(instantiationService.createInstance(NotificationsCenter, this.mainContainer, notificationService.model));
        const notificationsToasts = this._register(instantiationService.createInstance(NotificationsToasts, this.mainContainer, notificationService.model));
        this._register(instantiationService.createInstance(NotificationsAlerts, notificationService.model));
        const notificationsStatus = instantiationService.createInstance(NotificationsStatus, notificationService.model);
        // Visibility
        this._register(notificationsCenter.onDidChangeVisibility(() => {
            notificationsStatus.update(notificationsCenter.isVisible, notificationsToasts.isVisible);
            notificationsToasts.update(notificationsCenter.isVisible);
        }));
        this._register(notificationsToasts.onDidChangeVisibility(() => {
            notificationsStatus.update(notificationsCenter.isVisible, notificationsToasts.isVisible);
        }));
        // Register Commands
        registerNotificationCommands(notificationsCenter, notificationsToasts, notificationService.model);
        // Register notification accessible view
        AccessibleViewRegistry.register(new NotificationAccessibleView());
        // Register with Layout
        this.registerNotifications({
            onDidChangeNotificationsVisibility: Event.map(Event.any(notificationsToasts.onDidChangeVisibility, notificationsCenter.onDidChangeVisibility), () => notificationsToasts.isVisible || notificationsCenter.isVisible)
        });
    }
    restore(lifecycleService) {
        // Ask each part to restore
        try {
            this.restoreParts();
        }
        catch (error) {
            onUnexpectedError(error);
        }
        // Transition into restored phase after layout has restored
        // but do not wait indefinitely on this to account for slow
        // editors restoring. Since the workbench is fully functional
        // even when the visible editors have not resolved, we still
        // want contributions on the `Restored` phase to work before
        // slow editors have resolved. But we also do not want fast
        // editors to resolve slow when too many contributions get
        // instantiated, so we find a middle ground solution via
        // `Promise.race`
        this.whenReady.finally(() => Promise.race([
            this.whenRestored,
            timeout(2000)
        ]).finally(() => {
            // Update perf marks only when the layout is fully
            // restored. We want the time it takes to restore
            // editors to be included in these numbers
            function markDidStartWorkbench() {
                mark('code/didStartWorkbench');
                performance.measure('perf: workbench create & restore', 'code/didLoadWorkbenchMain', 'code/didStartWorkbench');
            }
            if (this.isRestored()) {
                markDidStartWorkbench();
            }
            else {
                this.whenRestored.finally(() => markDidStartWorkbench());
            }
            // Set lifecycle phase to `Restored`
            lifecycleService.phase = 3 /* LifecyclePhase.Restored */;
            // Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
            const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
                this._register(runWhenWindowIdle(mainWindow, () => lifecycleService.phase = 4 /* LifecyclePhase.Eventually */, 2500));
            }, 2500));
            eventuallyPhaseScheduler.schedule();
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3dvcmtiZW5jaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLFlBQVksQ0FBQztBQUNwQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM5RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakcsT0FBTyxFQUFtQyxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNoSCxPQUFPLEVBQTBCLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDL0UsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkcsT0FBTyxFQUFtQix1QkFBdUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pILE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQStCLE1BQU0sMENBQTBDLENBQUM7QUFDN0gsT0FBTyxFQUE2QixxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3hILE9BQU8sRUFBa0IsaUJBQWlCLEVBQXFCLE1BQU0sMkNBQTJDLENBQUM7QUFDakgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQzFJLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQzVILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3hHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBVWpHLE1BQU0sT0FBTyxTQUFVLFNBQVEsTUFBTTtJQVFwQyxZQUNDLE1BQW1CLEVBQ0YsT0FBc0MsRUFDdEMsaUJBQW9DLEVBQ3JELFVBQXVCO1FBRXZCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUpHLFlBQU8sR0FBUCxPQUFPLENBQStCO1FBQ3RDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFUckMsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFxQixDQUFDLENBQUM7UUFDM0UsbUJBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztRQUVwQyxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzdELGtCQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7UUFrQzNDLDRCQUF1QixHQUFrRCxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBeEJoSCx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxVQUF1QjtRQUVuRCx1Q0FBdUM7UUFDdkMsNkRBQTZEO1FBQzdELHFEQUFxRDtRQUNyRCxVQUFVLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUUzRCw2RUFBNkU7WUFDN0UsaUJBQWlCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRWhDLG9EQUFvRDtZQUNwRCxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMseUJBQXlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUdPLHFCQUFxQixDQUFDLEtBQWMsRUFBRSxVQUF1QjtRQUNwRSxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFLENBQUM7WUFDekcsT0FBTyxDQUFDLDBFQUEwRTtRQUNuRixDQUFDO1FBRUQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7UUFDeEMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFFL0MsU0FBUztRQUNULFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUM7WUFFSiwyQ0FBMkM7WUFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRW5ELFdBQVc7WUFDWCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFdkUsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM5QyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDekQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDckQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBd0IsQ0FBQztnQkFFdEYsNEZBQTRGO2dCQUM1Rix3REFBd0Q7Z0JBQ3hELHVCQUF1QixDQUFDLENBQUMsU0FBUyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0sseUJBQXlCLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBRXhDLFNBQVM7Z0JBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFMUIsYUFBYTtnQkFDYixRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzVGLFFBQVEsQ0FBQyxFQUFFLENBQXlCLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFcEYsZUFBZTtnQkFDZixJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUM7Z0JBRWpGLHFCQUFxQjtnQkFDckIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBRTNHLG1CQUFtQjtnQkFDbkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFFdEcsbUJBQW1CO2dCQUNuQixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFFN0IsU0FBUztnQkFDVCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBRWQsVUFBVTtnQkFDVixJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDaEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLG9CQUFvQixDQUFDO1FBQzdCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXpCLE1BQU0sS0FBSyxDQUFDLENBQUMsMEVBQTBFO1FBQ3hGLENBQUM7SUFDRixDQUFDO0lBRU8sWUFBWSxDQUFDLGlCQUFvQztRQUV4RCxpQkFBaUI7UUFDakIsaUJBQWlCLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXJELHlFQUF5RTtRQUN6RSxFQUFFO1FBQ0Ysd0VBQXdFO1FBQ3hFLHlFQUF5RTtRQUN6RSxzRUFBc0U7UUFDdEUseUJBQXlCO1FBQ3pCLEVBQUU7UUFDRix5RUFBeUU7UUFFekUsMkJBQTJCO1FBQzNCLE1BQU0sbUJBQW1CLEdBQUcsOEJBQThCLEVBQUUsQ0FBQztRQUM3RCxLQUFLLE1BQU0sQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUNwRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxNQUFNLG9CQUFvQixHQUFHLElBQUksb0JBQW9CLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFL0UsVUFBVTtRQUNWLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUM5QyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUV6RCwrQ0FBK0M7WUFDL0MsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFRLENBQUM7WUFDeEUsSUFBSSxPQUFPLG9CQUFvQixDQUFDLDJCQUEyQixLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUM1RSxvQkFBb0IsQ0FBQywyQkFBMkIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3hFLENBQUM7WUFFRCw0Q0FBNEM7WUFDNUMsZ0JBQWdCLENBQUMsS0FBSywrQkFBdUIsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sb0JBQW9CLENBQUM7SUFDN0IsQ0FBQztJQUVPLGlCQUFpQixDQUFDLGdCQUFtQyxFQUFFLGNBQStCLEVBQUUsb0JBQTJDLEVBQUUsV0FBeUIsRUFBRSxhQUE2QjtRQUVwTSx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckgsWUFBWTtRQUNaLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDL0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDcEMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCxZQUFZO1FBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO1lBQ2xELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSiwrRUFBK0U7UUFDL0UsOEVBQThFO1FBQzlFLG1DQUFtQztRQUNuQyxrRkFBa0Y7UUFDbEYsNkRBQTZEO1FBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ25ELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSix5QkFBeUI7UUFDekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9HLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEgsQ0FBQztJQUdPLGtCQUFrQixDQUFDLENBQXdDLEVBQUUsb0JBQTJDO1FBQy9HLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPLENBQUMsYUFBYTtRQUN0QixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO1lBQzVELE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUE4Qyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RILElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDO1FBRTdCLGFBQWE7UUFDYixNQUFNLGtCQUFrQixHQUF3QixDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsd0JBQXdCLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV6RyxlQUFlO1FBQ2YsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM1RCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNGLENBQUM7SUFFTyxlQUFlLENBQUMsY0FBK0IsRUFBRSxvQkFBMkM7UUFDbkcsTUFBTSxpQkFBaUIsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLGdCQUFnQixvQ0FBMkIsQ0FBQztRQUN6RixJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDckQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7b0JBQ25DLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBQzlELENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxZQUFZO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFFRCxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2xLLENBQUM7SUFFTyxhQUFhLENBQUMsY0FBK0I7UUFDcEQsTUFBTSxrQkFBa0IsR0FBRyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxRSxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsY0FBYyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLG1FQUFrRCxDQUFDO1FBQzdILENBQUM7SUFDRixDQUFDO0lBRU8sZUFBZSxDQUFDLG9CQUEyQyxFQUFFLG1CQUF3QyxFQUFFLGNBQStCLEVBQUUsb0JBQTJDO1FBRTFMLGlCQUFpQjtRQUNqQixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDckMsd0NBQXdDLENBQUMsQ0FBQyxXQUFtQixFQUFFLFVBQW1CLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQ0FBb0MsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUUzTCx5QkFBeUI7UUFDekIsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDeEUsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUM7WUFDakMsa0JBQWtCO1lBQ2xCLGFBQWE7WUFDYixLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUztZQUN6QixRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQy9FLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztTQUNoRSxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXRELHNCQUFzQjtRQUN0QixJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFekQsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFM0QsZUFBZTtRQUNmLEtBQUssTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJO1lBQzVDLEVBQUUsRUFBRSxzREFBcUIsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2hFLEVBQUUsRUFBRSxrREFBbUIsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzlELEVBQUUsRUFBRSw0REFBd0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsMEJBQWtCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSw0RUFBNEU7WUFDcE4sRUFBRSxFQUFFLG9EQUFvQixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSwwQkFBa0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUM5SCxFQUFFLEVBQUUsa0RBQW1CLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxFQUFFO1lBQzFILEVBQUUsRUFBRSxnREFBa0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ2xILEVBQUUsRUFBRSw4REFBeUIsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLDBCQUFrQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3JKLEVBQUUsRUFBRSx3REFBc0IsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1NBQ3BFLEVBQUUsQ0FBQztZQUNILE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUV6RCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBRTVFLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVPLFVBQVUsQ0FBQyxFQUFVLEVBQUUsSUFBWSxFQUFFLE9BQWlCO1FBQzdELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6SCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxvQkFBMkMsRUFBRSxtQkFBd0M7UUFFeEgsc0NBQXNDO1FBQ3RDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3BKLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3BKLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDcEcsTUFBTSxtQkFBbUIsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFaEgsYUFBYTtRQUNiLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFO1lBQzdELG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekYsbUJBQW1CLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUM3RCxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixvQkFBb0I7UUFDcEIsNEJBQTRCLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFbEcsd0NBQXdDO1FBQ3hDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUVsRSx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLHFCQUFxQixDQUFDO1lBQzFCLGtDQUFrQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsSUFBSSxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7U0FDcE4sQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLE9BQU8sQ0FBQyxnQkFBbUM7UUFFbEQsMkJBQTJCO1FBQzNCLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNyQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixDQUFDO1FBRUQsMkRBQTJEO1FBQzNELDJEQUEyRDtRQUMzRCw2REFBNkQ7UUFDN0QsNERBQTREO1FBQzVELDREQUE0RDtRQUM1RCwyREFBMkQ7UUFDM0QsMERBQTBEO1FBQzFELHdEQUF3RDtRQUN4RCxpQkFBaUI7UUFDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDWixJQUFJLENBQUMsWUFBWTtZQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ2IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFFZixrREFBa0Q7WUFDbEQsaURBQWlEO1lBQ2pELDBDQUEwQztZQUUxQyxTQUFTLHFCQUFxQjtnQkFDN0IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBQy9CLFdBQVcsQ0FBQyxPQUFPLENBQUMsa0NBQWtDLEVBQUUsMkJBQTJCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztZQUNoSCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDdkIscUJBQXFCLEVBQUUsQ0FBQztZQUN6QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1lBQzFELENBQUM7WUFFRCxvQ0FBb0M7WUFDcEMsZ0JBQWdCLENBQUMsS0FBSyxrQ0FBMEIsQ0FBQztZQUVqRCwrRkFBK0Y7WUFDL0YsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO2dCQUN6RSxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLG9DQUE0QixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDL0csQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDVix3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FDRixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=