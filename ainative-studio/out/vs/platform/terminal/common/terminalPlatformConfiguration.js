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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQbGF0Zm9ybUNvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWxQbGF0Zm9ybUNvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBNkIsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFzQixVQUFVLEVBQThDLE1BQU0scURBQXFELENBQUM7QUFDakosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWpFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFnQjtJQUMvQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO0lBQ3hCLElBQUksRUFBRTtRQUNMLG9CQUFvQjtRQUNwQixrQkFBa0I7UUFDbEIsb0JBQW9CO1FBQ3BCLHFCQUFxQjtRQUNyQixtQkFBbUI7UUFDbkIsc0JBQXNCO1FBQ3RCLG1CQUFtQjtRQUNuQixvQkFBb0I7S0FDcEI7SUFDRCxPQUFPLEVBQUUsSUFBSTtDQUNiLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBZ0I7SUFDOUMsSUFBSSxFQUFFLFFBQVE7SUFDZCxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDbkQsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDO0NBQy9FLENBQUM7QUFFRixNQUFNLDZCQUE2QixHQUFtQjtJQUNyRCxJQUFJLEVBQUU7UUFDTCxXQUFXLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGdFQUFnRSxDQUFDO1FBQy9HLElBQUksRUFBRSxPQUFPO1FBQ2IsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLFFBQVE7U0FDZDtLQUNEO0lBQ0QsWUFBWSxFQUFFO1FBQ2IsV0FBVyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSx5SEFBeUgsQ0FBQztRQUNoTCxJQUFJLEVBQUUsU0FBUztLQUNmO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsV0FBVyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxtREFBbUQsQ0FBQztRQUNsRyxHQUFHLGtCQUFrQjtLQUNyQjtJQUNELEtBQUssRUFBRTtRQUNOLFdBQVcsRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsdURBQXVELENBQUM7UUFDdkcsR0FBRyxtQkFBbUI7S0FDdEI7SUFDRCxHQUFHLEVBQUU7UUFDSixtQkFBbUIsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsbUtBQW1LLENBQUM7UUFDek4sSUFBSSxFQUFFLFFBQVE7UUFDZCxvQkFBb0IsRUFBRTtZQUNyQixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO1NBQ3hCO1FBQ0QsT0FBTyxFQUFFLEVBQUU7S0FDWDtDQUNELENBQUM7QUFFRixNQUFNLHFCQUFxQixHQUFnQjtJQUMxQyxJQUFJLEVBQUUsUUFBUTtJQUNkLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUNsQixVQUFVLEVBQUU7UUFDWCxJQUFJLEVBQUU7WUFDTCxXQUFXLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHlHQUF5RyxDQUFDO1lBQ3hKLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7WUFDekIsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2FBQ2Q7U0FDRDtRQUNELEdBQUcsNkJBQTZCO0tBQ2hDO0NBQ0QsQ0FBQztBQUVGLE1BQU0sK0JBQStCLEdBQWdCO0lBQ3BELElBQUksRUFBRSxRQUFRO0lBQ2QsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDO0lBQ2xCLFVBQVUsRUFBRTtRQUNYLElBQUksRUFBRTtZQUNMLFdBQVcsRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsc0NBQXNDLENBQUM7WUFDL0YsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDO1lBQ2hCLEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTthQUNkO1NBQ0Q7UUFDRCxHQUFHLDZCQUE2QjtLQUNoQztDQUNELENBQUM7QUFFRixTQUFTLHdDQUF3QyxDQUFDLFFBQTBEO0lBQzNHLE1BQU0sR0FBRyxHQUFHLFFBQVEsMkJBQW1CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSx5QkFBaUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDbEcsT0FBTyxRQUFRLENBQ2Q7UUFDQyxHQUFHLEVBQUUsNkJBQTZCO1FBQ2xDLE9BQU8sRUFBRSxDQUFDLGdGQUFnRixDQUFDO0tBQzNGLEVBQ0QsNFZBQTRWLEVBQzVWLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUMxQix3Q0FBd0MsR0FBRyxHQUFHLEdBQUcsOEJBQThCLEVBQy9FLEdBQUcsRUFDSCx5REFBeUQsQ0FDekQsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLDZCQUE2QixHQUF1QjtJQUN6RCxFQUFFLEVBQUUsVUFBVTtJQUNkLEtBQUssRUFBRSxHQUFHO0lBQ1YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxxQkFBcUIsQ0FBQztJQUM5RSxJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRTtRQUNYLDhGQUEwQyxFQUFFO1lBQzNDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRSxrR0FBa0csQ0FBQztZQUNoTCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFO2dCQUNSLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtnQkFDaEIsK0JBQStCO2FBQy9CO1lBQ0QsZUFBZSxFQUFFO2dCQUNoQjtvQkFDQyxJQUFJLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLE1BQU07d0JBQ1osSUFBSSxFQUFFLE1BQU07cUJBQ1o7aUJBQ0Q7YUFDRDtTQUNEO1FBQ0QsNEZBQTBDLEVBQUU7WUFDM0MsVUFBVSxFQUFFLElBQUk7WUFDaEIsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLGtHQUFrRyxDQUFDO1lBQzlLLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7WUFDeEIsT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUU7Z0JBQ1IsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO2dCQUNoQiwrQkFBK0I7YUFDL0I7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCO29CQUNDLElBQUksRUFBRTt3QkFDTCxJQUFJLEVBQUUsTUFBTTt3QkFDWixJQUFJLEVBQUUsTUFBTTtxQkFDWjtpQkFDRDthQUNEO1NBQ0Q7UUFDRCxrR0FBNEMsRUFBRTtZQUM3QyxVQUFVLEVBQUUsSUFBSTtZQUNoQixtQkFBbUIsRUFBRSxRQUFRLENBQUMsK0NBQStDLEVBQUUsZ0tBQWdLLEVBQUUsK0NBQStDLENBQUM7WUFDalMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztZQUN4QixPQUFPLEVBQUUsSUFBSTtZQUNiLE9BQU8sRUFBRTtnQkFDUixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7Z0JBQ2hCLCtCQUErQjthQUMvQjtZQUNELGVBQWUsRUFBRTtnQkFDaEI7b0JBQ0MsSUFBSSxFQUFFO3dCQUNMLElBQUksRUFBRSxNQUFNO3dCQUNaLElBQUksRUFBRSxNQUFNO3FCQUNaO2lCQUNEO2FBQ0Q7U0FDRDtRQUNELGdGQUFtQyxFQUFFO1lBQ3BDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLG1CQUFtQixFQUFFLHdDQUF3QywwQkFBa0I7WUFDL0UsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUU7Z0JBQ1IsWUFBWSxFQUFFO29CQUNiLE1BQU0sRUFBRSxZQUFZO29CQUNwQixJQUFJLEVBQUUscUJBQXFCO2lCQUMzQjtnQkFDRCxnQkFBZ0IsRUFBRTtvQkFDakIsSUFBSSxFQUFFO3dCQUNMLG1DQUFtQzt3QkFDbkMsa0NBQWtDO3FCQUNsQztvQkFDRCxJQUFJLEVBQUUsRUFBRTtvQkFDUixJQUFJLEVBQUUsY0FBYztpQkFDcEI7Z0JBQ0QsVUFBVSxFQUFFO29CQUNYLE1BQU0sRUFBRSxVQUFVO2lCQUNsQjthQUNEO1lBQ0Qsb0JBQW9CLEVBQUU7Z0JBQ3JCLE9BQU8sRUFBRTtvQkFDUjt3QkFDQyxJQUFJLEVBQUUsUUFBUTt3QkFDZCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7d0JBQ3BCLFVBQVUsRUFBRTs0QkFDWCxNQUFNLEVBQUU7Z0NBQ1AsV0FBVyxFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSw2S0FBNkssQ0FBQztnQ0FDck8sSUFBSSxFQUFFLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQzs2QkFDaEM7NEJBQ0QsR0FBRyw2QkFBNkI7eUJBQ2hDO3FCQUNEO29CQUNEO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLFFBQVEsRUFBRSxDQUFDLHFCQUFxQixFQUFFLElBQUksRUFBRSxPQUFPLENBQUM7d0JBQ2hELFVBQVUsRUFBRTs0QkFDWCxtQkFBbUIsRUFBRTtnQ0FDcEIsV0FBVyxFQUFFLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSw4Q0FBOEMsQ0FBQztnQ0FDbkgsSUFBSSxFQUFFLFFBQVE7NkJBQ2Q7NEJBQ0QsRUFBRSxFQUFFO2dDQUNILFdBQVcsRUFBRSxRQUFRLENBQUMsb0NBQW9DLEVBQUUsa0NBQWtDLENBQUM7Z0NBQy9GLElBQUksRUFBRSxRQUFROzZCQUNkOzRCQUNELEtBQUssRUFBRTtnQ0FDTixXQUFXLEVBQUUsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLG9DQUFvQyxDQUFDO2dDQUNwRyxJQUFJLEVBQUUsUUFBUTs2QkFDZDs0QkFDRCxHQUFHLDZCQUE2Qjt5QkFDaEM7cUJBQ0Q7b0JBQ0QsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO29CQUNoQixxQkFBcUI7aUJBQ3JCO2FBQ0Q7U0FDRDtRQUNELDBFQUFpQyxFQUFFO1lBQ2xDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLG1CQUFtQixFQUFFLHdDQUF3QyxzQkFBYztZQUMzRSxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRTtnQkFDUixNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE1BQU07b0JBQ1osSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO29CQUNaLElBQUksRUFBRSxlQUFlO2lCQUNyQjtnQkFDRCxLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLEtBQUs7b0JBQ1gsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO2lCQUNaO2dCQUNELE1BQU0sRUFBRTtvQkFDUCxJQUFJLEVBQUUsTUFBTTtvQkFDWixJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7aUJBQ1o7Z0JBQ0QsTUFBTSxFQUFFO29CQUNQLElBQUksRUFBRSxNQUFNO29CQUNaLElBQUksRUFBRSxlQUFlO2lCQUNyQjtnQkFDRCxNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE1BQU07b0JBQ1osSUFBSSxFQUFFLHFCQUFxQjtpQkFDM0I7YUFDRDtZQUNELG9CQUFvQixFQUFFO2dCQUNyQixPQUFPLEVBQUU7b0JBQ1I7d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsUUFBUSxFQUFFLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQzt3QkFDaEQsVUFBVSxFQUFFOzRCQUNYLG1CQUFtQixFQUFFO2dDQUNwQixXQUFXLEVBQUUsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLDhDQUE4QyxDQUFDO2dDQUMvRyxJQUFJLEVBQUUsUUFBUTs2QkFDZDs0QkFDRCxFQUFFLEVBQUU7Z0NBQ0gsV0FBVyxFQUFFLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxrQ0FBa0MsQ0FBQztnQ0FDM0YsSUFBSSxFQUFFLFFBQVE7NkJBQ2Q7NEJBQ0QsS0FBSyxFQUFFO2dDQUNOLFdBQVcsRUFBRSxRQUFRLENBQUMsbUNBQW1DLEVBQUUsb0NBQW9DLENBQUM7Z0NBQ2hHLElBQUksRUFBRSxRQUFROzZCQUNkOzRCQUNELEdBQUcsNkJBQTZCO3lCQUNoQztxQkFDRDtvQkFDRCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7b0JBQ2hCLHFCQUFxQjtpQkFDckI7YUFDRDtTQUNEO1FBQ0QsNEVBQWlDLEVBQUU7WUFDbEMsVUFBVSxFQUFFLElBQUk7WUFDaEIsbUJBQW1CLEVBQUUsd0NBQXdDLHdCQUFnQjtZQUM3RSxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRTtnQkFDUixNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE1BQU07b0JBQ1osSUFBSSxFQUFFLGVBQWU7aUJBQ3JCO2dCQUNELEtBQUssRUFBRTtvQkFDTixJQUFJLEVBQUUsS0FBSztpQkFDWDtnQkFDRCxNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE1BQU07aUJBQ1o7Z0JBQ0QsTUFBTSxFQUFFO29CQUNQLElBQUksRUFBRSxNQUFNO29CQUNaLElBQUksRUFBRSxlQUFlO2lCQUNyQjtnQkFDRCxNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE1BQU07b0JBQ1osSUFBSSxFQUFFLHFCQUFxQjtpQkFDM0I7YUFDRDtZQUNELG9CQUFvQixFQUFFO2dCQUNyQixPQUFPLEVBQUU7b0JBQ1I7d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsUUFBUSxFQUFFLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQzt3QkFDaEQsVUFBVSxFQUFFOzRCQUNYLG1CQUFtQixFQUFFO2dDQUNwQixXQUFXLEVBQUUsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLDhDQUE4QyxDQUFDO2dDQUNqSCxJQUFJLEVBQUUsUUFBUTs2QkFDZDs0QkFDRCxFQUFFLEVBQUU7Z0NBQ0gsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxrQ0FBa0MsQ0FBQztnQ0FDN0YsSUFBSSxFQUFFLFFBQVE7NkJBQ2Q7NEJBQ0QsS0FBSyxFQUFFO2dDQUNOLFdBQVcsRUFBRSxRQUFRLENBQUMscUNBQXFDLEVBQUUsb0NBQW9DLENBQUM7Z0NBQ2xHLElBQUksRUFBRSxRQUFROzZCQUNkOzRCQUNELEdBQUcsNkJBQTZCO3lCQUNoQztxQkFDRDtvQkFDRCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7b0JBQ2hCLHFCQUFxQjtpQkFDckI7YUFDRDtTQUNEO1FBQ0QsNkVBQWtDLEVBQUU7WUFDbkMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSx3RUFBd0UsQ0FBQztZQUNySSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxxRUFBOEIsRUFBRTtZQUMvQixLQUFLLHdDQUFnQztZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGtNQUFrTSxDQUFDO1lBQzNQLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELHVHQUErQyxFQUFFO1lBQ2hELEtBQUssd0NBQWdDO1lBQ3JDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxpREFBaUQsRUFBRSwyWUFBMlksQ0FBQztZQUM3ZCxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxHQUFHO1NBQ1o7UUFDRCwyRUFBaUMsRUFBRTtZQUNsQyxLQUFLLHdDQUFnQztZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLDBEQUEwRCxDQUFDO1lBQ3RILElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELHFGQUFzQyxFQUFFO1lBQ3ZDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSw4REFBOEQsRUFBRSx1Q0FBdUMsQ0FBQztZQUNwTCxJQUFJLEVBQUUsT0FBTztZQUNiLEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsSUFBSTthQUNqQjtZQUNELE9BQU8sRUFBRTtnQkFDUixxRUFBcUU7Z0JBQ3JFLFVBQVU7Z0JBQ1YsWUFBWTtnQkFDWiw4RUFBOEU7Z0JBQzlFLE1BQU07Z0JBQ04sS0FBSzthQUNMO1NBQ0Q7S0FDRDtDQUNELENBQUM7QUFFRjs7R0FFRztBQUNILE1BQU0sVUFBVSxxQ0FBcUM7SUFDcEQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDbkgsMkNBQTJDLEVBQUUsQ0FBQztBQUMvQyxDQUFDO0FBRUQsSUFBSSw0QkFBNEQsQ0FBQztBQUNqRSxNQUFNLFVBQVUsMkNBQTJDLENBQUMsZ0JBQXdFLEVBQUUsNEJBQW1FO0lBQ3hNLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMvRSxJQUFJLFdBQVcsQ0FBQztJQUNoQixJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDdEIsV0FBVyxHQUFHLHdCQUF3QixDQUFDLGdCQUFnQixFQUFFLFFBQVEsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUFDRCxNQUFNLCtCQUErQixHQUFHLDRCQUE0QixDQUFDO0lBQ3JFLDRCQUE0QixHQUFHO1FBQzlCLEVBQUUsRUFBRSxVQUFVO1FBQ2QsS0FBSyxFQUFFLEdBQUc7UUFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLHFCQUFxQixDQUFDO1FBQzlFLElBQUksRUFBRSxRQUFRO1FBQ2QsVUFBVSxFQUFFO1lBQ1gsd0ZBQXVDLEVBQUU7Z0JBQ3hDLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixtQkFBbUIsRUFBRSxRQUFRLENBQUMsMENBQTBDLEVBQUUsd0NBQXdDLENBQUM7Z0JBQ25ILElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7Z0JBQ3hCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLGtDQUEwQixDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUN0Rix3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLGtDQUEwQixDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFNBQVM7YUFDeEg7WUFDRCxzRkFBdUMsRUFBRTtnQkFDeEMsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSx3Q0FBd0MsQ0FBQztnQkFDakgsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztnQkFDeEIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsc0NBQThCLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQzFGLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLEVBQUUsc0NBQThCLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsU0FBUzthQUM1SDtZQUNELDRGQUF5QyxFQUFFO2dCQUMxQyxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLDBDQUEwQyxDQUFDO2dCQUN2SCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO2dCQUN4QixPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxvQ0FBNEIsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDeEYsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxvQ0FBNEIsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxTQUFTO2FBQzFIO1NBQ0Q7S0FDRCxDQUFDO0lBQ0YsUUFBUSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsNEJBQTRCLENBQUMsRUFBRSxNQUFNLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxSixDQUFDIn0=