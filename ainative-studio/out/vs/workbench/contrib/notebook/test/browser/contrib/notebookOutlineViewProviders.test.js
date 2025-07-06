/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestThemeService } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { NotebookBreadcrumbsProvider, NotebookOutlinePaneProvider, NotebookQuickPickProvider } from '../../../browser/contrib/outline/notebookOutline.js';
import { NotebookOutlineEntryFactory } from '../../../browser/viewModel/notebookOutlineEntryFactory.js';
import { OutlineEntry } from '../../../browser/viewModel/OutlineEntry.js';
suite('Notebook Outline View Providers', function () {
    // #region Setup
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationService = new TestConfigurationService();
    const themeService = new TestThemeService();
    const symbolsPerTextModel = {};
    function setSymbolsForTextModel(symbols, textmodelId = 'textId') {
        symbolsPerTextModel[textmodelId] = symbols;
    }
    const executionService = new class extends mock() {
        getCellExecution() { return undefined; }
    };
    class OutlineModelStub {
        constructor(textId) {
            this.textId = textId;
        }
        getTopLevelSymbols() {
            return symbolsPerTextModel[this.textId];
        }
    }
    const outlineModelService = new class extends mock() {
        getOrCreate(model, arg1) {
            const outline = new OutlineModelStub(model.id);
            return Promise.resolve(outline);
        }
        getDebounceValue(arg0) {
            return 0;
        }
    };
    const textModelService = new class extends mock() {
        createModelReference(uri) {
            return Promise.resolve({
                object: {
                    textEditorModel: {
                        id: uri.toString(),
                        getVersionId() { return 1; }
                    }
                },
                dispose() { }
            });
        }
    };
    // #endregion
    // #region Helpers
    function createCodeCellViewModel(version = 1, source = '# code', textmodelId = 'textId') {
        return {
            uri: { toString() { return textmodelId; } },
            id: textmodelId,
            textBuffer: {
                getLineCount() { return 0; }
            },
            getText() {
                return source;
            },
            model: {
                textModel: {
                    id: textmodelId,
                    getVersionId() { return version; }
                }
            },
            resolveTextModel() {
                return this.model.textModel;
            },
            cellKind: 2
        };
    }
    function createMockOutlineDataSource(entries, activeElement = undefined) {
        return new class extends mock() {
            constructor() {
                super(...arguments);
                this.object = {
                    entries: entries,
                    activeElement: activeElement,
                };
            }
        };
    }
    function createMarkupCellViewModel(version = 1, source = 'markup', textmodelId = 'textId', alternativeId = 1) {
        return {
            textBuffer: {
                getLineCount() { return 0; }
            },
            getText() {
                return source;
            },
            getAlternativeId() {
                return alternativeId;
            },
            model: {
                textModel: {
                    id: textmodelId,
                    getVersionId() { return version; }
                }
            },
            resolveTextModel() {
                return this.model.textModel;
            },
            cellKind: 1
        };
    }
    function flatten(element, dataSource) {
        const elements = [];
        const children = dataSource.getChildren(element);
        for (const child of children) {
            elements.push(child);
            elements.push(...flatten(child, dataSource));
        }
        return elements;
    }
    function buildOutlineTree(entries) {
        if (entries.length > 0) {
            const result = [entries[0]];
            const parentStack = [entries[0]];
            for (let i = 1; i < entries.length; i++) {
                const entry = entries[i];
                while (true) {
                    const len = parentStack.length;
                    if (len === 0) {
                        // root node
                        result.push(entry);
                        parentStack.push(entry);
                        break;
                    }
                    else {
                        const parentCandidate = parentStack[len - 1];
                        if (parentCandidate.level < entry.level) {
                            parentCandidate.addChild(entry);
                            parentStack.push(entry);
                            break;
                        }
                        else {
                            parentStack.pop();
                        }
                    }
                }
            }
            return result;
        }
        return undefined;
    }
    /**
     * Set the configuration settings relevant to various outline views (OutlinePane, QuickPick, Breadcrumbs)
     *
     * @param outlineShowMarkdownHeadersOnly: boolean 	(notebook.outline.showMarkdownHeadersOnly)
     * @param outlineShowCodeCells: boolean 			(notebook.outline.showCodeCells)
     * @param outlineShowCodeCellSymbols: boolean 		(notebook.outline.showCodeCellSymbols)
     * @param quickPickShowAllSymbols: boolean 			(notebook.gotoSymbols.showAllSymbols)
     * @param breadcrumbsShowCodeCells: boolean 		(notebook.breadcrumbs.showCodeCells)
     */
    async function setOutlineViewConfiguration(config) {
        await configurationService.setUserConfiguration('notebook.outline.showMarkdownHeadersOnly', config.outlineShowMarkdownHeadersOnly);
        await configurationService.setUserConfiguration('notebook.outline.showCodeCells', config.outlineShowCodeCells);
        await configurationService.setUserConfiguration('notebook.outline.showCodeCellSymbols', config.outlineShowCodeCellSymbols);
        await configurationService.setUserConfiguration('notebook.gotoSymbols.showAllSymbols', config.quickPickShowAllSymbols);
        await configurationService.setUserConfiguration('notebook.breadcrumbs.showCodeCells', config.breadcrumbsShowCodeCells);
    }
    // #endregion
    // #region OutlinePane
    test('OutlinePane 0: Default Settings (Headers Only ON, Code cells OFF, Symbols ON)', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: true,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: true,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        // Validate
        assert.equal(results.length, 1);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
    });
    test('OutlinePane 1: ALL Markdown', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        assert.equal(results.length, 2);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
        assert.equal(results[1].label, 'plaintext');
        assert.equal(results[1].level, 7);
    });
    test('OutlinePane 2: Only Headers', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: true,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        assert.equal(results.length, 1);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
    });
    test('OutlinePane 3: Only Headers + Code Cells', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: true,
            outlineShowCodeCells: true,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        assert.equal(results.length, 3);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
        assert.equal(results[1].label, '# code cell 2');
        assert.equal(results[1].level, 7);
        assert.equal(results[2].label, '# code cell 3');
        assert.equal(results[2].level, 7);
    });
    test('OutlinePane 4: Only Headers + Code Cells + Symbols', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: true,
            outlineShowCodeCells: true,
            outlineShowCodeCellSymbols: true,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {} }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const outlinePaneProvider = store.add(new NotebookOutlinePaneProvider(undefined, configurationService));
        const results = flatten(outlineModel, outlinePaneProvider);
        // validate
        assert.equal(results.length, 5);
        assert.equal(results[0].label, 'h1');
        assert.equal(results[0].level, 1);
        assert.equal(results[1].label, '# code cell 2');
        assert.equal(results[1].level, 7);
        assert.equal(results[2].label, 'var2');
        assert.equal(results[2].level, 8);
        assert.equal(results[3].label, '# code cell 3');
        assert.equal(results[3].level, 7);
        assert.equal(results[4].label, 'var3');
        assert.equal(results[4].level, 8);
    });
    // #endregion
    // #region QuickPick
    test('QuickPick 0: Symbols On + 2 cells WITH symbols', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: true,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {}, kind: 12 }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const quickPickProvider = store.add(new NotebookQuickPickProvider(createMockOutlineDataSource([...outlineModel.children]), configurationService, themeService));
        const results = quickPickProvider.getQuickPickElements();
        // Validate
        assert.equal(results.length, 4);
        assert.equal(results[0].label, '$(markdown) h1');
        assert.equal(results[0].element.level, 1);
        assert.equal(results[1].label, '$(markdown) plaintext');
        assert.equal(results[1].element.level, 7);
        assert.equal(results[2].label, '$(symbol-variable) var2');
        assert.equal(results[2].element.level, 8);
        assert.equal(results[3].label, '$(symbol-variable) var3');
        assert.equal(results[3].element.level, 8);
    });
    test('QuickPick 1: Symbols On + 1 cell WITH symbol + 1 cell WITHOUT symbol', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: true,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const quickPickProvider = store.add(new NotebookQuickPickProvider(createMockOutlineDataSource([...outlineModel.children]), configurationService, themeService));
        const results = quickPickProvider.getQuickPickElements();
        // Validate
        assert.equal(results.length, 4);
        assert.equal(results[0].label, '$(markdown) h1');
        assert.equal(results[0].element.level, 1);
        assert.equal(results[1].label, '$(markdown) plaintext');
        assert.equal(results[1].element.level, 7);
        assert.equal(results[2].label, '$(code) # code cell 2');
        assert.equal(results[2].element.level, 7);
        assert.equal(results[3].label, '$(symbol-variable) var3');
        assert.equal(results[3].element.level, 8);
    });
    test('QuickPick 3: Symbols Off', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {}, kind: 12 }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createCodeCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        // Generate filtered outline (view model)
        const quickPickProvider = store.add(new NotebookQuickPickProvider(createMockOutlineDataSource([...outlineModel.children]), configurationService, themeService));
        const results = quickPickProvider.getQuickPickElements();
        // Validate
        assert.equal(results.length, 4);
        assert.equal(results[0].label, '$(markdown) h1');
        assert.equal(results[0].element.level, 1);
        assert.equal(results[1].label, '$(markdown) plaintext');
        assert.equal(results[1].element.level, 7);
        assert.equal(results[2].label, '$(code) # code cell 2');
        assert.equal(results[2].element.level, 7);
        assert.equal(results[3].label, '$(code) # code cell 3');
        assert.equal(results[3].element.level, 7);
    });
    // #endregion
    // #region Breadcrumbs
    test('Breadcrumbs 0: Code Cells On ', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: true
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {}, kind: 12 }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createMarkupCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        const outlineTree = buildOutlineTree([...outlineModel.children]);
        // Generate filtered outline (view model)
        const breadcrumbsProvider = store.add(new NotebookBreadcrumbsProvider(createMockOutlineDataSource([], [...outlineTree[0].children][1]), configurationService));
        const results = breadcrumbsProvider.getBreadcrumbElements();
        // Validate
        assert.equal(results.length, 3);
        assert.equal(results[0].label, 'fakeRoot');
        assert.equal(results[0].level, -1);
        assert.equal(results[1].label, 'h1');
        assert.equal(results[1].level, 1);
        assert.equal(results[2].label, '# code cell 2');
        assert.equal(results[2].level, 7);
    });
    test('Breadcrumbs 1: Code Cells Off ', async function () {
        await setOutlineViewConfiguration({
            outlineShowMarkdownHeadersOnly: false,
            outlineShowCodeCells: false,
            outlineShowCodeCellSymbols: false,
            quickPickShowAllSymbols: false,
            breadcrumbsShowCodeCells: false
        });
        // Create models + symbols
        const cells = [
            createMarkupCellViewModel(1, '# h1', '$0', 0),
            createMarkupCellViewModel(1, 'plaintext', '$1', 0),
            createCodeCellViewModel(1, '# code cell 2', '$2'),
            createCodeCellViewModel(1, '# code cell 3', '$3')
        ];
        setSymbolsForTextModel([], '$0');
        setSymbolsForTextModel([], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {}, kind: 12 }], '$2');
        setSymbolsForTextModel([{ name: 'var3', range: {}, kind: 12 }], '$3');
        // Cache symbols
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        for (const cell of cells) {
            await entryFactory.cacheSymbols(cell, CancellationToken.None);
        }
        // Generate raw outline
        const outlineModel = new OutlineEntry(-1, -1, createMarkupCellViewModel(), 'fakeRoot', false, false, undefined, undefined);
        for (const cell of cells) {
            entryFactory.getOutlineEntries(cell, 0).forEach(entry => outlineModel.addChild(entry));
        }
        const outlineTree = buildOutlineTree([...outlineModel.children]);
        // Generate filtered outline (view model)
        const breadcrumbsProvider = store.add(new NotebookBreadcrumbsProvider(createMockOutlineDataSource([], [...outlineTree[0].children][1]), configurationService));
        const results = breadcrumbsProvider.getBreadcrumbElements();
        // Validate
        assert.equal(results.length, 2);
        assert.equal(results[0].label, 'fakeRoot');
        assert.equal(results[0].level, -1);
        assert.equal(results[1].label, 'h1');
        assert.equal(results[1].level, 1);
    });
    // #endregion
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lVmlld1Byb3ZpZGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va091dGxpbmVWaWV3UHJvdmlkZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUd0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNwRyxPQUFPLEVBQUUsMkJBQTJCLEVBQXVCLDJCQUEyQixFQUFFLHlCQUF5QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFHL0ssT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBTTFFLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRTtJQUV4QyxnQkFBZ0I7SUFFaEIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxNQUFNLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztJQUM1RCxNQUFNLFlBQVksR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7SUFFNUMsTUFBTSxtQkFBbUIsR0FBeUMsRUFBRSxDQUFDO0lBQ3JF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