/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { getMimeTypes, registerPlatformLanguageAssociation, registerConfiguredLanguageAssociation } from '../../../common/services/languagesAssociations.js';
suite('LanguagesAssociations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Dynamically Register Text Mime', () => {
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['application/unknown']);
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'codefile', filename: 'Codefile', mime: 'text/code' });
        guess = getMimeTypes(URI.file('Codefile'));
        assert.deepStrictEqual(guess, ['text/code', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.Codefile'));
        assert.deepStrictEqual(guess, ['application/unknown']);
        registerPlatformLanguageAssociation({ id: 'docker', filepattern: 'Docker*', mime: 'text/docker' });
        guess = getMimeTypes(URI.file('Docker-debug'));
        assert.deepStrictEqual(guess, ['text/docker', 'text/plain']);
        guess = getMimeTypes(URI.file('docker-PROD'));
        assert.deepStrictEqual(guess, ['text/docker', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'niceregex', mime: 'text/nice-regex', firstline: /RegexesAreNice/ });
        guess = getMimeTypes(URI.file('Randomfile.noregistration'), 'RegexesAreNice');
        assert.deepStrictEqual(guess, ['text/nice-regex', 'text/plain']);
        guess = getMimeTypes(URI.file('Randomfile.noregistration'), 'RegexesAreNotNice');
        assert.deepStrictEqual(guess, ['application/unknown']);
        guess = getMimeTypes(URI.file('Codefile'), 'RegexesAreNice');
        assert.deepStrictEqual(guess, ['text/code', 'text/plain']);
    });
    test('Mimes Priority', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'foobar', mime: 'text/foobar', firstline: /foobar/ });
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco'), 'foobar');
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'docker', filename: 'dockerfile', mime: 'text/winner' });
        registerPlatformLanguageAssociation({ id: 'docker', filepattern: 'dockerfile*', mime: 'text/looser' });
        guess = getMimeTypes(URI.file('dockerfile'));
        assert.deepStrictEqual(guess, ['text/winner', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'azure-looser', mime: 'text/azure-looser', firstline: /azure/ });
        registerPlatformLanguageAssociation({ id: 'azure-winner', mime: 'text/azure-winner', firstline: /azure/ });
        guess = getMimeTypes(URI.file('azure'), 'azure');
        assert.deepStrictEqual(guess, ['text/azure-winner', 'text/plain']);
    });
    test('Specificity priority 1', () => {
        registerPlatformLanguageAssociation({ id: 'monaco2', extension: '.monaco2', mime: 'text/monaco2' });
        registerPlatformLanguageAssociation({ id: 'monaco2', filename: 'specific.monaco2', mime: 'text/specific-monaco2' });
        assert.deepStrictEqual(getMimeTypes(URI.file('specific.monaco2')), ['text/specific-monaco2', 'text/plain']);
        assert.deepStrictEqual(getMimeTypes(URI.file('foo.monaco2')), ['text/monaco2', 'text/plain']);
    });
    test('Specificity priority 2', () => {
        registerPlatformLanguageAssociation({ id: 'monaco3', filename: 'specific.monaco3', mime: 'text/specific-monaco3' });
        registerPlatformLanguageAssociation({ id: 'monaco3', extension: '.monaco3', mime: 'text/monaco3' });
        assert.deepStrictEqual(getMimeTypes(URI.file('specific.monaco3')), ['text/specific-monaco3', 'text/plain']);
        assert.deepStrictEqual(getMimeTypes(URI.file('foo.monaco3')), ['text/monaco3', 'text/plain']);
    });
    test('Mimes Priority - Longest Extension wins', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco.xml', mime: 'text/monaco-xml' });
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco.xml.build', mime: 'text/monaco-xml-build' });
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/monaco-xml', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco.xml.build'));
        assert.deepStrictEqual(guess, ['text/monaco-xml-build', 'text/plain']);
    });
    test('Mimes Priority - User configured wins', () => {
        registerConfiguredLanguageAssociation({ id: 'monaco', extension: '.monaco.xnl', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco.xml', mime: 'text/monaco-xml' });
        const guess = getMimeTypes(URI.file('foo.monaco.xnl'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
    });
    test('Mimes Priority - Pattern matches on path if specified', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', filepattern: '**/dot.monaco.xml', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'other', filepattern: '*ot.other.xml', mime: 'text/other' });
        const guess = getMimeTypes(URI.file('/some/path/dot.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
    });
    test('Mimes Priority - Last registered mime wins', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', filepattern: '**/dot.monaco.xml', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'other', filepattern: '**/dot.monaco.xml', mime: 'text/other' });
        const guess = getMimeTypes(URI.file('/some/path/dot.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/other', 'text/plain']);
    });
    test('Data URIs', () => {
        registerPlatformLanguageAssociation({ id: 'data', extension: '.data', mime: 'text/data' });
        assert.deepStrictEqual(getMimeTypes(URI.parse(`data:;label:something.data;description:data,`)), ['text/data', 'text/plain']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzQXNzb2NpYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL2xhbmd1YWdlc0Fzc29jaWF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxtQ0FBbUMsRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRTdKLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFFbkMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzNDLElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFdkQsbUNBQW1DLENBQUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDakcsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUU3RCxL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