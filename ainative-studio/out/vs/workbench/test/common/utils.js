/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { LanguagesRegistry } from '../../../editor/common/services/languagesRegistry.js';
/**
 * This function is called before test running and also again at the end of test running
 * and can be used to add assertions. e.g. that registries are empty, etc.
 *
 * !! This is called directly by the testing framework.
 *
 * @skipMangle
 */
export function assertCleanState() {
    // If this test fails, it is a clear indication that
    // your test or suite is leaking services (e.g. via leaking text models)
    // assert.strictEqual(LanguageService.instanceCount, 0, 'No leaking ILanguageService');
    assert.strictEqual(LanguagesRegistry.instanceCount, 0, 'Error: Test run should not leak in LanguagesRegistry.');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvY29tbW9uL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV6Rjs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQjtJQUMvQixvREFBb0Q7SUFDcEQsd0VBQXdFO0lBQ3hFLHVGQUF1RjtJQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsdURBQXVELENBQUMsQ0FBQztBQUNqSCxDQUFDIn0=