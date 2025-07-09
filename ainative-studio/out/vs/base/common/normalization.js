/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LRUCache } from './map.js';
const nfcCache = new LRUCache(10000); // bounded to 10000 elements
export function normalizeNFC(str) {
    return normalize(str, 'NFC', nfcCache);
}
const nfdCache = new LRUCache(10000); // bounded to 10000 elements
export function normalizeNFD(str) {
    return normalize(str, 'NFD', nfdCache);
}
const nonAsciiCharactersPattern = /[^\u0000-\u0080]/;
function normalize(str, form, normalizedCache) {
    if (!str) {
        return str;
    }
    const cached = normalizedCache.get(str);
    if (cached) {
        return cached;
    }
    let res;
    if (nonAsciiCharactersPattern.test(str)) {
        res = str.normalize(form);
    }
    else {
        res = str;
    }
    // Use the cache for fast lookup
    normalizedCache.set(str, res);
    return res;
}
export const removeAccents = (function () {
    // transform into NFD form and remove accents
    // see: https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript/37511463#37511463
    const regex = /[\u0300-\u036f]/g;
    return function (str) {
        return normalizeNFD(str).replace(regex, '');
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9ybWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9ub3JtYWxpemF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQWlCLEtBQUssQ0FBQyxDQUFDLENBQUMsNEJBQTRCO0FBQ2xGLE1BQU0sVUFBVSxZQUFZLENBQUMsR0FBVztJQUN2QyxPQUFPLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBaUIsS0FBSyxDQUFDLENBQUMsQ0FBQyw0QkFBNEI7QUFDbEYsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFXO0lBQ3ZDLE9BQU8sU0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUVELE1BQU0seUJBQXlCLEdBQUcsa0JBQWtCLENBQUM7QUFDckQsU0FBUyxTQUFTLENBQUMsR0FBVyxFQUFFLElBQVksRUFBRSxlQUF5QztJQUN0RixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDVixPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxJQUFJLEdBQVcsQ0FBQztJQUNoQixJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3pDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNCLENBQUM7U0FBTSxDQUFDO1FBQ1AsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNYLENBQUM7SUFFRCxnQ0FBZ0M7SUFDaEMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFOUIsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUE0QixDQUFDO0lBQ3RELDZDQUE2QztJQUM3Qyx3SEFBd0g7SUFDeEgsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUM7SUFDakMsT0FBTyxVQUFVLEdBQVc7UUFDM0IsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDIn0=