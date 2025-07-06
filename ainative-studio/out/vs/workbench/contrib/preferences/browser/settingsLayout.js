/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb, isWindows } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
const defaultCommonlyUsedSettings = [
    'files.autoSave',
    'editor.fontSize',
    'editor.fontFamily',
    'editor.tabSize',
    'editor.renderWhitespace',
    'editor.cursorStyle',
    'editor.multiCursorModifier',
    'editor.insertSpaces',
    'editor.wordWrap',
    'files.exclude',
    'files.associations',
    'workbench.editor.enablePreview'
];
export function getCommonlyUsedData(toggleData) {
    return {
        id: 'commonlyUsed',
        label: localize('commonlyUsed', "Commonly Used"),
        settings: toggleData?.commonlyUsed ?? defaultCommonlyUsedSettings
    };
}
export const tocData = {
    id: 'root',
    label: 'root',
    children: [
        {
            id: 'editor',
            label: localize('textEditor', "Text Editor"),
            settings: ['editor.*'],
            children: [
                {
                    id: 'editor/cursor',
                    label: localize('cursor', "Cursor"),
                    settings: ['editor.cursor*']
                },
                {
                    id: 'editor/find',
                    label: localize('find', "Find"),
                    settings: ['editor.find.*']
                },
                {
                    id: 'editor/font',
                    label: localize('font', "Font"),
                    settings: ['editor.font*']
                },
                {
                    id: 'editor/format',
                    label: localize('formatting', "Formatting"),
                    settings: ['editor.format*']
                },
                {
                    id: 'editor/diffEditor',
                    label: localize('diffEditor', "Diff Editor"),
                    settings: ['diffEditor.*']
                },
                {
                    id: 'editor/multiDiffEditor',
                    label: localize('multiDiffEditor', "Multi-File Diff Editor"),
                    settings: ['multiDiffEditor.*']
                },
                {
                    id: 'editor/minimap',
                    label: localize('minimap', "Minimap"),
                    settings: ['editor.minimap.*']
                },
                {
                    id: 'editor/suggestions',
                    label: localize('suggestions', "Suggestions"),
                    settings: ['editor.*suggest*']
                },
                {
                    id: 'editor/files',
                    label: localize('files', "Files"),
                    settings: ['files.*']
                }
            ]
        },
        {
            id: 'workbench',
            label: localize('workbench', "Workbench"),
            settings: ['workbench.*'],
            children: [
                {
                    id: 'workbench/appearance',
                    label: localize('appearance', "Appearance"),
                    settings: ['workbench.activityBar.*', 'workbench.*color*', 'workbench.fontAliasing', 'workbench.iconTheme', 'workbench.sidebar.location', 'workbench.*.visible', 'workbench.tips.enabled', 'workbench.tree.*', 'workbench.view.*']
                },
                {
                    id: 'workbench/breadcrumbs',
                    label: localize('breadcrumbs', "Breadcrumbs"),
                    settings: ['breadcrumbs.*']
                },
                {
                    id: 'workbench/editor',
                    label: localize('editorManagement', "Editor Management"),
                    settings: ['workbench.editor.*']
                },
                {
                    id: 'workbench/settings',
                    label: localize('settings', "Settings Editor"),
                    settings: ['workbench.settings.*']
                },
                {
                    id: 'workbench/zenmode',
                    label: localize('zenMode', "Zen Mode"),
                    settings: ['zenmode.*']
                },
                {
                    id: 'workbench/screencastmode',
                    label: localize('screencastMode', "Screencast Mode"),
                    settings: ['screencastMode.*']
                }
            ]
        },
        {
            id: 'window',
            label: localize('window', "Window"),
            settings: ['window.*'],
            children: [
                {
                    id: 'window/newWindow',
                    label: localize('newWindow', "New Window"),
                    settings: ['window.*newwindow*']
                }
            ]
        },
        {
            id: 'features',
            label: localize('features', "Features"),
            children: [
                {
                    id: 'features/accessibilitySignals',
                    label: localize('accessibility.signals', 'Accessibility Signals'),
                    settings: ['accessibility.signal*']
                },
                {
                    id: 'features/accessibility',
                    label: localize('accessibility', "Accessibility"),
                    settings: ['accessibility.*']
                },
                {
                    id: 'features/explorer',
                    label: localize('fileExplorer', "Explorer"),
                    settings: ['explorer.*', 'outline.*']
                },
                {
                    id: 'features/search',
                    label: localize('search', "Search"),
                    settings: ['search.*']
                },
                {
                    id: 'features/debug',
                    label: localize('debug', "Debug"),
                    settings: ['debug.*', 'launch']
                },
                {
                    id: 'features/testing',
                    label: localize('testing', "Testing"),
                    settings: ['testing.*']
                },
                {
                    id: 'features/scm',
                    label: localize('scm', "Source Control"),
                    settings: ['scm.*']
                },
                {
                    id: 'features/extensions',
                    label: localize('extensions', "Extensions"),
                    settings: ['extensions.*']
                },
                {
                    id: 'features/terminal',
                    label: localize('terminal', "Terminal"),
                    settings: ['terminal.*']
                },
                {
                    id: 'features/task',
                    label: localize('task', "Task"),
                    settings: ['task.*']
                },
                {
                    id: 'features/problems',
                    label: localize('problems', "Problems"),
                    settings: ['problems.*']
                },
                {
                    id: 'features/output',
                    label: localize('output', "Output"),
                    settings: ['output.*']
                },
                {
                    id: 'features/comments',
                    label: localize('comments', "Comments"),
                    settings: ['comments.*']
                },
                {
                    id: 'features/remote',
                    label: localize('remote', "Remote"),
                    settings: ['remote.*']
                },
                {
                    id: 'features/timeline',
                    label: localize('timeline', "Timeline"),
                    settings: ['timeline.*']
                },
                {
                    id: 'features/notebook',
                    label: localize('notebook', 'Notebook'),
                    settings: ['notebook.*', 'interactiveWindow.*']
                },
                {
                    id: 'features/mergeEditor',
                    label: localize('mergeEditor', 'Merge Editor'),
                    settings: ['mergeEditor.*']
                },
                {
                    id: 'features/chat',
                    label: localize('chat', 'Chat'),
                    settings: ['chat.*', 'inlineChat.*', 'mcp']
                },
                {
                    id: 'features/issueReporter',
                    label: localize('issueReporter', 'Issue Reporter'),
                    settings: ['issueReporter.*'],
                    hide: !isWeb
                }
            ]
        },
        {
            id: 'application',
            label: localize('application', "Application"),
            children: [
                {
                    id: 'application/http',
                    label: localize('proxy', "Proxy"),
                    settings: ['http.*']
                },
                {
                    id: 'application/keyboard',
                    label: localize('keyboard', "Keyboard"),
                    settings: ['keyboard.*']
                },
                {
                    id: 'application/update',
                    label: localize('update', "Update"),
                    settings: ['update.*']
                },
                {
                    id: 'application/telemetry',
                    label: localize('telemetry', "Telemetry"),
                    settings: ['telemetry.*']
                },
                {
                    id: 'application/settingsSync',
                    label: localize('settingsSync', "Settings Sync"),
                    settings: ['settingsSync.*']
                },
                {
                    id: 'application/experimental',
                    label: localize('experimental', "Experimental"),
                    settings: ['application.experimental.*']
                },
                {
                    id: 'application/other',
                    label: localize('other', "Other"),
                    settings: ['application.*'],
                    hide: isWindows
                }
            ]
        },
        {
            id: 'security',
            label: localize('security', "Security"),
            settings: ['security.*'],
            children: [
                {
                    id: 'security/workspace',
                    label: localize('workspace', "Workspace"),
                    settings: ['security.workspace.*']
                }
            ]
        }
    ]
};
export const knownAcronyms = new Set();
[
    'css',
    'html',
    'scss',
    'less',
    'json',
    'js',
    'ts',
    'ie',
    'id',
    'php',
    'scm',
].forEach(str => knownAcronyms.add(str));
export const knownTermMappings = new Map();
knownTermMappings.set('power shell', 'PowerShell');
knownTermMappings.set('powershell', 'PowerShell');
knownTermMappings.set('javascript', 'JavaScript');
knownTermMappings.set('typescript', 'TypeScript');
knownTermMappings.set('github', 'GitHub');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3NldHRpbmdzTGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBWTlDLE1BQU0sMkJBQTJCLEdBQWE7SUFDN0MsZ0JBQWdCO0lBQ2hCLGlCQUFpQjtJQUNqQixtQkFBbUI7SUFDbkIsZ0JBQWdCO0lBQ2hCLHlCQUF5QjtJQUN6QixvQkFBb0I7SUFDcEIsNEJBQTRCO0lBQzVCLHFCQUFxQjtJQUNyQixpQkFBaUI7SUFDakIsZUFBZTtJQUNmLG9CQUFvQjtJQUNwQixnQ0FBZ0M7Q0FDaEMsQ0FBQztBQUVGLE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxVQUEyQztJQUM5RSxPQUFPO1FBQ04sRUFBRSxFQUFFLGNBQWM7UUFDbEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO1FBQ2hELFFBQVEsRUFBRSxVQUFVLEVBQUUsWUFBWSxJQUFJLDJCQUEyQjtLQUNqRSxDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBc0I7SUFDekMsRUFBRSxFQUFFLE1BQU07SUFDVixLQUFLLEVBQUUsTUFBTTtJQUNiLFFBQVEsRUFBRTtRQUNUO1lBQ0MsRUFBRSxFQUFFLFFBQVE7WUFDWixLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUM7WUFDNUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ3RCLFFBQVEsRUFBRTtnQkFDVDtvQkFDQyxFQUFFLEVBQUUsZUFBZTtvQkFDbkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO29CQUNuQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztpQkFDNUI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLGFBQWE7b0JBQ2pCLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztvQkFDL0IsUUFBUSxFQUFFLENBQUMsZUFBZSxDQUFDO2lCQUMzQjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsYUFBYTtvQkFDakIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO29CQUMvQixRQUFRLEVBQUUsQ0FBQyxjQUFjLENBQUM7aUJBQzFCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxlQUFlO29CQUNuQixLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUM7b0JBQzNDLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDO2lCQUM1QjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUM7b0JBQzVDLFFBQVEsRUFBRSxDQUFDLGNBQWMsQ0FBQztpQkFDMUI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLHdCQUF3QjtvQkFDNUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSx3QkFBd0IsQ0FBQztvQkFDNUQsUUFBUSxFQUFFLENBQUMsbUJBQW1CLENBQUM7aUJBQy9CO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxnQkFBZ0I7b0JBQ3BCLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztvQkFDckMsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUM7aUJBQzlCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxvQkFBb0I7b0JBQ3hCLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztvQkFDN0MsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUM7aUJBQzlCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxjQUFjO29CQUNsQixLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7b0JBQ2pDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQztpQkFDckI7YUFDRDtTQUNEO1FBQ0Q7WUFDQyxFQUFFLEVBQUUsV0FBVztZQUNmLEtBQUssRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQztZQUN6QyxRQUFRLEVBQUUsQ0FBQyxhQUFhLENBQUM7WUFDekIsUUFBUSxFQUFFO2dCQUNUO29CQUNDLEVBQUUsRUFBRSxzQkFBc0I7b0JBQzFCLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQztvQkFDM0MsUUFBUSxFQUFFLENBQUMseUJBQXlCLEVBQUUsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUscUJBQXFCLEVBQUUsNEJBQTRCLEVBQUUscUJBQXFCLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUM7aUJBQ2xPO2dCQUNEO29CQUNDLEVBQUUsRUFBRSx1QkFBdUI7b0JBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztvQkFDN0MsUUFBUSxFQUFFLENBQUMsZUFBZSxDQUFDO2lCQUMzQjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsa0JBQWtCO29CQUN0QixLQUFLLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLG1CQUFtQixDQUFDO29CQUN4RCxRQUFRLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztpQkFDaEM7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLG9CQUFvQjtvQkFDeEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUM7b0JBQzlDLFFBQVEsRUFBRSxDQUFDLHNCQUFzQixDQUFDO2lCQUNsQztnQkFDRDtvQkFDQyxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixLQUFLLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7b0JBQ3RDLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztpQkFDdkI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLDBCQUEwQjtvQkFDOUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQztvQkFDcEQsUUFBUSxFQUFFLENBQUMsa0JBQWtCLENBQUM7aUJBQzlCO2FBQ0Q7U0FDRDtRQUNEO1lBQ0MsRUFBRSxFQUFFLFFBQVE7WUFDWixLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDbkMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ3RCLFFBQVEsRUFBRTtnQkFDVDtvQkFDQyxFQUFFLEVBQUUsa0JBQWtCO29CQUN0QixLQUFLLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUM7b0JBQzFDLFFBQVEsRUFBRSxDQUFDLG9CQUFvQixDQUFDO2lCQUNoQzthQUNEO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxVQUFVO1lBQ2QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO1lBQ3ZDLFFBQVEsRUFBRTtnQkFDVDtvQkFDQyxFQUFFLEVBQUUsK0JBQStCO29CQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHVCQUF1QixDQUFDO29CQUNqRSxRQUFRLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQztpQkFDbkM7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLHdCQUF3QjtvQkFDNUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDO29CQUNqRCxRQUFRLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztpQkFDN0I7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLG1CQUFtQjtvQkFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDO29CQUMzQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDO2lCQUNyQztnQkFDRDtvQkFDQyxFQUFFLEVBQUUsaUJBQWlCO29CQUNyQixLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7b0JBQ25DLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQztpQkFDdEI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLGdCQUFnQjtvQkFDcEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO29CQUNqQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDO2lCQUMvQjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsa0JBQWtCO29CQUN0QixLQUFLLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7b0JBQ3JDLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztpQkFDdkI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLGNBQWM7b0JBQ2xCLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDO29CQUN4QyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUM7aUJBQ25CO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxxQkFBcUI7b0JBQ3pCLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQztvQkFDM0MsUUFBUSxFQUFFLENBQUMsY0FBYyxDQUFDO2lCQUMxQjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7b0JBQ3ZDLFFBQVEsRUFBRSxDQUFDLFlBQVksQ0FBQztpQkFDeEI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLGVBQWU7b0JBQ25CLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztvQkFDL0IsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUNwQjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7b0JBQ3ZDLFFBQVEsRUFBRSxDQUFDLFlBQVksQ0FBQztpQkFDeEI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLGlCQUFpQjtvQkFDckIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO29CQUNuQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUM7aUJBQ3RCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxtQkFBbUI7b0JBQ3ZCLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztvQkFDdkMsUUFBUSxFQUFFLENBQUMsWUFBWSxDQUFDO2lCQUN4QjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsaUJBQWlCO29CQUNyQixLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7b0JBQ25DLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQztpQkFDdEI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLG1CQUFtQjtvQkFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO29CQUN2QyxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUM7aUJBQ3hCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxtQkFBbUI7b0JBQ3ZCLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztvQkFDdkMsUUFBUSxFQUFFLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDO2lCQUMvQztnQkFDRDtvQkFDQyxFQUFFLEVBQUUsc0JBQXNCO29CQUMxQixLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUM7b0JBQzlDLFFBQVEsRUFBRSxDQUFDLGVBQWUsQ0FBQztpQkFDM0I7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLGVBQWU7b0JBQ25CLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztvQkFDL0IsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUM7aUJBQzNDO2dCQUNEO29CQUNDLEVBQUUsRUFBRSx3QkFBd0I7b0JBQzVCLEtBQUssRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDO29CQUNsRCxRQUFRLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztvQkFDN0IsSUFBSSxFQUFFLENBQUMsS0FBSztpQkFDWjthQUNEO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxhQUFhO1lBQ2pCLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztZQUM3QyxRQUFRLEVBQUU7Z0JBQ1Q7b0JBQ0MsRUFBRSxFQUFFLGtCQUFrQjtvQkFDdEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO29CQUNqQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3BCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxzQkFBc0I7b0JBQzFCLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztvQkFDdkMsUUFBUSxFQUFFLENBQUMsWUFBWSxDQUFDO2lCQUN4QjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsb0JBQW9CO29CQUN4QixLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7b0JBQ25DLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQztpQkFDdEI7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLHVCQUF1QjtvQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDO29CQUN6QyxRQUFRLEVBQUUsQ0FBQyxhQUFhLENBQUM7aUJBQ3pCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSwwQkFBMEI7b0JBQzlCLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztvQkFDaEQsUUFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7aUJBQzVCO2dCQUNEO29CQUNDLEVBQUUsRUFBRSwwQkFBMEI7b0JBQzlCLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQztvQkFDL0MsUUFBUSxFQUFFLENBQUMsNEJBQTRCLENBQUM7aUJBQ3hDO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxtQkFBbUI7b0JBQ3ZCLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztvQkFDakMsUUFBUSxFQUFFLENBQUMsZUFBZSxDQUFDO29CQUMzQixJQUFJLEVBQUUsU0FBUztpQkFDZjthQUNEO1NBQ0Q7UUFDRDtZQUNDLEVBQUUsRUFBRSxVQUFVO1lBQ2QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO1lBQ3ZDLFFBQVEsRUFBRSxDQUFDLFlBQVksQ0FBQztZQUN4QixRQUFRLEVBQUU7Z0JBQ1Q7b0JBQ0MsRUFBRSxFQUFFLG9CQUFvQjtvQkFDeEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDO29CQUN6QyxRQUFRLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztpQkFDbEM7YUFDRDtTQUNEO0tBQ0Q7Q0FDRCxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7QUFDL0M7SUFDQyxLQUFLO0lBQ0wsTUFBTTtJQUNOLE1BQU07SUFDTixNQUFNO0lBQ04sTUFBTTtJQUNOLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixLQUFLO0lBQ0wsS0FBSztDQUNMLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRXpDLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0FBQzNELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDbkQsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNsRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ2xELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDbEQsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyJ9