/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestCodeEditorService } from '../editorTestServices.js';
import { TestColorTheme, TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
suite('Decoration Render Options', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const themeServiceMock = new TestThemeService();
    const options = {
        gutterIconPath: URI.parse('https://github.com/microsoft/vscode/blob/main/resources/linux/code.png'),
        gutterIconSize: 'contain',
        backgroundColor: 'red',
        borderColor: 'yellow'
    };
    test('register and resolve decoration type', () => {
        const s = store.add(new TestCodeEditorService(themeServiceMock));
        store.add(s.registerDecorationType('test', 'example', options));
        assert.notStrictEqual(s.resolveDecorationOptions('example', false), undefined);
    });
    test('remove decoration type', () => {
        const s = store.add(new TestCodeEditorService(themeServiceMock));
        s.registerDecorationType('test', 'example', options);
        assert.notStrictEqual(s.resolveDecorationOptions('example', false), undefined);
        s.removeDecorationType('example');
        assert.throws(() => s.resolveDecorationOptions('example', false));
    });
    function readStyleSheet(styleSheet) {
        return styleSheet.read();
    }
    test('css properties', () => {
        const s = store.add(new TestCodeEditorService(themeServiceMock));
        const styleSheet = s.globalStyleSheet;
        store.add(s.registerDecorationType('test', 'example', options));
        const sheet = readStyleSheet(styleSheet);
        assert(sheet.indexOf(`{background:url('${CSS.escape('https://github.com/microsoft/vscode/blob/main/resources/linux/code.png')}') center center no-repeat;background-size:contain;}`) >= 0);
        assert(sheet.indexOf(`{background-color:red;border-color:yellow;box-sizing: border-box;}`) >= 0);
    });
    test('theme color', () => {
        const options = {
            backgroundColor: { id: 'editorBackground' },
            borderColor: { id: 'editorBorder' },
        };
        const themeService = new TestThemeService(new TestColorTheme({
            editorBackground: '#FF0000'
        }));
        const s = store.add(new TestCodeEditorService(themeService));
        const styleSheet = s.globalStyleSheet;
        s.registerDecorationType('test', 'example', options);
        assert.strictEqual(readStyleSheet(styleSheet), '.monaco-editor .ced-example-0 {background-color:#ff0000;border-color:transparent;box-sizing: border-box;}');
        themeService.setTheme(new TestColorTheme({
            editorBackground: '#EE0000',
            editorBorder: '#00FFFF'
        }));
        assert.strictEqual(readStyleSheet(styleSheet), '.monaco-editor .ced-example-0 {background-color:#ee0000;border-color:#00ffff;box-sizing: border-box;}');
        s.removeDecorationType('example');
        assert.strictEqual(readStyleSheet(styleSheet), '');
    });
    test('theme overrides', () => {
        const options = {
            color: { id: 'editorBackground' },
            light: {
                color: '#FF00FF'
            },
            dark: {
                color: '#000000',
                after: {
                    color: { id: 'infoForeground' }
                }
            }
        };
        const themeService = new TestThemeService(new TestColorTheme({
            editorBackground: '#FF0000',
            infoForeground: '#444444'
        }));
        const s = store.add(new TestCodeEditorService(themeService));
        const styleSheet = s.globalStyleSheet;
        s.registerDecorationType('test', 'example', options);
        const expected = [
            '.vs-dark.monaco-editor .ced-example-4::after, .hc-black.monaco-editor .ced-example-4::after {color:#444444 !important;}',
            '.vs-dark.monaco-editor .ced-example-1, .hc-black.monaco-editor .ced-example-1 {color:#000000 !important;}',
            '.vs.monaco-editor .ced-example-1, .hc-light.monaco-editor .ced-example-1 {color:#FF00FF !important;}',
            '.monaco-editor .ced-example-1 {color:#ff0000 !important;}'
        ].join('\n');
        assert.strictEqual(readStyleSheet(styleSheet), expected);
        s.removeDecorationType('example');
        assert.strictEqual(readStyleSheet(styleSheet), '');
    });
    test('css properties, gutterIconPaths', () => {
        const s = store.add(new TestCodeEditorService(themeServiceMock));
        const styleSheet = s.globalStyleSheet;
        // URI, only minimal encoding
        s.registerDecorationType('test', 'example', { gutterIconPath: URI.parse('data:image/svg+xml;base64,PHN2ZyB4b+') });
        assert(readStyleSheet(styleSheet).indexOf(`{background:url('${CSS.escape('data:image/svg+xml;base64,PHN2ZyB4b+')}') center center no-repeat;}`) > 0);
        s.removeDecorationType('example');
        function assertBackground(url1, url2) {
            const actual = readStyleSheet(styleSheet);
            assert(actual.indexOf(`{background:url('${url1}') center center no-repeat;}`) > 0
                || actual.indexOf(`{background:url('${url2}') center center no-repeat;}`) > 0);
        }
        if (platform.isWindows) {
            // windows file path (used as string)
            s.registerDecorationType('test', 'example', { gutterIconPath: URI.file('c:\\files\\miles\\more.png') });
            assertBackground(CSS.escape('file:///c:/files/miles/more.png'), CSS.escape('vscode-file://vscode-app/c:/files/miles/more.png'));
            s.removeDecorationType('example');
            // single quote must always be escaped/encoded
            s.registerDecorationType('test', 'example', { gutterIconPath: URI.file('c:\\files\\foo\\b\'ar.png') });
            assertBackground(CSS.escape('file:///c:/files/foo/b\'ar.png'), CSS.escape('vscode-file://vscode-app/c:/files/foo/b\'ar.png'));
            s.removeDecorationType('example');
        }
        else {
            // unix file path (used as string)
            s.registerDecorationType('test', 'example', { gutterIconPath: URI.file('/Users/foo/bar.png') });
            assertBackground(CSS.escape('file:///Users/foo/bar.png'), CSS.escape('vscode-file://vscode-app/Users/foo/bar.png'));
            s.removeDecorationType('example');
            // single quote must always be escaped/encoded
            s.registerDecorationType('test', 'example', { gutterIconPath: URI.file('/Users/foo/b\'ar.png') });
            assertBackground(CSS.escape('file:///Users/foo/b\'ar.png'), CSS.escape('vscode-file://vscode-app/Users/foo/b\'ar.png'));
            s.removeDecorationType('example');
        }
        s.registerDecorationType('test', 'example', { gutterIconPath: URI.parse('http://test/pa\'th') });
        assert(readStyleSheet(styleSheet).indexOf(`{background:url('${CSS.escape('http://test/pa\'th')}') center center no-repeat;}`) > 0);
        s.removeDecorationType('example');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblJlbmRlck9wdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9zZXJ2aWNlcy9kZWNvcmF0aW9uUmVuZGVyT3B0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQXdCLE1BQU0sMEJBQTBCLENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTlHLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFDdkMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxNQUFNLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztJQUVoRCxNQUFNLE9BQU8sR0FBNkI7UUFDekMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0VBQXdFLENBQUM7UUFDbkcsY0FBYyxFQUFFLFNBQVM7UUFDekIsZUFBZSxFQUFFLEtBQUs7UUFDdEIsV0FBVyxFQUFFLFFBQVE7S0FDckIsQ0FBQztJQUNGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDakQsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUNqRSxL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