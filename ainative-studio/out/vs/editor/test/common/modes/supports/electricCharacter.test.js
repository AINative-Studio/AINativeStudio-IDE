/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { BracketElectricCharacterSupport } from '../../../../common/languages/supports/electricCharacter.js';
import { RichEditBrackets } from '../../../../common/languages/supports/richEditBrackets.js';
import { createFakeScopedLineTokens } from '../../modesTestUtils.js';
const fakeLanguageId = 'test';
suite('Editor Modes - Auto Indentation', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function _testOnElectricCharacter(electricCharacterSupport, line, character, offset) {
        return electricCharacterSupport.onElectricCharacter(character, createFakeScopedLineTokens(line), offset);
    }
    function testDoesNothing(electricCharacterSupport, line, character, offset) {
        const actual = _testOnElectricCharacter(electricCharacterSupport, line, character, offset);
        assert.deepStrictEqual(actual, null);
    }
    function testMatchBracket(electricCharacterSupport, line, character, offset, matchOpenBracket) {
        const actual = _testOnElectricCharacter(electricCharacterSupport, line, character, offset);
        assert.deepStrictEqual(actual, { matchOpenBracket: matchOpenBracket });
    }
    test('getElectricCharacters uses all sources and dedups', () => {
        const sup = new BracketElectricCharacterSupport(new RichEditBrackets(fakeLanguageId, [
            ['{', '}'],
            ['(', ')']
        ]));
        assert.deepStrictEqual(sup.getElectricCharacters(), ['}', ')']);
    });
    test('matchOpenBracket', () => {
        const sup = new BracketElectricCharacterSupport(new RichEditBrackets(fakeLanguageId, [
            ['{', '}'],
            ['(', ')']
        ]));
        testDoesNothing(sup, [{ text: '\t{', type: 0 /* StandardTokenType.Other */ }], '\t', 1);
        testDoesNothing(sup, [{ text: '\t{', type: 0 /* StandardTokenType.Other */ }], '\t', 2);
        testDoesNothing(sup, [{ text: '\t\t', type: 0 /* StandardTokenType.Other */ }], '{', 3);
        testDoesNothing(sup, [{ text: '\t}', type: 0 /* StandardTokenType.Other */ }], '\t', 1);
        testDoesNothing(sup, [{ text: '\t}', type: 0 /* StandardTokenType.Other */ }], '\t', 2);
        testMatchBracket(sup, [{ text: '\t\t', type: 0 /* StandardTokenType.Other */ }], '}', 3, '}');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3RyaWNDaGFyYWN0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvc3VwcG9ydHMvZWxlY3RyaWNDaGFyYWN0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLCtCQUErQixFQUFtQixNQUFNLDREQUE0RCxDQUFDO0FBQzlILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzdGLE9BQU8sRUFBYSwwQkFBMEIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRWhGLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQztBQUU5QixLQUFLLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBRTdDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyx3QkFBd0IsQ0FBQyx3QkFBeUQsRUFBRSxJQUFpQixFQUFFLFNBQWlCLEVBQUUsTUFBYztRQUNoSixPQUFPLHdCQUF3QixDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxRyxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsd0JBQXlELEVBQUUsSUFBaUIsRUFBRSxTQUFpQixFQUFFLE1BQWM7UUFDdkksTUFBTSxNQUFNLEdBQUcsd0JBQXdCLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyx3QkFBeUQsRUFBRSxJQUFpQixFQUFFLFNBQWlCLEVBQUUsTUFBYyxFQUFFLGdCQUF3QjtRQUNsSyxNQUFNLE1BQU0sR0FBRyx3QkFBd0IsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFRCxJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO1FBQzlELE1BQU0sR0FBRyxHQUFHLElBQUksK0JBQStCLENBQzlDLElBQUksZ0JBQWdCLENBQUMsY0FBYyxFQUFFO1lBQ3BDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztZQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztTQUNWLENBQUMsQ0FDRixDQUFDO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLEdBQUcsR0FBRyxJQUFJLCtCQUErQixDQUM5QyxJQUFJLGdCQUFnQixDQUFDLGNBQWMsRUFBRTtZQUNwQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7U0FDVixDQUFDLENBQ0YsQ0FBQztRQUVGLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhGLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxpQ0FBeUIsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLGlDQUF5QixFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==