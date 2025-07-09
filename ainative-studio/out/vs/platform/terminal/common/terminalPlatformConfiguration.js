/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getAllCodicons } from '../../../base/common/codicons.js';
import { PlatformToString } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { Extensions } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
import { createProfileSchemaEnums } from './terminalProfiles.js';
export const terminalColorSchema = {
    type: ['string', 'null'],
    enum: [
        'terminal.ansiBlack',
        'terminal.ansiRed',
        'terminal.ansiGreen',
        'terminal.ansiYellow',
        'terminal.ansiBlue',
        'terminal.ansiMagenta',
        'terminal.ansiCyan',
        'terminal.ansiWhite'
    ],
    default: null
};
export const terminalIconSchema = {
    type: 'string',
    enum: Array.from(getAllCodicons(), icon => icon.id),
    markdownEnumDescriptions: Array.from(getAllCodicons(), icon => `$(${icon.id})`),
};
const terminalProfileBaseProperties = {
    args: {
        description: localize('terminalProfile.args', 'An optional set of arguments to run the shell executable with.'),
        type: 'array',
        items: {
            type: 'string'
        }
    },
    overrideName: {
        description: localize('terminalProfile.overrideName', 'Whether or not to replace the dynamic terminal title that detects what program is running with the static profile name.'),
        type: 'boolean'
    },
    icon: {
        description: localize('terminalProfile.icon', 'A codicon ID to associate with the terminal icon.'),
        ...terminalIconSchema
    },
    color: {
        description: localize('terminalProfile.color', 'A theme color ID to associate with the terminal icon.'),
        ...terminalColorSchema
    },
    env: {
        markdownDescription: localize('terminalProfile.env', "An object with environment variables that will be added to the terminal profile process. Set to `null` to delete environment variables from the base environment."),
        type: 'object',
        additionalProperties: {
            type: ['string', 'null']
        },
        default: {}
    }
};
const terminalProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize('terminalProfile.path', 'A single path to a shell executable or an array of paths that will be used as fallbacks when one fails.'),
            type: ['string', 'array'],
            items: {
                type: 'string'
            }
        },
        ...terminalProfileBaseProperties
    }
};
const terminalAutomationProfileSchema = {
    type: 'object',
    required: ['path'],
    properties: {
        path: {
            description: localize('terminalAutomationProfile.path', 'A single path to a shell executable.'),
            type: ['string'],
            items: {
                type: 'string'
            }
        },
        ...terminalProfileBaseProperties
    }
};
function createTerminalProfileMarkdownDescription(platform) {
    const key = platform === 2 /* Platform.Linux */ ? 'linux' : platform === 1 /* Platform.Mac */ ? 'osx' : 'windows';
    return localize({
        key: 'terminal.integrated.profile',
        comment: ['{0} is the platform, {1} is a code block, {2} and {3} are a link start and end']
    }, "A set of terminal profile customizations for {0} which allows adding, removing or changing how terminals are launched. Profiles are made up of a mandatory path, optional arguments and other presentation options.\n\nTo override an existing profile use its profile name as the key, for example:\n\n{1}\n\n{2}Read more about configuring profiles{3}.", PlatformToString(platform), '```json\n"terminal.integrated.profile.' + key + '": {\n  "bash": null\n}\n```', '[', '](https://code.visualstudio.com/docs/terminal/profiles)');
}
const terminalPlatformConfiguration = {
    id: 'terminal',
    order: 100,
    title: localize('terminalIntegratedConfigurationTitle', "Integrated Terminal"),
    type: 'object',
    properties: {
        ["terminal.integrated.automationProfile.linux" /* TerminalSettingId.AutomationProfileLinux */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.linux', "The terminal profile to use on Linux for automation-related terminal usage like tasks and debug."),
            type: ['object', 'null'],
            default: null,
            'anyOf': [
                { type: 'null' },
                terminalAutomationProfileSchema
            ],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}'
                    }
                }
            ]
        },
        ["terminal.integrated.automationProfile.osx" /* TerminalSettingId.AutomationProfileMacOs */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.osx', "The terminal profile to use on macOS for automation-related terminal usage like tasks and debug."),
            type: ['object', 'null'],
            default: null,
            'anyOf': [
                { type: 'null' },
                terminalAutomationProfileSchema
            ],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}'
                    }
                }
            ]
        },
        ["terminal.integrated.automationProfile.windows" /* TerminalSettingId.AutomationProfileWindows */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.automationProfile.windows', "The terminal profile to use for automation-related terminal usage like tasks and debug. This setting will currently be ignored if {0} (now deprecated) is set.", '`terminal.integrated.automationShell.windows`'),
            type: ['object', 'null'],
            default: null,
            'anyOf': [
                { type: 'null' },
                terminalAutomationProfileSchema
            ],
            defaultSnippets: [
                {
                    body: {
                        path: '${1}',
                        icon: '${2}'
                    }
                }
            ]
        },
        ["terminal.integrated.profiles.windows" /* TerminalSettingId.ProfilesWindows */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(3 /* Platform.Windows */),
            type: 'object',
            default: {
                'PowerShell': {
                    source: 'PowerShell',
                    icon: 'terminal-powershell'
                },
                'Command Prompt': {
                    path: [
                        '${env:windir}\\Sysnative\\cmd.exe',
                        '${env:windir}\\System32\\cmd.exe'
                    ],
                    args: [],
                    icon: 'terminal-cmd'
                },
                'Git Bash': {
                    source: 'Git Bash'
                }
            },
            additionalProperties: {
                'anyOf': [
                    {
                        type: 'object',
                        required: ['source'],
                        properties: {
                            source: {
                                description: localize('terminalProfile.windowsSource', 'A profile source that will auto detect the paths to the shell. Note that non-standard executable locations are not supported and must be created manually in a new profile.'),
                                enum: ['PowerShell', 'Git Bash']
                            },
                            ...terminalProfileBaseProperties
                        }
                    },
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.windowsExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string'
                            },
                            id: {
                                description: localize('terminalProfile.windowsExtensionId', 'The id of the extension terminal'),
                                type: 'string'
                            },
                            title: {
                                description: localize('terminalProfile.windowsExtensionTitle', 'The name of the extension terminal'),
                                type: 'string'
                            },
                            ...terminalProfileBaseProperties
                        }
                    },
                    { type: 'null' },
                    terminalProfileSchema
                ]
            }
        },
        ["terminal.integrated.profiles.osx" /* TerminalSettingId.ProfilesMacOs */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(1 /* Platform.Mac */),
            type: 'object',
            default: {
                'bash': {
                    path: 'bash',
                    args: ['-l'],
                    icon: 'terminal-bash'
                },
                'zsh': {
                    path: 'zsh',
                    args: ['-l']
                },
                'fish': {
                    path: 'fish',
                    args: ['-l']
                },
                'tmux': {
                    path: 'tmux',
                    icon: 'terminal-tmux'
                },
                'pwsh': {
                    path: 'pwsh',
                    icon: 'terminal-powershell'
                }
            },
            additionalProperties: {
                'anyOf': [
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.osxExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string'
                            },
                            id: {
                                description: localize('terminalProfile.osxExtensionId', 'The id of the extension terminal'),
                                type: 'string'
                            },
                            title: {
                                description: localize('terminalProfile.osxExtensionTitle', 'The name of the extension terminal'),
                                type: 'string'
                            },
                            ...terminalProfileBaseProperties
                        }
                    },
                    { type: 'null' },
                    terminalProfileSchema
                ]
            }
        },
        ["terminal.integrated.profiles.linux" /* TerminalSettingId.ProfilesLinux */]: {
            restricted: true,
            markdownDescription: createTerminalProfileMarkdownDescription(2 /* Platform.Linux */),
            type: 'object',
            default: {
                'bash': {
                    path: 'bash',
                    icon: 'terminal-bash'
                },
                'zsh': {
                    path: 'zsh'
                },
                'fish': {
                    path: 'fish'
                },
                'tmux': {
                    path: 'tmux',
                    icon: 'terminal-tmux'
                },
                'pwsh': {
                    path: 'pwsh',
                    icon: 'terminal-powershell'
                }
            },
            additionalProperties: {
                'anyOf': [
                    {
                        type: 'object',
                        required: ['extensionIdentifier', 'id', 'title'],
                        properties: {
                            extensionIdentifier: {
                                description: localize('terminalProfile.linuxExtensionIdentifier', 'The extension that contributed this profile.'),
                                type: 'string'
                            },
                            id: {
                                description: localize('terminalProfile.linuxExtensionId', 'The id of the extension terminal'),
                                type: 'string'
                            },
                            title: {
                                description: localize('terminalProfile.linuxExtensionTitle', 'The name of the extension terminal'),
                                type: 'string'
                            },
                            ...terminalProfileBaseProperties
                        }
                    },
                    { type: 'null' },
                    terminalProfileSchema
                ]
            }
        },
        ["terminal.integrated.useWslProfiles" /* TerminalSettingId.UseWslProfiles */]: {
            description: localize('terminal.integrated.useWslProfiles', 'Controls whether or not WSL distros are shown in the terminal dropdown'),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.inheritEnv" /* TerminalSettingId.InheritEnv */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('terminal.integrated.inheritEnv', "Whether new shells should inherit their environment from VS Code, which may source a login shell to ensure $PATH and other development variables are initialized. This has no effect on Windows."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: localize('terminal.integrated.persistentSessionScrollback', "Controls the maximum amount of lines that will be restored when reconnecting to a persistent terminal session. Increasing this will restore more lines of scrollback at the cost of more memory and increase the time it takes to connect to terminals on start up. This setting requires a restart to take effect and should be set to a value less than or equal to `#terminal.integrated.scrollback#`."),
            type: 'number',
            default: 100
        },
        ["terminal.integrated.showLinkHover" /* TerminalSettingId.ShowLinkHover */]: {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('terminal.integrated.showLinkHover', "Whether to show hovers for links in the terminal output."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.ignoreProcessNames" /* TerminalSettingId.IgnoreProcessNames */]: {
            markdownDescription: localize('terminal.integrated.confirmIgnoreProcesses', "A set of process names to ignore when using the {0} setting.", '`#terminal.integrated.confirmOnKill#`'),
            type: 'array',
            items: {
                type: 'string',
                uniqueItems: true
            },
            default: [
                // Popular prompt programs, these should not count as child processes
                'starship',
                'oh-my-posh',
                // Git bash may runs a subprocess of itself (bin\bash.exe -> usr\bin\bash.exe)
                'bash',
                'zsh',
            ]
        }
    }
};
/**
 * Registers terminal configurations required by shared process and remote server.
 */
