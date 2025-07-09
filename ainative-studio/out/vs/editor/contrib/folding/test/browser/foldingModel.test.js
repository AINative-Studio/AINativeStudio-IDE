/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { escapeRegExpCharacters } from '../../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditOperation } from '../../../../common/core/editOperation.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { ModelDecorationOptions } from '../../../../common/model/textModel.js';
import { toSelectedLines } from '../../browser/folding.js';
import { FoldingModel, getNextFoldLine, getParentFoldLine, getPreviousFoldLine, setCollapseStateAtLevel, setCollapseStateForMatchingLines, setCollapseStateForRest, setCollapseStateLevelsDown, setCollapseStateLevelsUp, setCollapseStateUp } from '../../browser/foldingModel.js';
import { computeRanges } from '../../browser/indentRangeProvider.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
export class TestDecorationProvider {
    static { this.collapsedDecoration = ModelDecorationOptions.register({
        description: 'test',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        linesDecorationsClassName: 'folding'
    }); }
    static { this.expandedDecoration = ModelDecorationOptions.register({
        description: 'test',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        linesDecorationsClassName: 'folding'
    }); }
    static { this.hiddenDecoration = ModelDecorationOptions.register({
        description: 'test',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        linesDecorationsClassName: 'folding'
    }); }
    constructor(model) {
        this.model = model;
    }
    getDecorationOption(isCollapsed, isHidden) {
        if (isHidden) {
            return TestDecorationProvider.hiddenDecoration;
        }
        if (isCollapsed) {
            return TestDecorationProvider.collapsedDecoration;
        }
        return TestDecorationProvider.expandedDecoration;
    }
    changeDecorations(callback) {
        return this.model.changeDecorations(callback);
    }
    removeDecorations(decorationIds) {
        this.model.changeDecorations((changeAccessor) => {
            changeAccessor.deltaDecorations(decorationIds, []);
        });
    }
    getDecorations() {
        const decorations = this.model.getAllDecorations();
        const res = [];
        for (const decoration of decorations) {
            if (decoration.options === TestDecorationProvider.hiddenDecoration) {
                res.push({ line: decoration.range.startLineNumber, type: 'hidden' });
            }
            else if (decoration.options === TestDecorationProvider.collapsedDecoration) {
                res.push({ line: decoration.range.startLineNumber, type: 'collapsed' });
            }
            else if (decoration.options === TestDecorationProvider.expandedDecoration) {
                res.push({ line: decoration.range.startLineNumber, type: 'expanded' });
            }
        }
        return res;
    }
}
suite('Folding Model', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function r(startLineNumber, endLineNumber, isCollapsed = false) {
        return { startLineNumber, endLineNumber, isCollapsed };
    }
    function d(line, type) {
        return { line, type };
    }
    function assertRegion(actual, expected, message) {
        assert.strictEqual(!!actual, !!expected, message);
        if (actual && expected) {
            assert.strictEqual(actual.startLineNumber, expected.startLineNumber, message);
            assert.strictEqual(actual.endLineNumber, expected.endLineNumber, message);
            assert.strictEqual(actual.isCollapsed, expected.isCollapsed, message);
        }
    }
    function assertFoldedRanges(foldingModel, expectedRegions, message) {
        const actualRanges = [];
        const actual = foldingModel.regions;
        for (let i = 0; i < actual.length; i++) {
            if (actual.isCollapsed(i)) {
                actualRanges.push(r(actual.getStartLineNumber(i), actual.getEndLineNumber(i)));
            }
        }
        assert.deepStrictEqual(actualRanges, expectedRegions, message);
    }
    function assertRanges(foldingModel, expectedRegions, message) {
        const actualRanges = [];
        const actual = foldingModel.regions;
        for (let i = 0; i < actual.length; i++) {
            actualRanges.push(r(actual.getStartLineNumber(i), actual.getEndLineNumber(i), actual.isCollapsed(i)));
        }
        assert.deepStrictEqual(actualRanges, expectedRegions, message);
    }
    function assertDecorations(foldingModel, expectedDecoration, message) {
        const decorationProvider = foldingModel.decorationProvider;
        assert.deepStrictEqual(decorationProvider.getDecorations(), expectedDecoration, message);
    }
    function assertRegions(actual, expectedRegions, message) {
        assert.deepStrictEqual(actual.map(r => ({ startLineNumber: r.startLineNumber, endLineNumber: r.endLineNumber, isCollapsed: r.isCollapsed })), expectedRegions, message);
    }
    test('getRegionAtLine', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    // comment {',
            /* 7*/ '  }',
            /* 8*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 7, false);
            const r3 = r(5, 6, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            assertRegion(foldingModel.getRegionAtLine(1), r1, '1');
            assertRegion(foldingModel.getRegionAtLine(2), r1, '2');
            assertRegion(foldingModel.getRegionAtLine(3), r1, '3');
            assertRegion(foldingModel.getRegionAtLine(4), r2, '4');
            assertRegion(foldingModel.getRegionAtLine(5), r3, '5');
            assertRegion(foldingModel.getRegionAtLine(6), r3, '5');
            assertRegion(foldingModel.getRegionAtLine(7), r2, '6');
            assertRegion(foldingModel.getRegionAtLine(8), null, '7');
        }
        finally {
            textModel.dispose();
        }
    });
    test('collapse', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    // comment {',
            /* 7*/ '  }',
            /* 8*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 7, false);
            const r3 = r(5, 6, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(1)]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r(1, 3, true), r2, r3]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(5)]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r(1, 3, true), r2, r(5, 6, true)]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(7)]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r(1, 3, true), r(4, 7, true), r(5, 6, true)]);
            textModel.dispose();
        }
        finally {
            textModel.dispose();
        }
    });
    test('update', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    // comment {',
            /* 7*/ '  }',
            /* 8*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 7, false);
            const r3 = r(5, 6, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(2), foldingModel.getRegionAtLine(5)]);
            textModel.applyEdits([EditOperation.insert(new Position(4, 1), '//hello\n')]);
            foldingModel.update(computeRanges(textModel, false, undefined));
            assertRanges(foldingModel, [r(1, 3, true), r(5, 8, false), r(6, 7, true)]);
        }
        finally {
            textModel.dispose();
        }
    });
    test('delete', () => {
        const lines = [
            /* 1*/ 'function foo() {',
            /* 2*/ '  switch (x) {',
            /* 3*/ '    case 1:',
            /* 4*/ '      //hello1',
            /* 5*/ '      break;',
            /* 6*/ '    case 2:',
            /* 7*/ '      //hello2',
            /* 8*/ '      break;',
            /* 9*/ '    case 3:',
            /* 10*/ '      //hello3',
            /* 11*/ '      break;',
            /* 12*/ '  }',
            /* 13*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 12, false);
            const r2 = r(2, 11, false);
            const r3 = r(3, 5, false);
            const r4 = r(6, 8, false);
            const r5 = r(9, 11, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(6)]);
            textModel.applyEdits([EditOperation.delete(new Range(6, 11, 9, 0))]);
            foldingModel.update(computeRanges(textModel, true, undefined), toSelectedLines([new Selection(7, 1, 7, 1)]));
            assertRanges(foldingModel, [r(1, 9, false), r(2, 8, false), r(3, 5, false), r(6, 8, false)]);
        }
        finally {
            textModel.dispose();
        }
    });
    test('getRegionsInside', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * Comment',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  void foo() {',
            /* 6*/ '    // comment {',
            /* 7*/ '  }',
            /* 8*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 7, false);
            const r3 = r(5, 6, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            const region1 = foldingModel.getRegionAtLine(r1.startLineNumber);
            const region2 = foldingModel.getRegionAtLine(r2.startLineNumber);
            const region3 = foldingModel.getRegionAtLine(r3.startLineNumber);
            assertRegions(foldingModel.getRegionsInside(null), [r1, r2, r3], '1');
            assertRegions(foldingModel.getRegionsInside(region1), [], '2');
            assertRegions(foldingModel.getRegionsInside(region2), [r3], '3');
            assertRegions(foldingModel.getRegionsInside(region3), [], '4');
        }
        finally {
            textModel.dispose();
        }
    });
    test('getRegionsInsideWithLevel', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '    if (true) {',
            /* 9*/ '      return;',
            /* 10*/ '    }',
            /* 11*/ '  }',
            /* 12*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\/\/#region$/, end: /^\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 11, false);
            const r3 = r(4, 10, false);
            const r4 = r(5, 6, false);
            const r5 = r(8, 9, false);
            const region1 = foldingModel.getRegionAtLine(r1.startLineNumber);
            const region2 = foldingModel.getRegionAtLine(r2.startLineNumber);
            const region3 = foldingModel.getRegionAtLine(r3.startLineNumber);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            assertRegions(foldingModel.getRegionsInside(null, (r, level) => level === 1), [r1, r2], '1');
            assertRegions(foldingModel.getRegionsInside(null, (r, level) => level === 2), [r3], '2');
            assertRegions(foldingModel.getRegionsInside(null, (r, level) => level === 3), [r4, r5], '3');
            assertRegions(foldingModel.getRegionsInside(region2, (r, level) => level === 1), [r3], '4');
            assertRegions(foldingModel.getRegionsInside(region2, (r, level) => level === 2), [r4, r5], '5');
            assertRegions(foldingModel.getRegionsInside(region3, (r, level) => level === 1), [r4, r5], '6');
            assertRegions(foldingModel.getRegionsInside(region2, (r, level) => r.hidesLine(9)), [r3, r5], '7');
            assertRegions(foldingModel.getRegionsInside(region1, (r, level) => level === 1), [], '8');
        }
        finally {
            textModel.dispose();
        }
    });
    test('getRegionAtLine2', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ 'class A {',
            /* 3*/ '  void foo() {',
            /* 4*/ '    if (true) {',
            /* 5*/ '      //hello',
            /* 6*/ '    }',
            /* 7*/ '',
            /* 8*/ '  }',
            /* 9*/ '}',
            /* 10*/ '//#endregion',
            /* 11*/ ''
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\/\/#region$/, end: /^\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 10, false);
            const r2 = r(2, 8, false);
            const r3 = r(3, 7, false);
            const r4 = r(4, 5, false);
            assertRanges(foldingModel, [r1, r2, r3, r4]);
            assertRegions(foldingModel.getAllRegionsAtLine(1), [r1], '1');
            assertRegions(foldingModel.getAllRegionsAtLine(2), [r1, r2].reverse(), '2');
            assertRegions(foldingModel.getAllRegionsAtLine(3), [r1, r2, r3].reverse(), '3');
            assertRegions(foldingModel.getAllRegionsAtLine(4), [r1, r2, r3, r4].reverse(), '4');
            assertRegions(foldingModel.getAllRegionsAtLine(5), [r1, r2, r3, r4].reverse(), '5');
            assertRegions(foldingModel.getAllRegionsAtLine(6), [r1, r2, r3].reverse(), '6');
            assertRegions(foldingModel.getAllRegionsAtLine(7), [r1, r2, r3].reverse(), '7');
            assertRegions(foldingModel.getAllRegionsAtLine(8), [r1, r2].reverse(), '8');
            assertRegions(foldingModel.getAllRegionsAtLine(9), [r1], '9');
            assertRegions(foldingModel.getAllRegionsAtLine(10), [r1], '10');
            assertRegions(foldingModel.getAllRegionsAtLine(11), [], '10');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateRecursivly', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\/\/#region$/, end: /^\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateLevelsDown(foldingModel, true, Number.MAX_VALUE, [4]);
            assertFoldedRanges(foldingModel, [r3, r4, r5], '1');
            setCollapseStateLevelsDown(foldingModel, false, Number.MAX_VALUE, [8]);
            assertFoldedRanges(foldingModel, [], '2');
            setCollapseStateLevelsDown(foldingModel, true, Number.MAX_VALUE, [12]);
            assertFoldedRanges(foldingModel, [r2, r3, r4, r5], '1');
            setCollapseStateLevelsDown(foldingModel, false, Number.MAX_VALUE, [7]);
            assertFoldedRanges(foldingModel, [r2], '1');
            setCollapseStateLevelsDown(foldingModel, false);
            assertFoldedRanges(foldingModel, [], '1');
            setCollapseStateLevelsDown(foldingModel, true);
            assertFoldedRanges(foldingModel, [r1, r2, r3, r4, r5], '1');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateAtLevel', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '  //#region',
            /* 14*/ '  const bar = 9;',
            /* 15*/ '  //#endregion',
            /* 16*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\s*\/\/#region$/, end: /^\s*\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 15, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            const r6 = r(13, 15, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5, r6]);
            setCollapseStateAtLevel(foldingModel, 1, true, []);
            assertFoldedRanges(foldingModel, [r1, r2], '1');
            setCollapseStateAtLevel(foldingModel, 1, false, [5]);
            assertFoldedRanges(foldingModel, [r2], '2');
            setCollapseStateAtLevel(foldingModel, 1, false, [1]);
            assertFoldedRanges(foldingModel, [], '3');
            setCollapseStateAtLevel(foldingModel, 2, true, []);
            assertFoldedRanges(foldingModel, [r3, r6], '4');
            setCollapseStateAtLevel(foldingModel, 2, false, [5, 6]);
            assertFoldedRanges(foldingModel, [r3], '5');
            setCollapseStateAtLevel(foldingModel, 3, true, [4, 9]);
            assertFoldedRanges(foldingModel, [r3, r4], '6');
            setCollapseStateAtLevel(foldingModel, 3, false, [4, 9]);
            assertFoldedRanges(foldingModel, [r3], '7');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateLevelsDown', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\/\/#region$/, end: /^\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateLevelsDown(foldingModel, true, 1, [4]);
            assertFoldedRanges(foldingModel, [r3], '1');
            setCollapseStateLevelsDown(foldingModel, true, 2, [4]);
            assertFoldedRanges(foldingModel, [r3, r4, r5], '2');
            setCollapseStateLevelsDown(foldingModel, false, 2, [3]);
            assertFoldedRanges(foldingModel, [r4, r5], '3');
            setCollapseStateLevelsDown(foldingModel, false, 2, [2]);
            assertFoldedRanges(foldingModel, [r4, r5], '4');
            setCollapseStateLevelsDown(foldingModel, true, 4, [2]);
            assertFoldedRanges(foldingModel, [r1, r4, r5], '5');
            setCollapseStateLevelsDown(foldingModel, false, 4, [2, 3]);
            assertFoldedRanges(foldingModel, [], '6');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateLevelsUp', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\/\/#region$/, end: /^\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateLevelsUp(foldingModel, true, 1, [4]);
            assertFoldedRanges(foldingModel, [r3], '1');
            setCollapseStateLevelsUp(foldingModel, true, 2, [4]);
            assertFoldedRanges(foldingModel, [r2, r3], '2');
            setCollapseStateLevelsUp(foldingModel, false, 4, [1, 3, 4]);
            assertFoldedRanges(foldingModel, [], '3');
            setCollapseStateLevelsUp(foldingModel, true, 2, [10]);
            assertFoldedRanges(foldingModel, [r3, r5], '4');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateUp', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\/\/#region$/, end: /^\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateUp(foldingModel, true, [5]);
            assertFoldedRanges(foldingModel, [r4], '1');
            setCollapseStateUp(foldingModel, true, [5]);
            assertFoldedRanges(foldingModel, [r3, r4], '2');
            setCollapseStateUp(foldingModel, true, [4]);
            assertFoldedRanges(foldingModel, [r2, r3, r4], '2');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateForMatchingLines', () => {
        const lines = [
            /* 1*/ '/**',
            /* 2*/ ' * the class',
            /* 3*/ ' */',
            /* 4*/ 'class A {',
            /* 5*/ '  /**',
            /* 6*/ '   * the foo',
            /* 7*/ '   */',
            /* 8*/ '  void foo() {',
            /* 9*/ '    /*',
            /* 10*/ '     * the comment',
            /* 11*/ '     */',
            /* 12*/ '  }',
            /* 13*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\/\/#region$/, end: /^\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 3, false);
            const r2 = r(4, 12, false);
            const r3 = r(5, 7, false);
            const r4 = r(8, 11, false);
            const r5 = r(9, 11, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            const regExp = new RegExp('^\\s*' + escapeRegExpCharacters('/*'));
            setCollapseStateForMatchingLines(foldingModel, regExp, true);
            assertFoldedRanges(foldingModel, [r1, r3, r5], '1');
        }
        finally {
            textModel.dispose();
        }
    });
    test('setCollapseStateForRest', () => {
        const lines = [
            /* 1*/ '//#region',
            /* 2*/ '//#endregion',
            /* 3*/ 'class A {',
            /* 4*/ '  void foo() {',
            /* 5*/ '    if (true) {',
            /* 6*/ '        return;',
            /* 7*/ '    }',
            /* 8*/ '',
            /* 9*/ '    if (true) {',
            /* 10*/ '      return;',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, { start: /^\/\/#region$/, end: /^\/\/#endregion$/ });
            foldingModel.update(ranges);
            const r1 = r(1, 2, false);
            const r2 = r(3, 12, false);
            const r3 = r(4, 11, false);
            const r4 = r(5, 6, false);
            const r5 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5]);
            setCollapseStateForRest(foldingModel, true, [5]);
            assertFoldedRanges(foldingModel, [r1, r5], '1');
            setCollapseStateForRest(foldingModel, false, [5]);
            assertFoldedRanges(foldingModel, [], '2');
            setCollapseStateForRest(foldingModel, true, [1]);
            assertFoldedRanges(foldingModel, [r2, r3, r4, r5], '3');
            setCollapseStateForRest(foldingModel, true, [3]);
            assertFoldedRanges(foldingModel, [r1, r2, r3, r4, r5], '3');
        }
        finally {
            textModel.dispose();
        }
    });
    test('folding decoration', () => {
        const lines = [
            /* 1*/ 'class A {',
            /* 2*/ '  void foo() {',
            /* 3*/ '    if (true) {',
            /* 4*/ '      hoo();',
            /* 5*/ '    }',
            /* 6*/ '  }',
            /* 7*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 6, false);
            const r2 = r(2, 5, false);
            const r3 = r(3, 4, false);
            assertRanges(foldingModel, [r1, r2, r3]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'expanded'), d(3, 'expanded')]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(2)]);
            assertRanges(foldingModel, [r1, r(2, 5, true), r3]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'collapsed'), d(3, 'hidden')]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r1, r(2, 5, true), r3]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'collapsed'), d(3, 'hidden')]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(1)]);
            assertRanges(foldingModel, [r(1, 6, true), r(2, 5, true), r3]);
            assertDecorations(foldingModel, [d(1, 'collapsed'), d(2, 'hidden'), d(3, 'hidden')]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r(1, 6, true), r(2, 5, true), r3]);
            assertDecorations(foldingModel, [d(1, 'collapsed'), d(2, 'hidden'), d(3, 'hidden')]);
            foldingModel.toggleCollapseState([foldingModel.getRegionAtLine(1), foldingModel.getRegionAtLine(3)]);
            assertRanges(foldingModel, [r1, r(2, 5, true), r(3, 4, true)]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'collapsed'), d(3, 'hidden')]);
            foldingModel.update(ranges);
            assertRanges(foldingModel, [r1, r(2, 5, true), r(3, 4, true)]);
            assertDecorations(foldingModel, [d(1, 'expanded'), d(2, 'collapsed'), d(3, 'hidden')]);
            textModel.dispose();
        }
        finally {
            textModel.dispose();
        }
    });
    test('fold jumping', () => {
        const lines = [
            /* 1*/ 'class A {',
            /* 2*/ '  void foo() {',
            /* 3*/ '    if (1) {',
            /* 4*/ '      a();',
            /* 5*/ '    } else if (2) {',
            /* 6*/ '      if (true) {',
            /* 7*/ '        b();',
            /* 8*/ '      }',
            /* 9*/ '    } else {',
            /* 10*/ '      c();',
            /* 11*/ '    }',
            /* 12*/ '  }',
            /* 13*/ '}'
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(1, 12, false);
            const r2 = r(2, 11, false);
            const r3 = r(3, 4, false);
            const r4 = r(5, 8, false);
            const r5 = r(6, 7, false);
            const r6 = r(9, 10, false);
            assertRanges(foldingModel, [r1, r2, r3, r4, r5, r6]);
            // Test jump to parent.
            assert.strictEqual(getParentFoldLine(7, foldingModel), 6);
            assert.strictEqual(getParentFoldLine(6, foldingModel), 5);
            assert.strictEqual(getParentFoldLine(5, foldingModel), 2);
            assert.strictEqual(getParentFoldLine(2, foldingModel), 1);
            assert.strictEqual(getParentFoldLine(1, foldingModel), null);
            // Test jump to previous.
            assert.strictEqual(getPreviousFoldLine(10, foldingModel), 9);
            assert.strictEqual(getPreviousFoldLine(9, foldingModel), 5);
            assert.strictEqual(getPreviousFoldLine(5, foldingModel), 3);
            assert.strictEqual(getPreviousFoldLine(3, foldingModel), null);
            // Test when not on a folding region start line.
            assert.strictEqual(getPreviousFoldLine(4, foldingModel), 3);
            assert.strictEqual(getPreviousFoldLine(7, foldingModel), 6);
            assert.strictEqual(getPreviousFoldLine(8, foldingModel), 6);
            // Test jump to next.
            assert.strictEqual(getNextFoldLine(3, foldingModel), 5);
            assert.strictEqual(getNextFoldLine(5, foldingModel), 9);
            assert.strictEqual(getNextFoldLine(9, foldingModel), null);
            // Test when not on a folding region start line.
            assert.strictEqual(getNextFoldLine(4, foldingModel), 5);
            assert.strictEqual(getNextFoldLine(7, foldingModel), 9);
            assert.strictEqual(getNextFoldLine(8, foldingModel), 9);
        }
        finally {
            textModel.dispose();
        }
    });
    test('fold jumping issue #129503', () => {
        const lines = [
            /* 1*/ '',
            /* 2*/ 'if True:',
            /* 3*/ '  print(1)',
            /* 4*/ 'if True:',
            /* 5*/ '  print(1)',
            /* 6*/ ''
        ];
        const textModel = createTextModel(lines.join('\n'));
        try {
            const foldingModel = new FoldingModel(textModel, new TestDecorationProvider(textModel));
            const ranges = computeRanges(textModel, false, undefined);
            foldingModel.update(ranges);
            const r1 = r(2, 3, false);
            const r2 = r(4, 6, false);
            assertRanges(foldingModel, [r1, r2]);
            // Test jump to next.
            assert.strictEqual(getNextFoldLine(1, foldingModel), 2);
            assert.strictEqual(getNextFoldLine(2, foldingModel), 4);
            assert.strictEqual(getNextFoldLine(3, foldingModel), 4);
            assert.strictEqual(getNextFoldLine(4, foldingModel), null);
            assert.strictEqual(getNextFoldLine(5, foldingModel), null);
            assert.strictEqual(getNextFoldLine(6, foldingModel), null);
            // Test jump to previous.
            assert.strictEqual(getPreviousFoldLine(1, foldingModel), null);
            assert.strictEqual(getPreviousFoldLine(2, foldingModel), null);
            assert.strictEqual(getPreviousFoldLine(3, foldingModel), 2);
            assert.strictEqual(getPreviousFoldLine(4, foldingModel), 2);
            assert.strictEqual(getPreviousFoldLine(5, foldingModel), 4);
            assert.strictEqual(getPreviousFoldLine(6, foldingModel), 4);
        }
        finally {
            textModel.dispose();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ01vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9sZGluZy90ZXN0L2Jyb3dzZXIvZm9sZGluZ01vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQUUsZ0NBQWdDLEVBQUUsdUJBQXVCLEVBQUUsMEJBQTBCLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVwUixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBYzNFLE1BQU0sT0FBTyxzQkFBc0I7YUFFVix3QkFBbUIsR0FBRyxzQkFBc0IsQ0FB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QUFJLENBQUM7WUFDSixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBRXhGLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFELFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFNUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFMUIsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV6QyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQztZQUNyRSxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTVCLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVwRCxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQztZQUNyRSxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTVCLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRS9ELFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFNUIsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUxRSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDckIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3JCLENBQUM7SUFFRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ25CLE1BQU0sS0FBSyxHQUFHO1lBQ2QsTUFBTSxDQUFDLEtBQUs7WUFDWixNQUFNLENBQUMsWUFBWTtZQUNuQixNQUFNLENBQUMsS0FBSztZQUNaLE1BQU0sQ0FBQyxXQUFXO1lBQ2xCLE1BQU0sQ0FBQyxnQkFBZ0I7WUFDdkIsTUFBTSxDQUFDLGtCQUFrQjtZQUN6QixNQUFNLENBQUMsS0FBSztZQUNaLE1BQU0sQ0FBQyxHQUFHO1NBQUMsQ0FBQztRQUVaLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDO1lBQ0osTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUV4RixNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxRCxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTVCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRTFCLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUUsRUFBRSxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQztZQUV2RyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTlFLFlBQVksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUVoRSxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNyQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENB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U0FBUyxDQUFDLENBQUMsQ0FBQztZQUV4RixNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQztZQUNwRyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTVCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFCLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRTFCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRWpFLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVqRCxhQUFhLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFD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LEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0IsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFMUIsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFN0MsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlELGFBQWEsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDNUUsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDaEYsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3BGLGFBQWEsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUs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LENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJGLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFNUIsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL0QsaUJBQWlCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJGLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFFLEVBQUUsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUM7WUFFdkcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0QsaUJBQWlCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXZGLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFNUIsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0QsaUJBQWlCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXZGLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNyQixDQUFDO2dCQUFTLENBQUM7WUFDVixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDckIsQ0FBQztJQUVGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsTUFBTSxLQUFLLEdBQUc7WUFDYixNQUFNLENBQUMsV0FBVztZQUNsQixNQUFNLENBQUMsZ0JBQWdCO1lBQ3ZCLE1BQU0sQ0FBQyxjQUFjO1lBQ3JCLE1BQU0sQ0FBQyxZQUFZO1lBQ25CLE1BQU0sQ0FBQyxxQkFBcUI7WUFDNUIsTUFBTSxDQUFDLG1CQUFtQjtZQUMxQixNQUFNLENBQUMsY0FBYztZQUNyQixNQUFNLENBQUMsU0FBUztZQUNoQixNQUFNLENBQUMsY0FBYztZQUNyQixPQUFPLENBQUMsWUFBWTtZQUNwQixPQUFPLENBQUMsT0FBTztZQUNmLE9BQU8sQ0FBQyxLQUFLO1lBQ2IsT0FBTyxDQUFDLEdBQUc7U0FDWCxDQUFDO1FBRUYsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUM7WUFDSixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBRXhGLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFELFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFNUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0IsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0IsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0IsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVyRCx1QkFBdUI7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFD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