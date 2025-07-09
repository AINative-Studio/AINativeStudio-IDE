/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { LanguagesRegistry } from '../../../common/services/languagesRegistry.js';
suite('LanguagesRegistry', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('output language does not have a name', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'outputLangId',
                extensions: [],
                aliases: [],
                mimetypes: ['outputLanguageMimeType'],
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), []);
        registry.dispose();
    });
    test('language with alias does have a name', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'langId',
                extensions: [],
                aliases: ['LangName'],
                mimetypes: ['bla'],
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'LangName', languageId: 'langId' }]);
        assert.deepStrictEqual(registry.getLanguageName('langId'), 'LangName');
        registry.dispose();
    });
    test('language without alias gets a name', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'langId',
                extensions: [],
                mimetypes: ['bla'],
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'langId', languageId: 'langId' }]);
        assert.deepStrictEqual(registry.getLanguageName('langId'), 'langId');
        registry.dispose();
    });
    test('bug #4360: f# not shown in status bar', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'langId',
                extensions: ['.ext1'],
                aliases: ['LangName'],
                mimetypes: ['bla'],
            }]);
        registry._registerLanguages([{
                id: 'langId',
                extensions: ['.ext2'],
                aliases: [],
                mimetypes: ['bla'],
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'LangName', languageId: 'langId' }]);
        assert.deepStrictEqual(registry.getLanguageName('langId'), 'LangName');
        registry.dispose();
    });
    test('issue #5278: Extension cannot override language name anymore', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'langId',
                extensions: ['.ext1'],
                aliases: ['LangName'],
                mimetypes: ['bla'],
            }]);
        registry._registerLanguages([{
                id: 'langId',
                extensions: ['.ext2'],
                aliases: ['BetterLanguageName'],
                mimetypes: ['bla'],
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'BetterLanguageName', languageId: 'langId' }]);
        assert.deepStrictEqual(registry.getLanguageName('langId'), 'BetterLanguageName');
        registry.dispose();
    });
    test('mimetypes are generated if necessary', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'langId'
            }]);
        assert.deepStrictEqual(registry.getMimeType('langId'), 'text/x-langId');
        registry.dispose();
    });
    test('first mimetype wins', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'langId',
                mimetypes: ['text/langId', 'text/langId2']
            }]);
        assert.deepStrictEqual(registry.getMimeType('langId'), 'text/langId');
        registry.dispose();
    });
    test('first mimetype wins 2', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'langId'
            }]);
        registry._registerLanguages([{
                id: 'langId',
                mimetypes: ['text/langId']
            }]);
        assert.deepStrictEqual(registry.getMimeType('langId'), 'text/x-langId');
        registry.dispose();
    });
    test('aliases', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'a'
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'a', languageId: 'a' }]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'a');
        registry._registerLanguages([{
                id: 'a',
                aliases: ['A1', 'A2']
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'A1', languageId: 'a' }]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a1'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a2'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'A1');
        registry._registerLanguages([{
                id: 'a',
                aliases: ['A3', 'A4']
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'A3', languageId: 'a' }]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a1'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a2'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a3'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a4'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'A3');
        registry.dispose();
    });
    test('empty aliases array means no alias', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'a'
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'a', languageId: 'a' }]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'a');
        registry._registerLanguages([{
                id: 'b',
                aliases: []
            }]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [{ languageName: 'a', languageId: 'a' }]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('b'), 'b');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('b'), null);
        registry.dispose();
    });
    test('extensions', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'a',
                aliases: ['aName'],
                extensions: ['aExt']
            }]);
        assert.deepStrictEqual(registry.getExtensions('a'), ['aExt']);
        registry._registerLanguages([{
                id: 'a',
                extensions: ['aExt2']
            }]);
        assert.deepStrictEqual(registry.getExtensions('a'), ['aExt', 'aExt2']);
        registry.dispose();
    });
    test('extensions of primary language registration come first', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'a',
                extensions: ['aExt3']
            }]);
        assert.deepStrictEqual(registry.getExtensions('a')[0], 'aExt3');
        registry._registerLanguages([{
                id: 'a',
                configuration: URI.file('conf.json'),
                extensions: ['aExt']
            }]);
        assert.deepStrictEqual(registry.getExtensions('a')[0], 'aExt');
        registry._registerLanguages([{
                id: 'a',
                extensions: ['aExt2']
            }]);
        assert.deepStrictEqual(registry.getExtensions('a')[0], 'aExt');
        registry.dispose();
    });
    test('filenames', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'a',
                aliases: ['aName'],
                filenames: ['aFilename']
            }]);
        assert.deepStrictEqual(registry.getFilenames('a'), ['aFilename']);
        registry._registerLanguages([{
                id: 'a',
                filenames: ['aFilename2']
            }]);
        assert.deepStrictEqual(registry.getFilenames('a'), ['aFilename', 'aFilename2']);
        registry.dispose();
    });
    test('configuration', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([{
                id: 'a',
                aliases: ['aName'],
                configuration: URI.file('/path/to/aFilename')
            }]);
        assert.deepStrictEqual(registry.getConfigurationFiles('a'), [URI.file('/path/to/aFilename')]);
        assert.deepStrictEqual(registry.getConfigurationFiles('aname'), []);
        assert.deepStrictEqual(registry.getConfigurationFiles('aName'), []);
        registry._registerLanguages([{
                id: 'a',
                configuration: URI.file('/path/to/aFilename2')
            }]);
        assert.deepStrictEqual(registry.getConfigurationFiles('a'), [URI.file('/path/to/aFilename'), URI.file('/path/to/aFilename2')]);
        assert.deepStrictEqual(registry.getConfigurationFiles('aname'), []);
        assert.deepStrictEqual(registry.getConfigurationFiles('aName'), []);
        registry.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvbGFuZ3VhZ2VzUmVnaXN0cnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRWxGLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFFL0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1FBQ2pELE1BQU0sUUFBUSxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFOUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQzVCLEVBQUUsRUFBRSxjQUFjO2dCQUNsQixVQUFVLEVBQUUsRUFBRTtnQkFDZCxPQUFPLEVBQUUsRUFBRTtnQkFDWCxTQUFTLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQzthQUNyQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFeEUsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtB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