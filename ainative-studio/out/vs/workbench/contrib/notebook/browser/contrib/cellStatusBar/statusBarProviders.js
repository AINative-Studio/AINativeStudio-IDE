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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../../../common/contributions.js';
import { CHANGE_CELL_LANGUAGE, DETECT_CELL_LANGUAGE } from '../../notebookBrowser.js';
import { INotebookCellStatusBarService } from '../../../common/notebookCellStatusBarService.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { ILanguageDetectionService } from '../../../../../services/languageDetection/common/languageDetectionWorkerService.js';
let CellStatusBarLanguagePickerProvider = class CellStatusBarLanguagePickerProvider {
    constructor(_notebookService, _languageService) {
        this._notebookService = _notebookService;
        this._languageService = _languageService;
        this.viewType = '*';
    }
    async provideCellStatusBarItems(uri, index, _token) {
        const doc = this._notebookService.getNotebookTextModel(uri);
        const cell = doc?.cells[index];
        if (!cell) {
            return;
        }
        const statusBarItems = [];
        let displayLanguage = cell.language;
        if (cell.cellKind === CellKind.Markup) {
            displayLanguage = 'markdown';
        }
        else {
            const registeredId = this._languageService.getLanguageIdByLanguageName(cell.language);
            if (registeredId) {
                displayLanguage = this._languageService.getLanguageName(displayLanguage) ?? displayLanguage;
            }
            else {
                // add unregistered lanugage warning item
                const searchTooltip = localize('notebook.cell.status.searchLanguageExtensions', "Unknown cell language. Click to search for '{0}' extensions", cell.language);
                statusBarItems.push({
                    text: `$(dialog-warning)`,
                    command: { id: 'workbench.extensions.search', arguments: [`@tag:${cell.language}`], title: 'Search Extensions' },
                    tooltip: searchTooltip,
                    alignment: 2 /* CellStatusbarAlignment.Right */,
                    priority: -Number.MAX_SAFE_INTEGER + 1
                });
            }
        }
        statusBarItems.push({
            text: displayLanguage,
            command: CHANGE_CELL_LANGUAGE,
            tooltip: localize('notebook.cell.status.language', "Select Cell Language Mode"),
            alignment: 2 /* CellStatusbarAlignment.Right */,
            priority: -Number.MAX_SAFE_INTEGER
        });
        return {
            items: statusBarItems
        };
    }
};
CellStatusBarLanguagePickerProvider = __decorate([
    __param(0, INotebookService),
    __param(1, ILanguageService)
], CellStatusBarLanguagePickerProvider);
let CellStatusBarLanguageDetectionProvider = class CellStatusBarLanguageDetectionProvider {
    constructor(_notebookService, _notebookKernelService, _languageService, _configurationService, _languageDetectionService, _keybindingService) {
        this._notebookService = _notebookService;
        this._notebookKernelService = _notebookKernelService;
        this._languageService = _languageService;
        this._configurationService = _configurationService;
        this._languageDetectionService = _languageDetectionService;
        this._keybindingService = _keybindingService;
        this.viewType = '*';
        this.cache = new ResourceMap();
    }
    async provideCellStatusBarItems(uri, index, token) {
        const doc = this._notebookService.getNotebookTextModel(uri);
        const cell = doc?.cells[index];
        if (!cell) {
            return;
        }
        const enablementConfig = this._configurationService.getValue('workbench.editor.languageDetectionHints');
        const enabled = typeof enablementConfig === 'object' && enablementConfig?.notebookEditors;
        if (!enabled) {
            return;
        }
        const cellUri = cell.uri;
        const contentVersion = cell.textModel?.getVersionId();
        if (!contentVersion) {
            return;
        }
        const currentLanguageId = cell.cellKind === CellKind.Markup ?
            'markdown' :
            (this._languageService.getLanguageIdByLanguageName(cell.language) || cell.language);
        if (!this.cache.has(cellUri)) {
            this.cache.set(cellUri, {
                cellLanguage: currentLanguageId, // force a re-compute upon a change in configured language
                updateTimestamp: 0, // facilitates a disposable-free debounce operation
                contentVersion: 1, // dont run for the initial contents, only on update
            });
        }
        const cached = this.cache.get(cellUri);
        if (cached.cellLanguage !== currentLanguageId || (cached.updateTimestamp < Date.now() - 1000 && cached.contentVersion !== contentVersion)) {
            cached.updateTimestamp = Date.now();
            cached.cellLanguage = currentLanguageId;
            cached.contentVersion = contentVersion;
            const kernel = this._notebookKernelService.getSelectedOrSuggestedKernel(doc);
            if (kernel) {
                const supportedLangs = [...kernel.supportedLanguages, 'markdown'];
                cached.guess = await this._languageDetectionService.detectLanguage(cell.uri, supportedLangs);
            }
        }
        const items = [];
        if (cached.guess && currentLanguageId !== cached.guess) {
            const detectedName = this._languageService.getLanguageName(cached.guess) || cached.guess;
            let tooltip = localize('notebook.cell.status.autoDetectLanguage', "Accept Detected Language: {0}", detectedName);
            const keybinding = this._keybindingService.lookupKeybinding(DETECT_CELL_LANGUAGE);
            const label = keybinding?.getLabel();
            if (label) {
                tooltip += ` (${label})`;
            }
            items.push({
                text: '$(lightbulb-autofix)',
                command: DETECT_CELL_LANGUAGE,
                tooltip,
                alignment: 2 /* CellStatusbarAlignment.Right */,
                priority: -Number.MAX_SAFE_INTEGER + 1
            });
        }
        return { items };
    }
};
CellStatusBarLanguageDetectionProvider = __decorate([
    __param(0, INotebookService),
    __param(1, INotebookKernelService),
    __param(2, ILanguageService),
    __param(3, IConfigurationService),
    __param(4, ILanguageDetectionService),
    __param(5, IKeybindingService)
], CellStatusBarLanguageDetectionProvider);
let BuiltinCellStatusBarProviders = class BuiltinCellStatusBarProviders extends Disposable {
    constructor(instantiationService, notebookCellStatusBarService) {
        super();
        const builtinProviders = [
            CellStatusBarLanguagePickerProvider,
            CellStatusBarLanguageDetectionProvider,
        ];
        builtinProviders.forEach(p => {
            this._register(notebookCellStatusBarService.registerCellStatusBarItemProvider(instantiationService.createInstance(p)));
        });
    }
};
BuiltinCellStatusBarProviders = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookCellStatusBarService)
], BuiltinCellStatusBarProviders);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BuiltinCellStatusBarProviders, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzQmFyUHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsU3RhdHVzQmFyL3N0YXR1c0JhclByb3ZpZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBbUMsTUFBTSx3Q0FBd0MsQ0FBQztBQUM1SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN0RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUEwSCxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JMLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9D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