/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export function toKey(extension, source) {
    return `${typeof extension === 'string' ? extension : ExtensionIdentifier.toKey(extension)}|${source}`;
}
export const TimelinePaneId = 'timeline';
const TIMELINE_SERVICE_ID = 'timeline';
export const ITimelineService = createDecorator(TIMELINE_SERVICE_ID);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGltZWxpbmUvY29tbW9uL3RpbWVsaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUs3RixNQUFNLFVBQVUsS0FBSyxDQUFDLFNBQXVDLEVBQUUsTUFBYztJQUM1RSxPQUFPLEdBQUcsT0FBTyxTQUFTLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztBQUN4RyxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQztBQXdJekMsTUFBTSxtQkFBbUIsR0FBRyxVQUFVLENBQUM7QUFDdkMsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixtQkFBbUIsQ0FBQyxDQUFDIn0=