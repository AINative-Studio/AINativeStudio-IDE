/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import themePickerContent from './media/theme_picker.js';
import notebookProfileContent from './media/notebookProfile.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { NotebookSetting } from '../../notebook/common/notebookCommon.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import product from '../../../../platform/product/common/product.js';
class GettingStartedContentProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    registerProvider(moduleId, provider) {
        this.providers.set(moduleId, provider);
    }
    getProvider(moduleId) {
        return this.providers.get(moduleId);
    }
}
export const gettingStartedContentRegistry = new GettingStartedContentProviderRegistry();
export async function moduleToContent(resource) {
    if (!resource.query) {
        throw new Error('Getting Started: invalid resource');
    }
    const query = JSON.parse(resource.query);
    if (!query.moduleId) {
        throw new Error('Getting Started: invalid resource');
    }
    const provider = gettingStartedContentRegistry.getProvider(query.moduleId);
    if (!provider) {
        throw new Error(`Getting Started: no provider registered for ${query.moduleId}`);
    }
    return provider();
}
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker', themePickerContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/notebookProfile', notebookProfileContent);
// Register empty media for accessibility walkthrough
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/empty', () => '');
const setupIcon = registerIcon('getting-started-setup', Codicon.zap, localize('getting-started-setup-icon', "Icon used for the setup category of welcome page"));
const beginnerIcon = registerIcon('getting-started-beginner', Codicon.lightbulb, localize('getting-started-beginner-icon', "Icon used for the beginner category of welcome page"));
export const startEntries = [
    {
        id: 'welcome.showNewFileEntries',
        title: localize('gettingStarted.newFile.title', "New File..."),
        description: localize('gettingStarted.newFile.description', "Open a new untitled text file, notebook, or custom editor."),
        icon: Codicon.newFile,
        content: {
            type: 'startEntry',
            command: 'command:welcome.showNewFileEntries',
        }
    },
    {
        id: 'topLevelOpenMac',
        title: localize('gettingStarted.openMac.title', "Open..."),
        description: localize('gettingStarted.openMac.description', "Open a file or folder to start working"),
        icon: Codicon.folderOpened,
        when: '!isWeb && isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFileFolder',
        }
    },
    {
        id: 'topLevelOpenFile',
        title: localize('gettingStarted.openFile.title', "Open File..."),
        description: localize('gettingStarted.openFile.description', "Open a file to start working"),
        icon: Codicon.goToFile,
        when: 'isWeb || !isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFile',
        }
    },
    {
        id: 'topLevelOpenFolder',
        title: localize('gettingStarted.openFolder.title', "Open Folder..."),
        description: localize('gettingStarted.openFolder.description', "Open a folder to start working"),
        icon: Codicon.folderOpened,
        when: '!isWeb && !isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFolder',
        }
    },
    {
        id: 'topLevelOpenFolderWeb',
        title: localize('gettingStarted.openFolder.title', "Open Folder..."),
        description: localize('gettingStarted.openFolder.description', "Open a folder to start working"),
        icon: Codicon.folderOpened,
        when: '!openFolderWorkspaceSupport && workbenchState == \'workspace\'',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFolderViaWorkspace',
        }
    },
    {
        id: 'topLevelGitClone',
        title: localize('gettingStarted.topLevelGitClone.title', "Clone Git Repository..."),
        description: localize('gettingStarted.topLevelGitClone.description', "Clone a remote repository to a local folder"),
        when: 'config.git.enabled && !git.missing',
        icon: Codicon.sourceControl,
        content: {
            type: 'startEntry',
            command: 'command:git.clone',
        }
    },
    {
        id: 'topLevelGitOpen',
        title: localize('gettingStarted.topLevelGitOpen.title', "Open Repository..."),
        description: localize('gettingStarted.topLevelGitOpen.description', "Connect to a remote repository or pull request to browse, search, edit, and commit"),
        when: 'workspacePlatform == \'webworker\'',
        icon: Codicon.sourceControl,
        content: {
            type: 'startEntry',
            command: 'command:remoteHub.openRepository',
        }
    },
    {
        id: 'topLevelShowWalkthroughs',
        title: localize('gettingStarted.topLevelShowWalkthroughs.title', "Open a Walkthrough..."),
        description: localize('gettingStarted.topLevelShowWalkthroughs.description', "View a walkthrough on the editor or an extension"),
        icon: Codicon.checklist,
        when: 'allWalkthroughsHidden',
        content: {
            type: 'startEntry',
            command: 'command:welcome.showAllWalkthroughs',
        }
    },
    {
        id: 'topLevelRemoteOpen',
        title: localize('gettingStarted.topLevelRemoteOpen.title', "Connect to..."),
        description: localize('gettingStarted.topLevelRemoteOpen.description', "Connect to remote development workspaces."),
        when: '!isWeb',
        icon: Codicon.remote,
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.remote.showMenu',
        }
    },
    {
        id: 'topLevelOpenTunnel',
        title: localize('gettingStarted.topLevelOpenTunnel.title', "Open Tunnel..."),
        description: localize('gettingStarted.topLevelOpenTunnel.description', "Connect to a remote machine through a Tunnel"),
        when: 'isWeb && showRemoteStartEntryInWeb',
        icon: Codicon.remote,
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.remote.showWebStartEntryActions',
        }
    },
];
const Button = (title, href) => `[${title}](${href})`;
const CopilotStepTitle = localize('gettingStarted.copilotSetup.title', "Use AI features with Copilot for free");
const CopilotDescription = localize({ key: 'gettingStarted.copilotSetup.description', comment: ['{Locked="["}', '{Locked="]({0})"}'] }, "You can use [Copilot]({0}) to generate code across multiple files, fix errors, ask questions about your code and much more using natural language.", product.defaultChatAgent?.documentationUrl ?? '');
const CopilotSignedOutButton = Button(localize('setupCopilotButton.signIn', "Set up Copilot"), `command:workbench.action.chat.triggerSetup`);
const CopilotSignedInButton = Button(localize('setupCopilotButton.setup', "Set up Copilot"), `command:workbench.action.chat.triggerSetup`);
const CopilotCompleteButton = Button(localize('setupCopilotButton.chatWithCopilot', "Chat with Copilot"), 'command:workbench.action.chat.open');
function createCopilotSetupStep(id, button, when, includeTerms) {
    const description = includeTerms ?
        `${CopilotDescription}\n\n${button}` :
        `${CopilotDescription}\n${button}`;
    return {
        id,
        title: CopilotStepTitle,
        description,
        when,
        media: {
            type: 'svg', altText: 'VS Code Copilot multi file edits', path: 'multi-file-edits.svg'
        },
    };
}
export const walkthroughs = [
    {
        id: 'Setup',
        title: localize('gettingStarted.setup.title', "Get Started with VS Code"),
        description: localize('gettingStarted.setup.description', "Customize your editor, learn the basics, and start coding"),
        isFeatured: true,
        icon: setupIcon,
        when: '!isWeb',
        walkthroughPageTitle: localize('gettingStarted.setup.walkthroughPageTitle', 'Setup VS Code'),
        next: 'Beginner',
        content: {
            type: 'steps',
            steps: [
                createCopilotSetupStep('CopilotSetupSignedOut', CopilotSignedOutButton, 'chatSetupSignedOut', true),
                createCopilotSetupStep('CopilotSetupComplete', CopilotCompleteButton, 'chatSetupInstalled && (chatPlanPro || chatPlanLimited)', false),
                createCopilotSetupStep('CopilotSetupSignedIn', CopilotSignedInButton, '!chatSetupSignedOut && (!chatSetupInstalled || chatPlanCanSignUp)', true),
                {
                    id: 'pickColorTheme',
                    title: localize('gettingStarted.pickColor.title', "Choose your theme"),
                    description: localize('gettingStarted.pickColor.description.interpolated', "The right theme helps you focus on your code, is easy on your eyes, and is simply more fun to use.\n{0}", Button(localize('titleID', "Browse Color Themes"), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme'
                    ],
                    media: { type: 'markdown', path: 'theme_picker', }
                },
                {
                    id: 'extensionsWeb',
                    title: localize('gettingStarted.extensions.title', "Code with extensions"),
                    description: localize('gettingStarted.extensionsWeb.description.interpolated', "Extensions are VS Code's power-ups. A growing number are becoming available in the web.\n{0}", Button(localize('browsePopularWeb', "Browse Popular Web Extensions"), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: 'workspacePlatform == \'webworker\'',
                    media: {
                        type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions-web.svg'
                    },
                },
                {
                    id: 'findLanguageExtensions',
                    title: localize('gettingStarted.findLanguageExts.title', "Rich support for all your languages"),
                    description: localize('gettingStarted.findLanguageExts.description.interpolated', "Code smarter with syntax highlighting, code completion, linting and debugging. While many languages are built-in, many more can be added as extensions.\n{0}", Button(localize('browseLangExts', "Browse Language Extensions"), 'command:workbench.extensions.action.showLanguageExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'Language extensions', path: 'languages.svg'
                    },
                },
                // Hidden in favor of copilot entry (to be revisited when copilot entry moves, if at all)
                // {
                // 	id: 'settings',
                // 	title: localize('gettingStarted.settings.title', "Tune your settings"),
                // 	description: localize('gettingStarted.settings.description.interpolated', "Customize every aspect of VS Code and your extensions to your liking. Commonly used settings are listed first to get you started.\n{0}", Button(localize('tweakSettings', "Open Settings"), 'command:toSide:workbench.action.openSettings')),
                // 	media: {
                // 		type: 'svg', altText: 'VS Code Settings', path: 'settings.svg'
                // 	},
                // },
                // {
                // 	id: 'settingsSync',
                // 	title: localize('gettingStarted.settingsSync.title', "Sync settings across devices"),
                // 	description: localize('gettingStarted.settingsSync.description.interpolated', "Keep your essential customizations backed up and updated across all your devices.\n{0}", Button(localize('enableSync', "Backup and Sync Settings"), 'command:workbench.userDataSync.actions.turnOn')),
                // 	when: 'syncStatus != uninitialized',
                // 	completionEvents: ['onEvent:sync-enabled'],
                // 	media: {
                // 		type: 'svg', altText: 'The "Turn on Sync" entry in the settings gear menu.', path: 'settingsSync.svg'
                // 	},
                // },
                {
                    id: 'settingsAndSync',
                    title: localize('gettingStarted.settings.title', "Tune your settings"),
                    description: localize('gettingStarted.settingsAndSync.description.interpolated', "Customize every aspect of VS Code and your extensions to your liking. [Back up and sync](command:workbench.userDataSync.actions.turnOn) your essential customizations across all your devices.\n{0}", Button(localize('tweakSettings', "Open Settings"), 'command:toSide:workbench.action.openSettings')),
                    when: 'syncStatus != uninitialized',
                    completionEvents: ['onEvent:sync-enabled'],
                    media: {
                        type: 'svg', altText: 'VS Code Settings', path: 'settings.svg'
                    },
                },
                {
                    id: 'commandPaletteTask',
                    title: localize('gettingStarted.commandPalette.title', "Unlock productivity with the Command Palette "),
                    description: localize('gettingStarted.commandPalette.description.interpolated', "Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}", Button(localize('commandPalette', "Open Command Palette"), 'command:workbench.action.showCommands')),
                    media: { type: 'svg', altText: 'Command Palette overlay for searching and executing commands.', path: 'commandPalette.svg' },
                },
                // Hidden in favor of copilot entry (to be revisited when copilot entry moves, if at all)
                // {
                // 	id: 'pickAFolderTask-Mac',
                // 	title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
                // 	description: localize('gettingStarted.setup.OpenFolder.description.interpolated', "You're all set to start coding. Open a project folder to get your files into VS Code.\n{0}", Button(localize('pickFolder', "Pick a Folder"), 'command:workbench.action.files.openFileFolder')),
                // 	when: 'isMac && workspaceFolderCount == 0',
                // 	media: {
                // 		type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                // 	}
                // },
                // {
                // 	id: 'pickAFolderTask-Other',
                // 	title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
                // 	description: localize('gettingStarted.setup.OpenFolder.description.interpolated', "You're all set to start coding. Open a project folder to get your files into VS Code.\n{0}", Button(localize('pickFolder', "Pick a Folder"), 'command:workbench.action.files.openFolder')),
                // 	when: '!isMac && workspaceFolderCount == 0',
                // 	media: {
                // 		type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                // 	}
                // },
                {
                    id: 'quickOpen',
                    title: localize('gettingStarted.quickOpen.title', "Quickly navigate between your files"),
                    description: localize('gettingStarted.quickOpen.description.interpolated', "Navigate between files in an instant with one keystroke. Tip: Open multiple files by pressing the right arrow key.\n{0}", Button(localize('quickOpen', "Quick Open a File"), 'command:toSide:workbench.action.quickOpen')),
                    when: 'workspaceFolderCount != 0',
                    media: {
                        type: 'svg', altText: 'Go to file in quick search.', path: 'search.svg'
                    }
                },
                {
                    id: 'videoTutorial',
                    title: localize('gettingStarted.videoTutorial.title', "Watch video tutorials"),
                    description: localize('gettingStarted.videoTutorial.description.interpolated', "Watch the first in a series of short & practical video tutorials for VS Code's key features.\n{0}", Button(localize('watch', "Watch Tutorial"), 'https://aka.ms/vscode-getting-started-video')),
                    media: { type: 'svg', altText: 'VS Code Settings', path: 'learn.svg' },
                }
            ]
        }
    },
    {
        id: 'SetupWeb',
        title: localize('gettingStarted.setupWeb.title', "Get Started with VS Code for the Web"),
        description: localize('gettingStarted.setupWeb.description', "Customize your editor, learn the basics, and start coding"),
        isFeatured: true,
        icon: setupIcon,
        when: 'isWeb',
        next: 'Beginner',
        walkthroughPageTitle: localize('gettingStarted.setupWeb.walkthroughPageTitle', 'Setup VS Code Web'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'pickColorThemeWeb',
                    title: localize('gettingStarted.pickColor.title', "Choose your theme"),
                    description: localize('gettingStarted.pickColor.description.interpolated', "The right theme helps you focus on your code, is easy on your eyes, and is simply more fun to use.\n{0}", Button(localize('titleID', "Browse Color Themes"), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme'
                    ],
                    media: { type: 'markdown', path: 'theme_picker', }
                },
                {
                    id: 'menuBarWeb',
                    title: localize('gettingStarted.menuBar.title', "Just the right amount of UI"),
                    description: localize('gettingStarted.menuBar.description.interpolated', "The full menu bar is available in the dropdown menu to make room for your code. Toggle its appearance for faster access. \n{0}", Button(localize('toggleMenuBar', "Toggle Menu Bar"), 'command:workbench.action.toggleMenuBar')),
                    when: 'isWeb',
                    media: {
                        type: 'svg', altText: 'Comparing menu dropdown with the visible menu bar.', path: 'menuBar.svg'
                    },
                },
                {
                    id: 'extensionsWebWeb',
                    title: localize('gettingStarted.extensions.title', "Code with extensions"),
                    description: localize('gettingStarted.extensionsWeb.description.interpolated', "Extensions are VS Code's power-ups. A growing number are becoming available in the web.\n{0}", Button(localize('browsePopularWeb', "Browse Popular Web Extensions"), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: 'workspacePlatform == \'webworker\'',
                    media: {
                        type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions-web.svg'
                    },
                },
                {
                    id: 'findLanguageExtensionsWeb',
                    title: localize('gettingStarted.findLanguageExts.title', "Rich support for all your languages"),
                    description: localize('gettingStarted.findLanguageExts.description.interpolated', "Code smarter with syntax highlighting, code completion, linting and debugging. While many languages are built-in, many more can be added as extensions.\n{0}", Button(localize('browseLangExts', "Browse Language Extensions"), 'command:workbench.extensions.action.showLanguageExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'Language extensions', path: 'languages.svg'
                    },
                },
                {
                    id: 'settingsSyncWeb',
                    title: localize('gettingStarted.settingsSync.title', "Sync settings across devices"),
                    description: localize('gettingStarted.settingsSync.description.interpolated', "Keep your essential customizations backed up and updated across all your devices.\n{0}", Button(localize('enableSync', "Backup and Sync Settings"), 'command:workbench.userDataSync.actions.turnOn')),
                    when: 'syncStatus != uninitialized',
                    completionEvents: ['onEvent:sync-enabled'],
                    media: {
                        type: 'svg', altText: 'The "Turn on Sync" entry in the settings gear menu.', path: 'settingsSync.svg'
                    },
                },
                {
                    id: 'commandPaletteTaskWeb',
                    title: localize('gettingStarted.commandPalette.title', "Unlock productivity with the Command Palette "),
                    description: localize('gettingStarted.commandPalette.description.interpolated', "Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}", Button(localize('commandPalette', "Open Command Palette"), 'command:workbench.action.showCommands')),
                    media: { type: 'svg', altText: 'Command Palette overlay for searching and executing commands.', path: 'commandPalette.svg' },
                },
                {
                    id: 'pickAFolderTask-WebWeb',
                    title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
                    description: localize('gettingStarted.setup.OpenFolderWeb.description.interpolated', "You're all set to start coding. You can open a local project or a remote repository to get your files into VS Code.\n{0}\n{1}", Button(localize('openFolder', "Open Folder"), 'command:workbench.action.addRootFolder'), Button(localize('openRepository', "Open Repository"), 'command:remoteHub.openRepository')),
                    when: 'workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                    }
                },
                {
                    id: 'quickOpenWeb',
                    title: localize('gettingStarted.quickOpen.title', "Quickly navigate between your files"),
                    description: localize('gettingStarted.quickOpen.description.interpolated', "Navigate between files in an instant with one keystroke. Tip: Open multiple files by pressing the right arrow key.\n{0}", Button(localize('quickOpen', "Quick Open a File"), 'command:toSide:workbench.action.quickOpen')),
                    when: 'workspaceFolderCount != 0',
                    media: {
                        type: 'svg', altText: 'Go to file in quick search.', path: 'search.svg'
                    }
                }
            ]
        }
    },
    {
        id: 'SetupAccessibility',
        title: localize('gettingStarted.setupAccessibility.title', "Get Started with Accessibility Features"),
        description: localize('gettingStarted.setupAccessibility.description', "Learn the tools and shortcuts that make VS Code accessible. Note that some actions are not actionable from within the context of the walkthrough."),
        isFeatured: true,
        icon: setupIcon,
        when: CONTEXT_ACCESSIBILITY_MODE_ENABLED.key,
        next: 'Setup',
        walkthroughPageTitle: localize('gettingStarted.setupAccessibility.walkthroughPageTitle', 'Setup VS Code Accessibility'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'accessibilityHelp',
                    title: localize('gettingStarted.accessibilityHelp.title', "Use the accessibility help dialog to learn about features"),
                    description: localize('gettingStarted.accessibilityHelp.description.interpolated', "The accessibility help dialog provides information about what to expect from a feature and the commands/keybindings to operate them.\n With focus in an editor, terminal, notebook, chat response, comment, or debug console, the relevant dialog can be opened with the Open Accessibility Help command.\n{0}", Button(localize('openAccessibilityHelp', "Open Accessibility Help"), 'command:editor.action.accessibilityHelp')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'accessibleView',
                    title: localize('gettingStarted.accessibleView.title', "Screen reader users can inspect content line by line, character by character in the accessible view."),
                    description: localize('gettingStarted.accessibleView.description.interpolated', "The accessible view is available for the terminal, hovers, notifications, comments, notebook output, chat responses, inline completions, and debug console output.\n With focus in any of those features, it can be opened with the Open Accessible View command.\n{0}", Button(localize('openAccessibleView', "Open Accessible View"), 'command:editor.action.accessibleView')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'verbositySettings',
                    title: localize('gettingStarted.verbositySettings.title', "Control the verbosity of aria labels"),
                    description: localize('gettingStarted.verbositySettings.description.interpolated', "Screen reader verbosity settings exist for features around the workbench so that once a user is familiar with a feature, they can avoid hearing hints about how to operate it. For example, features for which an accessibility help dialog exists will indicate how to open the dialog until the verbosity setting for that feature has been disabled.\n These and other accessibility settings can be configured by running the Open Accessibility Settings command.\n{0}", Button(localize('openVerbositySettings', "Open Accessibility Settings"), 'command:workbench.action.openAccessibilitySettings')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'commandPaletteTaskAccessibility',
                    title: localize('gettingStarted.commandPaletteAccessibility.title', "Unlock productivity with the Command Palette "),
                    description: localize('gettingStarted.commandPaletteAccessibility.description.interpolated', "Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}", Button(localize('commandPalette', "Open Command Palette"), 'command:workbench.action.showCommands')),
                    media: { type: 'markdown', path: 'empty' },
                },
                {
                    id: 'keybindingsAccessibility',
                    title: localize('gettingStarted.keyboardShortcuts.title', "Customize your keyboard shortcuts"),
                    description: localize('gettingStarted.keyboardShortcuts.description.interpolated', "Once you have discovered your favorite commands, create custom keyboard shortcuts for instant access.\n{0}", Button(localize('keyboardShortcuts', "Keyboard Shortcuts"), 'command:toSide:workbench.action.openGlobalKeybindings')),
                    media: {
                        type: 'markdown', path: 'empty',
                    }
                },
                {
                    id: 'accessibilitySignals',
                    title: localize('gettingStarted.accessibilitySignals.title', "Fine tune which accessibility signals you want to receive via audio or a braille device"),
                    description: localize('gettingStarted.accessibilitySignals.description.interpolated', "Accessibility sounds and announcements are played around the workbench for different events.\n These can be discovered and configured using the List Signal Sounds and List Signal Announcements commands.\n{0}\n{1}", Button(localize('listSignalSounds', "List Signal Sounds"), 'command:signals.sounds.help'), Button(localize('listSignalAnnouncements', "List Signal Announcements"), 'command:accessibility.announcement.help')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'hover',
                    title: localize('gettingStarted.hover.title', "Access the hover in the editor to get more information on a variable or symbol"),
                    description: localize('gettingStarted.hover.description.interpolated', "While focus is in the editor on a variable or symbol, a hover can be can be focused with the Show or Open Hover command.\n{0}", Button(localize('showOrFocusHover', "Show or Focus Hover"), 'command:editor.action.showHover')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'goToSymbol',
                    title: localize('gettingStarted.goToSymbol.title', "Navigate to symbols in a file"),
                    description: localize('gettingStarted.goToSymbol.description.interpolated', "The Go to Symbol command is useful for navigating between important landmarks in a document.\n{0}", Button(localize('openGoToSymbol', "Go to Symbol"), 'command:editor.action.goToSymbol')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'codeFolding',
                    title: localize('gettingStarted.codeFolding.title', "Use code folding to collapse blocks of code and focus on the code you're interested in."),
                    description: localize('gettingStarted.codeFolding.description.interpolated', "Fold or unfold a code section with the Toggle Fold command.\n{0}\n Fold or unfold recursively with the Toggle Fold Recursively Command\n{1}\n", Button(localize('toggleFold', "Toggle Fold"), 'command:editor.toggleFold'), Button(localize('toggleFoldRecursively', "Toggle Fold Recursively"), 'command:editor.toggleFoldRecursively')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'intellisense',
                    title: localize('gettingStarted.intellisense.title', "Use Intellisense to improve coding efficiency"),
                    description: localize('gettingStarted.intellisense.description.interpolated', "Intellisense suggestions can be opened with the Trigger Intellisense command.\n{0}\n Inline intellisense suggestions can be triggered with Trigger Inline Suggestion\n{1}\n Useful settings include editor.inlineCompletionsAccessibilityVerbose and editor.screenReaderAnnounceInlineSuggestion.", Button(localize('triggerIntellisense', "Trigger Intellisense"), 'command:editor.action.triggerSuggest'), Button(localize('triggerInlineSuggestion', 'Trigger Inline Suggestion'), 'command:editor.action.inlineSuggest.trigger')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'accessibilitySettings',
                    title: localize('gettingStarted.accessibilitySettings.title', "Configure accessibility settings"),
                    description: localize('gettingStarted.accessibilitySettings.description.interpolated', "Accessibility settings can be configured by running the Open Accessibility Settings command.\n{0}", Button(localize('openAccessibilitySettings', "Open Accessibility Settings"), 'command:workbench.action.openAccessibilitySettings')),
                    media: { type: 'markdown', path: 'empty' }
                }
            ]
        }
    },
    {
        id: 'Beginner',
        isFeatured: false,
        title: localize('gettingStarted.beginner.title', "Learn the Fundamentals"),
        icon: beginnerIcon,
        description: localize('gettingStarted.beginner.description', "Get an overview of the most essential features"),
        walkthroughPageTitle: localize('gettingStarted.beginner.walkthroughPageTitle', 'Essential Features'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'extensions',
                    title: localize('gettingStarted.extensions.title', "Code with extensions"),
                    description: localize('gettingStarted.extensions.description.interpolated', "Extensions are VS Code's power-ups. They range from handy productivity hacks, expanding out-of-the-box features, to adding completely new capabilities.\n{0}", Button(localize('browsePopular', "Browse Popular Extensions"), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions.svg'
                    },
                },
                {
                    id: 'terminal',
                    title: localize('gettingStarted.terminal.title', "Built-in terminal"),
                    description: localize('gettingStarted.terminal.description.interpolated', "Quickly run shell commands and monitor build output, right next to your code.\n{0}", Button(localize('showTerminal', "Open Terminal"), 'command:workbench.action.terminal.toggleTerminal')),
                    when: 'workspacePlatform != \'webworker\' && remoteName != codespaces && !terminalIsOpen',
                    media: {
                        type: 'svg', altText: 'Integrated terminal running a few npm commands', path: 'terminal.svg'
                    },
                },
                {
                    id: 'debugging',
                    title: localize('gettingStarted.debug.title', "Watch your code in action"),
                    description: localize('gettingStarted.debug.description.interpolated', "Accelerate your edit, build, test, and debug loop by setting up a launch configuration.\n{0}", Button(localize('runProject', "Run your Project"), 'command:workbench.action.debug.selectandstart')),
                    when: 'workspacePlatform != \'webworker\' && workspaceFolderCount != 0',
                    media: {
                        type: 'svg', altText: 'Run and debug view.', path: 'debug.svg',
                    },
                },
                {
                    id: 'scmClone',
                    title: localize('gettingStarted.scm.title', "Track your code with Git"),
                    description: localize('gettingStarted.scmClone.description.interpolated', "Set up the built-in version control for your project to track your changes and collaborate with others.\n{0}", Button(localize('cloneRepo', "Clone Repository"), 'command:git.clone')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'scmSetup',
                    title: localize('gettingStarted.scm.title', "Track your code with Git"),
                    description: localize('gettingStarted.scmSetup.description.interpolated', "Set up the built-in version control for your project to track your changes and collaborate with others.\n{0}", Button(localize('initRepo', "Initialize Git Repository"), 'command:git.init')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount == 0',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'scm',
                    title: localize('gettingStarted.scm.title', "Track your code with Git"),
                    description: localize('gettingStarted.scm.description.interpolated', "No more looking up Git commands! Git and GitHub workflows are seamlessly integrated.\n{0}", Button(localize('openSCM', "Open Source Control"), 'command:workbench.view.scm')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount != 0 && activeViewlet != \'workbench.view.scm\'',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'installGit',
                    title: localize('gettingStarted.installGit.title', "Install Git"),
                    description: localize({ key: 'gettingStarted.installGit.description.interpolated', comment: ['The placeholders are command link items should not be translated'] }, "Install Git to track changes in your projects.\n{0}\n{1}Reload window{2} after installation to complete Git setup.", Button(localize('installGit', "Install Git"), 'https://aka.ms/vscode-install-git'), '[', '](command:workbench.action.reloadWindow)'),
                    when: 'git.missing',
                    media: {
                        type: 'svg', altText: 'Install Git.', path: 'git.svg',
                    },
                    completionEvents: [
                        'onContext:git.state == initialized'
                    ]
                },
                {
                    id: 'tasks',
                    title: localize('gettingStarted.tasks.title', "Automate your project tasks"),
                    when: 'workspaceFolderCount != 0 && workspacePlatform != \'webworker\'',
                    description: localize('gettingStarted.tasks.description.interpolated', "Create tasks for your common workflows and enjoy the integrated experience of running scripts and automatically checking results.\n{0}", Button(localize('runTasks', "Run Auto-detected Tasks"), 'command:workbench.action.tasks.runTask')),
                    media: {
                        type: 'svg', altText: 'Task runner.', path: 'runTask.svg',
                    },
                },
                {
                    id: 'shortcuts',
                    title: localize('gettingStarted.shortcuts.title', "Customize your shortcuts"),
                    description: localize('gettingStarted.shortcuts.description.interpolated', "Once you have discovered your favorite commands, create custom keyboard shortcuts for instant access.\n{0}", Button(localize('keyboardShortcuts', "Keyboard Shortcuts"), 'command:toSide:workbench.action.openGlobalKeybindings')),
                    media: {
                        type: 'svg', altText: 'Interactive shortcuts.', path: 'shortcuts.svg',
                    }
                },
                {
                    id: 'workspaceTrust',
                    title: localize('gettingStarted.workspaceTrust.title', "Safely browse and edit code"),
                    description: localize('gettingStarted.workspaceTrust.description.interpolated', "{0} lets you decide whether your project folders should **allow or restrict** automatic code execution __(required for extensions, debugging, etc)__.\nOpening a file/folder will prompt to grant trust. You can always {1} later.", Button(localize('workspaceTrust', "Workspace Trust"), 'https://code.visualstudio.com/docs/editor/workspace-trust'), Button(localize('enableTrust', "enable trust"), 'command:toSide:workbench.trust.manage')),
                    when: 'workspacePlatform != \'webworker\' && !isWorkspaceTrusted && workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Workspace Trust editor in Restricted mode and a primary button for switching to Trusted mode.', path: 'workspaceTrust.svg'
                    },
                },
            ]
        }
    },
    {
        id: 'notebooks',
        title: localize('gettingStarted.notebook.title', "Customize Notebooks"),
        description: '',
        icon: setupIcon,
        isFeatured: false,
        when: `config.${NotebookSetting.openGettingStarted} && userHasOpenedNotebook`,
        walkthroughPageTitle: localize('gettingStarted.notebook.walkthroughPageTitle', 'Notebooks'),
        content: {
            type: 'steps',
            steps: [
                {
                    completionEvents: ['onCommand:notebook.setProfile'],
                    id: 'notebookProfile',
                    title: localize('gettingStarted.notebookProfile.title', "Select the layout for your notebooks"),
                    description: localize('gettingStarted.notebookProfile.description', "Get notebooks to feel just the way you prefer"),
                    when: 'userHasOpenedNotebook',
                    media: {
                        type: 'markdown', path: 'notebookProfile'
                    }
                },
            ]
        }
    }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRDb250ZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2NvbW1vbi9nZXR0aW5nU3RhcnRlZENvbnRlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxrQkFBa0IsTUFBTSx5QkFBeUIsQ0FBQztBQUN6RCxPQUFPLHNCQUFzQixNQUFNLDRCQUE0QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVoSCxPQUFPLE9BQU8sTUFBTSxnREFBZ0QsQ0FBQztBQU1yRSxNQUFNLHFDQUFxQztJQUEzQztRQUVrQixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTBDLENBQUM7SUFTaEYsQ0FBQztJQVBBLGdCQUFnQixDQUFDLFFBQWdCLEVBQUUsUUFBd0M7UUFDMUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBZ0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0Q7QUFDRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLHFDQUFxQyxFQUFFLENBQUM7QUFF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