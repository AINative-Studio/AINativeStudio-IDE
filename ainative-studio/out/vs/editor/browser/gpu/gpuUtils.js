/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../base/common/errors.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
export const quadVertices = new Float32Array([
    1, 0,
    1, 1,
    0, 1,
    0, 0,
    0, 1,
    1, 0,
]);
export function ensureNonNullable(value) {
    if (!value) {
        throw new Error(`Value "${value}" cannot be null`);
    }
    return value;
}
// TODO: Move capabilities into ElementSizeObserver?
export function observeDevicePixelDimensions(element, parentWindow, callback) {
    // Observe any resizes to the element and extract the actual pixel size of the element if the
    // devicePixelContentBoxSize API is supported. This allows correcting rounding errors when
    // converting between CSS pixels and device pixels which causes blurry rendering when device
    // pixel ratio is not a round number.
    let observer = new parentWindow.ResizeObserver((entries) => {
        const entry = entries.find((entry) => entry.target === element);
        if (!entry) {
            return;
        }
        // Disconnect if devicePixelContentBoxSize isn't supported by the browser
        if (!('devicePixelContentBoxSize' in entry)) {
            observer?.disconnect();
            observer = undefined;
            return;
        }
        // Fire the callback, ignore events where the dimensions are 0x0 as the canvas is likely hidden
        const width = entry.devicePixelContentBoxSize[0].inlineSize;
        const height = entry.devicePixelContentBoxSize[0].blockSize;
        if (width > 0 && height > 0) {
            callback(width, height);
        }
    });
    try {
        observer.observe(element, { box: ['device-pixel-content-box'] });
    }
    catch {
        observer.disconnect();
        observer = undefined;
        throw new BugIndicatingError('Could not observe device pixel dimensions');
    }
    return toDisposable(() => observer?.disconnect());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B1VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2dwdVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQW9CLE1BQU0sbUNBQW1DLENBQUM7QUFFbkYsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDO0lBQzVDLENBQUMsRUFBRSxDQUFDO0lBQ0osQ0FBQyxFQUFFLENBQUM7SUFDSixDQUFDLEVBQUUsQ0FBQztJQUNKLENBQUMsRUFBRSxDQUFDO0lBQ0osQ0FBQyxFQUFFLENBQUM7SUFDSixDQUFDLEVBQUUsQ0FBQztDQUNKLENBQUMsQ0FBQztBQUVILE1BQU0sVUFBVSxpQkFBaUIsQ0FBSSxLQUFlO0lBQ25ELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLGtCQUFrQixDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELG9EQUFvRDtBQUNwRCxNQUFNLFVBQVUsNEJBQTRCLENBQUMsT0FBb0IsRUFBRSxZQUF3QyxFQUFFLFFBQTZEO0lBQ3pLLDZGQUE2RjtJQUM3RiwwRkFBMEY7SUFDMUYsNEZBQTRGO0lBQzVGLHFDQUFxQztJQUNyQyxJQUFJLFFBQVEsR0FBK0IsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDdEYsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPO1FBQ1IsQ0FBQztRQUVELHlFQUF5RTtRQUN6RSxJQUFJLENBQUMsQ0FBQywyQkFBMkIsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdDLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQztZQUN2QixRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQ3JCLE9BQU87UUFDUixDQUFDO1FBRUQsK0ZBQStGO1FBQy9GLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFDNUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUM1RCxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDO1FBQ0osUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxFQUFTLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1IsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3RCLFFBQVEsR0FBRyxTQUFTLENBQUM7UUFDckIsTUFBTSxJQUFJLGtCQUFrQixDQUFDLDJDQUEyQyxDQUFDLENBQUM7SUFDM0UsQ0FBQztJQUNELE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ25ELENBQUMifQ==