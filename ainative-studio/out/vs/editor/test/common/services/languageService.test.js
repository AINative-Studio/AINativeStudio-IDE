/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../common/languages/modesRegistry.js';
import { LanguageService } from '../../../common/services/languageService.js';
suite('LanguageService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('LanguageSelection does not leak a disposable', () => {
        const languageService = new LanguageService();
        const languageSelection1 = languageService.createById(PLAINTEXT_LANGUAGE_ID);
        assert.strictEqual(languageSelection1.languageId, PLAINTEXT_LANGUAGE_ID);
        const languageSelection2 = languageService.createById(PLAINTEXT_LANGUAGE_ID);
        const listener = languageSelection2.onDidChange(() => { });
        assert.strictEqual(languageSelection2.languageId, PLAINTEXT_LANGUAGE_ID);
        listener.dispose();
        languageService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL2xhbmd1YWdlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUU3Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7UUFDekQsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM5QyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3pFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQixlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7QUFFSixDQUFDLENBQUMsQ0FBQyJ9