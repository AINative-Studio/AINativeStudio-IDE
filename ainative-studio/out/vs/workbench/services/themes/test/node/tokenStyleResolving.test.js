/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ColorThemeData } from '../../common/colorThemeData.js';
import assert from 'assert';
import { TokenStyle, getTokenClassificationRegistry } from '../../../../../platform/theme/common/tokenClassificationRegistry.js';
import { Color } from '../../../../../base/common/color.js';
import { isString } from '../../../../../base/common/types.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
import { FileAccess, Schemas } from '../../../../../base/common/network.js';
import { ExtensionResourceLoaderService } from '../../../../../platform/extensionResourceLoader/common/extensionResourceLoaderService.js';
import { mock, TestProductService } from '../../../../test/common/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ExtensionGalleryManifestService } from '../../../../../platform/extensionManagement/common/extensionGalleryManifestService.js';
const undefinedStyle = { bold: undefined, underline: undefined, italic: undefined };
const unsetStyle = { bold: false, underline: false, italic: false };
function ts(foreground, styleFlags) {
    const foregroundColor = isString(foreground) ? Color.fromHex(foreground) : undefined;
    return new TokenStyle(foregroundColor, styleFlags?.bold, styleFlags?.underline, styleFlags?.strikethrough, styleFlags?.italic);
}
function tokenStyleAsString(ts) {
    if (!ts) {
        return 'tokenstyle-undefined';
    }
    let str = ts.foreground ? ts.foreground.toString() : 'no-foreground';
    if (ts.bold !== undefined) {
        str += ts.bold ? '+B' : '-B';
    }
    if (ts.underline !== undefined) {
        str += ts.underline ? '+U' : '-U';
    }
    if (ts.italic !== undefined) {
        str += ts.italic ? '+I' : '-I';
    }
    return str;
}
function assertTokenStyle(actual, expected, message) {
    assert.strictEqual(tokenStyleAsString(actual), tokenStyleAsString(expected), message);
}
function assertTokenStyleMetaData(colorIndex, actual, expected, message = '') {
    if (expected === undefined || expected === null || actual === undefined) {
        assert.strictEqual(actual, expected, message);
        return;
    }
    assert.strictEqual(actual.bold, expected.bold, 'bold ' + message);
    assert.strictEqual(actual.italic, expected.italic, 'italic ' + message);
    assert.strictEqual(actual.underline, expected.underline, 'underline ' + message);
    const actualForegroundIndex = actual.foreground;
    if (actualForegroundIndex && expected.foreground) {
        assert.strictEqual(colorIndex[actualForegroundIndex], Color.Format.CSS.formatHexA(expected.foreground, true).toUpperCase(), 'foreground ' + message);
    }
    else {
        assert.strictEqual(actualForegroundIndex, expected.foreground || 0, 'foreground ' + message);
    }
}
function assertTokenStyles(themeData, expected, language = 'typescript') {
    const colorIndex = themeData.tokenColorMap;
    for (const qualifiedClassifier in expected) {
        const [type, ...modifiers] = qualifiedClassifier.split('.');
        const expectedTokenStyle = expected[qualifiedClassifier];
        const tokenStyleMetaData = themeData.getTokenStyleMetadata(type, modifiers, language);
        assertTokenStyleMetaData(colorIndex, tokenStyleMetaData, expectedTokenStyle, qualifiedClassifier);
    }
}
suite('Themes - TokenStyleResolving', () => {
    const fileService = new FileService(new NullLogService());
    const requestService = new (mock())();
    const storageService = new (mock())();
    const environmentService = new (mock())();
    const configurationService = new (mock())();
    const extensionResourceLoaderService = new ExtensionResourceLoaderService(fileService, storageService, TestProductService, environmentService, configurationService, new ExtensionGalleryManifestService(TestProductService), requestService, new NullLogService());
    const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
    fileService.registerProvider(Schemas.file, diskFileSystemProvider);
    teardown(() => {
        diskFileSystemProvider.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('color defaults', async () => {
        const themeData = ColorThemeData.createUnloadedTheme('foo');
        themeData.location = FileAccess.asFileUri('vs/workbench/services/themes/test/node/color-theme.json');
        await themeData.ensureLoaded(extensionResourceLoaderService);
        assert.strictEqual(themeData.isLoaded, true);
        assertTokenStyles(themeData, {
            'comment': ts('#000000', undefinedStyle),
            'variable': ts('#111111', unsetStyle),
            'type': ts('#333333', { bold: false, underline: true, italic: false }),
            'function': ts('#333333', unsetStyle),
            'string': ts('#444444', undefinedStyle),
            'number': ts('#555555', undefinedStyle),
            'keyword': ts('#666666', undefinedStyle)
        });
    });
    test('resolveScopes', async () => {
        const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
        const customTokenColors = {
            textMateRules: [
                {
                    scope: 'variable',
                    settings: {
                        fontStyle: '',
                        foreground: '#F8F8F2'
                    }
                },
                {
                    scope: 'keyword.operator',
                    settings: {
                        fontStyle: 'italic bold underline',
                        foreground: '#F92672'
                    }
                },
                {
                    scope: 'storage',
                    settings: {
                        fontStyle: 'italic',
                        foreground: '#F92672'
                    }
                },
                {
                    scope: ['storage.type', 'meta.structure.dictionary.json string.quoted.double.json'],
                    settings: {
                        foreground: '#66D9EF'
                    }
                },
                {
                    scope: 'entity.name.type, entity.name.class, entity.name.namespace, entity.name.scope-resolution',
                    settings: {
                        fontStyle: 'underline',
                        foreground: '#A6E22E'
                    }
                },
            ]
        };
        themeData.setCustomTokenColors(customTokenColors);
        let tokenStyle;
        const defaultTokenStyle = undefined;
        tokenStyle = themeData.resolveScopes([['variable']]);
        assertTokenStyle(tokenStyle, ts('#F8F8F2', unsetStyle), 'variable');
        tokenStyle = themeData.resolveScopes([['keyword.operator']]);
        assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, bold: true, underline: true }), 'keyword');
        tokenStyle = themeData.resolveScopes([['keyword']]);
        assertTokenStyle(tokenStyle, defaultTokenStyle, 'keyword');
        tokenStyle = themeData.resolveScopes([['keyword.operator']]);
        assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, bold: true, underline: true }), 'keyword.operator');
        tokenStyle = themeData.resolveScopes([['keyword.operators']]);
        assertTokenStyle(tokenStyle, defaultTokenStyle, 'keyword.operators');
        tokenStyle = themeData.resolveScopes([['storage']]);
        assertTokenStyle(tokenStyle, ts('#F92672', { italic: true, bold: false, underline: false }), 'storage');
        tokenStyle = themeData.resolveScopes([['storage.type']]);
        assertTokenStyle(tokenStyle, ts('#66D9EF', { italic: true, bold: false, underline: false }), 'storage.type');
        tokenStyle = themeData.resolveScopes([['entity.name.class']]);
        assertTokenStyle(tokenStyle, ts('#A6E22E', { italic: false, bold: false, underline: true }), 'entity.name.class');
        tokenStyle = themeData.resolveScopes([['meta.structure.dictionary.json', 'string.quoted.double.json']]);
        assertTokenStyle(tokenStyle, ts('#66D9EF', undefined), 'json property');
        tokenStyle = themeData.resolveScopes([['source.json', 'meta.structure.dictionary.json', 'string.quoted.double.json']]);
        assertTokenStyle(tokenStyle, ts('#66D9EF', undefined), 'json property');
        tokenStyle = themeData.resolveScopes([['keyword'], ['storage.type'], ['entity.name.class']]);
        assertTokenStyle(tokenStyle, ts('#66D9EF', { italic: true, bold: false, underline: false }), 'storage.type');
    });
    test('resolveScopes - match most specific', async () => {
        const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
        const customTokenColors = {
            textMateRules: [
                {
                    scope: 'entity.name.type',
                    settings: {
                        fontStyle: 'underline',
                        foreground: '#A6E22E'
                    }
                },
                {
                    scope: 'entity.name.type.class',
                    settings: {
                        foreground: '#FF00FF'
                    }
                },
                {
                    scope: 'entity.name',
                    settings: {
                        foreground: '#FFFFFF'
                    }
                },
            ]
        };
        themeData.setCustomTokenColors(customTokenColors);
        const tokenStyle = themeData.resolveScopes([['entity.name.type.class']]);
        assertTokenStyle(tokenStyle, ts('#FF00FF', { italic: false, bold: false, underline: true }), 'entity.name.type.class');
    });
    test('rule matching', async () => {
        const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
        themeData.setCustomColors({ 'editor.foreground': '#000000' });
        themeData.setCustomSemanticTokenColors({
            enabled: true,
            rules: {
                'type': '#ff0000',
                'class': { foreground: '#0000ff', italic: true },
                '*.static': { bold: true },
                '*.declaration': { italic: true },
                '*.async.static': { italic: true, underline: true },
                '*.async': { foreground: '#000fff', underline: true }
            }
        });
        assertTokenStyles(themeData, {
            'type': ts('#ff0000', undefinedStyle),
            'type.static': ts('#ff0000', { bold: true }),
            'type.static.declaration': ts('#ff0000', { bold: true, italic: true }),
            'class': ts('#0000ff', { italic: true }),
            'class.static.declaration': ts('#0000ff', { bold: true, italic: true, }),
            'class.declaration': ts('#0000ff', { italic: true }),
            'class.declaration.async': ts('#000fff', { underline: true, italic: true }),
            'class.declaration.async.static': ts('#000fff', { italic: true, underline: true, bold: true }),
        });
    });
    test('super type', async () => {
        const registry = getTokenClassificationRegistry();
        registry.registerTokenType('myTestInterface', 'A type just for testing', 'interface');
        registry.registerTokenType('myTestSubInterface', 'A type just for testing', 'myTestInterface');
        try {
            const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
            themeData.setCustomColors({ 'editor.foreground': '#000000' });
            themeData.setCustomSemanticTokenColors({
                enabled: true,
                rules: {
                    'interface': '#ff0000',
                    'myTestInterface': { italic: true },
                    'interface.static': { bold: true }
                }
            });
            assertTokenStyles(themeData, { 'myTestSubInterface': ts('#ff0000', { italic: true }) });
            assertTokenStyles(themeData, { 'myTestSubInterface.static': ts('#ff0000', { italic: true, bold: true }) });
            themeData.setCustomSemanticTokenColors({
                enabled: true,
                rules: {
                    'interface': '#ff0000',
                    'myTestInterface': { foreground: '#ff00ff', italic: true }
                }
            });
            assertTokenStyles(themeData, { 'myTestSubInterface': ts('#ff00ff', { italic: true }) });
        }
        finally {
            registry.deregisterTokenType('myTestInterface');
            registry.deregisterTokenType('myTestSubInterface');
        }
    });
    test('language', async () => {
        try {
            const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
            themeData.setCustomColors({ 'editor.foreground': '#000000' });
            themeData.setCustomSemanticTokenColors({
                enabled: true,
                rules: {
                    'interface': '#fff000',
                    'interface:java': '#ff0000',
                    'interface.static': { bold: true },
                    'interface.static:typescript': { italic: true }
                }
            });
            assertTokenStyles(themeData, { 'interface': ts('#ff0000', undefined) }, 'java');
            assertTokenStyles(themeData, { 'interface': ts('#fff000', undefined) }, 'typescript');
            assertTokenStyles(themeData, { 'interface.static': ts('#ff0000', { bold: true }) }, 'java');
            assertTokenStyles(themeData, { 'interface.static': ts('#fff000', { bold: true, italic: true }) }, 'typescript');
        }
        finally {
        }
    });
    test('language - scope resolving', async () => {
        const registry = getTokenClassificationRegistry();
        const numberOfDefaultRules = registry.getTokenStylingDefaultRules().length;
        registry.registerTokenStyleDefault(registry.parseTokenSelector('type', 'typescript1'), { scopesToProbe: [['entity.name.type.ts1']] });
        registry.registerTokenStyleDefault(registry.parseTokenSelector('type:javascript1'), { scopesToProbe: [['entity.name.type.js1']] });
        try {
            const themeData = ColorThemeData.createLoadedEmptyTheme('test', 'test');
            themeData.setCustomColors({ 'editor.foreground': '#000000' });
            themeData.setCustomTokenColors({
                textMateRules: [
                    {
                        scope: 'entity.name.type',
                        settings: { foreground: '#aa0000' }
                    },
                    {
                        scope: 'entity.name.type.ts1',
                        settings: { foreground: '#bb0000' }
                    }
                ]
            });
            assertTokenStyles(themeData, { 'type': ts('#aa0000', undefined) }, 'javascript1');
            assertTokenStyles(themeData, { 'type': ts('#bb0000', undefined) }, 'typescript1');
        }
        finally {
            registry.deregisterTokenStyleDefault(registry.parseTokenSelector('type', 'typescript1'));
            registry.deregisterTokenStyleDefault(registry.parseTokenSelector('type:javascript1'));
            assert.strictEqual(registry.getTokenStylingDefaultRules().length, numberOfDefaultRules);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TdHlsZVJlc29sdmluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL3Rlc3Qvbm9kZS90b2tlblN0eWxlUmVzb2x2aW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2hFLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsVUFBVSxFQUFFLDhCQUE4QixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDakksT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMEZBQTBGLENBQUM7QUFFMUksT0FBTyxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBSzVGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVGQUF1RixDQUFDO0FBRXhJLE1BQU0sY0FBYyxHQUFHLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FB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