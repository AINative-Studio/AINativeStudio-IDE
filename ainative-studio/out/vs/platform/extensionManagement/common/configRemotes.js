/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
const SshProtocolMatcher = /^([^@:]+@)?([^:]+):/;
const SshUrlMatcher = /^([^@:]+@)?([^:]+):(.+)$/;
const AuthorityMatcher = /^([^@]+@)?([^:]+)(:\d+)?$/;
const SecondLevelDomainMatcher = /([^@:.]+\.[^@:.]+)(:\d+)?$/;
const RemoteMatcher = /^\s*url\s*=\s*(.+\S)\s*$/mg;
const AnyButDot = /[^.]/g;
export const AllowedSecondLevelDomains = [
    'github.com',
    'bitbucket.org',
    'visualstudio.com',
    'gitlab.com',
    'heroku.com',
    'azurewebsites.net',
    'ibm.com',
    'amazon.com',
    'amazonaws.com',
    'cloudapp.net',
    'rhcloud.com',
    'google.com',
    'azure.com'
];
function stripLowLevelDomains(domain) {
    const match = domain.match(SecondLevelDomainMatcher);
    return match ? match[1] : null;
}
function extractDomain(url) {
    if (url.indexOf('://') === -1) {
        const match = url.match(SshProtocolMatcher);
        if (match) {
            return stripLowLevelDomains(match[2]);
        }
        else {
            return null;
        }
    }
    try {
        const uri = URI.parse(url);
        if (uri.authority) {
            return stripLowLevelDomains(uri.authority);
        }
    }
    catch (e) {
        // ignore invalid URIs
    }
    return null;
}
export function getDomainsOfRemotes(text, allowedDomains) {
    const domains = new Set();
    let match;
    while (match = RemoteMatcher.exec(text)) {
        const domain = extractDomain(match[1]);
        if (domain) {
            domains.add(domain);
        }
    }
    const allowedDomainsSet = new Set(allowedDomains);
    return Array.from(domains)
        .map(key => allowedDomainsSet.has(key) ? key : key.replace(AnyButDot, 'a'));
}
function stripPort(authority) {
    const match = authority.match(AuthorityMatcher);
    return match ? match[2] : null;
}
function normalizeRemote(host, path, stripEndingDotGit) {
    if (host && path) {
        if (stripEndingDotGit && path.endsWith('.git')) {
            path = path.substr(0, path.length - 4);
        }
        return (path.indexOf('/') === 0) ? `${host}${path}` : `${host}/${path}`;
    }
    return null;
}
function extractRemote(url, stripEndingDotGit) {
    if (url.indexOf('://') === -1) {
        const match = url.match(SshUrlMatcher);
        if (match) {
            return normalizeRemote(match[2], match[3], stripEndingDotGit);
        }
    }
    try {
        const uri = URI.parse(url);
        if (uri.authority) {
            return normalizeRemote(stripPort(uri.authority), uri.path, stripEndingDotGit);
        }
    }
    catch (e) {
        // ignore invalid URIs
    }
    return null;
}
export function getRemotes(text, stripEndingDotGit = false) {
    const remotes = [];
    let match;
    while (match = RemoteMatcher.exec(text)) {
        const remote = extractRemote(match[1], stripEndingDotGit);
        if (remote) {
            remotes.push(remote);
        }
    }
    return remotes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnUmVtb3Rlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9jb25maWdSZW1vdGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUVsRCxNQUFNLGtCQUFrQixHQUFHLHFCQUFxQixDQUFDO0FBQ2pELE1BQU0sYUFBYSxHQUFHLDBCQUEwQixDQUFDO0FBQ2pELE1BQU0sZ0JBQWdCLEdBQUcsMkJBQTJCLENBQUM7QUFDckQsTUFBTSx3QkFBd0IsR0FBRyw0QkFBNEIsQ0FBQztBQUM5RCxNQUFNLGFBQWEsR0FBRyw0QkFBNEIsQ0FBQztBQUNuRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUM7QUFFMUIsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUc7SUFDeEMsWUFBWTtJQUNaLGVBQWU7SUFDZixrQkFBa0I7SUFDbEIsWUFBWTtJQUNaLFlBQVk7SUFDWixtQkFBbUI7SUFDbkIsU0FBUztJQUNULFlBQVk7SUFDWixlQUFlO0lBQ2YsY0FBYztJQUNkLGFBQWE7SUFDYixZQUFZO0lBQ1osV0FBVztDQUNYLENBQUM7QUFFRixTQUFTLG9CQUFvQixDQUFDLE1BQWM7SUFDM0MsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3JELE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNoQyxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsR0FBVztJQUNqQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxD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