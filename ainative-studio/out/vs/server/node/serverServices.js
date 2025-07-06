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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyU2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9zZXJ2ZXJTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFtQixZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkQsT0FBTyxLQUFLLElBQUksTUFBTSwyQkFBMkIsQ0FBQztBQUVsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEQsT0FBTyxFQUFrRCxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFN0gsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEgsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sc0VB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