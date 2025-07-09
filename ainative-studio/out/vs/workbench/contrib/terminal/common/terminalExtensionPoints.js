/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
import { terminalContributionsDescriptor } from './terminal.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
// terminal extension point
const terminalsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint(terminalContributionsDescriptor);
export const ITerminalContributionService = createDecorator('terminalContributionsService');
export class TerminalContributionService {
    get terminalProfiles() { return this._terminalProfiles; }
    constructor() {
        this._terminalProfiles = [];
        terminalsExtPoint.setHandler(contributions => {
            this._terminalProfiles = contributions.map(c => {
                return c.value?.profiles?.filter(p => hasValidTerminalIcon(p)).map(e => {
                    return { ...e, extensionIdentifier: c.description.identifier.value };
                }) || [];
            }).flat();
        });
    }
}
function hasValidTerminalIcon(profile) {
    return !profile.icon ||
        (typeof profile.icon === 'string' ||
            URI.isUri(profile.icon) ||
            ('light' in profile.icon && 'dark' in profile.icon &&
                URI.isUri(profile.icon.light) && URI.isUri(profile.icon.dark)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlbnNpb25Qb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsRXh0ZW5zaW9uUG9pbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxrQkFBa0IsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCwyQkFBMkI7QUFDM0IsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBeUIsK0JBQStCLENBQUMsQ0FBQztBQVFoSixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxlQUFlLENBQStCLDhCQUE4QixDQUFDLENBQUM7QUFFMUgsTUFBTSxPQUFPLDJCQUEyQjtJQUl2QyxJQUFJLGdCQUFnQixLQUFLLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztJQUV6RDtRQUhRLHNCQUFpQixHQUE2QyxFQUFFLENBQUM7UUFJeEUsaUJBQWlCLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQzVDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUM5QyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUN0RSxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3RFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxTQUFTLG9CQUFvQixDQUFDLE9BQXFDO0lBQ2xFLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSTtRQUNuQixDQUNDLE9BQU8sT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRO1lBQ2hDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztZQUN2QixDQUNDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLE1BQU0sSUFBSSxPQUFPLENBQUMsSUFBSTtnQkFDakQsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDN0QsQ0FDRCxDQUFDO0FBQ0osQ0FBQyJ9