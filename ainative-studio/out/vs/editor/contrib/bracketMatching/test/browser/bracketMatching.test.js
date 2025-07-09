/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { BracketMatchingController } from '../../browser/bracketMatching.js';
import { createCodeEditorServices, instantiateTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { instantiateTextModel } from '../../../../test/common/testTextModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('bracket matching', () => {
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createCodeEditorServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        languageService = instantiationService.get(ILanguageService);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createTextModelWithBrackets(text) {
        const languageId = 'bracketMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ]
        }));
        return disposables.add(instantiateTextModel(instantiationService, text, languageId));
    }
    function createCodeEditorWithBrackets(text) {
        return disposables.add(instantiateTestCodeEditor(instantiationService, createTextModelWithBrackets(text)));
    }
    test('issue #183: jump to matching bracket position', () => {
        const editor = createCodeEditorWithBrackets('var x = (3 + (5-7)) + ((5+3)+5);');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        // start on closing bracket
        editor.setPosition(new Position(1, 20));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 9));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 19));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 9));
        // start on opening bracket
        editor.setPosition(new Position(1, 23));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 31));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 23));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 31));
    });
    test('Jump to next bracket', () => {
        const editor = createCodeEditorWithBrackets('var x = (3 + (5-7)); y();');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        // start position between brackets
        editor.setPosition(new Position(1, 16));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 18));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 14));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 18));
        // skip brackets in comments
        editor.setPosition(new Position(1, 21));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 23));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 24));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 23));
        // do not break if no brackets are available
        editor.setPosition(new Position(1, 26));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 26));
    });
    test('Select to next bracket', () => {
        const editor = createCodeEditorWithBrackets('var x = (3 + (5-7)); y();');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        // start position in open brackets
        editor.setPosition(new Position(1, 9));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 20));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 9, 1, 20));
        // start position in close brackets (should select backwards)
        editor.setPosition(new Position(1, 20));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 9));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 20, 1, 9));
        // start position between brackets
        editor.setPosition(new Position(1, 16));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 19));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 14, 1, 19));
        // start position outside brackets
        editor.setPosition(new Position(1, 21));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 25));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 23, 1, 25));
        // do not break if no brackets are available
        editor.setPosition(new Position(1, 26));
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getPosition(), new Position(1, 26));
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 26, 1, 26));
    });
    test('issue #1772: jump to enclosing brackets', () => {
        const text = [
            'const x = {',
            '    something: [0, 1, 2],',
            '    another: true,',
            '    somethingmore: [0, 2, 4]',
            '};',
        ].join('\n');
        const editor = createCodeEditorWithBrackets(text);
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        editor.setPosition(new Position(3, 5));
        bracketMatchingController.jumpToBracket();
        assert.deepStrictEqual(editor.getSelection(), new Selection(5, 1, 5, 1));
    });
    test('issue #43371: argument to not select brackets', () => {
        const text = [
            'const x = {',
            '    something: [0, 1, 2],',
            '    another: true,',
            '    somethingmore: [0, 2, 4]',
            '};',
        ].join('\n');
        const editor = createCodeEditorWithBrackets(text);
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        editor.setPosition(new Position(3, 5));
        bracketMatchingController.selectToBracket(false);
        assert.deepStrictEqual(editor.getSelection(), new Selection(1, 12, 5, 1));
    });
    test('issue #45369: Select to Bracket with multicursor', () => {
        const editor = createCodeEditorWithBrackets('{  }   {   }   { }');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        // cursors inside brackets become selections of the entire bracket contents
        editor.setSelections([
            new Selection(1, 3, 1, 3),
            new Selection(1, 10, 1, 10),
            new Selection(1, 17, 1, 17)
        ]);
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getSelections(), [
            new Selection(1, 1, 1, 5),
            new Selection(1, 8, 1, 13),
            new Selection(1, 16, 1, 19)
        ]);
        // cursors to the left of bracket pairs become selections of the entire pair
        editor.setSelections([
            new Selection(1, 1, 1, 1),
            new Selection(1, 6, 1, 6),
            new Selection(1, 14, 1, 14)
        ]);
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getSelections(), [
            new Selection(1, 1, 1, 5),
            new Selection(1, 8, 1, 13),
            new Selection(1, 16, 1, 19)
        ]);
        // cursors just right of a bracket pair become selections of the entire pair
        editor.setSelections([
            new Selection(1, 5, 1, 5),
            new Selection(1, 13, 1, 13),
            new Selection(1, 19, 1, 19)
        ]);
        bracketMatchingController.selectToBracket(true);
        assert.deepStrictEqual(editor.getSelections(), [
            new Selection(1, 5, 1, 1),
            new Selection(1, 13, 1, 8),
            new Selection(1, 19, 1, 16)
        ]);
    });
    test('Removes brackets', () => {
        const editor = createCodeEditorWithBrackets('var x = (3 + (5-7)); y();');
        const bracketMatchingController = disposables.add(editor.registerAndInstantiateContribution(BracketMatchingController.ID, BracketMatchingController));
        function removeBrackets() {
            bracketMatchingController.removeBrackets();
        }
        // position before the bracket
        editor.setPosition(new Position(1, 9));
        removeBrackets();
        assert.deepStrictEqual(editor.getModel().getValue(), 'var x = 3 + (5-7); y();');
        editor.getModel().setValue('var x = (3 + (5-7)); y();');
        // position between brackets
        editor.setPosition(new Position(1, 16));
        removeBrackets();
        assert.deepStrictEqual(editor.getModel().getValue(), 'var x = (3 + 5-7); y();');
        removeBrackets();
        assert.deepStrictEqual(editor.getModel().getValue(), 'var x = 3 + 5-7; y();');
        removeBrackets();
        assert.deepStrictEqual(editor.getModel().getValue(), 'var x = 3 + 5-7; y();');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldE1hdGNoaW5nLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvYnJhY2tldE1hdGNoaW5nL3Rlc3QvYnJvd3Nlci9icmFja2V0TWF0Y2hpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5QixJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLDRCQUEyRCxDQUFDO0lBQ2hFLElBQUksZUFBaUMsQ0FBQztJQUV0QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsb0JBQW9CLEdBQUcsd0JB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Q0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkMseUJBQXlCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFMUUsNkRBQTZEO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMseUJBQXlCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFMUUsa0NBQWtDO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMseUJBQXlCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLElB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