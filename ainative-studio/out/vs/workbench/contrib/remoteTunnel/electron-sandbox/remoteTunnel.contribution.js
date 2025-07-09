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
import { Action } from '../../../../base/common/actions.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { isNumber, isObject, isString } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { CONFIGURATION_KEY_HOST_NAME, CONFIGURATION_KEY_PREFIX, CONFIGURATION_KEY_PREVENT_SLEEP, INACTIVE_TUNNEL_MODE, IRemoteTunnelService, LOGGER_NAME, LOG_ID } from '../../../../platform/remoteTunnel/common/remoteTunnel.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService, isUntitledWorkspace } from '../../../../platform/workspace/common/workspace.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
export const REMOTE_TUNNEL_CATEGORY = localize2('remoteTunnel.category', 'Remote Tunnels');
export const REMOTE_TUNNEL_CONNECTION_STATE_KEY = 'remoteTunnelConnection';
export const REMOTE_TUNNEL_CONNECTION_STATE = new RawContextKey(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'disconnected');
const REMOTE_TUNNEL_USED_STORAGE_KEY = 'remoteTunnelServiceUsed';
const REMOTE_TUNNEL_PROMPTED_PREVIEW_STORAGE_KEY = 'remoteTunnelServicePromptedPreview';
const REMOTE_TUNNEL_EXTENSION_RECOMMENDED_KEY = 'remoteTunnelExtensionRecommended';
const REMOTE_TUNNEL_HAS_USED_BEFORE = 'remoteTunnelHasUsed';
const REMOTE_TUNNEL_EXTENSION_TIMEOUT = 4 * 60 * 1000; // show the recommendation that a machine started using tunnels if it joined less than 4 minutes ago
const INVALID_TOKEN_RETRIES = 2;
var RemoteTunnelCommandIds;
(function (RemoteTunnelCommandIds) {
    RemoteTunnelCommandIds["turnOn"] = "workbench.remoteTunnel.actions.turnOn";
    RemoteTunnelCommandIds["turnOff"] = "workbench.remoteTunnel.actions.turnOff";
    RemoteTunnelCommandIds["connecting"] = "workbench.remoteTunnel.actions.connecting";
    RemoteTunnelCommandIds["manage"] = "workbench.remoteTunnel.actions.manage";
    RemoteTunnelCommandIds["showLog"] = "workbench.remoteTunnel.actions.showLog";
    RemoteTunnelCommandIds["configure"] = "workbench.remoteTunnel.actions.configure";
    RemoteTunnelCommandIds["copyToClipboard"] = "workbench.remoteTunnel.actions.copyToClipboard";
    RemoteTunnelCommandIds["learnMore"] = "workbench.remoteTunnel.actions.learnMore";
})(RemoteTunnelCommandIds || (RemoteTunnelCommandIds = {}));
// name shown in nofications
var RemoteTunnelCommandLabels;
(function (RemoteTunnelCommandLabels) {
    RemoteTunnelCommandLabels.turnOn = localize('remoteTunnel.actions.turnOn', 'Turn on Remote Tunnel Access...');
    RemoteTunnelCommandLabels.turnOff = localize('remoteTunnel.actions.turnOff', 'Turn off Remote Tunnel Access...');
    RemoteTunnelCommandLabels.showLog = localize('remoteTunnel.actions.showLog', 'Show Remote Tunnel Service Log');
    RemoteTunnelCommandLabels.configure = localize('remoteTunnel.actions.configure', 'Configure Tunnel Name...');
    RemoteTunnelCommandLabels.copyToClipboard = localize('remoteTunnel.actions.copyToClipboard', 'Copy Browser URI to Clipboard');
    RemoteTunnelCommandLabels.learnMore = localize('remoteTunnel.actions.learnMore', 'Get Started with Tunnels');
})(RemoteTunnelCommandLabels || (RemoteTunnelCommandLabels = {}));
let RemoteTunnelWorkbenchContribution = class RemoteTunnelWorkbenchContribution extends Disposable {
    constructor(authenticationService, dialogService, extensionService, contextKeyService, productService, storageService, loggerService, quickInputService, environmentService, remoteTunnelService, commandService, workspaceContextService, progressService, notificationService) {
        super();
        this.authenticationService = authenticationService;
        this.dialogService = dialogService;
        this.extensionService = extensionService;
        this.contextKeyService = contextKeyService;
        this.storageService = storageService;
        this.quickInputService = quickInputService;
        this.environmentService = environmentService;
        this.remoteTunnelService = remoteTunnelService;
        this.commandService = commandService;
        this.workspaceContextService = workspaceContextService;
        this.progressService = progressService;
        this.notificationService = notificationService;
        this.expiredSessions = new Set();
        this.logger = this._register(loggerService.createLogger(joinPath(environmentService.logsHome, `${LOG_ID}.log`), { id: LOG_ID, name: LOGGER_NAME }));
        this.connectionStateContext = REMOTE_TUNNEL_CONNECTION_STATE.bindTo(this.contextKeyService);
        const serverConfiguration = productService.tunnelApplicationConfig;
        if (!serverConfiguration || !productService.tunnelApplicationName) {
            this.logger.error('Missing \'tunnelApplicationConfig\' or \'tunnelApplicationName\' in product.json. Remote tunneling is not available.');
            this.serverConfiguration = { authenticationProviders: {}, editorWebUrl: '', extension: { extensionId: '', friendlyName: '' } };
            return;
        }
        this.serverConfiguration = serverConfiguration;
        this._register(this.remoteTunnelService.onDidChangeTunnelStatus(s => this.handleTunnelStatusUpdate(s)));
        this.registerCommands();
        this.initialize();
        this.recommendRemoteExtensionIfNeeded();
    }
    handleTunnelStatusUpdate(status) {
        this.connectionInfo = undefined;
        if (status.type === 'disconnected') {
            if (status.onTokenFailed) {
                this.expiredSessions.add(status.onTokenFailed.sessionId);
            }
            this.connectionStateContext.set('disconnected');
        }
        else if (status.type === 'connecting') {
            this.connectionStateContext.set('connecting');
        }
        else if (status.type === 'connected') {
            this.connectionInfo = status.info;
            this.connectionStateContext.set('connected');
        }
    }
    async recommendRemoteExtensionIfNeeded() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const remoteExtension = this.serverConfiguration.extension;
        const shouldRecommend = async () => {
            if (this.storageService.getBoolean(REMOTE_TUNNEL_EXTENSION_RECOMMENDED_KEY, -1 /* StorageScope.APPLICATION */)) {
                return false;
            }
            if (await this.extensionService.getExtension(remoteExtension.extensionId)) {
                return false;
            }
            const usedOnHostMessage = this.storageService.get(REMOTE_TUNNEL_USED_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            if (!usedOnHostMessage) {
                return false;
            }
            let usedTunnelName;
            try {
                const message = JSON.parse(usedOnHostMessage);
                if (!isObject(message)) {
                    return false;
                }
                const { hostName, timeStamp } = message;
                if (!isString(hostName) || !isNumber(timeStamp) || new Date().getTime() > timeStamp + REMOTE_TUNNEL_EXTENSION_TIMEOUT) {
                    return false;
                }
                usedTunnelName = hostName;
            }
            catch (_) {
                // problems parsing the message, likly the old message format
                return false;
            }
            const currentTunnelName = await this.remoteTunnelService.getTunnelName();
            if (!currentTunnelName || currentTunnelName === usedTunnelName) {
                return false;
            }
            return usedTunnelName;
        };
        const recommed = async () => {
            const usedOnHost = await shouldRecommend();
            if (!usedOnHost) {
                return false;
            }
            this.notificationService.notify({
                severity: Severity.Info,
                message: localize({
                    key: 'recommend.remoteExtension',
                    comment: ['{0} will be a tunnel name, {1} will the link address to the web UI, {6} an extension name. [label](command:commandId) is a markdown link. Only translate the label, do not modify the format']
                }, "Tunnel '{0}' is avaiable for remote access. The {1} extension can be used to connect to it.", usedOnHost, remoteExtension.friendlyName),
                actions: {
                    primary: [
                        new Action('showExtension', localize('action.showExtension', "Show Extension"), undefined, true, () => {
                            return this.commandService.executeCommand('workbench.extensions.action.showExtensionsWithIds', [remoteExtension.extensionId]);
                        }),
                        new Action('doNotShowAgain', localize('action.doNotShowAgain', "Do not show again"), undefined, true, () => {
                            this.storageService.store(REMOTE_TUNNEL_EXTENSION_RECOMMENDED_KEY, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                        }),
                    ]
                }
            });
            return true;
        };
        if (await shouldRecommend()) {
            const disposables = this._register(new DisposableStore());
            disposables.add(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, REMOTE_TUNNEL_USED_STORAGE_KEY, disposables)(async () => {
                const success = await recommed();
                if (success) {
                    disposables.dispose();
                }
            }));
        }
    }
    async initialize() {
        const [mode, status] = await Promise.all([
            this.remoteTunnelService.getMode(),
            this.remoteTunnelService.getTunnelStatus(),
        ]);
        this.handleTunnelStatusUpdate(status);
        if (mode.active && mode.session.token) {
            return; // already initialized, token available
        }
        const doInitialStateDiscovery = async (progress) => {
            const listener = progress && this.remoteTunnelService.onDidChangeTunnelStatus(status => {
                switch (status.type) {
                    case 'connecting':
                        if (status.progress) {
                            progress.report({ message: status.progress });
                        }
                        break;
                }
            });
            let newSession;
            if (mode.active) {
                const token = await this.getSessionToken(mode.session);
                if (token) {
                    newSession = { ...mode.session, token };
                }
            }
            const status = await this.remoteTunnelService.initialize(mode.active && newSession ? { ...mode, session: newSession } : INACTIVE_TUNNEL_MODE);
            listener?.dispose();
            if (status.type === 'connected') {
                this.connectionInfo = status.info;
                this.connectionStateContext.set('connected');
                return;
            }
        };
        const hasUsed = this.storageService.getBoolean(REMOTE_TUNNEL_HAS_USED_BEFORE, -1 /* StorageScope.APPLICATION */, false);
        if (hasUsed) {
            await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                title: localize({ key: 'initialize.progress.title', comment: ['Only translate \'Looking for remote tunnel\', do not change the format of the rest (markdown link format)'] }, "[Looking for remote tunnel](command:{0})", RemoteTunnelCommandIds.showLog),
            }, doInitialStateDiscovery);
        }
        else {
            doInitialStateDiscovery(undefined);
        }
    }
    getPreferredTokenFromSession(session) {
        return session.session.accessToken || session.session.idToken;
    }
    async startTunnel(asService) {
        if (this.connectionInfo) {
            return this.connectionInfo;
        }
        this.storageService.store(REMOTE_TUNNEL_HAS_USED_BEFORE, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        let tokenProblems = false;
        for (let i = 0; i < INVALID_TOKEN_RETRIES; i++) {
            tokenProblems = false;
            const authenticationSession = await this.getAuthenticationSession();
            if (authenticationSession === undefined) {
                this.logger.info('No authentication session available, not starting tunnel');
                return undefined;
            }
            const result = await this.progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: localize({ key: 'startTunnel.progress.title', comment: ['Only translate \'Starting remote tunnel\', do not change the format of the rest (markdown link format)'] }, "[Starting remote tunnel](command:{0})", RemoteTunnelCommandIds.showLog),
            }, (progress) => {
                return new Promise((s, e) => {
                    let completed = false;
                    const listener = this.remoteTunnelService.onDidChangeTunnelStatus(status => {
                        switch (status.type) {
                            case 'connecting':
                                if (status.progress) {
                                    progress.report({ message: status.progress });
                                }
                                break;
                            case 'connected':
                                listener.dispose();
                                completed = true;
                                s(status.info);
                                if (status.serviceInstallFailed) {
                                    this.notificationService.notify({
                                        severity: Severity.Warning,
                                        message: localize({
                                            key: 'remoteTunnel.serviceInstallFailed',
                                            comment: ['{Locked="](command:{0})"}']
                                        }, "Installation as a service failed, and we fell back to running the tunnel for this session. See the [error log](command:{0}) for details.", RemoteTunnelCommandIds.showLog),
                                    });
                                }
                                break;
                            case 'disconnected':
                                listener.dispose();
                                completed = true;
                                tokenProblems = !!status.onTokenFailed;
                                s(undefined);
                                break;
                        }
                    });
                    const token = this.getPreferredTokenFromSession(authenticationSession);
                    const account = { sessionId: authenticationSession.session.id, token, providerId: authenticationSession.providerId, accountLabel: authenticationSession.session.account.label };
                    this.remoteTunnelService.startTunnel({ active: true, asService, session: account }).then(status => {
                        if (!completed && (status.type === 'connected' || status.type === 'disconnected')) {
                            listener.dispose();
                            if (status.type === 'connected') {
                                s(status.info);
                            }
                            else {
                                tokenProblems = !!status.onTokenFailed;
                                s(undefined);
                            }
                        }
                    });
                });
            });
            if (result || !tokenProblems) {
                return result;
            }
        }
        return undefined;
    }
    async getAuthenticationSession() {
        const sessions = await this.getAllSessions();
        const disposables = new DisposableStore();
        const quickpick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        quickpick.ok = false;
        quickpick.placeholder = localize('accountPreference.placeholder', "Sign in to an account to enable remote access");
        quickpick.ignoreFocusOut = true;
        quickpick.items = await this.createQuickpickItems(sessions);
        return new Promise((resolve, reject) => {
            disposables.add(quickpick.onDidHide((e) => {
                resolve(undefined);
                disposables.dispose();
            }));
            disposables.add(quickpick.onDidAccept(async (e) => {
                const selection = quickpick.selectedItems[0];
                if ('provider' in selection) {
                    const session = await this.authenticationService.createSession(selection.provider.id, selection.provider.scopes);
                    resolve(this.createExistingSessionItem(session, selection.provider.id));
                }
                else if ('session' in selection) {
                    resolve(selection);
                }
                else {
                    resolve(undefined);
                }
                quickpick.hide();
            }));
            quickpick.show();
        });
    }
    createExistingSessionItem(session, providerId) {
        return {
            label: session.account.label,
            description: this.authenticationService.getProvider(providerId).label,
            session,
            providerId
        };
    }
    async createQuickpickItems(sessions) {
        const options = [];
        if (sessions.length) {
            options.push({ type: 'separator', label: localize('signed in', "Signed In") });
            options.push(...sessions);
            options.push({ type: 'separator', label: localize('others', "Others") });
        }
        for (const authenticationProvider of (await this.getAuthenticationProviders())) {
            const signedInForProvider = sessions.some(account => account.providerId === authenticationProvider.id);
            const provider = this.authenticationService.getProvider(authenticationProvider.id);
            if (!signedInForProvider || provider.supportsMultipleAccounts) {
                options.push({ label: localize({ key: 'sign in using account', comment: ['{0} will be a auth provider (e.g. Github)'] }, "Sign in with {0}", provider.label), provider: authenticationProvider });
            }
        }
        return options;
    }
    /**
     * Returns all authentication sessions available from {@link getAuthenticationProviders}.
     */
    async getAllSessions() {
        const authenticationProviders = await this.getAuthenticationProviders();
        const accounts = new Map();
        const currentAccount = await this.remoteTunnelService.getMode();
        let currentSession;
        for (const provider of authenticationProviders) {
            const sessions = await this.authenticationService.getSessions(provider.id, provider.scopes);
            for (const session of sessions) {
                if (!this.expiredSessions.has(session.id)) {
                    const item = this.createExistingSessionItem(session, provider.id);
                    accounts.set(item.session.account.id, item);
                    if (currentAccount.active && currentAccount.session.sessionId === session.id) {
                        currentSession = item;
                    }
                }
            }
        }
        if (currentSession !== undefined) {
            accounts.set(currentSession.session.account.id, currentSession);
        }
        return [...accounts.values()];
    }
    async getSessionToken(session) {
        if (session) {
            const sessionItem = (await this.getAllSessions()).find(s => s.session.id === session.sessionId);
            if (sessionItem) {
                return this.getPreferredTokenFromSession(sessionItem);
            }
        }
        return undefined;
    }
    /**
     * Returns all authentication providers which can be used to authenticate
     * to the remote storage service, based on product.json configuration
     * and registered authentication providers.
     */
    async getAuthenticationProviders() {
        // Get the list of authentication providers configured in product.json
        const authenticationProviders = this.serverConfiguration.authenticationProviders;
        const configuredAuthenticationProviders = Object.keys(authenticationProviders).reduce((result, id) => {
            result.push({ id, scopes: authenticationProviders[id].scopes });
            return result;
        }, []);
        // Filter out anything that isn't currently available through the authenticationService
        const availableAuthenticationProviders = this.authenticationService.declaredProviders;
        return configuredAuthenticationProviders.filter(({ id }) => availableAuthenticationProviders.some(provider => provider.id === id));
    }
    registerCommands() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.turnOn,
                    title: RemoteTunnelCommandLabels.turnOn,
                    category: REMOTE_TUNNEL_CATEGORY,
                    precondition: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'disconnected'),
                    menu: [{
                            id: MenuId.CommandPalette,
                        },
                        {
                            id: MenuId.AccountsContext,
                            group: '2_remoteTunnel',
                            when: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'disconnected'),
                        }]
                });
            }
            async run(accessor) {
                const notificationService = accessor.get(INotificationService);
                const clipboardService = accessor.get(IClipboardService);
                const commandService = accessor.get(ICommandService);
                const storageService = accessor.get(IStorageService);
                const dialogService = accessor.get(IDialogService);
                const quickInputService = accessor.get(IQuickInputService);
                const productService = accessor.get(IProductService);
                const didNotifyPreview = storageService.getBoolean(REMOTE_TUNNEL_PROMPTED_PREVIEW_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
                if (!didNotifyPreview) {
                    const { confirmed } = await dialogService.confirm({
                        message: localize('tunnel.preview', 'Remote Tunnels is currently in preview. Please report any problems using the "Help: Report Issue" command.'),
                        primaryButton: localize({ key: 'enable', comment: ['&& denotes a mnemonic'] }, '&&Enable')
                    });
                    if (!confirmed) {
                        return;
                    }
                    storageService.store(REMOTE_TUNNEL_PROMPTED_PREVIEW_STORAGE_KEY, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
                const disposables = new DisposableStore();
                const quickPick = quickInputService.createQuickPick();
                quickPick.placeholder = localize('tunnel.enable.placeholder', 'Select how you want to enable access');
                quickPick.items = [
                    { service: false, label: localize('tunnel.enable.session', 'Turn on for this session'), description: localize('tunnel.enable.session.description', 'Run whenever {0} is open', productService.nameShort) },
                    { service: true, label: localize('tunnel.enable.service', 'Install as a service'), description: localize('tunnel.enable.service.description', 'Run whenever you\'re logged in') }
                ];
                const asService = await new Promise(resolve => {
                    disposables.add(quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]?.service)));
                    disposables.add(quickPick.onDidHide(() => resolve(undefined)));
                    quickPick.show();
                });
                quickPick.dispose();
                if (asService === undefined) {
                    return; // no-op
                }
                const connectionInfo = await that.startTunnel(/* installAsService= */ asService);
                if (connectionInfo) {
                    const linkToOpen = that.getLinkToOpen(connectionInfo);
                    const remoteExtension = that.serverConfiguration.extension;
                    const linkToOpenForMarkdown = linkToOpen.toString(false).replace(/\)/g, '%29');
                    notificationService.notify({
                        severity: Severity.Info,
                        message: localize({
                            key: 'progress.turnOn.final',
                            comment: ['{0} will be the tunnel name, {1} will the link address to the web UI, {6} an extension name, {7} a link to the extension documentation. [label](command:commandId) is a markdown link. Only translate the label, do not modify the format']
                        }, "You can now access this machine anywhere via the secure tunnel [{0}](command:{4}). To connect via a different machine, use the generated [{1}]({2}) link or use the [{6}]({7}) extension in the desktop or web. You can [configure](command:{3}) or [turn off](command:{5}) this access via the VS Code Accounts menu.", connectionInfo.tunnelName, connectionInfo.domain, linkToOpenForMarkdown, RemoteTunnelCommandIds.manage, RemoteTunnelCommandIds.configure, RemoteTunnelCommandIds.turnOff, remoteExtension.friendlyName, 'https://code.visualstudio.com/docs/remote/tunnels'),
                        actions: {
                            primary: [
                                new Action('copyToClipboard', localize('action.copyToClipboard', "Copy Browser Link to Clipboard"), undefined, true, () => clipboardService.writeText(linkToOpen.toString(true))),
                                new Action('showExtension', localize('action.showExtension', "Show Extension"), undefined, true, () => {
                                    return commandService.executeCommand('workbench.extensions.action.showExtensionsWithIds', [remoteExtension.extensionId]);
                                })
                            ]
                        }
                    });
                    const usedOnHostMessage = { hostName: connectionInfo.tunnelName, timeStamp: new Date().getTime() };
                    storageService.store(REMOTE_TUNNEL_USED_STORAGE_KEY, JSON.stringify(usedOnHostMessage), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
                else {
                    notificationService.notify({
                        severity: Severity.Info,
                        message: localize('progress.turnOn.failed', "Unable to turn on the remote tunnel access. Check the Remote Tunnel Service log for details."),
                    });
                    await commandService.executeCommand(RemoteTunnelCommandIds.showLog);
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.manage,
                    title: localize('remoteTunnel.actions.manage.on.v2', 'Remote Tunnel Access is On'),
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [{
                            id: MenuId.AccountsContext,
                            group: '2_remoteTunnel',
                            when: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'connected'),
                        }]
                });
            }
            async run() {
                that.showManageOptions();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.connecting,
                    title: localize('remoteTunnel.actions.manage.connecting', 'Remote Tunnel Access is Connecting'),
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [{
                            id: MenuId.AccountsContext,
                            group: '2_remoteTunnel',
                            when: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'connecting'),
                        }]
                });
            }
            async run() {
                that.showManageOptions();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.turnOff,
                    title: RemoteTunnelCommandLabels.turnOff,
                    category: REMOTE_TUNNEL_CATEGORY,
                    precondition: ContextKeyExpr.notEquals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'disconnected'),
                    menu: [{
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.notEquals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, ''),
                        }]
                });
            }
            async run() {
                const message = that.connectionInfo?.isAttached ?
                    localize('remoteTunnel.turnOffAttached.confirm', 'Do you want to turn off Remote Tunnel Access? This will also stop the service that was started externally.') :
                    localize('remoteTunnel.turnOff.confirm', 'Do you want to turn off Remote Tunnel Access?');
                const { confirmed } = await that.dialogService.confirm({ message });
                if (confirmed) {
                    that.remoteTunnelService.stopTunnel();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.showLog,
                    title: RemoteTunnelCommandLabels.showLog,
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [{
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.notEquals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, ''),
                        }]
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                outputService.showChannel(LOG_ID);
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.configure,
                    title: RemoteTunnelCommandLabels.configure,
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: [{
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.notEquals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, ''),
                        }]
                });
            }
            async run(accessor) {
                const preferencesService = accessor.get(IPreferencesService);
                preferencesService.openSettings({ query: CONFIGURATION_KEY_PREFIX });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.copyToClipboard,
                    title: RemoteTunnelCommandLabels.copyToClipboard,
                    category: REMOTE_TUNNEL_CATEGORY,
                    precondition: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'connected'),
                    menu: [{
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.equals(REMOTE_TUNNEL_CONNECTION_STATE_KEY, 'connected'),
                        }]
                });
            }
            async run(accessor) {
                const clipboardService = accessor.get(IClipboardService);
                if (that.connectionInfo) {
                    const linkToOpen = that.getLinkToOpen(that.connectionInfo);
                    clipboardService.writeText(linkToOpen.toString(true));
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: RemoteTunnelCommandIds.learnMore,
                    title: RemoteTunnelCommandLabels.learnMore,
                    category: REMOTE_TUNNEL_CATEGORY,
                    menu: []
                });
            }
            async run(accessor) {
                const openerService = accessor.get(IOpenerService);
                await openerService.open('https://aka.ms/vscode-server-doc');
            }
        }));
    }
    getLinkToOpen(connectionInfo) {
        const workspace = this.workspaceContextService.getWorkspace();
        const folders = workspace.folders;
        let resource;
        if (folders.length === 1) {
            resource = folders[0].uri;
        }
        else if (workspace.configuration && !isUntitledWorkspace(workspace.configuration, this.environmentService)) {
            resource = workspace.configuration;
        }
        const link = URI.parse(connectionInfo.link);
        if (resource?.scheme === Schemas.file) {
            return joinPath(link, resource.path);
        }
        return joinPath(link, this.environmentService.userHome.path);
    }
    async showManageOptions() {
        const account = await this.remoteTunnelService.getMode();
        return new Promise((c, e) => {
            const disposables = new DisposableStore();
            const quickPick = this.quickInputService.createQuickPick({ useSeparators: true });
            quickPick.placeholder = localize('manage.placeholder', 'Select a command to invoke');
            disposables.add(quickPick);
            const items = [];
            items.push({ id: RemoteTunnelCommandIds.learnMore, label: RemoteTunnelCommandLabels.learnMore });
            if (this.connectionInfo) {
                quickPick.title =
                    this.connectionInfo.isAttached ?
                        localize({ key: 'manage.title.attached', comment: ['{0} is the tunnel name'] }, 'Remote Tunnel Access enabled for {0} (launched externally)', this.connectionInfo.tunnelName) :
                        localize({ key: 'manage.title.orunning', comment: ['{0} is the tunnel name'] }, 'Remote Tunnel Access enabled for {0}', this.connectionInfo.tunnelName);
                items.push({ id: RemoteTunnelCommandIds.copyToClipboard, label: RemoteTunnelCommandLabels.copyToClipboard, description: this.connectionInfo.domain });
            }
            else {
                quickPick.title = localize('manage.title.off', 'Remote Tunnel Access not enabled');
            }
            items.push({ id: RemoteTunnelCommandIds.showLog, label: localize('manage.showLog', 'Show Log') });
            items.push({ type: 'separator' });
            items.push({ id: RemoteTunnelCommandIds.configure, label: localize('manage.tunnelName', 'Change Tunnel Name'), description: this.connectionInfo?.tunnelName });
            items.push({ id: RemoteTunnelCommandIds.turnOff, label: RemoteTunnelCommandLabels.turnOff, description: account.active ? `${account.session.accountLabel} (${account.session.providerId})` : undefined });
            quickPick.items = items;
            disposables.add(quickPick.onDidAccept(() => {
                if (quickPick.selectedItems[0] && quickPick.selectedItems[0].id) {
                    this.commandService.executeCommand(quickPick.selectedItems[0].id);
                }
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                c();
            }));
            quickPick.show();
        });
    }
};
RemoteTunnelWorkbenchContribution = __decorate([
    __param(0, IAuthenticationService),
    __param(1, IDialogService),
    __param(2, IExtensionService),
    __param(3, IContextKeyService),
    __param(4, IProductService),
    __param(5, IStorageService),
    __param(6, ILoggerService),
    __param(7, IQuickInputService),
    __param(8, INativeEnvironmentService),
    __param(9, IRemoteTunnelService),
    __param(10, ICommandService),
    __param(11, IWorkspaceContextService),
    __param(12, IProgressService),
    __param(13, INotificationService)
], RemoteTunnelWorkbenchContribution);
export { RemoteTunnelWorkbenchContribution };
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RemoteTunnelWorkbenchContribution, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    type: 'object',
    properties: {
        [CONFIGURATION_KEY_HOST_NAME]: {
            description: localize('remoteTunnelAccess.machineName', "The name under which the remote tunnel access is registered. If not set, the host name is used."),
            type: 'string',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            ignoreSync: true,
            pattern: '^(\\w[\\w-]*)?$',
            patternErrorMessage: localize('remoteTunnelAccess.machineNameRegex', "The name must only consist of letters, numbers, underscore and dash. It must not start with a dash."),
            maxLength: 20,
            default: ''
        },
        [CONFIGURATION_KEY_PREVENT_SLEEP]: {
            description: localize('remoteTunnelAccess.preventSleep', "Prevent this computer from sleeping when remote tunnel access is turned on."),
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            default: false,
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGVUdW5uZWwvZWxlY3Ryb24tc2FuZGJveC9yZW1vdGVUdW5uZWwuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxVQUFVLElBQUksdUJBQXVCLEVBQThDLE1BQU0sb0VBQW9FLENBQUM7QUFDdkssT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SSxPQUFPLEVBQUUs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