export function registerTerminalPlatformConfiguration() {
    Registry.as(Extensions.Configuration).registerConfiguration(terminalPlatformConfiguration);
    registerTerminalDefaultProfileConfiguration();
}
let defaultProfilesConfiguration;
export function registerTerminalDefaultProfileConfiguration(detectedProfiles, extensionContributedProfiles) {
    const registry = Registry.as(Extensions.Configuration);
    let profileEnum;
    if (detectedProfiles) {
        profileEnum = createProfileSchemaEnums(detectedProfiles?.profiles, extensionContributedProfiles);
    }
    const oldDefaultProfilesConfiguration = defaultProfilesConfiguration;
    defaultProfilesConfiguration = {
        id: 'terminal',
        order: 100,
        title: localize('terminalIntegratedConfigurationTitle', "Integrated Terminal"),
        type: 'object',
        properties: {
            ["terminal.integrated.defaultProfile.linux" /* TerminalSettingId.DefaultProfileLinux */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.linux', "The default terminal profile on Linux."),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 3 /* OperatingSystem.Linux */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 3 /* OperatingSystem.Linux */ ? profileEnum?.markdownDescriptions : undefined
            },
            ["terminal.integrated.defaultProfile.osx" /* TerminalSettingId.DefaultProfileMacOs */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.osx', "The default terminal profile on macOS."),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 2 /* OperatingSystem.Macintosh */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 2 /* OperatingSystem.Macintosh */ ? profileEnum?.markdownDescriptions : undefined
            },
            ["terminal.integrated.defaultProfile.windows" /* TerminalSettingId.DefaultProfileWindows */]: {
                restricted: true,
                markdownDescription: localize('terminal.integrated.defaultProfile.windows', "The default terminal profile on Windows."),
                type: ['string', 'null'],
                default: null,
                enum: detectedProfiles?.os === 1 /* OperatingSystem.Windows */ ? profileEnum?.values : undefined,
                markdownEnumDescriptions: detectedProfiles?.os === 1 /* OperatingSystem.Windows */ ? profileEnum?.markdownDescriptions : undefined
            },
        }
    };
    registry.updateConfigurations({ add: [defaultProfilesConfiguration], remove: oldDefaultProfilesConfiguration ? [oldDefaultProfilesConfiguration] : [] });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQbGF0Zm9ybUNvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsUGxhdGZvcm1Db25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQTZCLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBc0IsVUFBVSxFQUE4QyxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVqRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBZ0I7SUFDL0MsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztJQUN4QixJQUFJLEVBQUU7UUFDTCxvQkFBb0I7UUFDcEIsa0JBQWtCO1FBQ2xCLG9CQUFvQjtRQUNwQixxQkFBcUI7UUFDckIsbUJBQW1CO1FBQ25CLHNCQUFzQjtRQUN0QixtQkFBbUI7UUFDbkIsb0JBQW9CO0tBQ3BCO0lBQ0QsT0FBTyxFQUFFLElBQUk7Q0FDYixDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQWdCO0lBQzlDLElBQUksRUFBRSxRQUFRO0lBQ2QsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ25ELHdCQUF3QixF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