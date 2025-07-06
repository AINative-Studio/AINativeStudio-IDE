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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jaGFuZ2VkRWRpdG9yUmVnaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL3VuY2hhbmdlZEVkaXRvclJlZ2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQWF2RixNQUFNLFVBQVUsMEJBQTBCLENBQUMsb0JBQTJDO0lBQ3JGLE9BQU8sZ0NBQWdDLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUMvRCxDQUFDO0FBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxvQkFBMkM7SUFDcEYsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMxQyxNQUFNLGlDQUFpQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFDO0lBRWxGLE1BQU0sTUFBTSxHQUFHO1FBQ2QsT0FBTyxFQUFFO1lBQ1IsT0FBTyxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FBVSx5Q0FBeUMsQ0FBQztZQUMxRixnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsa0RBQWtELENBQUM7WUFDM0csZ0JBQWdCLEVBQUUsb0JBQW9CLENBQUMsUUFBUSxDQUFTLGtEQUFrRCxDQUFDO1lBQzNHLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsaURBQWlELENBQUM7U0FDekc7UUFDRCx5Q0FBeUM7UUFDekMseUdBQXlHO1FBQ3pHLDRDQUE0QztRQUM1QyxxQkFBcUIsRUFBRSxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDO1FBQ3RHLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFO0tBQ3BDLENBQUM7SUFFRixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2pFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGtEQUFrRCxDQUFDLEVBQUUsQ0FBQztZQUNoRixNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyxrREFBa0QsQ0FBQyxDQUFDO1FBQzdILENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxrREFBa0QsQ0FBQyxFQUFFLENBQUM7WUFDaEYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsa0RBQWtELENBQUMsQ0FBQztRQUM3SCxDQUFDO1FBQ0QsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsaURBQWlELENBQUMsRUFBRSxDQUFDO1lBQy9FLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyxpREFBaUQsQ0FBQyxDQUFDO1FBQzNILENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx5Q0FBeUMsQ0FBQyxFQUFFLENBQUM7WUFDdkUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7WUFDbEcsaUNBQWlDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEUsQ0FBQztJQUVGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFSixPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==