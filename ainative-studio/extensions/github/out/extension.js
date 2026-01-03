"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode_1 = require("vscode");
const extension_telemetry_1 = __importDefault(require("@vscode/extension-telemetry"));
const remoteSourceProvider_1 = require("./remoteSourceProvider");
const commands_1 = require("./commands");
const credentialProvider_1 = require("./credentialProvider");
const util_1 = require("./util");
const pushErrorHandler_1 = require("./pushErrorHandler");
const remoteSourcePublisher_1 = require("./remoteSourcePublisher");
const branchProtection_1 = require("./branchProtection");
const canonicalUriProvider_1 = require("./canonicalUriProvider");
const shareProviders_1 = require("./shareProviders");
const historyItemDetailsProvider_1 = require("./historyItemDetailsProvider");
function activate(context) {
    const disposables = [];
    context.subscriptions.push(new vscode_1.Disposable(() => vscode_1.Disposable.from(...disposables).dispose()));
    const logger = vscode_1.window.createOutputChannel('GitHub', { log: true });
    disposables.push(logger);
    const onDidChangeLogLevel = (logLevel) => {
        logger.appendLine(vscode_1.l10n.t('Log level: {0}', vscode_1.LogLevel[logLevel]));
    };
    disposables.push(logger.onDidChangeLogLevel(onDidChangeLogLevel));
    onDidChangeLogLevel(logger.logLevel);
    const { aiKey } = require('../package.json');
    const telemetryReporter = new extension_telemetry_1.default(aiKey);
    disposables.push(telemetryReporter);
    disposables.push(initializeGitBaseExtension());
    disposables.push(initializeGitExtension(context, telemetryReporter, logger));
}
function initializeGitBaseExtension() {
    const disposables = new util_1.DisposableStore();
    const initialize = () => {
        try {
            const gitBaseAPI = gitBaseExtension.getAPI(1);
            disposables.add(gitBaseAPI.registerRemoteSourceProvider(new remoteSourceProvider_1.GithubRemoteSourceProvider()));
        }
        catch (err) {
            console.error('Could not initialize GitHub extension');
            console.warn(err);
        }
    };
    const onDidChangeGitBaseExtensionEnablement = (enabled) => {
        if (!enabled) {
            disposables.dispose();
        }
        else {
            initialize();
        }
    };
    const gitBaseExtension = vscode_1.extensions.getExtension('vscode.git-base').exports;
    disposables.add(gitBaseExtension.onDidChangeEnablement(onDidChangeGitBaseExtensionEnablement));
    onDidChangeGitBaseExtensionEnablement(gitBaseExtension.enabled);
    return disposables;
}
function setGitHubContext(gitAPI, disposables) {
    if (gitAPI.repositories.find(repo => (0, util_1.repositoryHasGitHubRemote)(repo))) {
        vscode_1.commands.executeCommand('setContext', 'github.hasGitHubRepo', true);
    }
    else {
        const openRepoDisposable = gitAPI.onDidOpenRepository(async (e) => {
            await e.status();
            if ((0, util_1.repositoryHasGitHubRemote)(e)) {
                vscode_1.commands.executeCommand('setContext', 'github.hasGitHubRepo', true);
                openRepoDisposable.dispose();
            }
        });
        disposables.add(openRepoDisposable);
    }
}
function initializeGitExtension(context, telemetryReporter, logger) {
    const disposables = new util_1.DisposableStore();
    let gitExtension = vscode_1.extensions.getExtension('vscode.git');
    const initialize = () => {
        gitExtension.activate()
            .then(extension => {
            const onDidChangeGitExtensionEnablement = (enabled) => {
                if (enabled) {
                    const gitAPI = extension.getAPI(1);
                    disposables.add((0, commands_1.registerCommands)(gitAPI));
                    disposables.add(new credentialProvider_1.GithubCredentialProviderManager(gitAPI));
                    disposables.add(new branchProtection_1.GitHubBranchProtectionProviderManager(gitAPI, context.globalState, logger, telemetryReporter));
                    disposables.add(gitAPI.registerPushErrorHandler(new pushErrorHandler_1.GithubPushErrorHandler(telemetryReporter)));
                    disposables.add(gitAPI.registerRemoteSourcePublisher(new remoteSourcePublisher_1.GithubRemoteSourcePublisher(gitAPI)));
                    disposables.add(gitAPI.registerSourceControlHistoryItemDetailsProvider(new historyItemDetailsProvider_1.GitHubSourceControlHistoryItemDetailsProvider(gitAPI, logger)));
                    disposables.add(new canonicalUriProvider_1.GitHubCanonicalUriProvider(gitAPI));
                    disposables.add(new shareProviders_1.VscodeDevShareProvider(gitAPI));
                    setGitHubContext(gitAPI, disposables);
                    vscode_1.commands.executeCommand('setContext', 'git-base.gitEnabled', true);
                }
                else {
                    disposables.dispose();
                }
            };
            disposables.add(extension.onDidChangeEnablement(onDidChangeGitExtensionEnablement));
            onDidChangeGitExtensionEnablement(extension.enabled);
        });
    };
    if (gitExtension) {
        initialize();
    }
    else {
        const listener = vscode_1.extensions.onDidChange(() => {
            if (!gitExtension && vscode_1.extensions.getExtension('vscode.git')) {
                gitExtension = vscode_1.extensions.getExtension('vscode.git');
                initialize();
                listener.dispose();
            }
        });
        disposables.add(listener);
    }
    return disposables;
}
//# sourceMappingURL=extension.js.map