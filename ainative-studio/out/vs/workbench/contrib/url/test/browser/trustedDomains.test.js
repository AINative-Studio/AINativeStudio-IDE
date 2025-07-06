/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { isURLDomainTrusted } from '../../common/trustedDomains.js';
function linkAllowedByRules(link, rules) {
    assert.ok(isURLDomainTrusted(URI.parse(link), rules), `Link\n${link}\n should be allowed by rules\n${JSON.stringify(rules)}`);
}
function linkNotAllowedByRules(link, rules) {
    assert.ok(!isURLDomainTrusted(URI.parse(link), rules), `Link\n${link}\n should NOT be allowed by rules\n${JSON.stringify(rules)}`);
}
suite('Link protection domain matching', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('simple', () => {
        linkNotAllowedByRules('https://x.org', []);
        linkAllowedByRules('https://x.org', ['https://x.org']);
        linkAllowedByRules('https://x.org/foo', ['https://x.org']);
        linkNotAllowedByRules('https://x.org', ['http://x.org']);
        linkNotAllowedByRules('http://x.org', ['https://x.org']);
        linkNotAllowedByRules('https://www.x.org', ['https://x.org']);
        linkAllowedByRules('https://www.x.org', ['https://www.x.org', 'https://y.org']);
    });
    test('localhost', () => {
        linkAllowedByRules('https://127.0.0.1', []);
        linkAllowedByRules('https://127.0.0.1:3000', []);
        linkAllowedByRules('https://localhost', []);
        linkAllowedByRules('https://localhost:3000', []);
    });
    test('* star', () => {
        linkAllowedByRules('https://a.x.org', ['https://*.x.org']);
        linkAllowedByRules('https://a.b.x.org', ['https://*.x.org']);
    });
    test('no scheme', () => {
        linkAllowedByRules('https://a.x.org', ['a.x.org']);
        linkAllowedByRules('https://a.x.org', ['*.x.org']);
        linkAllowedByRules('https://a.b.x.org', ['*.x.org']);
        linkAllowedByRules('https://x.org', ['*.x.org']);
    });
    test('sub paths', () => {
        linkAllowedByRules('https://x.org/foo', ['https://x.org/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo']);
        linkAllowedByRules('https://x.org/foo', ['https://x.org/foo/']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo/']);
        linkAllowedByRules('https://x.org/foo', ['x.org/foo']);
        linkAllowedByRules('https://x.org/foo', ['*.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['https://x.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['x.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['*.org/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo']);
        linkNotAllowedByRules('https://x.org/foo2', ['https://x.org/foo']);
        linkNotAllowedByRules('https://www.x.org/foo', ['https://x.org/foo']);
        linkNotAllowedByRules('https://a.x.org/bar', ['https://*.x.org/foo']);
        linkNotAllowedByRules('https://a.b.x.org/bar', ['https://*.x.org/foo']);
        linkAllowedByRules('https://github.com', ['https://github.com/foo/bar', 'https://github.com']);
    });
    test('ports', () => {
        linkNotAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:8081/foo']);
        linkAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:*/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org:*/foo']);
        linkAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:8080/foo']);
    });
    test('ip addresses', () => {
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7/']);
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7']);
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.*']);
        linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:3000/']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:*']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.*:*']);
        linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
    });
    test('scheme match', () => {
        linkAllowedByRules('http://192.168.1.7/', ['http://*']);
        linkAllowedByRules('http://twitter.com', ['http://*']);
        linkAllowedByRules('http://twitter.com/hello', ['http://*']);
        linkNotAllowedByRules('https://192.168.1.7/', ['http://*']);
        linkNotAllowedByRules('https://twitter.com/', ['http://*']);
    });
    test('case normalization', () => {
        // https://github.com/microsoft/vscode/issues/99294
        linkAllowedByRules('https://github.com/microsoft/vscode/issues/new', ['https://github.com/microsoft']);
        linkAllowedByRules('https://github.com/microsoft/vscode/issues/new', ['https://github.com/microsoft']);
    });
    test('ignore query & fragment - https://github.com/microsoft/vscode/issues/156839', () => {
        linkAllowedByRules('https://github.com/login/oauth/authorize?foo=4', ['https://github.com/login/oauth/authorize']);
        linkAllowedByRules('https://github.com/login/oauth/authorize#foo', ['https://github.com/login/oauth/authorize']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC90ZXN0L2Jyb3dzZXIvdHJ1c3RlZERvbWFpbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXBFLFNBQVMsa0JBQWtCLENBQUMsSUFBWSxFQUFFLEtBQWU7SUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLFNBQVMsSUFBSSxrQ0FBa0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDL0gsQ0FBQztBQUNELFNBQVMscUJBQXFCLENBQUMsSUFBWSxFQUFFLEtBQWU7SUFDM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsU0FBUyxJQUFJLHNDQUFzQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwSSxDQUFDO0FBRUQsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUM3Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBQzFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FB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