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
import { Language, LANGUAGE_DEFAULT } from '../../../../base/common/platform.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { IActiveLanguagePackService, ILocaleService } from '../common/locale.js';
import { ILanguagePackService } from '../../../../platform/languagePacks/common/languagePacks.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { localize } from '../../../../nls.js';
import { toAction } from '../../../../base/common/actions.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { parse } from '../../../../base/common/jsonc.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IHostService } from '../../host/browser/host.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
// duplicate of VIEWLET_ID in contrib/extensions
const EXTENSIONS_VIEWLET_ID = 'workbench.view.extensions';
let NativeLocaleService = class NativeLocaleService {
    constructor(jsonEditingService, environmentService, notificationService, languagePackService, paneCompositePartService, extensionManagementService, progressService, textFileService, editorService, dialogService, hostService, productService) {
        this.jsonEditingService = jsonEditingService;
        this.environmentService = environmentService;
        this.notificationService = notificationService;
        this.languagePackService = languagePackService;
        this.paneCompositePartService = paneCompositePartService;
        this.extensionManagementService = extensionManagementService;
        this.progressService = progressService;
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.productService = productService;
    }
    async validateLocaleFile() {
        try {
            const content = await this.textFileService.read(this.environmentService.argvResource, { encoding: 'utf8' });
            // This is the same logic that we do where argv.json is parsed so mirror that:
            // https://github.com/microsoft/vscode/blob/32d40cf44e893e87ac33ac4f08de1e5f7fe077fc/src/main.js#L238-L246
            parse(content.value);
        }
        catch (error) {
            this.notificationService.notify({
                severity: Severity.Error,
                message: localize('argvInvalid', 'Unable to write display language. Please open the runtime settings, correct errors/warnings in it and try again.'),
                actions: {
                    primary: [
                        toAction({
                            id: 'openArgv',
                            label: localize('openArgv', "Open Runtime Settings"),
                            run: () => this.editorService.openEditor({ resource: this.environmentService.argvResource })
                        })
                    ]
                }
            });
            return false;
        }
        return true;
    }
    async writeLocaleValue(locale) {
        if (!(await this.validateLocaleFile())) {
            return false;
        }
        await this.jsonEditingService.write(this.environmentService.argvResource, [{ path: ['locale'], value: locale }], true);
        return true;
    }
    async setLocale(languagePackItem, skipDialog = false) {
        const locale = languagePackItem.id;
        if (locale === Language.value() || (!locale && Language.isDefaultVariant())) {
            return;
        }
        const installedLanguages = await this.languagePackService.getInstalledLanguages();
        try {
            // Only Desktop has the concept of installing language packs so we only do this for Desktop
            // and only if the language pack is not installed
            if (!installedLanguages.some(installedLanguage => installedLanguage.id === languagePackItem.id)) {
                // Only actually install a language pack from Microsoft
                if (languagePackItem.galleryExtension?.publisher.toLowerCase() !== 'ms-ceintl') {
                    // Show the view so the user can see the language pack that they should install
                    // as of now, there are no 3rd party language packs available on the Marketplace.
                    const viewlet = await this.paneCompositePartService.openPaneComposite(EXTENSIONS_VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
                    (viewlet?.getViewPaneContainer()).search(`@id:${languagePackItem.extensionId}`);
                    return;
                }
                await this.progressService.withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: localize('installing', "Installing {0} language support...", languagePackItem.label),
                }, progress => this.extensionManagementService.installFromGallery(languagePackItem.galleryExtension, {
                    // Setting this to false is how you get the extension to be synced with Settings Sync (if enabled).
                    isMachineScoped: false,
                }));
            }
            if (!skipDialog && !await this.showRestartDialog(languagePackItem.label)) {
                return;
            }
            await this.writeLocaleValue(locale);
            await this.hostService.restart();
        }
        catch (err) {
            this.notificationService.error(err);
        }
    }
    async clearLocalePreference() {
        try {
            await this.writeLocaleValue(undefined);
            if (!Language.isDefaultVariant()) {
                await this.showRestartDialog('English');
            }
        }
        catch (err) {
            this.notificationService.error(err);
        }
    }
    async showRestartDialog(languageName) {
        const { confirmed } = await this.dialogService.confirm({
            message: localize('restartDisplayLanguageMessage1', "Restart {0} to switch to {1}?", this.productService.nameLong, languageName),
            detail: localize('restartDisplayLanguageDetail1', "To change the display language to {0}, {1} needs to restart.", languageName, this.productService.nameLong),
            primaryButton: localize({ key: 'restart', comment: ['&& denotes a mnemonic character'] }, "&&Restart"),
        });
        return confirmed;
    }
};
NativeLocaleService = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IEnvironmentService),
    __param(2, INotificationService),
    __param(3, ILanguagePackService),
    __param(4, IPaneCompositePartService),
    __param(5, IExtensionManagementService),
    __param(6, IProgressService),
    __param(7, ITextFileService),
    __param(8, IEditorService),
    __param(9, IDialogService),
    __param(10, IHostService),
    __param(11, IProductService)
], NativeLocaleService);
// This is its own service because the localeService depends on IJSONEditingService which causes a circular dependency
// Once that's ironed out, we can fold this into the localeService.
let NativeActiveLanguagePackService = class NativeActiveLanguagePackService {
    constructor(languagePackService) {
        this.languagePackService = languagePackService;
    }
    async getExtensionIdProvidingCurrentLocale() {
        const language = Language.value();
        if (language === LANGUAGE_DEFAULT) {
            return undefined;
        }
        const languages = await this.languagePackService.getInstalledLanguages();
        const languagePack = languages.find(l => l.id === language);
        return languagePack?.extensionId;
    }
};
NativeActiveLanguagePackService = __decorate([
    __param(0, ILanguagePackService)
], NativeActiveLanguagePackService);
registerSingleton(ILocaleService, NativeLocaleService, 1 /* InstantiationType.Delayed */);
registerSingleton(IActiveLanguagePackService, NativeActiveLanguagePackService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbG9jYWxpemF0aW9uL2VsZWN0cm9uLXNhbmRib3gvbG9jYWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNqRixPQUFPLEVBQXFCLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFekYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDckgsT0FBTyxFQUFFLGdCQUFnQixFQUFvQixNQUFNLGtEQUFrRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FB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