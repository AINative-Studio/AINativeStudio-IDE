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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvdGVzdC9icm93c2VyL21vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFXLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFMUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEcsT0FBTyxFQUFnRCxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEksT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFbEUsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxtSEFBbUg7SUFDbkgsNkNBQTZDO0lBRTdDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0IsTUFBTSxjQUFjLENBQ25CO1lBQ0MsWUFBWSxFQUFFLFdBQVc7WUFDekIsTUFBTSxFQUFFLGNB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