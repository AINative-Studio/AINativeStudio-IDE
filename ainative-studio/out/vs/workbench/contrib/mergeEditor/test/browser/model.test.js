/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { transaction } from '../../../../../base/common/observable.js';
import { isDefined } from '../../../../../base/common/types.js';
import { linesDiffComputers } from '../../../../../editor/common/diff/linesDiffComputers.js';
import { createModelServices, createTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { toLineRange, toRangeMapping } from '../../browser/model/diffComputer.js';
import { DetailedLineRangeMapping } from '../../browser/model/mapping.js';
import { MergeEditorModel } from '../../browser/model/mergeEditorModel.js';
import { MergeEditorTelemetry } from '../../browser/telemetry.js';
suite('merge editor model', () => {
    // todo: renable when failing case is found https://github.com/microsoft/vscode/pull/190444#issuecomment-1678151428
    // ensureNoDisposablesAreLeakedInTestSuite();
    test('prepend line', async () => {
        await testMergeModel({
            "languageId": "plaintext",
            "base": "line1\nline2",
            "input1": "0\nline1\nline2",
            "input2": "0\nline1\nline2",
            "result": ""
        }, model => {
            assert.deepStrictEqual(model.getProjections(), {
                base: ['⟦⟧₀line1', 'line2'],
                input1: ['⟦0', '⟧₀line1', 'line2'],
                input2: ['⟦0', '⟧₀line1', 'line2'],
                result: ['⟦⟧{unrecognized}₀'],
            });
            model.toggleConflict(0, 1);
            assert.deepStrictEqual({ result: model.getResult() }, { result: '0\nline1\nline2' });
            model.toggleConflict(0, 2);
            assert.deepStrictEqual({ result: model.getResult() }, ({ result: "0\n0\nline1\nline2" }));
        });
    });
    test('empty base', async () => {
        await testMergeModel({
            "languageId": "plaintext",
            "base": "",
            "input1": "input1",
            "input2": "input2",
            "result": ""
        }, model => {
            assert.deepStrictEqual(model.getProjections(), {
                base: ['⟦⟧₀'],
                input1: ['⟦input1⟧₀'],
                input2: ['⟦input2⟧₀'],
                result: ['⟦⟧{base}₀'],
            });
            model.toggleConflict(0, 1);
            assert.deepStrictEqual({ result: model.getResult() }, ({ result: "input1" }));
            model.toggleConflict(0, 2);
            assert.deepStrictEqual({ result: model.getResult() }, ({ result: "input2" }));
        });
    });
    test('can merge word changes', async () => {
        await testMergeModel({
            "languageId": "plaintext",
            "base": "hello",
            "input1": "hallo",
            "input2": "helloworld",
            "result": ""
        }, model => {
            assert.deepStrictEqual(model.getProjections(), {
                base: ['⟦hello⟧₀'],
                input1: ['⟦hallo⟧₀'],
                input2: ['⟦helloworld⟧₀'],
                result: ['⟦⟧{unrecognized}₀'],
            });
            model.toggleConflict(0, 1);
            model.toggleConflict(0, 2);
            assert.deepStrictEqual({ result: model.getResult() }, { result: 'halloworld' });
        });
    });
    test('can combine insertions at end of document', async () => {
        await testMergeModel({
            "languageId": "plaintext",
            "base": "Zürich\nBern\nBasel\nChur\nGenf\nThun",
            "input1": "Zürich\nBern\nChur\nDavos\nGenf\nThun\nfunction f(b:boolean) {}",
            "input2": "Zürich\nBern\nBasel (FCB)\nChur\nGenf\nThun\nfunction f(a:number) {}",
            "result": "Zürich\nBern\nBasel\nChur\nDavos\nGenf\nThun"
        }, model => {
            assert.deepStrictEqual(model.getProjections(), {
                base: ['Zürich', 'Bern', '⟦Basel', '⟧₀Chur', '⟦⟧₁Genf', 'Thun⟦⟧₂'],
                input1: [
                    'Zürich',
                    'Bern',
                    '⟦⟧₀Chur',
                    '⟦Davos',
                    '⟧₁Genf',
                    'Thun',
                    '⟦function f(b:boolean) {}⟧₂',
                ],
                input2: [
                    'Zürich',
                    'Bern',
                    '⟦Basel (FCB)',
                    '⟧₀Chur',
                    '⟦⟧₁Genf',
                    'Thun',
                    '⟦function f(a:number) {}⟧₂',
                ],
                result: [
                    'Zürich',
                    'Bern',
                    '⟦Basel',
                    '⟧{base}₀Chur',
                    '⟦Davos',
                    '⟧{1✓}₁Genf',
                    'Thun⟦⟧{base}₂',
                ],
            });
            model.toggleConflict(2, 1);
            model.toggleConflict(2, 2);
            assert.deepStrictEqual({ result: model.getResult() }, {
                result: 'Zürich\nBern\nBasel\nChur\nDavos\nGenf\nThun\nfunction f(b:boolean) {}\nfunction f(a:number) {}',
            });
        });
    });
    test('conflicts are reset', async () => {
        await testMergeModel({
            "languageId": "typescript",
            "base": "import { h } from 'vs/base/browser/dom';\nimport { Disposable, IDisposable } from 'vs/base/common/lifecycle';\nimport { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';\nimport { EditorOption } from 'vs/editor/common/config/editorOptions';\nimport { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';\nimport { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';\n",
            "input1": "import { h } from 'vs/base/browser/dom';\nimport { Disposable, IDisposable } from 'vs/base/common/lifecycle';\nimport { observableSignalFromEvent } from 'vs/base/common/observable';\nimport { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';\nimport { autorun, IReader, observableFromEvent } from 'vs/workbench/contrib/audioCues/browser/observable';\nimport { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';\n",
            "input2": "import { h } from 'vs/base/browser/dom';\nimport { Disposable, IDisposable } from 'vs/base/common/lifecycle';\nimport { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';\nimport { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';\nimport { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';\n",
            "result": "import { h } from 'vs/base/browser/dom';\r\nimport { Disposable, IDisposable } from 'vs/base/common/lifecycle';\r\nimport { observableSignalFromEvent } from 'vs/base/common/observable';\r\nimport { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';\r\n<<<<<<< Updated upstream\r\nimport { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';\r\n=======\r\nimport { autorun, IReader, observableFromEvent } from 'vs/workbench/contrib/audioCues/browser/observable';\r\n>>>>>>> Stashed changes\r\nimport { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';\r\n"
        }, model => {
            assert.deepStrictEqual(model.getProjections(), {
                base: [
                    "import { h } from 'vs/base/browser/dom';",
                    "import { Disposable, IDisposable } from 'vs/base/common/lifecycle';",
                    "⟦⟧₀import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';",
                    "⟦import { EditorOption } from 'vs/editor/common/config/editorOptions';",
                    "import { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    "⟧₁import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';",
                    '',
                ],
                input1: [
                    "import { h } from 'vs/base/browser/dom';",
                    "import { Disposable, IDisposable } from 'vs/base/common/lifecycle';",
                    "⟦import { observableSignalFromEvent } from 'vs/base/common/observable';",
                    "⟧₀import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';",
                    "⟦import { autorun, IReader, observableFromEvent } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    "⟧₁import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';",
                    '',
                ],
                input2: [
                    "import { h } from 'vs/base/browser/dom';",
                    "import { Disposable, IDisposable } from 'vs/base/common/lifecycle';",
                    "⟦⟧₀import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';",
                    "⟦import { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    "⟧₁import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';",
                    '',
                ],
                result: [
                    "import { h } from 'vs/base/browser/dom';",
                    "import { Disposable, IDisposable } from 'vs/base/common/lifecycle';",
                    "⟦import { observableSignalFromEvent } from 'vs/base/common/observable';",
                    "⟧{1✓}₀import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';",
                    '⟦<<<<<<< Updated upstream',
                    "import { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    '=======',
                    "import { autorun, IReader, observableFromEvent } from 'vs/workbench/contrib/audioCues/browser/observable';",
                    '>>>>>>> Stashed changes',
                    "⟧{unrecognized}₁import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';",
                    '',
                ],
            });
        });
    });
    test('auto-solve equal edits', async () => {
        await testMergeModel({
            "languageId": "javascript",
            "base": "const { readFileSync } = require('fs');\n\nlet paths = process.argv.slice(2);\nmain(paths);\n\nfunction main(paths) {\n    // print the welcome message\n    printMessage();\n\n    let data = getLineCountInfo(paths);\n    console.log(\"Lines: \" + data.totalLineCount);\n}\n\n/**\n * Prints the welcome message\n*/\nfunction printMessage() {\n    console.log(\"Welcome To Line Counter\");\n}\n\n/**\n * @param {string[]} paths\n*/\nfunction getLineCountInfo(paths) {\n    let lineCounts = paths.map(path => ({ path, count: getLinesLength(readFileSync(path, 'utf8')) }));\n    return {\n        totalLineCount: lineCounts.reduce((acc, { count }) => acc + count, 0),\n        lineCounts,\n    };\n}\n\n/**\n * @param {string} str\n */\nfunction getLinesLength(str) {\n    return str.split('\\n').length;\n}\n",
            "input1": "const { readFileSync } = require('fs');\n\nlet paths = process.argv.slice(2);\nmain(paths);\n\nfunction main(paths) {\n    // print the welcome message\n    printMessage();\n\n    const data = getLineCountInfo(paths);\n    console.log(\"Lines: \" + data.totalLineCount);\n}\n\nfunction printMessage() {\n    console.log(\"Welcome To Line Counter\");\n}\n\n/**\n * @param {string[]} paths\n*/\nfunction getLineCountInfo(paths) {\n    let lineCounts = paths.map(path => ({ path, count: getLinesLength(readFileSync(path, 'utf8')) }));\n    return {\n        totalLineCount: lineCounts.reduce((acc, { count }) => acc + count, 0),\n        lineCounts,\n    };\n}\n\n/**\n * @param {string} str\n */\nfunction getLinesLength(str) {\n    return str.split('\\n').length;\n}\n",
            "input2": "const { readFileSync } = require('fs');\n\nlet paths = process.argv.slice(2);\nrun(paths);\n\nfunction run(paths) {\n    // print the welcome message\n    printMessage();\n\n    const data = getLineCountInfo(paths);\n    console.log(\"Lines: \" + data.totalLineCount);\n}\n\nfunction printMessage() {\n    console.log(\"Welcome To Line Counter\");\n}\n\n/**\n * @param {string[]} paths\n*/\nfunction getLineCountInfo(paths) {\n    let lineCounts = paths.map(path => ({ path, count: getLinesLength(readFileSync(path, 'utf8')) }));\n    return {\n        totalLineCount: lineCounts.reduce((acc, { count }) => acc + count, 0),\n        lineCounts,\n    };\n}\n\n/**\n * @param {string} str\n */\nfunction getLinesLength(str) {\n    return str.split('\\n').length;\n}\n",
            "result": "<<<<<<< uiae\n>>>>>>> Stashed changes",
            resetResult: true,
        }, async (model) => {
            await model.mergeModel.reset();
            assert.deepStrictEqual(model.getResult(), `const { readFileSync } = require('fs');\n\nlet paths = process.argv.slice(2);\nrun(paths);\n\nfunction run(paths) {\n    // print the welcome message\n    printMessage();\n\n    const data = getLineCountInfo(paths);\n    console.log("Lines: " + data.totalLineCount);\n}\n\nfunction printMessage() {\n    console.log("Welcome To Line Counter");\n}\n\n/**\n * @param {string[]} paths\n*/\nfunction getLineCountInfo(paths) {\n    let lineCounts = paths.map(path => ({ path, count: getLinesLength(readFileSync(path, 'utf8')) }));\n    return {\n        totalLineCount: lineCounts.reduce((acc, { count }) => acc + count, 0),\n        lineCounts,\n    };\n}\n\n/**\n * @param {string} str\n */\nfunction getLinesLength(str) {\n    return str.split('\\n').length;\n}\n`);
        });
    });
});
async function testMergeModel(options, fn) {
    const disposables = new DisposableStore();
    const modelInterface = disposables.add(new MergeModelInterface(options, createModelServices(disposables)));
    await modelInterface.mergeModel.onInitialized;
    await fn(modelInterface);
    disposables.dispose();
}
function toSmallNumbersDec(value) {
    const smallNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return value.toString().split('').map(c => smallNumbers[parseInt(c)]).join('');
}
class MergeModelInterface extends Disposable {
    constructor(options, instantiationService) {
        super();
        const input1TextModel = this._register(createTextModel(options.input1, options.languageId));
        const input2TextModel = this._register(createTextModel(options.input2, options.languageId));
        const baseTextModel = this._register(createTextModel(options.base, options.languageId));
        const resultTextModel = this._register(createTextModel(options.result, options.languageId));
        const diffComputer = {
            async computeDiff(textModel1, textModel2, reader) {
                const result = await linesDiffComputers.getLegacy().computeDiff(textModel1.getLinesContent(), textModel2.getLinesContent(), { ignoreTrimWhitespace: false, maxComputationTimeMs: 10000, computeMoves: false });
                const changes = result.changes.map(c => new DetailedLineRangeMapping(toLineRange(c.original), textModel1, toLineRange(c.modified), textModel2, c.innerChanges?.map(ic => toRangeMapping(ic)).filter(isDefined)));
                return {
                    diffs: changes
                };
            }
        };
        this.mergeModel = this._register(instantiationService.createInstance(MergeEditorModel, baseTextModel, {
            textModel: input1TextModel,
            description: '',
            detail: '',
            title: '',
        }, {
            textModel: input2TextModel,
            description: '',
            detail: '',
            title: '',
        }, resultTextModel, diffComputer, {
            resetResult: options.resetResult || false
        }, new MergeEditorTelemetry(NullTelemetryService)));
    }
    getProjections() {
        function applyRanges(textModel, ranges) {
            textModel.applyEdits(ranges.map(({ range, label }) => ({
                range: range,
                text: `⟦${textModel.getValueInRange(range)}⟧${label}`,
            })));
        }
        const baseRanges = this.mergeModel.modifiedBaseRanges.get();
        const baseTextModel = createTextModel(this.mergeModel.base.getValue());
        applyRanges(baseTextModel, baseRanges.map((r, idx) => ({
            range: r.baseRange.toRange(),
            label: toSmallNumbersDec(idx),
        })));
        const input1TextModel = createTextModel(this.mergeModel.input1.textModel.getValue());
        applyRanges(input1TextModel, baseRanges.map((r, idx) => ({
            range: r.input1Range.toRange(),
            label: toSmallNumbersDec(idx),
        })));
        const input2TextModel = createTextModel(this.mergeModel.input2.textModel.getValue());
        applyRanges(input2TextModel, baseRanges.map((r, idx) => ({
            range: r.input2Range.toRange(),
            label: toSmallNumbersDec(idx),
        })));
        const resultTextModel = createTextModel(this.mergeModel.resultTextModel.getValue());
        applyRanges(resultTextModel, baseRanges.map((r, idx) => ({
            range: this.mergeModel.getLineRangeInResult(r.baseRange).toRange(),
            label: `{${this.mergeModel.getState(r).get()}}${toSmallNumbersDec(idx)}`,
        })));
        const result = {
            base: baseTextModel.getValue(1 /* EndOfLinePreference.LF */).split('\n'),
            input1: input1TextModel.getValue(1 /* EndOfLinePreference.LF */).split('\n'),
            input2: input2TextModel.getValue(1 /* EndOfLinePreference.LF */).split('\n'),
            result: resultTextModel.getValue(1 /* EndOfLinePreference.LF */).split('\n'),
        };
        baseTextModel.dispose();
        input1TextModel.dispose();
        input2TextModel.dispose();
        resultTextModel.dispose();
        return result;
    }
    toggleConflict(conflictIdx, inputNumber) {
        const baseRange = this.mergeModel.modifiedBaseRanges.get()[conflictIdx];
        if (!baseRange) {
            throw new Error();
        }
        const state = this.mergeModel.getState(baseRange).get();
        transaction(tx => {
            this.mergeModel.setState(baseRange, state.toggle(inputNumber), true, tx);
        });
    }
    getResult() {
        return this.mergeModel.resultTextModel.getValue();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci90ZXN0L2Jyb3dzZXIvbW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQVcsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUUxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQWdELFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoSSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUVsRSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLG1IQUFtSDtJQUNuSCw2Q0FBNkM7SUFFN0MsSUFBSSxDQUFDLGNBQWMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvQixNQUFNLGNBQWMsQ0FDbkI7WUFDQyxZQUFZLEVBQUUsV0FBVztZQUN6QixNQUFNLEVBQUUsY0FBYztZ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