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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvdGVzdC9icm93c2VyL3RydXN0ZWREb21haW5zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVwRSxTQUFTLGtCQUFrQixDQUFDLElBQVksRUFBRSxLQUFlO0lBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxTQUFTLElBQUksa0NBQWtDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQy9ILENBQUM7QUFDRCxTQUFTLHFCQUFxQixDQUFDLElBQVksRUFBRSxLQUFlO0lBQzNELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLFNBQVMsSUFBSSxzQ0FBc0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDcEksQ0FBQztBQUVELEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDN0MsdUNBQXVDLEVBQUUsQ0FBQztJQUMxQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtR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