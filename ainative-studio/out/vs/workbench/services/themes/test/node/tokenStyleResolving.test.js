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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TdHlsZVJlc29sdmluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvdGVzdC9ub2RlL3Rva2VuU3R5bGVSZXNvbHZpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDaEUsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUNqSSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwRkFBMEYsQ0FBQztBQUUxSSxPQUFPLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFLNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sdUZBQXVGLENBQUM7QUFFeEksTUFBTSxjQUFjLEdBQUcsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDO0FBQ3BGLE1BQU0sVUFBVSxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUVwRSxTQUFTLEVBQUUsQ0FBQyxVQUE4QixFQUFFLFVBQTBHO0lBQ3JKLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ3JGLE9BQU8sSUFBSSxVQUFVLENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNoSSxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxFQUFpQztJQUM1RCxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDVCxPQUFPLHNCQUFzQixDQUFDO0lBQy9CLENBQUM7SUFDRCxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7SUFDckUsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzNCLEdBQUcsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUM5QixDQUFDO0lBQ0QsSUFBSSxFQUFFLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ2hDLEdBQUcsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNuQyxDQUFDO0lBQ0QsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzdCLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNoQyxDQUFDO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFxQyxFQUFFLFFBQXVDLEVBQUUsT0FBZ0I7SUFDekgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2RixDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxVQUFvQixFQUFFLE1BQStCLEVBQUUsUUFBdUMsRUFBRSxPQUFPLEdBQUcsRUFBRTtJQUM3SSxJQUFJLFFBQVEsS0FBSyxTQUFTLElBQUksUUFBUSxLQUFLLElBQUksSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLE9BQU87SUFDUixDQUFDO0lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxZQUFZLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFFakYsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQ2hELElBQUkscUJBQXFCLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsYUFBYSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQ3RKLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsRUFBRSxRQUFRLENBQUMsVUFBVSxJQUFJLENBQUMsRUFBRSxhQUFhLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDOUYsQ0FBQztBQUNGLENBQUM7QUFHRCxTQUFTLGlCQUFpQixDQUFDLFNBQXlCLEVBQUUsUUFBdUQsRUFBRSxRQUFRLEdBQUcsWUFBWTtJQUNySSxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDO0lBRTNDLEtBQUssTUFBTSxtQkFBbUIsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUM1QyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsU0FBUyxDQUFDLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTVELE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFekQsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN0Rix3QkFBd0IsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUNuRyxDQUFDO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQzFELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQW1CLENBQUMsRUFBRSxDQUFDO0lBQ3ZELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQW1CLENBQUMsRUFBRSxDQUFDO0lBQ3ZELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBdUIsQ0FBQyxFQUFFLENBQUM7SUFDL0QsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUF5QixDQUFDLEVBQUUsQ0FBQztJQUVuRSxNQUFNLDhCQUE4QixHQUFHLElBQUksOEJBQThCLENBQUMsV0FBVyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLCtCQUErQixDQUFDLGtCQUFrQixDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQztJQUVwUSxNQUFNLHNCQUFzQixHQUFHLElBQUksc0JBQXNCLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ2hGLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFFbkUsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakMsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVELFNBQVMsQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO1FBQ3JHLE1BQU0sU0FBUyxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBRTdELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU3QyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUU7WUFDNUIsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDO1lBQ3hDLFVBQVUsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztZQUNyQyxNQUFNLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDdEUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO1lBQ3JDLFFBQVEsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQztZQUN2QyxRQUFRLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUM7WUFDdkMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDO1NBQ3hDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGVBQWUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoQyxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXhFLE1BQU0saUJBQWlCLEdBQThCO1lBQ3BELGFBQWEsRUFBRTtnQkFDZDtvQkFDQyxLQUFLLEVBQUUsVUFBVTtvQkFDakIsUUFBUSxFQUFFO3dCQUNULFNBQVMsRUFBRSxFQUFFO3dCQUNiLFVBQVUsRUFBRSxTQUFTO3FCQUNyQjtpQkFDRDtnQkFDRDtvQkFDQyxLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixRQUFRLEVBQUU7d0JBQ1QsU0FBUyxFQUFFLHVCQUF1Qjt3QkFDbEMsVUFBVSxFQUFFLFNBQVM7cUJBQ3JCO2lCQUNEO2dCQUNEO29CQUNDLEtBQUssRUFBRSxTQUFTO29CQUNoQixRQUFRLEVBQUU7d0JBQ1QsU0FBUyxFQUFFLFFBQVE7d0JBQ25CLFVBQVUsRUFBRSxTQUFTO3FCQUNyQjtpQkFDRDtnQkFDRDtvQkFDQyxLQUFLLEVBQUUsQ0FBQyxjQUFjLEVBQUUsMERBQTBELENBQUM7b0JBQ25GLFFBQVEsRUFBRTt3QkFDVCxVQUFVLEVBQUUsU0FBUztxQkFDckI7aUJBQ0Q7Z0JBQ0Q7b0JBQ0MsS0FBSyxFQUFFLDBGQUEwRjtvQkFDakcsUUFBUSxFQUFFO3dCQUNULFNBQVMsRUFBRSxXQUFXO3dCQUN0QixVQUFVLEVBQUUsU0FBUztxQkFDckI7aUJBQ0Q7YUFDRDtTQUNELENBQUM7UUFFRixTQUFTLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVsRCxJQUFJLFVBQVUsQ0FBQztRQUNmLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDO1FBRXBDLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckQsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFcEUsVUFBVSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdELGdCQUFnQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXRHLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTNELFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RCxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRS9HLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RCxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUVyRSxVQUFVLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELGdCQUFnQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXhHLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFN0csVUFBVSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlELGdCQUFnQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFFbEgsVUFBVSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxFQUFFLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRXhFLFVBQVUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsZ0NBQWdDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkgsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFeEUsVUFBVSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RixnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUU5RyxDQUFDLENBQUMsQ0FBQztJQUdILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RCxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXhFLE1BQU0saUJBQWlCLEdBQThCO1lBQ3BELGFBQWEsRUFBRTtnQkFDZDtvQkFDQyxLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixRQUFRLEVBQUU7d0JBQ1QsU0FBUyxFQUFFLFdBQVc7d0JBQ3RCLFVBQVUsRUFBRSxTQUFTO3FCQUNyQjtpQkFDRDtnQkFDRDtvQkFDQyxLQUFLLEVBQUUsd0JBQXdCO29CQUMvQixRQUFRLEVBQUU7d0JBQ1QsVUFBVSxFQUFFLFNBQVM7cUJBQ3JCO2lCQUNEO2dCQUNEO29CQUNDLEtBQUssRUFBRSxhQUFhO29CQUNwQixRQUFRLEVBQUU7d0JBQ1QsVUFBVSxFQUFFLFNBQVM7cUJBQ3JCO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDO1FBRUYsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFbEQsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekUsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztJQUV4SCxDQUFDLENBQUMsQ0FBQztJQUdILElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEMsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RSxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUM5RCxTQUFTLENBQUMsNEJBQTRCLENBQUM7WUFDdEMsT0FBTyxFQUFFLElBQUk7WUFDYixLQUFLLEVBQUU7Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLE9BQU8sRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtnQkFDaEQsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtnQkFDMUIsZUFBZSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtnQkFDakMsZ0JBQWdCLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7Z0JBQ25ELFNBQVMsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTthQUNyRDtTQUNELENBQUMsQ0FBQztRQUVILGlCQUFpQixDQUFDLFNBQVMsRUFBRTtZQUM1QixNQUFNLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUM7WUFDckMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDNUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO1lBQ3RFLE9BQU8sRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO1lBQ3hDLDBCQUEwQixFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEdBQUcsQ0FBQztZQUN4RSxtQkFBbUIsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO1lBQ3BELHlCQUF5QixFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUMzRSxnQ0FBZ0MsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztTQUM5RixDQUFDLENBQUM7SUFFSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0IsTUFBTSxRQUFRLEdBQUcsOEJBQThCLEVBQUUsQ0FBQztRQUVsRCxRQUFRLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDdEYsUUFBUSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLHlCQUF5QixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFL0YsSUFBSSxDQUFDO1lBQ0osTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN4RSxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUM5RCxTQUFTLENBQUMsNEJBQTRCLENBQUM7Z0JBQ3RDLE9BQU8sRUFBRSxJQUFJO2dCQUNiLEtBQUssRUFBRTtvQkFDTixXQUFXLEVBQUUsU0FBUztvQkFDdEIsaUJBQWlCLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO29CQUNuQyxrQkFBa0IsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7aUJBQ2xDO2FBQ0QsQ0FBQyxDQUFDO1lBRUgsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN4RixpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsRUFBRSwyQkFBMkIsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFM0csU0FBUyxDQUFDLDRCQUE0QixDQUFDO2dCQUN0QyxPQUFPLEVBQUUsSUFBSTtnQkFDYixLQUFLLEVBQUU7b0JBQ04sV0FBVyxFQUFFLFNBQVM7b0JBQ3RCLGlCQUFpQixFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2lCQUMxRDthQUNELENBQUMsQ0FBQztZQUNILGlCQUFpQixDQUFDLFNBQVMsRUFBRSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekYsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsUUFBUSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDaEQsUUFBUSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDcEQsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQixJQUFJLENBQUM7WUFDSixNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hFLFNBQVMsQ0FBQyxlQUFlLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQzlELFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQztnQkFDdEMsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsS0FBSyxFQUFFO29CQUNOLFdBQVcsRUFBRSxTQUFTO29CQUN0QixnQkFBZ0IsRUFBRSxTQUFTO29CQUMzQixrQkFBa0IsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7b0JBQ2xDLDZCQUE2QixFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtpQkFDL0M7YUFDRCxDQUFDLENBQUM7WUFFSCxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2hGLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDdEYsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDNUYsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqSCxDQUFDO2dCQUFTLENBQUM7UUFDWCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsTUFBTSxRQUFRLEdBQUcsOEJBQThCLEVBQUUsQ0FBQztRQUVsRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUUzRSxRQUFRLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsRUFBRSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0SSxRQUFRLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbkksSUFBSSxDQUFDO1lBQ0osTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN4RSxTQUFTLENBQUMsZUFBZSxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUM5RCxTQUFTLENBQUMsb0JBQW9CLENBQUM7Z0JBQzlCLGFBQWEsRUFBRTtvQkFDZDt3QkFDQyxLQUFLLEVBQUUsa0JBQWtCO3dCQUN6QixRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFO3FCQUNuQztvQkFDRDt3QkFDQyxLQUFLLEVBQUUsc0JBQXNCO3dCQUM3QixRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFO3FCQUNuQztpQkFDRDthQUNELENBQUMsQ0FBQztZQUVILGlCQUFpQixDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDbEYsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUVuRixDQUFDO2dCQUFTLENBQUM7WUFDVixRQUFRLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBRXRGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLENBQUMsTUFBTSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDekYsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==