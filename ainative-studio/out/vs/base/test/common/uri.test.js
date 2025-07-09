/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isWindows } from '../../common/platform.js';
import { URI, isUriComponents } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('URI', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('file#toString', () => {
        assert.strictEqual(URI.file('c:/win/path').toString(), 'file:///c%3A/win/path');
        assert.strictEqual(URI.file('C:/win/path').toString(), 'file:///c%3A/win/path');
        assert.strictEqual(URI.file('c:/win/path/').toString(), 'file:///c%3A/win/path/');
        assert.strictEqual(URI.file('/c:/win/path').toString(), 'file:///c%3A/win/path');
    });
    test('URI.file (win-special)', () => {
        if (isWindows) {
            assert.strictEqual(URI.file('c:\\win\\path').toString(), 'file:///c%3A/win/path');
            assert.strictEqual(URI.file('c:\\win/path').toString(), 'file:///c%3A/win/path');
        }
        else {
            assert.strictEqual(URI.file('c:\\win\\path').toString(), 'file:///c%3A%5Cwin%5Cpath');
            assert.strictEqual(URI.file('c:\\win/path').toString(), 'file:///c%3A%5Cwin/path');
        }
    });
    test('file#fsPath (win-special)', () => {
        if (isWindows) {
            assert.strictEqual(URI.file('c:\\win\\path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('c:\\win/path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('c:/win/path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('c:/win/path/').fsPath, 'c:\\win\\path\\');
            assert.strictEqual(URI.file('C:/win/path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('/c:/win/path').fsPath, 'c:\\win\\path');
            assert.strictEqual(URI.file('./c/win/path').fsPath, '\\.\\c\\win\\path');
        }
        else {
            assert.strictEqual(URI.file('c:/win/path').fsPath, 'c:/win/path');
            assert.strictEqual(URI.file('c:/win/path/').fsPath, 'c:/win/path/');
            assert.strictEqual(URI.file('C:/win/path').fsPath, 'c:/win/path');
            assert.strictEqual(URI.file('/c:/win/path').fsPath, 'c:/win/path');
            assert.strictEqual(URI.file('./c/win/path').fsPath, '/./c/win/path');
        }
    });
    test('URI#fsPath - no `fsPath` when no `path`', () => {
        const value = URI.parse('file://%2Fhome%2Fticino%2Fdesktop%2Fcpluscplus%2Ftest.cpp');
        assert.strictEqual(value.authority, '/home/ticino/desktop/cpluscplus/test.cpp');
        assert.strictEqual(value.path, '/');
        if (isWindows) {
            assert.strictEqual(value.fsPath, '\\');
        }
        else {
            assert.strictEqual(value.fsPath, '/');
        }
    });
    test('http#toString', () => {
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'www.example.com', path: '/my/path' }).toString(), 'http://www.example.com/my/path');
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'www.example.com', path: '/my/path' }).toString(), 'http://www.example.com/my/path');
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'www.EXAMPLE.com', path: '/my/path' }).toString(), 'http://www.example.com/my/path');
        assert.strictEqual(URI.from({ scheme: 'http', authority: '', path: 'my/path' }).toString(), 'http:/my/path');
        assert.strictEqual(URI.from({ scheme: 'http', authority: '', path: '/my/path' }).toString(), 'http:/my/path');
        //http://example.com/#test=true
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'example.com', path: '/', query: 'test=true' }).toString(), 'http://example.com/?test%3Dtrue');
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'example.com', path: '/', query: '', fragment: 'test=true' }).toString(), 'http://example.com/#test%3Dtrue');
    });
    test('http#toString, encode=FALSE', () => {
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'example.com', path: '/', query: 'test=true' }).toString(true), 'http://example.com/?test=true');
        assert.strictEqual(URI.from({ scheme: 'http', authority: 'example.com', path: '/', query: '', fragment: 'test=true' }).toString(true), 'http://example.com/#test=true');
        assert.strictEqual(URI.from({ scheme: 'http', path: '/api/files/test.me', query: 't=1234' }).toString(true), 'http:/api/files/test.me?t=1234');
        const value = URI.parse('file://shares/pröjects/c%23/#l12');
        assert.strictEqual(value.authority, 'shares');
        assert.strictEqual(value.path, '/pröjects/c#/');
        assert.strictEqual(value.fragment, 'l12');
        assert.strictEqual(value.toString(), 'file://shares/pr%C3%B6jects/c%23/#l12');
        assert.strictEqual(value.toString(true), 'file://shares/pröjects/c%23/#l12');
        const uri2 = URI.parse(value.toString(true));
        const uri3 = URI.parse(value.toString());
        assert.strictEqual(uri2.authority, uri3.authority);
        assert.strictEqual(uri2.path, uri3.path);
        assert.strictEqual(uri2.query, uri3.query);
        assert.strictEqual(uri2.fragment, uri3.fragment);
    });
    test('with, identity', () => {
        const uri = URI.parse('foo:bar/path');
        let uri2 = uri.with(null);
        assert.ok(uri === uri2);
        uri2 = uri.with(undefined);
        assert.ok(uri === uri2);
        uri2 = uri.with({});
        assert.ok(uri === uri2);
        uri2 = uri.with({ scheme: 'foo', path: 'bar/path' });
        assert.ok(uri === uri2);
    });
    test('with, changes', () => {
        assert.strictEqual(URI.parse('before:some/file/path').with({ scheme: 'after' }).toString(), 'after:some/file/path');
        assert.strictEqual(URI.from({ scheme: 's' }).with({ scheme: 'http', path: '/api/files/test.me', query: 't=1234' }).toString(), 'http:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' }).with({ scheme: 'http', authority: '', path: '/api/files/test.me', query: 't=1234', fragment: '' }).toString(), 'http:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' }).with({ scheme: 'https', authority: '', path: '/api/files/test.me', query: 't=1234', fragment: '' }).toString(), 'https:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' }).with({ scheme: 'HTTP', authority: '', path: '/api/files/test.me', query: 't=1234', fragment: '' }).toString(), 'HTTP:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' }).with({ scheme: 'HTTPS', authority: '', path: '/api/files/test.me', query: 't=1234', fragment: '' }).toString(), 'HTTPS:/api/files/test.me?t%3D1234');
        assert.strictEqual(URI.from({ scheme: 's' }).with({ scheme: 'boo', authority: '', path: '/api/files/test.me', query: 't=1234', fragment: '' }).toString(), 'boo:/api/files/test.me?t%3D1234');
    });
    test('with, remove components #8465', () => {
        assert.strictEqual(URI.parse('scheme://authority/path').with({ authority: '' }).toString(), 'scheme:/path');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: 'authority' }).with({ authority: '' }).toString(), 'scheme:/path');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: 'authority' }).with({ authority: null }).toString(), 'scheme:/path');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: 'authority' }).with({ path: '' }).toString(), 'scheme://authority');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: 'authority' }).with({ path: null }).toString(), 'scheme://authority');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: '' }).toString(), 'scheme:/path');
        assert.strictEqual(URI.parse('scheme:/path').with({ authority: null }).toString(), 'scheme:/path');
    });
    test('with, validation', () => {
        const uri = URI.parse('foo:bar/path');
        assert.throws(() => uri.with({ scheme: 'fai:l' }));
        assert.throws(() => uri.with({ scheme: 'fäil' }));
        assert.throws(() => uri.with({ authority: 'fail' }));
        assert.throws(() => uri.with({ path: '//fail' }));
    });
    test('parse', () => {
        let value = URI.parse('http:/api/files/test.me?t=1234');
        assert.strictEqual(value.scheme, 'http');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/api/files/test.me');
        assert.strictEqual(value.query, 't=1234');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('http://api/files/test.me?t=1234');
        assert.strictEqual(value.scheme, 'http');
        assert.strictEqual(value.authority, 'api');
        assert.strictEqual(value.path, '/files/test.me');
        assert.strictEqual(value.query, 't=1234');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('file:///c:/test/me');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/c:/test/me');
        assert.strictEqual(value.fragment, '');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fsPath, isWindows ? 'c:\\test\\me' : 'c:/test/me');
        value = URI.parse('file://shares/files/c%23/p.cs');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, 'shares');
        assert.strictEqual(value.path, '/files/c#/p.cs');
        assert.strictEqual(value.fragment, '');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fsPath, isWindows ? '\\\\shares\\files\\c#\\p.cs' : '//shares/files/c#/p.cs');
        value = URI.parse('file:///c:/Source/Z%C3%BCrich%20or%20Zurich%20(%CB%88zj%CA%8A%C9%99r%C9%AAk,/Code/resources/app/plugins/c%23/plugin.json');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/c:/Source/Zürich or Zurich (ˈzjʊərɪk,/Code/resources/app/plugins/c#/plugin.json');
        assert.strictEqual(value.fragment, '');
        assert.strictEqual(value.query, '');
        value = URI.parse('file:///c:/test %25/path');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/c:/test %/path');
        assert.strictEqual(value.fragment, '');
        assert.strictEqual(value.query, '');
        value = URI.parse('inmemory:');
        assert.strictEqual(value.scheme, 'inmemory');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('foo:api/files/test');
        assert.strictEqual(value.scheme, 'foo');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, 'api/files/test');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('file:?q');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/');
        assert.strictEqual(value.query, 'q');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('file:#d');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, 'd');
        value = URI.parse('f3ile:#d');
        assert.strictEqual(value.scheme, 'f3ile');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, 'd');
        value = URI.parse('foo+bar:path');
        assert.strictEqual(value.scheme, 'foo+bar');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, 'path');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('foo-bar:path');
        assert.strictEqual(value.scheme, 'foo-bar');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, 'path');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
        value = URI.parse('foo.bar:path');
        assert.strictEqual(value.scheme, 'foo.bar');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, 'path');
        assert.strictEqual(value.query, '');
        assert.strictEqual(value.fragment, '');
    });
    test('parse, disallow //path when no authority', () => {
        assert.throws(() => URI.parse('file:////shares/files/p.cs'));
    });
    test('URI#file, win-speciale', () => {
        if (isWindows) {
            let value = URI.file('c:\\test\\drive');
            assert.strictEqual(value.path, '/c:/test/drive');
            assert.strictEqual(value.toString(), 'file:///c%3A/test/drive');
            value = URI.file('\\\\shäres\\path\\c#\\plugin.json');
            assert.strictEqual(value.scheme, 'file');
            assert.strictEqual(value.authority, 'shäres');
            assert.strictEqual(value.path, '/path/c#/plugin.json');
            assert.strictEqual(value.fragment, '');
            assert.strictEqual(value.query, '');
            assert.strictEqual(value.toString(), 'file://sh%C3%A4res/path/c%23/plugin.json');
            value = URI.file('\\\\localhost\\c$\\GitDevelopment\\express');
            assert.strictEqual(value.scheme, 'file');
            assert.strictEqual(value.path, '/c$/GitDevelopment/express');
            assert.strictEqual(value.fsPath, '\\\\localhost\\c$\\GitDevelopment\\express');
            assert.strictEqual(value.query, '');
            assert.strictEqual(value.fragment, '');
            assert.strictEqual(value.toString(), 'file://localhost/c%24/GitDevelopment/express');
            value = URI.file('c:\\test with %\\path');
            assert.strictEqual(value.path, '/c:/test with %/path');
            assert.strictEqual(value.toString(), 'file:///c%3A/test%20with%20%25/path');
            value = URI.file('c:\\test with %25\\path');
            assert.strictEqual(value.path, '/c:/test with %25/path');
            assert.strictEqual(value.toString(), 'file:///c%3A/test%20with%20%2525/path');
            value = URI.file('c:\\test with %25\\c#code');
            assert.strictEqual(value.path, '/c:/test with %25/c#code');
            assert.strictEqual(value.toString(), 'file:///c%3A/test%20with%20%2525/c%23code');
            value = URI.file('\\\\shares');
            assert.strictEqual(value.scheme, 'file');
            assert.strictEqual(value.authority, 'shares');
            assert.strictEqual(value.path, '/'); // slash is always there
            value = URI.file('\\\\shares\\');
            assert.strictEqual(value.scheme, 'file');
            assert.strictEqual(value.authority, 'shares');
            assert.strictEqual(value.path, '/');
        }
    });
    test('VSCode URI module\'s driveLetterPath regex is incorrect, #32961', function () {
        const uri = URI.parse('file:///_:/path');
        assert.strictEqual(uri.fsPath, isWindows ? '\\_:\\path' : '/_:/path');
    });
    test('URI#file, no path-is-uri check', () => {
        // we don't complain here
        const value = URI.file('file://path/to/file');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/file://path/to/file');
    });
    test('URI#file, always slash', () => {
        let value = URI.file('a.file');
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/a.file');
        assert.strictEqual(value.toString(), 'file:///a.file');
        value = URI.parse(value.toString());
        assert.strictEqual(value.scheme, 'file');
        assert.strictEqual(value.authority, '');
        assert.strictEqual(value.path, '/a.file');
        assert.strictEqual(value.toString(), 'file:///a.file');
    });
    test('URI.toString, only scheme and query', () => {
        const value = URI.parse('stuff:?qüery');
        assert.strictEqual(value.toString(), 'stuff:?q%C3%BCery');
    });
    test('URI#toString, upper-case percent espaces', () => {
        const value = URI.parse('file://sh%c3%a4res/path');
        assert.strictEqual(value.toString(), 'file://sh%C3%A4res/path');
    });
    test('URI#toString, lower-case windows drive letter', () => {
        assert.strictEqual(URI.parse('untitled:c:/Users/jrieken/Code/abc.txt').toString(), 'untitled:c%3A/Users/jrieken/Code/abc.txt');
        assert.strictEqual(URI.parse('untitled:C:/Users/jrieken/Code/abc.txt').toString(), 'untitled:c%3A/Users/jrieken/Code/abc.txt');
    });
    test('URI#toString, escape all the bits', () => {
        const value = URI.file('/Users/jrieken/Code/_samples/18500/Mödel + Other Thîngß/model.js');
        assert.strictEqual(value.toString(), 'file:///Users/jrieken/Code/_samples/18500/M%C3%B6del%20%2B%20Other%20Th%C3%AEng%C3%9F/model.js');
    });
    test('URI#toString, don\'t encode port', () => {
        let value = URI.parse('http://localhost:8080/far');
        assert.strictEqual(value.toString(), 'http://localhost:8080/far');
        value = URI.from({ scheme: 'http', authority: 'löcalhost:8080', path: '/far', query: undefined, fragment: undefined });
        assert.strictEqual(value.toString(), 'http://l%C3%B6calhost:8080/far');
    });
    test('URI#toString, user information in authority', () => {
        let value = URI.parse('http://foo:bar@localhost/far');
        assert.strictEqual(value.toString(), 'http://foo:bar@localhost/far');
        value = URI.parse('http://foo@localhost/far');
        assert.strictEqual(value.toString(), 'http://foo@localhost/far');
        value = URI.parse('http://foo:bAr@localhost:8080/far');
        assert.strictEqual(value.toString(), 'http://foo:bAr@localhost:8080/far');
        value = URI.parse('http://foo@localhost:8080/far');
        assert.strictEqual(value.toString(), 'http://foo@localhost:8080/far');
        value = URI.from({ scheme: 'http', authority: 'föö:bör@löcalhost:8080', path: '/far', query: undefined, fragment: undefined });
        assert.strictEqual(value.toString(), 'http://f%C3%B6%C3%B6:b%C3%B6r@l%C3%B6calhost:8080/far');
    });
    test('correctFileUriToFilePath2', () => {
        const test = (input, expected) => {
            const value = URI.parse(input);
            assert.strictEqual(value.fsPath, expected, 'Result for ' + input);
            const value2 = URI.file(value.fsPath);
            assert.strictEqual(value2.fsPath, expected, 'Result for ' + input);
            assert.strictEqual(value.toString(), value2.toString());
        };
        test('file:///c:/alex.txt', isWindows ? 'c:\\alex.txt' : 'c:/alex.txt');
        test('file:///c:/Source/Z%C3%BCrich%20or%20Zurich%20(%CB%88zj%CA%8A%C9%99r%C9%AAk,/Code/resources/app/plugins', isWindows ? 'c:\\Source\\Zürich or Zurich (ˈzjʊərɪk,\\Code\\resources\\app\\plugins' : 'c:/Source/Zürich or Zurich (ˈzjʊərɪk,/Code/resources/app/plugins');
        test('file://monacotools/folder/isi.txt', isWindows ? '\\\\monacotools\\folder\\isi.txt' : '//monacotools/folder/isi.txt');
        test('file://monacotools1/certificates/SSL/', isWindows ? '\\\\monacotools1\\certificates\\SSL\\' : '//monacotools1/certificates/SSL/');
    });
    test('URI - http, query & toString', function () {
        let uri = URI.parse('https://go.microsoft.com/fwlink/?LinkId=518008');
        assert.strictEqual(uri.query, 'LinkId=518008');
        assert.strictEqual(uri.toString(true), 'https://go.microsoft.com/fwlink/?LinkId=518008');
        assert.strictEqual(uri.toString(), 'https://go.microsoft.com/fwlink/?LinkId%3D518008');
        let uri2 = URI.parse(uri.toString());
        assert.strictEqual(uri2.query, 'LinkId=518008');
        assert.strictEqual(uri2.query, uri.query);
        uri = URI.parse('https://go.microsoft.com/fwlink/?LinkId=518008&foö&ké¥=üü');
        assert.strictEqual(uri.query, 'LinkId=518008&foö&ké¥=üü');
        assert.strictEqual(uri.toString(true), 'https://go.microsoft.com/fwlink/?LinkId=518008&foö&ké¥=üü');
        assert.strictEqual(uri.toString(), 'https://go.microsoft.com/fwlink/?LinkId%3D518008%26fo%C3%B6%26k%C3%A9%C2%A5%3D%C3%BC%C3%BC');
        uri2 = URI.parse(uri.toString());
        assert.strictEqual(uri2.query, 'LinkId=518008&foö&ké¥=üü');
        assert.strictEqual(uri2.query, uri.query);
        // #24849
        uri = URI.parse('https://twitter.com/search?src=typd&q=%23tag');
        assert.strictEqual(uri.toString(true), 'https://twitter.com/search?src=typd&q=%23tag');
    });
    test('class URI cannot represent relative file paths #34449', function () {
        let path = '/foo/bar';
        assert.strictEqual(URI.file(path).path, path);
        path = 'foo/bar';
        assert.strictEqual(URI.file(path).path, '/foo/bar');
        path = './foo/bar';
        assert.strictEqual(URI.file(path).path, '/./foo/bar'); // missing normalization
        const fileUri1 = URI.parse(`file:foo/bar`);
        assert.strictEqual(fileUri1.path, '/foo/bar');
        assert.strictEqual(fileUri1.authority, '');
        const uri = fileUri1.toString();
        assert.strictEqual(uri, 'file:///foo/bar');
        const fileUri2 = URI.parse(uri);
        assert.strictEqual(fileUri2.path, '/foo/bar');
        assert.strictEqual(fileUri2.authority, '');
    });
    test('Ctrl click to follow hash query param url gets urlencoded #49628', function () {
        let input = 'http://localhost:3000/#/foo?bar=baz';
        let uri = URI.parse(input);
        assert.strictEqual(uri.toString(true), input);
        input = 'http://localhost:3000/foo?bar=baz';
        uri = URI.parse(input);
        assert.strictEqual(uri.toString(true), input);
    });
    test('Unable to open \'%A0.txt\': URI malformed #76506', function () {
        let uri = URI.file('/foo/%A0.txt');
        let uri2 = URI.parse(uri.toString());
        assert.strictEqual(uri.scheme, uri2.scheme);
        assert.strictEqual(uri.path, uri2.path);
        uri = URI.file('/foo/%2e.txt');
        uri2 = URI.parse(uri.toString());
        assert.strictEqual(uri.scheme, uri2.scheme);
        assert.strictEqual(uri.path, uri2.path);
    });
    test('Bug in URI.isUri() that fails `thing` type comparison #114971', function () {
        const uri = URI.file('/foo/bazz.txt');
        assert.strictEqual(URI.isUri(uri), true);
        assert.strictEqual(URI.isUri(uri.toJSON()), false);
        // fsPath -> getter
        assert.strictEqual(URI.isUri({
            scheme: 'file',
            authority: '',
            path: '/foo/bazz.txt',
            get fsPath() { return '/foo/bazz.txt'; },
            query: '',
            fragment: '',
            with() { return this; },
            toString() { return ''; }
        }), true);
        // fsPath -> property
        assert.strictEqual(URI.isUri({
            scheme: 'file',
            authority: '',
            path: '/foo/bazz.txt',
            fsPath: '/foo/bazz.txt',
            query: '',
            fragment: '',
            with() { return this; },
            toString() { return ''; }
        }), true);
    });
    test('isUriComponents', function () {
        assert.ok(isUriComponents(URI.file('a')));
        assert.ok(isUriComponents(URI.file('a').toJSON()));
        assert.ok(isUriComponents(URI.file('')));
        assert.ok(isUriComponents(URI.file('').toJSON()));
        assert.strictEqual(isUriComponents(1), false);
        assert.strictEqual(isUriComponents(true), false);
        assert.strictEqual(isUriComponents("true"), false);
        assert.strictEqual(isUriComponents({}), false);
        assert.strictEqual(isUriComponents({ scheme: '' }), true); // valid components but INVALID uri
        assert.strictEqual(isUriComponents({ scheme: 'fo' }), true);
        assert.strictEqual(isUriComponents({ scheme: 'fo', path: '/p' }), true);
        assert.strictEqual(isUriComponents({ path: '/p' }), false);
    });
    test('from, from(strict), revive', function () {
        assert.throws(() => URI.from({ scheme: '' }, true));
        assert.strictEqual(URI.from({ scheme: '' }).scheme, 'file');
        assert.strictEqual(URI.revive({ scheme: '' }).scheme, '');
    });
    test('Unable to open \'%A0.txt\': URI malformed #76506, part 2', function () {
        assert.strictEqual(URI.parse('file://some/%.txt').toString(), 'file://some/%25.txt');
        assert.strictEqual(URI.parse('file://some/%A0.txt').toString(), 'file://some/%25A0.txt');
    });
    test.skip('Links in markdown are broken if url contains encoded parameters #79474', function () {
        const strIn = 'https://myhost.com/Redirect?url=http%3A%2F%2Fwww.bing.com%3Fsearch%3Dtom';
        const uri1 = URI.parse(strIn);
        const strOut = uri1.toString();
        const uri2 = URI.parse(strOut);
        assert.strictEqual(uri1.scheme, uri2.scheme);
        assert.strictEqual(uri1.authority, uri2.authority);
        assert.strictEqual(uri1.path, uri2.path);
        assert.strictEqual(uri1.query, uri2.query);
        assert.strictEqual(uri1.fragment, uri2.fragment);
        assert.strictEqual(strIn, strOut); // fails here!!
    });
    test.skip('Uri#parse can break path-component #45515', function () {
        const strIn = 'https://firebasestorage.googleapis.com/v0/b/brewlangerie.appspot.com/o/products%2FzVNZkudXJyq8bPGTXUxx%2FBetterave-Sesame.jpg?alt=media&token=0b2310c4-3ea6-4207-bbde-9c3710ba0437';
        const uri1 = URI.parse(strIn);
        const strOut = uri1.toString();
        const uri2 = URI.parse(strOut);
        assert.strictEqual(uri1.scheme, uri2.scheme);
        assert.strictEqual(uri1.authority, uri2.authority);
        assert.strictEqual(uri1.path, uri2.path);
        assert.strictEqual(uri1.query, uri2.query);
        assert.strictEqual(uri1.fragment, uri2.fragment);
        assert.strictEqual(strIn, strOut); // fails here!!
    });
    test('URI - (de)serialize', function () {
        const values = [
            URI.parse('http://localhost:8080/far'),
            URI.file('c:\\test with %25\\c#code'),
            URI.file('\\\\shäres\\path\\c#\\plugin.json'),
            URI.parse('http://api/files/test.me?t=1234'),
            URI.parse('http://api/files/test.me?t=1234#fff'),
            URI.parse('http://api/files/test.me#fff'),
        ];
        // console.profile();
        // let c = 100000;
        // while (c-- > 0) {
        for (const value of values) {
            const data = value.toJSON();
            const clone = URI.revive(data);
            assert.strictEqual(clone.scheme, value.scheme);
            assert.strictEqual(clone.authority, value.authority);
            assert.strictEqual(clone.path, value.path);
            assert.strictEqual(clone.query, value.query);
            assert.strictEqual(clone.fragment, value.fragment);
            assert.strictEqual(clone.fsPath, value.fsPath);
            assert.strictEqual(clone.toString(), value.toString());
        }
        // }
        // console.profileEnd();
    });
    function assertJoined(base, fragment, expected, checkWithUrl = true) {
        const baseUri = URI.parse(base);
        const newUri = URI.joinPath(baseUri, fragment);
        const actual = newUri.toString(true);
        assert.strictEqual(actual, expected);
        if (checkWithUrl) {
            const actualUrl = new URL(fragment, base).href;
            assert.strictEqual(actualUrl, expected, 'DIFFERENT from URL');
        }
    }
    test('URI#joinPath', function () {
        assertJoined(('file:///foo/'), '../../bazz', 'file:///bazz');
        assertJoined(('file:///foo'), '../../bazz', 'file:///bazz');
        assertJoined(('file:///foo'), '../../bazz', 'file:///bazz');
        assertJoined(('file:///foo/bar/'), './bazz', 'file:///foo/bar/bazz');
        assertJoined(('file:///foo/bar'), './bazz', 'file:///foo/bar/bazz', false);
        assertJoined(('file:///foo/bar'), 'bazz', 'file:///foo/bar/bazz', false);
        // "auto-path" scheme
        assertJoined(('file:'), 'bazz', 'file:///bazz');
        assertJoined(('http://domain'), 'bazz', 'http://domain/bazz');
        assertJoined(('https://domain'), 'bazz', 'https://domain/bazz');
        assertJoined(('http:'), 'bazz', 'http:/bazz', false);
        assertJoined(('https:'), 'bazz', 'https:/bazz', false);
        // no "auto-path" scheme with and w/o paths
        assertJoined(('foo:/'), 'bazz', 'foo:/bazz');
        assertJoined(('foo://bar/'), 'bazz', 'foo://bar/bazz');
        // no "auto-path" + no path -> error
        assert.throws(() => assertJoined(('foo:'), 'bazz', ''));
        assert.throws(() => new URL('bazz', 'foo:'));
        assert.throws(() => assertJoined(('foo://bar'), 'bazz', ''));
        // assert.throws(() => new URL('bazz', 'foo://bar')); Edge, Chrome => THROW, Firefox, Safari => foo://bar/bazz
    });
    test('URI#joinPath (posix)', function () {
        if (isWindows) {
            this.skip();
        }
        assertJoined(('file:///c:/foo/'), '../../bazz', 'file:///bazz', false);
        assertJoined(('file://server/share/c:/'), '../../bazz', 'file://server/bazz', false);
        assertJoined(('file://server/share/c:'), '../../bazz', 'file://server/bazz', false);
        assertJoined(('file://ser/foo/'), '../../bazz', 'file://ser/bazz', false); // Firefox -> Different, Edge, Chrome, Safar -> OK
        assertJoined(('file://ser/foo'), '../../bazz', 'file://ser/bazz', false); // Firefox -> Different, Edge, Chrome, Safar -> OK
    });
    test('URI#joinPath (windows)', function () {
        if (!isWindows) {
            this.skip();
        }
        assertJoined(('file:///c:/foo/'), '../../bazz', 'file:///c:/bazz', false);
        assertJoined(('file://server/share/c:/'), '../../bazz', 'file://server/share/bazz', false);
        assertJoined(('file://server/share/c:'), '../../bazz', 'file://server/share/bazz', false);
        assertJoined(('file://ser/foo/'), '../../bazz', 'file://ser/foo/bazz', false);
        assertJoined(('file://ser/foo'), '../../bazz', 'file://ser/foo/bazz', false);
        //https://github.com/microsoft/vscode/issues/93831
        assertJoined('file:///c:/foo/bar', './other/foo.img', 'file:///c:/foo/bar/other/foo.img', false);
    });
    test('vscode-uri: URI.toString() wrongly encode IPv6 literals #154048', function () {
        assert.strictEqual(URI.parse('http://[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html').toString(), 'http://[fedc:ba98:7654:3210:fedc:ba98:7654:3210]:80/index.html');
        assert.strictEqual(URI.parse('http://user@[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html').toString(), 'http://user@[fedc:ba98:7654:3210:fedc:ba98:7654:3210]:80/index.html');
        assert.strictEqual(URI.parse('http://us[er@[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html').toString(), 'http://us%5Ber@[fedc:ba98:7654:3210:fedc:ba98:7654:3210]:80/index.html');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi91cmkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxHQUFHLEVBQWlCLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUdyRSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtJQUNqQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQ2xGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxJ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QUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGtDQUFrQyxDQUFDLENBQUM7UUFDbkssTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGtDQUFrQyxDQUFDLENBQUM7UUFDaE0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLG1DQUFtQyxDQUFDLENBQUM7UUFDbE0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGtDQUFrQyxDQUFDLENBQUM7UUFDaE0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLG1DQUFtQyxDQUFDLENBQUM7UUFDbE0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7SUFDL0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzVHLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNsSSxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDcEksTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDbkksTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDckksTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUNwRyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbEIsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV2QyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV2QyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU1RSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUV2RyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQywwSEFBMEgsQ0FBQyxDQUFDO1FBQzlJLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtGQUFrRixDQUFDLENBQUM7UUFDbkgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVwQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVwQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXZDLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXZDLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFdkMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUV4QyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMs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