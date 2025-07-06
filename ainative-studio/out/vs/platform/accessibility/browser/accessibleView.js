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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBTTlFLE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU1RSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUM7QUFFdkcsTUFBTSxDQUFOLElBQWtCLHdCQXlCakI7QUF6QkQsV0FBa0Isd0JBQXdCO0lBQ3pDLGlEQUFxQixDQUFBO0lBQ3JCLDBEQUE4QixDQUFBO0lBQzlCLDBEQUE4QixDQUFBO0lBQzlCLHFEQUF5QixDQUFBO0lBQ3pCLHVEQUEyQixDQUFBO0lBQzNCLG1EQUF1QixDQUFBO0lBQ3ZCLHFEQUF5QixDQUFBO0lBQ3pCLG1EQUF1QixDQUFBO0lBQ3ZCLG1EQUF1QixDQUFBO0lBQ3ZCLG1FQUF1QyxDQUFBO0lBQ3ZDLG1FQUF1QyxDQUFBO0lBQ3ZDLGlEQUFxQixDQUFBO0lBQ3JCLHFEQUF5QixDQUFBO0lBQ3pCLDZDQUFpQixDQUFBO0lBQ2pCLDJDQUFlLENBQUE7SUFDZix5REFBNkIsQ0FBQTtJQUM3QiwrREFBbUMsQ0FBQTtJQUNuQyxpREFBcUIsQ0FBQTtJQUNyQiwyREFBK0IsQ0FBQTtJQUMvQix5Q0FBYSxDQUFBO0lBQ2IsaURBQXFCLENBQUE7SUFDckIsdURBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IsaURBQXFCLENBQUE7QUFDdEIsQ0FBQyxFQXpCaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQXlCekM7QUFFRCxNQUFNLENBQU4sSUFBa0Isa0JBR2pCO0FBSEQsV0FBa0Isa0JBQWtCO0lBQ25DLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBR25DO0FBRUQsTUFBTSxDQUFOLElBQWtCLGNBR2pCO0FBSEQsV0FBa0IsY0FBYztJQUMvQix1Q0FBcUIsQ0FBQTtJQUNyQiwrQkFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixjQUFjLEtBQWQsY0FBYyxRQUcvQjtBQXNHRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsVUFBVTtJQUV4RCxZQUNRLEVBQTRCLEVBQzVCLE9BQStCLEVBQy9CLGNBQTRCLEVBQzVCLE9BQW1CLEVBQ25CLG1CQUEyQixFQUMzQixNQUFtQixFQUNuQixPQUFtQixFQUNuQixrQkFBNkMsRUFDN0Msc0JBQWlELEVBQ2pELGtCQUFnQyxFQUNoQyxTQUF1QyxFQUN2QyxVQUEwQyxFQUMxQyw2QkFBK0Q7UUFFdEUsS0FBSyxFQUFFLENBQUM7UUFkRCxPQUFFLEdBQUYsRUFBRSxDQUEwQjtRQUM1QixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixtQkFBYyxHQUFkLGNBQWMsQ0FBYztRQUM1QixZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQ25CLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtRQUMzQixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUM3QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQTJCO1FBQ2pELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBYztRQUNoQyxjQUFTLEdBQVQsU0FBUyxDQUE4QjtRQUN2QyxlQUFVLEdBQVYsVUFBVSxDQUFnQztRQUMxQyxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQWtDO0lBR3ZFLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FBQyxHQUFRO0lBQ3hELE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsY0FBYyxJQUFJLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLG1CQUFtQixDQUFDO0FBQ3JHLENBQUM7QUFFRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQUV2RCxZQUNpQixFQUFVLEVBQ25CLE9BQStCLEVBQy9CLGNBQTRCLEVBQzVCLE9BQW1CLEVBQ25CLE1BQW1CLEVBQ25CLGtCQUE2QyxFQUM3QyxzQkFBaUQsRUFDakQsT0FBbUIsRUFDbkIsa0JBQWdDO1FBRXZDLEtBQUssRUFBRSxDQUFDO1FBVlEsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUNuQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixtQkFBYyxHQUFkLGNBQWMsQ0FBYztRQUM1QixZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQ25CLFdBQU0sR0FBTixNQUFNLENBQWE7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUM3QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQTJCO1FBQ2pELFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFjO0lBR3hDLENBQUM7Q0FDRCJ9