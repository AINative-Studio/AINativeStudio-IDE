/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import { ExtensionIdentifier } from '../../extensions/common/extensions.js';
export class ImplicitActivationEventsImpl {
    constructor() {
        this._generators = new Map();
        this._cache = new WeakMap();
    }
    register(extensionPointName, generator) {
        this._generators.set(extensionPointName, generator);
    }
    /**
     * This can run correctly only on the renderer process because that is the only place
     * where all extension points and all implicit activation events generators are known.
     */
    readActivationEvents(extensionDescription) {
        if (!this._cache.has(extensionDescription)) {
            this._cache.set(extensionDescription, this._readActivationEvents(extensionDescription));
        }
        return this._cache.get(extensionDescription);
    }
    /**
     * This can run correctly only on the renderer process because that is the only place
     * where all extension points and all implicit activation events generators are known.
     */
    createActivationEventsMap(extensionDescriptions) {
        const result = Object.create(null);
        for (const extensionDescription of extensionDescriptions) {
            const activationEvents = this.readActivationEvents(extensionDescription);
            if (activationEvents.length > 0) {
                result[ExtensionIdentifier.toKey(extensionDescription.identifier)] = activationEvents;
            }
        }
        return result;
    }
    _readActivationEvents(desc) {
        if (typeof desc.main === 'undefined' && typeof desc.browser === 'undefined') {
            return [];
        }
        const activationEvents = (Array.isArray(desc.activationEvents) ? desc.activationEvents.slice(0) : []);
        for (let i = 0; i < activationEvents.length; i++) {
            // TODO@joao: there's no easy way to contribute this
            if (activationEvents[i] === 'onUri') {
                activationEvents[i] = `onUri:${ExtensionIdentifier.toKey(desc.identifier)}`;
            }
        }
        if (!desc.contributes) {
            // no implicit activation events
            return activationEvents;
        }
        for (const extPointName in desc.contributes) {
            const generator = this._generators.get(extPointName);
            if (!generator) {
                // There's no generator for this extension point
                continue;
            }
            const contrib = desc.contributes[extPointName];
            const contribArr = Array.isArray(contrib) ? contrib : [contrib];
            try {
                generator(contribArr, activationEvents);
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        return activationEvents;
    }
}
export const ImplicitActivationEvents = new ImplicitActivationEventsImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wbGljaXRBY3RpdmF0aW9uRXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vaW1wbGljaXRBY3RpdmF0aW9uRXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSx1Q0FBdUMsQ0FBQztBQU1uRyxNQUFNLE9BQU8sNEJBQTRCO0lBQXpDO1FBRWtCLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQTJDLENBQUM7UUFDakUsV0FBTSxHQUFHLElBQUksT0FBTyxFQUFtQyxDQUFDO0lBb0UxRSxDQUFDO0lBbEVPLFFBQVEsQ0FBSSxrQkFBMEIsRUFBRSxTQUF3QztRQUN0RixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksb0JBQW9CLENBQUMsb0JBQTJDO1FBQ3RFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUN6RixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBRSxDQUFDO0lBQy9DLENBQUM7SUFFRDs7O09BR0c7SUFDSSx5QkFBeUIsQ0FBQyxxQkFBOEM7UUFDOUUsTUFBTSxNQUFNLEdBQXdDLE1BQU0s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