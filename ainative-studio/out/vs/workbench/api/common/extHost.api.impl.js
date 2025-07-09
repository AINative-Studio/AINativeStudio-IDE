/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import * as errors from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { combinedDisposable } from '../../../base/common/lifecycle.js';
import { Schemas, matchesScheme } from '../../../base/common/network.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { TextEditorCursorStyle } from '../../../editor/common/config/editorOptions.js';
import { score, targetsNotebooks } from '../../../editor/common/languageSelector.js';
import * as languageConfiguration from '../../../editor/common/languages/languageConfiguration.js';
import { OverviewRulerLane } from '../../../editor/common/model.js';
import { ExtensionError, ExtensionIdentifierSet } from '../../../platform/extensions/common/extensions.js';
import * as files from '../../../platform/files/common/files.js';
import { ILogService, ILoggerService, LogLevel } from '../../../platform/log/common/log.js';
import { getRemoteName } from '../../../platform/remote/common/remoteHosts.js';
import { TelemetryTrustedValue } from '../../../platform/telemetry/common/telemetryUtils.js';
import { EditSessionIdentityMatch } from '../../../platform/workspace/common/editSessions.js';
import { DebugConfigurationProviderTriggerKind } from '../../contrib/debug/common/debug.js';
import { UIKind } from '../../services/extensions/common/extensionHostProtocol.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExcludeSettingOptions, TextSearchCompleteMessageType, TextSearchContext2, TextSearchMatch2 } from '../../services/search/common/searchExtTypes.js';
import { CandidatePortSource, ExtHostContext, MainContext } from './extHost.protocol.js';
import { ExtHostRelatedInformation } from './extHostAiRelatedInformation.js';
import { ExtHostApiCommands } from './extHostApiCommands.js';
import { IExtHostApiDeprecationService } from './extHostApiDeprecationService.js';
import { IExtHostAuthentication } from './extHostAuthentication.js';
import { ExtHostBulkEdits } from './extHostBulkEdits.js';
import { ExtHostChatAgents2 } from './extHostChatAgents2.js';
import { ExtHostChatStatus } from './extHostChatStatus.js';
import { ExtHostClipboard } from './extHostClipboard.js';
import { ExtHostEditorInsets } from './extHostCodeInsets.js';
import { ExtHostCodeMapper } from './extHostCodeMapper.js';
import { IExtHostCommands } from './extHostCommands.js';
import { createExtHostComments } from './extHostComments.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { ExtHostCustomEditors } from './extHostCustomEditors.js';
import { IExtHostDebugService } from './extHostDebugService.js';
import { IExtHostDecorations } from './extHostDecorations.js';
import { ExtHostDiagnostics } from './extHostDiagnostics.js';
import { ExtHostDialogs } from './extHostDialogs.js';
import { ExtHostDocumentContentProvider } from './extHostDocumentContentProviders.js';
import { ExtHostDocumentSaveParticipant } from './extHostDocumentSaveParticipant.js';
import { ExtHostDocuments } from './extHostDocuments.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostEditorTabs } from './extHostEditorTabs.js';
import { ExtHostEmbeddings } from './extHostEmbedding.js';
import { ExtHostAiEmbeddingVector } from './extHostEmbeddingVector.js';
import { Extension, IExtHostExtensionService } from './extHostExtensionService.js';
import { ExtHostFileSystem } from './extHostFileSystem.js';
import { IExtHostConsumerFileSystem } from './extHostFileSystemConsumer.js';
import { ExtHostFileSystemEventService } from './extHostFileSystemEventService.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { ExtHostInteractive } from './extHostInteractive.js';
import { ExtHostLabelService } from './extHostLabelService.js';
import { ExtHostLanguageFeatures } from './extHostLanguageFeatures.js';
import { ExtHostLanguageModelTools } from './extHostLanguageModelTools.js';
import { IExtHostLanguageModels } from './extHostLanguageModels.js';
import { ExtHostLanguages } from './extHostLanguages.js';
import { IExtHostLocalizationService } from './extHostLocalizationService.js';
import { IExtHostManagedSockets } from './extHostManagedSockets.js';
import { IExtHostMpcService } from './extHostMcp.js';
import { ExtHostMessageService } from './extHostMessageService.js';
import { ExtHostNotebookController } from './extHostNotebook.js';
import { ExtHostNotebookDocumentSaveParticipant } from './extHostNotebookDocumentSaveParticipant.js';
import { ExtHostNotebookDocuments } from './extHostNotebookDocuments.js';
import { ExtHostNotebookEditors } from './extHostNotebookEditors.js';
import { ExtHostNotebookKernels } from './extHostNotebookKernels.js';
import { ExtHostNotebookRenderers } from './extHostNotebookRenderers.js';
import { IExtHostOutputService } from './extHostOutput.js';
import { ExtHostProfileContentHandlers } from './extHostProfileContentHandler.js';
import { ExtHostProgress } from './extHostProgress.js';
import { ExtHostQuickDiff } from './extHostQuickDiff.js';
import { createExtHostQuickOpen } from './extHostQuickOpen.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtHostSCM } from './extHostSCM.js';
import { IExtHostSearch } from './extHostSearch.js';
import { IExtHostSecretState } from './extHostSecretState.js';
import { ExtHostShare } from './extHostShare.js';
import { ExtHostSpeech } from './extHostSpeech.js';
import { ExtHostStatusBar } from './extHostStatusBar.js';
import { IExtHostStorage } from './extHostStorage.js';
import { IExtensionStoragePaths } from './extHostStoragePaths.js';
import { IExtHostTask } from './extHostTask.js';
import { ExtHostTelemetryLogger, IExtHostTelemetry, isNewAppInstall } from './extHostTelemetry.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostTerminalShellIntegration } from './extHostTerminalShellIntegration.js';
import { IExtHostTesting } from './extHostTesting.js';
import { ExtHostEditors } from './extHostTextEditors.js';
import { ExtHostTheming } from './extHostTheming.js';
import { ExtHostTimeline } from './extHostTimeline.js';
import { ExtHostTreeViews } from './extHostTreeViews.js';
import { IExtHostTunnelService } from './extHostTunnelService.js';
import * as typeConverters from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { ExtHostUriOpeners } from './extHostUriOpener.js';
import { IURITransformerService } from './extHostUriTransformerService.js';
import { ExtHostUrls } from './extHostUrls.js';
import { ExtHostWebviews } from './extHostWebview.js';
import { ExtHostWebviewPanels } from './extHostWebviewPanels.js';
import { ExtHostWebviewViews } from './extHostWebviewView.js';
import { IExtHostWindow } from './extHostWindow.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
/**
 * This method instantiates and returns the extension API surface
 */
