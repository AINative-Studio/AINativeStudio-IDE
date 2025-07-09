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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblJlbmRlck9wdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3NlcnZpY2VzL2RlY29yYXRpb25SZW5kZXJPcHRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBd0IsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFOUcsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUN2QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO0lBRWhELE1BQU0sT0FBTyxHQUE2QjtRQUN6QyxjQUFjLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyx3RUFBd0UsQ0FBQztRQUNuRyxjQUFjLEVBQUUsU0FBUztRQUN6QixlQUFlLEVBQUUsS0FBSztRQUN0QixXQUFXLEVBQUUsUUFBUTtLQUNyQixDQUFDO0lBQ0YsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLEtBQUss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