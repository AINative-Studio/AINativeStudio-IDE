/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mark } from '../../base/common/performance.js';
import { domContentLoaded, detectFullscreen, getCookieValue, getWindow } from '../../base/browser/dom.js';
import { assertIsDefined } from '../../base/common/types.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILogService, ConsoleLogger, getLogLevel, ILoggerService } from '../../platform/log/common/log.js';
import { ConsoleLogInAutomationLogger } from '../../platform/log/browser/log.js';
import { Disposable, DisposableStore, toDisposable } from '../../base/common/lifecycle.js';
import { BrowserWorkbenchEnvironmentService, IBrowserWorkbenchEnvironmentService } from '../services/environment/browser/environmentService.js';
import { Workbench } from './workbench.js';
import { RemoteFileSystemProviderClient } from '../services/remote/common/remoteFileSystemProviderClient.js';
import { IProductService } from '../../platform/product/common/productService.js';
import product from '../../platform/product/common/product.js';
import { RemoteAgentService } from '../services/remote/browser/remoteAgentService.js';
import { RemoteAuthorityResolverService } from '../../platform/remote/browser/remoteAuthorityResolverService.js';
import { IRemoteAuthorityResolverService } from '../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteAgentService } from '../services/remote/common/remoteAgentService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { Schemas, connectionTokenCookieName } from '../../base/common/network.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE, isTemporaryWorkspace, isWorkspaceIdentifier } from '../../platform/workspace/common/workspace.js';
import { IWorkbenchConfigurationService } from '../services/configuration/common/configuration.js';
import { onUnexpectedError } from '../../base/common/errors.js';
import { setFullscreen } from '../../base/browser/browser.js';
import { URI } from '../../base/common/uri.js';
import { WorkspaceService } from '../services/configuration/browser/configurationService.js';
import { ConfigurationCache } from '../services/configuration/common/configurationCache.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { SignService } from '../../platform/sign/browser/signService.js';
import { BrowserStorageService } from '../services/storage/browser/storageService.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { toLocalISOString } from '../../base/common/date.js';
import { isWorkspaceToOpen, isFolderToOpen } from '../../platform/window/common/window.js';
import { getSingleFolderWorkspaceIdentifier, getWorkspaceIdentifier } from '../services/workspaces/browser/workspaces.js';
import { InMemoryFileSystemProvider } from '../../platform/files/common/inMemoryFilesystemProvider.js';
import { ICommandService } from '../../platform/commands/common/commands.js';
import { IndexedDBFileSystemProvider } from '../../platform/files/browser/indexedDBFileSystemProvider.js';
import { BrowserRequestService } from '../services/request/browser/requestService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { IUserDataInitializationService, UserDataInitializationService } from '../services/userData/browser/userDataInit.js';
import { UserDataSyncStoreManagementService } from '../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IUserDataSyncStoreManagementService } from '../../platform/userDataSync/common/userDataSync.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { Action2, MenuId, registerAction2 } from '../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { localize, localize2 } from '../../nls.js';
import { Categories } from '../../platform/action/common/actionCommonCategories.js';
import { IDialogService } from '../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../services/host/browser/host.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { BrowserWindow } from './window.js';
import { ITimerService } from '../services/timer/browser/timerService.js';
import { WorkspaceTrustEnablementService, WorkspaceTrustManagementService } from '../services/workspaces/common/workspaceTrust.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService } from '../../platform/workspace/common/workspaceTrust.js';
import { HTMLFileSystemProvider } from '../../platform/files/browser/htmlFileSystemProvider.js';
import { IOpenerService } from '../../platform/opener/common/opener.js';
import { mixin, safeStringify } from '../../base/common/objects.js';
import { IndexedDB } from '../../base/browser/indexedDB.js';
import { WebFileSystemAccess } from '../../platform/files/browser/webFileSystemAccess.js';
import { IProgressService } from '../../platform/progress/common/progress.js';
import { DelayedLogChannel } from '../services/output/common/delayedLogChannel.js';
import { dirname, joinPath } from '../../base/common/resources.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../platform/policy/common/policy.js';
import { IRemoteExplorerService } from '../services/remote/common/remoteExplorerService.js';
import { DisposableTunnel, TunnelProtocol } from '../../platform/tunnel/common/tunnel.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { UserDataProfileService } from '../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../services/userDataProfile/common/userDataProfile.js';
import { BrowserUserDataProfilesService } from '../../platform/userDataProfile/browser/userDataProfile.js';
import { DeferredPromise, timeout } from '../../base/common/async.js';
import { windowLogGroup, windowLogId } from '../services/log/common/logConstants.js';
import { LogService } from '../../platform/log/common/logService.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService } from '../../platform/remote/common/remoteSocketFactoryService.js';
import { BrowserSocketFactory } from '../../platform/remote/browser/browserSocketFactory.js';
import { VSBuffer } from '../../base/common/buffer.js';
import { UserDataProfileInitializer } from '../services/userDataProfile/browser/userDataProfileInit.js';
import { UserDataSyncInitializer } from '../services/userDataSync/browser/userDataSyncInit.js';
import { BrowserRemoteResourceLoader } from '../services/remote/browser/browserRemoteResourceHandler.js';
import { BufferLogger } from '../../platform/log/common/bufferLog.js';
import { FileLoggerService } from '../../platform/log/common/fileLog.js';
import { IEmbedderTerminalService } from '../services/terminal/common/embedderTerminalService.js';
import { BrowserSecretStorageService } from '../services/secrets/browser/secretStorageService.js';
import { EncryptionService } from '../services/encryption/browser/encryptionService.js';
import { IEncryptionService } from '../../platform/encryption/common/encryptionService.js';
import { ISecretStorageService } from '../../platform/secrets/common/secrets.js';
import { TunnelSource } from '../services/remote/common/tunnelModel.js';
import { mainWindow } from '../../base/browser/window.js';
import { INotificationService, Severity } from '../../platform/notification/common/notification.js';
export class BrowserMain extends Disposable {
    constructor(domElement, configuration) {
        super();
        this.domElement = domElement;
        this.configuration = configuration;
        this.onWillShutdownDisposables = this._register(new DisposableStore());
        this.indexedDBFileSystemProviders = [];
        this.init();
    }
    init() {
        // Browser config
        setFullscreen(!!detectFullscreen(mainWindow), mainWindow);
    }
    async open() {
        // Init services and wait for DOM to be ready in parallel
        const [services] = await Promise.all([this.initServices(), domContentLoaded(getWindow(this.domElement))]);
        // Create Workbench
        const workbench = new Workbench(this.domElement, undefined, services.serviceCollection, services.logService);
        // Listeners
        this.registerListeners(workbench);
        // Startup
        const instantiationService = workbench.startup();
        // Window
        this._register(instantiationService.createInstance(BrowserWindow));
        // Logging
        services.logService.trace('workbench#open with configuration', safeStringify(this.configuration));
        // Return API Facade
        return instantiationService.invokeFunction(accessor => {
            const commandService = accessor.get(ICommandService);
            const lifecycleService = accessor.get(ILifecycleService);
            const timerService = accessor.get(ITimerService);
            const openerService = accessor.get(IOpenerService);
            const productService = accessor.get(IProductService);
            const progressService = accessor.get(IProgressService);
            const environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
            const instantiationService = accessor.get(IInstantiationService);
            const remoteExplorerService = accessor.get(IRemoteExplorerService);
            const labelService = accessor.get(ILabelService);
            const embedderTerminalService = accessor.get(IEmbedderTerminalService);
            const remoteAuthorityResolverService = accessor.get(IRemoteAuthorityResolverService);
            const notificationService = accessor.get(INotificationService);
            async function showMessage(severity, message, ...items) {
                const choice = new DeferredPromise();
                const handle = notificationService.prompt(severity, message, items.map(item => ({
                    label: item,
                    run: () => choice.complete(item)
                })));
                const disposable = handle.onDidClose(() => {
                    choice.complete(undefined);
                    disposable.dispose();
                });
                const result = await choice.p;
                handle.close();
                return result;
            }
            let logger = undefined;
            return {
                commands: {
                    executeCommand: (command, ...args) => commandService.executeCommand(command, ...args)
                },
                env: {
                    async getUriScheme() {
                        return productService.urlProtocol;
                    },
                    async retrievePerformanceMarks() {
                        await timerService.whenReady();
                        return timerService.getPerformanceMarks();
                    },
                    async openUri(uri) {
                        return openerService.open(uri, {});
                    }
                },
                logger: {
                    log: (level, message) => {
                        if (!logger) {
                            logger = instantiationService.createInstance(DelayedLogChannel, 'webEmbedder', productService.embedderIdentifier || productService.nameShort, joinPath(dirname(environmentService.logFile), 'webEmbedder.log'));
                        }
                        logger.log(level, message);
                    }
                },
                window: {
                    withProgress: (options, task) => progressService.withProgress(options, task),
                    createTerminal: async (options) => embedderTerminalService.createTerminal(options),
                    showInformationMessage: (message, ...items) => showMessage(Severity.Info, message, ...items),
                },
                workspace: {
                    didResolveRemoteAuthority: async () => {
                        if (!this.configuration.remoteAuthority) {
                            return;
                        }
                        await remoteAuthorityResolverService.resolveAuthority(this.configuration.remoteAuthority);
                    },
                    openTunnel: async (tunnelOptions) => {
                        const tunnel = assertIsDefined(await remoteExplorerService.forward({
                            remote: tunnelOptions.remoteAddress,
                            local: tunnelOptions.localAddressPort,
                            name: tunnelOptions.label,
                            source: {
                                source: TunnelSource.Extension,
                                description: labelService.getHostLabel(Schemas.vscodeRemote, this.configuration.remoteAuthority)
                            },
                            elevateIfNeeded: false,
                            privacy: tunnelOptions.privacy
                        }, {
                            label: tunnelOptions.label,
                            elevateIfNeeded: undefined,
                            onAutoForward: undefined,
                            requireLocalPort: undefined,
                            protocol: tunnelOptions.protocol === TunnelProtocol.Https ? tunnelOptions.protocol : TunnelProtocol.Http
                        }));
                        if (typeof tunnel === 'string') {
                            throw new Error(tunnel);
                        }
                        return new class extends DisposableTunnel {
                        }({
                            port: tunnel.tunnelRemotePort,
                            host: tunnel.tunnelRemoteHost
                        }, tunnel.localAddress, () => tunnel.dispose());
                    }
                },
                shutdown: () => lifecycleService.shutdown()
            };
        });
    }
    registerListeners(workbench) {
        // Workbench Lifecycle
        this._register(workbench.onWillShutdown(() => this.onWillShutdownDisposables.clear()));
        this._register(workbench.onDidShutdown(() => this.dispose()));
    }
    async initServices() {
        const serviceCollection = new ServiceCollection();
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        const workspace = this.resolveWorkspace();
        // Product
        const productService = mixin({ _serviceBrand: undefined, ...product }, this.configuration.productConfiguration);
        serviceCollection.set(IProductService, productService);
        // Environment
        const logsPath = URI.file(toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '')).with({ scheme: 'vscode-log' });
        const environmentService = new BrowserWorkbenchEnvironmentService(workspace.id, logsPath, this.configuration, productService);
        serviceCollection.set(IBrowserWorkbenchEnvironmentService, environmentService);
        // Files
        const fileLogger = new BufferLogger();
        const fileService = this._register(new FileService(fileLogger));
        serviceCollection.set(IFileService, fileService);
        // Logger
        const loggerService = new FileLoggerService(getLogLevel(environmentService), logsPath, fileService);
        serviceCollection.set(ILoggerService, loggerService);
        // Log Service
        const otherLoggers = [new ConsoleLogger(loggerService.getLogLevel())];
        if (environmentService.isExtensionDevelopment && !!environmentService.extensionTestsLocationURI) {
            otherLoggers.push(new ConsoleLogInAutomationLogger(loggerService.getLogLevel()));
        }
        const logger = loggerService.createLogger(environmentService.logFile, { id: windowLogId, name: windowLogGroup.name, group: windowLogGroup });
        const logService = new LogService(logger, otherLoggers);
        serviceCollection.set(ILogService, logService);
        // Set the logger of the fileLogger after the log service is ready.
        // This is to avoid cyclic dependency
        fileLogger.logger = logService;
        // Register File System Providers depending on IndexedDB support
        // Register them early because they are needed for the profiles initialization
        await this.registerIndexedDBFileSystemProviders(environmentService, fileService, logService, loggerService, logsPath);
        const connectionToken = environmentService.options.connectionToken || getCookieValue(connectionTokenCookieName);
        const remoteResourceLoader = this.configuration.remoteResourceProvider ? new BrowserRemoteResourceLoader(fileService, this.configuration.remoteResourceProvider) : undefined;
        const resourceUriProvider = this.configuration.resourceUriProvider ?? remoteResourceLoader?.getResourceUriProvider();
        const remoteAuthorityResolverService = new RemoteAuthorityResolverService(!environmentService.expectsResolverExtension, connectionToken, resourceUriProvider, this.configuration.serverBasePath, productService, logService);
        serviceCollection.set(IRemoteAuthorityResolverService, remoteAuthorityResolverService);
        // Signing
        const signService = new SignService(productService);
        serviceCollection.set(ISignService, signService);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        serviceCollection.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = new BrowserUserDataProfilesService(environmentService, fileService, uriIdentityService, logService);
        serviceCollection.set(IUserDataProfilesService, userDataProfilesService);
        const currentProfile = await this.getCurrentProfile(workspace, userDataProfilesService, environmentService);
        await userDataProfilesService.setProfileForWorkspace(workspace, currentProfile);
        const userDataProfileService = new UserDataProfileService(currentProfile);
        serviceCollection.set(IUserDataProfileService, userDataProfileService);
        // Remote Agent
        const remoteSocketFactoryService = new RemoteSocketFactoryService();
        remoteSocketFactoryService.register(0 /* RemoteConnectionType.WebSocket */, new BrowserSocketFactory(this.configuration.webSocketFactory));
        serviceCollection.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
        const remoteAgentService = this._register(new RemoteAgentService(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, signService, logService));
        serviceCollection.set(IRemoteAgentService, remoteAgentService);
        this._register(RemoteFileSystemProviderClient.register(remoteAgentService, fileService, logService));
        // Long running services (workspace, config, storage)
        const [configurationService, storageService] = await Promise.all([
            this.createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService).then(service => {
                // Workspace
                serviceCollection.set(IWorkspaceContextService, service);
                // Configuration
                serviceCollection.set(IWorkbenchConfigurationService, service);
                return service;
            }),
            this.createStorageService(workspace, logService, userDataProfileService).then(service => {
                // Storage
                serviceCollection.set(IStorageService, service);
                return service;
            })
        ]);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // Workspace Trust Service
        const workspaceTrustEnablementService = new WorkspaceTrustEnablementService(configurationService, environmentService);
        serviceCollection.set(IWorkspaceTrustEnablementService, workspaceTrustEnablementService);
        const workspaceTrustManagementService = new WorkspaceTrustManagementService(configurationService, remoteAuthorityResolverService, storageService, uriIdentityService, environmentService, configurationService, workspaceTrustEnablementService, fileService);
        serviceCollection.set(IWorkspaceTrustManagementService, workspaceTrustManagementService);
        // Update workspace trust so that configuration is updated accordingly
        configurationService.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted());
        this._register(workspaceTrustManagementService.onDidChangeTrust(() => configurationService.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted())));
        // Request Service
        const requestService = new BrowserRequestService(remoteAgentService, configurationService, loggerService);
        serviceCollection.set(IRequestService, requestService);
        // Userdata Sync Store Management Service
        const userDataSyncStoreManagementService = new UserDataSyncStoreManagementService(productService, configurationService, storageService);
        serviceCollection.set(IUserDataSyncStoreManagementService, userDataSyncStoreManagementService);
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //
        // NOTE: Please do NOT register services here. Use `registerSingleton()`
        //       from `workbench.common.main.ts` if the service is shared between
        //       desktop and web or `workbench.web.main.ts` if the service
        //       is web only.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        const encryptionService = new EncryptionService();
        serviceCollection.set(IEncryptionService, encryptionService);
        const secretStorageService = new BrowserSecretStorageService(storageService, encryptionService, environmentService, logService);
        serviceCollection.set(ISecretStorageService, secretStorageService);
        // Userdata Initialize Service
        const userDataInitializers = [];
        userDataInitializers.push(new UserDataSyncInitializer(environmentService, secretStorageService, userDataSyncStoreManagementService, fileService, userDataProfilesService, storageService, productService, requestService, logService, uriIdentityService));
        if (environmentService.options.profile) {
            userDataInitializers.push(new UserDataProfileInitializer(environmentService, fileService, userDataProfileService, storageService, logService, uriIdentityService, requestService));
        }
        const userDataInitializationService = new UserDataInitializationService(userDataInitializers);
        serviceCollection.set(IUserDataInitializationService, userDataInitializationService);
        try {
            await Promise.race([
                // Do not block more than 5s
                timeout(5000),
                this.initializeUserData(userDataInitializationService, configurationService)
            ]);
        }
        catch (error) {
            logService.error(error);
        }
        return { serviceCollection, configurationService, logService };
    }
    async initializeUserData(userDataInitializationService, configurationService) {
        if (await userDataInitializationService.requiresInitialization()) {
            mark('code/willInitRequiredUserData');
            // Initialize required resources - settings & global state
            await userDataInitializationService.initializeRequiredResources();
            // Important: Reload only local user configuration after initializing
            // Reloading complete configuration blocks workbench until remote configuration is loaded.
            await configurationService.reloadLocalUserConfiguration();
            mark('code/didInitRequiredUserData');
        }
    }
    async registerIndexedDBFileSystemProviders(environmentService, fileService, logService, loggerService, logsPath) {
        // IndexedDB is used for logging and user data
        let indexedDB;
        const userDataStore = 'vscode-userdata-store';
        const logsStore = 'vscode-logs-store';
        const handlesStore = 'vscode-filehandles-store';
        try {
            indexedDB = await IndexedDB.create('vscode-web-db', 3, [userDataStore, logsStore, handlesStore]);
            // Close onWillShutdown
            this.onWillShutdownDisposables.add(toDisposable(() => indexedDB?.close()));
        }
        catch (error) {
            logService.error('Error while creating IndexedDB', error);
        }
        // Logger
        if (indexedDB) {
            const logFileSystemProvider = new IndexedDBFileSystemProvider(logsPath.scheme, indexedDB, logsStore, false);
            this.indexedDBFileSystemProviders.push(logFileSystemProvider);
            fileService.registerProvider(logsPath.scheme, logFileSystemProvider);
        }
        else {
            fileService.registerProvider(logsPath.scheme, new InMemoryFileSystemProvider());
        }
        // User data
        let userDataProvider;
        if (indexedDB) {
            userDataProvider = new IndexedDBFileSystemProvider(Schemas.vscodeUserData, indexedDB, userDataStore, true);
            this.indexedDBFileSystemProviders.push(userDataProvider);
            this.registerDeveloperActions(userDataProvider);
        }
        else {
            logService.info('Using in-memory user data provider');
            userDataProvider = new InMemoryFileSystemProvider();
        }
        fileService.registerProvider(Schemas.vscodeUserData, userDataProvider);
        // Local file access (if supported by browser)
        if (WebFileSystemAccess.supported(mainWindow)) {
            fileService.registerProvider(Schemas.file, new HTMLFileSystemProvider(indexedDB, handlesStore, logService));
        }
        // In-memory
        fileService.registerProvider(Schemas.tmp, new InMemoryFileSystemProvider());
    }
    registerDeveloperActions(provider) {
        this._register(registerAction2(class ResetUserDataAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.resetUserData',
                    title: localize2('reset', "Reset User Data"),
                    category: Categories.Developer,
                    menu: {
                        id: MenuId.CommandPalette
                    }
                });
            }
            async run(accessor) {
                const dialogService = accessor.get(IDialogService);
                const hostService = accessor.get(IHostService);
                const storageService = accessor.get(IStorageService);
                const logService = accessor.get(ILogService);
                const result = await dialogService.confirm({
                    message: localize('reset user data message', "Would you like to reset your data (settings, keybindings, extensions, snippets and UI State) and reload?")
                });
                if (result.confirmed) {
                    try {
                        await provider?.reset();
                        if (storageService instanceof BrowserStorageService) {
                            await storageService.clear();
                        }
                    }
                    catch (error) {
                        logService.error(error);
                        throw error;
                    }
                }
                hostService.reload();
            }
        }));
    }
    async createStorageService(workspace, logService, userDataProfileService) {
        const storageService = new BrowserStorageService(workspace, userDataProfileService, logService);
        try {
            await storageService.initialize();
            // Register to close on shutdown
            this.onWillShutdownDisposables.add(toDisposable(() => storageService.close()));
            return storageService;
        }
        catch (error) {
            onUnexpectedError(error);
            logService.error(error);
            return storageService;
        }
    }
    async createWorkspaceService(workspace, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService) {
        // Temporary workspaces do not exist on startup because they are
        // just in memory. As such, detect this case and eagerly create
        // the workspace file empty so that it is a valid workspace.
        if (isWorkspaceIdentifier(workspace) && isTemporaryWorkspace(workspace.configPath)) {
            try {
                const emptyWorkspace = { folders: [] };
                await fileService.createFile(workspace.configPath, VSBuffer.fromString(JSON.stringify(emptyWorkspace, null, '\t')), { overwrite: false });
            }
            catch (error) {
                // ignore if workspace file already exists
            }
        }
        const configurationCache = new ConfigurationCache([Schemas.file, Schemas.vscodeUserData, Schemas.tmp] /* Cache all non native resources */, environmentService, fileService);
        const workspaceService = new WorkspaceService({ remoteAuthority: this.configuration.remoteAuthority, configurationCache }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, logService, new NullPolicyService());
        try {
            await workspaceService.initialize(workspace);
            return workspaceService;
        }
        catch (error) {
            onUnexpectedError(error);
            logService.error(error);
            return workspaceService;
        }
    }
    async getCurrentProfile(workspace, userDataProfilesService, environmentService) {
        const profileName = environmentService.options?.profile?.name ?? environmentService.profile;
        if (profileName) {
            const profile = userDataProfilesService.profiles.find(p => p.name === profileName);
            if (profile) {
                return profile;
            }
            return userDataProfilesService.createNamedProfile(profileName, undefined, workspace);
        }
        return userDataProfilesService.getProfileForWorkspace(workspace) ?? userDataProfilesService.defaultProfile;
    }
    resolveWorkspace() {
        let workspace = undefined;
        if (this.configuration.workspaceProvider) {
            workspace = this.configuration.workspaceProvider.workspace;
        }
        // Multi-root workspace
        if (workspace && isWorkspaceToOpen(workspace)) {
            return getWorkspaceIdentifier(workspace.workspaceUri);
        }
        // Single-folder workspace
        if (workspace && isFolderToOpen(workspace)) {
            return getSingleFolderWorkspaceIdentifier(workspace.folderUri);
        }
        // Empty window workspace
        return UNKNOWN_EMPTY_WINDOW_WORKSPACE;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLm1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvd2ViLm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQVcsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwSCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNoSixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDM0MsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xGLE9BQU8sT0FBTyxNQUFNLDBDQUEwQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FB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