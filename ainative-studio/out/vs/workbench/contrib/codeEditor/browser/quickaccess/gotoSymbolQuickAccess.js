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
var GotoSymbolQuickAccessProvider_1;
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService, ItemActivation } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions as QuickaccessExtensions } from '../../../../../platform/quickinput/common/quickAccess.js';
import { AbstractGotoSymbolQuickAccessProvider } from '../../../../../editor/contrib/quickAccess/browser/gotoSymbolQuickAccess.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { DisposableStore, toDisposable, Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { registerAction2, Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { prepareQuery } from '../../../../../base/common/fuzzyScorer.js';
import { fuzzyScore } from '../../../../../base/common/filters.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { IOutlineService } from '../../../../services/outline/browser/outline.js';
import { isCompositeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IOutlineModelService } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { accessibilityHelpIsShown, accessibleViewIsShown } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { matchesFuzzyIconAware, parseLabelWithIcons } from '../../../../../base/common/iconLabels.js';
let GotoSymbolQuickAccessProvider = class GotoSymbolQuickAccessProvider extends AbstractGotoSymbolQuickAccessProvider {
    static { GotoSymbolQuickAccessProvider_1 = this; }
    constructor(editorService, editorGroupService, configurationService, languageFeaturesService, outlineService, outlineModelService) {
        super(languageFeaturesService, outlineModelService, {
            openSideBySideDirection: () => this.configuration.openSideBySideDirection
        });
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.outlineService = outlineService;
        this.onDidActiveTextEditorControlChange = this.editorService.onDidActiveEditorChange;
    }
    //#region DocumentSymbols (text editor required)
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            openSideBySideDirection: editorConfig?.openSideBySideDirection
        };
    }
    get activeTextEditorControl() {
        // TODO: this distinction should go away by adopting `IOutlineService`
        // for all editors (either text based ones or not). Currently text based
        // editors are not yet using the new outline service infrastructure but the
        // "classical" document symbols approach.
        if (isCompositeEditor(this.editorService.activeEditorPane?.getControl())) {
            return undefined;
        }
        return this.editorService.activeTextEditorControl;
    }
    gotoLocation(context, options) {
        // Check for sideBySide use
        if ((options.keyMods.alt || (this.configuration.openEditorPinned && options.keyMods.ctrlCmd) || options.forceSideBySide) && this.editorService.activeEditor) {
            context.restoreViewState?.(); // since we open to the side, restore view state in this editor
            const editorOptions = {
                selection: options.range,
                pinned: options.keyMods.ctrlCmd || this.configuration.openEditorPinned,
                preserveFocus: options.preserveFocus
            };
            this.editorGroupService.sideGroup.openEditor(this.editorService.activeEditor, editorOptions);
        }
        // Otherwise let parent handle it
        else {
            super.gotoLocation(context, options);
        }
    }
    //#endregion
    //#region public methods to use this picker from other pickers
    static { this.SYMBOL_PICKS_TIMEOUT = 8000; }
    async getSymbolPicks(model, filter, options, disposables, token) {
        // If the registry does not know the model, we wait for as long as
        // the registry knows it. This helps in cases where a language
        // registry was not activated yet for providing any symbols.
        // To not wait forever, we eventually timeout though.
        const result = await Promise.race([
            this.waitForLanguageSymbolRegistry(model, disposables),
            timeout(GotoSymbolQuickAccessProvider_1.SYMBOL_PICKS_TIMEOUT)
        ]);
        if (!result || token.isCancellationRequested) {
            return [];
        }
        return this.doGetSymbolPicks(this.getDocumentSymbols(model, token), prepareQuery(filter), options, token, model);
    }
    //#endregion
    provideWithoutTextEditor(picker) {
        if (this.canPickWithOutlineService()) {
            return this.doGetOutlinePicks(picker);
        }
        return super.provideWithoutTextEditor(picker);
    }
    canPickWithOutlineService() {
        return this.editorService.activeEditorPane ? this.outlineService.canCreateOutline(this.editorService.activeEditorPane) : false;
    }
    doGetOutlinePicks(picker) {
        const pane = this.editorService.activeEditorPane;
        if (!pane) {
            return Disposable.None;
        }
        const cts = new CancellationTokenSource();
        const disposables = new DisposableStore();
        disposables.add(toDisposable(() => cts.dispose(true)));
        picker.busy = true;
        this.outlineService.createOutline(pane, 4 /* OutlineTarget.QuickPick */, cts.token).then(outline => {
            if (!outline) {
                return;
            }
            if (cts.token.isCancellationRequested) {
                outline.dispose();
                return;
            }
            disposables.add(outline);
            const viewState = outline.captureViewState();
            disposables.add(toDisposable(() => {
                if (picker.selectedItems.length === 0) {
                    viewState.dispose();
                }
            }));
            const entries = outline.config.quickPickDataSource.getQuickPickElements();
            const items = entries.map((entry, idx) => {
                return {
                    kind: 0 /* SymbolKind.File */,
                    index: idx,
                    score: 0,
                    label: entry.label,
                    description: entry.description,
                    ariaLabel: entry.ariaLabel,
                    iconClasses: entry.iconClasses
                };
            });
            disposables.add(picker.onDidAccept(() => {
                picker.hide();
                const [entry] = picker.selectedItems;
                if (entry && entries[entry.index]) {
                    outline.reveal(entries[entry.index].element, {}, false, false);
                }
            }));
            const updatePickerItems = () => {
                const filteredItems = items.filter(item => {
                    if (picker.value === '@') {
                        // default, no filtering, scoring...
                        item.score = 0;
                        item.highlights = undefined;
                        return true;
                    }
                    const trimmedQuery = picker.value.substring(AbstractGotoSymbolQuickAccessProvider.PREFIX.length).trim();
                    const parsedLabel = parseLabelWithIcons(item.label);
                    const score = fuzzyScore(trimmedQuery, trimmedQuery.toLowerCase(), 0, parsedLabel.text, parsedLabel.text.toLowerCase(), 0, { firstMatchCanBeWeak: true, boostFullMatch: true });
                    if (!score) {
                        return false;
                    }
                    item.score = score[1];
                    item.highlights = { label: matchesFuzzyIconAware(trimmedQuery, parsedLabel) ?? undefined };
                    return true;
                });
                if (filteredItems.length === 0) {
                    const label = localize('empty', 'No matching entries');
                    picker.items = [{ label, index: -1, kind: 14 /* SymbolKind.String */ }];
                    picker.ariaLabel = label;
                }
                else {
                    picker.items = filteredItems;
                }
            };
            updatePickerItems();
            disposables.add(picker.onDidChangeValue(updatePickerItems));
            const previewDisposable = new MutableDisposable();
            disposables.add(previewDisposable);
            disposables.add(picker.onDidChangeActive(() => {
                const [entry] = picker.activeItems;
                if (entry && entries[entry.index]) {
                    previewDisposable.value = outline.preview(entries[entry.index].element);
                }
                else {
                    previewDisposable.clear();
                }
            }));
        }).catch(err => {
            onUnexpectedError(err);
            picker.hide();
        }).finally(() => {
            picker.busy = false;
        });
        return disposables;
    }
};
GotoSymbolQuickAccessProvider = GotoSymbolQuickAccessProvider_1 = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, IConfigurationService),
    __param(3, ILanguageFeaturesService),
    __param(4, IOutlineService),
    __param(5, IOutlineModelService)
], GotoSymbolQuickAccessProvider);
export { GotoSymbolQuickAccessProvider };
class GotoSymbolAction extends Action2 {
    static { this.ID = 'workbench.action.gotoSymbol'; }
    constructor() {
        super({
            id: GotoSymbolAction.ID,
            title: {
                ...localize2('gotoSymbol', "Go to Symbol in Editor..."),
                mnemonicTitle: localize({ key: 'miGotoSymbolInEditor', comment: ['&& denotes a mnemonic'] }, "Go to &&Symbol in Editor..."),
            },
            f1: true,
            keybinding: {
                when: ContextKeyExpr.and(accessibleViewIsShown.negate(), accessibilityHelpIsShown.negate()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */
            },
            menu: [{
                    id: MenuId.MenubarGoMenu,
                    group: '4_symbol_nav',
                    order: 1
                }]
        });
    }
    run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(GotoSymbolQuickAccessProvider.PREFIX, { itemActivation: ItemActivation.NONE });
    }
}
registerAction2(GotoSymbolAction);
Registry.as(QuickaccessExtensions.Quickaccess).registerQuickAccessProvider({
    ctor: GotoSymbolQuickAccessProvider,
    prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX,
    contextKey: 'inFileSymbolsPicker',
    placeholder: localize('gotoSymbolQuickAccessPlaceholder', "Type the name of a symbol to go to."),
    helpEntries: [
        {
            description: localize('gotoSymbolQuickAccess', "Go to Symbol in Editor"),
            prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX,
            commandId: GotoSymbolAction.ID,
            commandCenterOrder: 40
        },
        {
            description: localize('gotoSymbolByCategoryQuickAccess', "Go to Symbol in Editor by Category"),
            prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX_BY_CATEGORY
        }
    ]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b1N5bWJvbFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9xdWlja2FjY2Vzcy9nb3RvU3ltYm9sUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFpQyxrQkFBa0IsRUFBYyxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN4SixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBd0IsVUFBVSxJQUFJLHFCQUFxQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDckksT0FBTyxFQUFFLHFDQUFxQyxFQUE0QixNQUFNLDRFQUE0RSxDQUFDO0FBQzdKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBR3RHLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFckcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxVQUFVLEVB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