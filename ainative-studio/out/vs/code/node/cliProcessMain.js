/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { hostname, release } from 'os';
import { raceTimeout } from '../../base/common/async.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler } from '../../base/common/errors.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { Schemas } from '../../base/common/network.js';
import { isAbsolute, join } from '../../base/common/path.js';
import { isWindows, isMacintosh } from '../../base/common/platform.js';
import { cwd } from '../../base/common/process.js';
import { URI } from '../../base/common/uri.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { DownloadService } from '../../platform/download/common/downloadService.js';
import { INativeEnvironmentService } from '../../platform/environment/common/environment.js';
import { NativeEnvironmentService } from '../../platform/environment/node/environmentService.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { ExtensionsScannerService } from '../../platform/extensionManagement/node/extensionsScannerService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { ConsoleLogger, getLogLevel, ILoggerService, ILogService, LogLevel } from '../../platform/log/common/log.js';
import { FilePolicyService } from '../../platform/policy/common/filePolicyService.js';
import { IPolicyService, NullPolicyService } from '../../platform/policy/common/policy.js';
import { NativePolicyService } from '../../platform/policy/node/nativePolicyService.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { StateReadonlyService } from '../../platform/state/node/stateService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { TelemetryService } from '../../platform/telemetry/common/telemetryService.js';
import { supportsTelemetry, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry } from '../../platform/telemetry/common/telemetryUtils.js';
import { OneDataSystemAppender } from '../../platform/telemetry/node/1dsAppender.js';
import { buildTelemetryMessage } from '../../platform/telemetry/node/telemetry.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfilesReadonlyService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { resolveMachineId, resolveSqmId, resolvedevDeviceId } from '../../platform/telemetry/node/telemetryUtils.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { localize } from '../../nls.js';
import { FileUserDataProvider } from '../../platform/userData/common/fileUserDataProvider.js';
import { addUNCHostToAllowlist, getUNCHost } from '../../base/node/unc.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { McpManagementCli } from '../../platform/mcp/common/mcpManagementCli.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifestService.js';
class CliMain extends Disposable {
    constructor(argv) {
        super();
        this.argv = argv;
        this.registerListeners();
    }
    registerListeners() {
        // Dispose on exit
        process.once('exit', () => this.dispose());
    }
    async run() {
        // Services
        const [instantiationService, appenders] = await this.initServices();
        return instantiationService.invokeFunction(async (accessor) => {
            const logService = accessor.get(ILogService);
            const fileService = accessor.get(IFileService);
            const environmentService = accessor.get(INativeEnvironmentService);
            const userDataProfilesService = accessor.get(IUserDataProfilesService);
            // Log info
            logService.info('CLI main', this.argv);
            // Error handler
            this.registerErrorHandler(logService);
            // Run based on argv
            await this.doRun(environmentService, fileService, userDataProfilesService, instantiationService);
            // Flush the remaining data in AI adapter (with 1s timeout)
            await Promise.all(appenders.map(a => {
                raceTimeout(a.flush(), 1000);
            }));
            return;
        });
    }
    async initServices() {
        const services = new ServiceCollection();
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Environment
        const environmentService = new NativeEnvironmentService(this.argv, productService);
        services.set(INativeEnvironmentService, environmentService);
        // Init folders
        await Promise.all([
            this.allowWindowsUNCPath(environmentService.appSettingsHome.with({ scheme: Schemas.file }).fsPath),
            this.allowWindowsUNCPath(environmentService.extensionsPath)
        ].map(path => path ? fs.promises.mkdir(path, { recursive: true }) : undefined));
        // Logger
        const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
        services.set(ILoggerService, loggerService);
        // Log
        const logger = this._register(loggerService.createLogger('cli', { name: localize('cli', "CLI") }));
        const otherLoggers = [];
        if (loggerService.getLogLevel() === LogLevel.Trace) {
            otherLoggers.push(new ConsoleLogger(loggerService.getLogLevel()));
        }
        const logService = this._register(new LogService(logger, otherLoggers));
        services.set(ILogService, logService);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService));
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // Uri Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const stateService = new StateReadonlyService(1 /* SaveStrategy.DELAYED */, environmentService, logService, fileService);
        const userDataProfilesService = new UserDataProfilesReadonlyService(stateService, uriIdentityService, environmentService, fileService, logService);
        services.set(IUserDataProfilesService, userDataProfilesService);
        // Use FileUserDataProvider for user data to
        // enable atomic read / write operations.
        fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        // Policy
        let policyService;
        if (isWindows && productService.win32RegValueName) {
            policyService = this._register(new NativePolicyService(logService, productService.win32RegValueName));
        }
        else if (isMacintosh && productService.darwinBundleIdentifier) {
            policyService = this._register(new NativePolicyService(logService, productService.darwinBundleIdentifier));
        }
        else if (environmentService.policyFile) {
            policyService = this._register(new FilePolicyService(environmentService.policyFile, fileService, logService));
        }
        else {
            policyService = new NullPolicyService();
        }
        services.set(IPolicyService, policyService);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, policyService, logService));
        services.set(IConfigurationService, configurationService);
        // Initialize
        await Promise.all([
            stateService.init(),
            configurationService.initialize()
        ]);
        // Get machine ID
        let machineId = undefined;
        try {
            machineId = await resolveMachineId(stateService, logService);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                logService.error(error);
            }
        }
        const sqmId = await resolveSqmId(stateService, logService);
        const devDeviceId = await resolvedevDeviceId(stateService, logService);
        // Initialize user data profiles after initializing the state
        userDataProfilesService.init();
        // URI Identity
        services.set(IUriIdentityService, new UriIdentityService(fileService));
        // Request
        const requestService = new RequestService('local', configurationService, environmentService, logService);
        services.set(IRequestService, requestService);
        // Download Service
        services.set(IDownloadService, new SyncDescriptor(DownloadService, undefined, true));
        // Extensions
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService, undefined, true));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService, undefined, true));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService, undefined, true));
        services.set(IExtensionGalleryManifestService, new SyncDescriptor(ExtensionGalleryManifestService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService, undefined, true));
        // Localizations
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService, undefined, false));
        // Telemetry
        const appenders = [];
        const isInternal = isInternalTelemetry(productService, configurationService);
        if (supportsTelemetry(productService, environmentService)) {
            if (productService.aiConfig && productService.aiConfig.ariaKey) {
                appenders.push(new OneDataSystemAppender(requestService, isInternal, 'monacoworkbench', null, productService.aiConfig.ariaKey));
            }
            const config = {
                appenders,
                sendErrorTelemetry: false,
                commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version, machineId, sqmId, devDeviceId, isInternal),
                piiPaths: getPiiPathsFromEnvironment(environmentService)
            };
            services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config], false));
        }
        else {
            services.set(ITelemetryService, NullTelemetryService);
        }
        return [new InstantiationService(services), appenders];
    }
    allowWindowsUNCPath(path) {
        if (isWindows) {
            const host = getUNCHost(path);
            if (host) {
                addUNCHostToAllowlist(host);
            }
        }
        return path;
    }
    registerErrorHandler(logService) {
        // Install handler for unexpected errors
        setUnexpectedErrorHandler(error => {
            const message = toErrorMessage(error, true);
            if (!message) {
                return;
            }
            logService.error(`[uncaught exception in CLI]: ${message}`);
        });
        // Handle unhandled errors that can occur
        process.on('uncaughtException', err => {
            if (!isSigPipeError(err)) {
                onUnexpectedError(err);
            }
        });
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
    }
    async doRun(environmentService, fileService, userDataProfilesService, instantiationService) {
        let profile = undefined;
        if (environmentService.args.profile) {
            profile = userDataProfilesService.profiles.find(p => p.name === environmentService.args.profile);
            if (!profile) {
                throw new Error(`Profile '${environmentService.args.profile}' not found.`);
            }
        }
        const profileLocation = (profile ?? userDataProfilesService.defaultProfile).extensionsResource;
        // List Extensions
        if (this.argv['list-extensions']) {
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).listExtensions(!!this.argv['show-versions'], this.argv['category'], profileLocation);
        }
        // Install Extension
        else if (this.argv['install-extension'] || this.argv['install-builtin-extension']) {
            const installOptions = { isMachineScoped: !!this.argv['do-not-sync'], installPreReleaseVersion: !!this.argv['pre-release'], donotIncludePackAndDependencies: !!this.argv['do-not-include-pack-dependencies'], profileLocation };
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).installExtensions(this.asExtensionIdOrVSIX(this.argv['install-extension'] || []), this.asExtensionIdOrVSIX(this.argv['install-builtin-extension'] || []), installOptions, !!this.argv['force']);
        }
        // Uninstall Extension
        else if (this.argv['uninstall-extension']) {
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).uninstallExtensions(this.asExtensionIdOrVSIX(this.argv['uninstall-extension']), !!this.argv['force'], profileLocation);
        }
        else if (this.argv['update-extensions']) {
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).updateExtensions(profileLocation);
        }
        // Locate Extension
        else if (this.argv['locate-extension']) {
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).locateExtension(this.argv['locate-extension']);
        }
        // Install MCP server
        else if (this.argv['add-mcp']) {
            return instantiationService.createInstance(McpManagementCli, new ConsoleLogger(LogLevel.Info, false)).addMcpDefinitions(this.argv['add-mcp']);
        }
        // Telemetry
        else if (this.argv['telemetry']) {
            console.log(await buildTelemetryMessage(environmentService.appRoot, environmentService.extensionsPath));
        }
    }
    asExtensionIdOrVSIX(inputs) {
        return inputs.map(input => /\.vsix$/i.test(input) ? URI.file(isAbsolute(input) ? input : join(cwd(), input)) : input);
    }
}
export async function main(argv) {
    const cliMain = new CliMain(argv);
    try {
        await cliMain.run();
    }
    finally {
        cliMain.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpUHJvY2Vzc01haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9ub2RlL2NsaVByb2Nlc3NNYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FB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