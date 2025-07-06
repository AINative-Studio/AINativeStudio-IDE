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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tbWFpbi9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sNERBQTRELENBQUM7QUFFcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDdkMsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkYsT0FBTyxFQUEwQixlQUFlLEVBQUUsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNsSSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQXVCLFdBQVcsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLE1BQU0sK0JB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