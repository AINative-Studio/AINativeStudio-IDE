/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ShareWorkbenchContribution_1;
import './share.css';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { WorkspaceFolderCountContext } from '../../../common/contextkeys.js';
import { Extensions } from '../../../common/contributions.js';
import { ShareProviderCountContext, ShareService } from './shareService.js';
import { IShareService } from '../common/share.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
const targetMenus = [
    MenuId.EditorContextShare,
    MenuId.SCMResourceContextShare,
    MenuId.OpenEditorsContextShare,
    MenuId.EditorTitleContextShare,
    MenuId.MenubarShare,
    // MenuId.EditorLineNumberContext, // todo@joyceerhl add share
    MenuId.ExplorerContextShare
];
let ShareWorkbenchContribution = class ShareWorkbenchContribution extends Disposable {
    static { ShareWorkbenchContribution_1 = this; }
    static { this.SHARE_ENABLED_SETTING = 'workbench.experimental.share.enabled'; }
    constructor(shareService, configurationService) {
        super();
        this.shareService = shareService;
        this.configurationService = configurationService;
        if (this.configurationService.getValue(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING)) {
            this.registerActions();
        }
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING)) {
                const settingValue = this.configurationService.getValue(ShareWorkbenchContribution_1.SHARE_ENABLED_SETTING);
                if (settingValue === true && this._disposables === undefined) {
                    this.registerActions();
                }
                else if (settingValue === false && this._disposables !== undefined) {
                    this._disposables?.clear();
                    this._disposables = undefined;
                }
            }
        }));
    }
    dispose() {
        super.dispose();
        this._disposables?.dispose();
    }
    registerActions() {
        if (!this._disposables) {
            this._disposables = new DisposableStore();
        }
        this._disposables.add(registerAction2(class ShareAction extends Action2 {
            static { this.ID = 'workbench.action.share'; }
            static { this.LABEL = localize2('share', 'Share...'); }
            constructor() {
                super({
                    id: ShareAction.ID,
                    title: ShareAction.LABEL,
                    f1: true,
                    icon: Codicon.linkExternal,
                    precondition: ContextKeyExpr.and(ShareProviderCountContext.notEqualsTo(0), WorkspaceFolderCountContext.notEqualsTo(0)),
                    keybinding: {
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 49 /* KeyCode.KeyS */,
                    },
                    menu: [
                        { id: MenuId.CommandCenter, order: 1000 }
                    ]
                });
            }
            async run(accessor, ...args) {
                const shareService = accessor.get(IShareService);
                const activeEditor = accessor.get(IEditorService)?.activeEditor;
                const resourceUri = (activeEditor && EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY }))
                    ?? accessor.get(IWorkspaceContextService).getWorkspace().folders[0].uri;
                const clipboardService = accessor.get(IClipboardService);
                const dialogService = accessor.get(IDialogService);
                const urlService = accessor.get(IOpenerService);
                const progressService = accessor.get(IProgressService);
                const selection = accessor.get(ICodeEditorService).getActiveCodeEditor()?.getSelection() ?? undefined;
                const result = await progressService.withProgress({
                    location: 10 /* ProgressLocation.Window */,
                    detail: localize('generating link', 'Generating link...')
                }, async () => shareService.provideShare({ resourceUri, selection }, CancellationToken.None));
                if (result) {
                    const uriText = result.toString();
                    const isResultText = typeof result === 'string';
                    await clipboardService.writeText(uriText);
                    dialogService.prompt({
                        type: Severity.Info,
                        message: isResultText ? localize('shareTextSuccess', 'Copied text to clipboard!') : localize('shareSuccess', 'Copied link to clipboard!'),
                        custom: {
                            icon: Codicon.check,
                            markdownDetails: [{
                                    markdown: new MarkdownString(`<div aria-label='${uriText}'>${uriText}</div>`, { supportHtml: true }),
                                    classes: [isResultText ? 'share-dialog-input-text' : 'share-dialog-input-link']
                                }]
                        },
                        cancelButton: localize('close', 'Close'),
                        buttons: isResultText ? [] : [{ label: localize('open link', 'Open Link'), run: () => { urlService.open(result, { openExternal: true }); } }]
                    });
                }
            }
        }));
        const actions = this.shareService.getShareActions();
        for (const menuId of targetMenus) {
            for (const action of actions) {
                // todo@joyceerhl avoid duplicates
                this._disposables.add(MenuRegistry.appendMenuItem(menuId, action));
            }
        }
    }
};
ShareWorkbenchContribution = ShareWorkbenchContribution_1 = __decorate([
    __param(0, IShareService),
    __param(1, IConfigurationService)
], ShareWorkbenchContribution);
registerSingleton(IShareService, ShareService, 1 /* InstantiationType.Delayed */);
const workbenchContributionsRegistry = Registry.as(Extensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(ShareWorkbenchContribution, 4 /* LifecyclePhase.Eventually */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.experimental.share.enabled': {
            type: 'boolean',
            default: false,
            tags: ['experimental'],
            markdownDescription: localize('experimental.share.enabled', "Controls whether to render the Share action next to the command center when {0} is {1}.", '`#window.commandCenter#`', '`true`'),
            restricted: false,
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NoYXJlL2Jyb3dzZXIvc2hhcmUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGFBQWEsQ0FBQztBQUNyQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFF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