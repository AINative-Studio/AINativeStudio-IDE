/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../base/common/uri.js';
import { workbenchInstantiationService, TestEditorService } from './workbenchTestServices.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { LanguageService } from '../../../editor/common/services/languageService.js';
import { RangeHighlightDecorations } from '../../browser/codeeditor.js';
import { createTestCodeEditor } from '../../../editor/test/browser/testCodeEditor.js';
import { Range } from '../../../editor/common/core/range.js';
import { Position } from '../../../editor/common/core/position.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
import { CoreNavigationCommands } from '../../../editor/browser/coreCommands.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { createTextModel } from '../../../editor/test/common/testTextModel.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
suite('Editor - Range decorations', () => {
    let disposables;
    let instantiationService;
    let codeEditor;
    let model;
    let text;
    let testObject;
    const modelsToDispose = [];
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(IEditorService, new TestEditorService());
        instantiationService.stub(ILanguageService, LanguageService);
        instantiationService.stub(IModelService, stubModelService(instantiationService));
        text = 'LINE1' + '\n' + 'LINE2' + '\n' + 'LINE3' + '\n' + 'LINE4' + '\r\n' + 'LINE5';
        model = disposables.add(aModel(URI.file('some_file')));
        codeEditor = disposables.add(createTestCodeEditor(model));
        instantiationService.stub(IEditorService, 'activeEditor', { get resource() { return codeEditor.getModel().uri; } });
        instantiationService.stub(IEditorService, 'activeTextEditorControl', codeEditor);
        testObject = disposables.add(instantiationService.createInstance(RangeHighlightDecorations));
    });
    teardown(() => {
        codeEditor.dispose();
        modelsToDispose.forEach(model => model.dispose());
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('highlight range for the resource if it is an active editor', function () {
        const range = new Range(1, 1, 1, 1);
        testObject.highlightRange({ resource: model.uri, range });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, [range]);
    });
    test('remove highlight range', function () {
        testObject.highlightRange({ resource: model.uri, range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 } });
        testObject.removeHighlightRange();
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
    });
    test('highlight range for the resource removes previous highlight', function () {
        testObject.highlightRange({ resource: model.uri, range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 } });
        const range = new Range(2, 2, 4, 3);
        testObject.highlightRange({ resource: model.uri, range });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, [range]);
    });
    test('highlight range for a new resource removes highlight of previous resource', function () {
        testObject.highlightRange({ resource: model.uri, range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 } });
        const anotherModel = prepareActiveEditor('anotherModel');
        const range = new Range(2, 2, 4, 3);
        testObject.highlightRange({ resource: anotherModel.uri, range });
        let actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
        actuals = rangeHighlightDecorations(anotherModel);
        assert.deepStrictEqual(actuals, [range]);
    });
    test('highlight is removed on model change', function () {
        testObject.highlightRange({ resource: model.uri, range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 } });
        prepareActiveEditor('anotherModel');
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
    });
    test('highlight is removed on cursor position change', function () {
        testObject.highlightRange({ resource: model.uri, range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 } });
        codeEditor.trigger('mouse', CoreNavigationCommands.MoveTo.id, {
            position: new Position(2, 1)
        });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
    });
    test('range is not highlight if not active editor', function () {
        const model = aModel(URI.file('some model'));
        testObject.highlightRange({ resource: model.uri, range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 } });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, []);
    });
    test('previous highlight is not removed if not active editor', function () {
        const range = new Range(1, 1, 1, 1);
        testObject.highlightRange({ resource: model.uri, range });
        const model1 = aModel(URI.file('some model'));
        testObject.highlightRange({ resource: model1.uri, range: { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 } });
        const actuals = rangeHighlightDecorations(model);
        assert.deepStrictEqual(actuals, [range]);
    });
    function prepareActiveEditor(resource) {
        const model = aModel(URI.file(resource));
        codeEditor.setModel(model);
        return model;
    }
    function aModel(resource, content = text) {
        const model = createTextModel(content, undefined, undefined, resource);
        modelsToDispose.push(model);
        return model;
    }
    function rangeHighlightDecorations(m) {
        const rangeHighlights = [];
        for (const dec of m.getAllDecorations()) {
            if (dec.options.className === 'rangeHighlight') {
                rangeHighlights.push(dec.range);
            }
        }
        rangeHighlights.sort(Range.compareRangesUsingStarts);
        return rangeHighlights;
    }
    function stubModelService(instantiationService) {
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IThemeService, new TestThemeService());
        return instantiationService.createInstance(ModelService);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWVkaXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvY29kZWVkaXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNyRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsS0FBSyxFQUFVLE1BQU0sc0NBQXNDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFB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