/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { setUnexpectedErrorHandler, errorHandler } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import * as types from '../../common/extHostTypes.js';
import { createTextModel } from '../../../../editor/test/common/testTextModel.js';
import { Position as EditorPosition, Position } from '../../../../editor/common/core/position.js';
import { Range as EditorRange } from '../../../../editor/common/core/range.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../../platform/markers/common/markerService.js';
import { ExtHostLanguageFeatures } from '../../common/extHostLanguageFeatures.js';
import { MainThreadLanguageFeatures } from '../../browser/mainThreadLanguageFeatures.js';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { MainThreadCommands } from '../../browser/mainThreadCommands.js';
import { ExtHostDocuments } from '../../common/extHostDocuments.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import * as languages from '../../../../editor/common/languages.js';
import { getCodeLensModel } from '../../../../editor/contrib/codelens/browser/codelens.js';
import { getDefinitionsAtPosition, getImplementationsAtPosition, getTypeDefinitionsAtPosition, getDeclarationsAtPosition, getReferencesAtPosition } from '../../../../editor/contrib/gotoSymbol/browser/goToSymbol.js';
import { getHoversPromise } from '../../../../editor/contrib/hover/browser/getHover.js';
import { getOccurrencesAtPosition } from '../../../../editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import { getCodeActions } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { getWorkspaceSymbols } from '../../../contrib/search/common/search.js';
import { rename } from '../../../../editor/contrib/rename/browser/rename.js';
import { provideSignatureHelp } from '../../../../editor/contrib/parameterHints/browser/provideSignatureHelp.js';
import { provideSuggestionItems, CompletionOptions } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { getDocumentFormattingEditsUntilResult, getDocumentRangeFormattingEditsUntilResult, getOnTypeFormattingEdits } from '../../../../editor/contrib/format/browser/format.js';
import { getLinks } from '../../../../editor/contrib/links/browser/getLinks.js';
import { MainContext, ExtHostContext } from '../../common/extHost.protocol.js';
import { ExtHostDiagnostics } from '../../common/extHostDiagnostics.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { getColors } from '../../../../editor/contrib/colorPicker/browser/color.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { nullExtensionDescription as defaultExtension } from '../../../services/extensions/common/extensions.js';
import { provideSelectionRanges } from '../../../../editor/contrib/smartSelect/browser/smartSelect.js';
import { mock } from '../../../../base/test/common/mock.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { NullApiDeprecationService } from '../../common/extHostApiDeprecationService.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
import { OutlineModel } from '../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../editor/common/services/languageFeaturesService.js';
import { CodeActionTriggerSource } from '../../../../editor/contrib/codeAction/common/types.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
suite('ExtHostLanguageFeatures', function () {
    const defaultSelector = { scheme: 'far' };
    let model;
    let extHost;
    let mainThread;
    const disposables = new DisposableStore();
    let rpcProtocol;
    let languageFeaturesService;
    let originalErrorHandler;
    let instantiationService;
    setup(() => {
        model = createTextModel([
            'This is the first line',
            'This is the second line',
            'This is the third line',
        ].join('\n'), undefined, undefined, URI.parse('far://testing/file.a'));
        rpcProtocol = new TestRPCProtocol();
        languageFeaturesService = new LanguageFeaturesService();
        // Use IInstantiationService to get typechecking when instantiating
        let inst;
        {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IMarkerService, MarkerService);
            instantiationService.set(ILanguageFeaturesService, languageFeaturesService);
            instantiationService.set(IUriIdentityService, new class extends mock() {
                asCanonicalUri(uri) {
                    return uri;
                }
            });
            inst = instantiationService;
        }
        originalErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => { });
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
        const commands = new ExtHostCommands(rpcProtocol, new NullLogService(), new class extends mock() {
            onExtensionError() {
                return true;
            }
        });
        rpcProtocol.set(ExtHostContext.ExtHostCommands, commands);
        rpcProtocol.set(MainContext.MainThreadCommands, disposables.add(inst.createInstance(MainThreadCommands, rpcProtocol)));
        const diagnostics = new ExtHostDiagnostics(rpcProtocol, new NullLogService(), new class extends mock() {
        }, extHostDocumentsAndEditors);
        rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, diagnostics);
        extHost = new ExtHostLanguageFeatures(rpcProtocol, new URITransformerService(null), extHostDocuments, commands, diagnostics, new NullLogService(), NullApiDeprecationService, new class extends mock() {
            onExtensionError() {
                return true;
            }
        });
        rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, extHost);
        mainThread = rpcProtocol.set(MainContext.MainThreadLanguageFeatures, disposables.add(inst.createInstance(MainThreadLanguageFeatures, rpcProtocol)));
    });
    teardown(() => {
        disposables.clear();
        setUnexpectedErrorHandler(originalErrorHandler);
        model.dispose();
        mainThread.dispose();
        instantiationService.dispose();
        return rpcProtocol.sync();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // --- outline
    test('DocumentSymbols, register/deregister', async () => {
        assert.strictEqual(languageFeaturesService.documentSymbolProvider.all(model).length, 0);
        const d1 = extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new class {
            provideDocumentSymbols() {
                return [];
            }
        });
        await rpcProtocol.sync();
        assert.strictEqual(languageFeaturesService.documentSymbolProvider.all(model).length, 1);
        d1.dispose();
        return rpcProtocol.sync();
    });
    test('DocumentSymbols, evil provider', async () => {
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new class {
            provideDocumentSymbols() {
                throw new Error('evil document symbol provider');
            }
        }));
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new class {
            provideDocumentSymbols() {
                return [new types.SymbolInformation('test', types.SymbolKind.Field, new types.Range(0, 0, 0, 0))];
            }
        }));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 1);
    });
    test('DocumentSymbols, data conversion', async () => {
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, new class {
            provideDocumentSymbols() {
                return [new types.SymbolInformation('test', types.SymbolKind.Field, new types.Range(0, 0, 0, 0))];
            }
        }));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 1);
        const entry = value[0];
        assert.strictEqual(entry.name, 'test');
        assert.deepStrictEqual(entry.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
    });
    test('Quick Outline uses a not ideal sorting, #138502', async function () {
        const symbols = [
            { name: 'containers', range: { startLineNumber: 1, startColumn: 1, endLineNumber: 4, endColumn: 26 } },
            { name: 'container 0', range: { startLineNumber: 2, startColumn: 5, endLineNumber: 5, endColumn: 1 } },
            { name: 'name', range: { startLineNumber: 2, startColumn: 5, endLineNumber: 2, endColumn: 16 } },
            { name: 'ports', range: { startLineNumber: 3, startColumn: 5, endLineNumber: 5, endColumn: 1 } },
            { name: 'ports 0', range: { startLineNumber: 4, startColumn: 9, endLineNumber: 4, endColumn: 26 } },
            { name: 'containerPort', range: { startLineNumber: 4, startColumn: 9, endLineNumber: 4, endColumn: 26 } }
        ];
        disposables.add(extHost.registerDocumentSymbolProvider(defaultExtension, defaultSelector, {
            provideDocumentSymbols: (doc, token) => {
                return symbols.map(s => {
                    return new types.SymbolInformation(s.name, types.SymbolKind.Object, new types.Range(s.range.startLineNumber - 1, s.range.startColumn - 1, s.range.endLineNumber - 1, s.range.endColumn - 1));
                });
            }
        }));
        await rpcProtocol.sync();
        const value = (await OutlineModel.create(languageFeaturesService.documentSymbolProvider, model, CancellationToken.None)).asListOfDocumentSymbols();
        assert.strictEqual(value.length, 6);
        assert.deepStrictEqual(value.map(s => s.name), ['containers', 'container 0', 'name', 'ports', 'ports 0', 'containerPort']);
    });
    // --- code lens
    test('CodeLens, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new class {
                provideCodeLenses() {
                    throw new Error('evil');
                }
            }));
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new class {
                provideCodeLenses() {
                    return [new types.CodeLens(new types.Range(0, 0, 0, 0))];
                }
            }));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            value.dispose();
        });
    });
    test('CodeLens, do not resolve a resolved lens', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new class {
                provideCodeLenses() {
                    return [new types.CodeLens(new types.Range(0, 0, 0, 0), { command: 'id', title: 'Title' })];
                }
                resolveCodeLens() {
                    assert.ok(false, 'do not resolve');
                }
            }));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            const [data] = value.lenses;
            const symbol = await Promise.resolve(data.provider.resolveCodeLens(model, data.symbol, CancellationToken.None));
            assert.strictEqual(symbol.command.id, 'id');
            assert.strictEqual(symbol.command.title, 'Title');
            value.dispose();
        });
    });
    test('CodeLens, missing command', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new class {
                provideCodeLenses() {
                    return [new types.CodeLens(new types.Range(0, 0, 0, 0))];
                }
            }));
            await rpcProtocol.sync();
            const value = await getCodeLensModel(languageFeaturesService.codeLensProvider, model, CancellationToken.None);
            assert.strictEqual(value.lenses.length, 1);
            const [data] = value.lenses;
            const symbol = await Promise.resolve(data.provider.resolveCodeLens(model, data.symbol, CancellationToken.None));
            assert.strictEqual(symbol, undefined);
            value.dispose();
        });
    });
    // --- definition
    test('Definition, data conversion', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class {
            provideDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, { startLineNumber: 2, startColumn: 3, endLineNumber: 4, endColumn: 5 });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    test('Definition, one or many', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class {
            provideDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 1, 1, 1))];
            }
        }));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class {
            provideDefinition() {
                return new types.Location(model.uri, new types.Range(2, 1, 1, 1));
            }
        }));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
    });
    test('Definition, registration order', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class {
            provideDefinition() {
                return [new types.Location(URI.parse('far://first'), new types.Range(2, 3, 4, 5))];
            }
        }));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class {
            provideDefinition() {
                return new types.Location(URI.parse('far://second'), new types.Range(1, 2, 3, 4));
            }
        }));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
        // let [first, second] = value;
        assert.strictEqual(value[0].uri.authority, 'second');
        assert.strictEqual(value[1].uri.authority, 'first');
    });
    test('Definition, evil provider', async () => {
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class {
            provideDefinition() {
                throw new Error('evil provider');
            }
        }));
        disposables.add(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class {
            provideDefinition() {
                return new types.Location(model.uri, new types.Range(1, 1, 1, 1));
            }
        }));
        await rpcProtocol.sync();
        const value = await getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
    });
    // -- declaration
    test('Declaration, data conversion', async () => {
        disposables.add(extHost.registerDeclarationProvider(defaultExtension, defaultSelector, new class {
            provideDeclaration() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, { startLineNumber: 2, startColumn: 3, endLineNumber: 4, endColumn: 5 });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- implementation
    test('Implementation, data conversion', async () => {
        disposables.add(extHost.registerImplementationProvider(defaultExtension, defaultSelector, new class {
            provideImplementation() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, { startLineNumber: 2, startColumn: 3, endLineNumber: 4, endColumn: 5 });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- type definition
    test('Type Definition, data conversion', async () => {
        disposables.add(extHost.registerTypeDefinitionProvider(defaultExtension, defaultSelector, new class {
            provideTypeDefinition() {
                return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, new EditorPosition(1, 1), false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [entry] = value;
        assert.deepStrictEqual(entry.range, { startLineNumber: 2, startColumn: 3, endLineNumber: 4, endColumn: 5 });
        assert.strictEqual(entry.uri.toString(), model.uri.toString());
    });
    // --- extra info
    test('HoverProvider, word range at pos', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class {
            provideHover() {
                return new types.Hover('Hello');
            }
        }));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
        const [entry] = hovers;
        assert.deepStrictEqual(entry.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 });
    });
    test('HoverProvider, given range', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class {
            provideHover() {
                return new types.Hover('Hello', new types.Range(3, 0, 8, 7));
            }
        }));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
        const [entry] = hovers;
        assert.deepStrictEqual(entry.range, { startLineNumber: 4, startColumn: 1, endLineNumber: 9, endColumn: 8 });
    });
    test('HoverProvider, registration order', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class {
            provideHover() {
                return new types.Hover('registered first');
            }
        }));
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class {
            provideHover() {
                return new types.Hover('registered second');
            }
        }));
        await rpcProtocol.sync();
        const value = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.contents[0].value, 'registered second');
        assert.strictEqual(second.contents[0].value, 'registered first');
    });
    test('HoverProvider, evil provider', async () => {
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class {
            provideHover() {
                throw new Error('evil');
            }
        }));
        disposables.add(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class {
            provideHover() {
                return new types.Hover('Hello');
            }
        }));
        await rpcProtocol.sync();
        const hovers = await getHoversPromise(languageFeaturesService.hoverProvider, model, new EditorPosition(1, 1), CancellationToken.None);
        assert.strictEqual(hovers.length, 1);
    });
    // --- occurrences
    test('Occurrences, data conversion', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        }));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, order 1/2', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class {
            provideDocumentHighlights() {
                return undefined;
            }
        }));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, '*', new class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        }));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, order 2/2', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 2))];
            }
        }));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, '*', new class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        }));
        await rpcProtocol.sync();
        const value = (await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None));
        assert.strictEqual(value.size, 1);
        const [entry] = Array.from(value.values())[0];
        assert.deepStrictEqual(entry.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 3 });
        assert.strictEqual(entry.kind, languages.DocumentHighlightKind.Text);
    });
    test('Occurrences, evil provider', async () => {
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class {
            provideDocumentHighlights() {
                throw new Error('evil');
            }
        }));
        disposables.add(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class {
            provideDocumentHighlights() {
                return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, new EditorPosition(1, 2), CancellationToken.None);
        assert.strictEqual(value.size, 1);
    });
    // --- references
    test('References, registration order', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class {
            provideReferences() {
                return [new types.Location(URI.parse('far://register/first'), new types.Range(0, 0, 0, 0))];
            }
        }));
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class {
            provideReferences() {
                return [new types.Location(URI.parse('far://register/second'), new types.Range(0, 0, 0, 0))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.uri.path, '/second');
        assert.strictEqual(second.uri.path, '/first');
    });
    test('References, data conversion', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class {
            provideReferences() {
                return [new types.Location(model.uri, new types.Position(0, 0))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [item] = value;
        assert.deepStrictEqual(item.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
        assert.strictEqual(item.uri.toString(), model.uri.toString());
    });
    test('References, evil provider', async () => {
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class {
            provideReferences() {
                throw new Error('evil');
            }
        }));
        disposables.add(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class {
            provideReferences() {
                return [new types.Location(model.uri, new types.Range(0, 0, 0, 0))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getReferencesAtPosition(languageFeaturesService.referenceProvider, model, new EditorPosition(1, 2), false, false, CancellationToken.None);
        assert.strictEqual(value.length, 1);
    });
    // --- quick fix
    test('Quick Fix, command data conversion', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, {
                provideCodeActions() {
                    return [
                        { command: 'test1', title: 'Testing1' },
                        { command: 'test2', title: 'Testing2' }
                    ];
                }
            }));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), { type: 1 /* languages.CodeActionTriggerType.Invoke */, triggerAction: CodeActionTriggerSource.QuickFix }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 2);
            const [first, second] = actions;
            assert.strictEqual(first.action.title, 'Testing1');
            assert.strictEqual(first.action.command.id, 'test1');
            assert.strictEqual(second.action.title, 'Testing2');
            assert.strictEqual(second.action.command.id, 'test2');
            value.dispose();
        });
    });
    test('Quick Fix, code action data conversion', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, {
                provideCodeActions() {
                    return [
                        {
                            title: 'Testing1',
                            command: { title: 'Testing1Command', command: 'test1' },
                            kind: types.CodeActionKind.Empty.append('test.scope')
                        }
                    ];
                }
            }));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), { type: 1 /* languages.CodeActionTriggerType.Invoke */, triggerAction: CodeActionTriggerSource.Default }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            const [first] = actions;
            assert.strictEqual(first.action.title, 'Testing1');
            assert.strictEqual(first.action.command.title, 'Testing1Command');
            assert.strictEqual(first.action.command.id, 'test1');
            assert.strictEqual(first.action.kind, 'test.scope');
            value.dispose();
        });
    });
    test('Cannot read property \'id\' of undefined, #29469', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new class {
                provideCodeActions() {
                    return [
                        undefined,
                        null,
                        { command: 'test', title: 'Testing' }
                    ];
                }
            }));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), { type: 1 /* languages.CodeActionTriggerType.Invoke */, triggerAction: CodeActionTriggerSource.Default }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            value.dispose();
        });
    });
    test('Quick Fix, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new class {
                provideCodeActions() {
                    throw new Error('evil');
                }
            }));
            disposables.add(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new class {
                provideCodeActions() {
                    return [{ command: 'test', title: 'Testing' }];
                }
            }));
            await rpcProtocol.sync();
            const value = await getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), { type: 1 /* languages.CodeActionTriggerType.Invoke */, triggerAction: CodeActionTriggerSource.QuickFix }, Progress.None, CancellationToken.None);
            const { validActions: actions } = value;
            assert.strictEqual(actions.length, 1);
            value.dispose();
        });
    });
    // --- navigate types
    test('Navigate types, evil provider', async () => {
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new class {
            provideWorkspaceSymbols() {
                throw new Error('evil');
            }
        }));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new class {
            provideWorkspaceSymbols() {
                return [new types.SymbolInformation('testing', types.SymbolKind.Array, new types.Range(0, 0, 1, 1))];
            }
        }));
        await rpcProtocol.sync();
        const value = await getWorkspaceSymbols('');
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.symbol.name, 'testing');
    });
    test('Navigate types, de-duplicate results', async () => {
        const uri = URI.from({ scheme: 'foo', path: '/some/path' });
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new class {
            provideWorkspaceSymbols() {
                return [new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1)))];
            }
        }));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new class {
            provideWorkspaceSymbols() {
                return [new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1)))]; // get de-duped
            }
        }));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new class {
            provideWorkspaceSymbols() {
                return [new types.SymbolInformation('ONE', types.SymbolKind.Array, undefined, new types.Location(uri, undefined))]; // NO dedupe because of resolve
            }
            resolveWorkspaceSymbol(a) {
                return a;
            }
        }));
        disposables.add(extHost.registerWorkspaceSymbolProvider(defaultExtension, new class {
            provideWorkspaceSymbols() {
                return [new types.SymbolInformation('ONE', types.SymbolKind.Struct, undefined, new types.Location(uri, new types.Range(0, 0, 1, 1)))]; // NO dedupe because of kind
            }
        }));
        await rpcProtocol.sync();
        const value = await getWorkspaceSymbols('');
        assert.strictEqual(value.length, 3);
    });
    // --- rename
    test('Rename, evil provider 0/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class {
            provideRenameEdits() {
                throw new class Foo {
                };
            }
        }));
        await rpcProtocol.sync();
        try {
            await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
            throw Error();
        }
        catch (err) {
            // expected
        }
    });
    test('Rename, evil provider 1/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class {
            provideRenameEdits() {
                throw Error('evil');
            }
        }));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.strictEqual(value.rejectReason, 'evil');
    });
    test('Rename, evil provider 2/2', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, '*', new class {
            provideRenameEdits() {
                throw Error('evil');
            }
        }));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class {
            provideRenameEdits() {
                const edit = new types.WorkspaceEdit();
                edit.replace(model.uri, new types.Range(0, 0, 0, 0), 'testing');
                return edit;
            }
        }));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.strictEqual(value.edits.length, 1);
    });
    test('Rename, ordering', async () => {
        disposables.add(extHost.registerRenameProvider(defaultExtension, '*', new class {
            provideRenameEdits() {
                const edit = new types.WorkspaceEdit();
                edit.replace(model.uri, new types.Range(0, 0, 0, 0), 'testing');
                edit.replace(model.uri, new types.Range(1, 0, 1, 0), 'testing');
                return edit;
            }
        }));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class {
            provideRenameEdits() {
                return;
            }
        }));
        await rpcProtocol.sync();
        const value = await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        // least relevant rename provider
        assert.strictEqual(value.edits.length, 2);
    });
    test('Multiple RenameProviders don\'t respect all possible PrepareRename handlers 1/2, #98352', async function () {
        const called = [false, false, false, false];
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class {
            prepareRename(document, position) {
                called[0] = true;
                const range = document.getWordRangeAtPosition(position);
                return range;
            }
            provideRenameEdits() {
                called[1] = true;
                return undefined;
            }
        }));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class {
            prepareRename(document, position) {
                called[2] = true;
                return Promise.reject('Cannot rename this symbol2.');
            }
            provideRenameEdits() {
                called[3] = true;
                return undefined;
            }
        }));
        await rpcProtocol.sync();
        await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        assert.deepStrictEqual(called, [true, true, true, false]);
    });
    test('Multiple RenameProviders don\'t respect all possible PrepareRename handlers 2/2, #98352', async function () {
        const called = [false, false, false];
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class {
            prepareRename(document, position) {
                called[0] = true;
                const range = document.getWordRangeAtPosition(position);
                return range;
            }
            provideRenameEdits() {
                called[1] = true;
                return undefined;
            }
        }));
        disposables.add(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class {
            provideRenameEdits(document, position, newName) {
                called[2] = true;
                return new types.WorkspaceEdit();
            }
        }));
        await rpcProtocol.sync();
        await rename(languageFeaturesService.renameProvider, model, new EditorPosition(1, 1), 'newName');
        // first provider has NO prepare which means it is taken by default
        assert.deepStrictEqual(called, [false, false, true]);
    });
    // --- parameter hints
    test('Parameter Hints, order', async () => {
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new class {
            provideSignatureHelp() {
                return undefined;
            }
        }, []));
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new class {
            provideSignatureHelp() {
                return {
                    signatures: [],
                    activeParameter: 0,
                    activeSignature: 0
                };
            }
        }, []));
        await rpcProtocol.sync();
        const value = await provideSignatureHelp(languageFeaturesService.signatureHelpProvider, model, new EditorPosition(1, 1), { triggerKind: languages.SignatureHelpTriggerKind.Invoke, isRetrigger: false }, CancellationToken.None);
        assert.ok(value);
    });
    test('Parameter Hints, evil provider', async () => {
        disposables.add(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new class {
            provideSignatureHelp() {
                throw new Error('evil');
            }
        }, []));
        await rpcProtocol.sync();
        const value = await provideSignatureHelp(languageFeaturesService.signatureHelpProvider, model, new EditorPosition(1, 1), { triggerKind: languages.SignatureHelpTriggerKind.Invoke, isRetrigger: false }, CancellationToken.None);
        assert.strictEqual(value, undefined);
    });
    // --- suggestions
    test('Suggest, order 1/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, '*', new class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing1')];
                }
            }, []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing2')];
                }
            }, []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 1);
            assert.strictEqual(value.items[0].completion.insertText, 'testing2');
            value.disposable.dispose();
        });
    });
    test('Suggest, order 2/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, '*', new class {
                provideCompletionItems() {
                    return [new types.CompletionItem('weak-selector')]; // weaker selector but result
                }
            }, []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class {
                provideCompletionItems() {
                    return []; // stronger selector but not a good result;
                }
            }, []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 1);
            assert.strictEqual(value.items[0].completion.insertText, 'weak-selector');
            value.disposable.dispose();
        });
    });
    test('Suggest, order 3/3', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class {
                provideCompletionItems() {
                    return [new types.CompletionItem('strong-1')];
                }
            }, []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class {
                provideCompletionItems() {
                    return [new types.CompletionItem('strong-2')];
                }
            }, []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items.length, 2);
            assert.strictEqual(value.items[0].completion.insertText, 'strong-1'); // sort by label
            assert.strictEqual(value.items[1].completion.insertText, 'strong-2');
            value.disposable.dispose();
        });
    });
    test('Suggest, evil provider', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class {
                provideCompletionItems() {
                    throw new Error('evil');
                }
            }, []));
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class {
                provideCompletionItems() {
                    return [new types.CompletionItem('testing')];
                }
            }, []));
            await rpcProtocol.sync();
            const value = await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */)));
            assert.strictEqual(value.items[0].container.incomplete, false);
            value.disposable.dispose();
        });
    });
    test('Suggest, CompletionList', async () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            disposables.add(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class {
                provideCompletionItems() {
                    return new types.CompletionList([new types.CompletionItem('hello')], true);
                }
            }, []));
            await rpcProtocol.sync();
            await provideSuggestionItems(languageFeaturesService.completionProvider, model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set().add(27 /* languages.CompletionItemKind.Snippet */))).then(model => {
                assert.strictEqual(model.items[0].container.incomplete, true);
                model.disposable.dispose();
            });
        });
    });
    // --- format
    const NullWorkerService = new class extends mock() {
        computeMoreMinimalEdits(resource, edits) {
            return Promise.resolve(edits ?? undefined);
        }
    };
    test('Format Doc, data conversion', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing'), types.TextEdit.setEndOfLine(types.EndOfLine.LF)];
            }
        }));
        await rpcProtocol.sync();
        const value = (await getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 2);
        const [first, second] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
        assert.strictEqual(second.eol, 0 /* EndOfLineSequence.LF */);
        assert.strictEqual(second.text, '');
        assert.deepStrictEqual(second.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
    });
    test('Format Doc, evil provider', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentFormattingEdits() {
                throw new Error('evil');
            }
        }));
        await rpcProtocol.sync();
        return getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None);
    });
    test('Format Doc, order', async () => {
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentFormattingEdits() {
                return undefined;
            }
        }));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing')];
            }
        }));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentFormattingEdits() {
                return undefined;
            }
        }));
        await rpcProtocol.sync();
        const value = (await getDocumentFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
    });
    test('Format Range, data conversion', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing')];
            }
        }));
        await rpcProtocol.sync();
        const value = (await getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'testing');
        assert.deepStrictEqual(first.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
    });
    test('Format Range, + format_doc', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'range')];
            }
        }));
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentRangeFormattingEdits() {
                return [new types.TextEdit(new types.Range(2, 3, 4, 5), 'range2')];
            }
        }));
        disposables.add(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 1, 1), 'doc')];
            }
        }));
        await rpcProtocol.sync();
        const value = (await getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, 'range2');
        assert.strictEqual(first.range.startLineNumber, 3);
        assert.strictEqual(first.range.startColumn, 4);
        assert.strictEqual(first.range.endLineNumber, 5);
        assert.strictEqual(first.range.endColumn, 6);
    });
    test('Format Range, evil provider', async () => {
        disposables.add(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideDocumentRangeFormattingEdits() {
                throw new Error('evil');
            }
        }));
        await rpcProtocol.sync();
        return getDocumentRangeFormattingEditsUntilResult(NullWorkerService, languageFeaturesService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, tabSize: 4 }, CancellationToken.None);
    });
    test('Format on Type, data conversion', async () => {
        disposables.add(extHost.registerOnTypeFormattingEditProvider(defaultExtension, defaultSelector, new class {
            provideOnTypeFormattingEdits() {
                return [new types.TextEdit(new types.Range(0, 0, 0, 0), arguments[2])];
            }
        }, [';']));
        await rpcProtocol.sync();
        const value = (await getOnTypeFormattingEdits(NullWorkerService, languageFeaturesService, model, new EditorPosition(1, 1), ';', { insertSpaces: true, tabSize: 2 }, CancellationToken.None));
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.strictEqual(first.text, ';');
        assert.deepStrictEqual(first.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
    });
    test('Links, data conversion', async () => {
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new class {
            provideDocumentLinks() {
                const link = new types.DocumentLink(new types.Range(0, 0, 1, 1), URI.parse('foo:bar#3'));
                link.tooltip = 'tooltip';
                return [link];
            }
        }));
        await rpcProtocol.sync();
        const { links } = disposables.add(await getLinks(languageFeaturesService.linkProvider, model, CancellationToken.None));
        assert.strictEqual(links.length, 1);
        const [first] = links;
        assert.strictEqual(first.url?.toString(), 'foo:bar#3');
        assert.deepStrictEqual(first.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 2, endColumn: 2 });
        assert.strictEqual(first.tooltip, 'tooltip');
    });
    test('Links, evil provider', async () => {
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new class {
            provideDocumentLinks() {
                return [new types.DocumentLink(new types.Range(0, 0, 1, 1), URI.parse('foo:bar#3'))];
            }
        }));
        disposables.add(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new class {
            provideDocumentLinks() {
                throw new Error();
            }
        }));
        await rpcProtocol.sync();
        const { links } = disposables.add(await getLinks(languageFeaturesService.linkProvider, model, CancellationToken.None));
        assert.strictEqual(links.length, 1);
        const [first] = links;
        assert.strictEqual(first.url?.toString(), 'foo:bar#3');
        assert.deepStrictEqual(first.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 2, endColumn: 2 });
    });
    test('Document colors, data conversion', async () => {
        disposables.add(extHost.registerColorProvider(defaultExtension, defaultSelector, new class {
            provideDocumentColors() {
                return [new types.ColorInformation(new types.Range(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4))];
            }
            provideColorPresentations(color, context) {
                return [];
            }
        }));
        await rpcProtocol.sync();
        const value = await getColors(languageFeaturesService.colorProvider, model, CancellationToken.None);
        assert.strictEqual(value.length, 1);
        const [first] = value;
        assert.deepStrictEqual(first.colorInfo.color, { red: 0.1, green: 0.2, blue: 0.3, alpha: 0.4 });
        assert.deepStrictEqual(first.colorInfo.range, { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 21 });
    });
    // -- selection ranges
    test('Selection Ranges, data conversion', async () => {
        disposables.add(extHost.registerSelectionRangeProvider(defaultExtension, defaultSelector, new class {
            provideSelectionRanges() {
                return [
                    new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 2, 0, 20))),
                ];
            }
        }));
        await rpcProtocol.sync();
        provideSelectionRanges(languageFeaturesService.selectionRangeProvider, model, [new Position(1, 17)], { selectLeadingAndTrailingWhitespace: true, selectSubwords: true }, CancellationToken.None).then(ranges => {
            assert.strictEqual(ranges.length, 1);
            assert.ok(ranges[0].length >= 2);
        });
    });
    test('Selection Ranges, bad data', async () => {
        try {
            const _a = new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 11, 0, 18)));
            assert.ok(false, String(_a));
        }
        catch (err) {
            assert.ok(true);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlRmVhdHVyZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0TGFuZ3VhZ2VGZWF0dXJlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sS0FBSyxLQUFLLE1BQU0sOEJBQThCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLElBQUksY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxLQUFLLElBQUksV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFB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