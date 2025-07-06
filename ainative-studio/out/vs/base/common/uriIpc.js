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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vdXJpSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFHdkMsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxVQUFVLENBQUM7QUF1QjlDLFNBQVMsTUFBTSxDQUFDLEdBQVE7SUFDdkIsT0FBMkIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3pDLENBQUM7QUFFRCxNQUFNLE9BQU8sY0FBYztJQUkxQixZQUFZLGNBQWtDO1FBQzdDLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFDO0lBQ3ZDLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxHQUFrQjtRQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNELE9BQU8sQ0FBQyxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU0saUJBQWlCLENBQUMsR0FBa0I7UUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzRCxPQUFPLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVNLG9CQUFvQixDQUFDLEdBQVE7UUFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzRCxPQUFPLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVNLHVCQUF1QixDQUFDLE1BQWM7UUFDNUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdELENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFvQixJQUFJO0lBQ3pELGlCQUFpQixDQUFDLEdBQWtCO1FBQ25DLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUVELGlCQUFpQixDQUFDLEdBQWtCO1FBQ25DLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUVELG9CQUFvQixDQUFDLEdBQVE7UUFDNUIsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRUQsdUJBQXVCLENBQUMsTUFBYztRQUNyQyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7Q0FDRCxDQUFDO0FBRUYsU0FBUyxzQkFBc0IsQ0FBQyxHQUFRLEVBQUUsV0FBNEIsRUFBRSxLQUFhO0lBRXBGLElBQUksQ0FBQyxHQUFHLElBQUksS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDN0IsSUFBSSxHQUFHLFlBQVksR0FBRyxFQUFFLENBQUM7WUFDeEIsT0FBTyxXQUFXLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixLQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQyxHQUFHLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNuRSxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDaEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFJLEdBQU0sRUFBRSxXQUE0QjtJQUM1RSxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNELElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3JCLFlBQVk7UUFDWixPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFHRCxTQUFTLHNCQUFzQixDQUFDLEdBQVEsRUFBRSxXQUE0QixFQUFFLE1BQWUsRUFBRSxLQUFhO0lBRXJHLElBQUksQ0FBQyxHQUFHLElBQUksS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7UUFFN0IsSUFBdUIsR0FBSSxDQUFDLElBQUksNkJBQXFCLEVBQUUsQ0FBQztZQUN2RCxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JHLENBQUM7UUFFRCxJQUFJLEdBQUcsWUFBWSxRQUFRLEVBQUUsQ0FBQztZQUM3QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCx5QkFBeUI7UUFDekIsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUN2QixJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxNQUFNLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzNFLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUNoQixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUksR0FBTSxFQUFFLFdBQTRCO0lBQzVFLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3JCLFlBQVk7UUFDWixPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsOEJBQThCLENBQUksR0FBTSxFQUFFLFdBQTRCO0lBQ3JGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3JCLFlBQVk7UUFDWixPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==