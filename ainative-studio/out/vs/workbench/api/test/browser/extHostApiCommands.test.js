/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../../../editor/contrib/codeAction/browser/codeAction.js';
import '../../../../editor/contrib/codelens/browser/codelens.js';
import '../../../../editor/contrib/colorPicker/browser/colorPickerContribution.js';
import '../../../../editor/contrib/format/browser/format.js';
import '../../../../editor/contrib/gotoSymbol/browser/goToCommands.js';
import '../../../../editor/contrib/documentSymbols/browser/documentSymbols.js';
import '../../../../editor/contrib/hover/browser/getHover.js';
import '../../../../editor/contrib/links/browser/getLinks.js';
import '../../../../editor/contrib/parameterHints/browser/provideSignatureHelp.js';
import '../../../../editor/contrib/smartSelect/browser/smartSelect.js';
import '../../../../editor/contrib/suggest/browser/suggest.js';
import '../../../../editor/contrib/rename/browser/rename.js';
import '../../../../editor/contrib/inlayHints/browser/inlayHintsController.js';
import assert from 'assert';
import { setUnexpectedErrorHandler, errorHandler } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import * as types from '../../common/extHostTypes.js';
import { createTextModel } from '../../../../editor/test/common/testTextModel.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { MarkerService } from '../../../../platform/markers/common/markerService.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ExtHostLanguageFeatures } from '../../common/extHostLanguageFeatures.js';
import { MainThreadLanguageFeatures } from '../../browser/mainThreadLanguageFeatures.js';
import { ExtHostApiCommands } from '../../common/extHostApiCommands.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { MainThreadCommands } from '../../browser/mainThreadCommands.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { MainContext, ExtHostContext } from '../../common/extHost.protocol.js';
import { ExtHostDiagnostics } from '../../common/extHostDiagnostics.js';
import '../../../contrib/search/browser/search.contribution.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
import { nullExtensionDescription, IExtensionService } from '../../../services/extensions/common/extensions.js';
import { dispose, ImmortalReference } from '../../../../base/common/lifecycle.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { mock } from '../../../../base/test/common/mock.js';
import { NullApiDeprecationService } from '../../common/extHostApiDeprecationService.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
import { IOutlineModelService, OutlineModelService } from '../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from '../../../../editor/common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../editor/common/services/languageFeaturesService.js';
import { assertType } from '../../../../base/common/types.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { timeout } from '../../../../base/common/async.js';
function assertRejects(fn, message = 'Expected rejection') {
    return fn().then(() => assert.ok(false, message), _err => assert.ok(true));
}
function isLocation(value) {
    const candidate = value;
    return candidate && candidate.uri instanceof URI && candidate.range instanceof types.Range;
}
suite('ExtHostLanguageFeatureCommands', function () {
    const defaultSelector = { scheme: 'far' };
    let model;
    let insta;
    let rpcProtocol;
    let extHost;
    let mainThread;
    let commands;
    let disposables = [];
    let originalErrorHandler;
    suiteSetup(() => {
        model = createTextModel([
            'This is the first line',
            'This is the second line',
            'This is the third line',
        ].join('\n'), undefined, undefined, URI.parse('far://testing/file.b'));
        originalErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => { });
        // Use IInstantiationService to get typechecking when instantiating
        rpcProtocol = new TestRPCProtocol();
        const services = new ServiceCollection();
        services.set(IUriIdentityService, new class extends mock() {
            asCanonicalUri(uri) {
                return uri;
            }
        });
        services.set(ILanguageFeaturesService, new SyncDescriptor(LanguageFeaturesService));
        services.set(IExtensionService, new class extends mock() {
            async activateByEvent() {
            }
            activationEventIsDone(activationEvent) {
                return true;
            }
        });
        services.set(ICommandService, new SyncDescriptor(class extends mock() {
            executeCommand(id, ...args) {
                const command = CommandsRegistry.getCommands().get(id);
                if (!command) {
                    return Promise.reject(new Error(id + ' NOT known'));
                }
                const { handler } = command;
                return Promise.resolve(insta.invokeFunction(handler, ...args));
            }
        }));
        services.set(IEnvironmentService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.isBuilt = true;
                this.isExtensionDevelopment = false;
            }
        });
        services.set(IMarkerService, new MarkerService());
        services.set(ILogService, new SyncDescriptor(NullLogService));
        services.set(ILanguageFeatureDebounceService, new SyncDescriptor(LanguageFeatureDebounceService));
        services.set(IModelService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onModelRemoved = Event.None;
            }
            getModel() { return model; }
        });
        services.set(ITextModelService, new class extends mock() {
            async createModelReference() {
                return new ImmortalReference(new class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.textEditorModel = model;
                    }
                });
            }
        });
        services.set(IEditorWorkerService, new class extends mock() {
            async computeMoreMinimalEdits(_uri, edits) {
                return edits || undefined;
            }
        });
        services.set(ILanguageFeatureDebounceService, new SyncDescriptor(LanguageFeatureDebounceService));
        services.set(IOutlineModelService, new SyncDescriptor(OutlineModelService));
        services.set(IConfigurationService, new TestConfigurationService());
        insta = new TestInstantiationService(services);
        const extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
        extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [{
                    isDirty: false,
                    versionId: model.getVersionId(),
                    languageId: model.getLanguageId(),
                    uri: model.uri,
                    lines: model.getValue().split(model.getEOL()),
                    EOL: model.getEOL(),
                    encoding: 'utf8'
                }]
        });
        const extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
        rpcProtocol.set(ExtHostContext.ExtHostDocuments, extHostDocuments);
        commands = new ExtHostCommands(rpcProtocol, new NullLogService(), new class extends mock() {
            onExtensionError() {
                return true;
            }
        });
        rpcProtocol.set(ExtHostContext.ExtHostCommands, commands);
        rpcProtocol.set(MainContext.MainThreadCommands, insta.createInstance(MainThreadCommands, rpcProtocol));
        ExtHostApiCommands.register(commands);
        const diagnostics = new ExtHostDiagnostics(rpcProtocol, new NullLogService(), new class extends mock() {
        }, extHostDocumentsAndEditors);
        rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, diagnostics);
        extHost = new ExtHostLanguageFeatures(rpcProtocol, new URITransformerService(null), extHostDocuments, commands, diagnostics, new NullLogService(), NullApiDeprecationService, new class extends mock() {
            onExtensionError() {
                return true;
            }
        });
        rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, extHost);
        mainThread = rpcProtocol.set(MainContext.MainThreadLanguageFeatures, insta.createInstance(MainThreadLanguageFeatures, rpcProtocol));
        // forcefully create the outline service so that `ensureNoDisposablesAreLeakedInTestSuite` doesn't bark
        insta.get(IOutlineModelService);
        return rpcProtocol.sync();
    });
    suiteTeardown(() => {
        setUnexpectedErrorHandler(originalErrorHandler);
        model.dispose();
        mainThread.dispose();
        insta.get(IOutlineModelService).dispose();
        insta.dispose();
    });
    teardown(() => {
        disposables = dispose(disposables);
        return rpcProtocol.sync();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // --- workspace symbols
    function testApiCmd(name, fn) {
        test(name, async function () {
            await runWithFakedTimers({}, async () => {
                await fn();
                await timeout(10000); // API commands for things that allow commands dispose their result delay. This is to be nice
                // because otherwise properties like command are disposed too early
            });
        });
    }
    test('WorkspaceSymbols, invalid arguments', function () {
        const promises = [
            assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymbolProvider')),
            assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymbolProvider', null)),
            assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymbolProvider', undefined)),
            assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymbolProvider', true))
        ];
        return Promise.all(promises);
    });
    test('WorkspaceSymbols, back and forth', function () {
        disposables.push(extHost.registerWorkspaceSymbolProvider(nullExtensionDescription, {
            provideWorkspaceSymbols(query) {
                return [
                    new types.SymbolInformation(query, types.SymbolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/first')),
                    new types.SymbolInformation(query, types.SymbolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/second'))
                ];
            }
        }));
        disposables.push(extHost.registerWorkspaceSymbolProvider(nullExtensionDescription, {
            provideWorkspaceSymbols(query) {
                return [
                    new types.SymbolInformation(query, types.SymbolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/first'))
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeWorkspaceSymbolProvider', 'testing').then(value => {
                assert.strictEqual(value.length, 2); // de-duped
                for (const info of value) {
                    assert.strictEqual(info instanceof types.SymbolInformation, true);
                    assert.strictEqual(info.name, 'testing');
                    assert.strictEqual(info.kind, types.SymbolKind.Array);
                }
            });
        });
    });
    test('executeWorkspaceSymbolProvider should accept empty string, #39522', async function () {
        disposables.push(extHost.registerWorkspaceSymbolProvider(nullExtensionDescription, {
            provideWorkspaceSymbols() {
                return [new types.SymbolInformation('hello', types.SymbolKind.Array, new types.Range(0, 0, 0, 0), URI.parse('foo:bar'))];
            }
        }));
        await rpcProtocol.sync();
        let symbols = await commands.executeCommand('vscode.executeWorkspaceSymbolProvider', '');
        assert.strictEqual(symbols.length, 1);
        await rpcProtocol.sync();
        symbols = await commands.executeCommand('vscode.executeWorkspaceSymbolProvider', '*');
        assert.strictEqual(symbols.length, 1);
    });
    // --- formatting
    test('executeFormatDocumentProvider, back and forth', async function () {
        disposables.push(extHost.registerDocumentFormattingEditProvider(nullExtensionDescription, defaultSelector, new class {
            provideDocumentFormattingEdits() {
                return [types.TextEdit.insert(new types.Position(0, 0), '42')];
            }
        }));
        await rpcProtocol.sync();
        const edits = await commands.executeCommand('vscode.executeFormatDocumentProvider', model.uri);
        assert.strictEqual(edits.length, 1);
    });
    // --- rename
    test('vscode.prepareRename', async function () {
        disposables.push(extHost.registerRenameProvider(nullExtensionDescription, defaultSelector, new class {
            prepareRename(document, position) {
                return {
                    range: new types.Range(0, 12, 0, 24),
                    placeholder: 'foooPlaceholder'
                };
            }
            provideRenameEdits(document, position, newName) {
                const edit = new types.WorkspaceEdit();
                edit.insert(document.uri, position, newName);
                return edit;
            }
        }));
        await rpcProtocol.sync();
        const data = await commands.executeCommand('vscode.prepareRename', model.uri, new types.Position(0, 12));
        assert.ok(data);
        assert.strictEqual(data.placeholder, 'foooPlaceholder');
        assert.strictEqual(data.range.start.line, 0);
        assert.strictEqual(data.range.start.character, 12);
        assert.strictEqual(data.range.end.line, 0);
        assert.strictEqual(data.range.end.character, 24);
    });
    test('vscode.executeDocumentRenameProvider', async function () {
        disposables.push(extHost.registerRenameProvider(nullExtensionDescription, defaultSelector, new class {
            provideRenameEdits(document, position, newName) {
                const edit = new types.WorkspaceEdit();
                edit.insert(document.uri, position, newName);
                return edit;
            }
        }));
        await rpcProtocol.sync();
        const edit = await commands.executeCommand('vscode.executeDocumentRenameProvider', model.uri, new types.Position(0, 12), 'newNameOfThis');
        assert.ok(edit);
        assert.strictEqual(edit.has(model.uri), true);
        const textEdits = edit.get(model.uri);
        assert.strictEqual(textEdits.length, 1);
        assert.strictEqual(textEdits[0].newText, 'newNameOfThis');
    });
    // --- definition
    test('Definition, invalid arguments', function () {
        const promises = [
            assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider')),
            assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', null)),
            assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', undefined)),
            assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', true, false))
        ];
        return Promise.all(promises);
    });
    test('Definition, back and forth', function () {
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                // duplicate result will get removed
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(2, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(3, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(4, 0, 0, 0)),
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 4);
                for (const v of values) {
                    assert.ok(v.uri instanceof URI);
                    assert.ok(v.range instanceof types.Range);
                }
            });
        });
    });
    test('Definition, back and forth (sorting & de-deduping)', function () {
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return new types.Location(URI.parse('file:///b'), new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                // duplicate result will get removed
                return new types.Location(URI.parse('file:///b'), new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return [
                    new types.Location(URI.parse('file:///a'), new types.Range(2, 0, 0, 0)),
                    new types.Location(URI.parse('file:///c'), new types.Range(3, 0, 0, 0)),
                    new types.Location(URI.parse('file:///d'), new types.Range(4, 0, 0, 0)),
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 4);
                assert.strictEqual(values[0].uri.path, '/a');
                assert.strictEqual(values[1].uri.path, '/b');
                assert.strictEqual(values[2].uri.path, '/c');
                assert.strictEqual(values[3].uri.path, '/d');
            });
        });
    });
    test('Definition Link', () => {
        disposables.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideDefinition(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
                    { targetUri: doc.uri, targetRange: new types.Range(1, 0, 0, 0), targetSelectionRange: new types.Range(1, 1, 1, 1), originSelectionRange: new types.Range(2, 2, 2, 2) }
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 2);
                for (const v of values) {
                    if (isLocation(v)) {
                        assert.ok(v.uri instanceof URI);
                        assert.ok(v.range instanceof types.Range);
                    }
                    else {
                        assert.ok(v.targetUri instanceof URI);
                        assert.ok(v.targetRange instanceof types.Range);
                        assert.ok(v.targetSelectionRange instanceof types.Range);
                        assert.ok(v.originSelectionRange instanceof types.Range);
                    }
                }
            });
        });
    });
    // --- declaration
    test('Declaration, back and forth', function () {
        disposables.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, {
            provideDeclaration(doc) {
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, {
            provideDeclaration(doc) {
                // duplicate result will get removed
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, {
            provideDeclaration(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(2, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(3, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(4, 0, 0, 0)),
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeDeclarationProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 4);
                for (const v of values) {
                    assert.ok(v.uri instanceof URI);
                    assert.ok(v.range instanceof types.Range);
                }
            });
        });
    });
    test('Declaration Link', () => {
        disposables.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, {
            provideDeclaration(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
                    { targetUri: doc.uri, targetRange: new types.Range(1, 0, 0, 0), targetSelectionRange: new types.Range(1, 1, 1, 1), originSelectionRange: new types.Range(2, 2, 2, 2) }
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeDeclarationProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 2);
                for (const v of values) {
                    if (isLocation(v)) {
                        assert.ok(v.uri instanceof URI);
                        assert.ok(v.range instanceof types.Range);
                    }
                    else {
                        assert.ok(v.targetUri instanceof URI);
                        assert.ok(v.targetRange instanceof types.Range);
                        assert.ok(v.targetSelectionRange instanceof types.Range);
                        assert.ok(v.originSelectionRange instanceof types.Range);
                    }
                }
            });
        });
    });
    // --- type definition
    test('Type Definition, invalid arguments', function () {
        const promises = [
            assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider')),
            assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', null)),
            assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', undefined)),
            assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', true, false))
        ];
        return Promise.all(promises);
    });
    test('Type Definition, back and forth', function () {
        disposables.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideTypeDefinition(doc) {
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideTypeDefinition(doc) {
                // duplicate result will get removed
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideTypeDefinition(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(2, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(3, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(4, 0, 0, 0)),
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeTypeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 4);
                for (const v of values) {
                    assert.ok(v.uri instanceof URI);
                    assert.ok(v.range instanceof types.Range);
                }
            });
        });
    });
    test('Type Definition Link', () => {
        disposables.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, {
            provideTypeDefinition(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
                    { targetUri: doc.uri, targetRange: new types.Range(1, 0, 0, 0), targetSelectionRange: new types.Range(1, 1, 1, 1), originSelectionRange: new types.Range(2, 2, 2, 2) }
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeTypeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 2);
                for (const v of values) {
                    if (isLocation(v)) {
                        assert.ok(v.uri instanceof URI);
                        assert.ok(v.range instanceof types.Range);
                    }
                    else {
                        assert.ok(v.targetUri instanceof URI);
                        assert.ok(v.targetRange instanceof types.Range);
                        assert.ok(v.targetSelectionRange instanceof types.Range);
                        assert.ok(v.originSelectionRange instanceof types.Range);
                    }
                }
            });
        });
    });
    // --- implementation
    test('Implementation, invalid arguments', function () {
        const promises = [
            assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider')),
            assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', null)),
            assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', undefined)),
            assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', true, false))
        ];
        return Promise.all(promises);
    });
    test('Implementation, back and forth', function () {
        disposables.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, {
            provideImplementation(doc) {
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, {
            provideImplementation(doc) {
                // duplicate result will get removed
                return new types.Location(doc.uri, new types.Range(1, 0, 0, 0));
            }
        }));
        disposables.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, {
            provideImplementation(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(2, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(3, 0, 0, 0)),
                    new types.Location(doc.uri, new types.Range(4, 0, 0, 0)),
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeImplementationProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 4);
                for (const v of values) {
                    assert.ok(v.uri instanceof URI);
                    assert.ok(v.range instanceof types.Range);
                }
            });
        });
    });
    test('Implementation Definition Link', () => {
        disposables.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, {
            provideImplementation(doc) {
                return [
                    new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
                    { targetUri: doc.uri, targetRange: new types.Range(1, 0, 0, 0), targetSelectionRange: new types.Range(1, 1, 1, 1), originSelectionRange: new types.Range(2, 2, 2, 2) }
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeImplementationProvider', model.uri, new types.Position(0, 0)).then(values => {
                assert.strictEqual(values.length, 2);
                for (const v of values) {
                    if (isLocation(v)) {
                        assert.ok(v.uri instanceof URI);
                        assert.ok(v.range instanceof types.Range);
                    }
                    else {
                        assert.ok(v.targetUri instanceof URI);
                        assert.ok(v.targetRange instanceof types.Range);
                        assert.ok(v.targetSelectionRange instanceof types.Range);
                        assert.ok(v.originSelectionRange instanceof types.Range);
                    }
                }
            });
        });
    });
    // --- references
    test('reference search, back and forth', function () {
        disposables.push(extHost.registerReferenceProvider(nullExtensionDescription, defaultSelector, {
            provideReferences() {
                return [
                    new types.Location(URI.parse('some:uri/path'), new types.Range(0, 1, 0, 5))
                ];
            }
        }));
        return commands.executeCommand('vscode.executeReferenceProvider', model.uri, new types.Position(0, 0)).then(values => {
            assert.strictEqual(values.length, 1);
            const [first] = values;
            assert.strictEqual(first.uri.toString(), 'some:uri/path');
            assert.strictEqual(first.range.start.line, 0);
            assert.strictEqual(first.range.start.character, 1);
            assert.strictEqual(first.range.end.line, 0);
            assert.strictEqual(first.range.end.character, 5);
        });
    });
    // --- document highlights
    test('"vscode.executeDocumentHighlights" API has stopped returning DocumentHighlight[]#200056', async function () {
        disposables.push(extHost.registerDocumentHighlightProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentHighlights() {
                return [
                    new types.DocumentHighlight(new types.Range(0, 17, 0, 25), types.DocumentHighlightKind.Read)
                ];
            }
        }));
        await rpcProtocol.sync();
        return commands.executeCommand('vscode.executeDocumentHighlights', model.uri, new types.Position(0, 0)).then(values => {
            assert.ok(Array.isArray(values));
            assert.strictEqual(values.length, 1);
            const [first] = values;
            assert.strictEqual(first.range.start.line, 0);
            assert.strictEqual(first.range.start.character, 17);
            assert.strictEqual(first.range.end.line, 0);
            assert.strictEqual(first.range.end.character, 25);
        });
    });
    // --- outline
    test('Outline, back and forth', function () {
        disposables.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentSymbols() {
                return [
                    new types.SymbolInformation('testing1', types.SymbolKind.Enum, new types.Range(1, 0, 1, 0)),
                    new types.SymbolInformation('testing2', types.SymbolKind.Enum, new types.Range(0, 1, 0, 3)),
                ];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeDocumentSymbolProvider', model.uri).then(values => {
                assert.strictEqual(values.length, 2);
                const [first, second] = values;
                assert.strictEqual(first instanceof types.SymbolInformation, true);
                assert.strictEqual(second instanceof types.SymbolInformation, true);
                assert.strictEqual(first.name, 'testing2');
                assert.strictEqual(second.name, 'testing1');
            });
        });
    });
    test('vscode.executeDocumentSymbolProvider command only returns SymbolInformation[] rather than DocumentSymbol[] #57984', function () {
        disposables.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentSymbols() {
                return [
                    new types.SymbolInformation('SymbolInformation', types.SymbolKind.Enum, new types.Range(1, 0, 1, 0))
                ];
            }
        }));
        disposables.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentSymbols() {
                const root = new types.DocumentSymbol('DocumentSymbol', 'DocumentSymbol#detail', types.SymbolKind.Enum, new types.Range(1, 0, 1, 0), new types.Range(1, 0, 1, 0));
                root.children = [new types.DocumentSymbol('DocumentSymbol#child', 'DocumentSymbol#detail#child', types.SymbolKind.Enum, new types.Range(1, 0, 1, 0), new types.Range(1, 0, 1, 0))];
                return [root];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeDocumentSymbolProvider', model.uri).then(values => {
                assert.strictEqual(values.length, 2);
                const [first, second] = values;
                assert.strictEqual(first instanceof types.SymbolInformation, true);
                assert.strictEqual(first instanceof types.DocumentSymbol, false);
                assert.strictEqual(second instanceof types.SymbolInformation, true);
                assert.strictEqual(first.name, 'DocumentSymbol');
                assert.strictEqual(first.children.length, 1);
                assert.strictEqual(second.name, 'SymbolInformation');
            });
        });
    });
    // --- suggest
    testApiCmd('triggerCharacter is null when completion provider is called programmatically #159914', async function () {
        let actualContext;
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems(_doc, _pos, _tok, context) {
                actualContext = context;
                return [];
            }
        }, []));
        await rpcProtocol.sync();
        await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4));
        assert.ok(actualContext);
        assert.deepStrictEqual(actualContext, { triggerKind: types.CompletionTriggerKind.Invoke, triggerCharacter: undefined });
    });
    testApiCmd('Suggest, back and forth', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                a.documentation = new types.MarkdownString('hello_md_string');
                const b = new types.CompletionItem('item2');
                b.textEdit = types.TextEdit.replace(new types.Range(0, 4, 0, 8), 'foo'); // overwite after
                const c = new types.CompletionItem('item3');
                c.textEdit = types.TextEdit.replace(new types.Range(0, 1, 0, 6), 'foobar'); // overwite before & after
                // snippet string!
                const d = new types.CompletionItem('item4');
                d.range = new types.Range(0, 1, 0, 4); // overwite before
                d.insertText = new types.SnippetString('foo$0bar');
                return [a, b, c, d];
            }
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4));
        assert.ok(list instanceof types.CompletionList);
        const values = list.items;
        assert.ok(Array.isArray(values));
        assert.strictEqual(values.length, 4);
        const [first, second, third, fourth] = values;
        assert.strictEqual(first.label, 'item1');
        assert.strictEqual(first.textEdit, undefined); // no text edit, default ranges
        assert.ok(!types.Range.isRange(first.range));
        assert.strictEqual(first.documentation.value, 'hello_md_string');
        assert.strictEqual(second.label, 'item2');
        assert.strictEqual(second.textEdit.newText, 'foo');
        assert.strictEqual(second.textEdit.range.start.line, 0);
        assert.strictEqual(second.textEdit.range.start.character, 4);
        assert.strictEqual(second.textEdit.range.end.line, 0);
        assert.strictEqual(second.textEdit.range.end.character, 8);
        assert.strictEqual(third.label, 'item3');
        assert.strictEqual(third.textEdit.newText, 'foobar');
        assert.strictEqual(third.textEdit.range.start.line, 0);
        assert.strictEqual(third.textEdit.range.start.character, 1);
        assert.strictEqual(third.textEdit.range.end.line, 0);
        assert.strictEqual(third.textEdit.range.end.character, 6);
        assert.strictEqual(fourth.label, 'item4');
        assert.strictEqual(fourth.textEdit, undefined);
        const range = fourth.range;
        assert.ok(types.Range.isRange(range));
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.start.character, 1);
        assert.strictEqual(range.end.line, 0);
        assert.strictEqual(range.end.character, 4);
        assert.ok(fourth.insertText instanceof types.SnippetString);
        assert.strictEqual(fourth.insertText.value, 'foo$0bar');
    });
    testApiCmd('Suggest, return CompletionList !array', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                const b = new types.CompletionItem('item2');
                return new types.CompletionList([a, b], true);
            }
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4));
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(list.isIncomplete, true);
    });
    testApiCmd('Suggest, resolve completion items', async function () {
        let resolveCount = 0;
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                const b = new types.CompletionItem('item2');
                const c = new types.CompletionItem('item3');
                const d = new types.CompletionItem('item4');
                return new types.CompletionList([a, b, c, d], false);
            },
            resolveCompletionItem(item) {
                resolveCount += 1;
                return item;
            }
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4), undefined, 2 // maxItemsToResolve
        );
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(resolveCount, 2);
    });
    testApiCmd('"vscode.executeCompletionItemProvider" doesnot return a preselect field #53749', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                a.preselect = true;
                const b = new types.CompletionItem('item2');
                const c = new types.CompletionItem('item3');
                c.preselect = true;
                const d = new types.CompletionItem('item4');
                return new types.CompletionList([a, b, c, d], false);
            }
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4), undefined);
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(list.items.length, 4);
        const [a, b, c, d] = list.items;
        assert.strictEqual(a.preselect, true);
        assert.strictEqual(b.preselect, undefined);
        assert.strictEqual(c.preselect, true);
        assert.strictEqual(d.preselect, undefined);
    });
    testApiCmd('executeCompletionItemProvider doesn\'t capture commitCharacters #58228', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                const a = new types.CompletionItem('item1');
                a.commitCharacters = ['a', 'b'];
                const b = new types.CompletionItem('item2');
                return new types.CompletionList([a, b], false);
            }
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4), undefined);
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(list.items.length, 2);
        const [a, b] = list.items;
        assert.deepStrictEqual(a.commitCharacters, ['a', 'b']);
        assert.strictEqual(b.commitCharacters, undefined);
    });
    testApiCmd('vscode.executeCompletionItemProvider returns the wrong CompletionItemKinds in insiders #95715', async function () {
        disposables.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, {
            provideCompletionItems() {
                return [
                    new types.CompletionItem('My Method', types.CompletionItemKind.Method),
                    new types.CompletionItem('My Property', types.CompletionItemKind.Property),
                ];
            }
        }, []));
        await rpcProtocol.sync();
        const list = await commands.executeCommand('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4), undefined);
        assert.ok(list instanceof types.CompletionList);
        assert.strictEqual(list.items.length, 2);
        const [a, b] = list.items;
        assert.strictEqual(a.kind, types.CompletionItemKind.Method);
        assert.strictEqual(b.kind, types.CompletionItemKind.Property);
    });
    // --- signatureHelp
    test('Parameter Hints, back and forth', async () => {
        disposables.push(extHost.registerSignatureHelpProvider(nullExtensionDescription, defaultSelector, new class {
            provideSignatureHelp(_document, _position, _token, context) {
                return {
                    activeSignature: 0,
                    activeParameter: 1,
                    signatures: [
                        {
                            label: 'abc',
                            documentation: `${context.triggerKind === 1 /* vscode.SignatureHelpTriggerKind.Invoke */ ? 'invoked' : 'unknown'} ${context.triggerCharacter}`,
                            parameters: []
                        }
                    ]
                };
            }
        }, []));
        await rpcProtocol.sync();
        const firstValue = await commands.executeCommand('vscode.executeSignatureHelpProvider', model.uri, new types.Position(0, 1), ',');
        assert.strictEqual(firstValue.activeSignature, 0);
        assert.strictEqual(firstValue.activeParameter, 1);
        assert.strictEqual(firstValue.signatures.length, 1);
        assert.strictEqual(firstValue.signatures[0].label, 'abc');
        assert.strictEqual(firstValue.signatures[0].documentation, 'invoked ,');
    });
    // --- quickfix
    testApiCmd('QuickFix, back and forth', function () {
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions() {
                return [{ command: 'testing', title: 'Title', arguments: [1, 2, true] }];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeCodeActionProvider', model.uri, new types.Range(0, 0, 1, 1)).then(value => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.title, 'Title');
                assert.strictEqual(first.command, 'testing');
                assert.deepStrictEqual(first.arguments, [1, 2, true]);
            });
        });
    });
    testApiCmd('vscode.executeCodeActionProvider results seem to be missing their `command` property #45124', function () {
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions(document, range) {
                return [{
                        command: {
                            arguments: [document, range],
                            command: 'command',
                            title: 'command_title',
                        },
                        kind: types.CodeActionKind.Empty.append('foo'),
                        title: 'title',
                    }];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeCodeActionProvider', model.uri, new types.Range(0, 0, 1, 1)).then(value => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.ok(first.command);
                assert.strictEqual(first.command.command, 'command');
                assert.strictEqual(first.command.title, 'command_title');
                assert.strictEqual(first.kind.value, 'foo');
                assert.strictEqual(first.title, 'title');
            });
        });
    });
    testApiCmd('vscode.executeCodeActionProvider passes Range to provider although Selection is passed in #77997', function () {
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions(document, rangeOrSelection) {
                return [{
                        command: {
                            arguments: [document, rangeOrSelection],
                            command: 'command',
                            title: 'command_title',
                        },
                        kind: types.CodeActionKind.Empty.append('foo'),
                        title: 'title',
                    }];
            }
        }));
        const selection = new types.Selection(0, 0, 1, 1);
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeCodeActionProvider', model.uri, selection).then(value => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.ok(first.command);
                assert.ok(first.command.arguments[1] instanceof types.Selection);
                assert.ok(first.command.arguments[1].isEqual(selection));
            });
        });
    });
    testApiCmd('vscode.executeCodeActionProvider results seem to be missing their `isPreferred` property #78098', function () {
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions(document, rangeOrSelection) {
                return [{
                        command: {
                            arguments: [document, rangeOrSelection],
                            command: 'command',
                            title: 'command_title',
                        },
                        kind: types.CodeActionKind.Empty.append('foo'),
                        title: 'title',
                        isPreferred: true
                    }];
            }
        }));
        const selection = new types.Selection(0, 0, 1, 1);
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeCodeActionProvider', model.uri, selection).then(value => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.isPreferred, true);
            });
        });
    });
    testApiCmd('resolving code action', async function () {
        let didCallResolve = 0;
        class MyAction extends types.CodeAction {
        }
        disposables.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
            provideCodeActions(document, rangeOrSelection) {
                return [new MyAction('title', types.CodeActionKind.Empty.append('foo'))];
            },
            resolveCodeAction(action) {
                assert.ok(action instanceof MyAction);
                didCallResolve += 1;
                action.title = 'resolved title';
                action.edit = new types.WorkspaceEdit();
                return action;
            }
        }));
        const selection = new types.Selection(0, 0, 1, 1);
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeCodeActionProvider', model.uri, selection, undefined, 1000);
        assert.strictEqual(didCallResolve, 1);
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.title, 'title'); // does NOT change
        assert.ok(first.edit); // is set
    });
    // --- code lens
    testApiCmd('CodeLens, back and forth', function () {
        const complexArg = {
            foo() { },
            bar() { },
            big: extHost
        };
        disposables.push(extHost.registerCodeLensProvider(nullExtensionDescription, defaultSelector, {
            provideCodeLenses() {
                return [new types.CodeLens(new types.Range(0, 0, 1, 1), { title: 'Title', command: 'cmd', arguments: [1, true, complexArg] })];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeCodeLensProvider', model.uri).then(value => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.command.title, 'Title');
                assert.strictEqual(first.command.command, 'cmd');
                assert.strictEqual(first.command.arguments[0], 1);
                assert.strictEqual(first.command.arguments[1], true);
                assert.strictEqual(first.command.arguments[2], complexArg);
            });
        });
    });
    testApiCmd('CodeLens, resolve', async function () {
        let resolveCount = 0;
        disposables.push(extHost.registerCodeLensProvider(nullExtensionDescription, defaultSelector, {
            provideCodeLenses() {
                return [
                    new types.CodeLens(new types.Range(0, 0, 1, 1)),
                    new types.CodeLens(new types.Range(0, 0, 1, 1)),
                    new types.CodeLens(new types.Range(0, 0, 1, 1)),
                    new types.CodeLens(new types.Range(0, 0, 1, 1), { title: 'Already resolved', command: 'fff' })
                ];
            },
            resolveCodeLens(codeLens) {
                codeLens.command = { title: resolveCount.toString(), command: 'resolved' };
                resolveCount += 1;
                return codeLens;
            }
        }));
        await rpcProtocol.sync();
        let value = await commands.executeCommand('vscode.executeCodeLensProvider', model.uri, 2);
        assert.strictEqual(value.length, 3); // the resolve argument defines the number of results being returned
        assert.strictEqual(resolveCount, 2);
        resolveCount = 0;
        value = await commands.executeCommand('vscode.executeCodeLensProvider', model.uri);
        assert.strictEqual(value.length, 4);
        assert.strictEqual(resolveCount, 0);
    });
    testApiCmd('Links, back and forth', function () {
        disposables.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentLinks() {
                return [new types.DocumentLink(new types.Range(0, 0, 0, 20), URI.parse('foo:bar'))];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeLinkProvider', model.uri).then(value => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.target + '', 'foo:bar');
                assert.strictEqual(first.range.start.line, 0);
                assert.strictEqual(first.range.start.character, 0);
                assert.strictEqual(first.range.end.line, 0);
                assert.strictEqual(first.range.end.character, 20);
            });
        });
    });
    testApiCmd('What\'s the condition for DocumentLink target to be undefined? #106308', async function () {
        disposables.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentLinks() {
                return [new types.DocumentLink(new types.Range(0, 0, 0, 20), undefined)];
            },
            resolveDocumentLink(link) {
                link.target = URI.parse('foo:bar');
                return link;
            }
        }));
        await rpcProtocol.sync();
        const links1 = await commands.executeCommand('vscode.executeLinkProvider', model.uri);
        assert.strictEqual(links1.length, 1);
        assert.strictEqual(links1[0].target, undefined);
        const links2 = await commands.executeCommand('vscode.executeLinkProvider', model.uri, 1000);
        assert.strictEqual(links2.length, 1);
        assert.strictEqual(links2[0].target.toString(), URI.parse('foo:bar').toString());
    });
    testApiCmd('DocumentLink[] vscode.executeLinkProvider returns lack tooltip #213970', async function () {
        disposables.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentLinks() {
                const link = new types.DocumentLink(new types.Range(0, 0, 0, 20), URI.parse('foo:bar'));
                link.tooltip = 'Link Tooltip';
                return [link];
            }
        }));
        await rpcProtocol.sync();
        const links1 = await commands.executeCommand('vscode.executeLinkProvider', model.uri);
        assert.strictEqual(links1.length, 1);
        assert.strictEqual(links1[0].tooltip, 'Link Tooltip');
    });
    test('Color provider', function () {
        disposables.push(extHost.registerColorProvider(nullExtensionDescription, defaultSelector, {
            provideDocumentColors() {
                return [new types.ColorInformation(new types.Range(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4))];
            },
            provideColorPresentations() {
                const cp = new types.ColorPresentation('#ABC');
                cp.textEdit = types.TextEdit.replace(new types.Range(1, 0, 1, 20), '#ABC');
                cp.additionalTextEdits = [types.TextEdit.insert(new types.Position(2, 20), '*')];
                return [cp];
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeDocumentColorProvider', model.uri).then(value => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.color.red, 0.1);
                assert.strictEqual(first.color.green, 0.2);
                assert.strictEqual(first.color.blue, 0.3);
                assert.strictEqual(first.color.alpha, 0.4);
                assert.strictEqual(first.range.start.line, 0);
                assert.strictEqual(first.range.start.character, 0);
                assert.strictEqual(first.range.end.line, 0);
                assert.strictEqual(first.range.end.character, 20);
            });
        }).then(() => {
            const color = new types.Color(0.5, 0.6, 0.7, 0.8);
            const range = new types.Range(0, 0, 0, 20);
            return commands.executeCommand('vscode.executeColorPresentationProvider', color, { uri: model.uri, range }).then(value => {
                assert.strictEqual(value.length, 1);
                const [first] = value;
                assert.strictEqual(first.label, '#ABC');
                assert.strictEqual(first.textEdit.newText, '#ABC');
                assert.strictEqual(first.textEdit.range.start.line, 1);
                assert.strictEqual(first.textEdit.range.start.character, 0);
                assert.strictEqual(first.textEdit.range.end.line, 1);
                assert.strictEqual(first.textEdit.range.end.character, 20);
                assert.strictEqual(first.additionalTextEdits.length, 1);
                assert.strictEqual(first.additionalTextEdits[0].range.start.line, 2);
                assert.strictEqual(first.additionalTextEdits[0].range.start.character, 20);
                assert.strictEqual(first.additionalTextEdits[0].range.end.line, 2);
                assert.strictEqual(first.additionalTextEdits[0].range.end.character, 20);
            });
        });
    });
    test('"TypeError: e.onCancellationRequested is not a function" calling hover provider in Insiders #54174', function () {
        disposables.push(extHost.registerHoverProvider(nullExtensionDescription, defaultSelector, {
            provideHover() {
                return new types.Hover('fofofofo');
            }
        }));
        return rpcProtocol.sync().then(() => {
            return commands.executeCommand('vscode.executeHoverProvider', model.uri, new types.Position(1, 1)).then(value => {
                assert.strictEqual(value.length, 1);
                assert.strictEqual(value[0].contents.length, 1);
            });
        });
    });
    // --- inline hints
    testApiCmd('Inlay Hints, back and forth', async function () {
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                return [new types.InlayHint(new types.Position(0, 1), 'Foo')];
            }
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeInlayHintProvider', model.uri, new types.Range(0, 0, 20, 20));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.label, 'Foo');
        assert.strictEqual(first.position.line, 0);
        assert.strictEqual(first.position.character, 1);
    });
    testApiCmd('Inline Hints, merge', async function () {
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                const part = new types.InlayHintLabelPart('Bar');
                part.tooltip = 'part_tooltip';
                part.command = { command: 'cmd', title: 'part' };
                const hint = new types.InlayHint(new types.Position(10, 11), [part]);
                hint.tooltip = 'hint_tooltip';
                hint.paddingLeft = true;
                hint.paddingRight = false;
                return [hint];
            }
        }));
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                const hint = new types.InlayHint(new types.Position(0, 1), 'Foo', types.InlayHintKind.Parameter);
                hint.textEdits = [types.TextEdit.insert(new types.Position(0, 0), 'Hello')];
                return [hint];
            }
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeInlayHintProvider', model.uri, new types.Range(0, 0, 20, 20));
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.label, 'Foo');
        assert.strictEqual(first.position.line, 0);
        assert.strictEqual(first.position.character, 1);
        assert.strictEqual(first.textEdits?.length, 1);
        assert.strictEqual(first.textEdits[0].newText, 'Hello');
        assert.strictEqual(second.position.line, 10);
        assert.strictEqual(second.position.character, 11);
        assert.strictEqual(second.paddingLeft, true);
        assert.strictEqual(second.paddingRight, false);
        assert.strictEqual(second.tooltip, 'hint_tooltip');
        const label = second.label[0];
        assertType(label instanceof types.InlayHintLabelPart);
        assert.strictEqual(label.value, 'Bar');
        assert.strictEqual(label.tooltip, 'part_tooltip');
        assert.strictEqual(label.command?.command, 'cmd');
        assert.strictEqual(label.command?.title, 'part');
    });
    testApiCmd('Inline Hints, bad provider', async function () {
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                return [new types.InlayHint(new types.Position(0, 1), 'Foo')];
            }
        }));
        disposables.push(extHost.registerInlayHintsProvider(nullExtensionDescription, defaultSelector, {
            provideInlayHints() {
                throw new Error();
            }
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeInlayHintProvider', model.uri, new types.Range(0, 0, 20, 20));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.label, 'Foo');
        assert.strictEqual(first.position.line, 0);
        assert.strictEqual(first.position.character, 1);
    });
    // --- selection ranges
    test('Selection Range, back and forth', async function () {
        disposables.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, {
            provideSelectionRanges() {
                return [
                    new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 2, 0, 20))),
                ];
            }
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeSelectionRangeProvider', model.uri, [new types.Position(0, 10)]);
        assert.strictEqual(value.length, 1);
        assert.ok(value[0].parent);
    });
    // --- call hierarchy
    test('CallHierarchy, back and forth', async function () {
        disposables.push(extHost.registerCallHierarchyProvider(nullExtensionDescription, defaultSelector, new class {
            prepareCallHierarchy(document, position) {
                return new types.CallHierarchyItem(types.SymbolKind.Constant, 'ROOT', 'ROOT', document.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0));
            }
            provideCallHierarchyIncomingCalls(item, token) {
                return [new types.CallHierarchyIncomingCall(new types.CallHierarchyItem(types.SymbolKind.Constant, 'INCOMING', 'INCOMING', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)), [new types.Range(0, 0, 0, 0)])];
            }
            provideCallHierarchyOutgoingCalls(item, token) {
                return [new types.CallHierarchyOutgoingCall(new types.CallHierarchyItem(types.SymbolKind.Constant, 'OUTGOING', 'OUTGOING', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)), [new types.Range(0, 0, 0, 0)])];
            }
        }));
        await rpcProtocol.sync();
        const root = await commands.executeCommand('vscode.prepareCallHierarchy', model.uri, new types.Position(0, 0));
        assert.ok(Array.isArray(root));
        assert.strictEqual(root.length, 1);
        assert.strictEqual(root[0].name, 'ROOT');
        const incoming = await commands.executeCommand('vscode.provideIncomingCalls', root[0]);
        assert.strictEqual(incoming.length, 1);
        assert.strictEqual(incoming[0].from.name, 'INCOMING');
        const outgoing = await commands.executeCommand('vscode.provideOutgoingCalls', root[0]);
        assert.strictEqual(outgoing.length, 1);
        assert.strictEqual(outgoing[0].to.name, 'OUTGOING');
    });
    test('prepareCallHierarchy throws TypeError if clangd returns empty result #137415', async function () {
        disposables.push(extHost.registerCallHierarchyProvider(nullExtensionDescription, defaultSelector, new class {
            prepareCallHierarchy(document, position) {
                return [];
            }
            provideCallHierarchyIncomingCalls(item, token) {
                return [];
            }
            provideCallHierarchyOutgoingCalls(item, token) {
                return [];
            }
        }));
        await rpcProtocol.sync();
        const root = await commands.executeCommand('vscode.prepareCallHierarchy', model.uri, new types.Position(0, 0));
        assert.ok(Array.isArray(root));
        assert.strictEqual(root.length, 0);
    });
    // --- type hierarchy
    test('TypeHierarchy, back and forth', async function () {
        disposables.push(extHost.registerTypeHierarchyProvider(nullExtensionDescription, defaultSelector, new class {
            prepareTypeHierarchy(document, position, token) {
                return [new types.TypeHierarchyItem(types.SymbolKind.Constant, 'ROOT', 'ROOT', document.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0))];
            }
            provideTypeHierarchySupertypes(item, token) {
                return [new types.TypeHierarchyItem(types.SymbolKind.Constant, 'SUPER', 'SUPER', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0))];
            }
            provideTypeHierarchySubtypes(item, token) {
                return [new types.TypeHierarchyItem(types.SymbolKind.Constant, 'SUB', 'SUB', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0))];
            }
        }));
        await rpcProtocol.sync();
        const root = await commands.executeCommand('vscode.prepareTypeHierarchy', model.uri, new types.Position(0, 0));
        assert.ok(Array.isArray(root));
        assert.strictEqual(root.length, 1);
        assert.strictEqual(root[0].name, 'ROOT');
        const incoming = await commands.executeCommand('vscode.provideSupertypes', root[0]);
        assert.strictEqual(incoming.length, 1);
        assert.strictEqual(incoming[0].name, 'SUPER');
        const outgoing = await commands.executeCommand('vscode.provideSubtypes', root[0]);
        assert.strictEqual(outgoing.length, 1);
        assert.strictEqual(outgoing[0].name, 'SUB');
    });
    test('selectionRangeProvider on inner array always returns outer array #91852', async function () {
        disposables.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, {
            provideSelectionRanges(_doc, positions) {
                const [first] = positions;
                return [
                    new types.SelectionRange(new types.Range(first.line, first.character, first.line, first.character)),
                ];
            }
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeSelectionRangeProvider', model.uri, [new types.Position(0, 10)]);
        assert.strictEqual(value.length, 1);
        assert.strictEqual(value[0].range.start.line, 0);
        assert.strictEqual(value[0].range.start.character, 10);
        assert.strictEqual(value[0].range.end.line, 0);
        assert.strictEqual(value[0].range.end.character, 10);
    });
    test('more element test of selectionRangeProvider on inner array always returns outer array #91852', async function () {
        disposables.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, {
            provideSelectionRanges(_doc, positions) {
                const [first, second] = positions;
                return [
                    new types.SelectionRange(new types.Range(first.line, first.character, first.line, first.character)),
                    new types.SelectionRange(new types.Range(second.line, second.character, second.line, second.character)),
                ];
            }
        }));
        await rpcProtocol.sync();
        const value = await commands.executeCommand('vscode.executeSelectionRangeProvider', model.uri, [new types.Position(0, 0), new types.Position(0, 10)]);
        assert.strictEqual(value.length, 2);
        assert.strictEqual(value[0].range.start.line, 0);
        assert.strictEqual(value[0].range.start.character, 0);
        assert.strictEqual(value[0].range.end.line, 0);
        assert.strictEqual(value[0].range.end.character, 0);
        assert.strictEqual(value[1].range.start.line, 0);
        assert.strictEqual(value[1].range.start.character, 10);
        assert.strictEqual(value[1].range.end.line, 0);
        assert.strictEqual(value[1].range.end.character, 10);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaUNvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdEFwaUNvbW1hbmRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyw2REFBNkQsQ0FBQztBQUNyRSxPQUFPLHlEQUF5RCxDQUFDO0FBQ2pFLE9BQU8sMkVBQTJFLENBQUM7QUFDbkYsT0FBTyxxREFBcUQsQ0FBQztBQUM3RCxPQUFPLCtEQUErRCxDQUFDO0FBQ3ZFLE9BQU8sdUVBQXVFLENBQUM7QUFDL0UsT0FBTyxzREFBc0QsQ0FBQztBQUM5RCxPQUFPLHNEQUFzRCxDQUFDO0FBQzlELE9BQU8sMkVBQTJFLENBQUM7QUFDbkYsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLHVEQUF1RCxDQUFDO0FBQy9ELE9BQU8scURBQXFELENBQUM7QUFDN0QsT0FBTyx1RUFBdUUsQ0FBQztBQUUvRSxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHlCQUF5QixFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxLQUFLLEtBQUssTUFBTSw4QkFBOEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFF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