"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageServerDescription = exports.SettingIds = void 0;
exports.startClient = startClient;
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const hash_1 = require("./utils/hash");
const languageStatus_1 = require("./languageStatus");
const languageParticipants_1 = require("./languageParticipants");
var VSCodeContentRequest;
(function (VSCodeContentRequest) {
    VSCodeContentRequest.type = new vscode_languageclient_1.RequestType('vscode/content');
})(VSCodeContentRequest || (VSCodeContentRequest = {}));
var SchemaContentChangeNotification;
(function (SchemaContentChangeNotification) {
    SchemaContentChangeNotification.type = new vscode_languageclient_1.NotificationType('json/schemaContent');
})(SchemaContentChangeNotification || (SchemaContentChangeNotification = {}));
var ForceValidateRequest;
(function (ForceValidateRequest) {
    ForceValidateRequest.type = new vscode_languageclient_1.RequestType('json/validate');
})(ForceValidateRequest || (ForceValidateRequest = {}));
var LanguageStatusRequest;
(function (LanguageStatusRequest) {
    LanguageStatusRequest.type = new vscode_languageclient_1.RequestType('json/languageStatus');
})(LanguageStatusRequest || (LanguageStatusRequest = {}));
var ValidateContentRequest;
(function (ValidateContentRequest) {
    ValidateContentRequest.type = new vscode_languageclient_1.RequestType('json/validateContent');
})(ValidateContentRequest || (ValidateContentRequest = {}));
var DocumentSortingRequest;
(function (DocumentSortingRequest) {
    DocumentSortingRequest.type = new vscode_languageclient_1.RequestType('json/sort');
})(DocumentSortingRequest || (DocumentSortingRequest = {}));
var SchemaAssociationNotification;
(function (SchemaAssociationNotification) {
    SchemaAssociationNotification.type = new vscode_languageclient_1.NotificationType('json/schemaAssociations');
})(SchemaAssociationNotification || (SchemaAssociationNotification = {}));
var SettingIds;
(function (SettingIds) {
    SettingIds.enableFormatter = 'json.format.enable';
    SettingIds.enableKeepLines = 'json.format.keepLines';
    SettingIds.enableValidation = 'json.validate.enable';
    SettingIds.enableSchemaDownload = 'json.schemaDownload.enable';
    SettingIds.maxItemsComputed = 'json.maxItemsComputed';
    SettingIds.editorFoldingMaximumRegions = 'editor.foldingMaximumRegions';
    SettingIds.editorColorDecoratorsLimit = 'editor.colorDecoratorsLimit';
    SettingIds.editorSection = 'editor';
    SettingIds.foldingMaximumRegions = 'foldingMaximumRegions';
    SettingIds.colorDecoratorsLimit = 'colorDecoratorsLimit';
})(SettingIds || (exports.SettingIds = SettingIds = {}));
exports.languageServerDescription = vscode_1.l10n.t('JSON Language Server');
let resultLimit = 5000;
let jsonFoldingLimit = 5000;
let jsoncFoldingLimit = 5000;
let jsonColorDecoratorLimit = 5000;
let jsoncColorDecoratorLimit = 5000;
async function startClient(context, newLanguageClient, runtime) {
    const languageParticipants = (0, languageParticipants_1.getLanguageParticipants)();
    context.subscriptions.push(languageParticipants);
    let client = await startClientWithParticipants(context, languageParticipants, newLanguageClient, runtime);
    let restartTrigger;
    languageParticipants.onDidChange(() => {
        if (restartTrigger) {
            restartTrigger.dispose();
        }
        restartTrigger = runtime.timer.setTimeout(async () => {
            if (client) {
                runtime.logOutputChannel.info('Extensions have changed, restarting JSON server...');
                runtime.logOutputChannel.info('');
                const oldClient = client;
                client = undefined;
                await oldClient.dispose();
                client = await startClientWithParticipants(context, languageParticipants, newLanguageClient, runtime);
            }
        }, 2000);
    });
    return {
        dispose: async () => {
            restartTrigger?.dispose();
            await client?.dispose();
        }
    };
}
async function startClientWithParticipants(_context, languageParticipants, newLanguageClient, runtime) {
    const toDispose = [];
    let rangeFormatting = undefined;
    const documentSelector = languageParticipants.documentSelector;
    const schemaResolutionErrorStatusBarItem = vscode_1.window.createStatusBarItem('status.json.resolveError', vscode_1.StatusBarAlignment.Right, 0);
    schemaResolutionErrorStatusBarItem.name = vscode_1.l10n.t('JSON: Schema Resolution Error');
    schemaResolutionErrorStatusBarItem.text = '$(alert)';
    toDispose.push(schemaResolutionErrorStatusBarItem);
    const fileSchemaErrors = new Map();
    let schemaDownloadEnabled = true;
    let isClientReady = false;
    const documentSymbolsLimitStatusbarItem = (0, languageStatus_1.createLimitStatusItem)((limit) => (0, languageStatus_1.createDocumentSymbolsLimitItem)(documentSelector, SettingIds.maxItemsComputed, limit));
    toDispose.push(documentSymbolsLimitStatusbarItem);
    toDispose.push(vscode_1.commands.registerCommand('json.clearCache', async () => {
        if (isClientReady && runtime.schemaRequests.clearCache) {
            const cachedSchemas = await runtime.schemaRequests.clearCache();
            await client.sendNotification(SchemaContentChangeNotification.type, cachedSchemas);
        }
        vscode_1.window.showInformationMessage(vscode_1.l10n.t('JSON schema cache cleared.'));
    }));
    toDispose.push(vscode_1.commands.registerCommand('json.validate', async (schemaUri, content) => {
        const diagnostics = await client.sendRequest(ValidateContentRequest.type, { schemaUri: schemaUri.toString(), content });
        return diagnostics.map(client.protocol2CodeConverter.asDiagnostic);
    }));
    toDispose.push(vscode_1.commands.registerCommand('json.sort', async () => {
        if (isClientReady) {
            const textEditor = vscode_1.window.activeTextEditor;
            if (textEditor) {
                const documentOptions = textEditor.options;
                const textEdits = await getSortTextEdits(textEditor.document, documentOptions.tabSize, documentOptions.insertSpaces);
                const success = await textEditor.edit(mutator => {
                    for (const edit of textEdits) {
                        mutator.replace(client.protocol2CodeConverter.asRange(edit.range), edit.newText);
                    }
                });
                if (!success) {
                    vscode_1.window.showErrorMessage(vscode_1.l10n.t('Failed to sort the JSONC document, please consider opening an issue.'));
                }
            }
        }
    }));
    function filterSchemaErrorDiagnostics(uri, diagnostics) {
        const schemaErrorIndex = diagnostics.findIndex(isSchemaResolveError);
        if (schemaErrorIndex !== -1) {
            const schemaResolveDiagnostic = diagnostics[schemaErrorIndex];
            fileSchemaErrors.set(uri.toString(), schemaResolveDiagnostic.message);
            if (!schemaDownloadEnabled) {
                diagnostics = diagnostics.filter(d => !isSchemaResolveError(d));
            }
            if (vscode_1.window.activeTextEditor && vscode_1.window.activeTextEditor.document.uri.toString() === uri.toString()) {
                schemaResolutionErrorStatusBarItem.show();
            }
        }
        return diagnostics;
    }
    // Options to control the language client
    const clientOptions = {
        // Register the server for json documents
        documentSelector,
        initializationOptions: {
            handledSchemaProtocols: ['file'], // language server only loads file-URI. Fetching schemas with other protocols ('http'...) are made on the client.
            provideFormatter: false, // tell the server to not provide formatting capability and ignore the `json.format.enable` setting.
            customCapabilities: { rangeFormatting: { editLimit: 10000 } }
        },
        synchronize: {
            // Synchronize the setting section 'json' to the server
            configurationSection: ['json', 'http'],
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.json')
        },
        middleware: {
            workspace: {
                didChangeConfiguration: () => client.sendNotification(vscode_languageclient_1.DidChangeConfigurationNotification.type, { settings: getSettings() })
            },
            provideDiagnostics: async (uriOrDoc, previousResolutId, token, next) => {
                const diagnostics = await next(uriOrDoc, previousResolutId, token);
                if (diagnostics && diagnostics.kind === vscode_languageclient_1.DocumentDiagnosticReportKind.Full) {
                    const uri = uriOrDoc instanceof vscode_1.Uri ? uriOrDoc : uriOrDoc.uri;
                    diagnostics.items = filterSchemaErrorDiagnostics(uri, diagnostics.items);
                }
                return diagnostics;
            },
            handleDiagnostics: (uri, diagnostics, next) => {
                diagnostics = filterSchemaErrorDiagnostics(uri, diagnostics);
                next(uri, diagnostics);
            },
            // testing the replace / insert mode
            provideCompletionItem(document, position, context, token, next) {
                function update(item) {
                    const range = item.range;
                    if (range instanceof vscode_1.Range && range.end.isAfter(position) && range.start.isBeforeOrEqual(position)) {
                        item.range = { inserting: new vscode_1.Range(range.start, position), replacing: range };
                    }
                    if (item.documentation instanceof vscode_1.MarkdownString) {
                        item.documentation = updateMarkdownString(item.documentation);
                    }
                }
                function updateProposals(r) {
                    if (r) {
                        (Array.isArray(r) ? r : r.items).forEach(update);
                    }
                    return r;
                }
                const r = next(document, position, context, token);
                if (isThenable(r)) {
                    return r.then(updateProposals);
                }
                return updateProposals(r);
            },
            provideHover(document, position, token, next) {
                function updateHover(r) {
                    if (r && Array.isArray(r.contents)) {
                        r.contents = r.contents.map(h => h instanceof vscode_1.MarkdownString ? updateMarkdownString(h) : h);
                    }
                    return r;
                }
                const r = next(document, position, token);
                if (isThenable(r)) {
                    return r.then(updateHover);
                }
                return updateHover(r);
            },
            provideFoldingRanges(document, context, token, next) {
                const r = next(document, context, token);
                if (isThenable(r)) {
                    return r;
                }
                return r;
            },
            provideDocumentColors(document, token, next) {
                const r = next(document, token);
                if (isThenable(r)) {
                    return r;
                }
                return r;
            },
            provideDocumentSymbols(document, token, next) {
                function countDocumentSymbols(symbols) {
                    return symbols.reduce((previousValue, s) => previousValue + 1 + countDocumentSymbols(s.children), 0);
                }
                function isDocumentSymbol(r) {
                    return r[0] instanceof vscode_1.DocumentSymbol;
                }
                function checkLimit(r) {
                    if (Array.isArray(r) && (isDocumentSymbol(r) ? countDocumentSymbols(r) : r.length) > resultLimit) {
                        documentSymbolsLimitStatusbarItem.update(document, resultLimit);
                    }
                    else {
                        documentSymbolsLimitStatusbarItem.update(document, false);
                    }
                    return r;
                }
                const r = next(document, token);
                if (isThenable(r)) {
                    return r.then(checkLimit);
                }
                return checkLimit(r);
            }
        }
    };
    clientOptions.outputChannel = runtime.logOutputChannel;
    // Create the language client and start the client.
    const client = newLanguageClient('json', exports.languageServerDescription, clientOptions);
    client.registerProposedFeatures();
    const schemaDocuments = {};
    // handle content request
    client.onRequest(VSCodeContentRequest.type, async (uriPath) => {
        const uri = vscode_1.Uri.parse(uriPath);
        const uriString = uri.toString();
        if (uri.scheme === 'untitled') {
            throw new vscode_languageclient_1.ResponseError(3, vscode_1.l10n.t('Unable to load {0}', uriString));
        }
        if (uri.scheme === 'vscode') {
            try {
                runtime.logOutputChannel.info('read schema from vscode: ' + uriString);
                ensureFilesystemWatcherInstalled(uri);
                const content = await vscode_1.workspace.fs.readFile(uri);
                return new TextDecoder().decode(content);
            }
            catch (e) {
                throw new vscode_languageclient_1.ResponseError(5, e.toString(), e);
            }
        }
        else if (uri.scheme !== 'http' && uri.scheme !== 'https') {
            try {
                const document = await vscode_1.workspace.openTextDocument(uri);
                schemaDocuments[uriString] = true;
                return document.getText();
            }
            catch (e) {
                throw new vscode_languageclient_1.ResponseError(2, e.toString(), e);
            }
        }
        else if (schemaDownloadEnabled) {
            if (runtime.telemetry && uri.authority === 'schema.management.azure.com') {
                /* __GDPR__
                    "json.schema" : {
                        "owner": "aeschli",
                        "comment": "Measure the use of the Azure resource manager schemas",
                        "schemaURL" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The azure schema URL that was requested." }
                    }
                */
                runtime.telemetry.sendTelemetryEvent('json.schema', { schemaURL: uriString });
            }
            try {
                return await runtime.schemaRequests.getContent(uriString);
            }
            catch (e) {
                throw new vscode_languageclient_1.ResponseError(4, e.toString());
            }
        }
        else {
            throw new vscode_languageclient_1.ResponseError(1, vscode_1.l10n.t('Downloading schemas is disabled through setting \'{0}\'', SettingIds.enableSchemaDownload));
        }
    });
    await client.start();
    isClientReady = true;
    const handleContentChange = (uriString) => {
        if (schemaDocuments[uriString]) {
            client.sendNotification(SchemaContentChangeNotification.type, uriString);
            return true;
        }
        return false;
    };
    const handleActiveEditorChange = (activeEditor) => {
        if (!activeEditor) {
            return;
        }
        const activeDocUri = activeEditor.document.uri.toString();
        if (activeDocUri && fileSchemaErrors.has(activeDocUri)) {
            schemaResolutionErrorStatusBarItem.show();
        }
        else {
            schemaResolutionErrorStatusBarItem.hide();
        }
    };
    const handleContentClosed = (uriString) => {
        if (handleContentChange(uriString)) {
            delete schemaDocuments[uriString];
        }
        fileSchemaErrors.delete(uriString);
    };
    const watchers = new Map();
    toDispose.push(new vscode_1.Disposable(() => {
        for (const d of watchers.values()) {
            d.dispose();
        }
    }));
    const ensureFilesystemWatcherInstalled = (uri) => {
        const uriString = uri.toString();
        if (!watchers.has(uriString)) {
            try {
                const watcher = vscode_1.workspace.createFileSystemWatcher(new vscode_1.RelativePattern(uri, '*'));
                const handleChange = (uri) => {
                    runtime.logOutputChannel.info('schema change detected ' + uri.toString());
                    client.sendNotification(SchemaContentChangeNotification.type, uriString);
                };
                const createListener = watcher.onDidCreate(handleChange);
                const changeListener = watcher.onDidChange(handleChange);
                const deleteListener = watcher.onDidDelete(() => {
                    const watcher = watchers.get(uriString);
                    if (watcher) {
                        watcher.dispose();
                        watchers.delete(uriString);
                    }
                });
                watchers.set(uriString, vscode_1.Disposable.from(watcher, createListener, changeListener, deleteListener));
            }
            catch {
                runtime.logOutputChannel.info('Problem installing a file system watcher for ' + uriString);
            }
        }
    };
    toDispose.push(vscode_1.workspace.onDidChangeTextDocument(e => handleContentChange(e.document.uri.toString())));
    toDispose.push(vscode_1.workspace.onDidCloseTextDocument(d => handleContentClosed(d.uri.toString())));
    toDispose.push(vscode_1.window.onDidChangeActiveTextEditor(handleActiveEditorChange));
    const handleRetryResolveSchemaCommand = () => {
        if (vscode_1.window.activeTextEditor) {
            schemaResolutionErrorStatusBarItem.text = '$(watch)';
            const activeDocUri = vscode_1.window.activeTextEditor.document.uri.toString();
            client.sendRequest(ForceValidateRequest.type, activeDocUri).then((diagnostics) => {
                const schemaErrorIndex = diagnostics.findIndex(isSchemaResolveError);
                if (schemaErrorIndex !== -1) {
                    // Show schema resolution errors in status bar only; ref: #51032
                    const schemaResolveDiagnostic = diagnostics[schemaErrorIndex];
                    fileSchemaErrors.set(activeDocUri, schemaResolveDiagnostic.message);
                }
                else {
                    schemaResolutionErrorStatusBarItem.hide();
                }
                schemaResolutionErrorStatusBarItem.text = '$(alert)';
            });
        }
    };
    toDispose.push(vscode_1.commands.registerCommand('_json.retryResolveSchema', handleRetryResolveSchemaCommand));
    client.sendNotification(SchemaAssociationNotification.type, await getSchemaAssociations());
    toDispose.push(vscode_1.extensions.onDidChange(async (_) => {
        client.sendNotification(SchemaAssociationNotification.type, await getSchemaAssociations());
    }));
    const associationWatcher = vscode_1.workspace.createFileSystemWatcher(new vscode_1.RelativePattern(vscode_1.Uri.parse(`vscode://schemas-associations/`), '**/schemas-associations.json'));
    toDispose.push(associationWatcher);
    toDispose.push(associationWatcher.onDidChange(async (_e) => {
        client.sendNotification(SchemaAssociationNotification.type, await getSchemaAssociations());
    }));
    // manually register / deregister format provider based on the `json.format.enable` setting avoiding issues with late registration. See #71652.
    updateFormatterRegistration();
    toDispose.push({ dispose: () => rangeFormatting && rangeFormatting.dispose() });
    updateSchemaDownloadSetting();
    toDispose.push(vscode_1.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(SettingIds.enableFormatter)) {
            updateFormatterRegistration();
        }
        else if (e.affectsConfiguration(SettingIds.enableSchemaDownload)) {
            updateSchemaDownloadSetting();
        }
        else if (e.affectsConfiguration(SettingIds.editorFoldingMaximumRegions) || e.affectsConfiguration(SettingIds.editorColorDecoratorsLimit)) {
            client.sendNotification(vscode_languageclient_1.DidChangeConfigurationNotification.type, { settings: getSettings() });
        }
    }));
    toDispose.push((0, languageStatus_1.createLanguageStatusItem)(documentSelector, (uri) => client.sendRequest(LanguageStatusRequest.type, uri)));
    function updateFormatterRegistration() {
        const formatEnabled = vscode_1.workspace.getConfiguration().get(SettingIds.enableFormatter);
        if (!formatEnabled && rangeFormatting) {
            rangeFormatting.dispose();
            rangeFormatting = undefined;
        }
        else if (formatEnabled && !rangeFormatting) {
            rangeFormatting = vscode_1.languages.registerDocumentRangeFormattingEditProvider(documentSelector, {
                provideDocumentRangeFormattingEdits(document, range, options, token) {
                    const filesConfig = vscode_1.workspace.getConfiguration('files', document);
                    const fileFormattingOptions = {
                        trimTrailingWhitespace: filesConfig.get('trimTrailingWhitespace'),
                        trimFinalNewlines: filesConfig.get('trimFinalNewlines'),
                        insertFinalNewline: filesConfig.get('insertFinalNewline'),
                    };
                    const params = {
                        textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
                        range: client.code2ProtocolConverter.asRange(range),
                        options: client.code2ProtocolConverter.asFormattingOptions(options, fileFormattingOptions)
                    };
                    return client.sendRequest(vscode_languageclient_1.DocumentRangeFormattingRequest.type, params, token).then(client.protocol2CodeConverter.asTextEdits, (error) => {
                        client.handleFailedRequest(vscode_languageclient_1.DocumentRangeFormattingRequest.type, undefined, error, []);
                        return Promise.resolve([]);
                    });
                }
            });
        }
    }
    function updateSchemaDownloadSetting() {
        schemaDownloadEnabled = vscode_1.workspace.getConfiguration().get(SettingIds.enableSchemaDownload) !== false;
        if (schemaDownloadEnabled) {
            schemaResolutionErrorStatusBarItem.tooltip = vscode_1.l10n.t('Unable to resolve schema. Click to retry.');
            schemaResolutionErrorStatusBarItem.command = '_json.retryResolveSchema';
            handleRetryResolveSchemaCommand();
        }
        else {
            schemaResolutionErrorStatusBarItem.tooltip = vscode_1.l10n.t('Downloading schemas is disabled. Click to configure.');
            schemaResolutionErrorStatusBarItem.command = { command: 'workbench.action.openSettings', arguments: [SettingIds.enableSchemaDownload], title: '' };
        }
    }
    async function getSortTextEdits(document, tabSize = 4, insertSpaces = true) {
        const filesConfig = vscode_1.workspace.getConfiguration('files', document);
        const options = {
            tabSize: Number(tabSize),
            insertSpaces: Boolean(insertSpaces),
            trimTrailingWhitespace: filesConfig.get('trimTrailingWhitespace'),
            trimFinalNewlines: filesConfig.get('trimFinalNewlines'),
            insertFinalNewline: filesConfig.get('insertFinalNewline'),
        };
        const params = {
            uri: document.uri.toString(),
            options
        };
        const edits = await client.sendRequest(DocumentSortingRequest.type, params);
        // Here we convert the JSON objects to real TextEdit objects
        return edits.map((edit) => {
            return new vscode_1.TextEdit(new vscode_1.Range(edit.range.start.line, edit.range.start.character, edit.range.end.line, edit.range.end.character), edit.newText);
        });
    }
    return {
        dispose: async () => {
            await client.stop();
            toDispose.forEach(d => d.dispose());
            rangeFormatting?.dispose();
        }
    };
}
async function getSchemaAssociations() {
    return getSchemaExtensionAssociations()
        .concat(await getDynamicSchemaAssociations());
}
function getSchemaExtensionAssociations() {
    const associations = [];
    vscode_1.extensions.allAcrossExtensionHosts.forEach(extension => {
        const packageJSON = extension.packageJSON;
        if (packageJSON && packageJSON.contributes && packageJSON.contributes.jsonValidation) {
            const jsonValidation = packageJSON.contributes.jsonValidation;
            if (Array.isArray(jsonValidation)) {
                jsonValidation.forEach(jv => {
                    let { fileMatch, url } = jv;
                    if (typeof fileMatch === 'string') {
                        fileMatch = [fileMatch];
                    }
                    if (Array.isArray(fileMatch) && typeof url === 'string') {
                        let uri = url;
                        if (uri[0] === '.' && uri[1] === '/') {
                            uri = vscode_1.Uri.joinPath(extension.extensionUri, uri).toString();
                        }
                        fileMatch = fileMatch.map(fm => {
                            if (fm[0] === '%') {
                                fm = fm.replace(/%APP_SETTINGS_HOME%/, '/User');
                                fm = fm.replace(/%MACHINE_SETTINGS_HOME%/, '/Machine');
                                fm = fm.replace(/%APP_WORKSPACES_HOME%/, '/Workspaces');
                            }
                            else if (!fm.match(/^(\w+:\/\/|\/|!)/)) {
                                fm = '/' + fm;
                            }
                            return fm;
                        });
                        associations.push({ fileMatch, uri });
                    }
                });
            }
        }
    });
    return associations;
}
async function getDynamicSchemaAssociations() {
    const result = [];
    try {
        const data = await vscode_1.workspace.fs.readFile(vscode_1.Uri.parse(`vscode://schemas-associations/schemas-associations.json`));
        const rawStr = new TextDecoder().decode(data);
        const obj = JSON.parse(rawStr);
        for (const item of Object.keys(obj)) {
            result.push({
                fileMatch: obj[item],
                uri: item
            });
        }
    }
    catch {
        // ignore
    }
    return result;
}
function getSettings() {
    const configuration = vscode_1.workspace.getConfiguration();
    const httpSettings = vscode_1.workspace.getConfiguration('http');
    const normalizeLimit = (settingValue) => Math.trunc(Math.max(0, Number(settingValue))) || 5000;
    resultLimit = normalizeLimit(vscode_1.workspace.getConfiguration().get(SettingIds.maxItemsComputed));
    const editorJSONSettings = vscode_1.workspace.getConfiguration(SettingIds.editorSection, { languageId: 'json' });
    const editorJSONCSettings = vscode_1.workspace.getConfiguration(SettingIds.editorSection, { languageId: 'jsonc' });
    jsonFoldingLimit = normalizeLimit(editorJSONSettings.get(SettingIds.foldingMaximumRegions));
    jsoncFoldingLimit = normalizeLimit(editorJSONCSettings.get(SettingIds.foldingMaximumRegions));
    jsonColorDecoratorLimit = normalizeLimit(editorJSONSettings.get(SettingIds.colorDecoratorsLimit));
    jsoncColorDecoratorLimit = normalizeLimit(editorJSONCSettings.get(SettingIds.colorDecoratorsLimit));
    const schemas = [];
    const settings = {
        http: {
            proxy: httpSettings.get('proxy'),
            proxyStrictSSL: httpSettings.get('proxyStrictSSL')
        },
        json: {
            validate: { enable: configuration.get(SettingIds.enableValidation) },
            format: { enable: configuration.get(SettingIds.enableFormatter) },
            keepLines: { enable: configuration.get(SettingIds.enableKeepLines) },
            schemas,
            resultLimit: resultLimit + 1, // ask for one more so we can detect if the limit has been exceeded
            jsonFoldingLimit: jsonFoldingLimit + 1,
            jsoncFoldingLimit: jsoncFoldingLimit + 1,
            jsonColorDecoratorLimit: jsonColorDecoratorLimit + 1,
            jsoncColorDecoratorLimit: jsoncColorDecoratorLimit + 1
        }
    };
    /*
     * Add schemas from the settings
     * folderUri to which folder the setting is scoped to. `undefined` means global (also external files)
     * settingsLocation against which path relative schema URLs are resolved
     */
    const collectSchemaSettings = (schemaSettings, folderUri, settingsLocation) => {
        if (schemaSettings) {
            for (const setting of schemaSettings) {
                const url = getSchemaId(setting, settingsLocation);
                if (url) {
                    const schemaSetting = { url, fileMatch: setting.fileMatch, folderUri, schema: setting.schema };
                    schemas.push(schemaSetting);
                }
            }
        }
    };
    const folders = vscode_1.workspace.workspaceFolders ?? [];
    const schemaConfigInfo = vscode_1.workspace.getConfiguration('json', null).inspect('schemas');
    if (schemaConfigInfo) {
        // settings in user config
        collectSchemaSettings(schemaConfigInfo.globalValue, undefined, undefined);
        if (vscode_1.workspace.workspaceFile) {
            if (schemaConfigInfo.workspaceValue) {
                const settingsLocation = vscode_1.Uri.joinPath(vscode_1.workspace.workspaceFile, '..');
                // settings in the workspace configuration file apply to all files (also external files)
                collectSchemaSettings(schemaConfigInfo.workspaceValue, undefined, settingsLocation);
            }
            for (const folder of folders) {
                const folderUri = folder.uri;
                const folderSchemaConfigInfo = vscode_1.workspace.getConfiguration('json', folderUri).inspect('schemas');
                collectSchemaSettings(folderSchemaConfigInfo?.workspaceFolderValue, folderUri.toString(false), folderUri);
            }
        }
        else {
            if (schemaConfigInfo.workspaceValue && folders.length === 1) {
                // single folder workspace: settings apply to all files (also external files)
                collectSchemaSettings(schemaConfigInfo.workspaceValue, undefined, folders[0].uri);
            }
        }
    }
    return settings;
}
function getSchemaId(schema, settingsLocation) {
    let url = schema.url;
    if (!url) {
        if (schema.schema) {
            url = schema.schema.id || `vscode://schemas/custom/${encodeURIComponent((0, hash_1.hash)(schema.schema).toString(16))}`;
        }
    }
    else if (settingsLocation && (url[0] === '.' || url[0] === '/')) {
        url = vscode_1.Uri.joinPath(settingsLocation, url).toString(false);
    }
    return url;
}
function isThenable(obj) {
    return obj && obj['then'];
}
function updateMarkdownString(h) {
    const n = new vscode_1.MarkdownString(h.value, true);
    n.isTrusted = h.isTrusted;
    return n;
}
function isSchemaResolveError(d) {
    return d.code === /* SchemaResolveError */ 0x300;
}
//# sourceMappingURL=jsonClient.js.map