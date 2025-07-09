/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { VIEW_CONTAINER } from '../../files/browser/explorerViewlet.js';
import { ITimelineService, TimelinePaneId } from '../common/timeline.js';
import { TimelineHasProviderContext, TimelineService } from '../common/timelineService.js';
import { TimelinePane } from './timelinePane.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ExplorerFolderContext } from '../../files/common/files.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const timelineViewIcon = registerIcon('timeline-view-icon', Codicon.history, localize('timelineViewIcon', 'View icon of the timeline view.'));
const timelineOpenIcon = registerIcon('timeline-open', Codicon.history, localize('timelineOpenIcon', 'Icon for the open timeline action.'));
export class TimelinePaneDescriptor {
    constructor() {
        this.id = TimelinePaneId;
        this.name = TimelinePane.TITLE;
        this.containerIcon = timelineViewIcon;
        this.ctorDescriptor = new SyncDescriptor(TimelinePane);
        this.order = 2;
        this.weight = 30;
        this.collapsed = true;
        this.canToggleVisibility = true;
        this.hideByDefault = false;
        this.canMoveView = true;
        this.when = TimelineHasProviderContext;
        this.focusCommand = { id: 'timeline.focus' };
    }
}
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'timeline',
    order: 1001,
    title: localize('timelineConfigurationTitle', "Timeline"),
    type: 'object',
    properties: {
        'timeline.pageSize': {
            type: ['number', 'null'],
            default: 50,
            markdownDescription: localize('timeline.pageSize', "The number of items to show in the Timeline view by default and when loading more items. Setting to `null` will automatically choose a page size based on the visible area of the Timeline view."),
        },
        'timeline.pageOnScroll': {
            type: 'boolean',
            default: true,
            description: localize('timeline.pageOnScroll', "Controls whether the Timeline view will load the next page of items when you scroll to the end of the list."),
        },
    }
});
Registry.as(ViewExtensions.ViewsRegistry).registerViews([new TimelinePaneDescriptor()], VIEW_CONTAINER);
var OpenTimelineAction;
(function (OpenTimelineAction) {
    OpenTimelineAction.ID = 'files.openTimeline';
    OpenTimelineAction.LABEL = localize('files.openTimeline', "Open Timeline");
    function handler() {
        return (accessor, arg) => {
            const service = accessor.get(ITimelineService);
            return service.setUri(arg);
        };
    }
    OpenTimelineAction.handler = handler;
})(OpenTimelineAction || (OpenTimelineAction = {}));
CommandsRegistry.registerCommand(OpenTimelineAction.ID, OpenTimelineAction.handler());
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, ({
    group: '4_timeline',
    order: 1,
    command: {
        id: OpenTimelineAction.ID,
        title: OpenTimelineAction.LABEL,
        icon: timelineOpenIcon
    },
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, TimelineHasProviderContext)
}));
const timelineFilter = registerIcon('timeline-filter', Codicon.filter, localize('timelineFilter', 'Icon for the filter timeline action.'));
MenuRegistry.appendMenuItem(MenuId.TimelineTitle, {
    submenu: MenuId.TimelineFilterSubMenu,
    title: localize('filterTimeline', "Filter Timeline"),
    group: 'navigation',
    order: 100,
    icon: timelineFilter
});
registerSingleton(ITimelineService, TimelineService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RpbWVsaW5lL2Jyb3dzZXIvdGltZWxpbmUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQW1DLFVBQVUsSUFBSSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDakQsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNuSixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFnQixNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEcsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZC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