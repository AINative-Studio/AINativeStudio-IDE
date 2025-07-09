/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../platform/registry/common/platform.js';
import { localize, localize2 } from '../../nls.js';
import { MenuRegistry, MenuId, registerAction2 } from '../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions } from '../../platform/configuration/common/configurationRegistry.js';
import { isLinux, isMacintosh, isWindows } from '../../base/common/platform.js';
import { ConfigureRuntimeArgumentsAction, ToggleDevToolsAction, ReloadWindowWithExtensionsDisabledAction, OpenUserDataFolderAction, ShowGPUInfoAction } from './actions/developerActions.js';
import { ZoomResetAction, ZoomOutAction, ZoomInAction, CloseWindowAction, SwitchWindowAction, QuickSwitchWindowAction, NewWindowTabHandler, ShowPreviousWindowTabHandler, ShowNextWindowTabHandler, MoveWindowTabToNewWindowHandler, MergeWindowTabsHandlerHandler, ToggleWindowTabsBarHandler } from './actions/windowActions.js';
import { ContextKeyExpr } from '../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../platform/keybinding/common/keybindingsRegistry.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { IsMacContext } from '../../platform/contextkey/common/contextkeys.js';
import { INativeHostService } from '../../platform/native/common/native.js';
import { Extensions as JSONExtensions } from '../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { InstallShellScriptAction, UninstallShellScriptAction } from './actions/installActions.js';
import { EditorsVisibleContext, SingleEditorGroupsContext } from '../common/contextkeys.js';
import { TELEMETRY_SETTING_ID } from '../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { NativeWindow } from './window.js';
import { ModifierKeyEmitter } from '../../base/browser/dom.js';
import { applicationConfigurationNodeBase, securityConfigurationNodeBase } from '../common/configuration.js';
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL } from '../../platform/window/electron-sandbox/window.js';
import { DefaultAccountManagementContribution } from '../services/accounts/common/defaultAccount.js';
import { registerWorkbenchContribution2 } from '../common/contributions.js';
// Actions
(function registerActions() {
    // Actions: Zoom
    registerAction2(ZoomInAction);
    registerAction2(ZoomOutAction);
    registerAction2(ZoomResetAction);
    // Actions: Window
    registerAction2(SwitchWindowAction);
    registerAction2(QuickSwitchWindowAction);
    registerAction2(CloseWindowAction);
    if (isMacintosh) {
        // macOS: behave like other native apps that have documents
        // but can run without a document opened and allow to close
        // the window when the last document is closed
        // (https://github.com/microsoft/vscode/issues/126042)
        KeybindingsRegistry.registerKeybindingRule({
            id: CloseWindowAction.ID,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(EditorsVisibleContext.toNegated(), SingleEditorGroupsContext),
            primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */
        });
    }
    // Actions: Install Shell Script (macOS only)
    if (isMacintosh) {
        registerAction2(InstallShellScriptAction);
        registerAction2(UninstallShellScriptAction);
    }
    // Quit
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: 'workbench.action.quit',
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        async handler(accessor) {
            const nativeHostService = accessor.get(INativeHostService);
            const configurationService = accessor.get(IConfigurationService);
            const confirmBeforeClose = configurationService.getValue('window.confirmBeforeClose');
            if (confirmBeforeClose === 'always' || (confirmBeforeClose === 'keyboardOnly' && ModifierKeyEmitter.getInstance().isModifierPressed)) {
                const confirmed = await NativeWindow.confirmOnShutdown(accessor, 2 /* ShutdownReason.QUIT */);
                if (!confirmed) {
                    return; // quit prevented by user
                }
            }
            nativeHostService.quit();
        },
        when: undefined,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */ },
        linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */ }
    });
    // Actions: macOS Native Tabs
    if (isMacintosh) {
        for (const command of [
            { handler: NewWindowTabHandler, id: 'workbench.action.newWindowTab', title: localize2('newTab', 'New Window Tab') },
            { handler: ShowPreviousWindowTabHandler, id: 'workbench.action.showPreviousWindowTab', title: localize2('showPreviousTab', 'Show Previous Window Tab') },
            { handler: ShowNextWindowTabHandler, id: 'workbench.action.showNextWindowTab', title: localize2('showNextWindowTab', 'Show Next Window Tab') },
            { handler: MoveWindowTabToNewWindowHandler, id: 'workbench.action.moveWindowTabToNewWindow', title: localize2('moveWindowTabToNewWindow', 'Move Window Tab to New Window') },
            { handler: MergeWindowTabsHandlerHandler, id: 'workbench.action.mergeAllWindowTabs', title: localize2('mergeAllWindowTabs', 'Merge All Windows') },
            { handler: ToggleWindowTabsBarHandler, id: 'workbench.action.toggleWindowTabsBar', title: localize2('toggleWindowTabsBar', 'Toggle Window Tabs Bar') }
        ]) {
            CommandsRegistry.registerCommand(command.id, command.handler);
            MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
                command,
                when: ContextKeyExpr.equals('config.window.nativeTabs', true)
            });
        }
    }
    // Actions: Developer
    registerAction2(ReloadWindowWithExtensionsDisabledAction);
    registerAction2(ConfigureRuntimeArgumentsAction);
    registerAction2(ToggleDevToolsAction);
    registerAction2(OpenUserDataFolderAction);
    registerAction2(ShowGPUInfoAction);
})();
// Menu
(function registerMenu() {
    // Quit
    MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
        group: 'z_Exit',
        command: {
            id: 'workbench.action.quit',
            title: localize({ key: 'miExit', comment: ['&& denotes a mnemonic'] }, "E&&xit")
        },
        order: 1,
        when: IsMacContext.toNegated()
    });
})();
// Configuration
(function registerConfiguration() {
    const registry = Registry.as(ConfigurationExtensions.Configuration);
    // Application
    registry.registerConfiguration({
        ...applicationConfigurationNodeBase,
        'properties': {
            'application.shellEnvironmentResolutionTimeout': {
                'type': 'number',
                'default': 10,
                'minimum': 1,
                'maximum': 120,
                'included': !isWindows,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('application.shellEnvironmentResolutionTimeout', "Controls the timeout in seconds before giving up resolving the shell environment when the application is not already launched from a terminal. See our [documentation](https://go.microsoft.com/fwlink/?linkid=2149667) for more information.")
            }
        }
    });
    // Window
    registry.registerConfiguration({
        'id': 'window',
        'order': 8,
        'title': localize('windowConfigurationTitle', "Window"),
        'type': 'object',
        'properties': {
            'window.confirmSaveUntitledWorkspace': {
                'type': 'boolean',
                'default': true,
                'description': localize('confirmSaveUntitledWorkspace', "Controls whether a confirmation dialog shows asking to save or discard an opened untitled workspace in the window when switching to another workspace. Disabling the confirmation dialog will always discard the untitled workspace."),
            },
            'window.openWithoutArgumentsInNewWindow': {
                'type': 'string',
                'enum': ['on', 'off'],
                'enumDescriptions': [
                    localize('window.openWithoutArgumentsInNewWindow.on', "Open a new empty window."),
                    localize('window.openWithoutArgumentsInNewWindow.off', "Focus the last active running instance.")
                ],
                'default': isMacintosh ? 'off' : 'on',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('openWithoutArgumentsInNewWindow', "Controls whether a new empty window should open when starting a second instance without arguments or if the last running instance should get focus.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).")
            },
            'window.restoreWindows': {
                'type': 'string',
                'enum': ['preserve', 'all', 'folders', 'one', 'none'],
                'enumDescriptions': [
                    localize('window.reopenFolders.preserve', "Always reopen all windows. If a folder or workspace is opened (e.g. from the command line) it opens as a new window unless it was opened before. If files are opened they will open in one of the restored windows together with editors that were previously opened."),
                    localize('window.reopenFolders.all', "Reopen all windows unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window."),
                    localize('window.reopenFolders.folders', "Reopen all windows that had folders or workspaces opened unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window."),
                    localize('window.reopenFolders.one', "Reopen the last active window unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window."),
                    localize('window.reopenFolders.none', "Never reopen a window. Unless a folder or workspace is opened (e.g. from the command line), an empty window will appear.")
                ],
                'default': 'all',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('restoreWindows', "Controls how windows and editors within are being restored when opening.")
            },
            'window.restoreFullscreen': {
                'type': 'boolean',
                'default': false,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('restoreFullscreen', "Controls whether a window should restore to full screen mode if it was exited in full screen mode.")
            },
            'window.zoomLevel': {
                'type': 'number',
                'default': 0,
                'minimum': MIN_ZOOM_LEVEL,
                'maximum': MAX_ZOOM_LEVEL,
                'markdownDescription': localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'zoomLevel' }, "Adjust the default zoom level for all windows. Each increment above `0` (e.g. `1`) or below (e.g. `-1`) represents zooming `20%` larger or smaller. You can also enter decimals to adjust the zoom level with a finer granularity. See {0} for configuring if the 'Zoom In' and 'Zoom Out' commands apply the zoom level to all windows or only the active window.", '`#window.zoomPerWindow#`'),
                ignoreSync: true,
                tags: ['accessibility']
            },
            'window.zoomPerWindow': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize({ comment: ['{0} will be a setting name rendered as a link'], key: 'zoomPerWindow' }, "Controls if the 'Zoom In' and 'Zoom Out' commands apply the zoom level to all windows or only the active window. See {0} for configuring a default zoom level for all windows.", '`#window.zoomLevel#`'),
                tags: ['accessibility']
            },
            'window.newWindowDimensions': {
                'type': 'string',
                'enum': ['default', 'inherit', 'offset', 'maximized', 'fullscreen'],
                'enumDescriptions': [
                    localize('window.newWindowDimensions.default', "Open new windows in the center of the screen."),
                    localize('window.newWindowDimensions.inherit', "Open new windows with same dimension as last active one."),
                    localize('window.newWindowDimensions.offset', "Open new windows with same dimension as last active one with an offset position."),
                    localize('window.newWindowDimensions.maximized', "Open new windows maximized."),
                    localize('window.newWindowDimensions.fullscreen', "Open new windows in full screen mode.")
                ],
                'default': 'default',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('newWindowDimensions', "Controls the dimensions of opening a new window when at least one window is already opened. Note that this setting does not have an impact on the first window that is opened. The first window will always restore the size and location as you left it before closing.")
            },
            'window.closeWhenEmpty': {
                'type': 'boolean',
                'default': false,
                'description': localize('closeWhenEmpty', "Controls whether closing the last editor should also close the window. This setting only applies for windows that do not show folders.")
            },
            'window.doubleClickIconToClose': {
                'type': 'boolean',
                'default': false,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('window.doubleClickIconToClose', "If enabled, this setting will close the window when the application icon in the title bar is double-clicked. The window will not be able to be dragged by the icon. This setting is effective only if {0} is set to `custom`.", '`#window.titleBarStyle#`')
            },
            'window.titleBarStyle': {
                'type': 'string',
                'enum': ['native', 'custom'],
                'default': 'custom',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('titleBarStyle', "Adjust the appearance of the window title bar to be native by the OS or custom. On Linux and Windows, this setting also affects the application and context menu appearances. Changes require a full restart to apply."),
            },
            'window.controlsStyle': {
                'type': 'string',
                'enum': ['native', 'custom', 'hidden'],
                'default': 'native',
                'included': !isMacintosh,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('controlsStyle', "Adjust the appearance of the window controls to be native by the OS, custom drawn or hidden. Changes require a full restart to apply."),
            },
            'window.customTitleBarVisibility': {
                'type': 'string',
                'enum': ['auto', 'windowed', 'never'],
                'markdownEnumDescriptions': [
                    localize(`window.customTitleBarVisibility.auto`, "Automatically changes custom title bar visibility."),
                    localize(`window.customTitleBarVisibility.windowed`, "Hide custom titlebar in full screen. When not in full screen, automatically change custom title bar visibility."),
                    localize(`window.customTitleBarVisibility.never`, "Hide custom titlebar when {0} is set to `native`.", '`#window.titleBarStyle#`'),
                ],
                'default': 'auto',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'markdownDescription': localize('window.customTitleBarVisibility', "Adjust when the custom title bar should be shown. The custom title bar can be hidden when in full screen mode with `windowed`. The custom title bar can only be hidden in non full screen mode with `never` when {0} is set to `native`.", '`#window.titleBarStyle#`'),
            },
            'window.dialogStyle': {
                'type': 'string',
                'enum': ['native', 'custom'],
                'default': 'native',
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('dialogStyle', "Adjust the appearance of dialog windows.")
            },
            'window.nativeTabs': {
                'type': 'boolean',
                'default': false,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('window.nativeTabs', "Enables macOS Sierra window tabs. Note that changes require a full restart to apply and that native tabs will disable a custom title bar style if configured."),
                'included': isMacintosh,
            },
            'window.nativeFullScreen': {
                'type': 'boolean',
                'default': true,
                'description': localize('window.nativeFullScreen', "Controls if native full-screen should be used on macOS. Disable this option to prevent macOS from creating a new space when going full-screen."),
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'included': isMacintosh
            },
            'window.clickThroughInactive': {
                'type': 'boolean',
                'default': true,
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                'description': localize('window.clickThroughInactive', "If enabled, clicking on an inactive window will both activate the window and trigger the element under the mouse if it is clickable. If disabled, clicking anywhere on an inactive window will activate it only and a second click is required on the element."),
                'included': isMacintosh
            }
        }
    });
    // Telemetry
    registry.registerConfiguration({
        'id': 'telemetry',
        'order': 110,
        title: localize('telemetryConfigurationTitle', "Telemetry"),
        'type': 'object',
        'properties': {
            'telemetry.enableCrashReporter': {
                'type': 'boolean',
                'description': localize('telemetry.enableCrashReporting', "Enable crash reports to be collected. This helps us improve stability. \nThis option requires restart to take effect."),
                'default': true,
                'tags': ['usesOnlineServices', 'telemetry'],
                'markdownDeprecationMessage': localize('enableCrashReporterDeprecated', "If this setting is false, no telemetry will be sent regardless of the new setting's value. Deprecated due to being combined into the {0} setting.", `\`#${TELEMETRY_SETTING_ID}#\``),
            }
        }
    });
    // Keybinding
    registry.registerConfiguration({
        'id': 'keyboard',
        'order': 15,
        'type': 'object',
        'title': localize('keyboardConfigurationTitle', "Keyboard"),
        'properties': {
            'keyboard.touchbar.enabled': {
                'type': 'boolean',
                'default': true,
                'description': localize('touchbar.enabled', "Enables the macOS touchbar buttons on the keyboard if available."),
                'included': isMacintosh
            },
            'keyboard.touchbar.ignored': {
                'type': 'array',
                'items': {
                    'type': 'string'
                },
                'default': [],
                'markdownDescription': localize('touchbar.ignored', 'A set of identifiers for entries in the touchbar that should not show up (for example `workbench.action.navigateBack`).'),
                'included': isMacintosh
            }
        }
    });
    // Security
    registry.registerConfiguration({
        ...securityConfigurationNodeBase,
        'properties': {
            'security.promptForLocalFileProtocolHandling': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize('security.promptForLocalFileProtocolHandling', 'If enabled, a dialog will ask for confirmation whenever a local file or workspace is about to open through a protocol handler.'),
                'scope': 1 /* ConfigurationScope.APPLICATION */
            },
            'security.promptForRemoteFileProtocolHandling': {
                'type': 'boolean',
                'default': true,
                'markdownDescription': localize('security.promptForRemoteFileProtocolHandling', 'If enabled, a dialog will ask for confirmation whenever a remote file or workspace is about to open through a protocol handler.'),
                'scope': 1 /* ConfigurationScope.APPLICATION */
            }
        }
    });
})();
// JSON Schemas
(function registerJSONSchemas() {
    const argvDefinitionFileSchemaId = 'vscode://schemas/argv';
    const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
    const schema = {
        id: argvDefinitionFileSchemaId,
        allowComments: true,
        allowTrailingCommas: true,
        description: 'VSCode static command line definition file',
        type: 'object',
        additionalProperties: false,
        properties: {
            locale: {
                type: 'string',
                description: localize('argv.locale', 'The display Language to use. Picking a different language requires the associated language pack to be installed.')
            },
            'disable-lcd-text': {
                type: 'boolean',
                description: localize('argv.disableLcdText', 'Disables LCD font antialiasing.')
            },
            'proxy-bypass-list': {
                type: 'string',
                description: localize('argv.proxyBypassList', 'Bypass any specified proxy for the given semi-colon-separated list of hosts. Example value "<local>;*.microsoft.com;*foo.com;1.2.3.4:5678", will use the proxy server for all hosts except for local addresses (localhost, 127.0.0.1 etc.), microsoft.com subdomains, hosts that contain the suffix foo.com and anything at 1.2.3.4:5678')
            },
            'disable-hardware-acceleration': {
                type: 'boolean',
                description: localize('argv.disableHardwareAcceleration', 'Disables hardware acceleration. ONLY change this option if you encounter graphic issues.')
            },
            'force-color-profile': {
                type: 'string',
                markdownDescription: localize('argv.forceColorProfile', 'Allows to override the color profile to use. If you experience colors appear badly, try to set this to `srgb` and restart.')
            },
            'enable-crash-reporter': {
                type: 'boolean',
                markdownDescription: localize('argv.enableCrashReporter', 'Allows to disable crash reporting, should restart the app if the value is changed.')
            },
            'crash-reporter-id': {
                type: 'string',
                markdownDescription: localize('argv.crashReporterId', 'Unique id used for correlating crash reports sent from this app instance.')
            },
            'enable-proposed-api': {
                type: 'array',
                description: localize('argv.enebleProposedApi', "Enable proposed APIs for a list of extension ids (such as \`vscode.git\`). Proposed APIs are unstable and subject to breaking without warning at any time. This should only be set for extension development and testing purposes."),
                items: {
                    type: 'string'
                }
            },
            'log-level': {
                type: ['string', 'array'],
                description: localize('argv.logLevel', "Log level to use. Default is 'info'. Allowed values are 'error', 'warn', 'info', 'debug', 'trace', 'off'.")
            },
            'disable-chromium-sandbox': {
                type: 'boolean',
                description: localize('argv.disableChromiumSandbox', "Disables the Chromium sandbox. This is useful when running VS Code as elevated on Linux and running under Applocker on Windows.")
            },
            'use-inmemory-secretstorage': {
                type: 'boolean',
                description: localize('argv.useInMemorySecretStorage', "Ensures that an in-memory store will be used for secret storage instead of using the OS's credential store. This is often used when running VS Code extension tests or when you're experiencing difficulties with the credential store.")
            }
        }
    };
    if (isLinux) {
        schema.properties['force-renderer-accessibility'] = {
            type: 'boolean',
            description: localize('argv.force-renderer-accessibility', 'Forces the renderer to be accessible. ONLY change this if you are using a screen reader on Linux. On other platforms the renderer will automatically be accessible. This flag is automatically set if you have editor.accessibilitySupport: on.'),
        };
        schema.properties['password-store'] = {
            type: 'string',
            description: localize('argv.passwordStore', "Configures the backend used to store secrets on Linux. This argument is ignored on Windows & macOS.")
        };
    }
    jsonRegistry.registerSchema(argvDefinitionFileSchemaId, schema);
})();
(function registerWorkbenchContributions() {
    registerWorkbenchContribution2('workbench.contributions.defaultAccountManagement', DefaultAccountManagementContribution, 3 /* WorkbenchPhase.AfterRestored */);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLXNhbmRib3gvZGVza3RvcC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ25ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pHLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFzQixNQUFNLDhEQUE4RCxDQUFDO0FBRWpLLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxvQkFBb0IsRUFBRSx3Q0FBd0MsRUFBRSx3QkFBd0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdMLE9BQU8sRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxtQkFBbUIsRUFBRSw0QkFBNEIsRUFBRSx3QkFBd0IsRUFBRSwrQkFBK0IsRUFBRSw2QkFBNkIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ25VLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0seURBQXlELENBQUM7QUFDaEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVFLE9BQU8sRUFBNkIsVUFBVSxJQUFJLGNBQWMsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXhJLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDM0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDN0csT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNyRyxPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sNEJBQTRCLENBQUM7QUFFNUYsVUFBVTtBQUNWLENBQUMsU0FBUyxlQUFlO0lBRXhCLGdCQUFnQjtJQUNoQixlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDOUIsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQy9CLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUVqQyxrQkFBa0I7SUFDbEIsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDcEMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDekMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFFbkMsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQiwyREFBMkQ7UUFDM0QsMkRBQTJEO1FBQzNELDhDQUE4QztRQUM5QyxzREFBc0Q7UUFDdEQsbUJBQW1CLENBQUMsc0JBQXNCLENBQUM7WUFDMUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLEVBQUU7WUFDeEIsTUFBTSw2Q0FBbUM7WUFDekMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLEVBQUUseUJBQXlCLENBQUM7WUFDdEYsT0FBTyxFQUFFLGlEQUE2QjtTQUN0QyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsNkNBQTZDO0lBQzdDLElBQUksV0FBVyxFQUFFLENBQUM7UUFDakIsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDMUMsZUFBZSxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELE9BQU87SUFDUCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUsdUJBQXVCO1FBQzNCLE1BQU0sNkNBQW1DO1FBQ3pDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBMEI7WUFDdkMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDM0QsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFFakUsTUFBTSxrQkFBa0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQXNDLDJCQUEyQixDQUFDLENBQUM7WUFDM0gsSUFBSSxrQkFBa0IsS0FBSyxRQUFRLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxjQUFjLElBQUksa0JBQWtCLENBQUMsV0FBVyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO2dCQUN0SSxNQUFNLFNBQVMsR0FBRyxNQUFNLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLDhCQUFzQixDQUFDO2dCQUN0RixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2hCLE9BQU8sQ0FBQyx5QkFBeUI7Z0JBQ2xDLENBQUM7WUFDRixDQUFDO1lBRUQsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDMUIsQ0FBQztRQUNELElBQUksRUFBRSxTQUFTO1FBQ2YsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGlEQUE2QixFQUFFO1FBQy9DLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxpREFBNkIsRUFBRTtLQUNqRCxDQUFDLENBQUM7SUFFSCw2QkFBNkI7SUFDN0IsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQixLQUFLLE1BQU0sT0FBTyxJQUFJO1lBQ3JCLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLEVBQUUsRUFBRSwrQkFBK0IsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ25ILEVBQUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLEVBQUUsRUFBRSx3Q0FBd0MsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLDBCQUEwQixDQUFDLEVBQUU7WUFDeEosRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsRUFBRSxFQUFFLG9DQUFvQyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUsc0JBQXNCLENBQUMsRUFBRTtZQUM5SSxFQUFFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxFQUFFLEVBQUUsMkNBQTJDLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSwrQkFBK0IsQ0FBQyxFQUFFO1lBQzVLLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLEVBQUUsRUFBRSxxQ0FBcUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixFQUFFLG1CQUFtQixDQUFDLEVBQUU7WUFDbEosRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsRUFBRSxFQUFFLHNDQUFzQyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMscUJBQXFCLEVBQUUsd0JBQXdCLENBQUMsRUFBRTtTQUN0SixFQUFFLENBQUM7WUFDSCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFOUQsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO2dCQUNsRCxPQUFPO2dCQUNQLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQzthQUM3RCxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVELHFCQUFxQjtJQUNyQixlQUFlLENBQUMsd0NBQXdDLENBQUMsQ0FBQztJQUMxRCxlQUFlLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUNqRCxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN0QyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUMxQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRUwsT0FBTztBQUNQLENBQUMsU0FBUyxZQUFZO0lBRXJCLE9BQU87SUFDUCxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUU7UUFDbkQsS0FBSyxFQUFFLFFBQVE7UUFDZixPQUFPLEVBQUU7WUFDUixFQUFFLEVBQUUsdUJBQXVCO1lBQzNCLEtBQUssRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUM7U0FDaEY7UUFDRCxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksRUFBRSxZQUFZLENBQUMsU0FBUyxFQUFFO0tBQzlCLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFTCxnQkFBZ0I7QUFDaEIsQ0FBQyxTQUFTLHFCQUFxQjtJQUM5QixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUU1RixjQUFjO0lBQ2QsUUFBUSxDQUFDLHFCQUFxQixDQUFDO1FBQzlCLEdBQUcsZ0NBQWdDO1FBQ25DLFlBQVksRUFBRTtZQUNiLCtDQUErQyxFQUFFO2dCQUNoRCxNQUFNLEVBQUUsUUFBUTtnQkFDaEIsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsU0FBUyxFQUFFLENBQUM7Z0JBQ1osU0FBUyxFQUFFLEdBQUc7Z0JBQ2QsVUFBVSxFQUFFLENBQUMsU0FBUztnQkFDdEIsT0FBTyx3Q0FBZ0M7Z0JBQ3ZDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSwrT0FBK08sQ0FBQzthQUNqVTtTQUNEO0tBQ0QsQ0FBQyxDQUFDO0lBRUgsU0FBUztJQUNULFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQztRQUM5QixJQUFJLEVBQUUsUUFBUTtRQUNkLE9BQU8sRUFBRSxDQUFDO1FBQ1YsT0FBTyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxRQUFRLENBQUM7UUFDdkQsTUFBTSxFQUFFLFFBQVE7UUFDaEIsWUFBWSxFQUFFO1lBQ2IscUNBQXFDLEVBQUU7Z0JBQ3RDLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixTQUFTLEVBQUUsSUFBSTtnQkFDZixhQUFhLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHNPQUFzTyxDQUFDO2FBQy9SO1lBQ0Qsd0NBQXdDLEVBQUU7Z0JBQ3pDLE1BQU0sRUFBRSxRQUFRO2dCQUNoQixNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO2dCQUNyQixrQkFBa0IsRUFBRTtvQkFDbkIsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLDBCQUEwQixDQUFDO29CQUNqRixRQUFRLENBQUMsNENBQTRDLEVBQUUseUNBQXlDLENBQUM7aUJBQ2pHO2dCQUNELFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSTtnQkFDckMsT0FBTyx3Q0FBZ0M7Z0JBQ3ZDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxxU0FBcVMsQ0FBQzthQUN6VztZQUNELHVCQUF1QixFQUFFO2dCQUN4QixNQUFNLEVBQUUsUUFBUTtnQkFDaEIsTUFBTSxFQUFFLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQztnQkFDckQsa0JBQWtCLEVBQUU7b0JBQ25CLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSx1UUFBdVEsQ0FBQztvQkFDbFQsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGdNQUFnTSxDQUFDO29CQUN0TyxRQUFRLENBQUMsOEJBQThCLEVBQUUsc09BQXNPLENBQUM7b0JBQ2hSLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSwyTUFBMk0sQ0FBQztvQkFDalAsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDBIQUEwSCxDQUFDO2lCQUNqSztnQkFDRCxTQUFTLEVBQUUsS0FBSztnQkFDaEIsT0FBTyx3Q0FBZ0M7Z0JBQ3ZDLGFBQWEsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsMEVBQTBFLENBQUM7YUFDckg7WUFDRCwwQkFBMEIsRUFBRTtnQkFDM0IsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixPQUFPLHdDQUFnQztnQkFDdkMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxvR0FBb0csQ0FBQzthQUNsSjtZQUNELGtCQUFrQixFQUFFO2dCQUNuQixNQUFNLEVBQUUsUUFBUTtnQkFDaEIsU0FBUyxFQUFFLENBQUM7Z0JBQ1osU0FBUyxFQUFFLGNBQWM7Z0JBQ3pCLFNBQVMsRUFBRSxjQUFjO2dCQUN6QixxQkFBcUIsRUFBRSxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQywrQ0FBK0MsQ0FBQyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxvV0FBb1csRUFBRSwwQkFBMEIsQ0FBQztnQkFDbmYsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQzthQUN2QjtZQUNELHNCQUFzQixFQUFFO2dCQUN2QixNQUFNLEVBQUUsU0FBUztnQkFDakIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YscUJBQXFCLEVBQUUsUUFBUSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsK0NBQStDLENBQUMsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLEVBQUUsZ0xBQWdMLEVBQUUsc0JBQXNCLENBQUM7Z0JBQy9ULElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBQzthQUN2QjtZQUNELDRCQUE0QixFQUFFO2dCQUM3QixNQUFNLEVBQUUsUUFBUTtnQkFDaEIsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQztnQkFDbkUsa0JBQWtCLEVBQUU7b0JBQ25CLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSwrQ0FBK0MsQ0FBQztvQkFDL0YsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLDBEQUEwRCxDQUFDO29CQUMxRyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsa0ZBQWtGLENBQUM7b0JBQ2pJLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSw2QkFBNkIsQ0FBQztvQkFDL0UsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLHVDQUF1QyxDQUFDO2lCQUMxRjtnQkFDRCxTQUFTLEVBQUUsU0FBUztnQkFDcEIsT0FBTyx3Q0FBZ0M7Z0JBQ3ZDLGFBQWEsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsMFFBQTBRLENBQUM7YUFDMVQ7WUFDRCx1QkFBdUIsRUFBRTtnQkFDeEIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixhQUFhLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHdJQUF3SSxDQUFDO2FBQ25MO1lBQ0QsK0JBQStCLEVBQUU7Z0JBQ2hDLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixTQUFTLEVBQUUsS0FBSztnQkFDaEIsT0FBTyx3Q0FBZ0M7Z0JBQ3ZDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSwrTkFBK04sRUFBRSwwQkFBMEIsQ0FBQzthQUM3VDtZQUNELHNCQUFzQixFQUFFO2dCQUN2QixNQUFNLEVBQUUsUUFBUTtnQkFDaEIsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztnQkFDNUIsU0FBUyxFQUFFLFFBQVE7Z0JBQ25CLE9BQU8sd0NBQWdDO2dCQUN2QyxhQUFhLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSx3TkFBd04sQ0FBQzthQUNsUTtZQUNELHNCQUFzQixFQUFFO2dCQUN2QixNQUFNLEVBQUUsUUFBUTtnQkFDaEIsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7Z0JBQ3RDLFNBQVMsRUFBRSxRQUFRO2dCQUNuQixVQUFVLEVBQUUsQ0FBQyxXQUFXO2dCQUN4QixPQUFPLHdDQUFnQztnQkFDdkMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsdUlBQXVJLENBQUM7YUFDakw7WUFDRCxpQ0FBaUMsRUFBRTtnQkFDbEMsTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDO2dCQUNyQywwQkFBMEIsRUFBRTtvQkFDM0IsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLG9EQUFvRCxDQUFDO29CQUN0RyxRQUFRLENBQUMsMENBQTBDLEVBQUUsaUhBQWlILENBQUM7b0JBQ3ZLLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSxtREFBbUQsRUFBRSwwQkFBMEIsQ0FBQztpQkFDbEk7Z0JBQ0QsU0FBUyxFQUFFLE1BQU07Z0JBQ2pCLE9BQU8sd0NBQWdDO2dCQUN2QyxxQkFBcUIsRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsME9BQTBPLEVBQUUsMEJBQTBCLENBQUM7YUFDMVU7WUFDRCxvQkFBb0IsRUFBRTtnQkFDckIsTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7Z0JBQzVCLFNBQVMsRUFBRSxRQUFRO2dCQUNuQixPQUFPLHdDQUFnQztnQkFDdkMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxhQUFhLEVBQUUsMENBQTBDLENBQUM7YUFDbEY7WUFDRCxtQkFBbUIsRUFBRTtnQkFDcEIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixPQUFPLHdDQUFnQztnQkFDdkMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSwrSkFBK0osQ0FBQztnQkFDN00sVUFBVSxFQUFFLFdBQVc7YUFDdkI7WUFDRCx5QkFBeUIsRUFBRTtnQkFDMUIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGFBQWEsRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsZ0pBQWdKLENBQUM7Z0JBQ3BNLE9BQU8sd0NBQWdDO2dCQUN2QyxVQUFVLEVBQUUsV0FBVzthQUN2QjtZQUNELDZCQUE2QixFQUFFO2dCQUM5QixNQUFNLEVBQUUsU0FBUztnQkFDakIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsT0FBTyx3Q0FBZ0M7Z0JBQ3ZDLGFBQWEsRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUsZ1FBQWdRLENBQUM7Z0JBQ3hULFVBQVUsRUFBRSxXQUFXO2FBQ3ZCO1NBQ0Q7S0FDRCxDQUFDLENBQUM7SUFFSCxZQUFZO0lBQ1osUUFBUSxDQUFDLHFCQUFxQixDQUFDO1FBQzlCLElBQUksRUFBRSxXQUFXO1FBQ2pCLE9BQU8sRUFBRSxHQUFHO1FBQ1osS0FBSyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxXQUFXLENBQUM7UUFDM0QsTUFBTSxFQUFFLFFBQVE7UUFDaEIsWUFBWSxFQUFFO1lBQ2IsK0JBQStCLEVBQUU7Z0JBQ2hDLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixhQUFhLEVBQUUsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLHVIQUF1SCxDQUFDO2dCQUNsTCxTQUFTLEVBQUUsSUFBSTtnQkFDZixNQUFNLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUM7Z0JBQzNDLDRCQUE0QixFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxtSkFBbUosRUFBRSxNQUFNLG9CQUFvQixLQUFLLENBQUM7YUFDN1A7U0FDRDtLQUNELENBQUMsQ0FBQztJQUVILGFBQWE7SUFDYixRQUFRLENBQUMscUJBQXFCLENBQUM7UUFDOUIsSUFBSSxFQUFFLFVBQVU7UUFDaEIsT0FBTyxFQUFFLEVBQUU7UUFDWCxNQUFNLEVBQUUsUUFBUTtRQUNoQixPQUFPLEVBQUUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLFVBQVUsQ0FBQztRQUMzRCxZQUFZLEVBQUU7WUFDYiwyQkFBMkIsRUFBRTtnQkFDNUIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGFBQWEsRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsa0VBQWtFLENBQUM7Z0JBQy9HLFVBQVUsRUFBRSxXQUFXO2FBQ3ZCO1lBQ0QsMkJBQTJCLEVBQUU7Z0JBQzVCLE1BQU0sRUFBRSxPQUFPO2dCQUNmLE9BQU8sRUFBRTtvQkFDUixNQUFNLEVBQUUsUUFBUTtpQkFDaEI7Z0JBQ0QsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IscUJBQXFCLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHlIQUF5SCxDQUFDO2dCQUM5SyxVQUFVLEVBQUUsV0FBVzthQUN2QjtTQUNEO0tBQ0QsQ0FBQyxDQUFDO0lBRUgsV0FBVztJQUNYLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQztRQUM5QixHQUFHLDZCQUE2QjtRQUNoQyxZQUFZLEVBQUU7WUFDYiw2Q0FBNkMsRUFBRTtnQkFDOUMsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLHFCQUFxQixFQUFFLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRSxnSUFBZ0ksQ0FBQztnQkFDaE4sT0FBTyx3Q0FBZ0M7YUFDdkM7WUFDRCw4Q0FBOEMsRUFBRTtnQkFDL0MsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLHFCQUFxQixFQUFFLFFBQVEsQ0FBQyw4Q0FBOEMsRUFBRSxpSUFBaUksQ0FBQztnQkFDbE4sT0FBTyx3Q0FBZ0M7YUFDdkM7U0FDRDtLQUNELENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFTCxlQUFlO0FBQ2YsQ0FBQyxTQUFTLG1CQUFtQjtJQUM1QixNQUFNLDBCQUEwQixHQUFHLHVCQUF1QixDQUFDO0lBQzNELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQTRCLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzdGLE1BQU0sTUFBTSxHQUFnQjtRQUMzQixFQUFFLEVBQUUsMEJBQTBCO1FBQzlCLGFBQWEsRUFBRSxJQUFJO1FBQ25CLG1CQUFtQixFQUFFLElBQUk7UUFDekIsV0FBVyxFQUFFLDRDQUE0QztRQUN6RCxJQUFJLEVBQUUsUUFBUTtRQUNkLG9CQUFvQixFQUFFLEtBQUs7UUFDM0IsVUFBVSxFQUFFO1lBQ1gsTUFBTSxFQUFFO2dCQUNQLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLGtIQUFrSCxDQUFDO2FBQ3hKO1lBQ0Qsa0JBQWtCLEVBQUU7Z0JBQ25CLElBQUksRUFBRSxTQUFTO2dCQUNmLFdBQVcsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsaUNBQWlDLENBQUM7YUFDL0U7WUFDRCxtQkFBbUIsRUFBRTtnQkFDcEIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSwwVUFBMFUsQ0FBQzthQUN6WDtZQUNELCtCQUErQixFQUFFO2dCQUNoQyxJQUFJLEVBQUUsU0FBUztnQkFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLDBGQUEwRixDQUFDO2FBQ3JKO1lBQ0QscUJBQXFCLEVBQUU7Z0JBQ3RCLElBQUksRUFBRSxRQUFRO2dCQUNkLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSw0SEFBNEgsQ0FBQzthQUNyTDtZQUNELHVCQUF1QixFQUFFO2dCQUN4QixJQUFJLEVBQUUsU0FBUztnQkFDZixtQkFBbUIsRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsb0ZBQW9GLENBQUM7YUFDL0k7WUFDRCxtQkFBbUIsRUFBRTtnQkFDcEIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDJFQUEyRSxDQUFDO2FBQ2xJO1lBQ0QscUJBQXFCLEVBQUU7Z0JBQ3RCLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsb09BQW9PLENBQUM7Z0JBQ3JSLEtBQUssRUFBRTtvQkFDTixJQUFJLEVBQUUsUUFBUTtpQkFDZDthQUNEO1lBQ0QsV0FBVyxFQUFFO2dCQUNaLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7Z0JBQ3pCLFdBQVcsRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLDJHQUEyRyxDQUFDO2FBQ25KO1lBQ0QsMEJBQTBCLEVBQUU7Z0JBQzNCLElBQUksRUFBRSxTQUFTO2dCQUNmLFdBQVcsRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUsaUlBQWlJLENBQUM7YUFDdkw7WUFDRCw0QkFBNEIsRUFBRTtnQkFDN0IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSx5T0FBeU8sQ0FBQzthQUNqUztTQUNEO0tBQ0QsQ0FBQztJQUNGLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLENBQUMsVUFBVyxDQUFDLDhCQUE4QixDQUFDLEdBQUc7WUFDcEQsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLGlQQUFpUCxDQUFDO1NBQzdTLENBQUM7UUFDRixNQUFNLENBQUMsVUFBVyxDQUFDLGdCQUFnQixDQUFDLEdBQUc7WUFDdEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHFHQUFxRyxDQUFDO1NBQ2xKLENBQUM7SUFDSCxDQUFDO0lBRUQsWUFBWSxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRUwsQ0FBQyxTQUFTLDhCQUE4QjtJQUN2Qyw4QkFBOEIsQ0FBQyxrREFBa0QsRUFBRSxvQ0FBb0MsdUNBQStCLENBQUM7QUFDeEosQ0FBQyxDQUFDLEVBQUUsQ0FBQyJ9