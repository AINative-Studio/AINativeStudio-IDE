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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL2xhbmd1YWdlc1JlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUVsRixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBRS9CLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTlDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUM1QixFQUFFLEVBQUUsY0FBYztnQkFDbEIsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsU0FBUyxFQUFFLENBQUMsd0JBQXdCLENBQUM7YUFDckMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXhFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDakQsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsQ0FB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