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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b1N5bWJvbFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvcXVpY2thY2Nlc3MvZ290b1N5bWJvbFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBaUMsa0JBQWtCLEVBQWMsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDeEosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXJGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvRSxPQUFPLEVBQXdCLFVBQVUsSUFBSSxxQkFBcUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxxQ0FBcUMsRUFBNEIsTUFBTSw0RUFBNEUsQ0FBQztBQUM3SixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUd0RyxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwSSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXJHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJekUsT0FBTyxFQUFFLGVBQWUsRUFBaUIsTUFBTSxpREFBaUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUM3RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDL0gsT0FBTyxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFL0YsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxxQ0FBcUM7O0lBSXZGLFlBQ2lCLGFBQThDLEVBQ3hDLGtCQUF5RCxFQUN4RCxvQkFBNEQsRUFDekQsdUJBQWlELEVBQzFELGNBQWdELEVBQzNDLG1CQUF5QztRQUUvRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUU7WUFDbkQsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUI7U0FDekUsQ0FBQyxDQUFDO1FBVDhCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN2Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXNCO1FBQ3ZDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFakQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBUC9DLHVDQUFrQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUM7SUFhbkcsQ0FBQztJQUVELGdEQUFnRDtJQUVoRCxJQUFZLGFBQWE7UUFDeEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBaUMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDO1FBRTNHLE9BQU87WUFDTixnQkFBZ0IsRUFBRSxDQUFDLFlBQVksRUFBRSwwQkFBMEIsSUFBSSxDQUFDLFlBQVksRUFBRSxhQUFhO1lBQzNGLHVCQUF1QixFQUFFLFlBQVksRUFBRSx1QkFBdUI7U0FDOUQsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFjLHVCQUF1QjtRQUVwQyxzRUFBc0U7UUFDdEUsd0VBQXdFO1FBQ3hFLDJFQUEyRTtRQUMzRSx5Q0FBeUM7UUFDekMsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMxRSxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDO0lBQ25ELENBQUM7SUFFa0IsWUFBWSxDQUFDLE9BQXNDLEVBQUUsT0FBaUc7UUFFeEssMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3SixPQUFPLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUMsK0RBQStEO1lBRTdGLE1BQU0sYUFBYSxHQUF1QjtnQkFDekMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxLQUFLO2dCQUN4QixNQUFNLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0I7Z0JBQ3RFLGFBQWEsRUFBRSxPQUFPLENBQUMsYUFBYTthQUNwQyxDQUFDO1lBRUYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDOUYsQ0FBQztRQUVELGlDQUFpQzthQUM1QixDQUFDO1lBQ0wsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO0lBRVosOERBQThEO2FBRXRDLHlCQUFvQixHQUFHLElBQUksQUFBUCxDQUFRO0lBRXBELEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBaUIsRUFBRSxNQUFjLEVBQUUsT0FBeUMsRUFBRSxXQUE0QixFQUFFLEtBQXdCO1FBRXhKLGtFQUFrRTtRQUNsRSw4REFBOEQ7UUFDOUQsNERBQTREO1FBQzVELHFEQUFxRDtRQUNyRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDakMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssRUFBRSxXQUFXLENBQUM7WUFDdEQsT0FBTyxDQUFDLCtCQUE2QixDQUFDLG9CQUFvQixDQUFDO1NBQzNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDOUMsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNsSCxDQUFDO0lBRUQsWUFBWTtJQUVPLHdCQUF3QixDQUFDLE1BQXFFO1FBQ2hILElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsQ0FBQztZQUN0QyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDaEksQ0FBQztJQUVPLGlCQUFpQixDQUFDLE1BQXFFO1FBQzlGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7UUFDakQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3hCLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFFMUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxXQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2RCxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUVuQixJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxJQUFJLG1DQUEyQixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBRTFGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPO1lBQ1IsQ0FBQztZQUNELElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU87WUFDUixDQUFDO1lBRUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV6QixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM3QyxXQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ2pDLElBQUksTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3ZDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFSixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFFMUUsTUFBTSxLQUFLLEdBQStCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ3BFLE9BQU87b0JBQ04sSUFBSSx5QkFBaUI7b0JBQ3JCLEtBQUssRUFBRSxHQUFHO29CQUNWLEtBQUssRUFBRSxDQUFDO29CQUNSLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztvQkFDbEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO29CQUM5QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7b0JBQzFCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztpQkFDOUIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDdkMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNkLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDO2dCQUNyQyxJQUFJLEtBQUssSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25DLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDaEUsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFSixNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtnQkFDOUIsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDekMsSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUMxQixvQ0FBb0M7d0JBQ3BDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNmLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO3dCQUM1QixPQUFPLElBQUksQ0FBQztvQkFDYixDQUFDO29CQUVELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLHFDQUFxQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDeEcsTUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNwRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLEVBQ25FLFdBQVcsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLEVBQ25ELEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUV0RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ1osT0FBTyxLQUFLLENBQUM7b0JBQ2QsQ0FBQztvQkFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQzNGLE9BQU8sSUFBSSxDQUFDO2dCQUNiLENBQUMsQ0FBQyxDQUFDO2dCQUVILElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDaEMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO29CQUN2RCxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksNEJBQW1CLEVBQUUsQ0FBQyxDQUFDO29CQUMvRCxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDMUIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDO2dCQUM5QixDQUFDO1lBQ0YsQ0FBQyxDQUFDO1lBQ0YsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFFNUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDbEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBRW5DLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtnQkFDN0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBQ25DLElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDbkMsaUJBQWlCLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDekUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNkLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDZixNQUFNLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7O0FBL01XLDZCQUE2QjtJQUt2QyxXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxvQkFBb0IsQ0FBQTtHQVZWLDZCQUE2QixDQWdOekM7O0FBRUQsTUFBTSxnQkFBaUIsU0FBUSxPQUFPO2FBRXJCLE9BQUUsR0FBRyw2QkFBNkIsQ0FBQztJQUVuRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ3ZCLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsMkJBQTJCLENBQUM7Z0JBQ3ZELGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLDZCQUE2QixDQUFDO2FBQzNIO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNGLE1BQU0sNkNBQW1DO2dCQUN6QyxPQUFPLEVBQUUsbURBQTZCLHdCQUFlO2FBQ3JEO1lBQ0QsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxhQUFhO29CQUN4QixLQUFLLEVBQUUsY0FBYztvQkFDckIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2xJLENBQUM7O0FBR0YsZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFbEMsUUFBUSxDQUFDLEVBQUUsQ0FBdUIscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUMsMkJBQTJCLENBQUM7SUFDaEcsSUFBSSxFQUFFLDZCQUE2QjtJQUNuQyxNQUFNLEVBQUUscUNBQXFDLENBQUMsTUFBTTtJQUNwRCxVQUFVLEVBQUUscUJBQXFCO0lBQ2pDLFdBQVcsRUFBRSxRQUFRLENBQUMsa0NBQWtDLEVBQUUscUNBQXFDLENBQUM7SUFDaEcsV0FBVyxFQUFFO1FBQ1o7WUFDQyxXQUFXLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHdCQUF3QixDQUFDO1lBQ3hFLE1BQU0sRUFBRSxxQ0FBcUMsQ0FBQyxNQUFNO1lBQ3BELFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFO1lBQzlCLGtCQUFrQixFQUFFLEVBQUU7U0FDdEI7UUFDRDtZQUNDLFdBQVcsRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsb0NBQW9DLENBQUM7WUFDOUYsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLGtCQUFrQjtTQUNoRTtLQUNEO0NBQ0QsQ0FBQyxDQUFDIn0=