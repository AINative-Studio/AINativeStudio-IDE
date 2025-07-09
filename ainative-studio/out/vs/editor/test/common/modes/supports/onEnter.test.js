/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IndentAction } from '../../../../common/languages/languageConfiguration.js';
import { OnEnterSupport } from '../../../../common/languages/supports/onEnter.js';
import { javascriptOnEnterRules } from './onEnterRules.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('OnEnter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('uses brackets', () => {
        const brackets = [
            ['(', ')'],
            ['begin', 'end']
        ];
        const support = new OnEnterSupport({
            brackets: brackets
        });
        const testIndentAction = (beforeText, afterText, expected) => {
            const actual = support.onEnter(3 /* EditorAutoIndentStrategy.Advanced */, '', beforeText, afterText);
            if (expected === IndentAction.None) {
                assert.strictEqual(actual, null);
            }
            else {
                assert.strictEqual(actual.indentAction, expected);
            }
        };
        testIndentAction('a', '', IndentAction.None);
        testIndentAction('', 'b', IndentAction.None);
        testIndentAction('(', 'b', IndentAction.Indent);
        testIndentAction('a', ')', IndentAction.None);
        testIndentAction('begin', 'ending', IndentAction.Indent);
        testIndentAction('abegin', 'end', IndentAction.None);
        testIndentAction('begin', ')', IndentAction.Indent);
        testIndentAction('begin', 'end', IndentAction.IndentOutdent);
        testIndentAction('begin ', ' end', IndentAction.IndentOutdent);
        testIndentAction(' begin', 'end//as', IndentAction.IndentOutdent);
        testIndentAction('(', ')', IndentAction.IndentOutdent);
        testIndentAction('( ', ')', IndentAction.IndentOutdent);
        testIndentAction('a(', ')b', IndentAction.IndentOutdent);
        testIndentAction('(', '', IndentAction.Indent);
        testIndentAction('(', 'foo', IndentAction.Indent);
        testIndentAction('begin', 'foo', IndentAction.Indent);
        testIndentAction('begin', '', IndentAction.Indent);
    });
    test('Issue #121125: onEnterRules with global modifier', () => {
        const support = new OnEnterSupport({
            onEnterRules: [
                {
                    action: {
                        appendText: '/// ',
                        indentAction: IndentAction.Outdent
                    },
                    beforeText: /^\s*\/{3}.*$/gm
                }
            ]
        });
        const testIndentAction = (previousLineText, beforeText, afterText, expectedIndentAction, expectedAppendText, removeText = 0) => {
            const actual = support.onEnter(3 /* EditorAutoIndentStrategy.Advanced */, previousLineText, beforeText, afterText);
            if (expectedIndentAction === null) {
                assert.strictEqual(actual, null, 'isNull:' + beforeText);
            }
            else {
                assert.strictEqual(actual !== null, true, 'isNotNull:' + beforeText);
                assert.strictEqual(actual.indentAction, expectedIndentAction, 'indentAction:' + beforeText);
                if (expectedAppendText !== null) {
                    assert.strictEqual(actual.appendText, expectedAppendText, 'appendText:' + beforeText);
                }
                if (removeText !== 0) {
                    assert.strictEqual(actual.removeText, removeText, 'removeText:' + beforeText);
                }
            }
        };
        testIndentAction('/// line', '/// line', '', IndentAction.Outdent, '/// ');
        testIndentAction('/// line', '/// line', '', IndentAction.Outdent, '/// ');
    });
    test('uses regExpRules', () => {
        const support = new OnEnterSupport({
            onEnterRules: javascriptOnEnterRules
        });
        const testIndentAction = (previousLineText, beforeText, afterText, expectedIndentAction, expectedAppendText, removeText = 0) => {
            const actual = support.onEnter(3 /* EditorAutoIndentStrategy.Advanced */, previousLineText, beforeText, afterText);
            if (expectedIndentAction === null) {
                assert.strictEqual(actual, null, 'isNull:' + beforeText);
            }
            else {
                assert.strictEqual(actual !== null, true, 'isNotNull:' + beforeText);
                assert.strictEqual(actual.indentAction, expectedIndentAction, 'indentAction:' + beforeText);
                if (expectedAppendText !== null) {
                    assert.strictEqual(actual.appendText, expectedAppendText, 'appendText:' + beforeText);
                }
                if (removeText !== 0) {
                    assert.strictEqual(actual.removeText, removeText, 'removeText:' + beforeText);
                }
            }
        };
        testIndentAction('', '\t/**', ' */', IndentAction.IndentOutdent, ' * ');
        testIndentAction('', '\t/**', '', IndentAction.None, ' * ');
        testIndentAction('', '\t/** * / * / * /', '', IndentAction.None, ' * ');
        testIndentAction('', '\t/** /*', '', IndentAction.None, ' * ');
        testIndentAction('', '/**', '', IndentAction.None, ' * ');
        testIndentAction('', '\t/**/', '', null, null);
        testIndentAction('', '\t/***/', '', null, null);
        testIndentAction('', '\t/*******/', '', null, null);
        testIndentAction('', '\t/** * * * * */', '', null, null);
        testIndentAction('', '\t/** */', '', null, null);
        testIndentAction('', '\t/** asdfg */', '', null, null);
        testIndentAction('', '\t/* asdfg */', '', null, null);
        testIndentAction('', '\t/* asdfg */', '', null, null);
        testIndentAction('', '\t/** asdfg */', '', null, null);
        testIndentAction('', '*/', '', null, null);
        testIndentAction('', '\t/*', '', null, null);
        testIndentAction('', '\t*', '', null, null);
        testIndentAction('\t/**', '\t *', '', IndentAction.None, '* ');
        testIndentAction('\t * something', '\t *', '', IndentAction.None, '* ');
        testIndentAction('\t *', '\t *', '', IndentAction.None, '* ');
        testIndentAction('', '\t */', '', IndentAction.None, null, 1);
        testIndentAction('', '\t * */', '', IndentAction.None, null, 1);
        testIndentAction('', '\t * * / * / * / */', '', null, null);
        testIndentAction('\t/**', '\t * ', '', IndentAction.None, '* ');
        testIndentAction('\t * something', '\t * ', '', IndentAction.None, '* ');
        testIndentAction('\t *', '\t * ', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * ', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * ', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * asdfsfagadfg', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * asdfsfagadfg * * * ', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * asdfsfagadfg * * * ', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * asdfsfagadfg * * * ', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * /*', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * /*', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * /*', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * asdfsfagadfg * / * / * /', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * asdfsfagadfg * / * / * /', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * asdfsfagadfg * / * / * /', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * asdfsfagadfg * / * / * /*', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * asdfsfagadfg * / * / * /*', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * asdfsfagadfg * / * / * /*', '', IndentAction.None, '* ');
        testIndentAction('', ' */', '', IndentAction.None, null, 1);
        testIndentAction(' */', ' * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('', '\t */', '', IndentAction.None, null, 1);
        testIndentAction('', '\t\t */', '', IndentAction.None, null, 1);
        testIndentAction('', '   */', '', IndentAction.None, null, 1);
        testIndentAction('', '     */', '', IndentAction.None, null, 1);
        testIndentAction('', '\t     */', '', IndentAction.None, null, 1);
        testIndentAction('', ' *--------------------------------------------------------------------------------------------*/', '', IndentAction.None, null, 1);
        // issue #43469
        testIndentAction('class A {', '    * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('', '    * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('    ', '    * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('class A {', '  * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('', '  * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('  ', '  * test() {', '', IndentAction.Indent, null, 0);
    });
    test('issue #141816', () => {
        const support = new OnEnterSupport({
            onEnterRules: javascriptOnEnterRules
        });
        const testIndentAction = (beforeText, afterText, expected) => {
            const actual = support.onEnter(3 /* EditorAutoIndentStrategy.Advanced */, '', beforeText, afterText);
            if (expected === IndentAction.None) {
                assert.strictEqual(actual, null);
            }
            else {
                assert.strictEqual(actual.indentAction, expected);
            }
        };
        testIndentAction('const r = /{/;', '', IndentAction.None);
        testIndentAction('const r = /{[0-9]/;', '', IndentAction.None);
        testIndentAction('const r = /[a-zA-Z]{/;', '', IndentAction.None);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25FbnRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9zdXBwb3J0cy9vbkVudGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBaUIsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRTNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBRXJCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxRQUFRLEdBQW9CO1lBQ2pDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztZQUNWLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQztTQUNoQixDQUFDO1FBQ0YsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFjLENBQUM7WUFDbEMsUUFBUSxFQUFFLFFBQVE7U0FDbEIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFVBQWtCLEVBQUUsU0FBaUIsRUFBRSxRQUFzQixFQUFFLEVBQUU7WUFDMUYsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sNENBQW9DLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDN0YsSUFBSSxRQUFRLEtBQUssWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwQyxNQUFNLENBQUMsV0FB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Q0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0QsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMxRCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hELGdCQUFnQixDQUFDLEVBQUUsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwRCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkQsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RELGdCQUFnQixDQUFDLEVBQUUsRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0RCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0MsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFB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