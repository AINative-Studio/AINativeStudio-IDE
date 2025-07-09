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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWeb } from '../../../../base/common/platform.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { OpenFileAction, OpenFileFolderAction, OpenFolderAction } from '../../../browser/actions/workspaceActions.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { Extensions, IViewDescriptorService, ViewContentGroups } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_EXTENSION_AVAILABLE, IDebugService } from '../common/debug.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_START_COMMAND_ID } from './debugCommands.js';
const debugStartLanguageKey = 'debugStartLanguage';
const CONTEXT_DEBUG_START_LANGUAGE = new RawContextKey(debugStartLanguageKey, undefined);
const CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR = new RawContextKey('debuggerInterestedInActiveEditor', false);
let WelcomeView = class WelcomeView extends ViewPane {
    static { this.ID = 'workbench.debug.welcome'; }
    static { this.LABEL = localize2('run', "Run"); }
    constructor(options, themeService, keybindingService, contextMenuService, configurationService, contextKeyService, debugService, editorService, instantiationService, viewDescriptorService, openerService, storageSevice, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.editorService = editorService;
        this.debugStartLanguageContext = CONTEXT_DEBUG_START_LANGUAGE.bindTo(contextKeyService);
        this.debuggerInterestedContext = CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR.bindTo(contextKeyService);
        const lastSetLanguage = storageSevice.get(debugStartLanguageKey, 1 /* StorageScope.WORKSPACE */);
        this.debugStartLanguageContext.set(lastSetLanguage);
        const setContextKey = () => {
            let editorControl = this.editorService.activeTextEditorControl;
            if (isDiffEditor(editorControl)) {
                editorControl = editorControl.getModifiedEditor();
            }
            if (isCodeEditor(editorControl)) {
                const model = editorControl.getModel();
                const language = model ? model.getLanguageId() : undefined;
                if (language && this.debugService.getAdapterManager().someDebuggerInterestedInLanguage(language)) {
                    this.debugStartLanguageContext.set(language);
                    this.debuggerInterestedContext.set(true);
                    storageSevice.store(debugStartLanguageKey, language, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                    return;
                }
            }
            this.debuggerInterestedContext.set(false);
        };
        const disposables = new DisposableStore();
        this._register(disposables);
        this._register(editorService.onDidActiveEditorChange(() => {
            disposables.clear();
            let editorControl = this.editorService.activeTextEditorControl;
            if (isDiffEditor(editorControl)) {
                editorControl = editorControl.getModifiedEditor();
            }
            if (isCodeEditor(editorControl)) {
                disposables.add(editorControl.onDidChangeModelLanguage(setContextKey));
            }
            setContextKey();
        }));
        this._register(this.debugService.getAdapterManager().onDidRegisterDebugger(setContextKey));
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible) {
                setContextKey();
            }
        }));
        setContextKey();
        const debugKeybinding = this.keybindingService.lookupKeybinding(DEBUG_START_COMMAND_ID);
        debugKeybindingLabel = debugKeybinding ? ` (${debugKeybinding.getLabel()})` : '';
    }
    shouldShowWelcome() {
        return true;
    }
};
WelcomeView = __decorate([
    __param(1, IThemeService),
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IDebugService),
    __param(7, IEditorService),
    __param(8, IInstantiationService),
    __param(9, IViewDescriptorService),
    __param(10, IOpenerService),
    __param(11, IStorageService),
    __param(12, IHoverService)
], WelcomeView);
export { WelcomeView };
const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'openAFileWhichCanBeDebugged',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            '{Locked="](command:{0})"}'
        ]
    }, "[Open a file](command:{0}) which can be debugged or run.", (isMacintosh && !isWeb) ? OpenFileFolderAction.ID : OpenFileAction.ID),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR.toNegated()),
    group: ViewContentGroups.Open,
});
let debugKeybindingLabel = '';
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: `[${localize('runAndDebugAction', "Run and Debug")}${debugKeybindingLabel}](command:${DEBUG_START_COMMAND_ID})`,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
    group: ViewContentGroups.Debug,
    // Allow inserting more buttons directly after this one (by setting order to 1).
    order: 1
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'customizeRunAndDebug',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            '{Locked="](command:{0})"}'
        ]
    }, "To customize Run and Debug [create a launch.json file](command:{0}).", `${DEBUG_CONFIGURE_COMMAND_ID}?${encodeURIComponent(JSON.stringify([{ addNew: true }]))}`),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, WorkbenchStateContext.notEqualsTo('empty')),
    group: ViewContentGroups.Debug
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'customizeRunAndDebugOpenFolder',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            'Please do not translate "launch.json", it is the specific configuration file name',
            '{Locked="](command:{0})"}',
        ]
    }, "To customize Run and Debug, [open a folder](command:{0}) and create a launch.json file.", (isMacintosh && !isWeb) ? OpenFileFolderAction.ID : OpenFolderAction.ID),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, WorkbenchStateContext.isEqualTo('empty')),
    group: ViewContentGroups.Debug
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize('allDebuggersDisabled', "All debug extensions are disabled. Enable a debug extension or install a new one from the Marketplace."),
    when: CONTEXT_DEBUG_EXTENSION_AVAILABLE.toNegated(),
    group: ViewContentGroups.Debug
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci93ZWxjb21lVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFP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