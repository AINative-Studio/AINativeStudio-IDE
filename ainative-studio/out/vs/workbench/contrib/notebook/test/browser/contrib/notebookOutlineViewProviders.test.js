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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lVmlld1Byb3ZpZGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL25vdGVib29rT3V0bGluZVZpZXdQcm92aWRlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFbEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBR3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSwyQkFBMkIsRUFBdUIsMkJBQTJCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUcvSyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFNMUUsS0FBSyxDQUFDLGlDQUFpQyxFQUFFO0lBRXhDLGdCQUFnQjtJQUVoQixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO0lBQzVELE1BQU0sWUFBWSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztJQUU1QyxNQUFNLG1CQUFtQixHQUF5QyxFQUFFLENBQUM7SUFDckUsU0FB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