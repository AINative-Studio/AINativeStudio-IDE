/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class CachedKeyboardMapper {
    constructor(actual) {
        this._actual = actual;
        this._cache = new Map();
    }
    dumpDebugInfo() {
        return this._actual.dumpDebugInfo();
    }
    resolveKeyboardEvent(keyboardEvent) {
        return this._actual.resolveKeyboardEvent(keyboardEvent);
    }
    resolveKeybinding(keybinding) {
        const hashCode = keybinding.getHashCode();
        const resolved = this._cache.get(hashCode);
        if (!resolved) {
            const r = this._actual.resolveKeybinding(keybinding);
            this._cache.set(hashCode, r);
            return r;
        }
        return resolved;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRNYXBwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5Ym9hcmRMYXlvdXQvY29tbW9uL2tleWJvYXJkTWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLE1BQU0sT0FBTyxvQkFBb0I7SUFLaEMsWUFBWSxNQUF1QjtRQUNsQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO0lBQ3ZELENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRU0sb0JBQW9CLENBQUMsYUFBNkI7UUFDeEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxVQUFzQjtRQUM5QyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0IsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztDQUNEIn0=