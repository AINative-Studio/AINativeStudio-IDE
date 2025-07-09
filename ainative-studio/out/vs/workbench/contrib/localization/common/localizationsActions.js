/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ILanguagePackService } from '../../../../platform/languagePacks/common/languagePacks.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
export class ConfigureDisplayLanguageAction extends Action2 {
    static { this.ID = 'workbench.action.configureLocale'; }
    constructor() {
        super({
            id: ConfigureDisplayLanguageAction.ID,
            title: localize2('configureLocale', "Configure Display Language"),
            menu: {
                id: MenuId.CommandPalette
            },
            metadata: {
                description: localize2('configureLocaleDescription', "Changes the locale of VS Code based on installed language packs. Common languages include French, Chinese, Spanish, Japanese, German, Korean, and more.")
            }
        });
    }
    async run(accessor) {
        const languagePackService = accessor.get(ILanguagePackService);
        const quickInputService = accessor.get(IQuickInputService);
        const localeService = accessor.get(ILocaleService);
        const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const installedLanguages = await languagePackService.getInstalledLanguages();
        const disposables = new DisposableStore();
        const qp = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
        qp.matchOnDescription = true;
        qp.placeholder = localize('chooseLocale', "Select Display Language");
        if (installedLanguages?.length) {
            const items = [{ type: 'separator', label: localize('installed', "Installed") }];
            qp.items = items.concat(this.withMoreInfoButton(installedLanguages));
        }
        const source = new CancellationTokenSource();
        disposables.add(qp.onDispose(() => {
            source.cancel();
            disposables.dispose();
        }));
        const installedSet = new Set(installedLanguages?.map(language => language.id) ?? []);
        languagePackService.getAvailableLanguages().then(availableLanguages => {
            const newLanguages = availableLanguages.filter(l => l.id && !installedSet.has(l.id));
            if (newLanguages.length) {
                qp.items = [
                    ...qp.items,
                    { type: 'separator', label: localize('available', "Available") },
                    ...this.withMoreInfoButton(newLanguages)
                ];
            }
            qp.busy = false;
        });
        disposables.add(qp.onDidAccept(async () => {
            const selectedLanguage = qp.activeItems[0];
            if (selectedLanguage) {
                qp.hide();
                await localeService.setLocale(selectedLanguage);
            }
        }));
        disposables.add(qp.onDidTriggerItemButton(async (e) => {
            qp.hide();
            if (e.item.extensionId) {
                await extensionWorkbenchService.open(e.item.extensionId);
            }
        }));
        qp.show();
        qp.busy = true;
    }
    withMoreInfoButton(items) {
        for (const item of items) {
            if (item.extensionId) {
                item.buttons = [{
                        tooltip: localize('moreInfo', "More Info"),
                        iconClass: 'codicon-info'
                    }];
            }
        }
        return items;
    }
}
export class ClearDisplayLanguageAction extends Action2 {
    static { this.ID = 'workbench.action.clearLocalePreference'; }
    static { this.LABEL = localize2('clearDisplayLanguage', "Clear Display Language Preference"); }
    constructor() {
        super({
            id: ClearDisplayLanguageAction.ID,
            title: ClearDisplayLanguageAction.LABEL,
            menu: {
                id: MenuId.CommandPalette
            }
        });
    }
    async run(accessor) {
        const localeService = accessor.get(ILocaleService);
        await localeService.clearLocalePreference();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxpemF0aW9uL2NvbW1vbi9sb2NhbGl6YXRpb25zQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBdUIsTUFBTSxzREFBc0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVqRixPQUFPLEVBQXFCLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXBGLE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxPQUFPO2FBQ25DLE9BQUUsR0FBRyxrQ0FBa0MsQ0FBQztJQUUvRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw4QkFBOEIsQ0FBQyxFQUFFO1lBQ3JDLEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsNEJBQTRCLENBQUM7WUFDakUsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYzthQUN6QjtZQUNELFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsU0FBUyxDQUFDLDRCQUE0QixFQUFFLHlKQUF5SixDQUFDO2FB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