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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvc2V0dGluZ3NMYXlvdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFZOUMsTUFBTSwyQkFBMkIsR0FBYTtJQUM3QyxnQkFBZ0I7SUFDaEIsaUJBQWlCO0lBQ2pCLG1CQUFtQjtJQUNuQixnQkFBZ0I7SUFDaEIseUJBQXlCO0lBQ3pCLG9CQUFvQjtJQUNwQiw0QkFBNEI7SUFDNUIscUJBQXFCO0lBQ3JCLGlCQUFpQjtJQUNqQixlQUFlO0lBQ2Ysb0JBQW9CO0lBQ3BCLGdDQUFnQztDQUNoQyxDQUFDO0FBRUYsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFVBQTJDO0lBQzlFLE9BQU87UUFDTixFQUFFLEVBQUUsY0FBYztRQUNsQixLQUFLLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUM7UUFDaEQsUUFBUSxFQUFFLFVBQVUsRUFBRSxZQUFZLElBQUksMkJBQTJCO0tBQ2pFLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFzQjtJQUN6QyxFQUFFLEVBQUUsTUFBTTtJQUNWLEtBQUssRUFBRSxNQUFNO0lBQ2IsUUFBUSxFQUFFO1FBQ1Q7WUFDQyxFQUFFLEVBQUUsUUFBUTtZQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQztZQUM1QyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUM7WUFDdEIsUUFBUSxFQUFFO2dCQUNU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