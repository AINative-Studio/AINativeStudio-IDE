/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// eslint-disable-next-line local/code-import-patterns
import { getNLSLanguage, getNLSMessages } from './nls.messages.js';
// eslint-disable-next-line local/code-import-patterns
export { getNLSLanguage, getNLSMessages } from './nls.messages.js';
const isPseudo = getNLSLanguage() === 'pseudo' || (typeof document !== 'undefined' && document.location && typeof document.location.hash === 'string' && document.location.hash.indexOf('pseudo=true') >= 0);
function _format(message, args) {
    let result;
    if (args.length === 0) {
        result = message;
    }
    else {
        result = message.replace(/\{(\d+)\}/g, (match, rest) => {
            const index = rest[0];
            const arg = args[index];
            let result = match;
            if (typeof arg === 'string') {
                result = arg;
            }
            else if (typeof arg === 'number' || typeof arg === 'boolean' || arg === void 0 || arg === null) {
                result = String(arg);
            }
            return result;
        });
    }
    if (isPseudo) {
        // FF3B and FF3D is the Unicode zenkaku representation for [ and ]
        result = '\uFF3B' + result.replace(/[aouei]/g, '$&$&') + '\uFF3D';
    }
    return result;
}
/**
 * @skipMangle
 */
export function localize(data /* | number when built */, message /* | null when built */, ...args) {
    if (typeof data === 'number') {
        return _format(lookupMessage(data, message), args);
    }
    return _format(message, args);
}
/**
 * Only used when built: Looks up the message in the global NLS table.
 * This table is being made available as a global through bootstrapping
 * depending on the target context.
 */
function lookupMessage(index, fallback) {
    const message = getNLSMessages()?.[index];
    if (typeof message !== 'string') {
        if (typeof fallback === 'string') {
            return fallback;
        }
        throw new Error(`!!! NLS MISSING: ${index} !!!`);
    }
    return message;
}
/**
 * @skipMangle
 */
export function localize2(data /* | number when built */, originalMessage, ...args) {
    let message;
    if (typeof data === 'number') {
        message = lookupMessage(data, originalMessage);
    }
    else {
        message = originalMessage;
    }
    const value = _format(message, args);
    return {
        value,
        original: originalMessage === message ? value : _format(originalMessage, args)
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL25scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxzREFBc0Q7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRSxzREFBc0Q7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVuRSxNQUFNLFFBQVEsR0FBRyxjQUFjLEVBQUUsS0FBSyxRQUFRLElBQUksQ0FBQyxPQUFPLFFBQVEsS0FBSyxXQUFXLElBQUksUUFBUSxDQUFDLFFBQVEsSUFBSSxPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFZN00sU0FBUyxPQUFPLENBQUMsT0FBZSxFQUFFLElBQXNEO0lBQ3ZGLElBQUksTUFBYyxDQUFDO0lBRW5CLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixNQUFNLEdBQUcsT0FBTyxDQUFDO0lBQ2xCLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3RELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQ25CLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sR0FBRyxHQUFHLENBQUM7WUFDZCxDQUFDO2lCQUFNLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLE9BQU8sR0FBRyxLQUFLLFNBQVMsSUFBSSxHQUFHLEtBQUssS0FBSyxDQUFDLElBQUksR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNsRyxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxrRUFBa0U7UUFDbEUsTUFBTSxHQUFHLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUM7SUFDbkUsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQThCRDs7R0FFRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsSUFBNEIsQ0FBQyx5QkFBeUIsRUFBRSxPQUFlLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxJQUFzRDtJQUNsTCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzlCLE9BQU8sT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsYUFBYSxDQUFDLEtBQWEsRUFBRSxRQUF1QjtJQUM1RCxNQUFNLE9BQU8sR0FBRyxjQUFjLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDakMsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNsQyxPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsS0FBSyxNQUFNLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDaEIsQ0FBQztBQWdDRDs7R0FFRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQUMsSUFBNEIsQ0FBQyx5QkFBeUIsRUFBRSxlQUF1QixFQUFFLEdBQUcsSUFBc0Q7SUFDbkssSUFBSSxPQUFlLENBQUM7SUFDcEIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM5QixPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNoRCxDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sR0FBRyxlQUFlLENBQUM7SUFDM0IsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFckMsT0FBTztRQUNOLEtBQUs7UUFDTCxRQUFRLEVBQUUsZUFBZSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQztLQUM5RSxDQUFDO0FBQ0gsQ0FBQyJ9