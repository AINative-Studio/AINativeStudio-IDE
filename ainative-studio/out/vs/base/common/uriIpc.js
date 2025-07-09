/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from './buffer.js';
import { URI } from './uri.js';
function toJSON(uri) {
    return uri.toJSON();
}
export class URITransformer {
    constructor(uriTransformer) {
        this._uriTransformer = uriTransformer;
    }
    transformIncoming(uri) {
        const result = this._uriTransformer.transformIncoming(uri);
        return (result === uri ? uri : toJSON(URI.from(result)));
    }
    transformOutgoing(uri) {
        const result = this._uriTransformer.transformOutgoing(uri);
        return (result === uri ? uri : toJSON(URI.from(result)));
    }
    transformOutgoingURI(uri) {
        const result = this._uriTransformer.transformOutgoing(uri);
        return (result === uri ? uri : URI.from(result));
    }
    transformOutgoingScheme(scheme) {
        return this._uriTransformer.transformOutgoingScheme(scheme);
    }
}
export const DefaultURITransformer = new class {
    transformIncoming(uri) {
        return uri;
    }
    transformOutgoing(uri) {
        return uri;
    }
    transformOutgoingURI(uri) {
        return uri;
    }
    transformOutgoingScheme(scheme) {
        return scheme;
    }
};
function _transformOutgoingURIs(obj, transformer, depth) {
    if (!obj || depth > 200) {
        return null;
    }
    if (typeof obj === 'object') {
        if (obj instanceof URI) {
            return transformer.transformOutgoing(obj);
        }
        // walk object (or array)
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const r = _transformOutgoingURIs(obj[key], transformer, depth + 1);
                if (r !== null) {
                    obj[key] = r;
                }
            }
        }
    }
    return null;
}
export function transformOutgoingURIs(obj, transformer) {
    const result = _transformOutgoingURIs(obj, transformer, 0);
    if (result === null) {
        // no change
        return obj;
    }
    return result;
}
function _transformIncomingURIs(obj, transformer, revive, depth) {
    if (!obj || depth > 200) {
        return null;
    }
    if (typeof obj === 'object') {
        if (obj.$mid === 1 /* MarshalledId.Uri */) {
            return revive ? URI.revive(transformer.transformIncoming(obj)) : transformer.transformIncoming(obj);
        }
        if (obj instanceof VSBuffer) {
            return null;
        }
        // walk object (or array)
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const r = _transformIncomingURIs(obj[key], transformer, revive, depth + 1);
                if (r !== null) {
                    obj[key] = r;
                }
            }
        }
    }
    return null;
}
export function transformIncomingURIs(obj, transformer) {
    const result = _transformIncomingURIs(obj, transformer, false, 0);
    if (result === null) {
        // no change
        return obj;
    }
    return result;
}
export function transformAndReviveIncomingURIs(obj, transformer) {
    const result = _transformIncomingURIs(obj, transformer, true, 0);
    if (result === null) {
        // no change
        return obj;
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3VyaUlwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBR3ZDLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sVUFBVSxDQUFDO0FBdUI5QyxTQUFTLE1BQU0sQ0FBQyxHQUFRO0lBQ3ZCLE9BQTJCLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUN6QyxDQUFDO0FBRUQsTUFBTSxPQUFPLGNBQWM7SUFJMUIsWUFBWSxjQUFrQztRQUM3QyxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztJQUN2QyxDQUFDO0lBRU0saUJBQWlCLENBQUMsR0FBa0I7UUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzRCxPQUFPLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVNLGlCQUFpQixDQUFDLEdBQWtCO1FBQzFDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0QsT0FBTyxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxHQUFRO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0QsT0FBTyxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFTSx1QkFBdUIsQ0FBQyxNQUFjO1FBQzVDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBb0IsSUFBSTtJQUN6RCxpQkFBaUIsQ0FBQyxHQUFrQjtRQUNuQyxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxHQUFrQjtRQUNuQyxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxHQUFRO1FBQzVCLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUVELHVCQUF1QixDQUFDLE1BQWM7UUFDckMsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0NBQ0QsQ0FBQztBQUVGLFNBQVMsc0JBQXNCLENBQUMsR0FBUSxFQUFFLFdBQTRCLEVBQUUsS0FBYTtJQUVwRixJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUN6QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzdCLElBQUksR0FBRyxZQUFZLEdBQUcsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFFRCx5QkFBeUI7UUFDekIsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUN2QixJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxNQUFNLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ2hCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2QsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBSSxHQUFNLEVBQUUsV0FBNEI7SUFDNUUsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRCxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNyQixZQUFZO1FBQ1osT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBR0QsU0FBUyxzQkFBc0IsQ0FBQyxHQUFRLEVBQUUsV0FBNEIsRUFBRSxNQUFlLEVBQUUsS0FBYTtJQUVyRyxJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUN6QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBRTdCLElBQXVCLEdBQUksQ0FBQyxJQUFJLDZCQUFxQixFQUFFLENBQUM7WUFDdkQsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyRyxDQUFDO1FBRUQsSUFBSSxHQUFHLFlBQVksUUFBUSxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7WUFDdkIsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsTUFBTSxDQUFDLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMzRSxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDaEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFJLEdBQU0sRUFBRSxXQUE0QjtJQUM1RSxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRSxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNyQixZQUFZO1FBQ1osT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLDhCQUE4QixDQUFJLEdBQU0sRUFBRSxXQUE0QjtJQUNyRixNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqRSxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNyQixZQUFZO1FBQ1osT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDIn0=