export function createApiFactoryAndRegisterActors(accessor) {
    // services
    const initData = accessor.get(IExtHostInitDataService);
    const extHostFileSystemInfo = accessor.get(IExtHostFileSystemInfo);
    const extHostConsumerFileSystem = accessor.get(IExtHostConsumerFileSystem);
    const extensionService = accessor.get(IExtHostExtensionService);
    const extHostWorkspace = accessor.get(IExtHostWorkspace);
    const extHostTelemetry = accessor.get(IExtHostTelemetry);
    const extHostConfiguration = accessor.get(IExtHostConfiguration);
    const uriTransformer = accessor.get(IURITransformerService);
    const rpcProtocol = accessor.get(IExtHostRpcService);
    const extHostStorage = accessor.get(IExtHostStorage);
    const extensionStoragePaths = accessor.get(IExtensionStoragePaths);
    const extHostLoggerService = accessor.get(ILoggerService);
    const extHostLogService = accessor.get(ILogService);
    const extHostTunnelService = accessor.get(IExtHostTunnelService);
    const extHostApiDeprecation = accessor.get(IExtHostApiDeprecationService);
    const extHostWindow = accessor.get(IExtHostWindow);
    const extHostSecretState = accessor.get(IExtHostSecretState);
    const extHostEditorTabs = accessor.get(IExtHostEditorTabs);
    const extHostManagedSockets = accessor.get(IExtHostManagedSockets);
    const extHostAuthentication = accessor.get(IExtHostAuthentication);
    const extHostLanguageModels = accessor.get(IExtHostLanguageModels);
    const extHostMcp = accessor.get(IExtHostMpcService);
    // register addressable instances
    rpcProtocol.set(ExtHostContext.ExtHostFileSystemInfo, extHostFileSystemInfo);
    rpcProtocol.set(ExtHostContext.ExtHostLogLevelServiceShape, extHostLoggerService);
    rpcProtocol.set(ExtHostContext.ExtHostWorkspace, extHostWorkspace);
    rpcProtocol.set(ExtHostContext.ExtHostConfiguration, extHostConfiguration);
    rpcProtocol.set(ExtHostContext.ExtHostExtensionService, extensionService);
    rpcProtocol.set(ExtHostContext.ExtHostStorage, extHostStorage);
    rpcProtocol.set(ExtHostContext.ExtHostTunnelService, extHostTunnelService);
    rpcProtocol.set(ExtHostContext.ExtHostWindow, extHostWindow);
    rpcProtocol.set(ExtHostContext.ExtHostSecretState, extHostSecretState);
    rpcProtocol.set(ExtHostContext.ExtHostTelemetry, extHostTelemetry);
    rpcProtocol.set(ExtHostContext.ExtHostEditorTabs, extHostEditorTabs);
    rpcProtocol.set(ExtHostContext.ExtHostManagedSockets, extHostManagedSockets);
    rpcProtocol.set(ExtHostContext.ExtHostAuthentication, extHostAuthentication);
    rpcProtocol.set(ExtHostContext.ExtHostChatProvider, extHostLanguageModels);
    // automatically create and register addressable instances
    const extHostDecorations = rpcProtocol.set(ExtHostContext.ExtHostDecorations, accessor.get(IExtHostDecorations));
    const extHostDocumentsAndEditors = rpcProtocol.set(ExtHostContext.ExtHostDocumentsAndEditors, accessor.get(IExtHostDocumentsAndEditors));
    const extHostCommands = rpcProtocol.set(ExtHostContext.ExtHostCommands, accessor.get(IExtHostCommands));
    const extHostTerminalService = rpcProtocol.set(ExtHostContext.ExtHostTerminalService, accessor.get(IExtHostTerminalService));
    const extHostTerminalShellIntegration = rpcProtocol.set(ExtHostContext.ExtHostTerminalShellIntegration, accessor.get(IExtHostTerminalShellIntegration));
    const extHostDebugService = rpcProtocol.set(ExtHostContext.ExtHostDebugService, accessor.get(IExtHostDebugService));
    const extHostSearch = rpcProtocol.set(ExtHostContext.ExtHostSearch, accessor.get(IExtHostSearch));
    const extHostTask = rpcProtocol.set(ExtHostContext.ExtHostTask, accessor.get(IExtHostTask));
    const extHostOutputService = rpcProtocol.set(ExtHostContext.ExtHostOutputService, accessor.get(IExtHostOutputService));
    const extHostLocalization = rpcProtocol.set(ExtHostContext.ExtHostLocalization, accessor.get(IExtHostLocalizationService));
    // manually create and register addressable instances
    const extHostUrls = rpcProtocol.set(ExtHostContext.ExtHostUrls, new ExtHostUrls(rpcProtocol));
    const extHostDocuments = rpcProtocol.set(ExtHostContext.ExtHostDocuments, new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors));
    const extHostDocumentContentProviders = rpcProtocol.set(ExtHostContext.ExtHostDocumentContentProviders, new ExtHostDocumentContentProvider(rpcProtocol, extHostDocumentsAndEditors, extHostLogService));
    const extHostDocumentSaveParticipant = rpcProtocol.set(ExtHostContext.ExtHostDocumentSaveParticipant, new ExtHostDocumentSaveParticipant(extHostLogService, extHostDocuments, rpcProtocol.getProxy(MainContext.MainThreadBulkEdits)));
    const extHostNotebook = rpcProtocol.set(ExtHostContext.ExtHostNotebook, new ExtHostNotebookController(rpcProtocol, extHostCommands, extHostDocumentsAndEditors, extHostDocuments, extHostConsumerFileSystem, extHostSearch, extHostLogService));
    const extHostNotebookDocuments = rpcProtocol.set(ExtHostContext.ExtHostNotebookDocuments, new ExtHostNotebookDocuments(extHostNotebook));
    const extHostNotebookEditors = rpcProtocol.set(ExtHostContext.ExtHostNotebookEditors, new ExtHostNotebookEditors(extHostLogService, extHostNotebook));
    const extHostNotebookKernels = rpcProtocol.set(ExtHostContext.ExtHostNotebookKernels, new ExtHostNotebookKernels(rpcProtocol, initData, extHostNotebook, extHostCommands, extHostLogService));
    const extHostNotebookRenderers = rpcProtocol.set(ExtHostContext.ExtHostNotebookRenderers, new ExtHostNotebookRenderers(rpcProtocol, extHostNotebook));
    const extHostNotebookDocumentSaveParticipant = rpcProtocol.set(ExtHostContext.ExtHostNotebookDocumentSaveParticipant, new ExtHostNotebookDocumentSaveParticipant(extHostLogService, extHostNotebook, rpcProtocol.getProxy(MainContext.MainThreadBulkEdits)));
    const extHostEditors = rpcProtocol.set(ExtHostContext.ExtHostEditors, new ExtHostEditors(rpcProtocol, extHostDocumentsAndEditors));
    const extHostTreeViews = rpcProtocol.set(ExtHostContext.ExtHostTreeViews, new ExtHostTreeViews(rpcProtocol.getProxy(MainContext.MainThreadTreeViews), extHostCommands, extHostLogService));
    const extHostEditorInsets = rpcProtocol.set(ExtHostContext.ExtHostEditorInsets, new ExtHostEditorInsets(rpcProtocol.getProxy(MainContext.MainThreadEditorInsets), extHostEditors, initData.remote));
    const extHostDiagnostics = rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, new ExtHostDiagnostics(rpcProtocol, extHostLogService, extHostFileSystemInfo, extHostDocumentsAndEditors));
    const extHostLanguages = rpcProtocol.set(ExtHostContext.ExtHostLanguages, new ExtHostLanguages(rpcProtocol, extHostDocuments, extHostCommands.converter, uriTransformer));
    const extHostLanguageFeatures = rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, new ExtHostLanguageFeatures(rpcProtocol, uriTransformer, extHostDocuments, extHostCommands, extHostDiagnostics, extHostLogService, extHostApiDeprecation, extHostTelemetry));
    const extHostCodeMapper = rpcProtocol.set(ExtHostContext.ExtHostCodeMapper, new ExtHostCodeMapper(rpcProtocol));
    const extHostFileSystem = rpcProtocol.set(ExtHostContext.ExtHostFileSystem, new ExtHostFileSystem(rpcProtocol, extHostLanguageFeatures));
    const extHostFileSystemEvent = rpcProtocol.set(ExtHostContext.ExtHostFileSystemEventService, new ExtHostFileSystemEventService(rpcProtocol, extHostLogService, extHostDocumentsAndEditors));
    const extHostQuickOpen = rpcProtocol.set(ExtHostContext.ExtHostQuickOpen, createExtHostQuickOpen(rpcProtocol, extHostWorkspace, extHostCommands));
    const extHostSCM = rpcProtocol.set(ExtHostContext.ExtHostSCM, new ExtHostSCM(rpcProtocol, extHostCommands, extHostDocuments, extHostLogService));
    const extHostQuickDiff = rpcProtocol.set(ExtHostContext.ExtHostQuickDiff, new ExtHostQuickDiff(rpcProtocol, uriTransformer));
    const extHostShare = rpcProtocol.set(ExtHostContext.ExtHostShare, new ExtHostShare(rpcProtocol, uriTransformer));
    const extHostComment = rpcProtocol.set(ExtHostContext.ExtHostComments, createExtHostComments(rpcProtocol, extHostCommands, extHostDocuments));
    const extHostProgress = rpcProtocol.set(ExtHostContext.ExtHostProgress, new ExtHostProgress(rpcProtocol.getProxy(MainContext.MainThreadProgress)));
    const extHostLabelService = rpcProtocol.set(ExtHostContext.ExtHostLabelService, new ExtHostLabelService(rpcProtocol));
    const extHostTheming = rpcProtocol.set(ExtHostContext.ExtHostTheming, new ExtHostTheming(rpcProtocol));
    const extHostTimeline = rpcProtocol.set(ExtHostContext.ExtHostTimeline, new ExtHostTimeline(rpcProtocol, extHostCommands));
    const extHostWebviews = rpcProtocol.set(ExtHostContext.ExtHostWebviews, new ExtHostWebviews(rpcProtocol, initData.remote, extHostWorkspace, extHostLogService, extHostApiDeprecation));
    const extHostWebviewPanels = rpcProtocol.set(ExtHostContext.ExtHostWebviewPanels, new ExtHostWebviewPanels(rpcProtocol, extHostWebviews, extHostWorkspace));
    const extHostCustomEditors = rpcProtocol.set(ExtHostContext.ExtHostCustomEditors, new ExtHostCustomEditors(rpcProtocol, extHostDocuments, extensionStoragePaths, extHostWebviews, extHostWebviewPanels));
    const extHostWebviewViews = rpcProtocol.set(ExtHostContext.ExtHostWebviewViews, new ExtHostWebviewViews(rpcProtocol, extHostWebviews));
    const extHostTesting = rpcProtocol.set(ExtHostContext.ExtHostTesting, accessor.get(IExtHostTesting));
    const extHostUriOpeners = rpcProtocol.set(ExtHostContext.ExtHostUriOpeners, new ExtHostUriOpeners(rpcProtocol));
    const extHostProfileContentHandlers = rpcProtocol.set(ExtHostContext.ExtHostProfileContentHandlers, new ExtHostProfileContentHandlers(rpcProtocol));
    rpcProtocol.set(ExtHostContext.ExtHostInteractive, new ExtHostInteractive(rpcProtocol, extHostNotebook, extHostDocumentsAndEditors, extHostCommands, extHostLogService));
    const extHostLanguageModelTools = rpcProtocol.set(ExtHostContext.ExtHostLanguageModelTools, new ExtHostLanguageModelTools(rpcProtocol, extHostLanguageModels));
    const extHostChatAgents2 = rpcProtocol.set(ExtHostContext.ExtHostChatAgents2, new ExtHostChatAgents2(rpcProtocol, extHostLogService, extHostCommands, extHostDocuments, extHostLanguageModels, extHostDiagnostics, extHostLanguageModelTools));
    const extHostAiRelatedInformation = rpcProtocol.set(ExtHostContext.ExtHostAiRelatedInformation, new ExtHostRelatedInformation(rpcProtocol));
    const extHostAiEmbeddingVector = rpcProtocol.set(ExtHostContext.ExtHostAiEmbeddingVector, new ExtHostAiEmbeddingVector(rpcProtocol));
    const extHostStatusBar = rpcProtocol.set(ExtHostContext.ExtHostStatusBar, new ExtHostStatusBar(rpcProtocol, extHostCommands.converter));
    const extHostSpeech = rpcProtocol.set(ExtHostContext.ExtHostSpeech, new ExtHostSpeech(rpcProtocol));
    const extHostEmbeddings = rpcProtocol.set(ExtHostContext.ExtHostEmbeddings, new ExtHostEmbeddings(rpcProtocol));
    rpcProtocol.set(ExtHostContext.ExtHostMcp, accessor.get(IExtHostMpcService));
    // Check that no named customers are missing
    const expected = Object.values(ExtHostContext);
    rpcProtocol.assertRegistered(expected);
    // Other instances
    const extHostBulkEdits = new ExtHostBulkEdits(rpcProtocol, extHostDocumentsAndEditors);
    const extHostClipboard = new ExtHostClipboard(rpcProtocol);
    const extHostMessageService = new ExtHostMessageService(rpcProtocol, extHostLogService);
    const extHostDialogs = new ExtHostDialogs(rpcProtocol);
    const extHostChatStatus = new ExtHostChatStatus(rpcProtocol);
    // Register API-ish commands
    ExtHostApiCommands.register(extHostCommands);
    return function (extension, extensionInfo, configProvider) {
        // Wraps an event with error handling and telemetry so that we know what extension fails
        // handling events. This will prevent us from reporting this as "our" error-telemetry and
        // allows for better blaming
        function _asExtensionEvent(actual) {
            return (listener, thisArgs, disposables) => {
                const handle = actual(e => {
                    try {
                        listener.call(thisArgs, e);
                    }
                    catch (err) {
                        errors.onUnexpectedExternalError(new ExtensionError(extension.identifier, err, 'FAILED to handle event'));
                    }
                });
                disposables?.push(handle);
                return handle;
            };
        }
        // Check document selectors for being overly generic. Technically this isn't a problem but
        // in practice many extensions say they support `fooLang` but need fs-access to do so. Those
        // extension should specify then the `file`-scheme, e.g. `{ scheme: 'fooLang', language: 'fooLang' }`
        // We only inform once, it is not a warning because we just want to raise awareness and because
        // we cannot say if the extension is doing it right or wrong...
        const checkSelector = (function () {
            let done = !extension.isUnderDevelopment;
            function informOnce() {
                if (!done) {
                    extHostLogService.info(`Extension '${extension.identifier.value}' uses a document selector without scheme. Learn more about this: https://go.microsoft.com/fwlink/?linkid=872305`);
                    done = true;
                }
            }
            return function perform(selector) {
                if (Array.isArray(selector)) {
                    selector.forEach(perform);
                }
                else if (typeof selector === 'string') {
                    informOnce();
                }
                else {
                    const filter = selector; // TODO: microsoft/TypeScript#42768
                    if (typeof filter.scheme === 'undefined') {
                        informOnce();
                    }
                    if (typeof filter.exclusive === 'boolean') {
                        checkProposedApiEnabled(extension, 'documentFiltersExclusive');
                    }
                }
                return selector;
            };
        })();
        const authentication = {
            getSession(providerId, scopes, options) {
                if ((typeof options?.forceNewSession === 'object' && options.forceNewSession.learnMore) ||
                    (typeof options?.createIfNone === 'object' && options.createIfNone.learnMore)) {
                    checkProposedApiEnabled(extension, 'authLearnMore');
                }
                return extHostAuthentication.getSession(extension, providerId, scopes, options);
            },
            getAccounts(providerId) {
                return extHostAuthentication.getAccounts(providerId);
            },
            // TODO: remove this after GHPR and Codespaces move off of it
            async hasSession(providerId, scopes) {
                checkProposedApiEnabled(extension, 'authSession');
                return !!(await extHostAuthentication.getSession(extension, providerId, scopes, { silent: true }));
            },
            get onDidChangeSessions() {
                return _asExtensionEvent(extHostAuthentication.getExtensionScopedSessionsEvent(extension.identifier.value));
            },
            registerAuthenticationProvider(id, label, provider, options) {
                return extHostAuthentication.registerAuthenticationProvider(id, label, provider, options);
            }
        };
        // namespace: commands
        const commands = {
            registerCommand(id, command, thisArgs) {
                return extHostCommands.registerCommand(true, id, command, thisArgs, undefined, extension);
            },
            registerTextEditorCommand(id, callback, thisArg) {
                return extHostCommands.registerCommand(true, id, (...args) => {
                    const activeTextEditor = extHostEditors.getActiveTextEditor();
                    if (!activeTextEditor) {
                        extHostLogService.warn('Cannot execute ' + id + ' because there is no active text editor.');
                        return undefined;
                    }
                    return activeTextEditor.edit((edit) => {
                        callback.apply(thisArg, [activeTextEditor, edit, ...args]);
                    }).then((result) => {
                        if (!result) {
                            extHostLogService.warn('Edits from command ' + id + ' were not applied.');
                        }
                    }, (err) => {
                        extHostLogService.warn('An error occurred while running command ' + id, err);
                    });
                }, undefined, undefined, extension);
            },
            registerDiffInformationCommand: (id, callback, thisArg) => {
                checkProposedApiEnabled(extension, 'diffCommand');
                return extHostCommands.registerCommand(true, id, async (...args) => {
                    const activeTextEditor = extHostDocumentsAndEditors.activeEditor(true);
                    if (!activeTextEditor) {
                        extHostLogService.warn('Cannot execute ' + id + ' because there is no active text editor.');
                        return undefined;
                    }
                    const diff = await extHostEditors.getDiffInformation(activeTextEditor.id);
                    callback.apply(thisArg, [diff, ...args]);
                }, undefined, undefined, extension);
            },
            executeCommand(id, ...args) {
                return extHostCommands.executeCommand(id, ...args);
            },
            getCommands(filterInternal = false) {
                return extHostCommands.getCommands(filterInternal);
            }
        };
        // namespace: env
        const env = {
            get machineId() { return initData.telemetryInfo.machineId; },
            get sessionId() { return initData.telemetryInfo.sessionId; },
            get language() { return initData.environment.appLanguage; },
            get appName() { return initData.environment.appName; },
            get appRoot() { return initData.environment.appRoot?.fsPath ?? ''; },
            get appHost() { return initData.environment.appHost; },
            get uriScheme() { return initData.environment.appUriScheme; },
            get clipboard() { return extHostClipboard.value; },
            get shell() {
                return extHostTerminalService.getDefaultShell(false);
            },
            get onDidChangeShell() {
                return _asExtensionEvent(extHostTerminalService.onDidChangeShell);
            },
            get isTelemetryEnabled() {
                return extHostTelemetry.getTelemetryConfiguration();
            },
            get onDidChangeTelemetryEnabled() {
                return _asExtensionEvent(extHostTelemetry.onDidChangeTelemetryEnabled);
            },
            get telemetryConfiguration() {
                checkProposedApiEnabled(extension, 'telemetry');
                return extHostTelemetry.getTelemetryDetails();
            },
            get onDidChangeTelemetryConfiguration() {
                checkProposedApiEnabled(extension, 'telemetry');
                return _asExtensionEvent(extHostTelemetry.onDidChangeTelemetryConfiguration);
            },
            get isNewAppInstall() {
                return isNewAppInstall(initData.telemetryInfo.firstSessionDate);
            },
            createTelemetryLogger(sender, options) {
                ExtHostTelemetryLogger.validateSender(sender);
                return extHostTelemetry.instantiateLogger(extension, sender, options);
            },
            openExternal(uri, options) {
                return extHostWindow.openUri(uri, {
                    allowTunneling: !!initData.remote.authority,
                    allowContributedOpeners: options?.allowContributedOpeners,
                });
            },
            async asExternalUri(uri) {
                if (uri.scheme === initData.environment.appUriScheme) {
                    return extHostUrls.createAppUri(uri);
                }
                try {
                    return await extHostWindow.asExternalUri(uri, { allowTunneling: !!initData.remote.authority });
                }
                catch (err) {
                    if (matchesScheme(uri, Schemas.http) || matchesScheme(uri, Schemas.https)) {
                        return uri;
                    }
                    throw err;
                }
            },
            get remoteName() {
                return getRemoteName(initData.remote.authority);
            },
            get remoteAuthority() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.remote.authority;
            },
            get uiKind() {
                return initData.uiKind;
            },
            get logLevel() {
                return extHostLogService.getLevel();
            },
            get onDidChangeLogLevel() {
                return _asExtensionEvent(extHostLogService.onDidChangeLogLevel);
            },
            get appQuality() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.quality;
            },
            get appCommit() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.commit;
            }
        };
        if (!initData.environment.extensionTestsLocationURI) {
            // allow to patch env-function when running tests
            Object.freeze(env);
        }
        // namespace: tests
        const tests = {
            createTestController(provider, label, refreshHandler) {
                return extHostTesting.createTestController(extension, provider, label, refreshHandler);
            },
            createTestObserver() {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.createTestObserver();
            },
            runTests(provider) {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.runTests(provider);
            },
            registerTestFollowupProvider(provider) {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.registerTestFollowupProvider(provider);
            },
            get onDidChangeTestResults() {
                checkProposedApiEnabled(extension, 'testObserver');
                return _asExtensionEvent(extHostTesting.onResultsChanged);
            },
            get testResults() {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.results;
            },
        };
        // namespace: extensions
        const extensionKind = initData.remote.isRemote
            ? extHostTypes.ExtensionKind.Workspace
            : extHostTypes.ExtensionKind.UI;
        const extensions = {
            getExtension(extensionId, includeFromDifferentExtensionHosts) {
                if (!isProposedApiEnabled(extension, 'extensionsAny')) {
                    includeFromDifferentExtensionHosts = false;
                }
                const mine = extensionInfo.mine.getExtensionDescription(extensionId);
                if (mine) {
                    return new Extension(extensionService, extension.identifier, mine, extensionKind, false);
                }
                if (includeFromDifferentExtensionHosts) {
                    const foreign = extensionInfo.all.getExtensionDescription(extensionId);
                    if (foreign) {
                        return new Extension(extensionService, extension.identifier, foreign, extensionKind /* TODO@alexdima THIS IS WRONG */, true);
                    }
                }
                return undefined;
            },
            get all() {
                const result = [];
                for (const desc of extensionInfo.mine.getAllExtensionDescriptions()) {
                    result.push(new Extension(extensionService, extension.identifier, desc, extensionKind, false));
                }
                return result;
            },
            get allAcrossExtensionHosts() {
                checkProposedApiEnabled(extension, 'extensionsAny');
                const local = new ExtensionIdentifierSet(extensionInfo.mine.getAllExtensionDescriptions().map(desc => desc.identifier));
                const result = [];
                for (const desc of extensionInfo.all.getAllExtensionDescriptions()) {
                    const isFromDifferentExtensionHost = !local.has(desc.identifier);
                    result.push(new Extension(extensionService, extension.identifier, desc, extensionKind /* TODO@alexdima THIS IS WRONG */, isFromDifferentExtensionHost));
                }
                return result;
            },
            get onDidChange() {
                if (isProposedApiEnabled(extension, 'extensionsAny')) {
                    return _asExtensionEvent(Event.any(extensionInfo.mine.onDidChange, extensionInfo.all.onDidChange));
                }
                return _asExtensionEvent(extensionInfo.mine.onDidChange);
            }
        };
        // namespace: languages
        const languages = {
            createDiagnosticCollection(name) {
                return extHostDiagnostics.createDiagnosticCollection(extension.identifier, name);
            },
            get onDidChangeDiagnostics() {
                return _asExtensionEvent(extHostDiagnostics.onDidChangeDiagnostics);
            },
            getDiagnostics: (resource) => {
                return extHostDiagnostics.getDiagnostics(resource);
            },
            getLanguages() {
                return extHostLanguages.getLanguages();
            },
            setTextDocumentLanguage(document, languageId) {
                return extHostLanguages.changeLanguage(document.uri, languageId);
            },
            match(selector, document) {
                const interalSelector = typeConverters.LanguageSelector.from(selector);
                let notebook;
                if (targetsNotebooks(interalSelector)) {
                    notebook = extHostNotebook.notebookDocuments.find(value => value.apiNotebook.getCells().find(c => c.document === document))?.apiNotebook;
                }
                return score(interalSelector, document.uri, document.languageId, true, notebook?.uri, notebook?.notebookType);
            },
            registerCodeActionsProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerCodeActionProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerDocumentPasteEditProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentPasteEditProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerCodeLensProvider(selector, provider) {
                return extHostLanguageFeatures.registerCodeLensProvider(extension, checkSelector(selector), provider);
            },
            registerDefinitionProvider(selector, provider) {
                return extHostLanguageFeatures.registerDefinitionProvider(extension, checkSelector(selector), provider);
            },
            registerDeclarationProvider(selector, provider) {
                return extHostLanguageFeatures.registerDeclarationProvider(extension, checkSelector(selector), provider);
            },
            registerImplementationProvider(selector, provider) {
                return extHostLanguageFeatures.registerImplementationProvider(extension, checkSelector(selector), provider);
            },
            registerTypeDefinitionProvider(selector, provider) {
                return extHostLanguageFeatures.registerTypeDefinitionProvider(extension, checkSelector(selector), provider);
            },
            registerHoverProvider(selector, provider) {
                return extHostLanguageFeatures.registerHoverProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerEvaluatableExpressionProvider(selector, provider) {
                return extHostLanguageFeatures.registerEvaluatableExpressionProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerInlineValuesProvider(selector, provider) {
                return extHostLanguageFeatures.registerInlineValuesProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerDocumentHighlightProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentHighlightProvider(extension, checkSelector(selector), provider);
            },
            registerMultiDocumentHighlightProvider(selector, provider) {
                return extHostLanguageFeatures.registerMultiDocumentHighlightProvider(extension, checkSelector(selector), provider);
            },
            registerLinkedEditingRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerLinkedEditingRangeProvider(extension, checkSelector(selector), provider);
            },
            registerReferenceProvider(selector, provider) {
                return extHostLanguageFeatures.registerReferenceProvider(extension, checkSelector(selector), provider);
            },
            registerRenameProvider(selector, provider) {
                return extHostLanguageFeatures.registerRenameProvider(extension, checkSelector(selector), provider);
            },
            registerNewSymbolNamesProvider(selector, provider) {
                checkProposedApiEnabled(extension, 'newSymbolNamesProvider');
                return extHostLanguageFeatures.registerNewSymbolNamesProvider(extension, checkSelector(selector), provider);
            },
            registerDocumentSymbolProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentSymbolProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerWorkspaceSymbolProvider(provider) {
                return extHostLanguageFeatures.registerWorkspaceSymbolProvider(extension, provider);
            },
            registerDocumentFormattingEditProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentFormattingEditProvider(extension, checkSelector(selector), provider);
            },
            registerDocumentRangeFormattingEditProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentRangeFormattingEditProvider(extension, checkSelector(selector), provider);
            },
            registerOnTypeFormattingEditProvider(selector, provider, firstTriggerCharacter, ...moreTriggerCharacters) {
                return extHostLanguageFeatures.registerOnTypeFormattingEditProvider(extension, checkSelector(selector), provider, [firstTriggerCharacter].concat(moreTriggerCharacters));
            },
            registerDocumentSemanticTokensProvider(selector, provider, legend) {
                return extHostLanguageFeatures.registerDocumentSemanticTokensProvider(extension, checkSelector(selector), provider, legend);
            },
            registerDocumentRangeSemanticTokensProvider(selector, provider, legend) {
                return extHostLanguageFeatures.registerDocumentRangeSemanticTokensProvider(extension, checkSelector(selector), provider, legend);
            },
            registerSignatureHelpProvider(selector, provider, firstItem, ...remaining) {
                if (typeof firstItem === 'object') {
                    return extHostLanguageFeatures.registerSignatureHelpProvider(extension, checkSelector(selector), provider, firstItem);
                }
                return extHostLanguageFeatures.registerSignatureHelpProvider(extension, checkSelector(selector), provider, typeof firstItem === 'undefined' ? [] : [firstItem, ...remaining]);
            },
            registerCompletionItemProvider(selector, provider, ...triggerCharacters) {
                return extHostLanguageFeatures.registerCompletionItemProvider(extension, checkSelector(selector), provider, triggerCharacters);
            },
            registerInlineCompletionItemProvider(selector, provider, metadata) {
                if (provider.handleDidShowCompletionItem) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                if (provider.handleDidPartiallyAcceptCompletionItem) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                if (metadata) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                return extHostLanguageFeatures.registerInlineCompletionsProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerInlineEditProvider(selector, provider) {
                checkProposedApiEnabled(extension, 'inlineEdit');
                return extHostLanguageFeatures.registerInlineEditProvider(extension, checkSelector(selector), provider);
            },
            registerDocumentLinkProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentLinkProvider(extension, checkSelector(selector), provider);
            },
            registerColorProvider(selector, provider) {
                return extHostLanguageFeatures.registerColorProvider(extension, checkSelector(selector), provider);
            },
            registerFoldingRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerFoldingRangeProvider(extension, checkSelector(selector), provider);
            },
            registerSelectionRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerSelectionRangeProvider(extension, selector, provider);
            },
            registerCallHierarchyProvider(selector, provider) {
                return extHostLanguageFeatures.registerCallHierarchyProvider(extension, selector, provider);
            },
            registerTypeHierarchyProvider(selector, provider) {
                return extHostLanguageFeatures.registerTypeHierarchyProvider(extension, selector, provider);
            },
            setLanguageConfiguration: (language, configuration) => {
                return extHostLanguageFeatures.setLanguageConfiguration(extension, language, configuration);
            },
            getTokenInformationAtPosition(doc, pos) {
                checkProposedApiEnabled(extension, 'tokenInformation');
                return extHostLanguages.tokenAtPosition(doc, pos);
            },
            registerInlayHintsProvider(selector, provider) {
                return extHostLanguageFeatures.registerInlayHintsProvider(extension, selector, provider);
            },
            createLanguageStatusItem(id, selector) {
                return extHostLanguages.createLanguageStatusItem(extension, id, selector);
            },
            registerDocumentDropEditProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentOnDropEditProvider(extension, selector, provider, metadata);
            }
        };
        // namespace: window
        const window = {
            get activeTextEditor() {
                return extHostEditors.getActiveTextEditor();
            },
            get visibleTextEditors() {
                return extHostEditors.getVisibleTextEditors();
            },
            get activeTerminal() {
                return extHostTerminalService.activeTerminal;
            },
            get terminals() {
                return extHostTerminalService.terminals;
            },
            async showTextDocument(documentOrUri, columnOrOptions, preserveFocus) {
                if (URI.isUri(documentOrUri) && documentOrUri.scheme === Schemas.vscodeRemote && !documentOrUri.authority) {
                    extHostApiDeprecation.report('workspace.showTextDocument', extension, `A URI of 'vscode-remote' scheme requires an authority.`);
                }
                const document = await (URI.isUri(documentOrUri)
                    ? Promise.resolve(workspace.openTextDocument(documentOrUri))
                    : Promise.resolve(documentOrUri));
                return extHostEditors.showTextDocument(document, columnOrOptions, preserveFocus);
            },
            createTextEditorDecorationType(options) {
                return extHostEditors.createTextEditorDecorationType(extension, options);
            },
            onDidChangeActiveTextEditor(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeActiveTextEditor)(listener, thisArg, disposables);
            },
            onDidChangeVisibleTextEditors(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeVisibleTextEditors)(listener, thisArg, disposables);
            },
            onDidChangeTextEditorSelection(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorSelection)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorOptions(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorOptions)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorVisibleRanges(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorVisibleRanges)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorViewColumn(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorViewColumn)(listener, thisArg, disposables);
            },
            onDidChangeTextEditorDiffInformation(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'textEditorDiffInformation');
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorDiffInformation)(listener, thisArg, disposables);
            },
            onDidCloseTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidCloseTerminal)(listener, thisArg, disposables);
            },
            onDidOpenTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidOpenTerminal)(listener, thisArg, disposables);
            },
            onDidChangeActiveTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidChangeActiveTerminal)(listener, thisArg, disposables);
            },
            onDidChangeTerminalDimensions(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalDimensions');
                return _asExtensionEvent(extHostTerminalService.onDidChangeTerminalDimensions)(listener, thisArg, disposables);
            },
            onDidChangeTerminalState(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidChangeTerminalState)(listener, thisArg, disposables);
            },
            onDidWriteTerminalData(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalDataWriteEvent');
                return _asExtensionEvent(extHostTerminalService.onDidWriteTerminalData)(listener, thisArg, disposables);
            },
            onDidExecuteTerminalCommand(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalExecuteCommandEvent');
                return _asExtensionEvent(extHostTerminalService.onDidExecuteTerminalCommand)(listener, thisArg, disposables);
            },
            onDidChangeTerminalShellIntegration(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidChangeTerminalShellIntegration)(listener, thisArg, disposables);
            },
            onDidStartTerminalShellExecution(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidStartTerminalShellExecution)(listener, thisArg, disposables);
            },
            onDidEndTerminalShellExecution(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidEndTerminalShellExecution)(listener, thisArg, disposables);
            },
            get state() {
                return extHostWindow.getState();
            },
            onDidChangeWindowState(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostWindow.onDidChangeWindowState)(listener, thisArg, disposables);
            },
            showInformationMessage(message, ...rest) {
                return extHostMessageService.showMessage(extension, Severity.Info, message, rest[0], rest.slice(1));
            },
            showWarningMessage(message, ...rest) {
                return extHostMessageService.showMessage(extension, Severity.Warning, message, rest[0], rest.slice(1));
            },
            showErrorMessage(message, ...rest) {
                return extHostMessageService.showMessage(extension, Severity.Error, message, rest[0], rest.slice(1));
            },
            showQuickPick(items, options, token) {
                return extHostQuickOpen.showQuickPick(extension, items, options, token);
            },
            showWorkspaceFolderPick(options) {
                return extHostQuickOpen.showWorkspaceFolderPick(options);
            },
            showInputBox(options, token) {
                return extHostQuickOpen.showInput(options, token);
            },
            showOpenDialog(options) {
                return extHostDialogs.showOpenDialog(options);
            },
            showSaveDialog(options) {
                return extHostDialogs.showSaveDialog(options);
            },
            createStatusBarItem(alignmentOrId, priorityOrAlignment, priorityArg) {
                let id;
                let alignment;
                let priority;
                if (typeof alignmentOrId === 'string') {
                    id = alignmentOrId;
                    alignment = priorityOrAlignment;
                    priority = priorityArg;
                }
                else {
                    alignment = alignmentOrId;
                    priority = priorityOrAlignment;
                }
                return extHostStatusBar.createStatusBarEntry(extension, id, alignment, priority);
            },
            setStatusBarMessage(text, timeoutOrThenable) {
                return extHostStatusBar.setStatusBarMessage(text, timeoutOrThenable);
            },
            withScmProgress(task) {
                extHostApiDeprecation.report('window.withScmProgress', extension, `Use 'withProgress' instead.`);
                return extHostProgress.withProgress(extension, { location: extHostTypes.ProgressLocation.SourceControl }, (progress, token) => task({ report(n) { } }));
            },
            withProgress(options, task) {
                return extHostProgress.withProgress(extension, options, task);
            },
            createOutputChannel(name, options) {
                return extHostOutputService.createOutputChannel(name, options, extension);
            },
            createWebviewPanel(viewType, title, showOptions, options) {
                return extHostWebviewPanels.createWebviewPanel(extension, viewType, title, showOptions, options);
            },
            createWebviewTextEditorInset(editor, line, height, options) {
                checkProposedApiEnabled(extension, 'editorInsets');
                return extHostEditorInsets.createWebviewEditorInset(editor, line, height, options, extension);
            },
            createTerminal(nameOrOptions, shellPath, shellArgs) {
                if (typeof nameOrOptions === 'object') {
                    if ('pty' in nameOrOptions) {
                        return extHostTerminalService.createExtensionTerminal(nameOrOptions);
                    }
                    return extHostTerminalService.createTerminalFromOptions(nameOrOptions);
                }
                return extHostTerminalService.createTerminal(nameOrOptions, shellPath, shellArgs);
            },
            registerTerminalLinkProvider(provider) {
                return extHostTerminalService.registerLinkProvider(provider);
            },
            registerTerminalProfileProvider(id, provider) {
                return extHostTerminalService.registerProfileProvider(extension, id, provider);
            },
            registerTerminalCompletionProvider(provider, ...triggerCharacters) {
                checkProposedApiEnabled(extension, 'terminalCompletionProvider');
                return extHostTerminalService.registerTerminalCompletionProvider(extension, provider, ...triggerCharacters);
            },
            registerTerminalQuickFixProvider(id, provider) {
                checkProposedApiEnabled(extension, 'terminalQuickFixProvider');
                return extHostTerminalService.registerTerminalQuickFixProvider(id, extension.identifier.value, provider);
            },
            registerTreeDataProvider(viewId, treeDataProvider) {
                return extHostTreeViews.registerTreeDataProvider(viewId, treeDataProvider, extension);
            },
            createTreeView(viewId, options) {
                return extHostTreeViews.createTreeView(viewId, options, extension);
            },
            registerWebviewPanelSerializer: (viewType, serializer) => {
                return extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializer);
            },
            registerCustomEditorProvider: (viewType, provider, options = {}) => {
                return extHostCustomEditors.registerCustomEditorProvider(extension, viewType, provider, options);
            },
            registerFileDecorationProvider(provider) {
                return extHostDecorations.registerFileDecorationProvider(provider, extension);
            },
            registerUriHandler(handler) {
                return extHostUrls.registerUriHandler(extension, handler);
            },
            createQuickPick() {
                return extHostQuickOpen.createQuickPick(extension);
            },
            createInputBox() {
                return extHostQuickOpen.createInputBox(extension);
            },
            get activeColorTheme() {
                return extHostTheming.activeColorTheme;
            },
            onDidChangeActiveColorTheme(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTheming.onDidChangeActiveColorTheme)(listener, thisArg, disposables);
            },
            registerWebviewViewProvider(viewId, provider, options) {
                return extHostWebviewViews.registerWebviewViewProvider(extension, viewId, provider, options?.webviewOptions);
            },
            get activeNotebookEditor() {
                return extHostNotebook.activeNotebookEditor;
            },
            onDidChangeActiveNotebookEditor(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebook.onDidChangeActiveNotebookEditor)(listener, thisArgs, disposables);
            },
            get visibleNotebookEditors() {
                return extHostNotebook.visibleNotebookEditors;
            },
            get onDidChangeVisibleNotebookEditors() {
                return _asExtensionEvent(extHostNotebook.onDidChangeVisibleNotebookEditors);
            },
            onDidChangeNotebookEditorSelection(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebookEditors.onDidChangeNotebookEditorSelection)(listener, thisArgs, disposables);
            },
            onDidChangeNotebookEditorVisibleRanges(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebookEditors.onDidChangeNotebookEditorVisibleRanges)(listener, thisArgs, disposables);
            },
            showNotebookDocument(document, options) {
                return extHostNotebook.showNotebookDocument(document, options);
            },
            registerExternalUriOpener(id, opener, metadata) {
                checkProposedApiEnabled(extension, 'externalUriOpener');
                return extHostUriOpeners.registerExternalUriOpener(extension.identifier, id, opener, metadata);
            },
            registerProfileContentHandler(id, handler) {
                checkProposedApiEnabled(extension, 'profileContentHandlers');
                return extHostProfileContentHandlers.registerProfileContentHandler(extension, id, handler);
            },
            registerQuickDiffProvider(selector, quickDiffProvider, label, rootUri) {
                checkProposedApiEnabled(extension, 'quickDiffProvider');
                return extHostQuickDiff.registerQuickDiffProvider(checkSelector(selector), quickDiffProvider, label, rootUri);
            },
            get tabGroups() {
                return extHostEditorTabs.tabGroups;
            },
            registerShareProvider(selector, provider) {
                checkProposedApiEnabled(extension, 'shareProvider');
                return extHostShare.registerShareProvider(checkSelector(selector), provider);
            },
            get nativeHandle() {
                checkProposedApiEnabled(extension, 'nativeWindowHandle');
                return extHostWindow.nativeHandle;
            },
            createChatStatusItem: (id) => {
                checkProposedApiEnabled(extension, 'chatStatusItem');
                return extHostChatStatus.createChatStatusItem(extension, id);
            },
        };
        // namespace: workspace
        const workspace = {
            get rootPath() {
                extHostApiDeprecation.report('workspace.rootPath', extension, `Please use 'workspace.workspaceFolders' instead. More details: https://aka.ms/vscode-eliminating-rootpath`);
                return extHostWorkspace.getPath();
            },
            set rootPath(value) {
                throw new errors.ReadonlyError('rootPath');
            },
            getWorkspaceFolder(resource) {
                return extHostWorkspace.getWorkspaceFolder(resource);
            },
            get workspaceFolders() {
                return extHostWorkspace.getWorkspaceFolders();
            },
            get name() {
                return extHostWorkspace.name;
            },
            set name(value) {
                throw new errors.ReadonlyError('name');
            },
            get workspaceFile() {
                return extHostWorkspace.workspaceFile;
            },
            set workspaceFile(value) {
                throw new errors.ReadonlyError('workspaceFile');
            },
            updateWorkspaceFolders: (index, deleteCount, ...workspaceFoldersToAdd) => {
                return extHostWorkspace.updateWorkspaceFolders(extension, index, deleteCount || 0, ...workspaceFoldersToAdd);
            },
            onDidChangeWorkspaceFolders: function (listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostWorkspace.onDidChangeWorkspace)(listener, thisArgs, disposables);
            },
            asRelativePath: (pathOrUri, includeWorkspace) => {
                return extHostWorkspace.getRelativePath(pathOrUri, includeWorkspace);
            },
            findFiles: (include, exclude, maxResults, token) => {
                // Note, undefined/null have different meanings on "exclude"
                return extHostWorkspace.findFiles(include, exclude, maxResults, extension.identifier, token);
            },
            findFiles2: (filePattern, options, token) => {
                checkProposedApiEnabled(extension, 'findFiles2');
                return extHostWorkspace.findFiles2(filePattern, options, extension.identifier, token);
            },
            findTextInFiles: (query, optionsOrCallback, callbackOrToken, token) => {
                checkProposedApiEnabled(extension, 'findTextInFiles');
                let options;
                let callback;
                if (typeof optionsOrCallback === 'object') {
                    options = optionsOrCallback;
                    callback = callbackOrToken;
                }
                else {
                    options = {};
                    callback = optionsOrCallback;
                    token = callbackOrToken;
                }
                return extHostWorkspace.findTextInFiles(query, options || {}, callback, extension.identifier, token);
            },
            findTextInFiles2: (query, options, token) => {
                checkProposedApiEnabled(extension, 'findTextInFiles2');
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostWorkspace.findTextInFiles2(query, options, extension.identifier, token);
            },
            save: (uri) => {
                return extHostWorkspace.save(uri);
            },
            saveAs: (uri) => {
                return extHostWorkspace.saveAs(uri);
            },
            saveAll: (includeUntitled) => {
                return extHostWorkspace.saveAll(includeUntitled);
            },
            applyEdit(edit, metadata) {
                return extHostBulkEdits.applyWorkspaceEdit(edit, extension, metadata);
            },
            createFileSystemWatcher: (pattern, optionsOrIgnoreCreate, ignoreChange, ignoreDelete) => {
                const options = {
                    ignoreCreateEvents: Boolean(optionsOrIgnoreCreate),
                    ignoreChangeEvents: Boolean(ignoreChange),
                    ignoreDeleteEvents: Boolean(ignoreDelete),
                };
                return extHostFileSystemEvent.createFileSystemWatcher(extHostWorkspace, configProvider, extension, pattern, options);
            },
            get textDocuments() {
                return extHostDocuments.getAllDocumentData().map(data => data.document);
            },
            set textDocuments(value) {
                throw new errors.ReadonlyError('textDocuments');
            },
            openTextDocument(uriOrFileNameOrOptions, options) {
                let uriPromise;
                options = (options ?? uriOrFileNameOrOptions);
                if (typeof options?.encoding === 'string') {
                    checkProposedApiEnabled(extension, 'textDocumentEncoding');
                }
                if (typeof uriOrFileNameOrOptions === 'string') {
                    uriPromise = Promise.resolve(URI.file(uriOrFileNameOrOptions));
                }
                else if (URI.isUri(uriOrFileNameOrOptions)) {
                    uriPromise = Promise.resolve(uriOrFileNameOrOptions);
                }
                else if (!options || typeof options === 'object') {
                    uriPromise = extHostDocuments.createDocumentData(options);
                }
                else {
                    throw new Error('illegal argument - uriOrFileNameOrOptions');
                }
                return uriPromise.then(uri => {
                    extHostLogService.trace(`openTextDocument from ${extension.identifier}`);
                    if (uri.scheme === Schemas.vscodeRemote && !uri.authority) {
                        extHostApiDeprecation.report('workspace.openTextDocument', extension, `A URI of 'vscode-remote' scheme requires an authority.`);
                    }
                    return extHostDocuments.ensureDocumentData(uri, options).then(documentData => {
                        return documentData.document;
                    });
                });
            },
            onDidOpenTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidAddDocument)(listener, thisArgs, disposables);
            },
            onDidCloseTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidRemoveDocument)(listener, thisArgs, disposables);
            },
            onDidChangeTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidChangeDocument)(listener, thisArgs, disposables);
            },
            onDidSaveTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidSaveDocument)(listener, thisArgs, disposables);
            },
            onWillSaveTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocumentSaveParticipant.getOnWillSaveTextDocumentEvent(extension))(listener, thisArgs, disposables);
            },
            get notebookDocuments() {
                return extHostNotebook.notebookDocuments.map(d => d.apiNotebook);
            },
            async openNotebookDocument(uriOrType, content) {
                let uri;
                if (URI.isUri(uriOrType)) {
                    uri = uriOrType;
                    await extHostNotebook.openNotebookDocument(uriOrType);
                }
                else if (typeof uriOrType === 'string') {
                    uri = URI.revive(await extHostNotebook.createNotebookDocument({ viewType: uriOrType, content }));
                }
                else {
                    throw new Error('Invalid arguments');
                }
                return extHostNotebook.getNotebookDocument(uri).apiNotebook;
            },
            onDidSaveNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocuments.onDidSaveNotebookDocument)(listener, thisArg, disposables);
            },
            onDidChangeNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocuments.onDidChangeNotebookDocument)(listener, thisArg, disposables);
            },
            onWillSaveNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocumentSaveParticipant.getOnWillSaveNotebookDocumentEvent(extension))(listener, thisArg, disposables);
            },
            get onDidOpenNotebookDocument() {
                return _asExtensionEvent(extHostNotebook.onDidOpenNotebookDocument);
            },
            get onDidCloseNotebookDocument() {
                return _asExtensionEvent(extHostNotebook.onDidCloseNotebookDocument);
            },
            registerNotebookSerializer(viewType, serializer, options, registration) {
                return extHostNotebook.registerNotebookSerializer(extension, viewType, serializer, options, isProposedApiEnabled(extension, 'notebookLiveShare') ? registration : undefined);
            },
            onDidChangeConfiguration: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(configProvider.onDidChangeConfiguration)(listener, thisArgs, disposables);
            },
            getConfiguration(section, scope) {
                scope = arguments.length === 1 ? undefined : scope;
                return configProvider.getConfiguration(section, scope, extension);
            },
            registerTextDocumentContentProvider(scheme, provider) {
                return extHostDocumentContentProviders.registerTextDocumentContentProvider(scheme, provider);
            },
            registerTaskProvider: (type, provider) => {
                extHostApiDeprecation.report('window.registerTaskProvider', extension, `Use the corresponding function on the 'tasks' namespace instead`);
                return extHostTask.registerTaskProvider(extension, type, provider);
            },
            registerFileSystemProvider(scheme, provider, options) {
                return combinedDisposable(extHostFileSystem.registerFileSystemProvider(extension, scheme, provider, options), extHostConsumerFileSystem.addFileSystemProvider(scheme, provider, options));
            },
            get fs() {
                return extHostConsumerFileSystem.value;
            },
            registerFileSearchProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'fileSearchProvider');
                return extHostSearch.registerFileSearchProviderOld(scheme, provider);
            },
            registerTextSearchProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'textSearchProvider');
                return extHostSearch.registerTextSearchProviderOld(scheme, provider);
            },
            registerAITextSearchProvider: (scheme, provider) => {
                // there are some dependencies on textSearchProvider, so we need to check for both
                checkProposedApiEnabled(extension, 'aiTextSearchProvider');
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostSearch.registerAITextSearchProvider(scheme, provider);
            },
            registerFileSearchProvider2: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'fileSearchProvider2');
                return extHostSearch.registerFileSearchProvider(scheme, provider);
            },
            registerTextSearchProvider2: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostSearch.registerTextSearchProvider(scheme, provider);
            },
            registerRemoteAuthorityResolver: (authorityPrefix, resolver) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extensionService.registerRemoteAuthorityResolver(authorityPrefix, resolver);
            },
            registerResourceLabelFormatter: (formatter) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extHostLabelService.$registerResourceLabelFormatter(formatter);
            },
            getRemoteExecServer: (authority) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extensionService.getRemoteExecServer(authority);
            },
            onDidCreateFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidCreateFile)(listener, thisArg, disposables);
            },
            onDidDeleteFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidDeleteFile)(listener, thisArg, disposables);
            },
            onDidRenameFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidRenameFile)(listener, thisArg, disposables);
            },
            onWillCreateFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillCreateFileEvent(extension))(listener, thisArg, disposables);
            },
            onWillDeleteFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillDeleteFileEvent(extension))(listener, thisArg, disposables);
            },
            onWillRenameFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillRenameFileEvent(extension))(listener, thisArg, disposables);
            },
            openTunnel: (forward) => {
                checkProposedApiEnabled(extension, 'tunnels');
                return extHostTunnelService.openTunnel(extension, forward).then(value => {
                    if (!value) {
                        throw new Error('cannot open tunnel');
                    }
                    return value;
                });
            },
            get tunnels() {
                checkProposedApiEnabled(extension, 'tunnels');
                return extHostTunnelService.getTunnels();
            },
            onDidChangeTunnels: (listener, thisArg, disposables) => {
                checkProposedApiEnabled(extension, 'tunnels');
                return _asExtensionEvent(extHostTunnelService.onDidChangeTunnels)(listener, thisArg, disposables);
            },
            registerPortAttributesProvider: (portSelector, provider) => {
                checkProposedApiEnabled(extension, 'portsAttributes');
                return extHostTunnelService.registerPortsAttributesProvider(portSelector, provider);
            },
            registerTunnelProvider: (tunnelProvider, information) => {
                checkProposedApiEnabled(extension, 'tunnelFactory');
                return extHostTunnelService.registerTunnelProvider(tunnelProvider, information);
            },
            registerTimelineProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'timeline');
                return extHostTimeline.registerTimelineProvider(scheme, provider, extension.identifier, extHostCommands.converter);
            },
            get isTrusted() {
                return extHostWorkspace.trusted;
            },
            requestWorkspaceTrust: (options) => {
                checkProposedApiEnabled(extension, 'workspaceTrust');
                return extHostWorkspace.requestWorkspaceTrust(options);
            },
            onDidGrantWorkspaceTrust: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostWorkspace.onDidGrantWorkspaceTrust)(listener, thisArgs, disposables);
            },
            registerEditSessionIdentityProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'editSessionIdentityProvider');
                return extHostWorkspace.registerEditSessionIdentityProvider(scheme, provider);
            },
            onWillCreateEditSessionIdentity: (listener, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'editSessionIdentityProvider');
                return _asExtensionEvent(extHostWorkspace.getOnWillCreateEditSessionIdentityEvent(extension))(listener, thisArgs, disposables);
            },
            registerCanonicalUriProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'canonicalUriProvider');
                return extHostWorkspace.registerCanonicalUriProvider(scheme, provider);
            },
            getCanonicalUri: (uri, options, token) => {
                checkProposedApiEnabled(extension, 'canonicalUriProvider');
                return extHostWorkspace.provideCanonicalUri(uri, options, token);
            },
            decode(content, uri, options) {
                checkProposedApiEnabled(extension, 'textDocumentEncoding');
                return extHostWorkspace.decode(content, uri, options);
            },
            encode(content, uri, options) {
                checkProposedApiEnabled(extension, 'textDocumentEncoding');
                return extHostWorkspace.encode(content, uri, options);
            }
        };
        // namespace: scm
        const scm = {
            get inputBox() {
                extHostApiDeprecation.report('scm.inputBox', extension, `Use 'SourceControl.inputBox' instead`);
                return extHostSCM.getLastInputBox(extension); // Strict null override - Deprecated api
            },
            createSourceControl(id, label, rootUri) {
                return extHostSCM.createSourceControl(extension, id, label, rootUri);
            }
        };
        // namespace: comments
        const comments = {
            createCommentController(id, label) {
                return extHostComment.createCommentController(extension, id, label);
            }
        };
        // namespace: debug
        const debug = {
            get activeDebugSession() {
                return extHostDebugService.activeDebugSession;
            },
            get activeDebugConsole() {
                return extHostDebugService.activeDebugConsole;
            },
            get breakpoints() {
                return extHostDebugService.breakpoints;
            },
            get activeStackItem() {
                return extHostDebugService.activeStackItem;
            },
            registerDebugVisualizationProvider(id, provider) {
                checkProposedApiEnabled(extension, 'debugVisualization');
                return extHostDebugService.registerDebugVisualizationProvider(extension, id, provider);
            },
            registerDebugVisualizationTreeProvider(id, provider) {
                checkProposedApiEnabled(extension, 'debugVisualization');
                return extHostDebugService.registerDebugVisualizationTree(extension, id, provider);
            },
            onDidStartDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidStartDebugSession)(listener, thisArg, disposables);
            },
            onDidTerminateDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidTerminateDebugSession)(listener, thisArg, disposables);
            },
            onDidChangeActiveDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeActiveDebugSession)(listener, thisArg, disposables);
            },
            onDidReceiveDebugSessionCustomEvent(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidReceiveDebugSessionCustomEvent)(listener, thisArg, disposables);
            },
            onDidChangeBreakpoints(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeBreakpoints)(listener, thisArgs, disposables);
            },
            onDidChangeActiveStackItem(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeActiveStackItem)(listener, thisArg, disposables);
            },
            registerDebugConfigurationProvider(debugType, provider, triggerKind) {
                return extHostDebugService.registerDebugConfigurationProvider(debugType, provider, triggerKind || DebugConfigurationProviderTriggerKind.Initial);
            },
            registerDebugAdapterDescriptorFactory(debugType, factory) {
                return extHostDebugService.registerDebugAdapterDescriptorFactory(extension, debugType, factory);
            },
            registerDebugAdapterTrackerFactory(debugType, factory) {
                return extHostDebugService.registerDebugAdapterTrackerFactory(debugType, factory);
            },
            startDebugging(folder, nameOrConfig, parentSessionOrOptions) {
                if (!parentSessionOrOptions || (typeof parentSessionOrOptions === 'object' && 'configuration' in parentSessionOrOptions)) {
                    return extHostDebugService.startDebugging(folder, nameOrConfig, { parentSession: parentSessionOrOptions });
                }
                return extHostDebugService.startDebugging(folder, nameOrConfig, parentSessionOrOptions || {});
            },
            stopDebugging(session) {
                return extHostDebugService.stopDebugging(session);
            },
            addBreakpoints(breakpoints) {
                return extHostDebugService.addBreakpoints(breakpoints);
            },
            removeBreakpoints(breakpoints) {
                return extHostDebugService.removeBreakpoints(breakpoints);
            },
            asDebugSourceUri(source, session) {
                return extHostDebugService.asDebugSourceUri(source, session);
            }
        };
        const tasks = {
            registerTaskProvider: (type, provider) => {
                return extHostTask.registerTaskProvider(extension, type, provider);
            },
            fetchTasks: (filter) => {
                return extHostTask.fetchTasks(filter);
            },
            executeTask: (task) => {
                return extHostTask.executeTask(extension, task);
            },
            get taskExecutions() {
                return extHostTask.taskExecutions;
            },
            onDidStartTask: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidStartTask)(listeners, thisArgs, disposables);
            },
            onDidEndTask: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidEndTask)(listeners, thisArgs, disposables);
            },
            onDidStartTaskProcess: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidStartTaskProcess)(listeners, thisArgs, disposables);
            },
            onDidEndTaskProcess: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidEndTaskProcess)(listeners, thisArgs, disposables);
            },
            onDidStartTaskProblemMatchers: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'taskProblemMatcherStatus');
                return _asExtensionEvent(extHostTask.onDidStartTaskProblemMatchers)(listeners, thisArgs, disposables);
            },
            onDidEndTaskProblemMatchers: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'taskProblemMatcherStatus');
                return _asExtensionEvent(extHostTask.onDidEndTaskProblemMatchers)(listeners, thisArgs, disposables);
            }
        };
        // namespace: notebook
        const notebooks = {
            createNotebookController(id, notebookType, label, handler, rendererScripts) {
                return extHostNotebookKernels.createNotebookController(extension, id, notebookType, label, handler, isProposedApiEnabled(extension, 'notebookMessaging') ? rendererScripts : undefined);
            },
            registerNotebookCellStatusBarItemProvider: (notebookType, provider) => {
                return extHostNotebook.registerNotebookCellStatusBarItemProvider(extension, notebookType, provider);
            },
            createRendererMessaging(rendererId) {
                return extHostNotebookRenderers.createRendererMessaging(extension, rendererId);
            },
            createNotebookControllerDetectionTask(notebookType) {
                checkProposedApiEnabled(extension, 'notebookKernelSource');
                return extHostNotebookKernels.createNotebookControllerDetectionTask(extension, notebookType);
            },
            registerKernelSourceActionProvider(notebookType, provider) {
                checkProposedApiEnabled(extension, 'notebookKernelSource');
                return extHostNotebookKernels.registerKernelSourceActionProvider(extension, notebookType, provider);
            },
            onDidChangeNotebookCellExecutionState(listener, thisArgs, disposables) {
                checkProposedApiEnabled(extension, 'notebookCellExecutionState');
                return _asExtensionEvent(extHostNotebookKernels.onDidChangeNotebookCellExecutionState)(listener, thisArgs, disposables);
            }
        };
        // namespace: l10n
        const l10n = {
            t(...params) {
                if (typeof params[0] === 'string') {
                    const key = params.shift();
                    // We have either rest args which are Array<string | number | boolean> or an array with a single Record<string, any>.
                    // This ensures we get a Record<string | number, any> which will be formatted correctly.
                    const argsFormatted = !params || typeof params[0] !== 'object' ? params : params[0];
                    return extHostLocalization.getMessage(extension.identifier.value, { message: key, args: argsFormatted });
                }
                return extHostLocalization.getMessage(extension.identifier.value, params[0]);
            },
            get bundle() {
                return extHostLocalization.getBundle(extension.identifier.value);
            },
            get uri() {
                return extHostLocalization.getBundleUri(extension.identifier.value);
            }
        };
        // namespace: interactive
        const interactive = {
            transferActiveChat(toWorkspace) {
                checkProposedApiEnabled(extension, 'interactive');
                return extHostChatAgents2.transferActiveChat(toWorkspace);
            }
        };
        // namespace: ai
        const ai = {
            getRelatedInformation(query, types) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiRelatedInformation.getRelatedInformation(extension, query, types);
            },
            registerRelatedInformationProvider(type, provider) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiRelatedInformation.registerRelatedInformationProvider(extension, type, provider);
            },
            registerEmbeddingVectorProvider(model, provider) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiEmbeddingVector.registerEmbeddingVectorProvider(extension, model, provider);
            }
        };
        // namespace: chat
        const chat = {
            registerChatResponseProvider(id, provider, metadata) {
                checkProposedApiEnabled(extension, 'chatProvider');
                return extHostLanguageModels.registerLanguageModel(extension, id, provider, metadata);
            },
            registerMappedEditsProvider(_selector, _provider) {
                checkProposedApiEnabled(extension, 'mappedEditsProvider');
                // no longer supported
                return { dispose() { } };
            },
            registerMappedEditsProvider2(provider) {
                checkProposedApiEnabled(extension, 'mappedEditsProvider');
                return extHostCodeMapper.registerMappedEditsProvider(extension, provider);
            },
            createChatParticipant(id, handler) {
                return extHostChatAgents2.createChatAgent(extension, id, handler);
            },
            createDynamicChatParticipant(id, dynamicProps, handler) {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return extHostChatAgents2.createDynamicChatAgent(extension, id, dynamicProps, handler);
            },
            registerChatParticipantDetectionProvider(provider) {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return extHostChatAgents2.registerChatParticipantDetectionProvider(extension, provider);
            },
            registerRelatedFilesProvider(provider, metadata) {
                checkProposedApiEnabled(extension, 'chatEditing');
                return extHostChatAgents2.registerRelatedFilesProvider(extension, provider, metadata);
            },
            onDidDisposeChatSession: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return _asExtensionEvent(extHostChatAgents2.onDidDisposeChatSession)(listeners, thisArgs, disposables);
            }
        };
        // namespace: lm
        const lm = {
            selectChatModels: (selector) => {
                return extHostLanguageModels.selectLanguageModels(extension, selector ?? {});
            },
            onDidChangeChatModels: (listener, thisArgs, disposables) => {
                return extHostLanguageModels.onDidChangeProviders(listener, thisArgs, disposables);
            },
            registerChatModelProvider: (id, provider, metadata) => {
                checkProposedApiEnabled(extension, 'chatProvider');
                return extHostLanguageModels.registerLanguageModel(extension, id, provider, metadata);
            },
            // --- embeddings
            get embeddingModels() {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.embeddingsModels;
            },
            onDidChangeEmbeddingModels: (listener, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.onDidChange(listener, thisArgs, disposables);
            },
            registerEmbeddingsProvider(embeddingsModel, provider) {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.registerEmbeddingsProvider(extension, embeddingsModel, provider);
            },
            async computeEmbeddings(embeddingsModel, input, token) {
                checkProposedApiEnabled(extension, 'embeddings');
                if (typeof input === 'string') {
                    return extHostEmbeddings.computeEmbeddings(embeddingsModel, input, token);
                }
                else {
                    return extHostEmbeddings.computeEmbeddings(embeddingsModel, input, token);
                }
            },
            registerTool(name, tool) {
                return extHostLanguageModelTools.registerTool(extension, name, tool);
            },
            invokeTool(name, parameters, token) {
                return extHostLanguageModelTools.invokeTool(extension, name, parameters, token);
            },
            get tools() {
                return extHostLanguageModelTools.getTools(extension);
            },
            fileIsIgnored(uri, token) {
                return extHostLanguageModels.fileIsIgnored(extension, uri, token);
            },
            registerIgnoredFileProvider(provider) {
                return extHostLanguageModels.registerIgnoredFileProvider(extension, provider);
            },
            registerMcpConfigurationProvider(id, provider) {
                checkProposedApiEnabled(extension, 'mcpConfigurationProvider');
                return extHostMcp.registerMcpConfigurationProvider(extension, id, provider);
            }
        };
        // namespace: speech
        const speech = {
            registerSpeechProvider(id, provider) {
                checkProposedApiEnabled(extension, 'speech');
                return extHostSpeech.registerProvider(extension.identifier, id, provider);
            }
        };
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            version: initData.version,
            // namespaces
            ai,
            authentication,
            commands,
            comments,
            chat,
            debug,
            env,
            extensions,
            interactive,
            l10n,
            languages,
            lm,
            notebooks,
            scm,
            speech,
            tasks,
            tests,
            window,
            workspace,
            // types
            Breakpoint: extHostTypes.Breakpoint,
            TerminalOutputAnchor: extHostTypes.TerminalOutputAnchor,
            ChatResultFeedbackKind: extHostTypes.ChatResultFeedbackKind,
            ChatVariableLevel: extHostTypes.ChatVariableLevel,
            ChatCompletionItem: extHostTypes.ChatCompletionItem,
            ChatReferenceDiagnostic: extHostTypes.ChatReferenceDiagnostic,
            CallHierarchyIncomingCall: extHostTypes.CallHierarchyIncomingCall,
            CallHierarchyItem: extHostTypes.CallHierarchyItem,
            CallHierarchyOutgoingCall: extHostTypes.CallHierarchyOutgoingCall,
            CancellationError: errors.CancellationError,
            CancellationTokenSource: CancellationTokenSource,
            CandidatePortSource: CandidatePortSource,
            CodeAction: extHostTypes.CodeAction,
            CodeActionKind: extHostTypes.CodeActionKind,
            CodeActionTriggerKind: extHostTypes.CodeActionTriggerKind,
            CodeLens: extHostTypes.CodeLens,
            Color: extHostTypes.Color,
            ColorInformation: extHostTypes.ColorInformation,
            ColorPresentation: extHostTypes.ColorPresentation,
            ColorThemeKind: extHostTypes.ColorThemeKind,
            CommentMode: extHostTypes.CommentMode,
            CommentState: extHostTypes.CommentState,
            CommentThreadCollapsibleState: extHostTypes.CommentThreadCollapsibleState,
            CommentThreadState: extHostTypes.CommentThreadState,
            CommentThreadApplicability: extHostTypes.CommentThreadApplicability,
            CommentThreadFocus: extHostTypes.CommentThreadFocus,
            CompletionItem: extHostTypes.CompletionItem,
            CompletionItemKind: extHostTypes.CompletionItemKind,
            CompletionItemTag: extHostTypes.CompletionItemTag,
            CompletionList: extHostTypes.CompletionList,
            CompletionTriggerKind: extHostTypes.CompletionTriggerKind,
            ConfigurationTarget: extHostTypes.ConfigurationTarget,
            CustomExecution: extHostTypes.CustomExecution,
            DebugAdapterExecutable: extHostTypes.DebugAdapterExecutable,
            DebugAdapterInlineImplementation: extHostTypes.DebugAdapterInlineImplementation,
            DebugAdapterNamedPipeServer: extHostTypes.DebugAdapterNamedPipeServer,
            DebugAdapterServer: extHostTypes.DebugAdapterServer,
            DebugConfigurationProviderTriggerKind: DebugConfigurationProviderTriggerKind,
            DebugConsoleMode: extHostTypes.DebugConsoleMode,
            DebugVisualization: extHostTypes.DebugVisualization,
            DecorationRangeBehavior: extHostTypes.DecorationRangeBehavior,
            Diagnostic: extHostTypes.Diagnostic,
            DiagnosticRelatedInformation: extHostTypes.DiagnosticRelatedInformation,
            DiagnosticSeverity: extHostTypes.DiagnosticSeverity,
            DiagnosticTag: extHostTypes.DiagnosticTag,
            Disposable: extHostTypes.Disposable,
            DocumentHighlight: extHostTypes.DocumentHighlight,
            DocumentHighlightKind: extHostTypes.DocumentHighlightKind,
            MultiDocumentHighlight: extHostTypes.MultiDocumentHighlight,
            DocumentLink: extHostTypes.DocumentLink,
            DocumentSymbol: extHostTypes.DocumentSymbol,
            EndOfLine: extHostTypes.EndOfLine,
            EnvironmentVariableMutatorType: extHostTypes.EnvironmentVariableMutatorType,
            EvaluatableExpression: extHostTypes.EvaluatableExpression,
            InlineValueText: extHostTypes.InlineValueText,
            InlineValueVariableLookup: extHostTypes.InlineValueVariableLookup,
            InlineValueEvaluatableExpression: extHostTypes.InlineValueEvaluatableExpression,
            InlineCompletionTriggerKind: extHostTypes.InlineCompletionTriggerKind,
            EventEmitter: Emitter,
            ExtensionKind: extHostTypes.ExtensionKind,
            ExtensionMode: extHostTypes.ExtensionMode,
            ExternalUriOpenerPriority: extHostTypes.ExternalUriOpenerPriority,
            FileChangeType: extHostTypes.FileChangeType,
            FileDecoration: extHostTypes.FileDecoration,
            FileDecoration2: extHostTypes.FileDecoration,
            FileSystemError: extHostTypes.FileSystemError,
            FileType: files.FileType,
            FilePermission: files.FilePermission,
            FoldingRange: extHostTypes.FoldingRange,
            FoldingRangeKind: extHostTypes.FoldingRangeKind,
            FunctionBreakpoint: extHostTypes.FunctionBreakpoint,
            InlineCompletionItem: extHostTypes.InlineSuggestion,
            InlineCompletionList: extHostTypes.InlineSuggestionList,
            Hover: extHostTypes.Hover,
            VerboseHover: extHostTypes.VerboseHover,
            HoverVerbosityAction: extHostTypes.HoverVerbosityAction,
            IndentAction: languageConfiguration.IndentAction,
            Location: extHostTypes.Location,
            MarkdownString: extHostTypes.MarkdownString,
            OverviewRulerLane: OverviewRulerLane,
            ParameterInformation: extHostTypes.ParameterInformation,
            PortAutoForwardAction: extHostTypes.PortAutoForwardAction,
            Position: extHostTypes.Position,
            ProcessExecution: extHostTypes.ProcessExecution,
            ProgressLocation: extHostTypes.ProgressLocation,
            QuickInputButtonLocation: extHostTypes.QuickInputButtonLocation,
            QuickInputButtons: extHostTypes.QuickInputButtons,
            Range: extHostTypes.Range,
            RelativePattern: extHostTypes.RelativePattern,
            Selection: extHostTypes.Selection,
            SelectionRange: extHostTypes.SelectionRange,
            SemanticTokens: extHostTypes.SemanticTokens,
            SemanticTokensBuilder: extHostTypes.SemanticTokensBuilder,
            SemanticTokensEdit: extHostTypes.SemanticTokensEdit,
            SemanticTokensEdits: extHostTypes.SemanticTokensEdits,
            SemanticTokensLegend: extHostTypes.SemanticTokensLegend,
            ShellExecution: extHostTypes.ShellExecution,
            ShellQuoting: extHostTypes.ShellQuoting,
            SignatureHelp: extHostTypes.SignatureHelp,
            SignatureHelpTriggerKind: extHostTypes.SignatureHelpTriggerKind,
            SignatureInformation: extHostTypes.SignatureInformation,
            SnippetString: extHostTypes.SnippetString,
            SourceBreakpoint: extHostTypes.SourceBreakpoint,
            StandardTokenType: extHostTypes.StandardTokenType,
            StatusBarAlignment: extHostTypes.StatusBarAlignment,
            SymbolInformation: extHostTypes.SymbolInformation,
            SymbolKind: extHostTypes.SymbolKind,
            SymbolTag: extHostTypes.SymbolTag,
            Task: extHostTypes.Task,
            TaskEventKind: extHostTypes.TaskEventKind,
            TaskGroup: extHostTypes.TaskGroup,
            TaskPanelKind: extHostTypes.TaskPanelKind,
            TaskRevealKind: extHostTypes.TaskRevealKind,
            TaskScope: extHostTypes.TaskScope,
            TerminalLink: extHostTypes.TerminalLink,
            TerminalQuickFixTerminalCommand: extHostTypes.TerminalQuickFixCommand,
            TerminalQuickFixOpener: extHostTypes.TerminalQuickFixOpener,
            TerminalLocation: extHostTypes.TerminalLocation,
            TerminalProfile: extHostTypes.TerminalProfile,
            TerminalExitReason: extHostTypes.TerminalExitReason,
            TerminalShellExecutionCommandLineConfidence: extHostTypes.TerminalShellExecutionCommandLineConfidence,
            TerminalCompletionItem: extHostTypes.TerminalCompletionItem,
            TerminalCompletionItemKind: extHostTypes.TerminalCompletionItemKind,
            TerminalCompletionList: extHostTypes.TerminalCompletionList,
            TerminalShellType: extHostTypes.TerminalShellType,
            TextDocumentSaveReason: extHostTypes.TextDocumentSaveReason,
            TextEdit: extHostTypes.TextEdit,
            SnippetTextEdit: extHostTypes.SnippetTextEdit,
            TextEditorCursorStyle: TextEditorCursorStyle,
            TextEditorChangeKind: extHostTypes.TextEditorChangeKind,
            TextEditorLineNumbersStyle: extHostTypes.TextEditorLineNumbersStyle,
            TextEditorRevealType: extHostTypes.TextEditorRevealType,
            TextEditorSelectionChangeKind: extHostTypes.TextEditorSelectionChangeKind,
            SyntaxTokenType: extHostTypes.SyntaxTokenType,
            TextDocumentChangeReason: extHostTypes.TextDocumentChangeReason,
            ThemeColor: extHostTypes.ThemeColor,
            ThemeIcon: extHostTypes.ThemeIcon,
            TreeItem: extHostTypes.TreeItem,
            TreeItemCheckboxState: extHostTypes.TreeItemCheckboxState,
            TreeItemCollapsibleState: extHostTypes.TreeItemCollapsibleState,
            TypeHierarchyItem: extHostTypes.TypeHierarchyItem,
            UIKind: UIKind,
            Uri: URI,
            ViewColumn: extHostTypes.ViewColumn,
            WorkspaceEdit: extHostTypes.WorkspaceEdit,
            // proposed api types
            DocumentPasteTriggerKind: extHostTypes.DocumentPasteTriggerKind,
            DocumentDropEdit: extHostTypes.DocumentDropEdit,
            DocumentDropOrPasteEditKind: extHostTypes.DocumentDropOrPasteEditKind,
            DocumentPasteEdit: extHostTypes.DocumentPasteEdit,
            InlayHint: extHostTypes.InlayHint,
            InlayHintLabelPart: extHostTypes.InlayHintLabelPart,
            InlayHintKind: extHostTypes.InlayHintKind,
            RemoteAuthorityResolverError: extHostTypes.RemoteAuthorityResolverError,
            ResolvedAuthority: extHostTypes.ResolvedAuthority,
            ManagedResolvedAuthority: extHostTypes.ManagedResolvedAuthority,
            SourceControlInputBoxValidationType: extHostTypes.SourceControlInputBoxValidationType,
            ExtensionRuntime: extHostTypes.ExtensionRuntime,
            TimelineItem: extHostTypes.TimelineItem,
            NotebookRange: extHostTypes.NotebookRange,
            NotebookCellKind: extHostTypes.NotebookCellKind,
            NotebookCellExecutionState: extHostTypes.NotebookCellExecutionState,
            NotebookCellData: extHostTypes.NotebookCellData,
            NotebookData: extHostTypes.NotebookData,
            NotebookRendererScript: extHostTypes.NotebookRendererScript,
            NotebookCellStatusBarAlignment: extHostTypes.NotebookCellStatusBarAlignment,
            NotebookEditorRevealType: extHostTypes.NotebookEditorRevealType,
            NotebookCellOutput: extHostTypes.NotebookCellOutput,
            NotebookCellOutputItem: extHostTypes.NotebookCellOutputItem,
            CellErrorStackFrame: extHostTypes.CellErrorStackFrame,
            NotebookCellStatusBarItem: extHostTypes.NotebookCellStatusBarItem,
            NotebookControllerAffinity: extHostTypes.NotebookControllerAffinity,
            NotebookControllerAffinity2: extHostTypes.NotebookControllerAffinity2,
            NotebookEdit: extHostTypes.NotebookEdit,
            NotebookKernelSourceAction: extHostTypes.NotebookKernelSourceAction,
            NotebookVariablesRequestKind: extHostTypes.NotebookVariablesRequestKind,
            PortAttributes: extHostTypes.PortAttributes,
            LinkedEditingRanges: extHostTypes.LinkedEditingRanges,
            TestResultState: extHostTypes.TestResultState,
            TestRunRequest: extHostTypes.TestRunRequest,
            TestMessage: extHostTypes.TestMessage,
            TestMessageStackFrame: extHostTypes.TestMessageStackFrame,
            TestTag: extHostTypes.TestTag,
            TestRunProfileKind: extHostTypes.TestRunProfileKind,
            TextSearchCompleteMessageType: TextSearchCompleteMessageType,
            DataTransfer: extHostTypes.DataTransfer,
            DataTransferItem: extHostTypes.DataTransferItem,
            TestCoverageCount: extHostTypes.TestCoverageCount,
            FileCoverage: extHostTypes.FileCoverage,
            StatementCoverage: extHostTypes.StatementCoverage,
            BranchCoverage: extHostTypes.BranchCoverage,
            DeclarationCoverage: extHostTypes.DeclarationCoverage,
            WorkspaceTrustState: extHostTypes.WorkspaceTrustState,
            LanguageStatusSeverity: extHostTypes.LanguageStatusSeverity,
            QuickPickItemKind: extHostTypes.QuickPickItemKind,
            InputBoxValidationSeverity: extHostTypes.InputBoxValidationSeverity,
            TabInputText: extHostTypes.TextTabInput,
            TabInputTextDiff: extHostTypes.TextDiffTabInput,
            TabInputTextMerge: extHostTypes.TextMergeTabInput,
            TabInputCustom: extHostTypes.CustomEditorTabInput,
            TabInputNotebook: extHostTypes.NotebookEditorTabInput,
            TabInputNotebookDiff: extHostTypes.NotebookDiffEditorTabInput,
            TabInputWebview: extHostTypes.WebviewEditorTabInput,
            TabInputTerminal: extHostTypes.TerminalEditorTabInput,
            TabInputInteractiveWindow: extHostTypes.InteractiveWindowInput,
            TabInputChat: extHostTypes.ChatEditorTabInput,
            TabInputTextMultiDiff: extHostTypes.TextMultiDiffTabInput,
            TelemetryTrustedValue: TelemetryTrustedValue,
            LogLevel: LogLevel,
            EditSessionIdentityMatch: EditSessionIdentityMatch,
            InteractiveSessionVoteDirection: extHostTypes.InteractiveSessionVoteDirection,
            ChatCopyKind: extHostTypes.ChatCopyKind,
            ChatEditingSessionActionOutcome: extHostTypes.ChatEditingSessionActionOutcome,
            InteractiveEditorResponseFeedbackKind: extHostTypes.InteractiveEditorResponseFeedbackKind,
            DebugStackFrame: extHostTypes.DebugStackFrame,
            DebugThread: extHostTypes.DebugThread,
            RelatedInformationType: extHostTypes.RelatedInformationType,
            SpeechToTextStatus: extHostTypes.SpeechToTextStatus,
            TextToSpeechStatus: extHostTypes.TextToSpeechStatus,
            PartialAcceptTriggerKind: extHostTypes.PartialAcceptTriggerKind,
            KeywordRecognitionStatus: extHostTypes.KeywordRecognitionStatus,
            ChatResponseMarkdownPart: extHostTypes.ChatResponseMarkdownPart,
            ChatResponseFileTreePart: extHostTypes.ChatResponseFileTreePart,
            ChatResponseAnchorPart: extHostTypes.ChatResponseAnchorPart,
            ChatResponseProgressPart: extHostTypes.ChatResponseProgressPart,
            ChatResponseProgressPart2: extHostTypes.ChatResponseProgressPart2,
            ChatResponseReferencePart: extHostTypes.ChatResponseReferencePart,
            ChatResponseReferencePart2: extHostTypes.ChatResponseReferencePart,
            ChatResponseCodeCitationPart: extHostTypes.ChatResponseCodeCitationPart,
            ChatResponseCodeblockUriPart: extHostTypes.ChatResponseCodeblockUriPart,
            ChatResponseWarningPart: extHostTypes.ChatResponseWarningPart,
            ChatResponseTextEditPart: extHostTypes.ChatResponseTextEditPart,
            ChatResponseNotebookEditPart: extHostTypes.ChatResponseNotebookEditPart,
            ChatResponseMarkdownWithVulnerabilitiesPart: extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart,
            ChatResponseCommandButtonPart: extHostTypes.ChatResponseCommandButtonPart,
            ChatResponseConfirmationPart: extHostTypes.ChatResponseConfirmationPart,
            ChatResponseMovePart: extHostTypes.ChatResponseMovePart,
            ChatResponseReferencePartStatusKind: extHostTypes.ChatResponseReferencePartStatusKind,
            ChatRequestTurn: extHostTypes.ChatRequestTurn,
            ChatResponseTurn: extHostTypes.ChatResponseTurn,
            ChatLocation: extHostTypes.ChatLocation,
            ChatRequestEditorData: extHostTypes.ChatRequestEditorData,
            ChatRequestNotebookData: extHostTypes.ChatRequestNotebookData,
            ChatReferenceBinaryData: extHostTypes.ChatReferenceBinaryData,
            LanguageModelChatMessageRole: extHostTypes.LanguageModelChatMessageRole,
            LanguageModelChatMessage: extHostTypes.LanguageModelChatMessage,
            LanguageModelChatMessage2: extHostTypes.LanguageModelChatMessage2,
            LanguageModelToolResultPart: extHostTypes.LanguageModelToolResultPart,
            LanguageModelTextPart: extHostTypes.LanguageModelTextPart,
            LanguageModelToolCallPart: extHostTypes.LanguageModelToolCallPart,
            LanguageModelError: extHostTypes.LanguageModelError,
            LanguageModelToolResult: extHostTypes.LanguageModelToolResult,
            LanguageModelDataPart: extHostTypes.LanguageModelDataPart,
            ChatImageMimeType: extHostTypes.ChatImageMimeType,
            ExtendedLanguageModelToolResult: extHostTypes.ExtendedLanguageModelToolResult,
            PreparedTerminalToolInvocation: extHostTypes.PreparedTerminalToolInvocation,
            LanguageModelChatToolMode: extHostTypes.LanguageModelChatToolMode,
            LanguageModelPromptTsxPart: extHostTypes.LanguageModelPromptTsxPart,
            NewSymbolName: extHostTypes.NewSymbolName,
            NewSymbolNameTag: extHostTypes.NewSymbolNameTag,
            NewSymbolNameTriggerKind: extHostTypes.NewSymbolNameTriggerKind,
            InlineEdit: extHostTypes.InlineEdit,
            InlineEditTriggerKind: extHostTypes.InlineEditTriggerKind,
            ExcludeSettingOptions: ExcludeSettingOptions,
            TextSearchContext2: TextSearchContext2,
            TextSearchMatch2: TextSearchMatch2,
            TextSearchCompleteMessageTypeNew: TextSearchCompleteMessageType,
            ChatErrorLevel: extHostTypes.ChatErrorLevel,
            McpSSEServerDefinition: extHostTypes.McpSSEServerDefinition,
            McpStdioServerDefinition: extHostTypes.McpStdioServerDefinition,
        };
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5hcGkuaW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0LmFwaS5pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxLQUFLLHFCQUFxQixNQUFNLDJEQUEyRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsc0JBQXNCLEVBQXlCLE1BQU0sbURBQW1ELENBQUM7QUFDbEksT0FBTyxLQUFLLEtBQUssTUFBTSx5Q0FBeUMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0s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