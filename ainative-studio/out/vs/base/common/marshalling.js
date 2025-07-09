/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from './buffer.js';
import { URI } from './uri.js';
export function stringify(obj) {
    return JSON.stringify(obj, replacer);
}
export function parse(text) {
    let data = JSON.parse(text);
    data = revive(data);
    return data;
}
function replacer(key, value) {
    // URI is done via toJSON-member
    if (value instanceof RegExp) {
        return {
            $mid: 2 /* MarshalledId.Regexp */,
            source: value.source,
            flags: value.flags,
        };
    }
    return value;
}
export function revive(obj, depth = 0) {
    if (!obj || depth > 200) {
        return obj;
    }
    if (typeof obj === 'object') {
        switch (obj.$mid) {
            case 1 /* MarshalledId.Uri */: return URI.revive(obj);
            case 2 /* MarshalledId.Regexp */: return new RegExp(obj.source, obj.flags);
            case 17 /* MarshalledId.Date */: return new Date(obj.source);
        }
        if (obj instanceof VSBuffer
            || obj instanceof Uint8Array) {
            return obj;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; ++i) {
                obj[i] = revive(obj[i], depth + 1);
            }
        }
        else {
            // walk object
            for (const key in obj) {
                if (Object.hasOwnProperty.call(obj, key)) {
                    obj[key] = revive(obj[key], depth + 1);
                }
            }
        }
    }
    return obj;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyc2hhbGxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbWFyc2hhbGxpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN2QyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLFVBQVUsQ0FBQztBQUc5QyxNQUFNLFVBQVUsU0FBUyxDQUFDLEdBQVE7SUFDakMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRUQsTUFBTSxVQUFVLEtBQUssQ0FBQyxJQUFZO0lBQ2pDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUIsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQixPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFNRCxTQUFTLFFBQVEsQ0FBQyxHQUFXLEVBQUUsS0FBVTtJQUN4QyxnQ0FBZ0M7SUFDaEMsSUFBSSxLQUFLLFlBQVksTUFBTSxFQUFFLENBQUM7UUFDN0IsT0FBTztZQUNOLElBQUksNkJBQXFCO1lBQ3pCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7U0FDbEIsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFXRCxNQUFNLFVBQVUsTUFBTSxDQUFVLEdBQVEsRUFBRSxLQUFLLEdBQUcsQ0FBQztJQUNsRCxJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUN6QixPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBRTdCLFFBQTJCLEdBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN0Qyw2QkFBcUIsQ0FBQyxDQUFDLE9BQVksR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuRCxnQ0FBd0IsQ0FBQyxDQUFDLE9BQVksSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEUsK0JBQXNCLENBQUMsQ0FBQyxPQUFZLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsSUFDQyxHQUFHLFlBQVksUUFBUTtlQUNwQixHQUFHLFlBQVksVUFBVSxFQUMzQixDQUFDO1lBQ0YsT0FBWSxHQUFHLENBQUM7UUFDakIsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNwQyxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxjQUFjO1lBQ2QsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDMUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDIn0=