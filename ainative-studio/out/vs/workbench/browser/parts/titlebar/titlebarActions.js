/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID } from '../../../common/activity.js';
import { IsAuxiliaryWindowFocusedContext, IsMainWindowFullscreenContext, TitleBarStyleContext, TitleBarVisibleContext } from '../../../common/contextkeys.js';
import { isLinux, isNative } from '../../../../base/common/platform.js';
// --- Context Menu Actions --- //
export class ToggleTitleBarConfigAction extends Action2 {
    constructor(section, title, description, order, mainWindowOnly, when) {
        when = ContextKeyExpr.and(mainWindowOnly ? IsAuxiliaryWindowFocusedContext.toNegated() : ContextKeyExpr.true(), when);
        super({
            id: `toggle.${section}`,
            title,
            metadata: description ? { description } : undefined,
            toggled: ContextKeyExpr.equals(`config.${section}`, true),
            menu: [
                {
                    id: MenuId.TitleBarContext,
                    when,
                    order,
                    group: '2_config'
                },
                {
                    id: MenuId.TitleBarTitleContext,
                    when,
                    order,
                    group: '2_config'
                }
            ]
        });
        this.section = section;
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        const value = configService.getValue(this.section);
        configService.updateValue(this.section, !value);
    }
}
registerAction2(class ToggleCommandCenter extends ToggleTitleBarConfigAction {
    constructor() {
        super("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */, localize('toggle.commandCenter', 'Command Center'), localize('toggle.commandCenterDescription', "Toggle visibility of the Command Center in title bar"), 1, false);
    }
});
registerAction2(class ToggleNavigationControl extends ToggleTitleBarConfigAction {
    constructor() {
        super('workbench.navigationControl.enabled', localize('toggle.navigation', 'Navigation Controls'), localize('toggle.navigationDescription', "Toggle visibility of the Navigation Controls in title bar"), 2, false, ContextKeyExpr.has('config.window.commandCenter'));
    }
});
registerAction2(class ToggleLayoutControl extends ToggleTitleBarConfigAction {
    constructor() {
        super("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */, localize('toggle.layout', 'Layout Controls'), localize('toggle.layoutDescription', "Toggle visibility of the Layout Controls in title bar"), 4, true);
    }
});
registerAction2(class ToggleCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `toggle.${"window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */}`,
            title: localize('toggle.hideCustomTitleBar', 'Hide Custom Title Bar'),
            menu: [
                { id: MenuId.TitleBarContext, order: 0, when: ContextKeyExpr.equals(TitleBarStyleContext.key, "native" /* TitlebarStyle.NATIVE */), group: '3_toggle' },
                { id: MenuId.TitleBarTitleContext, order: 0, when: ContextKeyExpr.equals(TitleBarStyleContext.key, "native" /* TitlebarStyle.NATIVE */), group: '3_toggle' },
            ]
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "never" /* CustomTitleBarVisibility.NEVER */);
    }
});
registerAction2(class ToggleCustomTitleBarWindowed extends Action2 {
    constructor() {
        super({
            id: `toggle.${"window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */}.windowed`,
            title: localize('toggle.hideCustomTitleBarInFullScreen', 'Hide Custom Title Bar In Full Screen'),
            menu: [
                { id: MenuId.TitleBarContext, order: 1, when: IsMainWindowFullscreenContext, group: '3_toggle' },
                { id: MenuId.TitleBarTitleContext, order: 1, when: IsMainWindowFullscreenContext, group: '3_toggle' },
            ]
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "windowed" /* CustomTitleBarVisibility.WINDOWED */);
    }
});
class ToggleCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `toggle.toggleCustomTitleBar`,
            title: localize('toggle.customTitleBar', 'Custom Title Bar'),
            toggled: TitleBarVisibleContext,
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    order: 6,
                    when: ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(TitleBarStyleContext.key, "native" /* TitlebarStyle.NATIVE */), ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.layoutControl.enabled', false), ContextKeyExpr.equals('config.window.commandCenter', false), ContextKeyExpr.notEquals('config.workbench.editor.editorActionsLocation', 'titleBar'), ContextKeyExpr.notEquals('config.workbench.activityBar.location', 'top'), ContextKeyExpr.notEquals('config.workbench.activityBar.location', 'bottom'))?.negate()), IsMainWindowFullscreenContext),
                    group: '2_workbench_layout'
                },
            ],
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        const contextKeyService = accessor.get(IContextKeyService);
        const titleBarVisibility = configService.getValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */);
        switch (titleBarVisibility) {
            case "never" /* CustomTitleBarVisibility.NEVER */:
                configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
                break;
            case "windowed" /* CustomTitleBarVisibility.WINDOWED */: {
                const isFullScreen = IsMainWindowFullscreenContext.evaluate(contextKeyService.getContext(null));
                if (isFullScreen) {
                    configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
                }
                else {
                    configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "never" /* CustomTitleBarVisibility.NEVER */);
                }
                break;
            }
            case "auto" /* CustomTitleBarVisibility.AUTO */:
            default:
                configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "never" /* CustomTitleBarVisibility.NEVER */);
                break;
        }
    }
}
registerAction2(ToggleCustomTitleBar);
registerAction2(class ShowCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `showCustomTitleBar`,
            title: localize2('showCustomTitleBar', "Show Custom Title Bar"),
            precondition: TitleBarVisibleContext.negate(),
            f1: true
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "auto" /* CustomTitleBarVisibility.AUTO */);
    }
});
registerAction2(class HideCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `hideCustomTitleBar`,
            title: localize2('hideCustomTitleBar', "Hide Custom Title Bar"),
            precondition: TitleBarVisibleContext,
            f1: true
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "never" /* CustomTitleBarVisibility.NEVER */);
    }
});
registerAction2(class HideCustomTitleBar extends Action2 {
    constructor() {
        super({
            id: `hideCustomTitleBarInFullScreen`,
            title: localize2('hideCustomTitleBarInFullScreen', "Hide Custom Title Bar In Full Screen"),
            precondition: ContextKeyExpr.and(TitleBarVisibleContext, IsMainWindowFullscreenContext),
            f1: true
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        configService.updateValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */, "windowed" /* CustomTitleBarVisibility.WINDOWED */);
    }
});
registerAction2(class ToggleEditorActions extends Action2 {
    static { this.settingsID = `workbench.editor.editorActionsLocation`; }
    constructor() {
        const titleBarContextCondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.workbench.editor.showTabs`, 'none').negate(), ContextKeyExpr.equals(`config.${ToggleEditorActions.settingsID}`, 'default'))?.negate();
        super({
            id: `toggle.${ToggleEditorActions.settingsID}`,
            title: localize('toggle.editorActions', 'Editor Actions'),
            toggled: ContextKeyExpr.equals(`config.${ToggleEditorActions.settingsID}`, 'hidden').negate(),
            menu: [
                { id: MenuId.TitleBarContext, order: 3, when: titleBarContextCondition, group: '2_config' },
                { id: MenuId.TitleBarTitleContext, order: 3, when: titleBarContextCondition, group: '2_config' }
            ]
        });
    }
    run(accessor, ...args) {
        const configService = accessor.get(IConfigurationService);
        const storageService = accessor.get(IStorageService);
        const location = configService.getValue(ToggleEditorActions.settingsID);
        if (location === 'hidden') {
            const showTabs = configService.getValue("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */);
            // If tabs are visible, then set the editor actions to be in the title bar
            if (showTabs !== 'none') {
                configService.updateValue(ToggleEditorActions.settingsID, 'titleBar');
            }
            // If tabs are not visible, then set the editor actions to the last location the were before being hidden
            else {
                const storedValue = storageService.get(ToggleEditorActions.settingsID, 0 /* StorageScope.PROFILE */);
                configService.updateValue(ToggleEditorActions.settingsID, storedValue ?? 'default');
            }
            storageService.remove(ToggleEditorActions.settingsID, 0 /* StorageScope.PROFILE */);
        }
        // Store the current value (titleBar or default) in the storage service for later to restore
        else {
            configService.updateValue(ToggleEditorActions.settingsID, 'hidden');
            storageService.store(ToggleEditorActions.settingsID, location, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
});
if (isLinux && isNative) {
    registerAction2(class ToggleCustomTitleBar extends Action2 {
        constructor() {
            super({
                id: `toggle.${"window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */}`,
                title: localize('toggle.titleBarStyle', 'Restore Native Title Bar'),
                menu: [
                    { id: MenuId.TitleBarContext, order: 0, when: ContextKeyExpr.equals(TitleBarStyleContext.key, "custom" /* TitlebarStyle.CUSTOM */), group: '4_restore_native_title' },
                    { id: MenuId.TitleBarTitleContext, order: 0, when: ContextKeyExpr.equals(TitleBarStyleContext.key, "custom" /* TitlebarStyle.CUSTOM */), group: '4_restore_native_title' },
                ]
            });
        }
        run(accessor) {
            const configService = accessor.get(IConfigurationService);
            configService.updateValue("window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */, "native" /* TitlebarStyle.NATIVE */);
        }
    });
}
// --- Toolbar actions --- //
export const ACCOUNTS_ACTIVITY_TILE_ACTION = {
    id: ACCOUNTS_ACTIVITY_ID,
    label: localize('accounts', "Accounts"),
    tooltip: localize('accounts', "Accounts"),
    class: undefined,
    enabled: true,
    run: function () { }
};
export const GLOBAL_ACTIVITY_TITLE_ACTION = {
    id: GLOBAL_ACTIVITY_ID,
    label: localize('manage', "Manage"),
    tooltip: localize('manage', "Manage"),
    class: undefined,
    enabled: true,
    run: function () { }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGl0bGViYXJBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3RpdGxlYmFyL3RpdGxlYmFyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW9CLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQXdCLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEksT0FBTyxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdkYsT0FBTyxFQUFFLCtCQUErQixFQUFFLDZCQUE2QixFQUFFLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFOUosT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV4RSxrQ0FBa0M7QUFFbEMsTUFBTSxPQUFPLDBCQUEyQixTQUFRLE9BQU87SUFFdEQsWUFBNkIsT0FBZSxFQUFFLEtBQWEsRUFBRSxXQUFrRCxFQUFFLEtBQWEsRUFBRSxjQUF1QixFQUFFLElBQTJCO1FBQ25MLElBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJ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