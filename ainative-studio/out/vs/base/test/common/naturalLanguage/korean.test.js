/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// allow-any-unicode-file
import { strictEqual } from 'assert';
import { getKoreanAltChars } from '../../../common/naturalLanguage/korean.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../utils.js';
function getKoreanAltCharsForString(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const chars = getKoreanAltChars(text.charCodeAt(i));
        if (chars) {
            result += String.fromCharCode(...Array.from(chars));
        }
        else {
            result += text.charAt(i);
        }
    }
    return result;
}
suite('Korean', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getKoreanAltChars', () => {
        test('Modern initial consonants', () => {
            const cases = new Map([
                ['ᄀ', 'r'],
                ['ᄁ', 'R'],
                ['ᄂ', 's'],
                ['ᄃ', 'e'],
                ['ᄄ', 'E'],
                ['ᄅ', 'f'],
                ['ᄆ', 'a'],
                ['ᄇ', 'q'],
                ['ᄈ', 'Q'],
                ['ᄉ', 't'],
                ['ᄊ', 'T'],
                ['ᄋ', 'd'],
                ['ᄌ', 'w'],
                ['ᄍ', 'W'],
                ['ᄎ', 'c'],
                ['ᄏ', 'z'],
                ['ᄐ', 'x'],
                ['ᄑ', 'v'],
                ['ᄒ', 'g'],
            ]);
            for (const [hangul, alt] of cases.entries()) {
                strictEqual(getKoreanAltCharsForString(hangul), alt, `"${hangul}" should result in "${alt}"`);
            }
        });
        test('Modern latter consonants', () => {
            const cases = new Map([
                ['ᆨ', 'r'],
                ['ᆩ', 'R'],
                ['ᆪ', 'rt'],
                ['ᆫ', 's'],
                ['ᆬ', 'sw'],
                ['ᆭ', 'sg'],
                ['ᆮ', 'e'],
                ['ᆯ', 'f'],
                ['ᆰ', 'fr'],
                ['ᆱ', 'fa'],
                ['ᆲ', 'fq'],
                ['ᆳ', 'ft'],
                ['ᆴ', 'fx'],
                ['ᆵ', 'fv'],
                ['ᆶ', 'fg'],
                ['ᆷ', 'a'],
                ['ᆸ', 'q'],
                ['ᆹ', 'qt'],
                ['ᆺ', 't'],
                ['ᆻ', 'T'],
                ['ᆼ', 'd'],
                ['ᆽ', 'w'],
                ['ᆾ', 'c'],
                ['ᆿ', 'z'],
                ['ᇀ', 'x'],
                ['ᇁ', 'v'],
                ['ᇂ', 'g'],
            ]);
            for (const [hangul, alt] of cases.entries()) {
                strictEqual(getKoreanAltCharsForString(hangul), alt, `"${hangul}" (0x${hangul.charCodeAt(0).toString(16)}) should result in "${alt}"`);
            }
        });
        test('Modern vowels', () => {
            const cases = new Map([
                ['ᅡ', 'k'],
                ['ᅢ', 'o'],
                ['ᅣ', 'i'],
                ['ᅤ', 'O'],
                ['ᅥ', 'j'],
                ['ᅦ', 'p'],
                ['ᅧ', 'u'],
                ['ᅨ', 'P'],
                ['ᅩ', 'h'],
                ['ᅪ', 'hk'],
                ['ᅫ', 'ho'],
                ['ᅬ', 'hl'],
                ['ᅭ', 'y'],
                ['ᅮ', 'n'],
                ['ᅯ', 'nj'],
                ['ᅰ', 'np'],
                ['ᅱ', 'nl'],
                ['ᅲ', 'b'],
                ['ᅳ', 'm'],
                ['ᅴ', 'ml'],
                ['ᅵ', 'l'],
            ]);
            for (const [hangul, alt] of cases.entries()) {
                strictEqual(getKoreanAltCharsForString(hangul), alt, `"${hangul}" (0x${hangul.charCodeAt(0).toString(16)}) should result in "${alt}"`);
            }
        });
        test('Compatibility Jamo', () => {
            const cases = new Map([
                ['ㄱ', 'r'],
                ['ㄲ', 'R'],
                ['ㄳ', 'rt'],
                ['ㄴ', 's'],
                ['ㄵ', 'sw'],
                ['ㄶ', 'sg'],
                ['ㄷ', 'e'],
                ['ㄸ', 'E'],
                ['ㄹ', 'f'],
                ['ㄺ', 'fr'],
                ['ㄻ', 'fa'],
                ['ㄼ', 'fq'],
                ['ㄽ', 'ft'],
                ['ㄾ', 'fx'],
                ['ㄿ', 'fv'],
                ['ㅀ', 'fg'],
                ['ㅁ', 'a'],
                ['ㅂ', 'q'],
                ['ㅃ', 'Q'],
                ['ㅄ', 'qt'],
                ['ㅅ', 't'],
                ['ㅆ', 'T'],
                ['ㅇ', 'd'],
                ['ㅈ', 'w'],
                ['ㅉ', 'W'],
                ['ㅊ', 'c'],
                ['ㅋ', 'z'],
                ['ㅌ', 'x'],
                ['ㅍ', 'v'],
                ['ㅎ', 'g'],
                ['ㅏ', 'k'],
                ['ㅐ', 'o'],
                ['ㅑ', 'i'],
                ['ㅒ', 'O'],
                ['ㅓ', 'j'],
                ['ㅔ', 'p'],
                ['ㅕ', 'u'],
                ['ㅖ', 'P'],
                ['ㅗ', 'h'],
                ['ㅘ', 'hk'],
                ['ㅙ', 'ho'],
                ['ㅚ', 'hl'],
                ['ㅛ', 'y'],
                ['ㅜ', 'n'],
                ['ㅝ', 'nj'],
                ['ㅞ', 'np'],
                ['ㅟ', 'nl'],
                ['ㅠ', 'b'],
                ['ㅡ', 'm'],
                ['ㅢ', 'ml'],
                ['ㅣ', 'l'],
                // HF: Hangul Filler (everything after this is archaic)
            ]);
            for (const [hangul, alt] of cases.entries()) {
                strictEqual(getKoreanAltCharsForString(hangul), alt, `"${hangul}" (0x${hangul.charCodeAt(0).toString(16)}) should result in "${alt}"`);
            }
        });
        // There are too many characters to test exhaustively, so select some
        // real world use cases from this code base (workbench contrib names)
        test('Composed samples', () => {
            const cases = new Map([
                ['ㅁㅊㅊㄷㄴ냐ㅠㅑㅣㅑ쇼', 'accessibility'],
                ['ㅁㅊ채ㅕㅜㅅ뚜샤시드둣ㄴ', 'accountEntitlements'],
                ['며야ㅐ쳗ㄴ', 'audioCues'],
                ['ㅠㄱㅁ찯셰먁채ㅣㅐ걐ㄷㄱ2ㅆ디듣ㅅ교', 'bracketPairColorizer2Telemetry'],
                ['ㅠㅕㅣㅏㄸ얏', 'bulkEdit'],
                ['ㅊ미ㅣㅗㅑㄷㄱㅁㄱ초ㅛ', 'callHierarchy'],
                ['촘ㅅ', 'chat'],
                ['챙ㄷㅁㅊ샤ㅐㅜㄴ', 'codeActions'],
                ['챙ㄷㄸ야색', 'codeEditor'],
                ['채ㅡㅡ뭉ㄴ', 'commands'],
                ['채ㅡㅡ둣ㄴ', 'comments'],
                ['채ㅜ럏ㄸ테ㅐㄳㄷㄱ', 'configExporter'],
                ['채ㅜㅅㄷㅌ스두ㅕ', 'contextmenu'],
                ['쳔새ㅡㄸ야색', 'customEditor'],
                ['ㅇ듀ㅕㅎ', 'debug'],
                ['ㅇ덱ㄷㅊㅁㅅㄷㅇㄸㅌㅅ두냐ㅐㅜㅡㅑㅎㄱㅁ색', 'deprecatedExtensionMigrator'],
                ['ㄷ얏ㄴㄷㄴ냐ㅐㅜㄴ', 'editSessions'],
                ['드ㅡㄷㅅ', 'emmet'],
                ['ㄷㅌㅅ두냐ㅐㅜㄴ', 'extensions'],
                ['ㄷㅌㅅㄷ구밌ㄷ그ㅑㅜ미', 'externalTerminal'],
                ['ㄷㅌㅅㄷ구미ㅕ갸ㅒㅔ둗ㄱ', 'externalUriOpener'],
                ['랴ㅣㄷㄴ', 'files'],
                ['래ㅣ야ㅜㅎ', 'folding'],
                ['래금ㅅ', 'format'],
                ['ㅑㅟ묘ㅗㅑㅜㅅㄴ', 'inlayHints'],
                ['ㅑㅟㅑㅜㄷ촘ㅅ', 'inlineChat'],
                ['ㅑㅜㅅㄷㄱㅁㅊ샾ㄷ', 'interactive'],
                ['ㅑㄴ녇', 'issue'],
                ['ㅏ됴ㅠㅑㅜ야ㅜㅎㄴ', 'keybindings'],
                ['ㅣ무혐ㅎㄷㅇㄷㅅㄷㅊ샤ㅐㅜ', 'languageDetection'],
                ['ㅣ무혐ㅎㄷㄴㅅㅁ션', 'languageStatus'],
                ['ㅣㅑㅡㅑ샤ㅜ얓ㅁ색', 'limitIndicator'],
                ['ㅣㅑㄴㅅ', 'list'],
                ['ㅣㅐㅊ미ㅗㅑㄴ새교', 'localHistory'],
                ['ㅣㅐㅊ미ㅑㅋㅁ샤ㅐㅜ', 'localization'],
                ['ㅣㅐㅎㄴ', 'logs'],
                ['ㅡ메ㅔㄷㅇㄸ얏ㄴ', 'mappedEdits'],
                ['ㅡㅁ가애주', 'markdown'],
                ['ㅡㅁ갇ㄱㄴ', 'markers'],
                ['ㅡㄷㄱㅎㄷㄸ야색', 'mergeEditor'],
                ['ㅡㅕㅣ샤얄ㄹㄸ야색', 'multiDiffEditor'],
                ['ㅜㅐㅅ듀ㅐㅐㅏ', 'notebook'],
                ['ㅐㅕ시ㅑㅜㄷ', 'outline'],
                ['ㅐㅕ세ㅕㅅ', 'output'],
                ['ㅔㄷㄱ래그뭋ㄷ', 'performance'],
                ['ㅔㄱㄷㄹㄷㄱ둧ㄷㄴ', 'preferences'],
                ['벼ㅑ참ㅊㅊㄷㄴㄴ', 'quickaccess'],
                ['ㄱ디며ㅜ촏ㄱ', 'relauncher'],
                ['ㄱ드ㅐㅅㄷ', 'remote'],
                ['ㄱ드ㅐㅅㄷ쎠ㅜㅜ디', 'remoteTunnel'],
                ['ㄴㅁ노', 'sash'],
                ['ㄴ츠', 'scm'],
                ['ㄴㄷㅁㄱ초', 'search'],
                ['ㄴㄷㅁㄱ초ㄸ야색', 'searchEditor'],
                ['놈ㄱㄷ', 'share'],
                ['누ㅑㅔㅔㄷㅅㄴ', 'snippets'],
                ['넫ㄷ초', 'speech'],
                ['네ㅣㅁ노', 'splash'],
                ['녁ㅍ됸', 'surveys'],
                ['ㅅㅁㅎㄴ', 'tags'],
                ['ㅅㅁ난', 'tasks'],
                ['ㅅ디듣ㅅ교', 'telemetry'],
                ['ㅅㄷ그ㅑㅜ미', 'terminal'],
                ['ㅅㄷ그ㅑㅜ미채ㅜㅅ갸ㅠ', 'terminalContrib'],
                ['ㅅㄷㄴ샤ㅜㅎ', 'testing'],
                ['소듣ㄴ', 'themes'],
                ['샤ㅡ디ㅑㅜㄷ', 'timeline'],
                ['쇼ㅔ도ㅑㄷㄱㅁㄱ초ㅛ', 'typeHierarchy'],
                ['ㅕㅔㅇㅁㅅㄷ', 'update'],
                ['ㅕ기', 'url'],
                ['ㅕㄴㄷㄱㅇㅁㅅ몌개랴ㅣㄷ', 'userDataProfile'],
                ['ㅕㄴㄷㄱㅇㅁㅅㅁ뇨ㅜㅊ', 'userDataSync'],
                ['ㅈ듀퍋ㅈ', 'webview'],
                ['ㅈ듀퍋졔무디', 'webviewPanel'],
                ['ㅈ듀퍋ㅈ퍋ㅈ', 'webviewView'],
                ['ㅈ디채ㅡ듀무ㅜㄷㄱ', 'welcomeBanner'],
                ['ㅈ디채ㅡㄷ야미ㅐㅎ', 'welcomeDialog'],
                ['ㅈ디채ㅡㄷㅎㄷㅅ샤ㅜㅎㄴㅅㅁㄳㄷㅇ', 'welcomeGettingStarted'],
                ['ㅈ디채ㅡㄷ퍋ㅈㄴ', 'welcomeViews'],
                ['ㅈ디채ㅡㄷㅉ미ㅏ소개ㅕ호', 'welcomeWalkthrough'],
                ['재가넴ㅊㄷ', 'workspace'],
                ['재가넴ㅊㄷㄴ', 'workspaces'],
            ]);
            for (const [hangul, alt] of cases.entries()) {
                // Compare with lower case as some cases do not have
                // corresponding hangul inputs
                strictEqual(getKoreanAltCharsForString(hangul).toLowerCase(), alt.toLowerCase(), `"${hangul}" (0x${hangul.charCodeAt(0).toString(16)}) should result in "${alt}"`);
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia29yZWFuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9uYXR1cmFsTGFuZ3VhZ2Uva29yZWFuLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcseUJBQXlCO0FBRXpCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXRFLFNBQVMsMEJBQTBCLENBQUMsSUFBWTtJQUMvQyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFDaEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN0QyxNQUFNLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUNwQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtZQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQztnQkFDckIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2FBQ1YsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUM3QyxXQUFXLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksTUFBTSx1QkFBdUIsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUMvRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDO2dCQUNyQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQzthQUNWLENBQUMs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WCxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNWLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDVixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7Z0JBQ1gsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2dCQUNYLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztnQkFDWCxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ1YsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNW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