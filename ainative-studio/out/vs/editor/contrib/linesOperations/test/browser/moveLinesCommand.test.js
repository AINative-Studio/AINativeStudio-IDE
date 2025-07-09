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
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { LanguageService } from '../../../../common/services/languageService.js';
import { MoveLinesCommand } from '../../browser/moveLinesCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
var MoveLinesDirection;
(function (MoveLinesDirection) {
    MoveLinesDirection[MoveLinesDirection["Up"] = 0] = "Up";
    MoveLinesDirection[MoveLinesDirection["Down"] = 1] = "Down";
})(MoveLinesDirection || (MoveLinesDirection = {}));
function testMoveLinesDownCommand(lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    testMoveLinesUpOrDownCommand(1 /* MoveLinesDirection.Down */, lines, selection, expectedLines, expectedSelection, languageConfigurationService);
}
function testMoveLinesUpCommand(lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    testMoveLinesUpOrDownCommand(0 /* MoveLinesDirection.Up */, lines, selection, expectedLines, expectedSelection, languageConfigurationService);
}
function testMoveLinesDownWithIndentCommand(languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    testMoveLinesUpOrDownWithIndentCommand(1 /* MoveLinesDirection.Down */, languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService);
}
function testMoveLinesUpWithIndentCommand(languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    testMoveLinesUpOrDownWithIndentCommand(0 /* MoveLinesDirection.Up */, languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService);
}
function testMoveLinesUpOrDownCommand(direction, lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    const disposables = new DisposableStore();
    if (!languageConfigurationService) {
        languageConfigurationService = disposables.add(new TestLanguageConfigurationService());
    }
    testCommand(lines, null, selection, (accessor, sel) => new MoveLinesCommand(sel, direction === 0 /* MoveLinesDirection.Up */ ? false : true, 3 /* EditorAutoIndentStrategy.Advanced */, languageConfigurationService), expectedLines, expectedSelection);
    disposables.dispose();
}
function testMoveLinesUpOrDownWithIndentCommand(direction, languageId, lines, selection, expectedLines, expectedSelection, languageConfigurationService) {
    const disposables = new DisposableStore();
    if (!languageConfigurationService) {
        languageConfigurationService = disposables.add(new TestLanguageConfigurationService());
    }
    testCommand(lines, languageId, selection, (accessor, sel) => new MoveLinesCommand(sel, direction === 0 /* MoveLinesDirection.Up */ ? false : true, 4 /* EditorAutoIndentStrategy.Full */, languageConfigurationService), expectedLines, expectedSelection);
    disposables.dispose();
}
suite('Editor Contrib - Move Lines Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('move first up / last down disabled', function () {
        testMoveLinesUpCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 1), [
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 1));
        testMoveLinesDownCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(5, 1, 5, 1), [
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(5, 1, 5, 1));
    });
    test('move first line down', function () {
        testMoveLinesDownCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 4, 1, 1), [
            'second line',
            'first',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 2, 1));
    });
    test('move 2nd line up', function () {
        testMoveLinesUpCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 1, 2, 1), [
            'second line',
            'first',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 1));
    });
    test('issue #1322a: move 2nd line up', function () {
        testMoveLinesUpCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 12, 2, 12), [
            'second line',
            'first',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 12, 1, 12));
    });
    test('issue #1322b: move last line up', function () {
        testMoveLinesUpCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(5, 6, 5, 6), [
            'first',
            'second line',
            'third line',
            'fifth',
            'fourth line'
        ], new Selection(4, 6, 4, 6));
    });
    test('issue #1322c: move last line selected up', function () {
        testMoveLinesUpCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(5, 6, 5, 1), [
            'first',
            'second line',
            'third line',
            'fifth',
            'fourth line'
        ], new Selection(4, 6, 4, 1));
    });
    test('move last line up', function () {
        testMoveLinesUpCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(5, 1, 5, 1), [
            'first',
            'second line',
            'third line',
            'fifth',
            'fourth line'
        ], new Selection(4, 1, 4, 1));
    });
    test('move 4th line down', function () {
        testMoveLinesDownCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(4, 1, 4, 1), [
            'first',
            'second line',
            'third line',
            'fifth',
            'fourth line'
        ], new Selection(5, 1, 5, 1));
    });
    test('move multiple lines down', function () {
        testMoveLinesDownCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(4, 4, 2, 2), [
            'first',
            'fifth',
            'second line',
            'third line',
            'fourth line'
        ], new Selection(5, 4, 3, 2));
    });
    test('invisible selection is ignored', function () {
        testMoveLinesDownCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 1, 1, 1), [
            'second line',
            'first',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(3, 1, 2, 1));
    });
});
let IndentRulesMode = class IndentRulesMode extends Disposable {
    constructor(indentationRules, languageService, languageConfigurationService) {
        super();
        this.languageId = 'moveLinesIndentMode';
        this._register(languageService.registerLanguage({ id: this.languageId }));
        this._register(languageConfigurationService.register(this.languageId, {
            indentationRules: indentationRules
        }));
    }
};
IndentRulesMode = __decorate([
    __param(1, ILanguageService),
    __param(2, ILanguageConfigurationService)
], IndentRulesMode);
suite('Editor contrib - Move Lines Command honors Indentation Rules', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const indentRules = {
        decreaseIndentPattern: /^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(case\b.*|default):\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
        increaseIndentPattern: /(\{[^}"'`]*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(case\b.*|default):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
        indentNextLinePattern: /^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$)/,
        unIndentedLinePattern: /^(?!.*([;{}]|\S:)\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!.*(\{[^}"']*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(case\b.*|default):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(case\b.*|default):\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$))/
    };
    // https://github.com/microsoft/vscode/issues/28552#issuecomment-307862797
    test('first line indentation adjust to 0', () => {
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        const mode = new IndentRulesMode(indentRules, languageService, languageConfigurationService);
        testMoveLinesUpWithIndentCommand(mode.languageId, [
            'class X {',
            '\tz = 2',
            '}'
        ], new Selection(2, 1, 2, 1), [
            'z = 2',
            'class X {',
            '}'
        ], new Selection(1, 1, 1, 1), languageConfigurationService);
        mode.dispose();
        languageService.dispose();
        languageConfigurationService.dispose();
    });
    // https://github.com/microsoft/vscode/issues/28552#issuecomment-307867717
    test('move lines across block', () => {
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        const mode = new IndentRulesMode(indentRules, languageService, languageConfigurationService);
        testMoveLinesDownWithIndentCommand(mode.languageId, [
            'const value = 2;',
            'const standardLanguageDescriptions = [',
            '    {',
            '        diagnosticSource: \'js\',',
            '    }',
            '];'
        ], new Selection(1, 1, 1, 1), [
            'const standardLanguageDescriptions = [',
            '    const value = 2;',
            '    {',
            '        diagnosticSource: \'js\',',
            '    }',
            '];'
        ], new Selection(2, 5, 2, 5), languageConfigurationService);
        mode.dispose();
        languageService.dispose();
        languageConfigurationService.dispose();
    });
    test('move line should still work as before if there is no indentation rules', () => {
        testMoveLinesUpWithIndentCommand(null, [
            'if (true) {',
            '    var task = new Task(() => {',
            '        var work = 1234;',
            '    });',
            '}'
        ], new Selection(3, 1, 3, 1), [
            'if (true) {',
            '        var work = 1234;',
            '    var task = new Task(() => {',
            '    });',
            '}'
        ], new Selection(2, 1, 2, 1));
    });
});
let EnterRulesMode = class EnterRulesMode extends Disposable {
    constructor(languageService, languageConfigurationService) {
        super();
        this.languageId = 'moveLinesEnterMode';
        this._register(languageService.registerLanguage({ id: this.languageId }));
        this._register(languageConfigurationService.register(this.languageId, {
            indentationRules: {
                decreaseIndentPattern: /^\s*\[$/,
                increaseIndentPattern: /^\s*\]$/,
            },
            brackets: [
                ['{', '}']
            ]
        }));
    }
};
EnterRulesMode = __decorate([
    __param(0, ILanguageService),
    __param(1, ILanguageConfigurationService)
], EnterRulesMode);
suite('Editor - contrib - Move Lines Command honors onEnter Rules', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #54829. move block across block', () => {
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        const mode = new EnterRulesMode(languageService, languageConfigurationService);
        testMoveLinesDownWithIndentCommand(mode.languageId, [
            'if (true) {',
            '    if (false) {',
            '        if (1) {',
            '            console.log(\'b\');',
            '        }',
            '        console.log(\'a\');',
            '    }',
            '}'
        ], new Selection(3, 9, 5, 10), [
            'if (true) {',
            '    if (false) {',
            '        console.log(\'a\');',
            '        if (1) {',
            '            console.log(\'b\');',
            '        }',
            '    }',
            '}'
        ], new Selection(4, 9, 6, 10), languageConfigurationService);
        mode.dispose();
        languageService.dispose();
        languageConfigurationService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUxpbmVzQ29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xpbmVzT3BlcmF0aW9ucy90ZXN0L2Jyb3dzZXIvbW92ZUxpbmVzQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFFckgsSUFBVyxrQkFHVjtBQUhELFdBQVcsa0JBQWtCO0lBQzVCLHVEQUFFLENBQUE7SUFDRiwyREFBSSxDQUFBO0FBQ0wsQ0FBQyxFQUhVLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHNUI7QUFFRCxTQUFTLHdCQUF3QixDQUFDLEtBQWUsRUFBRSxTQUFvQixFQUFFLGFBQXVCLEVBQUUsaUJBQTRCLEVBQUUsNEJBQTREO0lBQzNMLDRCQUE0QixrQ0FBMEIsS0FBSyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsaUJB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