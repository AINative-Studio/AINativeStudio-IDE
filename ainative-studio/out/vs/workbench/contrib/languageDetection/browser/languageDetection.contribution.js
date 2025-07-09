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
var LanguageDetectionStatusContribution_1;
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { ILanguageDetectionService, LanguageDetectionLanguageEventSource } from '../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { NOTEBOOK_EDITOR_EDITABLE } from '../../notebook/common/notebookContextKeys.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { Schemas } from '../../../../base/common/network.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const detectLanguageCommandId = 'editor.detectLanguage';
let LanguageDetectionStatusContribution = class LanguageDetectionStatusContribution {
    static { LanguageDetectionStatusContribution_1 = this; }
    static { this._id = 'status.languageDetectionStatus'; }
    constructor(_languageDetectionService, _statusBarService, _configurationService, _editorService, _languageService, _keybindingService) {
        this._languageDetectionService = _languageDetectionService;
        this._statusBarService = _statusBarService;
        this._configurationService = _configurationService;
        this._editorService = _editorService;
        this._languageService = _languageService;
        this._keybindingService = _keybindingService;
        this._disposables = new DisposableStore();
        this._delayer = new ThrottledDelayer(1000);
        this._renderDisposables = new DisposableStore();
        _editorService.onDidActiveEditorChange(() => this._update(true), this, this._disposables);
        this._update(false);
    }
    dispose() {
        this._disposables.dispose();
        this._delayer.dispose();
        this._combinedEntry?.dispose();
        this._renderDisposables.dispose();
    }
    _update(clear) {
        if (clear) {
            this._combinedEntry?.dispose();
            this._combinedEntry = undefined;
        }
        this._delayer.trigger(() => this._doUpdate());
    }
    async _doUpdate() {
        const editor = getCodeEditor(this._editorService.activeTextEditorControl);
        this._renderDisposables.clear();
        // update when editor language changes
        editor?.onDidChangeModelLanguage(() => this._update(true), this, this._renderDisposables);
        editor?.onDidChangeModelContent(() => this._update(false), this, this._renderDisposables);
        const editorModel = editor?.getModel();
        const editorUri = editorModel?.uri;
        const existingId = editorModel?.getLanguageId();
        const enablementConfig = this._configurationService.getValue('workbench.editor.languageDetectionHints');
        const enabled = typeof enablementConfig === 'object' && enablementConfig?.untitledEditors;
        const disableLightbulb = !enabled || editorUri?.scheme !== Schemas.untitled || !existingId;
        if (disableLightbulb || !editorUri) {
            this._combinedEntry?.dispose();
            this._combinedEntry = undefined;
        }
        else {
            const lang = await this._languageDetectionService.detectLanguage(editorUri);
            const skip = { 'jsonc': 'json' };
            const existing = editorModel.getLanguageId();
            if (lang && lang !== existing && skip[existing] !== lang) {
                const detectedName = this._languageService.getLanguageName(lang) || lang;
                let tooltip = localize('status.autoDetectLanguage', "Accept Detected Language: {0}", detectedName);
                const keybinding = this._keybindingService.lookupKeybinding(detectLanguageCommandId);
                const label = keybinding?.getLabel();
                if (label) {
                    tooltip += ` (${label})`;
                }
                const props = {
                    name: localize('langDetection.name', "Language Detection"),
                    ariaLabel: localize('langDetection.aria', "Change to Detected Language: {0}", lang),
                    tooltip,
                    command: detectLanguageCommandId,
                    text: '$(lightbulb-autofix)',
                };
                if (!this._combinedEntry) {
                    this._combinedEntry = this._statusBarService.addEntry(props, LanguageDetectionStatusContribution_1._id, 1 /* StatusbarAlignment.RIGHT */, { location: { id: 'status.editor.mode', priority: 100.1 }, alignment: 1 /* StatusbarAlignment.RIGHT */, compact: true });
                }
                else {
                    this._combinedEntry.update(props);
                }
            }
            else {
                this._combinedEntry?.dispose();
                this._combinedEntry = undefined;
            }
        }
    }
};
LanguageDetectionStatusContribution = LanguageDetectionStatusContribution_1 = __decorate([
    __param(0, ILanguageDetectionService),
    __param(1, IStatusbarService),
    __param(2, IConfigurationService),
    __param(3, IEditorService),
    __param(4, ILanguageService),
    __param(5, IKeybindingService)
], LanguageDetectionStatusContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LanguageDetectionStatusContribution, 3 /* LifecyclePhase.Restored */);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: detectLanguageCommandId,
            title: localize2('detectlang', "Detect Language from Content"),
            f1: true,
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.toNegated(), EditorContextKeys.editorTextFocus),
            keybinding: { primary: 34 /* KeyCode.KeyD */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */, weight: 200 /* KeybindingWeight.WorkbenchContrib */ }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const languageDetectionService = accessor.get(ILanguageDetectionService);
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        const notificationService = accessor.get(INotificationService);
        const editorUri = editor?.getModel()?.uri;
        if (editorUri) {
            const lang = await languageDetectionService.detectLanguage(editorUri);
            if (lang) {
                editor.getModel()?.setLanguage(lang, LanguageDetectionLanguageEventSource);
            }
            else {
                notificationService.warn(localize('noDetection', "Unable to detect editor language"));
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xhbmd1YWdlRGV0ZWN0aW9uL2Jyb3dzZXIvbGFuZ3VhZ2VEZXRlY3Rpb24uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBbUMsVUFBVSxJQUFJLG1CQUFtQixFQUEwQixNQUFNLGtDQUFrQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVsRixPQUFPLEVBQTRDLGlCQUFpQixFQUFzQixNQUFNLGtEQUFrRCxDQUFDO0FBQ25KLE9BQU8sRUFBRSx5QkFBeUIsRUFBK0Isb0NBQW9DLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUM1TCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FB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