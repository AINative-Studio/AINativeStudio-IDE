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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaUNvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0QXBpQ29tbWFuZHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDZEQUE2RCxDQUFDO0FBQ3JFLE9BQU8seURBQXlELENBQUM7QUFDakUsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLHFEQUFxRCxDQUFDO0FBQzdELE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTyx1RUFBdUUsQ0FBQztBQUMvRSxPQUFPLHNEQUFzRCxDQUFDO0FBQzlELE9BQU8sc0RBQXNELENBQUM7QUFDOUQsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLCtEQUErRCxDQUFDO0FBQ3ZFLE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTyxxREFBcUQsQ0FBQztBQUM3RCxPQUFPLHVFQUF1RSxDQUFDO0FBRS9FLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUseUJBQXlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEtBQUssS0FBSyxNQUFNLDhCQUE4QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUs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QUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sS0FBSyxHQUFRLE1BQU0sQ0FBQyxLQUFNLENBQUM7UUFDakMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxZQUFZLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUF1QixNQUFNLENB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