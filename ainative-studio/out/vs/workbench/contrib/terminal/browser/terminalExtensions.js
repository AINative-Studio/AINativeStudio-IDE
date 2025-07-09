/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
export function registerTerminalContribution(id, ctor, canRunInDetachedTerminals = false) {
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    TerminalContributionRegistry.INSTANCE.registerTerminalContribution({ id, ctor, canRunInDetachedTerminals });
}
/**
 * The registry of terminal contributions.
 *
 * **WARNING**: This is internal and should only be used by core terminal code that activates the
 * contributions.
 */
export var TerminalExtensionsRegistry;
(function (TerminalExtensionsRegistry) {
    function getTerminalContributions() {
        return TerminalContributionRegistry.INSTANCE.getTerminalContributions();
    }
    TerminalExtensionsRegistry.getTerminalContributions = getTerminalContributions;
})(TerminalExtensionsRegistry || (TerminalExtensionsRegistry = {}));
class TerminalContributionRegistry {
    static { this.INSTANCE = new TerminalContributionRegistry(); }
    constructor() {
        this._terminalContributions = [];
    }
    registerTerminalContribution(description) {
        this._terminalContributions.push(description);
    }
    getTerminalContributions() {
        return this._terminalContributions.slice(0);
    }
}
var Extensions;
(function (Extensions) {
    Extensions["TerminalContributions"] = "terminal.contributions";
})(Extensions || (Extensions = {}));
Registry.add("terminal.contributions" /* Extensions.TerminalContributions */, TerminalContributionRegistry.INSTANCE);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlbnNpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxFeHRlbnNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQXFDNUUsTUFBTSxVQUFVLDRCQUE0QixDQUFvQyxFQUFVLEVBQUUsSUFBcUUsRUFBRSw0QkFBcUMsS0FBSztJQUM1TSxtRUFBbUU7SUFDbkUsNEJBQTRCLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSx5QkFBeUIsRUFBc0MsQ0FBQyxDQUFDO0FBQ2pKLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sS0FBVywwQkFBMEIsQ0FJMUM7QUFKRCxXQUFpQiwwQkFBMEI7SUFDMUMsU0FBZ0Isd0JBQXdCO1FBQ3ZDLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLENBQUM7SUFDekUsQ0FBQztJQUZlLG1EQUF3QiwyQkFFdkMsQ0FBQTtBQUNGLENBQUMsRUFKZ0IsMEJBQTBCLEtBQTFCLDBCQUEwQixRQUkxQztBQUVELE1BQU0sNEJBQTRCO2FBRVYsYUFBUSxHQUFHLElBQUksNEJBQTRCLEVBQUUsQUFBckMsQ0FBc0M7SUFJckU7UUFGaUIsMkJBQXNCLEdBQXVDLEVBQUUsQ0FBQztJQUdqRixDQUFDO0lBRU0sNEJBQTRCLENBQUMsV0FBNkM7UUFDaEYsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRU0sd0JBQXdCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3QyxDQUFDOztBQUdGLElBQVcsVUFFVjtBQUZELFdBQVcsVUFBVTtJQUNwQiw4REFBZ0QsQ0FBQTtBQUNqRCxDQUFDLEVBRlUsVUFBVSxLQUFWLFVBQVUsUUFFcEI7QUFFRCxRQUFRLENBQUMsR0FBRyxrRUFBbUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUMifQ==