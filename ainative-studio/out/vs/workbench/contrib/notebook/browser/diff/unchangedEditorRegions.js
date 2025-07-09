/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
export function getUnchangedRegionSettings(configurationService) {
    return createHideUnchangedRegionOptions(configurationService);
}
function createHideUnchangedRegionOptions(configurationService) {
    const disposables = new DisposableStore();
    const unchangedRegionsEnablementEmitter = disposables.add(new Emitter());
    const result = {
        options: {
            enabled: configurationService.getValue('diffEditor.hideUnchangedRegions.enabled'),
            minimumLineCount: configurationService.getValue('diffEditor.hideUnchangedRegions.minimumLineCount'),
            contextLineCount: configurationService.getValue('diffEditor.hideUnchangedRegions.contextLineCount'),
            revealLineCount: configurationService.getValue('diffEditor.hideUnchangedRegions.revealLineCount'),
        },
        // We only care about enable/disablement.
        // If user changes counters when a diff editor is open, we do not care, might as well ask user to reload.
        // Simpler and almost never going to happen.
        onDidChangeEnablement: unchangedRegionsEnablementEmitter.event.bind(unchangedRegionsEnablementEmitter),
        dispose: () => disposables.dispose()
    };
    disposables.add(configurationService.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('diffEditor.hideUnchangedRegions.minimumLineCount')) {
            result.options.minimumLineCount = configurationService.getValue('diffEditor.hideUnchangedRegions.minimumLineCount');
        }
        if (e.affectsConfiguration('diffEditor.hideUnchangedRegions.contextLineCount')) {
            result.options.contextLineCount = configurationService.getValue('diffEditor.hideUnchangedRegions.contextLineCount');
        }
        if (e.affectsConfiguration('diffEditor.hideUnchangedRegions.revealLineCount')) {
            result.options.revealLineCount = configurationService.getValue('diffEditor.hideUnchangedRegions.revealLineCount');
        }
        if (e.affectsConfiguration('diffEditor.hideUnchangedRegions.enabled')) {
            result.options.enabled = configurationService.getValue('diffEditor.hideUnchangedRegions.enabled');
            unchangedRegionsEnablementEmitter.fire(result.options.enabled);
        }
    }));
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jaGFuZ2VkRWRpdG9yUmVnaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvdW5jaGFuZ2VkRWRpdG9yUmVnaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBYXZGLE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxvQkFBMkM7SUFDckYsT0FBTyxnQ0FBZ0MsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQy9ELENBQUM7QUFFRCxTQUFTLGdDQUFnQyxDQUFDLG9CQUEyQztJQUNwRixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLE1BQU0saUNBQWlDLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUM7SUFFbEYsTUFBTSxNQUFNLEdBQUc7UUFDZCxPQUFPLEVBQUU7WUFDUixPQUFPLEVBQUUsb0JBQW9CLENBQUMsUUFBUSxDQUFVLHlDQUF5QyxDQUFDO1lBQzFGLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyxrREFBa0QsQ0FBQztZQUMzRyxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsa0RBQWtELENBQUM7WUFDM0csZUFBZSxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyxpREFBaUQsQ0FBQztTQUN6RztRQUNELHlDQUF5QztRQUN6Qyx5R0FBeUc7UUFDekcsNENBQTRDO1FBQzVDLHFCQUFxQixFQUFFLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUM7UUFDdEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUU7S0FDcEMsQ0FBQztJQUVGLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsa0RBQWtELENBQUMsRUFBRSxDQUFDO1lBQ2hGLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFTLGtEQUFrRCxDQUFDLENBQUM7UUFDN0gsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGtEQUFrRCxDQUFDLEVBQUUsQ0FBQztZQUNoRixNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyxrREFBa0QsQ0FBQyxDQUFDO1FBQzdILENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxpREFBaUQsQ0FBQyxFQUFFLENBQUM7WUFDL0UsTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFTLGlEQUFpRCxDQUFDLENBQUM7UUFDM0gsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHlDQUF5QyxDQUFDLEVBQUUsQ0FBQztZQUN2RSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMseUNBQXlDLENBQUMsQ0FBQztZQUNsRyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoRSxDQUFDO0lBRUYsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVKLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyJ9