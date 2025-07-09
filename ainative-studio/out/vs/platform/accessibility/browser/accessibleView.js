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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQU05RSxPQUFPLEVBQWUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFNUUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDO0FBRXZHLE1BQU0sQ0FBTixJQUFrQix3QkF5QmpCO0FBekJELFdBQWtCLHdCQUF3QjtJQUN6QyxpREFBcUIsQ0FBQTtJQUNyQiwwREFBOEIsQ0FBQTtJQUM5QiwwREFBOEIsQ0FBQTtJQUM5QixxREFBeUIsQ0FBQTtJQUN6Qix1REFBMkIsQ0FBQTtJQUMzQixtREFBdUIsQ0FBQTtJQUN2QixxREFBeUIsQ0FBQTtJQUN6QixtREFBdUIsQ0FBQTtJQUN2QixtREFBdUIsQ0FBQTtJQUN2QixtRUFBdUMsQ0FBQTtJQUN2QyxtRUFBdUMsQ0FBQTtJQUN2QyxpREFBcUIsQ0FBQTtJQUNyQixxREFBeUIsQ0FBQTtJQUN6Qiw2Q0FBaUIsQ0FBQTtJQUNqQiwyQ0FBZSxDQUFBO0lBQ2YseURBQTZCLENBQUE7SUFDN0IsK0RBQW1DLENBQUE7SUFDbkMsaURBQXFCLENBQUE7SUFDckIsMkRBQStCLENBQUE7SUFDL0IseUNBQWEsQ0FBQTtJQUNiLGlEQUFxQixDQUFBO0lBQ3JCLHVEQUEyQixDQUFBO0lBQzNCLHVEQUEyQixDQUFBO0lBQzNCLGlEQUFxQixDQUFBO0FBQ3RCLENBQUMsRUF6QmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUF5QnpDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGtCQUdqQjtBQUhELFdBQWtCLGtCQUFrQjtJQUNuQyxtQ0FBYSxDQUFBO0lBQ2IsbUNBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUduQztBQUVELE1BQU0sQ0FBTixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDL0IsdUNBQXFCLENBQUE7SUFDckIsK0JBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsY0FBYyxLQUFkLGNBQWMsUUFHL0I7QUFzR0QsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFFeEQsWUFDUSxFQUE0QixFQUM1QixPQUErQixFQUMvQixjQUE0QixFQUM1QixPQUFtQixFQUNuQixtQkFBMkIsRUFDM0IsTUFBbUIsRUFDbkIsT0FBbUIsRUFDbkIsa0JBQTZDLEVBQzdDLHNCQUFpRCxFQUNqRCxrQkFBZ0MsRUFDaEMsU0FBdUMsRUFDdkMsVUFBMEMsRUFDMUMsNkJBQStEO1FBRXRFLEtBQUssRUFBRSxDQUFDO1FBZEQsT0FBRSxHQUFGLEVBQUUsQ0FBMEI7UUFDNUIsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFDL0IsbUJBQWMsR0FBZCxjQUFjLENBQWM7UUFDNUIsWUFBTyxHQUFQLE9BQU8sQ0FBWTtRQUNuQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQVE7UUFDM0IsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNuQixZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQ25CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBMkI7UUFDN0MsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUEyQjtRQUNqRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQWM7UUFDaEMsY0FBUyxHQUFULFNBQVMsQ0FBOEI7UUFDdkMsZUFBVSxHQUFWLFVBQVUsQ0FBZ0M7UUFDMUMsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFrQztJQUd2RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsZ0NBQWdDLENBQUMsR0FBUTtJQUN4RCxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLGNBQWMsSUFBSSxHQUFHLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQztBQUNyRyxDQUFDO0FBRUQsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFVBQVU7SUFFdkQsWUFDaUIsRUFBVSxFQUNuQixPQUErQixFQUMvQixjQUE0QixFQUM1QixPQUFtQixFQUNuQixNQUFtQixFQUNuQixrQkFBNkMsRUFDN0Msc0JBQWlELEVBQ2pELE9BQW1CLEVBQ25CLGtCQUFnQztRQUV2QyxLQUFLLEVBQUUsQ0FBQztRQVZRLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFDL0IsbUJBQWMsR0FBZCxjQUFjLENBQWM7UUFDNUIsWUFBTyxHQUFQLE9BQU8sQ0FBWTtRQUNuQixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBMkI7UUFDN0MsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUEyQjtRQUNqRCxZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQ25CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBYztJQUd4QyxDQUFDO0NBQ0QifQ==