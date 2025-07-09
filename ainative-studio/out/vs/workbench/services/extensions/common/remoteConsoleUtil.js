/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse } from '../../../../base/common/console.js';
export function logRemoteEntry(logService, entry, label = null) {
    const args = parse(entry).args;
    let firstArg = args.shift();
    if (typeof firstArg !== 'string') {
        return;
    }
    if (!entry.severity) {
        entry.severity = 'info';
    }
    if (label) {
        if (!/^\[/.test(label)) {
            label = `[${label}]`;
        }
        if (!/ $/.test(label)) {
            label = `${label} `;
        }
        firstArg = label + firstArg;
    }
    switch (entry.severity) {
        case 'log':
        case 'info':
            logService.info(firstArg, ...args);
            break;
        case 'warn':
            logService.warn(firstArg, ...args);
            break;
        case 'error':
            logService.error(firstArg, ...args);
            break;
    }
}
export function logRemoteEntryIfError(logService, entry, label) {
    const args = parse(entry).args;
    const firstArg = args.shift();
    if (typeof firstArg !== 'string' || entry.severity !== 'error') {
        return;
    }
    if (!/^\[/.test(label)) {
        label = `[${label}]`;
    }
    if (!/ $/.test(label)) {
        label = `${label} `;
    }
    logService.error(label + firstArg, ...args);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQ29uc29sZVV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL3JlbW90ZUNvbnNvbGVVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHOUUsTUFBTSxVQUFVLGNBQWMsQ0FBQyxVQUF1QixFQUFFLEtBQXdCLEVBQUUsUUFBdUIsSUFBSTtJQUM1RyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQy9CLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLE9BQU87SUFDUixDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyQixLQUFLLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztJQUN6QixDQUFDO0lBRUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEIsS0FBSyxHQUFHLElBQUksS0FBSyxHQUFHLENBQUM7UUFDdEIsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsS0FBSyxHQUFHLEdBQUcsS0FBSyxHQUFHLENBQUM7UUFDckIsQ0FBQztRQUNELFFBQVEsR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDO0lBQzdCLENBQUM7SUFFRCxRQUFRLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QixLQUFLLEtBQUssQ0FBQztRQUNYLEtBQUssTUFBTTtZQUNWLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDbkMsTUFBTTtRQUNQLEtBQUssTUFBTTtZQUNWLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDbkMsTUFBTTtRQUNQLEtBQUssT0FBTztZQUNYLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDcEMsTUFBTTtJQUNSLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLFVBQXVCLEVBQUUsS0FBd0IsRUFBRSxLQUFhO0lBQ3JHLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzlCLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDaEUsT0FBTztJQUNSLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3hCLEtBQUssR0FBRyxJQUFJLEtBQUssR0FBRyxDQUFDO0lBQ3RCLENBQUM7SUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLEtBQUssR0FBRyxHQUFHLEtBQUssR0FBRyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUM3QyxDQUFDIn0=