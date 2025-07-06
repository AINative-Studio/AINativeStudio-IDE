/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isObject, isString } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
export function localizeManifest(logger, extensionManifest, translations, fallbackTranslations) {
    try {
        replaceNLStrings(logger, extensionManifest, translations, fallbackTranslations);
    }
    catch (error) {
        logger.error(error?.message ?? error);
        /*Ignore Error*/
    }
    return extensionManifest;
}
/**
 * This routine makes the following assumptions:
 * The root element is an object literal
 */
function replaceNLStrings(logger, extensionManifest, messages, originalMessages) {
    const processEntry = (obj, key, command) => {
        const value = obj[key];
        if (isString(value)) {
            const str = value;
            const length = str.length;
            if (length > 1 && str[0] === '%' && str[length - 1] === '%') {
                const messageKey = str.substr(1, length - 2);
                let translated = messages[messageKey];
                // If the messages come from a language pack they might miss some keys
                // Fill them from the original messages.
                if (translated === undefined && originalMessages) {
                    translated = originalMessages[messageKey];
                }
                const message = typeof translated === 'string' ? translated : translated?.message;
                // This branch returns ILocalizedString's instead of Strings so that the Command Palette can contain both the localized and the original value.
                const original = originalMessages?.[messageKey];
                const originalMessage = typeof original === 'string' ? original : original?.message;
                if (!message) {
                    if (!originalMessage) {
                        logger.warn(`[${extensionManifest.name}]: ${localize('missingNLSKey', "Couldn't find message for key {0}.", messageKey)}`);
                    }
                    return;
                }
                if (
                // if we are translating the title or category of a command
                command && (key === 'title' || key === 'category') &&
                    // and the original value is not the same as the translated value
                    originalMessage && originalMessage !== message) {
                    const localizedString = {
                        value: message,
                        original: originalMessage
                    };
                    obj[key] = localizedString;
                }
                else {
                    obj[key] = message;
                }
            }
        }
        else if (isObject(value)) {
            for (const k in value) {
                if (value.hasOwnProperty(k)) {
                    k === 'commands' ? processEntry(value, k, true) : processEntry(value, k, command);
                }
            }
        }
        else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                processEntry(value, i, command);
            }
        }
    };
    for (const key in extensionManifest) {
        if (extensionManifest.hasOwnProperty(key)) {
            processEntry(extensionManifest, key);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uTmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBTzNDLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxNQUFlLEVBQUUsaUJBQXFDLEVBQUUsWUFBMkIsRUFBRSxvQkFBb0M7SUFDekosSUFBSSxDQUFDO1FBQ0osZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQztRQUN0QyxnQkFBZ0I7SUFDakIsQ0FBQztJQUNELE9BQU8saUJBQWlCLENBQUM7QUFDMUIsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsTUFBZSxFQUFFLGlCQUFxQyxFQUFFLFFBQXVCLEVBQUUsZ0JBQWdDO0lBQzFJLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBUSxFQUFFLEdBQW9CLEVBQUUsT0FBaUIsRUFBRSxFQUFFO1FBQzFFLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sR0FBRyxHQUFXLEtBQUssQ0FBQztZQUMxQixNQUFNLE1BQU0sR0FBRyxH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