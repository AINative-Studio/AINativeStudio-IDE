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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsR2xvYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cmwvY29tbW9uL3VybEdsb2IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsOEVBQThFO0FBQzlFLDREQUE0RDtBQUM1RCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEdBQVEsRUFBRSxPQUFlLEVBQVcsRUFBRTtJQUN4RSxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkUsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzNELE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0IsR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVyQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQzVELEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FDL0QsQ0FBQztJQUVGLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ25DLE9BQU8sVUFBVSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNaLE9BQU8sVUFBVSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxNQUFNLE1BQU0sT0FBTyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFHLENBQ2xCLElBQStCLEVBQy9CLEdBQVcsRUFDWCxPQUFlLEVBQ2YsU0FBaUIsRUFDakIsYUFBcUIsRUFDWCxFQUFFO0lBQ1osSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNwRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxhQUFhLENBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBRW5CLFdBQVc7SUFDWCxvQkFBb0I7SUFDcEIsSUFBSSxTQUFTLEtBQUssR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzlCLE9BQU8sYUFBYSxLQUFLLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDekMsQ0FBQztJQUVELDZCQUE2QjtJQUM3QixJQUFJLGFBQWEsS0FBSyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDdEMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1FBQy9DLGVBQWU7UUFDZixPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxTQUFTLEdBQUcsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxPQUFPLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ2xFLHNIQUFzSDtRQUN0SCxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsU0FBUyxHQUFHLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3BDLHdGQUF3RjtRQUN4RixJQUFJLFNBQVMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xDLDhEQUE4RDtZQUM5RCxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxTQUFTLEdBQUcsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsU0FBUyxHQUFHLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDbEUsMEZBQTBGO1FBQzFGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzVCLElBQUksWUFBWSxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUM7WUFDakMsR0FBRyxDQUFDO2dCQUFDLFlBQVksRUFBRSxDQUFDO1lBQUMsQ0FBQyxRQUFRLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUU7WUFDL0QsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9FLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDekUsQ0FBQyxDQUFDIn0=