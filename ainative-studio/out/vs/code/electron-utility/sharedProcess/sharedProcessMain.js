/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostname, release } from 'os';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { onUnexpectedError, setUnexpectedErrorHandler } from '../../../base/common/errors.js';
import { combinedDisposable, Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { Emitter } from '../../../base/common/event.js';
import { ProxyChannel, StaticRouter } from '../../../base/parts/ipc/common/ipc.js';
import { Server as UtilityProcessMessagePortServer, once } from '../../../base/parts/ipc/node/ipc.mp.js';
import { CodeCacheCleaner } from './contrib/codeCacheCleaner.js';
import { LanguagePackCachedDataCleaner } from './contrib/languagePackCachedDataCleaner.js';
import { LocalizationsUpdater } from './contrib/localizationsUpdater.js';
import { LogsDataCleaner } from './contrib/logsDataCleaner.js';
import { UnusedWorkspaceStorageDataCleaner } from './contrib/storageDataCleaner.js';
import { IChecksumService } from '../../../platform/checksum/common/checksumService.js';
import { ChecksumService } from '../../../platform/checksum/node/checksumService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../platform/configuration/common/configurationService.js';
import { IDiagnosticsService } from '../../../platform/diagnostics/common/diagnostics.js';
import { DiagnosticsService } from '../../../platform/diagnostics/node/diagnosticsService.js';
import { IDownloadService } from '../../../platform/download/common/download.js';
import { DownloadService } from '../../../platform/download/common/downloadService.js';
import { INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { GlobalExtensionEnablementService } from '../../../platform/extensionManagement/common/extensionEnablementService.js';
import { ExtensionGalleryService } from '../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService, IExtensionManagementService, IExtensionTipsService, IGlobalExtensionEnablementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementChannel, ExtensionTipsChannel } from '../../../platform/extensionManagement/common/extensionManagementIpc.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../../platform/extensionManagement/node/extensionManagementService.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../../platform/languagePacks/node/languagePacks.js';
import { ConsoleLogger, ILoggerService, ILogService } from '../../../platform/log/common/log.js';
import { LoggerChannelClient } from '../../../platform/log/common/logIpc.js';
import product from '../../../platform/product/common/product.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IRequestService } from '../../../platform/request/common/request.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { resolveCommonProperties } from '../../../platform/telemetry/common/commonProperties.js';
import { ICustomEndpointTelemetryService, ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { TelemetryAppenderChannel } from '../../../platform/telemetry/common/telemetryIpc.js';
import { TelemetryLogAppender } from '../../../platform/telemetry/common/telemetryLogAppender.js';
import { TelemetryService } from '../../../platform/telemetry/common/telemetryService.js';
import { supportsTelemetry, NullAppender, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry, isLoggingOnly } from '../../../platform/telemetry/common/telemetryUtils.js';
import { CustomEndpointTelemetryService } from '../../../platform/telemetry/node/customEndpointTelemetryService.js';
import { ExtensionStorageService, IExtensionStorageService } from '../../../platform/extensionManagement/common/extensionStorage.js';
import { IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService } from '../../../platform/userDataSync/common/ignoredExtensions.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, IUserDataSyncUtilService, registerConfiguration as registerUserDataSyncConfiguration, IUserDataSyncResourceProviderService } from '../../../platform/userDataSync/common/userDataSync.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from '../../../platform/userDataSync/common/userDataSyncAccount.js';
import { UserDataSyncLocalStoreService } from '../../../platform/userDataSync/common/userDataSyncLocalStoreService.js';
import { UserDataSyncAccountServiceChannel, UserDataSyncStoreManagementServiceChannel } from '../../../platform/userDataSync/common/userDataSyncIpc.js';
import { UserDataSyncLogService } from '../../../platform/userDataSync/common/userDataSyncLog.js';
import { IUserDataSyncMachinesService, UserDataSyncMachinesService } from '../../../platform/userDataSync/common/userDataSyncMachines.js';
import { UserDataSyncEnablementService } from '../../../platform/userDataSync/common/userDataSyncEnablementService.js';
import { UserDataSyncService } from '../../../platform/userDataSync/common/userDataSyncService.js';
import { UserDataSyncServiceChannel } from '../../../platform/userDataSync/common/userDataSyncServiceIpc.js';
import { UserDataSyncStoreManagementService, UserDataSyncStoreService } from '../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IUserDataProfileStorageService } from '../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { SharedProcessUserDataProfileStorageService } from '../../../platform/userDataProfile/node/userDataProfileStorageService.js';
import { ActiveWindowManager } from '../../../platform/windows/node/windowTracker.js';
import { ISignService } from '../../../platform/sign/common/sign.js';
import { SignService } from '../../../platform/sign/node/signService.js';
import { ISharedTunnelsService } from '../../../platform/tunnel/common/tunnel.js';
import { SharedTunnelsService } from '../../../platform/tunnel/node/tunnelService.js';
import { ipcSharedProcessTunnelChannelName, ISharedProcessTunnelService } from '../../../platform/remote/common/sharedProcessTunnelService.js';
import { SharedProcessTunnelService } from '../../../platform/tunnel/node/sharedProcessTunnelService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { isLinux } from '../../../base/common/platform.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { DiskFileSystemProviderClient, LOCAL_FILE_SYSTEM_CHANNEL_NAME } from '../../../platform/files/common/diskFileSystemProviderClient.js';
import { InspectProfilingService as V8InspectProfilingService } from '../../../platform/profiling/node/profilingService.js';
import { IV8InspectProfilingService } from '../../../platform/profiling/common/profiling.js';
import { IExtensionsScannerService } from '../../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from '../../../platform/extensionManagement/node/extensionsScannerService.js';
import { IUserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { PolicyChannelClient } from '../../../platform/policy/common/policyIpc.js';
import { IPolicyService, NullPolicyService } from '../../../platform/policy/common/policy.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfileIpc.js';
import { OneDataSystemAppender } from '../../../platform/telemetry/node/1dsAppender.js';
import { UserDataProfilesCleaner } from './contrib/userDataProfilesCleaner.js';
import { IRemoteTunnelService } from '../../../platform/remoteTunnel/common/remoteTunnel.js';
import { UserDataSyncResourceProviderService } from '../../../platform/userDataSync/common/userDataSyncResourceProvider.js';
import { ExtensionsContributions } from './contrib/extensions.js';
import { localize } from '../../../nls.js';
import { LogService } from '../../../platform/log/common/logService.js';
import { ISharedProcessLifecycleService, SharedProcessLifecycleService } from '../../../platform/lifecycle/node/sharedProcessLifecycleService.js';
import { RemoteTunnelService } from '../../../platform/remoteTunnel/node/remoteTunnelService.js';
import { ExtensionsProfileScannerService } from '../../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { ExtensionRecommendationNotificationServiceChannelClient } from '../../../platform/extensionRecommendations/common/extensionRecommendationsIpc.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { NativeHostService } from '../../../platform/native/common/nativeHostService.js';
import { UserDataAutoSyncService } from '../../../platform/userDataSync/node/userDataAutoSyncService.js';
import { ExtensionTipsService } from '../../../platform/extensionManagement/node/extensionTipsService.js';
import { IMainProcessService, MainProcessService } from '../../../platform/ipc/common/mainProcessService.js';
import { RemoteStorageService } from '../../../platform/storage/common/storageService.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { nodeSocketFactory } from '../../../platform/remote/node/nodeSocketFactory.js';
import { NativeEnvironmentService } from '../../../platform/environment/node/environmentService.js';
import { SharedProcessRawConnection, SharedProcessLifecycle } from '../../../platform/sharedProcess/common/sharedProcess.js';
import { getOSReleaseInfo } from '../../../base/node/osReleaseInfo.js';
import { getDesktopEnvironment } from '../../../base/common/desktopEnvironmentInfo.js';
import { getCodeDisplayProtocol, getDisplayProtocol } from '../../../base/node/osDisplayProtocolInfo.js';
import { RequestService } from '../../../platform/request/electron-utility/requestService.js';
import { DefaultExtensionsInitializer } from './contrib/defaultExtensionsInitializer.js';
import { AllowedExtensionsService } from '../../../platform/extensionManagement/common/allowedExtensionsService.js';
import { IExtensionGalleryManifestService } from '../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestIPCService } from '../../../platform/extensionManagement/common/extensionGalleryManifestServiceIpc.js';
import { ISharedWebContentExtractorService } from '../../../platform/webContentExtractor/common/webContentExtractor.js';
import { SharedWebContentExtractorService } from '../../../platform/webContentExtractor/node/sharedWebContentExtractorService.js';
class SharedProcessMain extends Disposable {
    constructor(configuration) {
        super();
        this.configuration = configuration;
        this.server = this._register(new UtilityProcessMessagePortServer(this));
        this.lifecycleService = undefined;
        this.onDidWindowConnectRaw = this._register(new Emitter());
        this.registerListeners();
    }
    registerListeners() {
        // Shared process lifecycle
        let didExit = false;
        const onExit = () => {
            if (!didExit) {
                didExit = true;
                this.lifecycleService?.fireOnWillShutdown();
                this.dispose();
            }
        };
        process.once('exit', onExit);
        once(process.parentPort, SharedProcessLifecycle.exit, onExit);
    }
    async init() {
        // Services
        const instantiationService = await this.initServices();
        // Config
        registerUserDataSyncConfiguration();
        instantiationService.invokeFunction(accessor => {
            const logService = accessor.get(ILogService);
            const telemetryService = accessor.get(ITelemetryService);
            // Log info
            logService.trace('sharedProcess configuration', JSON.stringify(this.configuration));
            // Channels
            this.initChannels(accessor);
            // Error handler
            this.registerErrorHandler(logService);
            // Report Client OS/DE Info
            this.reportClientOSInfo(telemetryService, logService);
        });
        // Instantiate Contributions
        this._register(combinedDisposable(instantiationService.createInstance(CodeCacheCleaner, this.configuration.codeCachePath), instantiationService.createInstance(LanguagePackCachedDataCleaner), instantiationService.createInstance(UnusedWorkspaceStorageDataCleaner), instantiationService.createInstance(LogsDataCleaner), instantiationService.createInstance(LocalizationsUpdater), instantiationService.createInstance(ExtensionsContributions), instantiationService.createInstance(UserDataProfilesCleaner), instantiationService.createInstance(DefaultExtensionsInitializer)));
    }
    async initServices() {
        const services = new ServiceCollection();
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Main Process
        const mainRouter = new StaticRouter(ctx => ctx === 'main');
        const mainProcessService = new MainProcessService(this.server, mainRouter);
        services.set(IMainProcessService, mainProcessService);
        // Policies
        const policyService = this.configuration.policiesData ? new PolicyChannelClient(this.configuration.policiesData, mainProcessService.getChannel('policy')) : new NullPolicyService();
        services.set(IPolicyService, policyService);
        // Environment
        const environmentService = new NativeEnvironmentService(this.configuration.args, productService);
        services.set(INativeEnvironmentService, environmentService);
        // Logger
        const loggerService = new LoggerChannelClient(undefined, this.configuration.logLevel, environmentService.logsHome, this.configuration.loggers.map(loggerResource => ({ ...loggerResource, resource: URI.revive(loggerResource.resource) })), mainProcessService.getChannel('logger'));
        services.set(ILoggerService, loggerService);
        // Log
        const sharedLogGroup = { id: 'shared', name: localize('sharedLog', "Shared") };
        const logger = this._register(loggerService.createLogger('sharedprocess', { name: localize('sharedLog', "Shared"), group: sharedLogGroup }));
        const consoleLogger = this._register(new ConsoleLogger(logger.getLevel()));
        const logService = this._register(new LogService(logger, [consoleLogger]));
        services.set(ILogService, logService);
        // Lifecycle
        this.lifecycleService = this._register(new SharedProcessLifecycleService(logService));
        services.set(ISharedProcessLifecycleService, this.lifecycleService);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService));
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = this._register(new UserDataProfilesService(this.configuration.profiles.all, URI.revive(this.configuration.profiles.home).with({ scheme: environmentService.userRoamingDataHome.scheme }), mainProcessService.getChannel('userDataProfiles')));
        services.set(IUserDataProfilesService, userDataProfilesService);
        const userDataFileSystemProvider = this._register(new FileUserDataProvider(Schemas.file, 
        // Specifically for user data, use the disk file system provider
        // from the main process to enable atomic read/write operations.
        // Since user data can change very frequently across multiple
        // processes, we want a single process handling these operations.
        this._register(new DiskFileSystemProviderClient(mainProcessService.getChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME), { pathCaseSensitive: isLinux })), Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        fileService.registerProvider(Schemas.vscodeUserData, userDataFileSystemProvider);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, policyService, logService));
        services.set(IConfigurationService, configurationService);
        // Storage (global access only)
        const storageService = new RemoteStorageService(undefined, { defaultProfile: userDataProfilesService.defaultProfile, currentProfile: userDataProfilesService.defaultProfile }, mainProcessService, environmentService);
        services.set(IStorageService, storageService);
        this._register(toDisposable(() => storageService.flush()));
        // Initialize config & storage in parallel
        await Promise.all([
            configurationService.initialize(),
            storageService.initialize()
        ]);
        // Request
        const networkLogger = this._register(loggerService.createLogger(`network-shared`, { name: localize('networkk', "Network"), group: sharedLogGroup }));
        const requestService = new RequestService(configurationService, environmentService, this._register(new LogService(networkLogger)));
        services.set(IRequestService, requestService);
        // Checksum
        services.set(IChecksumService, new SyncDescriptor(ChecksumService, undefined, false /* proxied to other processes */));
        // V8 Inspect profiler
        services.set(IV8InspectProfilingService, new SyncDescriptor(V8InspectProfilingService, undefined, false /* proxied to other processes */));
        // Native Host
        const nativeHostService = new NativeHostService(-1 /* we are not running in a browser window context */, mainProcessService);
        services.set(INativeHostService, nativeHostService);
        // Download
        services.set(IDownloadService, new SyncDescriptor(DownloadService, undefined, true));
        // Extension recommendations
        const activeWindowManager = this._register(new ActiveWindowManager(nativeHostService));
        const activeWindowRouter = new StaticRouter(ctx => activeWindowManager.getActiveClientId().then(id => ctx === id));
        services.set(IExtensionRecommendationNotificationService, new ExtensionRecommendationNotificationServiceChannelClient(this.server.getChannel('extensionRecommendationNotification', activeWindowRouter)));
        // Telemetry
        let telemetryService;
        const appenders = [];
        const internalTelemetry = isInternalTelemetry(productService, configurationService);
        if (supportsTelemetry(productService, environmentService)) {
            const logAppender = new TelemetryLogAppender('', false, loggerService, environmentService, productService);
            appenders.push(logAppender);
            if (!isLoggingOnly(productService, environmentService) && productService.aiConfig?.ariaKey) {
                const collectorAppender = new OneDataSystemAppender(requestService, internalTelemetry, 'monacoworkbench', null, productService.aiConfig.ariaKey);
                this._register(toDisposable(() => collectorAppender.flush())); // Ensure the 1DS appender is disposed so that it flushes remaining data
                appenders.push(collectorAppender);
            }
            telemetryService = new TelemetryService({
                appenders,
                commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version, this.configuration.machineId, this.configuration.sqmId, this.configuration.devDeviceId, internalTelemetry),
                sendErrorTelemetry: true,
                piiPaths: getPiiPathsFromEnvironment(environmentService),
            }, configurationService, productService);
        }
        else {
            telemetryService = NullTelemetryService;
            const nullAppender = NullAppender;
            appenders.push(nullAppender);
        }
        this.server.registerChannel('telemetryAppender', new TelemetryAppenderChannel(appenders));
        services.set(ITelemetryService, telemetryService);
        // Custom Endpoint Telemetry
        const customEndpointTelemetryService = new CustomEndpointTelemetryService(configurationService, telemetryService, loggerService, environmentService, productService);
        services.set(ICustomEndpointTelemetryService, customEndpointTelemetryService);
        // Extension Management
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService, undefined, true));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService, undefined, true));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService, undefined, true));
        // Extension Gallery
        services.set(IExtensionGalleryManifestService, new ExtensionGalleryManifestIPCService(this.server, productService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryService, undefined, true));
        // Extension Tips
        services.set(IExtensionTipsService, new SyncDescriptor(ExtensionTipsService, undefined, false /* Eagerly scans and computes exe based recommendations */));
        // Localizations
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService, undefined, false /* proxied to other processes */));
        // Diagnostics
        services.set(IDiagnosticsService, new SyncDescriptor(DiagnosticsService, undefined, false /* proxied to other processes */));
        // Settings Sync
        services.set(IUserDataSyncAccountService, new SyncDescriptor(UserDataSyncAccountService, undefined, true));
        services.set(IUserDataSyncLogService, new SyncDescriptor(UserDataSyncLogService, undefined, true));
        services.set(IUserDataSyncUtilService, ProxyChannel.toService(this.server.getChannel('userDataSyncUtil', client => client.ctx !== 'main')));
        services.set(IGlobalExtensionEnablementService, new SyncDescriptor(GlobalExtensionEnablementService, undefined, false /* Eagerly resets installed extensions */));
        services.set(IIgnoredExtensionsManagementService, new SyncDescriptor(IgnoredExtensionsManagementService, undefined, true));
        services.set(IExtensionStorageService, new SyncDescriptor(ExtensionStorageService));
        services.set(IUserDataSyncStoreManagementService, new SyncDescriptor(UserDataSyncStoreManagementService, undefined, true));
        services.set(IUserDataSyncStoreService, new SyncDescriptor(UserDataSyncStoreService, undefined, true));
        services.set(IUserDataSyncMachinesService, new SyncDescriptor(UserDataSyncMachinesService, undefined, true));
        services.set(IUserDataSyncLocalStoreService, new SyncDescriptor(UserDataSyncLocalStoreService, undefined, false /* Eagerly cleans up old backups */));
        services.set(IUserDataSyncEnablementService, new SyncDescriptor(UserDataSyncEnablementService, undefined, true));
        services.set(IUserDataSyncService, new SyncDescriptor(UserDataSyncService, undefined, false /* Initializes the Sync State */));
        services.set(IUserDataProfileStorageService, new SyncDescriptor(SharedProcessUserDataProfileStorageService, undefined, true));
        services.set(IUserDataSyncResourceProviderService, new SyncDescriptor(UserDataSyncResourceProviderService, undefined, true));
        // Signing
        services.set(ISignService, new SyncDescriptor(SignService, undefined, false /* proxied to other processes */));
        // Tunnel
        const remoteSocketFactoryService = new RemoteSocketFactoryService();
        services.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
        remoteSocketFactoryService.register(0 /* RemoteConnectionType.WebSocket */, nodeSocketFactory);
        services.set(ISharedTunnelsService, new SyncDescriptor(SharedTunnelsService));
        services.set(ISharedProcessTunnelService, new SyncDescriptor(SharedProcessTunnelService));
        // Remote Tunnel
        services.set(IRemoteTunnelService, new SyncDescriptor(RemoteTunnelService));
        // Web Content Extractor
        services.set(ISharedWebContentExtractorService, new SyncDescriptor(SharedWebContentExtractorService));
        return new InstantiationService(services);
    }
    initChannels(accessor) {
        // Extensions Management
        const channel = new ExtensionManagementChannel(accessor.get(IExtensionManagementService), () => null);
        this.server.registerChannel('extensions', channel);
        // Language Packs
        const languagePacksChannel = ProxyChannel.fromService(accessor.get(ILanguagePackService), this._store);
        this.server.registerChannel('languagePacks', languagePacksChannel);
        // Diagnostics
        const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsService), this._store);
        this.server.registerChannel('diagnostics', diagnosticsChannel);
        // Extension Tips
        const extensionTipsChannel = new ExtensionTipsChannel(accessor.get(IExtensionTipsService));
        this.server.registerChannel('extensionTipsService', extensionTipsChannel);
        // Checksum
        const checksumChannel = ProxyChannel.fromService(accessor.get(IChecksumService), this._store);
        this.server.registerChannel('checksum', checksumChannel);
        // Profiling
        const profilingChannel = ProxyChannel.fromService(accessor.get(IV8InspectProfilingService), this._store);
        this.server.registerChannel('v8InspectProfiling', profilingChannel);
        // Settings Sync
        const userDataSyncMachineChannel = ProxyChannel.fromService(accessor.get(IUserDataSyncMachinesService), this._store);
        this.server.registerChannel('userDataSyncMachines', userDataSyncMachineChannel);
        // Custom Endpoint Telemetry
        const customEndpointTelemetryChannel = ProxyChannel.fromService(accessor.get(ICustomEndpointTelemetryService), this._store);
        this.server.registerChannel('customEndpointTelemetry', customEndpointTelemetryChannel);
        const userDataSyncAccountChannel = new UserDataSyncAccountServiceChannel(accessor.get(IUserDataSyncAccountService));
        this.server.registerChannel('userDataSyncAccount', userDataSyncAccountChannel);
        const userDataSyncStoreManagementChannel = new UserDataSyncStoreManagementServiceChannel(accessor.get(IUserDataSyncStoreManagementService));
        this.server.registerChannel('userDataSyncStoreManagement', userDataSyncStoreManagementChannel);
        const userDataSyncChannel = new UserDataSyncServiceChannel(accessor.get(IUserDataSyncService), accessor.get(IUserDataProfilesService), accessor.get(ILogService));
        this.server.registerChannel('userDataSync', userDataSyncChannel);
        const userDataAutoSync = this._register(accessor.get(IInstantiationService).createInstance(UserDataAutoSyncService));
        this.server.registerChannel('userDataAutoSync', ProxyChannel.fromService(userDataAutoSync, this._store));
        this.server.registerChannel('IUserDataSyncResourceProviderService', ProxyChannel.fromService(accessor.get(IUserDataSyncResourceProviderService), this._store));
        // Tunnel
        const sharedProcessTunnelChannel = ProxyChannel.fromService(accessor.get(ISharedProcessTunnelService), this._store);
        this.server.registerChannel(ipcSharedProcessTunnelChannelName, sharedProcessTunnelChannel);
        // Remote Tunnel
        const remoteTunnelChannel = ProxyChannel.fromService(accessor.get(IRemoteTunnelService), this._store);
        this.server.registerChannel('remoteTunnel', remoteTunnelChannel);
        // Web Content Extractor
        const webContentExtractorChannel = ProxyChannel.fromService(accessor.get(ISharedWebContentExtractorService), this._store);
        this.server.registerChannel('sharedWebContentExtractor', webContentExtractorChannel);
    }
    registerErrorHandler(logService) {
        // Listen on global error events
        process.on('uncaughtException', error => onUnexpectedError(error));
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
        // Install handler for unexpected errors
        setUnexpectedErrorHandler(error => {
            const message = toErrorMessage(error, true);
            if (!message) {
                return;
            }
            logService.error(`[uncaught exception in sharedProcess]: ${message}`);
        });
    }
    async reportClientOSInfo(telemetryService, logService) {
        if (isLinux) {
            const [releaseInfo, displayProtocol] = await Promise.all([
                getOSReleaseInfo(logService.error.bind(logService)),
                getDisplayProtocol(logService.error.bind(logService))
            ]);
            const desktopEnvironment = getDesktopEnvironment();
            const codeSessionType = getCodeDisplayProtocol(displayProtocol, this.configuration.args['ozone-platform']);
            if (releaseInfo) {
                telemetryService.publicLog2('clientPlatformInfo', {
                    platformId: releaseInfo.id,
                    platformVersionId: releaseInfo.version_id,
                    platformIdLike: releaseInfo.id_like,
                    desktopEnvironment: desktopEnvironment,
                    displayProtocol: displayProtocol,
                    codeDisplayProtocol: codeSessionType
                });
            }
        }
    }
    handledClientConnection(e) {
        // This filter on message port messages will look for
        // attempts of a window to connect raw to the shared
        // process to handle these connections separate from
        // our IPC based protocol.
        if (e.data !== SharedProcessRawConnection.response) {
            return false;
        }
        const port = e.ports.at(0);
        if (port) {
            this.onDidWindowConnectRaw.fire(port);
            return true;
        }
        return false;
    }
}
export async function main(configuration) {
    // create shared process and signal back to main that we are
    // ready to accept message ports as client connections
    try {
        const sharedProcess = new SharedProcessMain(configuration);
        process.parentPort.postMessage(SharedProcessLifecycle.ipcReady);
        // await initialization and signal this back to electron-main
        await sharedProcess.init();
        process.parentPort.postMessage(SharedProcessLifecycle.initDone);
    }
    catch (error) {
        process.parentPort.postMessage({ error: error.toString() });
    }
}
const handle = setTimeout(() => {
    process.parentPort.postMessage({ warning: '[SharedProcess] did not receive configuration within 30s...' });
}, 30000);
process.parentPort.once('message', (e) => {
    clearTimeout(handle);
    main(e.data);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc01haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi11dGlsaXR5L3NoYXJlZFByb2Nlc3Mvc2hhcmVkUHJvY2Vzc01haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFFdkMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRixPQUFPLEVBQTJCLE1BQU0sSUFBSSwrQkFBK0IsRUFBRSxJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsSSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUM5SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNsSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsMkJBQTJCLEVBQUUscUJBQXFCLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUNqTyxPQUFPLEVBQUUscUNBQXFDLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxxRkFBcUYsQ0FBQztBQUNwTCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUMxSSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUMvSixPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUM1SSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0seURBQXlELENBQUM7QUFDbEgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFlLE1BQU0scUNBQXFDLENBQUM7QUFDOUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDakcsT0FBTyxFQUFFLCtCQUErQixFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDckgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFzQixZQUFZLEVBQUUsb0JBQW9CLEVBQUUsMEJBQTBCLEVBQUUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDak4sT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDcEgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDckksT0FBTyxFQUFFLGtDQUFrQyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDckosT0FBTyxFQUFFLDhCQUE4QixFQUFFLHVCQUF1QixFQUFFLDhCQUE4QixFQUFFLG9CQUFvQixFQUFFLG1DQUFtQyxFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFFLHFCQUFxQixJQUFJLGlDQUFpQyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbFgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdkksT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDdkgsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLHlDQUF5QyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDeEosT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDbEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDMUksT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDdkgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDbkcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0csT0FBTyxFQUFFLGtDQUFrQyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDakosT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDM0gsT0FBTyxFQUFFLDBDQUEwQyxFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDckksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUMvSSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN6RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDakcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDhCQUE4QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDOUksT0FBTyxFQUFFLHVCQUF1QixJQUFJLHlCQUF5QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUgsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDckgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDbEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDdkcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0saUZBQWlGLENBQUM7QUFDbkksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQzVILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDbEosT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDaEksT0FBTyxFQUFFLHVEQUF1RCxFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDM0osT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDMUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDN0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFeEksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDcEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0gsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQzVILE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQ3hJLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBRWxJLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQVF6QyxZQUFvQixhQUEwQztRQUM3RCxLQUFLLEVBQUUsQ0FBQztRQURXLGtCQUFhLEdBQWIsYUFBYSxDQUE2QjtRQU43QyxXQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLCtCQUErQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFNUUscUJBQWdCLEdBQThDLFNBQVMsQ0FBQztRQUUvRCwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFtQixDQUFDLENBQUM7UUFLdkYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLGlCQUFpQjtRQUV4QiwyQkFBMkI7UUFDM0IsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLE1BQU0sTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNuQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQztnQkFFZixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hCLENBQUM7UUFDRixDQUFDLENBQUM7UUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJO1FBRVQsV0FBVztRQUNYLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFdkQsU0FBUztRQUNULGlDQUFpQyxFQUFFLENBQUM7UUFFcEMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzlDLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFekQsV0FBVztZQUNYLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUVwRixXQUFXO1lBQ1gsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUU1QixnQkFBZ0I7WUFDaEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXRDLDJCQUEyQjtZQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdkQsQ0FBQyxDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FDaEMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEVBQ3ZGLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxFQUNsRSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUNBQWlDLENBQUMsRUFDdEUsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxFQUNwRCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsRUFDekQsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEVBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUM1RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FDakUsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUV6QyxVQUFVO1FBQ1YsTUFBTSxjQUFjLEdBQUcsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxFQUFFLENBQUM7UUFDaEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFOUMsZUFBZTtRQUNmLE1BQU0sVUFBVSxHQUFHLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLE1BQU0sQ0FBQyxDQUFDO1FBQzNELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzNFLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUV0RCxXQUFXO1FBQ1gsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUNwTCxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUU1QyxjQUFjO1FBQ2QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHdCQUF3QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUU1RCxTQUFTO1FBQ1QsTUFBTSxhQUFhLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsa0JBQWtCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLGNBQWMsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDdFIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFNUMsTUFBTTtRQUNOLE1BQU0sY0FBYyxHQUFnQixFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUM1RixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3SSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFdEMsWUFBWTtRQUNaLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksNkJBQTZCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN0RixRQUFRLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXBFLFFBQVE7UUFDUixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDaEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFeEMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN0RixXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBRW5FLGVBQWU7UUFDZixNQUFNLGtCQUFrQixHQUFHLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDL0QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXRELHFCQUFxQjtRQUNyQixNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOVEsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBRWhFLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLG9CQUFvQixDQUN6RSxPQUFPLENBQUMsSUFBSTtRQUNaLGdFQUFnRTtRQUNoRSxnRUFBZ0U7UUFDaEUsNkRBQTZEO1FBQzdELGlFQUFpRTtRQUNqRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksNEJBQTRCLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQy9JLE9BQU8sQ0FBQyxjQUFjLEVBQ3RCLHVCQUF1QixFQUN2QixrQkFBa0IsRUFDbEIsVUFBVSxDQUNWLENBQUMsQ0FBQztRQUNILFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFFakYsZ0JBQWdCO1FBQ2hCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdkssUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRTFELCtCQUErQjtRQUMvQixNQUFNLGNBQWMsR0FBRyxJQUFJLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDdk4sUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzRCwwQ0FBMEM7UUFDMUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2pCLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtZQUNqQyxjQUFjLENBQUMsVUFBVSxFQUFFO1NBQzNCLENBQUMsQ0FBQztRQUVILFVBQVU7UUFDVixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JKLE1BQU0sY0FBYyxHQUFHLElBQUksY0FBYyxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25JLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRTlDLFdBQVc7UUFDWCxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLElBQUksY0FBYyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUV2SCxzQkFBc0I7UUFDdEIsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUUzSSxjQUFjO1FBQ2QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLG9EQUFvRCxFQUFFLGtCQUFrQixDQUF1QixDQUFDO1FBQ25KLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVwRCxXQUFXO1FBQ1gsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFckYsNEJBQTRCO1FBQzVCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUN2RixNQUFNLGtCQUFrQixHQUFHLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuSCxRQUFRLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxFQUFFLElBQUksdURBQXVELENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMscUNBQXFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFMU0sWUFBWTtRQUNaLElBQUksZ0JBQW1DLENBQUM7UUFDeEMsTUFBTSxTQUFTLEdBQXlCLEVBQUUsQ0FBQztRQUMzQyxNQUFNLGlCQUFpQixHQUFHLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3BGLElBQUksaUJBQWlCLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUMzRCxNQUFNLFdBQVcsR0FBRyxJQUFJLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzNHLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDNUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxjQUFjLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDO2dCQUM1RixNQUFNLGlCQUFpQixHQUFHLElBQUkscUJBQXFCLENBQUMsY0FBYyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNqSixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyx3RUFBd0U7Z0JBQ3ZJLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBRUQsZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQztnQkFDdkMsU0FBUztnQkFDVCxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQztnQkFDeE8sa0JBQWtCLEVBQUUsSUFBSTtnQkFDeEIsUUFBUSxFQUFFLDBCQUEwQixDQUFDLGtCQUFrQixDQUFDO2FBQ3hELEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDMUMsQ0FBQzthQUFNLENBQUM7WUFDUCxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQztZQUN4QyxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUM7WUFDbEMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzFGLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVsRCw0QkFBNEI7UUFDNUIsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLDhCQUE4QixDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNySyxRQUFRLENBQUMsR0FBRyxDQUFDLCtCQUErQixFQUFFLDhCQUE4QixDQUFDLENBQUM7UUFFOUUsdUJBQXVCO1FBQ3ZCLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxjQUFjLENBQUMsK0JBQStCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckgsUUFBUSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyx3QkFBd0IsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2RyxRQUFRLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxFQUFFLElBQUksY0FBYyxDQUFDLHFDQUFxQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pJLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsSUFBSSxjQUFjLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsRUFBRSxJQUFJLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUV2SCxvQkFBb0I7UUFDcEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUNwSCxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLElBQUksY0FBYyxDQUFDLHVCQUF1QixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXJHLGlCQUFpQjtRQUNqQixRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLElBQUksY0FBYyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsMERBQTBELENBQUMsQ0FBQyxDQUFDO1FBRTNKLGdCQUFnQjtRQUNoQixRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLElBQUksY0FBYyxDQUFDLHlCQUF5QixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBRXJJLGNBQWM7UUFDZCxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLElBQUksY0FBYyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBRTdILGdCQUFnQjtRQUNoQixRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLElBQUksY0FBYyxDQUFDLDBCQUEwQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxjQUFjLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbkcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxnQ0FBZ0MsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUMsQ0FBQztRQUNsSyxRQUFRLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLElBQUksY0FBYyxDQUFDLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNILFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUNBQW1DLEVBQUUsSUFBSSxjQUFjLENBQUMsa0NBQWtDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0gsUUFBUSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyx3QkFBd0IsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2RyxRQUFRLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLElBQUksY0FBYyxDQUFDLDJCQUEyQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdHLFFBQVEsQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsSUFBSSxjQUFjLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUM7UUFDdEosUUFBUSxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLGNBQWMsQ0FBQyw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqSCxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLElBQUksY0FBYyxDQUFDLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBQy9ILFFBQVEsQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsSUFBSSxjQUFjLENBQUMsMENBQTBDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDOUgsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxJQUFJLGNBQWMsQ0FBQyxtQ0FBbUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUU3SCxVQUFVO1FBQ1YsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxjQUFjLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBRS9HLFNBQVM7UUFDVCxNQUFNLDBCQUEwQixHQUFHLElBQUksMEJBQTBCLEVBQUUsQ0FBQztRQUNwRSxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDdEUsMEJBQTBCLENBQUMsUUFBUSx5Q0FBaUMsaUJBQWlCLENBQUMsQ0FBQztRQUN2RixRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLElBQUksY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUM5RSxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLElBQUksY0FBYyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUUxRixnQkFBZ0I7UUFDaEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFFNUUsd0JBQXdCO1FBQ3hCLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxjQUFjLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBRXRHLE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRU8sWUFBWSxDQUFDLFFBQTBCO1FBRTlDLHdCQUF3QjtRQUN4QixNQUFNLE9BQU8sR0FBRyxJQUFJLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbkQsaUJBQWlCO1FBQ2pCLE1BQU0sb0JBQW9CLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRW5FLGNBQWM7UUFDZCxNQUFNLGtCQUFrQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUUvRCxpQkFBaUI7UUFDakIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQzNGLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFMUUsV0FBVztRQUNYLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFekQsWUFBWTtRQUNaLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFcEUsZ0JBQWdCO1FBQ2hCLE1BQU0sMEJBQTBCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JILElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFFaEYsNEJBQTRCO1FBQzVCLE1BQU0sOEJBQThCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVILElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLHlCQUF5QixFQUFFLDhCQUE4QixDQUFDLENBQUM7UUFFdkYsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLGlDQUFpQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO1FBQ3BILElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLHFCQUFxQixFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFFL0UsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLHlDQUF5QyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDO1FBQzVJLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLDZCQUE2QixFQUFFLGtDQUFrQyxDQUFDLENBQUM7UUFFL0YsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2xLLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBRWpFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUNySCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRXpHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLHNDQUFzQyxFQUFFLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRS9KLFNBQVM7UUFDVCxNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwSCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxpQ0FBaUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBRTNGLGdCQUFnQjtRQUNoQixNQUFNLG1CQUFtQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUVqRSx3QkFBd0I7UUFDeEIsTUFBTSwwQkFBMEIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsMkJBQTJCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRU8sb0JBQW9CLENBQUMsVUFBdUI7UUFFbkQsZ0NBQWdDO1FBQ2hDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFakYsd0NBQXdDO1FBQ3hDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2pDLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE9BQU87WUFDUixDQUFDO1lBRUQsVUFBVSxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsZ0JBQW1DLEVBQUUsVUFBdUI7UUFDNUYsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUN4RCxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDbkQsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDckQsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO1lBQ25ELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDM0csSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFtQmpCLGdCQUFnQixDQUFDLFVBQVUsQ0FBNEQsb0JBQW9CLEVBQUU7b0JBQzVHLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFBRTtvQkFDMUIsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLFVBQVU7b0JBQ3pDLGNBQWMsRUFBRSxXQUFXLENBQUMsT0FBTztvQkFDbkMsa0JBQWtCLEVBQUUsa0JBQWtCO29CQUN0QyxlQUFlLEVBQUUsZUFBZTtvQkFDaEMsbUJBQW1CLEVBQUUsZUFBZTtpQkFDcEMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsdUJBQXVCLENBQUMsQ0FBZTtRQUV0QyxxREFBcUQ7UUFDckQsb0RBQW9EO1FBQ3BELG9EQUFvRDtRQUNwRCwwQkFBMEI7UUFFMUIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXRDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxJQUFJLENBQUMsYUFBMEM7SUFFcEUsNERBQTREO0lBQzVELHNEQUFzRDtJQUV0RCxJQUFJLENBQUM7UUFDSixNQUFNLGFBQWEsR0FBRyxJQUFJLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzNELE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRWhFLDZEQUE2RDtRQUM3RCxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUUzQixPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdELENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUM5QixPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBRSw2REFBNkQsRUFBRSxDQUFDLENBQUM7QUFDNUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRVYsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBd0IsRUFBRSxFQUFFO0lBQy9ELFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyQixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQW1DLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyJ9