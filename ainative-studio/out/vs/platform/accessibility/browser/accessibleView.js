/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export const IAccessibleViewService = createDecorator('accessibleViewService');
export var AccessibleViewProviderId;
(function (AccessibleViewProviderId) {
    AccessibleViewProviderId["Terminal"] = "terminal";
    AccessibleViewProviderId["TerminalChat"] = "terminal-chat";
    AccessibleViewProviderId["TerminalHelp"] = "terminal-help";
    AccessibleViewProviderId["DiffEditor"] = "diffEditor";
    AccessibleViewProviderId["MergeEditor"] = "mergeEditor";
    AccessibleViewProviderId["PanelChat"] = "panelChat";
    AccessibleViewProviderId["InlineChat"] = "inlineChat";
    AccessibleViewProviderId["AgentChat"] = "agentChat";
    AccessibleViewProviderId["QuickChat"] = "quickChat";
    AccessibleViewProviderId["InlineCompletions"] = "inlineCompletions";
    AccessibleViewProviderId["KeybindingsEditor"] = "keybindingsEditor";
    AccessibleViewProviderId["Notebook"] = "notebook";
    AccessibleViewProviderId["ReplEditor"] = "replEditor";
    AccessibleViewProviderId["Editor"] = "editor";
    AccessibleViewProviderId["Hover"] = "hover";
    AccessibleViewProviderId["Notification"] = "notification";
    AccessibleViewProviderId["EmptyEditorHint"] = "emptyEditorHint";
    AccessibleViewProviderId["Comments"] = "comments";
    AccessibleViewProviderId["CommentThread"] = "commentThread";
    AccessibleViewProviderId["Repl"] = "repl";
    AccessibleViewProviderId["ReplHelp"] = "replHelp";
    AccessibleViewProviderId["RunAndDebug"] = "runAndDebug";
    AccessibleViewProviderId["Walkthrough"] = "walkthrough";
    AccessibleViewProviderId["SourceControl"] = "scm";
})(AccessibleViewProviderId || (AccessibleViewProviderId = {}));
export var AccessibleViewType;
(function (AccessibleViewType) {
    AccessibleViewType["Help"] = "help";
    AccessibleViewType["View"] = "view";
})(AccessibleViewType || (AccessibleViewType = {}));
export var NavigationType;
(function (NavigationType) {
    NavigationType["Previous"] = "previous";
    NavigationType["Next"] = "next";
})(NavigationType || (NavigationType = {}));
export class AccessibleContentProvider extends Disposable {
    constructor(id, options, provideContent, onClose, verbositySettingKey, onOpen, actions, provideNextContent, providePreviousContent, onDidChangeContent, onKeyDown, getSymbols, onDidRequestClearLastProvider) {
        super();
        this.id = id;
        this.options = options;
        this.provideContent = provideContent;
        this.onClose = onClose;
        this.verbositySettingKey = verbositySettingKey;
        this.onOpen = onOpen;
        this.actions = actions;
        this.provideNextContent = provideNextContent;
        this.providePreviousContent = providePreviousContent;
        this.onDidChangeContent = onDidChangeContent;
        this.onKeyDown = onKeyDown;
        this.getSymbols = getSymbols;
        this.onDidRequestClearLastProvider = onDidRequestClearLastProvider;
    }
}
export function isIAccessibleViewContentProvider(obj) {
    return obj && obj.id && obj.options && obj.provideContent && obj.onClose && obj.verbositySettingKey;
}
export class ExtensionContentProvider extends Disposable {
    constructor(id, options, provideContent, onClose, onOpen, provideNextContent, providePreviousContent, actions, onDidChangeContent) {
        super();
        this.id = id;
        this.options = options;
        this.provideContent = provideContent;
        this.onClose = onClose;
        this.onOpen = onOpen;
        this.provideNextContent = provideNextContent;
        this.providePreviousContent = providePreviousContent;
        this.actions = actions;
        this.onDidChangeContent = onDidChangeContent;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFNOUUsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTVFLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGVBQWUsQ0FBeUIsdUJBQXVCLENBQUMsQ0FBQztBQUV2RyxNQUFNLENBQU4sSUFBa0Isd0JBeUJqQjtBQXpCRCxXQUFrQix3QkFBd0I7SUFDekMsaURBQXFCLENBQUE7SUFDckIsMERBQThCLENBQUE7SUFDOUIsMERBQThCLENBQUE7SUFDOUIscURBQXlCLENBQUE7SUFDekIsdURBQTJCLENBQUE7SUFDM0IsbURBQXVCLENBQUE7SUFDdkIscURBQXlCLENBQUE7SUFDekIsbURBQXVCLENBQUE7SUFDdkIsbURBQXVCLENBQUE7SUFDdkIsbUVBQXVDLENBQUE7SUFDdkMsbUVBQXVDLENBQUE7SUFDdkMsaURBQXFCLENBQUE7SUFDckIscURBQXlCLENBQUE7SUFDekIsNkNBQWlCLENBQUE7SUFDakIsMkNBQWUsQ0FBQTtJQUNmLHlEQUE2QixDQUFBO0lBQzdCLCtEQUFtQyxDQUFBO0lBQ25DLGlEQUFxQixDQUFBO0lBQ3JCLDJEQUErQixDQUFBO0lBQy9CLHlDQUFhLENBQUE7SUFDYixpREFBcUIsQ0FBQTtJQUNyQix1REFBMkIsQ0FBQTtJQUMzQix1REFBMkIsQ0FBQTtJQUMzQixpREFBcUIsQ0FBQTtBQUN0QixDQUFDLEVBekJpQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBeUJ6QztBQUVELE1BQU0sQ0FBTixJQUFrQixrQkFHakI7QUFIRCxXQUFrQixrQkFBa0I7SUFDbkMsbUNBQWEsQ0FBQTtJQUNiLG1DQUFhLENBQUE7QUFDZCxDQUFDLEVBSGlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHbkM7QUFFRCxNQUFNLENBQU4sSUFBa0IsY0FHakI7QUFIRCxXQUFrQixjQUFjO0lBQy9CLHVDQUFxQixDQUFBO0lBQ3JCLCtCQUFhLENBQUE7QUFDZCxDQUFDLEVBSGlCLGNBQWMsS0FBZCxjQUFjLFFBRy9CO0FBc0dELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxVQUFVO0lBRXhELFlBQ1EsRUFBNEIsRUFDNUIsT0FBK0IsRUFDL0IsY0FBNEIsRUFDNUIsT0FBbUIsRUFDbkIsbUJBQTJCLEVBQzNCLE1BQW1CLEVBQ25CLE9BQW1CLEVBQ25CLGtCQUE2QyxFQUM3QyxzQkFBaUQsRUFDakQsa0JBQWdDLEVBQ2hDLFNBQXVDLEVBQ3ZDLFVBQTBDLEVBQzFDLDZCQUErRDtRQUV0RSxLQUFLLEVBQUUsQ0FBQztRQWRELE9BQUUsR0FBRixFQUFFLENBQTBCO1FBQzVCLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBQy9CLG1CQUFjLEdBQWQsY0FBYyxDQUFjO1FBQzVCLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFRO1FBQzNCLFdBQU0sR0FBTixNQUFNLENBQWE7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBWTtRQUNuQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQTJCO1FBQzdDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBMkI7UUFDakQsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFjO1FBQ2hDLGNBQVMsR0FBVCxTQUFTLENBQThCO1FBQ3ZDLGVBQVUsR0FBVixVQUFVLENBQWdDO1FBQzFDLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBa0M7SUFHdkUsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLGdDQUFnQyxDQUFDLEdBQVE7SUFDeEQsT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxjQUFjLElBQUksR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsbUJBQW1CLENBQUM7QUFDckcsQ0FBQztBQUVELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxVQUFVO0lBRXZELFlBQ2lCLEVBQVUsRUFDbkIsT0FBK0IsRUFDL0IsY0FBNEIsRUFDNUIsT0FBbUIsRUFDbkIsTUFBbUIsRUFDbkIsa0JBQTZDLEVBQzdDLHNCQUFpRCxFQUNqRCxPQUFtQixFQUNuQixrQkFBZ0M7UUFFdkMsS0FBSyxFQUFFLENBQUM7UUFWUSxPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ25CLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBQy9CLG1CQUFjLEdBQWQsY0FBYyxDQUFjO1FBQzVCLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNuQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQTJCO1FBQzdDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBMkI7UUFDakQsWUFBTyxHQUFQLE9BQU8sQ0FBWTtRQUNuQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQWM7SUFHeEMsQ0FBQztDQUNEIn0=