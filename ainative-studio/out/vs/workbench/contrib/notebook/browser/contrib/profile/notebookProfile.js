/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
export var NotebookProfileType;
(function (NotebookProfileType) {
    NotebookProfileType["default"] = "default";
    NotebookProfileType["jupyter"] = "jupyter";
    NotebookProfileType["colab"] = "colab";
})(NotebookProfileType || (NotebookProfileType = {}));
const profiles = {
    [NotebookProfileType.default]: {
        [NotebookSetting.focusIndicator]: 'gutter',
        [NotebookSetting.insertToolbarLocation]: 'both',
        [NotebookSetting.globalToolbar]: true,
        [NotebookSetting.cellToolbarLocation]: { default: 'right' },
        [NotebookSetting.compactView]: true,
        [NotebookSetting.showCellStatusBar]: 'visible',
        [NotebookSetting.consolidatedRunButton]: true,
        [NotebookSetting.undoRedoPerCell]: false
    },
    [NotebookProfileType.jupyter]: {
        [NotebookSetting.focusIndicator]: 'gutter',
        [NotebookSetting.insertToolbarLocation]: 'notebookToolbar',
        [NotebookSetting.globalToolbar]: true,
        [NotebookSetting.cellToolbarLocation]: { default: 'left' },
        [NotebookSetting.compactView]: true,
        [NotebookSetting.showCellStatusBar]: 'visible',
        [NotebookSetting.consolidatedRunButton]: false,
        [NotebookSetting.undoRedoPerCell]: true
    },
    [NotebookProfileType.colab]: {
        [NotebookSetting.focusIndicator]: 'border',
        [NotebookSetting.insertToolbarLocation]: 'betweenCells',
        [NotebookSetting.globalToolbar]: false,
        [NotebookSetting.cellToolbarLocation]: { default: 'right' },
        [NotebookSetting.compactView]: false,
        [NotebookSetting.showCellStatusBar]: 'hidden',
        [NotebookSetting.consolidatedRunButton]: true,
        [NotebookSetting.undoRedoPerCell]: false
    }
};
async function applyProfile(configService, profile) {
    const promises = [];
    for (const settingKey in profile) {
        promises.push(configService.updateValue(settingKey, profile[settingKey]));
    }
    await Promise.all(promises);
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.setProfile',
            title: localize('setProfileTitle', "Set Profile")
        });
    }
    async run(accessor, args) {
        if (!isSetProfileArgs(args)) {
            return;
        }
        const configService = accessor.get(IConfigurationService);
        return applyProfile(configService, profiles[args.profile]);
    }
});
function isSetProfileArgs(args) {
    const setProfileArgs = args;
    return setProfileArgs.profile === NotebookProfileType.colab ||
        setProfileArgs.profile === NotebookProfileType.default ||
        setProfileArgs.profile === NotebookProfileType.jupyter;
}
// export class NotebookProfileContribution extends Disposable {
// 	static readonly ID = 'workbench.contrib.notebookProfile';
// 	constructor(@IConfigurationService configService: IConfigurationService, @IWorkbenchAssignmentService private readonly experimentService: IWorkbenchAssignmentService) {
// 		super();
// 		if (this.experimentService) {
// 			this.experimentService.getTreatment<NotebookProfileType.default | NotebookProfileType.jupyter | NotebookProfileType.colab>('notebookprofile').then(treatment => {
// 				if (treatment === undefined) {
// 					return;
// 				} else {
// 					// check if settings are already modified
// 					const focusIndicator = configService.getValue(NotebookSetting.focusIndicator);
// 					const insertToolbarPosition = configService.getValue(NotebookSetting.insertToolbarLocation);
// 					const globalToolbar = configService.getValue(NotebookSetting.globalToolbar);
// 					// const cellToolbarLocation = configService.getValue(NotebookSetting.cellToolbarLocation);
// 					const compactView = configService.getValue(NotebookSetting.compactView);
// 					const showCellStatusBar = configService.getValue(NotebookSetting.showCellStatusBar);
// 					const consolidatedRunButton = configService.getValue(NotebookSetting.consolidatedRunButton);
// 					if (focusIndicator === 'border'
// 						&& insertToolbarPosition === 'both'
// 						&& globalToolbar === false
// 						// && cellToolbarLocation === undefined
// 						&& compactView === true
// 						&& showCellStatusBar === 'visible'
// 						&& consolidatedRunButton === true
// 					) {
// 						applyProfile(configService, profiles[treatment] ?? profiles[NotebookProfileType.default]);
// 					}
// 				}
// 			});
// 		}
// 	}
// }
// registerWorkbenchContribution2(NotebookProfileContribution.ID, NotebookProfileContribution, WorkbenchPhase.BlockRestore);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9wcm9maWxlL25vdGVib29rUHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFcEUsTUFBTSxDQUFOLElBQVksbUJBSVg7QUFKRCxXQUFZLG1CQUFtQjtJQUM5QiwwQ0FBbUIsQ0FBQTtJQUNuQiwwQ0FBbUIsQ0FBQTtJQUNuQixzQ0FBZSxDQUFBO0FBQ2hCLENBQUMsRUFKVyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBSTlCO0FBRUQsTUFBTSxRQUFRLEdBQUc7SUFDaEIsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM5QixDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsRUFBRSxRQUFRO1FBQzFDLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsTUFBTTtRQUMvQyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJO1FBQ3JDLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO1FBQzNELENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUk7UUFDbkMsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsRUFBRSxTQUFTO1FBQzlDLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsSUFBSTtRQUM3QyxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxLQUFLO0tBQ3hDO0lBQ0QsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM5QixDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsRUFBRSxRQUFRO1FBQzFDLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsaUJBQWlCO1FBQzFELENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUk7UUFDckMsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUU7UUFDMUQsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEVBQUUsSUFBSTtRQUNuQyxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFNBQVM7UUFDOUMsQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsRUFBRSxLQUFLO1FBQzlDLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxFQUFFLElBQUk7S0FDdkM7SUFDRCxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzVCLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFFBQVE7UUFDMUMsQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsRUFBRSxjQUFjO1FBQ3ZELENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEtBQUs7UUFDdEMsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUU7UUFDM0QsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSztRQUNwQyxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFFBQVE7UUFDN0MsQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsRUFBRSxJQUFJO1FBQzdDLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEtBQUs7S0FDeEM7Q0FDRCxDQUFDO0FBRUYsS0FBSyxVQUFVLFlBQVksQ0FBQyxhQUFvQyxFQUFFLE9BQTRCO0lBQzdGLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUNwQixLQUFLLE1BQU0sVUFBVSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFNRCxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUJBQXFCO1lBQ3pCLEtBQUssRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDO1NBQ2pELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBYTtRQUNsRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUMxRCxPQUFPLFlBQVksQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxTQUFTLGdCQUFnQixDQUFDLElBQWE7SUFDdEMsTUFBTSxjQUFjLEdBQUcsSUFBdUIsQ0FBQztJQUMvQyxPQUFPLGNBQWMsQ0FBQyxPQUFPLEtBQUssbUJBQW1CLENBQUMsS0FBSztRQUMxRCxjQUFjLENBQUMsT0FBTyxLQUFLLG1CQUFtQixDQUFDLE9BQU87UUFDdEQsY0FBYyxDQUFDLE9BQU8sS0FBSyxtQkFBbUIsQ0FBQyxPQUFPLENBQUM7QUFDekQsQ0FBQztBQUVELGdFQUFnRTtBQUVoRSw2REFBNkQ7QUFFN0QsNEtBQTRLO0FBQzVLLGFBQWE7QUFFYixrQ0FBa0M7QUFDbEMsdUtBQXVLO0FBQ3ZLLHFDQUFxQztBQUNyQyxlQUFlO0FBQ2YsZUFBZTtBQUNmLGlEQUFpRDtBQUNqRCxzRkFBc0Y7QUFDdEYsb0dBQW9HO0FBQ3BHLG9GQUFvRjtBQUNwRixtR0FBbUc7QUFDbkcsZ0ZBQWdGO0FBQ2hGLDRGQUE0RjtBQUM1RixvR0FBb0c7QUFDcEcsdUNBQXVDO0FBQ3ZDLDRDQUE0QztBQUM1QyxtQ0FBbUM7QUFDbkMsZ0RBQWdEO0FBQ2hELGdDQUFnQztBQUNoQywyQ0FBMkM7QUFDM0MsMENBQTBDO0FBQzFDLFdBQVc7QUFDWCxtR0FBbUc7QUFDbkcsU0FBUztBQUNULFFBQVE7QUFDUixTQUFTO0FBQ1QsTUFBTTtBQUNOLEtBQUs7QUFDTCxJQUFJO0FBRUosNEhBQTRIIn0=