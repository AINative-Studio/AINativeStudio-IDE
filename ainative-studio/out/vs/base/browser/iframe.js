/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const sameOriginWindowChainCache = new WeakMap();
function getParentWindowIfSameOrigin(w) {
    if (!w.parent || w.parent === w) {
        return null;
    }
    // Cannot really tell if we have access to the parent window unless we try to access something in it
    try {
        const location = w.location;
        const parentLocation = w.parent.location;
        if (location.origin !== 'null' && parentLocation.origin !== 'null' && location.origin !== parentLocation.origin) {
            return null;
        }
    }
    catch (e) {
        return null;
    }
    return w.parent;
}
export class IframeUtils {
    /**
     * Returns a chain of embedded windows with the same origin (which can be accessed programmatically).
     * Having a chain of length 1 might mean that the current execution environment is running outside of an iframe or inside an iframe embedded in a window with a different origin.
     */
    static getSameOriginWindowChain(targetWindow) {
        let windowChainCache = sameOriginWindowChainCache.get(targetWindow);
        if (!windowChainCache) {
            windowChainCache = [];
            sameOriginWindowChainCache.set(targetWindow, windowChainCache);
            let w = targetWindow;
            let parent;
            do {
                parent = getParentWindowIfSameOrigin(w);
                if (parent) {
                    windowChainCache.push({
                        window: new WeakRef(w),
                        iframeElement: w.frameElement || null
                    });
                }
                else {
                    windowChainCache.push({
                        window: new WeakRef(w),
                        iframeElement: null
                    });
                }
                w = parent;
            } while (w);
        }
        return windowChainCache.slice(0);
    }
    /**
     * Returns the position of `childWindow` relative to `ancestorWindow`
     */
    static getPositionOfChildWindowRelativeToAncestorWindow(childWindow, ancestorWindow) {
        if (!ancestorWindow || childWindow === ancestorWindow) {
            return {
                top: 0,
                left: 0
            };
        }
        let top = 0, left = 0;
        const windowChain = this.getSameOriginWindowChain(childWindow);
        for (const windowChainEl of windowChain) {
            const windowInChain = windowChainEl.window.deref();
            top += windowInChain?.scrollY ?? 0;
            left += windowInChain?.scrollX ?? 0;
            if (windowInChain === ancestorWindow) {
                break;
            }
            if (!windowChainEl.iframeElement) {
                break;
            }
            const boundingRect = windowChainEl.iframeElement.getBoundingClientRect();
            top += boundingRect.top;
            left += boundingRect.left;
        }
        return {
            top: top,
            left: left
        };
    }
}
/**
 * Returns a sha-256 composed of `parentOrigin` and `salt` converted to base 32
 */
export async function parentOriginHash(parentOrigin, salt) {
    // This same code is also inlined at `src/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html`
    if (!crypto.subtle) {
        throw new Error(`'crypto.subtle' is not available so webviews will not work. This is likely because the editor is not running in a secure context (https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).`);
    }
    const strData = JSON.stringify({ parentOrigin, salt });
    const encoder = new TextEncoder();
    const arrData = encoder.encode(strData);
    const hash = await crypto.subtle.digest('sha-256', arrData);
    return sha256AsBase32(hash);
}
function sha256AsBase32(bytes) {
    const array = Array.from(new Uint8Array(bytes));
    const hexArray = array.map(b => b.toString(16).padStart(2, '0')).join('');
    // sha256 has 256 bits, so we need at most ceil(lg(2^256-1)/lg(32)) = 52 chars to represent it in base 32
    return BigInt(`0x${hexArray}`).toString(32).padStart(52, '0');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWZyYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9pZnJhbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFnQmhHLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQXdDLENBQUM7QUFFdkYsU0FBUywyQkFBMkIsQ0FBQyxDQUFTO0lBQzdDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDakMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsb0dBQW9HO0lBQ3BHLElBQUksQ0FBQztRQUNKLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDNUIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDekMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqSCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7SUFDRixDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNqQixDQUFDO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFFdkI7OztPQUdHO0lBQ0ssTUFBTSxDQUFDLHdCQUF3QixDQUFDLFlBQW9CO1FBQzNELElBQUksZ0JBQWdCLEdBQUcsMEJBQTBCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZC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