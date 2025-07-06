/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// TODO: rewrite this to use URIs directly and validate each part individually
// instead of relying on memoization of the stringified URI.
export const testUrlMatchesGlob = (uri, globUrl) => {
    let url = uri.with({ query: null, fragment: null }).toString(true);
    const normalize = (url) => url.replace(/\/+$/, '');
    globUrl = normalize(globUrl);
    url = normalize(url);
    const memo = Array.from({ length: url.length + 1 }).map(() => Array.from({ length: globUrl.length + 1 }).map(() => undefined));
    if (/^[^./:]*:\/\//.test(globUrl)) {
        return doUrlMatch(memo, url, globUrl, 0, 0);
    }
    const scheme = /^(https?):\/\//.exec(url)?.[1];
    if (scheme) {
        return doUrlMatch(memo, url, `${scheme}://${globUrl}`, 0, 0);
    }
    return false;
};
const doUrlMatch = (memo, url, globUrl, urlOffset, globUrlOffset) => {
    if (memo[urlOffset]?.[globUrlOffset] !== undefined) {
        return memo[urlOffset][globUrlOffset];
    }
    const options = [];
    // Endgame.
    // Fully exact match
    if (urlOffset === url.length) {
        return globUrlOffset === globUrl.length;
    }
    // Some path remaining in url
    if (globUrlOffset === globUrl.length) {
        const remaining = url.slice(urlOffset);
        return remaining[0] === '/';
    }
    if (url[urlOffset] === globUrl[globUrlOffset]) {
        // Exact match.
        options.push(doUrlMatch(memo, url, globUrl, urlOffset + 1, globUrlOffset + 1));
    }
    if (globUrl[globUrlOffset] + globUrl[globUrlOffset + 1] === '*.') {
        // Any subdomain match. Either consume one thing that's not a / or : and don't advance base or consume nothing and do.
        if (!['/', ':'].includes(url[urlOffset])) {
            options.push(doUrlMatch(memo, url, globUrl, urlOffset + 1, globUrlOffset));
        }
        options.push(doUrlMatch(memo, url, globUrl, urlOffset, globUrlOffset + 2));
    }
    if (globUrl[globUrlOffset] === '*') {
        // Any match. Either consume one thing and don't advance base or consume nothing and do.
        if (urlOffset + 1 === url.length) {
            // If we're at the end of the input url consume one from both.
            options.push(doUrlMatch(memo, url, globUrl, urlOffset + 1, globUrlOffset + 1));
        }
        else {
            options.push(doUrlMatch(memo, url, globUrl, urlOffset + 1, globUrlOffset));
        }
        options.push(doUrlMatch(memo, url, globUrl, urlOffset, globUrlOffset + 1));
    }
    if (globUrl[globUrlOffset] + globUrl[globUrlOffset + 1] === ':*') {
        // any port match. Consume a port if it exists otherwise nothing. Always comsume the base.
        if (url[urlOffset] === ':') {
            let endPortIndex = urlOffset + 1;
            do {
                endPortIndex++;
            } while (/[0-9]/.test(url[endPortIndex]));
            options.push(doUrlMatch(memo, url, globUrl, endPortIndex, globUrlOffset + 2));
        }
        else {
            options.push(doUrlMatch(memo, url, globUrl, urlOffset, globUrlOffset + 2));
        }
    }
    return (memo[urlOffset][globUrlOffset] = options.some(a => a === true));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsR2xvYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC9jb21tb24vdXJsR2xvYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyw4RUFBOEU7QUFDOUUsNERBQTREO0FBQzVELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLENBQUMsR0FBUSxFQUFFLE9BQWUsRUFBVyxFQUFFO0lBQ3hFLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRSxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDM0QsT0FBTyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QixHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXJCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FDNUQsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUMvRCxDQUFDO0lBRUYsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDbkMsT0FBTyxVQUFVLENB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