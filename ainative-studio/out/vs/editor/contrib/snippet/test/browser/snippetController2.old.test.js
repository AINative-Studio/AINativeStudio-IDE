var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { SnippetController2 } from '../../browser/snippetController2.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
let TestSnippetController = class TestSnippetController extends SnippetController2 {
    constructor(editor, _contextKeyService) {
        const testLanguageConfigurationService = new TestLanguageConfigurationService();
        super(editor, new NullLogService(), new LanguageFeaturesService(), _contextKeyService, testLanguageConfigurationService);
        this._contextKeyService = _contextKeyService;
        this._testLanguageConfigurationService = testLanguageConfigurationService;
    }
    dispose() {
        super.dispose();
        this._testLanguageConfigurationService.dispose();
    }
    isInSnippetMode() {
        return SnippetController2.InSnippetMode.getValue(this._contextKeyService);
    }
};
TestSnippetController = __decorate([
    __param(1, IContextKeyService)
], TestSnippetController);
suite('SnippetController', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function snippetTest(cb, lines) {
        if (!lines) {
            lines = [
                'function test() {',
                '\tvar x = 3;',
                '\tvar arr = [];',
                '\t',
                '}'
            ];
        }
        const serviceCollection = new ServiceCollection([ILabelService, new class extends mock() {
            }], [IWorkspaceContextService, new class extends mock() {
            }]);
        withTestCodeEditor(lines, { serviceCollection }, (editor) => {
            editor.getModel().updateOptions({
                insertSpaces: false
            });
            const snippetController = editor.registerAndInstantiateContribution(TestSnippetController.ID, TestSnippetController);
            const template = [
                'for (var ${1:index}; $1 < ${2:array}.length; $1++) {',
                '\tvar element = $2[$1];',
                '\t$0',
                '}'
            ].join('\n');
            cb(editor, template, snippetController);
            snippetController.dispose();
        });
    }
    test('Simple accepted', () => {
        snippetTest((editor, template, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(template);
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var index; index < array.length; index++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = array[index];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            editor.trigger('test', 'type', { text: 'i' });
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var i; i < array.length; i++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = array[i];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            snippetController.next();
            editor.trigger('test', 'type', { text: 'arr' });
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var i; i < arr.length; i++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = arr[i];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            snippetController.prev();
            editor.trigger('test', 'type', { text: 'j' });
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var j; j < arr.length; j++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = arr[j];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            snippetController.next();
            snippetController.next();
            assert.deepStrictEqual(editor.getPosition(), new Position(6, 3));
        });
    });
    test('Simple canceled', () => {
        snippetTest((editor, template, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(template);
            assert.strictEqual(editor.getModel().getLineContent(4), '\tfor (var index; index < array.length; index++) {');
            assert.strictEqual(editor.getModel().getLineContent(5), '\t\tvar element = array[index];');
            assert.strictEqual(editor.getModel().getLineContent(6), '\t\t');
            assert.strictEqual(editor.getModel().getLineContent(7), '\t}');
            snippetController.cancel();
            assert.deepStrictEqual(editor.getPosition(), new Position(4, 16));
        });
    });
    // test('Stops when deleting lines above', () => {
    // 	snippetTest((editor, codeSnippet, snippetController) => {
    // 		editor.setPosition({ lineNumber: 4, column: 2 });
    // 		snippetController.insert(codeSnippet, 0, 0);
    // 		editor.getModel()!.applyEdits([{
    // 			forceMoveMarkers: false,
    // 			identifier: null,
    // 			isAutoWhitespaceEdit: false,
    // 			range: new Range(1, 1, 3, 1),
    // 			text: null
    // 		}]);
    // 		assert.strictEqual(snippetController.isInSnippetMode(), false);
    // 	});
    // });
    // test('Stops when deleting lines below', () => {
    // 	snippetTest((editor, codeSnippet, snippetController) => {
    // 		editor.setPosition({ lineNumber: 4, column: 2 });
    // 		snippetController.run(codeSnippet, 0, 0);
    // 		editor.getModel()!.applyEdits([{
    // 			forceMoveMarkers: false,
    // 			identifier: null,
    // 			isAutoWhitespaceEdit: false,
    // 			range: new Range(8, 1, 8, 100),
    // 			text: null
    // 		}]);
    // 		assert.strictEqual(snippetController.isInSnippetMode(), false);
    // 	});
    // });
    // test('Stops when inserting lines above', () => {
    // 	snippetTest((editor, codeSnippet, snippetController) => {
    // 		editor.setPosition({ lineNumber: 4, column: 2 });
    // 		snippetController.run(codeSnippet, 0, 0);
    // 		editor.getModel()!.applyEdits([{
    // 			forceMoveMarkers: false,
    // 			identifier: null,
    // 			isAutoWhitespaceEdit: false,
    // 			range: new Range(1, 100, 1, 100),
    // 			text: '\nHello'
    // 		}]);
    // 		assert.strictEqual(snippetController.isInSnippetMode(), false);
    // 	});
    // });
    // test('Stops when inserting lines below', () => {
    // 	snippetTest((editor, codeSnippet, snippetController) => {
    // 		editor.setPosition({ lineNumber: 4, column: 2 });
    // 		snippetController.run(codeSnippet, 0, 0);
    // 		editor.getModel()!.applyEdits([{
    // 			forceMoveMarkers: false,
    // 			identifier: null,
    // 			isAutoWhitespaceEdit: false,
    // 			range: new Range(8, 100, 8, 100),
    // 			text: '\nHello'
    // 		}]);
    // 		assert.strictEqual(snippetController.isInSnippetMode(), false);
    // 	});
    // });
    test('Stops when calling model.setValue()', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            editor.getModel().setValue('goodbye');
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Stops when undoing', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            editor.getModel().undo();
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Stops when moving cursor outside', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            editor.setPosition({ lineNumber: 1, column: 1 });
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Stops when disconnecting editor model', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            editor.setModel(null);
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Stops when disposing editor', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setPosition({ lineNumber: 4, column: 2 });
            snippetController.insert(codeSnippet);
            snippetController.dispose();
            assert.strictEqual(snippetController.isInSnippetMode(), false);
        });
    });
    test('Final tabstop with multiple selections', () => {
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([
                new Selection(1, 1, 1, 1),
                new Selection(2, 1, 2, 1),
            ]);
            codeSnippet = 'foo$0';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 2, startColumn: 4, endLineNumber: 2, endColumn: 4 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([
                new Selection(1, 1, 1, 1),
                new Selection(2, 1, 2, 1),
            ]);
            codeSnippet = 'foo$0bar';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 2, startColumn: 4, endLineNumber: 2, endColumn: 4 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([
                new Selection(1, 1, 1, 1),
                new Selection(1, 5, 1, 5),
            ]);
            codeSnippet = 'foo$0bar';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 1, startColumn: 14, endLineNumber: 1, endColumn: 14 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([
                new Selection(1, 1, 1, 1),
                new Selection(1, 5, 1, 5),
            ]);
            codeSnippet = 'foo\n$0\nbar';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 4, startColumn: 1, endLineNumber: 4, endColumn: 1 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([
                new Selection(1, 1, 1, 1),
                new Selection(1, 5, 1, 5),
            ]);
            codeSnippet = 'foo\n$0\nbar';
            snippetController.insert(codeSnippet);
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 4, startColumn: 1, endLineNumber: 4, endColumn: 1 }), second.toString());
        });
        snippetTest((editor, codeSnippet, snippetController) => {
            editor.setSelections([
                new Selection(2, 7, 2, 7),
            ]);
            codeSnippet = 'xo$0r';
            snippetController.insert(codeSnippet, { overwriteBefore: 1 });
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor.getSelection().equalsRange({ startLineNumber: 2, startColumn: 8, endColumn: 8, endLineNumber: 2 }));
        });
    });
    test('Final tabstop, #11742 simple', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelection(new Selection(1, 19, 1, 19));
            codeSnippet = '{{% url_**$1** %}}';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor.getSelection().equalsRange({ startLineNumber: 1, startColumn: 27, endLineNumber: 1, endColumn: 27 }));
            assert.strictEqual(editor.getModel().getValue(), 'example example {{% url_**** %}}');
        }, ['example example sc']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelection(new Selection(1, 3, 1, 3));
            codeSnippet = [
                'afterEach((done) => {',
                '\t${1}test',
                '});'
            ].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor.getSelection().equalsRange({ startLineNumber: 2, startColumn: 2, endLineNumber: 2, endColumn: 2 }), editor.getSelection().toString());
            assert.strictEqual(editor.getModel().getValue(), 'afterEach((done) => {\n\ttest\n});');
        }, ['af']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelection(new Selection(1, 3, 1, 3));
            codeSnippet = [
                'afterEach((done) => {',
                '${1}\ttest',
                '});'
            ].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor.getSelection().equalsRange({ startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 1 }), editor.getSelection().toString());
            assert.strictEqual(editor.getModel().getValue(), 'afterEach((done) => {\n\ttest\n});');
        }, ['af']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelection(new Selection(1, 9, 1, 9));
            codeSnippet = [
                'aft${1}er'
            ].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 8 });
            assert.strictEqual(editor.getModel().getValue(), 'after');
            assert.strictEqual(editor.getSelections().length, 1);
            assert.ok(editor.getSelection().equalsRange({ startLineNumber: 1, startColumn: 4, endLineNumber: 1, endColumn: 4 }), editor.getSelection().toString());
        }, ['afterone']);
    });
    test('Final tabstop, #11742 different indents', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(2, 4, 2, 4),
                new Selection(1, 3, 1, 3)
            ]);
            codeSnippet = [
                'afterEach((done) => {',
                '\t${0}test',
                '});'
            ].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 2);
            const [first, second] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 5, startColumn: 3, endLineNumber: 5, endColumn: 3 }), first.toString());
            assert.ok(second.equalsRange({ startLineNumber: 2, startColumn: 2, endLineNumber: 2, endColumn: 2 }), second.toString());
        }, ['af', '\taf']);
    });
    test('Final tabstop, #11890 stay at the beginning', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 5, 1, 5)
            ]);
            codeSnippet = [
                'afterEach((done) => {',
                '${1}\ttest',
                '});'
            ].join('\n');
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getSelections().length, 1);
            const [first] = editor.getSelections();
            assert.ok(first.equalsRange({ startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 3 }), first.toString());
        }, ['  af']);
    });
    test('Final tabstop, no tabstop', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 3, 1, 3)
            ]);
            codeSnippet = 'afterEach';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.ok(editor.getSelection().equalsRange({ startLineNumber: 1, startColumn: 10, endLineNumber: 1, endColumn: 10 }));
        }, ['af', '\taf']);
    });
    test('Multiple cursor and overwriteBefore/After, issue #11060', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 7, 1, 7),
                new Selection(2, 4, 2, 4)
            ]);
            codeSnippet = '_foo';
            controller.insert(codeSnippet, { overwriteBefore: 1 });
            assert.strictEqual(editor.getModel().getValue(), 'this._foo\nabc_foo');
        }, ['this._', 'abc']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 7, 1, 7),
                new Selection(2, 4, 2, 4)
            ]);
            codeSnippet = 'XX';
            controller.insert(codeSnippet, { overwriteBefore: 1 });
            assert.strictEqual(editor.getModel().getValue(), 'this.XX\nabcXX');
        }, ['this._', 'abc']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 7, 1, 7),
                new Selection(2, 4, 2, 4),
                new Selection(3, 5, 3, 5)
            ]);
            codeSnippet = '_foo';
            controller.insert(codeSnippet, { overwriteBefore: 1 });
            assert.strictEqual(editor.getModel().getValue(), 'this._foo\nabc_foo\ndef_foo');
        }, ['this._', 'abc', 'def_']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 7, 1, 7), // primary at `this._`
                new Selection(2, 4, 2, 4),
                new Selection(3, 6, 3, 6)
            ]);
            codeSnippet = '._foo';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getModel().getValue(), 'this._foo\nabc._foo\ndef._foo');
        }, ['this._', 'abc', 'def._']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(3, 6, 3, 6), // primary at `def._`
                new Selection(1, 7, 1, 7),
                new Selection(2, 4, 2, 4),
            ]);
            codeSnippet = '._foo';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getModel().getValue(), 'this._foo\nabc._foo\ndef._foo');
        }, ['this._', 'abc', 'def._']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(2, 4, 2, 4), // primary at `abc`
                new Selection(3, 6, 3, 6),
                new Selection(1, 7, 1, 7),
            ]);
            codeSnippet = '._foo';
            controller.insert(codeSnippet, { overwriteBefore: 2 });
            assert.strictEqual(editor.getModel().getValue(), 'this._._foo\na._foo\ndef._._foo');
        }, ['this._', 'abc', 'def._']);
    });
    test('Multiple cursor and overwriteBefore/After, #16277', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 5, 1, 5),
                new Selection(2, 5, 2, 5),
            ]);
            codeSnippet = 'document';
            controller.insert(codeSnippet, { overwriteBefore: 3 });
            assert.strictEqual(editor.getModel().getValue(), '{document}\n{document && true}');
        }, ['{foo}', '{foo && true}']);
    });
    test('Insert snippet twice, #19449', () => {
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 1, 1, 1)
            ]);
            codeSnippet = 'for (var ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }';
            controller.insert(codeSnippet);
            assert.strictEqual(editor.getModel().getValue(), 'for (var i=0; i<len; i++) {  }for (var i=0; i<len; i++) {  }');
        }, ['for (var i=0; i<len; i++) {  }']);
        snippetTest((editor, codeSnippet, controller) => {
            editor.setSelections([
                new Selection(1, 1, 1, 1)
            ]);
            codeSnippet = 'for (let ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }';
            controller.insert(codeSnippet);
            assert.strictEqual(editor.getModel().getValue(), 'for (let i=0; i<len; i++) {  }for (var i=0; i<len; i++) {  }');
        }, ['for (var i=0; i<len; i++) {  }']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbnRyb2xsZXIyLm9sZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NuaXBwZXQvdGVzdC9icm93c2VyL3NuaXBwZXRDb250cm9sbGVyMi5vbGQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDakcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFtQixrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3JILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxx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