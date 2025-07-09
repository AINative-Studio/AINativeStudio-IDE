/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../base/common/arrays.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { Registry } from '../../registry/common/platform.js';
export var DefaultQuickAccessFilterValue;
(function (DefaultQuickAccessFilterValue) {
    /**
     * Keep the value as it is given to quick access.
     */
    DefaultQuickAccessFilterValue[DefaultQuickAccessFilterValue["PRESERVE"] = 0] = "PRESERVE";
    /**
     * Use the value that was used last time something was accepted from the picker.
     */
    DefaultQuickAccessFilterValue[DefaultQuickAccessFilterValue["LAST"] = 1] = "LAST";
})(DefaultQuickAccessFilterValue || (DefaultQuickAccessFilterValue = {}));
export const Extensions = {
    Quickaccess: 'workbench.contributions.quickaccess'
};
export class QuickAccessRegistry {
    constructor() {
        this.providers = [];
        this.defaultProvider = undefined;
    }
    registerQuickAccessProvider(provider) {
        // Extract the default provider when no prefix is present
        if (provider.prefix.length === 0) {
            this.defaultProvider = provider;
        }
        else {
            this.providers.push(provider);
        }
        // sort the providers by decreasing prefix length, such that longer
        // prefixes take priority: 'ext' vs 'ext install' - the latter should win
        this.providers.sort((providerA, providerB) => providerB.prefix.length - providerA.prefix.length);
        return toDisposable(() => {
            this.providers.splice(this.providers.indexOf(provider), 1);
            if (this.defaultProvider === provider) {
                this.defaultProvider = undefined;
            }
        });
    }
    getQuickAccessProviders() {
        return coalesce([this.defaultProvider, ...this.providers]);
    }
    getQuickAccessProvider(prefix) {
        const result = prefix ? (this.providers.find(provider => prefix.startsWith(provider.prefix)) || undefined) : undefined;
        return result || this.defaultProvider;
    }
    clear() {
        const providers = [...this.providers];
        const defaultProvider = this.defaultProvider;
        this.providers = [];
        this.defaultProvider = undefined;
        return () => {
            this.providers = providers;
            this.defaultProvider = defaultProvider;
        };
    }
}
Registry.add(Extensions.Quickaccess, new QuickAccessRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9jb21tb24vcXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFrRjdELE1BQU0sQ0FBTixJQUFZLDZCQVdYO0FBWEQsV0FBWSw2QkFBNkI7SUFFeEM7O09BRUc7SUFDSCx5RkFBWSxDQUFBO0lBRVo7O09BRUc7SUFDSCxpRkFBUSxDQUFBO0FBQ1QsQ0FBQyxFQVhXLDZCQUE2QixLQUE3Qiw2QkFBNkIsUUFXeEM7QUErRkQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHO0lBQ3pCLFdBQVcsRUFBRSxxQ0FBcUM7Q0FDbEQsQ0FBQztBQW9CRixNQUFNLE9BQU8sbUJBQW1CO0lBQWhDO1FBRVMsY0FBUyxHQUFxQyxFQUFFLENBQUM7UUFDakQsb0JBQWUsR0FBK0MsU0FBUyxDQUFDO0lBOENqRixDQUFDO0lBNUNBLDJCQUEyQixDQUFDLFFBQXdDO1FBRW5FLHlEQUF5RDtRQUN6RCxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDO1FBQ2pDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUVELG1FQUFtRTtRQUNuRSx5RUFBeUU7UUFDekUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWpHLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUzRCxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCx1QkFBdUI7UUFDdEIsT0FBTyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELHNCQUFzQixDQUFDLE1BQWM7UUFDcEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRXZILE9BQU8sTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDdkMsQ0FBQztJQUVELEtBQUs7UUFDSixNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7UUFFN0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUM7UUFFakMsT0FBTyxHQUFHLEVBQUU7WUFDWCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztZQUMzQixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN4QyxDQUFDLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLENBQUMifQ==