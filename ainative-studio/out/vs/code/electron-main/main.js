/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../platform/update/common/update.config.contribution.js';
import { app, dialog } from 'electron';
import { unlinkSync, promises } from 'fs';
import { URI } from '../../base/common/uri.js';
import { coalesce, distinct } from '../../base/common/arrays.js';
import { Promises } from '../../base/common/async.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { ExpectedError, setUnexpectedErrorHandler } from '../../base/common/errors.js';
import { isValidBasename, parseLineAndColumnAware, sanitizeFilePath } from '../../base/common/extpath.js';
import { Event } from '../../base/common/event.js';
import { getPathLabel } from '../../base/common/labels.js';
import { Schemas } from '../../base/common/network.js';
import { basename, resolve } from '../../base/common/path.js';
import { mark } from '../../base/common/performance.js';
import { isMacintosh, isWindows, OS } from '../../base/common/platform.js';
import { cwd } from '../../base/common/process.js';
import { rtrim, trim } from '../../base/common/strings.js';
import { Promises as FSPromises } from '../../base/node/pfs.js';
import { ProxyChannel } from '../../base/parts/ipc/common/ipc.js';
import { connect as nodeIPCConnect, serve as nodeIPCServe, XDG_RUNTIME_DIR } from '../../base/parts/ipc/node/ipc.net.js';
import { CodeApplication } from './app.js';
import { localize } from '../../nls.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { DiagnosticsService } from '../../platform/diagnostics/node/diagnosticsService.js';
import { EnvironmentMainService, IEnvironmentMainService } from '../../platform/environment/electron-main/environmentMainService.js';
import { addArg, parseMainProcessArgv } from '../../platform/environment/node/argvHelper.js';
import { createWaitMarkerFileSync } from '../../platform/environment/node/wait.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILifecycleMainService, LifecycleMainService } from '../../platform/lifecycle/electron-main/lifecycleMainService.js';
import { BufferLogger } from '../../platform/log/common/bufferLog.js';
import { ConsoleMainLogger, getLogLevel, ILoggerService, ILogService } from '../../platform/log/common/log.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IProtocolMainService } from '../../platform/protocol/electron-main/protocol.js';
import { ProtocolMainService } from '../../platform/protocol/electron-main/protocolMainService.js';
import { ITunnelService } from '../../platform/tunnel/common/tunnel.js';
import { TunnelService } from '../../platform/tunnel/node/tunnelService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/electron-utility/requestService.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { SignService } from '../../platform/sign/node/signService.js';
import { IStateReadService, IStateService } from '../../platform/state/node/state.js';
import { NullTelemetryService } from '../../platform/telemetry/common/telemetryUtils.js';
import { IThemeMainService, ThemeMainService } from '../../platform/theme/electron-main/themeMainService.js';
import { IUserDataProfilesMainService, UserDataProfilesMainService } from '../../platform/userDataProfile/electron-main/userDataProfile.js';
import { IPolicyService, NullPolicyService } from '../../platform/policy/common/policy.js';
import { NativePolicyService } from '../../platform/policy/node/nativePolicyService.js';
import { FilePolicyService } from '../../platform/policy/common/filePolicyService.js';
import { DisposableStore } from '../../base/common/lifecycle.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { ILoggerMainService, LoggerMainService } from '../../platform/log/electron-main/loggerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { massageMessageBoxOptions } from '../../platform/dialogs/common/dialogs.js';
import { StateService } from '../../platform/state/node/stateService.js';
import { FileUserDataProvider } from '../../platform/userData/common/fileUserDataProvider.js';
import { addUNCHostToAllowlist, getUNCHost } from '../../base/node/unc.js';
/**
 * The main VS Code entry point.
 *
 * Note: This class can exist more than once for example when VS Code is already
 * running and a second instance is started from the command line. It will always
 * try to communicate with an existing instance to prevent that 2 VS Code instances
 * are running at the same time.
 */
