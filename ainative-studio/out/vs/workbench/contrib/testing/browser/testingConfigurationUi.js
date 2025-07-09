/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupBy } from '../../../../base/common/arrays.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { testingUpdateProfiles } from './icons.js';
import { testConfigurationGroupNames } from '../common/constants.js';
import { canUseProfileWithTest, ITestProfileService } from '../common/testProfileService.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
function buildPicker(accessor, { onlyGroup, showConfigureButtons = true, onlyForTest, onlyConfigurable, placeholder = localize('testConfigurationUi.pick', 'Pick a test profile to use'), }) {
    const profileService = accessor.get(ITestProfileService);
    const items = [];
    const pushItems = (allProfiles, description) => {
        for (const profiles of groupBy(allProfiles, (a, b) => a.group - b.group)) {
            let addedHeader = false;
            if (onlyGroup) {
                if (profiles[0].group !== onlyGroup) {
                    continue;
                }
                addedHeader = true; // showing one group, no need for label
            }
            for (const profile of profiles) {
                if (onlyConfigurable && !profile.hasConfigurationHandler) {
                    continue;
                }
                if (!addedHeader) {
                    items.push({ type: 'separator', label: testConfigurationGroupNames[profiles[0].group] });
                    addedHeader = true;
                }
                items.push(({
                    type: 'item',
                    profile,
                    label: profile.label,
                    description,
                    alwaysShow: true,
                    buttons: profile.hasConfigurationHandler && showConfigureButtons
                        ? [{
                                iconClass: ThemeIcon.asClassName(testingUpdateProfiles),
                                tooltip: localize('updateTestConfiguration', 'Update Test Configuration')
                            }] : []
                }));
            }
        }
    };
    if (onlyForTest !== undefined) {
        pushItems(profileService.getControllerProfiles(onlyForTest.controllerId).filter(p => canUseProfileWithTest(p, onlyForTest)));
    }
    else {
        for (const { profiles, controller } of profileService.all()) {
            pushItems(profiles, controller.label.get());
        }
    }
    const quickpick = accessor.get(IQuickInputService).createQuickPick({ useSeparators: true });
    quickpick.items = items;
    quickpick.placeholder = placeholder;
    return quickpick;
}
const triggerButtonHandler = (service, resolve) => (evt) => {
    const profile = evt.item.profile;
    if (profile) {
        service.configure(profile.controllerId, profile.profileId);
        resolve(undefined);
    }
};
CommandsRegistry.registerCommand({
    id: 'vscode.pickMultipleTestProfiles',
    handler: async (accessor, options) => {
        const profileService = accessor.get(ITestProfileService);
        const quickpick = buildPicker(accessor, options);
        if (!quickpick) {
            return;
        }
        const disposables = new DisposableStore();
        disposables.add(quickpick);
        quickpick.canSelectMany = true;
        if (options.selected) {
            quickpick.selectedItems = quickpick.items
                .filter((i) => i.type === 'item')
                .filter(i => options.selected.some(s => s.controllerId === i.profile.controllerId && s.profileId === i.profile.profileId));
        }
        const pick = await new Promise(resolve => {
            disposables.add(quickpick.onDidAccept(() => {
                const selected = quickpick.selectedItems;
                resolve(selected.map(s => s.profile).filter(isDefined));
            }));
            disposables.add(quickpick.onDidHide(() => resolve(undefined)));
            disposables.add(quickpick.onDidTriggerItemButton(triggerButtonHandler(profileService, resolve)));
            quickpick.show();
        });
        disposables.dispose();
        return pick;
    }
});
CommandsRegistry.registerCommand({
    id: 'vscode.pickTestProfile',
    handler: async (accessor, options) => {
        const profileService = accessor.get(ITestProfileService);
        const quickpick = buildPicker(accessor, options);
        if (!quickpick) {
            return;
        }
        const disposables = new DisposableStore();
        disposables.add(quickpick);
        const pick = await new Promise(resolve => {
            disposables.add(quickpick.onDidAccept(() => resolve(quickpick.selectedItems[0]?.profile)));
            disposables.add(quickpick.onDidHide(() => resolve(undefined)));
            disposables.add(quickpick.onDidTriggerItemButton(triggerButtonHandler(profileService, resolve)));
            quickpick.show();
        });
        disposables.dispose();
        return pick;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbmZpZ3VyYXRpb25VaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdGluZ0NvbmZpZ3VyYXRpb25VaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQWtDLGtCQUFrQixFQUE2QixNQUFNLHNEQUFzRCxDQUFDO0FBQ3JKLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBZXZFLFNBQVMsV0FBVyxDQUFDLFFBQTBCLEVBQUUsRUFDaEQsU0FBUyxFQUNULG9CQUFvQixHQUFHLElBQUksRUFDM0IsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixXQUFXLEdBQUcsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDLEdBQ25EO0lBQzdCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUN6RCxNQUFNLEtBQUssR0FBb0UsRUFBRSxDQUFDO0lBQ2xGLE1BQU0sU0FBUyxHQUFHLENBQUMsV0FBOEIsRUFBRSxXQUFvQixFQUFFLEVBQUU7UUFDMUUsS0FBSyxNQUFNLFFBQVEsSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxRSxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7WUFDeEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ3JDLFNBQVM7Z0JBQ1YsQ0FBQztnQkFFRCxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsdUNBQXVDO1lBQzVELENBQUM7WUFFRCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLGdCQUFnQixJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLENBQUM7b0JBQzFELFNBQVM7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSwyQkFBMkIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN6RixXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixDQUFDO2dCQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDWCxJQUFJLEVBQUUsTUFBTTtvQkFDWixPQUFPO29CQUNQLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztvQkFDcEIsV0FBVztvQkFDWCxVQUFVLEVBQUUsSUFBSTtvQkFDaEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyx1QkFBdUIsSUFBSSxvQkFBb0I7d0JBQy9ELENBQUMsQ0FBQyxDQUFDO2dDQUNGLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDO2dDQUN2RCxPQUFPLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLDJCQUEyQixDQUFDOzZCQUN6RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7aUJBQ1IsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQztJQUVGLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQy9CLFNBQVMsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUgsQ0FBQztTQUFNLENBQUM7UUFDUCxLQUFLLE1BQU0sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLElBQUksY0FBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDN0QsU0FBUyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDN0MsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsZUFBZSxDQUFnRCxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzNJLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3hCLFNBQVMsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ3BDLE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLG9CQUFvQixHQUFHLENBQUMsT0FBNEIsRUFBRSxPQUFpQyxFQUFFLEVBQUUsQ0FDaEcsQ0FBQyxHQUE4QyxFQUFFLEVBQUU7SUFDbEQsTUFBTSxPQUFPLEdBQUksR0FBRyxDQUFDLElBQXNDLENBQUMsT0FBTyxDQUFDO0lBQ3BFLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNELE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQixDQUFDO0FBQ0YsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxpQ0FBaUM7SUFDckMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLE9BRTNDLEVBQUUsRUFBRTtRQUNKLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN6RCxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUzQixTQUFTLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUMvQixJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QixTQUFTLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQyxLQUFLO2lCQUN2QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQXNELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQztpQkFDcEYsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzlILENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksT0FBTyxDQUFnQyxPQUFPLENBQUMsRUFBRTtZQUN2RSxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsYUFBeUQsQ0FBQztnQkFDckYsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ELFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUFDO1FBRUgsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsd0JBQXdCO0lBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxPQUFvQyxFQUFFLEVBQUU7UUFDbkYsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTNCLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQThCLE9BQU8sQ0FBQyxFQUFFO1lBQ3JFLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQW1DLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlILFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ELFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUFDO1FBRUgsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNELENBQUMsQ0FBQyJ9