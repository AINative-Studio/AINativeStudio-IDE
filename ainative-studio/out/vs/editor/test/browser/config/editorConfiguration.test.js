/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { migrateOptions } from '../../../browser/config/migrateOptions.js';
import { EditorZoom } from '../../../common/config/editorZoom.js';
import { TestConfiguration } from './testConfiguration.js';
suite('Common Editor Config', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Zoom Level', () => {
        //Zoom levels are defined to go between -5, 20 inclusive
        const zoom = EditorZoom;
        zoom.setZoomLevel(0);
        assert.strictEqual(zoom.getZoomLevel(), 0);
        zoom.setZoomLevel(-0);
        assert.strictEqual(zoom.getZoomLevel(), 0);
        zoom.setZoomLevel(5);
        assert.strictEqual(zoom.getZoomLevel(), 5);
        zoom.setZoomLevel(-1);
        assert.strictEqual(zoom.getZoomLevel(), -1);
        zoom.setZoomLevel(9);
        assert.strictEqual(zoom.getZoomLevel(), 9);
        zoom.setZoomLevel(-9);
        assert.strictEqual(zoom.getZoomLevel(), -5);
        zoom.setZoomLevel(20);
        assert.strictEqual(zoom.getZoomLevel(), 20);
        zoom.setZoomLevel(-10);
        assert.strictEqual(zoom.getZoomLevel(), -5);
        zoom.setZoomLevel(9.1);
        assert.strictEqual(zoom.getZoomLevel(), 9.1);
        zoom.setZoomLevel(-9.1);
        assert.strictEqual(zoom.getZoomLevel(), -5);
        zoom.setZoomLevel(Infinity);
        assert.strictEqual(zoom.getZoomLevel(), 20);
        zoom.setZoomLevel(Number.NEGATIVE_INFINITY);
        assert.strictEqual(zoom.getZoomLevel(), -5);
    });
    class TestWrappingConfiguration extends TestConfiguration {
        _readEnvConfiguration() {
            return {
                extraEditorClassName: '',
                outerWidth: 1000,
                outerHeight: 100,
                emptySelectionClipboard: true,
                pixelRatio: 1,
                accessibilitySupport: 0 /* AccessibilitySupport.Unknown */
            };
        }
    }
    function assertWrapping(config, isViewportWrapping, wrappingColumn) {
        const options = config.options;
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        assert.strictEqual(wrappingInfo.isViewportWrapping, isViewportWrapping);
        assert.strictEqual(wrappingInfo.wrappingColumn, wrappingColumn);
    }
    test('wordWrap default', () => {
        const config = new TestWrappingConfiguration({});
        assertWrapping(config, false, -1);
        config.dispose();
    });
    test('wordWrap compat false', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: false
        });
        assertWrapping(config, false, -1);
        config.dispose();
    });
    test('wordWrap compat true', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: true
        });
        assertWrapping(config, true, 80);
        config.dispose();
    });
    test('wordWrap on', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'on'
        });
        assertWrapping(config, true, 80);
        config.dispose();
    });
    test('wordWrap on without minimap', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'on',
            minimap: {
                enabled: false
            }
        });
        assertWrapping(config, true, 88);
        config.dispose();
    });
    test('wordWrap on does not use wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'on',
            wordWrapColumn: 10
        });
        assertWrapping(config, true, 80);
        config.dispose();
    });
    test('wordWrap off', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'off'
        });
        assertWrapping(config, false, -1);
        config.dispose();
    });
    test('wordWrap off does not use wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'off',
            wordWrapColumn: 10
        });
        assertWrapping(config, false, -1);
        config.dispose();
    });
    test('wordWrap wordWrapColumn uses default wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'wordWrapColumn'
        });
        assertWrapping(config, false, 80);
        config.dispose();
    });
    test('wordWrap wordWrapColumn uses wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 100
        });
        assertWrapping(config, false, 100);
        config.dispose();
    });
    test('wordWrap wordWrapColumn validates wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: -1
        });
        assertWrapping(config, false, 1);
        config.dispose();
    });
    test('wordWrap bounded uses default wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'bounded'
        });
        assertWrapping(config, true, 80);
        config.dispose();
    });
    test('wordWrap bounded uses wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'bounded',
            wordWrapColumn: 40
        });
        assertWrapping(config, true, 40);
        config.dispose();
    });
    test('wordWrap bounded validates wordWrapColumn', () => {
        const config = new TestWrappingConfiguration({
            wordWrap: 'bounded',
            wordWrapColumn: -1
        });
        assertWrapping(config, true, 1);
        config.dispose();
    });
    test('issue #53152: Cannot assign to read only property \'enabled\' of object', () => {
        const hoverOptions = {};
        Object.defineProperty(hoverOptions, 'enabled', {
            writable: false,
            value: true
        });
        const config = new TestConfiguration({ hover: hoverOptions });
        assert.strictEqual(config.options.get(62 /* EditorOption.hover */).enabled, true);
        config.updateOptions({ hover: { enabled: false } });
        assert.strictEqual(config.options.get(62 /* EditorOption.hover */).enabled, false);
        config.dispose();
    });
    test('does not emit event when nothing changes', () => {
        const config = new TestConfiguration({ glyphMargin: true, roundedSelection: false });
        let event = null;
        const disposable = config.onDidChange(e => event = e);
        assert.strictEqual(config.options.get(59 /* EditorOption.glyphMargin */), true);
        config.updateOptions({ glyphMargin: true });
        config.updateOptions({ roundedSelection: false });
        assert.strictEqual(event, null);
        config.dispose();
        disposable.dispose();
    });
    test('issue #94931: Unable to open source file', () => {
        const config = new TestConfiguration({ quickSuggestions: null });
        const actual = config.options.get(94 /* EditorOption.quickSuggestions */);
        assert.deepStrictEqual(actual, {
            other: 'on',
            comments: 'off',
            strings: 'off'
        });
        config.dispose();
    });
    test('issue #102920: Can\'t snap or split view with JSON files', () => {
        const config = new TestConfiguration({ quickSuggestions: null });
        config.updateOptions({ quickSuggestions: { strings: true } });
        const actual = config.options.get(94 /* EditorOption.quickSuggestions */);
        assert.deepStrictEqual(actual, {
            other: 'on',
            comments: 'off',
            strings: 'on'
        });
        config.dispose();
    });
    test('issue #151926: Untyped editor options apply', () => {
        const config = new TestConfiguration({});
        config.updateOptions({ unicodeHighlight: { allowedCharacters: { 'x': true } } });
        const actual = config.options.get(130 /* EditorOption.unicodeHighlighting */);
        assert.deepStrictEqual(actual, {
            nonBasicASCII: "inUntrustedWorkspace",
            invisibleCharacters: true,
            ambiguousCharacters: true,
            includeComments: "inUntrustedWorkspace",
            includeStrings: "inUntrustedWorkspace",
            allowedCharacters: { "x": true },
            allowedLocales: { "_os": true, "_vscode": true }
        });
        config.dispose();
    });
});
suite('migrateOptions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function migrate(options) {
        migrateOptions(options);
        return options;
    }
    test('wordWrap', () => {
        assert.deepStrictEqual(migrate({ wordWrap: true }), { wordWrap: 'on' });
        assert.deepStrictEqual(migrate({ wordWrap: false }), { wordWrap: 'off' });
    });
    test('lineNumbers', () => {
        assert.deepStrictEqual(migrate({ lineNumbers: true }), { lineNumbers: 'on' });
        assert.deepStrictEqual(migrate({ lineNumbers: false }), { lineNumbers: 'off' });
    });
    test('autoClosingBrackets', () => {
        assert.deepStrictEqual(migrate({ autoClosingBrackets: false }), { autoClosingBrackets: 'never', autoClosingQuotes: 'never', autoSurround: 'never' });
    });
    test('cursorBlinking', () => {
        assert.deepStrictEqual(migrate({ cursorBlinking: 'visible' }), { cursorBlinking: 'solid' });
    });
    test('renderWhitespace', () => {
        assert.deepStrictEqual(migrate({ renderWhitespace: true }), { renderWhitespace: 'boundary' });
        assert.deepStrictEqual(migrate({ renderWhitespace: false }), { renderWhitespace: 'none' });
    });
    test('renderLineHighlight', () => {
        assert.deepStrictEqual(migrate({ renderLineHighlight: true }), { renderLineHighlight: 'line' });
        assert.deepStrictEqual(migrate({ renderLineHighlight: false }), { renderLineHighlight: 'none' });
    });
    test('acceptSuggestionOnEnter', () => {
        assert.deepStrictEqual(migrate({ acceptSuggestionOnEnter: true }), { acceptSuggestionOnEnter: 'on' });
        assert.deepStrictEqual(migrate({ acceptSuggestionOnEnter: false }), { acceptSuggestionOnEnter: 'off' });
    });
    test('tabCompletion', () => {
        assert.deepStrictEqual(migrate({ tabCompletion: true }), { tabCompletion: 'onlySnippets' });
        assert.deepStrictEqual(migrate({ tabCompletion: false }), { tabCompletion: 'off' });
    });
    test('suggest.filteredTypes', () => {
        assert.deepStrictEqual(migrate({
            suggest: {
                filteredTypes: {
                    method: false,
                    function: false,
                    constructor: false,
                    deprecated: false,
                    field: false,
                    variable: false,
                    class: false,
                    struct: false,
                    interface: false,
                    module: false,
                    property: false,
                    event: false,
                    operator: false,
                    unit: false,
                    value: false,
                    constant: false,
                    enum: false,
                    enumMember: false,
                    keyword: false,
                    text: false,
                    color: false,
                    file: false,
                    reference: false,
                    folder: false,
                    typeParameter: false,
                    snippet: false,
                }
            }
        }), {
            suggest: {
                filteredTypes: undefined,
                showMethods: false,
                showFunctions: false,
                showConstructors: false,
                showDeprecated: false,
                showFields: false,
                showVariables: false,
                showClasses: false,
                showStructs: false,
                showInterfaces: false,
                showModules: false,
                showProperties: false,
                showEvents: false,
                showOperators: false,
                showUnits: false,
                showValues: false,
                showConstants: false,
                showEnums: false,
                showEnumMembers: false,
                showKeywords: false,
                showWords: false,
                showColors: false,
                showFiles: false,
                showReferences: false,
                showFolders: false,
                showTypeParameters: false,
                showSnippets: false,
            }
        });
    });
    test('quickSuggestions', () => {
        assert.deepStrictEqual(migrate({ quickSuggestions: true }), { quickSuggestions: { comments: 'on', strings: 'on', other: 'on' } });
        assert.deepStrictEqual(migrate({ quickSuggestions: false }), { quickSuggestions: { comments: 'off', strings: 'off', other: 'off' } });
        assert.deepStrictEqual(migrate({ quickSuggestions: { comments: 'on', strings: 'off' } }), { quickSuggestions: { comments: 'on', strings: 'off' } });
    });
    test('hover', () => {
        assert.deepStrictEqual(migrate({ hover: true }), { hover: { enabled: true } });
        assert.deepStrictEqual(migrate({ hover: false }), { hover: { enabled: false } });
    });
    test('parameterHints', () => {
        assert.deepStrictEqual(migrate({ parameterHints: true }), { parameterHints: { enabled: true } });
        assert.deepStrictEqual(migrate({ parameterHints: false }), { parameterHints: { enabled: false } });
    });
    test('autoIndent', () => {
        assert.deepStrictEqual(migrate({ autoIndent: true }), { autoIndent: 'full' });
        assert.deepStrictEqual(migrate({ autoIndent: false }), { autoIndent: 'advanced' });
    });
    test('matchBrackets', () => {
        assert.deepStrictEqual(migrate({ matchBrackets: true }), { matchBrackets: 'always' });
        assert.deepStrictEqual(migrate({ matchBrackets: false }), { matchBrackets: 'never' });
    });
    test('renderIndentGuides, highlightActiveIndentGuide', () => {
        assert.deepStrictEqual(migrate({ renderIndentGuides: true }), { renderIndentGuides: undefined, guides: { indentation: true } });
        assert.deepStrictEqual(migrate({ renderIndentGuides: false }), { renderIndentGuides: undefined, guides: { indentation: false } });
        assert.deepStrictEqual(migrate({ highlightActiveIndentGuide: true }), { highlightActiveIndentGuide: undefined, guides: { highlightActiveIndentation: true } });
        assert.deepStrictEqual(migrate({ highlightActiveIndentGuide: false }), { highlightActiveIndentGuide: undefined, guides: { highlightActiveIndentation: false } });
    });
    test('migration does not overwrite new setting', () => {
        assert.deepStrictEqual(migrate({ renderIndentGuides: true, guides: { indentation: false } }), { renderIndentGuides: undefined, guides: { indentation: false } });
        assert.deepStrictEqual(migrate({ highlightActiveIndentGuide: true, guides: { highlightActiveIndentation: false } }), { highlightActiveIndentGuide: undefined, guides: { highlightActiveIndentation: false } });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29uZmlnL2VkaXRvckNvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUczRCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBRWxDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFFdkIsd0RBQXdEO1FBQ3hELE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQztRQUV4QixJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU1QyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1QyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRTdDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFBRSxD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LEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsSSxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RJLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNySixDQUFDLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2xGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUs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