/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ConsoleLogger, getLogLevel, ILoggerService, ILogService } from '../../platform/log/common/log.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { NullTelemetryService } from '../../platform/telemetry/common/telemetryUtils.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { IAllowedExtensionsService, IExtensionGalleryService } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import product from '../../platform/product/common/product.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { Schemas } from '../../base/common/network.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IServerEnvironmentService, ServerEnvironmentService } from './serverEnvironmentService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { getErrorMessage } from '../../base/common/errors.js';
import { URI } from '../../base/common/uri.js';
import { isAbsolute, join } from '../../base/common/path.js';
import { cwd } from '../../base/common/process.js';
import { DownloadService } from '../../platform/download/common/downloadService.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { buildHelpMessage, buildVersionMessage } from '../../platform/environment/node/argv.js';
import { isWindows } from '../../base/common/platform.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from './extensionsScannerService.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { NullPolicyService } from '../../platform/policy/common/policy.js';
import { ServerUserDataProfilesService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { localize } from '../../nls.js';
import { addUNCHostToAllowlist, disableUNCAccessRestrictions } from '../../base/node/unc.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifestService.js';
class CliMain extends Disposable {
    constructor(args, remoteDataFolder) {
        super();
        this.args = args;
        this.remoteDataFolder = remoteDataFolder;
        this.registerListeners();
    }
    registerListeners() {
        // Dispose on exit
        process.once('exit', () => this.dispose());
    }
    async run() {
        const instantiationService = await this.initServices();
        await instantiationService.invokeFunction(async (accessor) => {
            const configurationService = accessor.get(IConfigurationService);
            const logService = accessor.get(ILogService);
            // On Windows, configure the UNC allow list based on settings
            if (isWindows) {
                if (configurationService.getValue('security.restrictUNCAccess') === false) {
                    disableUNCAccessRestrictions();
                }
                else {
                    addUNCHostToAllowlist(configurationService.getValue('security.allowedUNCHosts'));
                }
            }
            try {
                await this.doRun(instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(logService.getLevel(), false)));
            }
            catch (error) {
                logService.error(error);
                console.error(getErrorMessage(error));
                throw error;
            }
        });
    }
    async initServices() {
        const services = new ServiceCollection();
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        const environmentService = new ServerEnvironmentService(this.args, productService);
        services.set(IServerEnvironmentService, environmentService);
        const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
        services.set(ILoggerService, loggerService);
        const logService = new LogService(this._register(loggerService.createLogger('remoteCLI', { name: localize('remotecli', "Remote CLI") })));
        services.set(ILogService, logService);
        logService.trace(`Remote configuration data at ${this.remoteDataFolder}`);
        logService.trace('process arguments:', this.args);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        fileService.registerProvider(Schemas.file, this._register(new DiskFileSystemProvider(logService)));
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = this._register(new ServerUserDataProfilesService(uriIdentityService, environmentService, fileService, logService));
        services.set(IUserDataProfilesService, userDataProfilesService);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, new NullPolicyService(), logService));
        services.set(IConfigurationService, configurationService);
        // Initialize
        await Promise.all([
            configurationService.initialize(),
            userDataProfilesService.init()
        ]);
        services.set(IRequestService, new SyncDescriptor(RequestService, ['remote']));
        services.set(IDownloadService, new SyncDescriptor(DownloadService));
        services.set(ITelemetryService, NullTelemetryService);
        services.set(IExtensionGalleryManifestService, new SyncDescriptor(ExtensionGalleryManifestService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService));
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService));
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService));
        return new InstantiationService(services);
    }
    async doRun(extensionManagementCLI) {
        // List Extensions
        if (this.args['list-extensions']) {
            return extensionManagementCLI.listExtensions(!!this.args['show-versions'], this.args['category']);
        }
        // Install Extension
        else if (this.args['install-extension'] || this.args['install-builtin-extension']) {
            const installOptions = { isMachineScoped: !!this.args['do-not-sync'], installPreReleaseVersion: !!this.args['pre-release'], donotIncludePackAndDependencies: !!this.args['do-not-include-pack-dependencies'] };
            return extensionManagementCLI.installExtensions(this.asExtensionIdOrVSIX(this.args['install-extension'] || []), this.asExtensionIdOrVSIX(this.args['install-builtin-extension'] || []), installOptions, !!this.args['force']);
        }
        // Uninstall Extension
        else if (this.args['uninstall-extension']) {
            return extensionManagementCLI.uninstallExtensions(this.asExtensionIdOrVSIX(this.args['uninstall-extension']), !!this.args['force']);
        }
        // Update the installed extensions
        else if (this.args['update-extensions']) {
            return extensionManagementCLI.updateExtensions();
        }
        // Locate Extension
        else if (this.args['locate-extension']) {
            return extensionManagementCLI.locateExtension(this.args['locate-extension']);
        }
    }
    asExtensionIdOrVSIX(inputs) {
        return inputs.map(input => /\.vsix$/i.test(input) ? URI.file(isAbsolute(input) ? input : join(cwd(), input)) : input);
    }
}
function eventuallyExit(code) {
    setTimeout(() => process.exit(code), 0);
}
export async function run(args, REMOTE_DATA_FOLDER, optionDescriptions) {
    if (args.help) {
        const executable = product.serverApplicationName + (isWindows ? '.cmd' : '');
        console.log(buildHelpMessage(product.nameLong, executable, product.version, optionDescriptions, { noInputFiles: true, noPipe: true }));
        return;
    }
    // Version Info
    if (args.version) {
        console.log(buildVersionMessage(product.version, product.commit));
        return;
    }
    const cliMain = new CliMain(args, REMOTE_DATA_FOLDER);
    try {
        await cliMain.run();
        eventuallyExit(0);
    }
    catch (err) {
        eventuallyExit(1);
    }
    finally {
        cliMain.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50Q2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3JlbW90ZUV4dGVuc2lvbkhvc3RBZ2VudENsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDakYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFrQixNQUFNLGtFQUFrRSxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ25JLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQzVKLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQ2pMLE9BQU8sRUFBRSxvQkFBb0IsRUFB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