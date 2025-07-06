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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlbnNpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEV4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBcUM1RSxNQUFNLFVBQVUsNEJBQTRCLENBQW9DLEVBQVUsRUFBRSxJQUFxRSxFQUFFLDRCQUFxQyxLQUFLO0lBQzVNLG1FQUFtRTtJQUNuRSw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLHlCQUF5QixFQUFzQyxDQUFDLENBQUM7QUFDakosQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxLQUFXLDBCQUEwQixDQUkxQztBQUpELFdBQWlCLDBCQUEwQjtJQUMxQyxTQUFnQix3QkFBd0I7UUFDdkMsT0FBTyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztJQUN6RSxDQUFDO0lBRmUsbURBQXdCLDJCQUV2QyxDQUFBO0FBQ0YsQ0FBQyxFQUpnQiwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBSTFDO0FBRUQsTUFBTSw0QkFBNEI7YUFFVixhQUFRLEdBQUcsSUFBSSw0QkFBNEIsRUFBRSxBQUFyQyxDQUFzQztJQUlyRTtRQUZpQiwyQkFBc0IsR0FBdUMsRUFBRSxDQUFDO0lBR2pGLENBQUM7SUFFTSw0QkFBNEIsQ0FBQyxXQUE2QztRQUNoRixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTSx3QkFBd0I7UUFDOUIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdDLENBQUM7O0FBR0YsSUFBVyxVQUVWO0FBRkQsV0FBVyxVQUFVO0lBQ3BCLDhEQUFnRCxDQUFBO0FBQ2pELENBQUMsRUFGVSxVQUFVLEtBQVYsVUFBVSxRQUVwQjtBQUVELFFBQVEsQ0FBQyxHQUFHLGtFQUFtQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsQ0FBQyJ9