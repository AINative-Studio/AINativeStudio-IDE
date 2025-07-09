/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toUint8 } from '../../../base/common/uint.js';
/**
 * A fast character classifier that uses a compact array for ASCII values.
 */
export class CharacterClassifier {
    constructor(_defaultValue) {
        const defaultValue = toUint8(_defaultValue);
        this._defaultValue = defaultValue;
        this._asciiMap = CharacterClassifier._createAsciiMap(defaultValue);
        this._map = new Map();
    }
    static _createAsciiMap(defaultValue) {
        const asciiMap = new Uint8Array(256);
        asciiMap.fill(defaultValue);
        return asciiMap;
    }
    set(charCode, _value) {
        const value = toUint8(_value);
        if (charCode >= 0 && charCode < 256) {
            this._asciiMap[charCode] = value;
        }
        else {
            this._map.set(charCode, value);
        }
    }
    get(charCode) {
        if (charCode >= 0 && charCode < 256) {
            return this._asciiMap[charCode];
        }
        else {
            return (this._map.get(charCode) || this._defaultValue);
        }
    }
    clear() {
        this._asciiMap.fill(this._defaultValue);
        this._map.clear();
    }
}
var Boolean;
(function (Boolean) {
    Boolean[Boolean["False"] = 0] = "False";
    Boolean[Boolean["True"] = 1] = "True";
})(Boolean || (Boolean = {}));
export class CharacterSet {
    constructor() {
        this._actual = new CharacterClassifier(0 /* Boolean.False */);
    }
    add(charCode) {
        this._actual.set(charCode, 1 /* Boolean.True */);
    }
    has(charCode) {
        return (this._actual.get(charCode) === 1 /* Boolean.True */);
    }
    clear() {
        return this._actual.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyQ2xhc3NpZmllci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvY2hhcmFjdGVyQ2xhc3NpZmllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFdkQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sbUJBQW1CO0lBYS9CLFlBQVksYUFBZ0I7UUFDM0IsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxTQUFTLEdBQUcsbUJBQW1CLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFDdkMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBb0I7UUFDbEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM1QixPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQWdCLEVBQUUsTUFBUztRQUNyQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFOUIsSUFBSSxRQUFRLElBQUksQ0FBQyxJQUFJLFFBQVEsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUNsQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUFnQjtRQUMxQixJQUFJLFFBQVEsSUFBSSxDQUFDLElBQUksUUFBUSxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ3JDLE9BQVUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDM0QsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbkIsQ0FBQztDQUNEO0FBRUQsSUFBVyxPQUdWO0FBSEQsV0FBVyxPQUFPO0lBQ2pCLHVDQUFTLENBQUE7SUFDVCxxQ0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhVLE9BQU8sS0FBUCxPQUFPLFFBR2pCO0FBRUQsTUFBTSxPQUFPLFlBQVk7SUFJeEI7UUFDQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksbUJBQW1CLHVCQUF3QixDQUFDO0lBQ2hFLENBQUM7SUFFTSxHQUFHLENBQUMsUUFBZ0I7UUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSx1QkFBZSxDQUFDO0lBQzFDLENBQUM7SUFFTSxHQUFHLENBQUMsUUFBZ0I7UUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBaUIsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTSxLQUFLO1FBQ1gsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzdCLENBQUM7Q0FDRCJ9