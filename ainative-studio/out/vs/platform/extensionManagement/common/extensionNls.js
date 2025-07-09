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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk5scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQU8zQyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsTUFBZSxFQUFFLGlCQUFxQyxFQUFFLFlBQTJCLEVBQUUsb0JBQW9DO0lBQ3pKLElBQUksQ0FBQztRQUNKLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUM7UUFDdEMsZ0JBQWdCO0lBQ2pCLENBQUM7SUFDRCxPQUFPLGlCQUFpQixDQUFDO0FBQzFCLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLGdCQUFnQixDQUFDLE1BQWUsRUFBRSxpQkFBcUMsRUFBRSxRQUF1QixFQUFFLGdCQUFnQztJQUMxSSxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQVEsRUFBRSxHQUFvQixFQUFFLE9BQWlCLEVBQUUsRUFBRTtRQUMxRSxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyQixNQUFNLEdBQUcsR0FBVyxLQUFLLENBQUM7WUFDMUIsTUFBTSxNQUFNLEdBQUcs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