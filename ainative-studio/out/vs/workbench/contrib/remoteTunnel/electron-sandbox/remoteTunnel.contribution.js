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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZVR1bm5lbC9lbGVjdHJvbi1zYW5kYm94L3JlbW90ZVR1bm5lbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBOEMsTUFBTSxvRUFBb0UsQ0FBQztBQUN2SyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxj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