/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { StandardAutoClosingPairConditional } from '../../../common/languages/languageConfiguration.js';
import { TestLanguageConfigurationService } from './testLanguageConfigurationService.js';
suite('StandardAutoClosingPairConditional', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Missing notIn', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}' });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('Empty notIn', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: [] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('Invalid notIn', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['bla'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('notIn in strings', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['string'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), false);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('notIn in comments', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['comment'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), false);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('notIn in regex', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['regex'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), false);
    });
    test('notIn in strings nor comments', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['string', 'comment'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), false);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), false);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('notIn in strings nor regex', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['string', 'regex'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), false);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), false);
    });
    test('notIn in comments nor regex', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['comment', 'regex'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), false);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), false);
    });
    test('notIn in strings, comments nor regex', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['string', 'comment', 'regex'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), false);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), false);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), false);
    });
    test('language configurations priorities', () => {
        const languageConfigurationService = new TestLanguageConfigurationService();
        const id = 'testLang1';
        const d1 = languageConfigurationService.register(id, { comments: { lineComment: '1' } }, 100);
        const d2 = languageConfigurationService.register(id, { comments: { lineComment: '2' } }, 10);
        assert.strictEqual(languageConfigurationService.getLanguageConfiguration(id).comments?.lineCommentToken, '1');
        d1.dispose();
        d2.dispose();
        languageConfigurationService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VDb25maWd1cmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL2xhbmd1YWdlQ29uZmlndXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV6RixLQUFLLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO0lBRWhELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxrQ0FBa0MsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxpQ0FBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLG1DQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksa0NBQTBCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxpQ0FBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUks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