class CodeMain {
    main() {
        try {
            this.startup();
        }
        catch (error) {
            console.error(error.message);
            app.exit(1);
        }
    }
    async startup() {
        // Set the error handler early enough so that we are not getting the
        // default electron error dialog popping up
        setUnexpectedErrorHandler(err => console.error(err));
        // Create services
        const [instantiationService, instanceEnvironment, environmentMainService, configurationService, stateMainService, bufferLogger, productService, userDataProfilesMainService] = this.createServices();
        try {
            // Init services
            try {
                await this.initServices(environmentMainService, userDataProfilesMainService, configurationService, stateMainService, productService);
            }
            catch (error) {
                // Show a dialog for errors that can be resolved by the user
                this.handleStartupDataDirError(environmentMainService, productService, error);
                throw error;
            }
            // Startup
            await instantiationService.invokeFunction(async (accessor) => {
                const logService = accessor.get(ILogService);
                const lifecycleMainService = accessor.get(ILifecycleMainService);
                const fileService = accessor.get(IFileService);
                const loggerService = accessor.get(ILoggerService);
                // Create the main IPC server by trying to be the server
                // If this throws an error it means we are not the first
                // instance of VS Code running and so we would quit.
                const mainProcessNodeIpcServer = await this.claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, true);
                // Write a lockfile to indicate an instance is running
                // (https://github.com/microsoft/vscode/issues/127861#issuecomment-877417451)
                FSPromises.writeFile(environmentMainService.mainLockfile, String(process.pid)).catch(err => {
                    logService.warn(`app#startup(): Error writing main lockfile: ${err.stack}`);
                });
                // Delay creation of spdlog for perf reasons (https://github.com/microsoft/vscode/issues/72906)
                bufferLogger.logger = loggerService.createLogger('main', { name: localize('mainLog', "Main") });
                // Lifecycle
                Event.once(lifecycleMainService.onWillShutdown)(evt => {
                    fileService.dispose();
                    configurationService.dispose();
                    evt.join('instanceLockfile', promises.unlink(environmentMainService.mainLockfile).catch(() => { }));
                });
                return instantiationService.createInstance(CodeApplication, mainProcessNodeIpcServer, instanceEnvironment).startup();
            });
        }
        catch (error) {
            instantiationService.invokeFunction(this.quit, error);
        }
    }
    createServices() {
        const services = new ServiceCollection();
        const disposables = new DisposableStore();
        process.once('exit', () => disposables.dispose());
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Environment
        const environmentMainService = new EnvironmentMainService(this.resolveArgs(), productService);
        const instanceEnvironment = this.patchEnvironment(environmentMainService); // Patch `process.env` with the instance's environment
        services.set(IEnvironmentMainService, environmentMainService);
        // Logger
        const loggerService = new LoggerMainService(getLogLevel(environmentMainService), environmentMainService.logsHome);
        services.set(ILoggerMainService, loggerService);
        // Log: We need to buffer the spdlog logs until we are sure
        // we are the only instance running, otherwise we'll have concurrent
        // log file access on Windows (https://github.com/microsoft/vscode/issues/41218)
        const bufferLogger = new BufferLogger(loggerService.getLogLevel());
        const logService = disposables.add(new LogService(bufferLogger, [new ConsoleMainLogger(loggerService.getLogLevel())]));
        services.set(ILogService, logService);
        // Files
        const fileService = new FileService(logService);
        services.set(IFileService, fileService);
        const diskFileSystemProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // State
        const stateService = new StateService(1 /* SaveStrategy.DELAYED */, environmentMainService, logService, fileService);
        services.set(IStateReadService, stateService);
        services.set(IStateService, stateService);
        // User Data Profiles
        const userDataProfilesMainService = new UserDataProfilesMainService(stateService, uriIdentityService, environmentMainService, fileService, logService);
        services.set(IUserDataProfilesMainService, userDataProfilesMainService);
        // Use FileUserDataProvider for user data to
        // enable atomic read / write operations.
        fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, userDataProfilesMainService, uriIdentityService, logService));
        // Policy
        let policyService;
        if (isWindows && productService.win32RegValueName) {
            policyService = disposables.add(new NativePolicyService(logService, productService.win32RegValueName));
        }
        else if (isMacintosh && productService.darwinBundleIdentifier) {
            policyService = disposables.add(new NativePolicyService(logService, productService.darwinBundleIdentifier));
        }
        else if (environmentMainService.policyFile) {
            policyService = disposables.add(new FilePolicyService(environmentMainService.policyFile, fileService, logService));
        }
        else {
            policyService = new NullPolicyService();
        }
        services.set(IPolicyService, policyService);
        // Configuration
        const configurationService = new ConfigurationService(userDataProfilesMainService.defaultProfile.settingsResource, fileService, policyService, logService);
        services.set(IConfigurationService, configurationService);
        // Lifecycle
        services.set(ILifecycleMainService, new SyncDescriptor(LifecycleMainService, undefined, false));
        // Request
        services.set(IRequestService, new SyncDescriptor(RequestService, undefined, true));
        // Themes
        services.set(IThemeMainService, new SyncDescriptor(ThemeMainService));
        // Signing
        services.set(ISignService, new SyncDescriptor(SignService, undefined, false /* proxied to other processes */));
        // Tunnel
        services.set(ITunnelService, new SyncDescriptor(TunnelService));
        // Protocol (instantiated early and not using sync descriptor for security reasons)
        services.set(IProtocolMainService, new ProtocolMainService(environmentMainService, userDataProfilesMainService, logService));
        return [new InstantiationService(services, true), instanceEnvironment, environmentMainService, configurationService, stateService, bufferLogger, productService, userDataProfilesMainService];
    }
    patchEnvironment(environmentMainService) {
        const instanceEnvironment = {
            VSCODE_IPC_HOOK: environmentMainService.mainIPCHandle
        };
        ['VSCODE_NLS_CONFIG', 'VSCODE_PORTABLE'].forEach(key => {
            const value = process.env[key];
            if (typeof value === 'string') {
                instanceEnvironment[key] = value;
            }
        });
        Object.assign(process.env, instanceEnvironment);
        return instanceEnvironment;
    }
    async initServices(environmentMainService, userDataProfilesMainService, configurationService, stateService, productService) {
        await Promises.settled([
            // Environment service (paths)
            Promise.all([
                this.allowWindowsUNCPath(environmentMainService.extensionsPath), // enable extension paths on UNC drives...
                environmentMainService.codeCachePath, // ...other user-data-derived paths should already be enlisted from `main.js`
                environmentMainService.logsHome.with({ scheme: Schemas.file }).fsPath,
                userDataProfilesMainService.defaultProfile.globalStorageHome.with({ scheme: Schemas.file }).fsPath,
                environmentMainService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath,
                environmentMainService.localHistoryHome.with({ scheme: Schemas.file }).fsPath,
                environmentMainService.backupHome
            ].map(path => path ? promises.mkdir(path, { recursive: true }) : undefined)),
            // State service
            stateService.init(),
            // Configuration service
            configurationService.initialize()
        ]);
        // Initialize user data profiles after initializing the state
        userDataProfilesMainService.init();
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
    async claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, retry) {
        // Try to setup a server for running. If that succeeds it means
        // we are the first instance to startup. Otherwise it is likely
        // that another instance is already running.
        let mainProcessNodeIpcServer;
        try {
            mark('code/willStartMainServer');
            mainProcessNodeIpcServer = await nodeIPCServe(environmentMainService.mainIPCHandle);
            mark('code/didStartMainServer');
            Event.once(lifecycleMainService.onWillShutdown)(() => mainProcessNodeIpcServer.dispose());
        }
        catch (error) {
            // Handle unexpected errors (the only expected error is EADDRINUSE that
            // indicates another instance of VS Code is running)
            if (error.code !== 'EADDRINUSE') {
                // Show a dialog for errors that can be resolved by the user
                this.handleStartupDataDirError(environmentMainService, productService, error);
                // Any other runtime error is just printed to the console
                throw error;
            }
            // there's a running instance, let's connect to it
            let client;
            try {
                client = await nodeIPCConnect(environmentMainService.mainIPCHandle, 'main');
            }
            catch (error) {
                // Handle unexpected connection errors by showing a dialog to the user
                if (!retry || isWindows || error.code !== 'ECONNREFUSED') {
                    if (error.code === 'EPERM') {
                        this.showStartupWarningDialog(localize('secondInstanceAdmin', "Another instance of {0} is already running as administrator.", productService.nameShort), localize('secondInstanceAdminDetail', "Please close the other instance and try again."), productService);
                    }
                    throw error;
                }
                // it happens on Linux and OS X that the pipe is left behind
                // let's delete it, since we can't connect to it and then
                // retry the whole thing
                try {
                    unlinkSync(environmentMainService.mainIPCHandle);
                }
                catch (error) {
                    logService.warn('Could not delete obsolete instance handle', error);
                    throw error;
                }
                return this.claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, false);
            }
            // Tests from CLI require to be the only instance currently
            if (environmentMainService.extensionTestsLocationURI && !environmentMainService.debugExtensionHost.break) {
                const msg = `Running extension tests from the command line is currently only supported if no other instance of ${productService.nameShort} is running.`;
                logService.error(msg);
                client.dispose();
                throw new Error(msg);
            }
            // Show a warning dialog after some timeout if it takes long to talk to the other instance
            // Skip this if we are running with --wait where it is expected that we wait for a while.
            // Also skip when gathering diagnostics (--status) which can take a longer time.
            let startupWarningDialogHandle = undefined;
            if (!environmentMainService.args.wait && !environmentMainService.args.status) {
                startupWarningDialogHandle = setTimeout(() => {
                    this.showStartupWarningDialog(localize('secondInstanceNoResponse', "Another instance of {0} is running but not responding", productService.nameShort), localize('secondInstanceNoResponseDetail', "Please close all other instances and try again."), productService);
                }, 10000);
            }
            const otherInstanceLaunchMainService = ProxyChannel.toService(client.getChannel('launch'), { disableMarshalling: true });
            const otherInstanceDiagnosticsMainService = ProxyChannel.toService(client.getChannel('diagnostics'), { disableMarshalling: true });
            // Process Info
            if (environmentMainService.args.status) {
                return instantiationService.invokeFunction(async () => {
                    const diagnosticsService = new DiagnosticsService(NullTelemetryService, productService);
                    const mainDiagnostics = await otherInstanceDiagnosticsMainService.getMainDiagnostics();
                    const remoteDiagnostics = await otherInstanceDiagnosticsMainService.getRemoteDiagnostics({ includeProcesses: true, includeWorkspaceMetadata: true });
                    const diagnostics = await diagnosticsService.getDiagnostics(mainDiagnostics, remoteDiagnostics);
                    console.log(diagnostics);
                    throw new ExpectedError();
                });
            }
            // Windows: allow to set foreground
            if (isWindows) {
                await this.windowsAllowSetForegroundWindow(otherInstanceLaunchMainService, logService);
            }
            // Send environment over...
            logService.trace('Sending env to running instance...');
            await otherInstanceLaunchMainService.start(environmentMainService.args, process.env);
            // Cleanup
            client.dispose();
            // Now that we started, make sure the warning dialog is prevented
            if (startupWarningDialogHandle) {
                clearTimeout(startupWarningDialogHandle);
            }
            throw new ExpectedError('Sent env to running instance. Terminating...');
        }
        // Print --status usage info
        if (environmentMainService.args.status) {
            console.log(localize('statusWarning', "Warning: The --status argument can only be used if {0} is already running. Please run it again after {0} has started.", productService.nameShort));
            throw new ExpectedError('Terminating...');
        }
        // Set the VSCODE_PID variable here when we are sure we are the first
        // instance to startup. Otherwise we would wrongly overwrite the PID
        process.env['VSCODE_PID'] = String(process.pid);
        return mainProcessNodeIpcServer;
    }
    handleStartupDataDirError(environmentMainService, productService, error) {
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            const directories = coalesce([environmentMainService.userDataPath, environmentMainService.extensionsPath, XDG_RUNTIME_DIR]).map(folder => getPathLabel(URI.file(folder), { os: OS, tildify: environmentMainService }));
            this.showStartupWarningDialog(localize('startupDataDirError', "Unable to write program user data."), localize('startupUserDataAndExtensionsDirErrorDetail', "{0}\n\nPlease make sure the following directories are writeable:\n\n{1}", toErrorMessage(error), directories.join('\n')), productService);
        }
    }
    showStartupWarningDialog(message, detail, productService) {
        // use sync variant here because we likely exit after this method
        // due to startup issues and otherwise the dialog seems to disappear
        // https://github.com/microsoft/vscode/issues/104493
        dialog.showMessageBoxSync(massageMessageBoxOptions({
            type: 'warning',
            buttons: [localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, "&&Close")],
            message,
            detail
        }, productService).options);
    }
    async windowsAllowSetForegroundWindow(launchMainService, logService) {
        if (isWindows) {
            const processId = await launchMainService.getMainProcessId();
            logService.trace('Sending some foreground love to the running instance:', processId);
            try {
                (await import('windows-foreground-love')).allowSetForegroundWindow(processId);
            }
            catch (error) {
                logService.error(error);
            }
        }
    }
    quit(accessor, reason) {
        const logService = accessor.get(ILogService);
        const lifecycleMainService = accessor.get(ILifecycleMainService);
        let exitCode = 0;
        if (reason) {
            if (reason.isExpected) {
                if (reason.message) {
                    logService.trace(reason.message);
                }
            }
            else {
                exitCode = 1; // signal error to the outside
                if (reason.stack) {
                    logService.error(reason.stack);
                }
                else {
                    logService.error(`Startup error: ${reason.toString()}`);
                }
            }
        }
        lifecycleMainService.kill(exitCode);
    }
    //#region Command line arguments utilities
    resolveArgs() {
        // Parse arguments
        const args = this.validatePaths(parseMainProcessArgv(process.argv));
        // If we are started with --wait create a random temporary file
        // and pass it over to the starting instance. We can use this file
        // to wait for it to be deleted to monitor that the edited file
        // is closed and then exit the waiting process.
        //
        // Note: we are not doing this if the wait marker has been already
        // added as argument. This can happen if VS Code was started from CLI.
        if (args.wait && !args.waitMarkerFilePath) {
            const waitMarkerFilePath = createWaitMarkerFileSync(args.verbose);
            if (waitMarkerFilePath) {
                addArg(process.argv, '--waitMarkerFilePath', waitMarkerFilePath);
                args.waitMarkerFilePath = waitMarkerFilePath;
            }
        }
        return args;
    }
    validatePaths(args) {
        // Track URLs if they're going to be used
        if (args['open-url']) {
            args._urls = args._;
            args._ = [];
        }
        // Normalize paths and watch out for goto line mode
        if (!args['remote']) {
            const paths = this.doValidatePaths(args._, args.goto);
            args._ = paths;
        }
        return args;
    }
    doValidatePaths(args, gotoLineMode) {
        const currentWorkingDir = cwd();
        const result = args.map(arg => {
            let pathCandidate = String(arg);
            let parsedPath = undefined;
            if (gotoLineMode) {
                parsedPath = parseLineAndColumnAware(pathCandidate);
                pathCandidate = parsedPath.path;
            }
            if (pathCandidate) {
                pathCandidate = this.preparePath(currentWorkingDir, pathCandidate);
            }
            const sanitizedFilePath = sanitizeFilePath(pathCandidate, currentWorkingDir);
            const filePathBasename = basename(sanitizedFilePath);
            if (filePathBasename /* can be empty if code is opened on root */ && !isValidBasename(filePathBasename)) {
                return null; // do not allow invalid file names
            }
            if (gotoLineMode && parsedPath) {
                parsedPath.path = sanitizedFilePath;
                return this.toPath(parsedPath);
            }
            return sanitizedFilePath;
        });
        const caseInsensitive = isWindows || isMacintosh;
        const distinctPaths = distinct(result, path => path && caseInsensitive ? path.toLowerCase() : (path || ''));
        return coalesce(distinctPaths);
    }
    preparePath(cwd, path) {
        // Trim trailing quotes
        if (isWindows) {
            path = rtrim(path, '"'); // https://github.com/microsoft/vscode/issues/1498
        }
        // Trim whitespaces
        path = trim(trim(path, ' '), '\t');
        if (isWindows) {
            // Resolve the path against cwd if it is relative
            path = resolve(cwd, path);
            // Trim trailing '.' chars on Windows to prevent invalid file names
            path = rtrim(path, '.');
        }
        return path;
    }
    toPath(pathWithLineAndCol) {
        const segments = [pathWithLineAndCol.path];
        if (typeof pathWithLineAndCol.line === 'number') {
            segments.push(String(pathWithLineAndCol.line));
        }
        if (typeof pathWithLineAndCol.column === 'number') {
            segments.push(String(pathWithLineAndCol.column));
        }
        return segments.join(':');
    }
}
// Main Startup
const code = new CodeMain();
code.main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLW1haW4vbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDREQUE0RCxDQUFDO0FBRXBFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZGLE9BQU8sRUFBMEIsZUFBZSxFQUFFLHVCQUF1QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEksT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ25ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUF1QixXQUFXLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLCtC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