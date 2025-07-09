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
import { Action } from '../../../../base/common/actions.js';
import { URI } from '../../../../base/common/uri.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import * as nls from '../../../../nls.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { MenuId, MenuRegistry, isIMenuItem } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { isLocalizedString } from '../../../../platform/action/common/action.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
let ConfigureLanguageBasedSettingsAction = class ConfigureLanguageBasedSettingsAction extends Action {
    static { this.ID = 'workbench.action.configureLanguageBasedSettings'; }
    static { this.LABEL = nls.localize2('configureLanguageBasedSettings', "Configure Language Specific Settings..."); }
    constructor(id, label, modelService, languageService, quickInputService, preferencesService) {
        super(id, label);
        this.modelService = modelService;
        this.languageService = languageService;
        this.quickInputService = quickInputService;
        this.preferencesService = preferencesService;
    }
    async run() {
        const languages = this.languageService.getSortedRegisteredLanguageNames();
        const picks = languages.map(({ languageName, languageId }) => {
            const description = nls.localize('languageDescriptionConfigured', "({0})", languageId);
            // construct a fake resource to be able to show nice icons if any
            let fakeResource;
            const extensions = this.languageService.getExtensions(languageId);
            if (extensions.length) {
                fakeResource = URI.file(extensions[0]);
            }
            else {
                const filenames = this.languageService.getFilenames(languageId);
                if (filenames.length) {
                    fakeResource = URI.file(filenames[0]);
                }
            }
            return {
                label: languageName,
                iconClasses: getIconClasses(this.modelService, this.languageService, fakeResource),
                description
            };
        });
        await this.quickInputService.pick(picks, { placeHolder: nls.localize('pickLanguage', "Select Language") })
            .then(pick => {
            if (pick) {
                const languageId = this.languageService.getLanguageIdByLanguageName(pick.label);
                if (typeof languageId === 'string') {
                    return this.preferencesService.openLanguageSpecificSettings(languageId);
                }
            }
            return undefined;
        });
    }
};
ConfigureLanguageBasedSettingsAction = __decorate([
    __param(2, IModelService),
    __param(3, ILanguageService),
    __param(4, IQuickInputService),
    __param(5, IPreferencesService)
], ConfigureLanguageBasedSettingsAction);
export { ConfigureLanguageBasedSettingsAction };
// Register a command that gets all settings
CommandsRegistry.registerCommand({
    id: '_getAllSettings',
    handler: () => {
        const configRegistry = Registry.as(Extensions.Configuration);
        const allSettings = configRegistry.getConfigurationProperties();
        return allSettings;
    }
});
//#region --- Register a command to get all actions from the command palette
CommandsRegistry.registerCommand('_getAllCommands', function (accessor, filterByPrecondition) {
    const keybindingService = accessor.get(IKeybindingService);
    const contextKeyService = accessor.get(IContextKeyService);
    const actions = [];
    for (const editorAction of EditorExtensionsRegistry.getEditorActions()) {
        const keybinding = keybindingService.lookupKeybinding(editorAction.id);
        if (filterByPrecondition && !contextKeyService.contextMatchesRules(editorAction.precondition)) {
            continue;
        }
        actions.push({
            command: editorAction.id,
            label: editorAction.label,
            description: isLocalizedString(editorAction.metadata?.description) ? editorAction.metadata.description.value : editorAction.metadata?.description,
            precondition: editorAction.precondition?.serialize(),
            keybinding: keybinding?.getLabel() ?? 'Not set'
        });
    }
    for (const menuItem of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
        if (isIMenuItem(menuItem)) {
            if (filterByPrecondition && !contextKeyService.contextMatchesRules(menuItem.when)) {
                continue;
            }
            const title = typeof menuItem.command.title === 'string' ? menuItem.command.title : menuItem.command.title.value;
            const category = menuItem.command.category ? typeof menuItem.command.category === 'string' ? menuItem.command.category : menuItem.command.category.value : undefined;
            const label = category ? `${category}: ${title}` : title;
            const description = isLocalizedString(menuItem.command.metadata?.description) ? menuItem.command.metadata.description.value : menuItem.command.metadata?.description;
            const keybinding = keybindingService.lookupKeybinding(menuItem.command.id);
            actions.push({
                command: menuItem.command.id,
                label,
                description,
                precondition: menuItem.when?.serialize(),
                keybinding: keybinding?.getLabel() ?? 'Not set'
            });
        }
    }
    for (const command of KeybindingsRegistry.getDefaultKeybindings()) {
        if (filterByPrecondition && !contextKeyService.contextMatchesRules(command.when ?? undefined)) {
            continue;
        }
        const keybinding = keybindingService.lookupKeybinding(command.command ?? '');
        if (!keybinding) {
            continue;
        }
        if (actions.some(a => a.command === command.command)) {
            continue;
        }
        actions.push({
            command: command.command ?? '',
            label: command.command ?? '',
            keybinding: keybinding?.getLabel() ?? 'Not set',
            precondition: command.when?.serialize()
        });
    }
    return actions;
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXNBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlC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