/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostname, release } from 'os';
import { Emitter } from '../../base/common/event.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { Schemas } from '../../base/common/network.js';
import * as path from '../../base/common/path.js';
import { getMachineId, getSqmMachineId, getdevDeviceId } from '../../base/node/id.js';
import { Promises } from '../../base/node/pfs.js';
import { IPCServer, StaticRouter } from '../../base/parts/ipc/common/ipc.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { ExtensionHostDebugBroadcastChannel } from '../../platform/debug/common/extensionHostDebugIpc.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { DownloadServiceChannelClient } from '../../platform/download/common/downloadIpc.js';
import { IEnvironmentService, INativeEnvironmentService } from '../../platform/environment/common/environment.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { ExtensionManagementChannel } from '../../platform/extensionManagement/common/extensionManagementIpc.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { AbstractLogger, DEFAULT_LOG_LEVEL, getLogLevel, ILoggerService, ILogService, log, LogLevel, LogLevelToString } from '../../platform/log/common/log.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestChannel } from '../../platform/request/common/requestIpc.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { getPiiPathsFromEnvironment, isInternalTelemetry, isLoggingOnly, NullAppender, supportsTelemetry } from '../../platform/telemetry/common/telemetryUtils.js';
import ErrorTelemetry from '../../platform/telemetry/node/errorTelemetry.js';
import { IPtyService } from '../../platform/terminal/common/terminal.js';
import { PtyHostService } from '../../platform/terminal/node/ptyHostService.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { RemoteAgentEnvironmentChannel } from './remoteAgentEnvironmentImpl.js';
import { RemoteAgentFileSystemProviderChannel } from './remoteFileSystemProviderServer.js';
import { ServerTelemetryChannel } from '../../platform/telemetry/common/remoteTelemetryChannel.js';
import { IServerTelemetryService, ServerNullTelemetryService, ServerTelemetryService } from '../../platform/telemetry/common/serverTelemetryService.js';
import { RemoteTerminalChannel } from './remoteTerminalChannel.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { ServerEnvironmentService } from './serverEnvironmentService.js';
import { REMOTE_TERMINAL_CHANNEL_NAME } from '../../workbench/contrib/terminal/common/remote/remoteTerminalChannel.js';
import { REMOTE_FILE_SYSTEM_CHANNEL_NAME } from '../../workbench/services/remote/common/remoteFileSystemProviderClient.js';
import { ExtensionHostStatusService, IExtensionHostStatusService } from './extensionHostStatusService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from './extensionsScannerService.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../platform/policy/common/policy.js';
import { OneDataSystemAppender } from '../../platform/telemetry/node/1dsAppender.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { ServerUserDataProfilesService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerChannel } from '../../platform/log/common/logIpc.js';
import { localize } from '../../nls.js';
import { RemoteExtensionsScannerChannel, RemoteExtensionsScannerService } from './remoteExtensionsScanner.js';
import { RemoteExtensionsScannerChannelName } from '../../platform/remote/common/remoteExtensionsScanner.js';
import { RemoteUserDataProfilesServiceChannel } from '../../platform/userDataProfile/common/userDataProfileIpc.js';
import { NodePtyHostStarter } from '../../platform/terminal/node/nodePtyHostStarter.js';
import { CSSDevelopmentService, ICSSDevelopmentService } from '../../platform/cssDev/node/cssDevService.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { TelemetryLogAppender } from '../../platform/telemetry/common/telemetryLogAppender.js';
import { INativeMcpDiscoveryHelperService, NativeMcpDiscoveryHelperChannelName } from '../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { NativeMcpDiscoveryHelperChannel } from '../../platform/mcp/node/nativeMcpDiscoveryHelperChannel.js';
import { NativeMcpDiscoveryHelperService } from '../../platform/mcp/node/nativeMcpDiscoveryHelperService.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestIPCService } from '../../platform/extensionManagement/common/extensionGalleryManifestServiceIpc.js';
const eventPrefix = 'monacoworkbench';
export async function setupServerServices(connectionToken, args, REMOTE_DATA_FOLDER, disposables) {
    const services = new ServiceCollection();
    const socketServer = new SocketServer();
    const productService = { _serviceBrand: undefined, ...product };
    services.set(IProductService, productService);
    const environmentService = new ServerEnvironmentService(args, productService);
    services.set(IEnvironmentService, environmentService);
    services.set(INativeEnvironmentService, environmentService);
    const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
    services.set(ILoggerService, loggerService);
    socketServer.registerChannel('logger', new LoggerChannel(loggerService, (ctx) => getUriTransformer(ctx.remoteAuthority)));
    const logger = loggerService.createLogger('remoteagent', { name: localize('remoteExtensionLog', "Server") });
    const logService = new LogService(logger, [new ServerLogger(getLogLevel(environmentService))]);
    services.set(ILogService, logService);
    setTimeout(() => cleanupOlderLogs(environmentService.logsHome.with({ scheme: Schemas.file }).fsPath).then(null, err => logService.error(err)), 10000);
    logService.onDidChangeLogLevel(logLevel => log(logService, logLevel, `Log level changed to ${LogLevelToString(logService.getLevel())}`));
    logService.trace(`Remote configuration data at ${REMOTE_DATA_FOLDER}`);
    logService.trace('process arguments:', environmentService.args);
    if (Array.isArray(productService.serverGreeting)) {
        logService.info(`\n\n${productService.serverGreeting.join('\n')}\n\n`);
    }
    // ExtensionHost Debug broadcast service
    socketServer.registerChannel(ExtensionHostDebugBroadcastChannel.ChannelName, new ExtensionHostDebugBroadcastChannel());
    // TODO: @Sandy @Joao need dynamic context based router
    const router = new StaticRouter(ctx => ctx.clientId === 'renderer');
    // Files
    const fileService = disposables.add(new FileService(logService));
    services.set(IFileService, fileService);
    fileService.registerProvider(Schemas.file, disposables.add(new DiskFileSystemProvider(logService)));
    // URI Identity
    const uriIdentityService = new UriIdentityService(fileService);
    services.set(IUriIdentityService, uriIdentityService);
    // Configuration
    const configurationService = new ConfigurationService(environmentService.machineSettingsResource, fileService, new NullPolicyService(), logService);
    services.set(IConfigurationService, configurationService);
    // User Data Profiles
    const userDataProfilesService = new ServerUserDataProfilesService(uriIdentityService, environmentService, fileService, logService);
    services.set(IUserDataProfilesService, userDataProfilesService);
    socketServer.registerChannel('userDataProfiles', new RemoteUserDataProfilesServiceChannel(userDataProfilesService, (ctx) => getUriTransformer(ctx.remoteAuthority)));
    // Dev Only: CSS service (for ESM)
    services.set(ICSSDevelopmentService, new SyncDescriptor(CSSDevelopmentService, undefined, true));
    // Initialize
    const [, , machineId, sqmId, devDeviceId] = await Promise.all([
        configurationService.initialize(),
        userDataProfilesService.init(),
        getMachineId(logService.error.bind(logService)),
        getSqmMachineId(logService.error.bind(logService)),
        getdevDeviceId(logService.error.bind(logService))
    ]);
    const extensionHostStatusService = new ExtensionHostStatusService();
    services.set(IExtensionHostStatusService, extensionHostStatusService);
    // Request
    const requestService = new RequestService('remote', configurationService, environmentService, logService);
    services.set(IRequestService, requestService);
    let oneDsAppender = NullAppender;
    const isInternal = isInternalTelemetry(productService, configurationService);
    if (supportsTelemetry(productService, environmentService)) {
        if (!isLoggingOnly(productService, environmentService) && productService.aiConfig?.ariaKey) {
            oneDsAppender = new OneDataSystemAppender(requestService, isInternal, eventPrefix, null, productService.aiConfig.ariaKey);
            disposables.add(toDisposable(() => oneDsAppender?.flush())); // Ensure the AI appender is disposed so that it flushes remaining data
        }
        const config = {
            appenders: [oneDsAppender, new TelemetryLogAppender('', true, loggerService, environmentService, productService)],
            commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version + '-remote', machineId, sqmId, devDeviceId, isInternal, 'remoteAgent'),
            piiPaths: getPiiPathsFromEnvironment(environmentService)
        };
        const initialTelemetryLevelArg = environmentService.args['telemetry-level'];
        let injectedTelemetryLevel = 3 /* TelemetryLevel.USAGE */;
        // Convert the passed in CLI argument into a telemetry level for the telemetry service
        if (initialTelemetryLevelArg === 'all') {
            injectedTelemetryLevel = 3 /* TelemetryLevel.USAGE */;
        }
        else if (initialTelemetryLevelArg === 'error') {
            injectedTelemetryLevel = 2 /* TelemetryLevel.ERROR */;
        }
        else if (initialTelemetryLevelArg === 'crash') {
            injectedTelemetryLevel = 1 /* TelemetryLevel.CRASH */;
        }
        else if (initialTelemetryLevelArg !== undefined) {
            injectedTelemetryLevel = 0 /* TelemetryLevel.NONE */;
        }
        services.set(IServerTelemetryService, new SyncDescriptor(ServerTelemetryService, [config, injectedTelemetryLevel]));
    }
    else {
        services.set(IServerTelemetryService, ServerNullTelemetryService);
    }
    services.set(IExtensionGalleryManifestService, new ExtensionGalleryManifestIPCService(socketServer, productService));
    services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService));
    const downloadChannel = socketServer.getChannel('download', router);
    services.set(IDownloadService, new DownloadServiceChannelClient(downloadChannel, () => getUriTransformer('renderer') /* TODO: @Sandy @Joao need dynamic context based router */));
    services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService));
    services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService));
    services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService));
    services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService));
    services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService));
    services.set(INativeMcpDiscoveryHelperService, new SyncDescriptor(NativeMcpDiscoveryHelperService));
    const instantiationService = new InstantiationService(services);
    services.set(ILanguagePackService, instantiationService.createInstance(NativeLanguagePackService));
    const ptyHostStarter = instantiationService.createInstance(NodePtyHostStarter, {
        graceTime: 10800000 /* ProtocolConstants.ReconnectionGraceTime */,
        shortGraceTime: 300000 /* ProtocolConstants.ReconnectionShortGraceTime */,
        scrollback: configurationService.getValue("terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */) ?? 100
    });
    const ptyHostService = instantiationService.createInstance(PtyHostService, ptyHostStarter);
    services.set(IPtyService, ptyHostService);
    instantiationService.invokeFunction(accessor => {
        const extensionManagementService = accessor.get(INativeServerExtensionManagementService);
        const extensionsScannerService = accessor.get(IExtensionsScannerService);
        const extensionGalleryService = accessor.get(IExtensionGalleryService);
        const languagePackService = accessor.get(ILanguagePackService);
        const remoteExtensionEnvironmentChannel = new RemoteAgentEnvironmentChannel(connectionToken, environmentService, userDataProfilesService, extensionHostStatusService);
        socketServer.registerChannel('remoteextensionsenvironment', remoteExtensionEnvironmentChannel);
        const telemetryChannel = new ServerTelemetryChannel(accessor.get(IServerTelemetryService), oneDsAppender);
        socketServer.registerChannel('telemetry', telemetryChannel);
        socketServer.registerChannel(REMOTE_TERMINAL_CHANNEL_NAME, new RemoteTerminalChannel(environmentService, logService, ptyHostService, productService, extensionManagementService, configurationService));
        const remoteExtensionsScanner = new RemoteExtensionsScannerService(instantiationService.createInstance(ExtensionManagementCLI, logService), environmentService, userDataProfilesService, extensionsScannerService, logService, extensionGalleryService, languagePackService, extensionManagementService);
        socketServer.registerChannel(RemoteExtensionsScannerChannelName, new RemoteExtensionsScannerChannel(remoteExtensionsScanner, (ctx) => getUriTransformer(ctx.remoteAuthority)));
        socketServer.registerChannel(NativeMcpDiscoveryHelperChannelName, instantiationService.createInstance(NativeMcpDiscoveryHelperChannel, (ctx) => getUriTransformer(ctx.remoteAuthority)));
        const remoteFileSystemChannel = disposables.add(new RemoteAgentFileSystemProviderChannel(logService, environmentService, configurationService));
        socketServer.registerChannel(REMOTE_FILE_SYSTEM_CHANNEL_NAME, remoteFileSystemChannel);
        socketServer.registerChannel('request', new RequestChannel(accessor.get(IRequestService)));
        const channel = new ExtensionManagementChannel(extensionManagementService, (ctx) => getUriTransformer(ctx.remoteAuthority));
        socketServer.registerChannel('extensions', channel);
        // clean up extensions folder
        remoteExtensionsScanner.whenExtensionsReady().then(() => extensionManagementService.cleanUp());
        disposables.add(new ErrorTelemetry(accessor.get(ITelemetryService)));
        return {
            telemetryService: accessor.get(ITelemetryService)
        };
    });
    return { socketServer, instantiationService };
}
const _uriTransformerCache = Object.create(null);
function getUriTransformer(remoteAuthority) {
    if (!_uriTransformerCache[remoteAuthority]) {
        _uriTransformerCache[remoteAuthority] = createURITransformer(remoteAuthority);
    }
    return _uriTransformerCache[remoteAuthority];
}
export class SocketServer extends IPCServer {
    constructor() {
        const emitter = new Emitter();
        super(emitter.event);
        this._onDidConnectEmitter = emitter;
    }
    acceptConnection(protocol, onDidClientDisconnect) {
        this._onDidConnectEmitter.fire({ protocol, onDidClientDisconnect });
    }
}
class ServerLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.setLevel(logLevel);
        this.useColors = Boolean(process.stdout.isTTY);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            if (this.useColors) {
                console.warn(`\x1b[93m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.warn(`[${now()}]`, message, ...args);
            }
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (this.useColors) {
                console.error(`\x1b[91m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.error(`[${now()}]`, message, ...args);
            }
        }
    }
    flush() {
        // noop
    }
}
function now() {
    const date = new Date();
    return `${twodigits(date.getHours())}:${twodigits(date.getMinutes())}:${twodigits(date.getSeconds())}`;
}
function twodigits(n) {
    if (n < 10) {
        return `0${n}`;
    }
    return String(n);
}
/**
 * Cleans up older logs, while keeping the 10 most recent ones.
 */
async function cleanupOlderLogs(logsPath) {
    const currentLog = path.basename(logsPath);
    const logsRoot = path.dirname(logsPath);
    const children = await Promises.readdir(logsRoot);
    const allSessions = children.filter(name => /^\d{8}T\d{6}$/.test(name));
    const oldSessions = allSessions.sort().filter((d) => d !== currentLog);
    const toDelete = oldSessions.slice(0, Math.max(0, oldSessions.length - 9));
    await Promise.all(toDelete.map(name => Promises.rm(path.join(logsRoot, name))));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyU2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvc2VydmVyU2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sRUFBbUIsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZELE9BQU8sS0FBSyxJQUFJLE1BQU0sMkJBQTJCLENBQUM7QUFFbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xELE9BQU8sRUFBa0QsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xILE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLHNF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