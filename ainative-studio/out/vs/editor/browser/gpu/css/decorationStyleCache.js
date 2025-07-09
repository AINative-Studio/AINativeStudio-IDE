/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NKeyMap } from '../../../../base/common/map.js';
export class DecorationStyleCache {
    constructor() {
        this._nextId = 1;
        this._cacheById = new Map();
        this._cacheByStyle = new NKeyMap();
    }
    getOrCreateEntry(color, bold, opacity) {
        if (color === undefined && bold === undefined && opacity === undefined) {
            return 0;
        }
        const result = this._cacheByStyle.get(color ?? 0, bold ? 1 : 0, opacity === undefined ? '' : opacity.toFixed(2));
        if (result) {
            return result.id;
        }
        const id = this._nextId++;
        const entry = {
            id,
            color,
            bold,
            opacity,
        };
        this._cacheById.set(id, entry);
        this._cacheByStyle.set(entry, color ?? 0, bold ? 1 : 0, opacity === undefined ? '' : opacity.toFixed(2));
        return id;
    }
    getStyleSet(id) {
        if (id === 0) {
            return undefined;
        }
        return this._cacheById.get(id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblN0eWxlQ2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2Nzcy9kZWNvcmF0aW9uU3R5bGVDYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUF3QnpELE1BQU0sT0FBTyxvQkFBb0I7SUFBakM7UUFFUyxZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBRUgsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBQzNELGtCQUFhLEdBQUcsSUFBSSxPQUFPLEVBQXdELENBQUM7SUFnQ3RHLENBQUM7SUE5QkEsZ0JBQWdCLENBQ2YsS0FBeUIsRUFDekIsSUFBeUIsRUFDekIsT0FBMkI7UUFFM0IsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxTQUFTLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hFLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqSCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUc7WUFDYixFQUFFO1lBQ0YsS0FBSztZQUNMLElBQUk7WUFDSixPQUFPO1NBQ1AsQ0FBQztRQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pHLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELFdBQVcsQ0FBQyxFQUFVO1FBQ3JCLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2QsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUNEIn0=