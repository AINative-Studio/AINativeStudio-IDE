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
import * as nls from '../../../../nls.js';
import { sep } from '../../../../base/common/path.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { AutoSaveConfiguration, HotExitConfiguration, FILES_EXCLUDE_CONFIG, FILES_ASSOCIATIONS_CONFIG, FILES_READONLY_INCLUDE_CONFIG, FILES_READONLY_EXCLUDE_CONFIG, FILES_READONLY_FROM_PERMISSIONS_CONFIG } from '../../../../platform/files/common/files.js';
import { FILE_EDITOR_INPUT_ID, BINARY_TEXT_FILE_MODE } from '../common/files.js';
import { TextFileEditorTracker } from './editors/textFileEditorTracker.js';
import { TextFileSaveErrorHandler } from './editors/textFileSaveErrorHandler.js';
import { FileEditorInput } from './editors/fileEditorInput.js';
import { BinaryFileEditor } from './editors/binaryFileEditor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { isNative, isWeb, isWindows } from '../../../../base/common/platform.js';
import { ExplorerViewletViewsContribution } from './explorerViewlet.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ExplorerService, UNDO_REDO_SOURCE } from './explorerService.js';
import { GUESSABLE_ENCODINGS, SUPPORTED_ENCODINGS } from '../../../services/textfile/common/encoding.js';
import { Schemas } from '../../../../base/common/network.js';
import { WorkspaceWatcher } from './workspaceWatcher.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { DirtyFilesIndicator } from '../common/dirtyFilesIndicator.js';
import { UndoCommand, RedoCommand } from '../../../../editor/browser/editorExtensions.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IExplorerService } from './files.js';
import { FileEditorInputSerializer, FileEditorWorkingCopyEditorHandler } from './editors/fileEditorHandler.js';
import { ModesRegistry } from '../../../../editor/common/languages/modesRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TextFileEditor } from './editors/textFileEditor.js';
let FileUriLabelContribution = class FileUriLabelContribution {
    static { this.ID = 'workbench.contrib.fileUriLabel'; }
    constructor(labelService) {
        labelService.registerFormatter({
            scheme: Schemas.file,
            formatting: {
                label: '${authority}${path}',
                separator: sep,
                tildify: !isWindows,
                normalizeDriveLetter: isWindows,
                authorityPrefix: sep + sep,
                workspaceSuffix: ''
            }
        });
    }
};
FileUriLabelContribution = __decorate([
    __param(0, ILabelService)
], FileUriLabelContribution);
registerSingleton(IExplorerService, ExplorerService, 1 /* InstantiationType.Delayed */);
// Register file editors
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TextFileEditor, TextFileEditor.ID, nls.localize('textFileEditor', "Text File Editor")), [
    new SyncDescriptor(FileEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(BinaryFileEditor, BinaryFileEditor.ID, nls.localize('binaryFileEditor', "Binary File Editor")), [
    new SyncDescriptor(FileEditorInput)
]);
// Register default file input factory
Registry.as(EditorExtensions.EditorFactory).registerFileEditorFactory({
    typeId: FILE_EDITOR_INPUT_ID,
    createFileEditor: (resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService) => {
        return instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents);
    },
    isFileEditor: (obj) => {
        return obj instanceof FileEditorInput;
    }
});
// Register Editor Input Serializer & Handler
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(FILE_EDITOR_INPUT_ID, FileEditorInputSerializer);
registerWorkbenchContribution2(FileEditorWorkingCopyEditorHandler.ID, FileEditorWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
// Register Explorer views
registerWorkbenchContribution2(ExplorerViewletViewsContribution.ID, ExplorerViewletViewsContribution, 1 /* WorkbenchPhase.BlockStartup */);
// Register Text File Editor Tracker
registerWorkbenchContribution2(TextFileEditorTracker.ID, TextFileEditorTracker, 1 /* WorkbenchPhase.BlockStartup */);
// Register Text File Save Error Handler
registerWorkbenchContribution2(TextFileSaveErrorHandler.ID, TextFileSaveErrorHandler, 1 /* WorkbenchPhase.BlockStartup */);
// Register uri display for file uris
registerWorkbenchContribution2(FileUriLabelContribution.ID, FileUriLabelContribution, 1 /* WorkbenchPhase.BlockStartup */);
// Register Workspace Watcher
registerWorkbenchContribution2(WorkspaceWatcher.ID, WorkspaceWatcher, 3 /* WorkbenchPhase.AfterRestored */);
// Register Dirty Files Indicator
registerWorkbenchContribution2(DirtyFilesIndicator.ID, DirtyFilesIndicator, 1 /* WorkbenchPhase.BlockStartup */);
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const hotExitConfiguration = isNative ?
    {
        'type': 'string',
        'scope': 1 /* ConfigurationScope.APPLICATION */,
        'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
        'default': HotExitConfiguration.ON_EXIT,
        'markdownEnumDescriptions': [
            nls.localize('hotExit.off', 'Disable hot exit. A prompt will show when attempting to close a window with editors that have unsaved changes.'),
            nls.localize('hotExit.onExit', 'Hot exit will be triggered when the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu). All windows without folders opened will be restored upon next launch. A list of previously opened windows with unsaved files can be accessed via `File > Open Recent > More...`'),
            nls.localize('hotExit.onExitAndWindowClose', 'Hot exit will be triggered when the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu), and also for any window with a folder opened regardless of whether it\'s the last window. All windows without folders opened will be restored upon next launch. A list of previously opened windows with unsaved files can be accessed via `File > Open Recent > More...`')
        ],
        'markdownDescription': nls.localize('hotExit', "[Hot Exit](https://aka.ms/vscode-hot-exit) controls whether unsaved files are remembered between sessions, allowing the save prompt when exiting the editor to be skipped.", HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
    } : {
    'type': 'string',
    'scope': 1 /* ConfigurationScope.APPLICATION */,
    'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
    'default': HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE,
    'markdownEnumDescriptions': [
        nls.localize('hotExit.off', 'Disable hot exit. A prompt will show when attempting to close a window with editors that have unsaved changes.'),
        nls.localize('hotExit.onExitAndWindowCloseBrowser', 'Hot exit will be triggered when the browser quits or the window or tab is closed.')
    ],
    'markdownDescription': nls.localize('hotExit', "[Hot Exit](https://aka.ms/vscode-hot-exit) controls whether unsaved files are remembered between sessions, allowing the save prompt when exiting the editor to be skipped.", HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
};
configurationRegistry.registerConfiguration({
    'id': 'files',
    'order': 9,
    'title': nls.localize('filesConfigurationTitle', "Files"),
    'type': 'object',
    'properties': {
        [FILES_EXCLUDE_CONFIG]: {
            'type': 'object',
            'markdownDescription': nls.localize('exclude', "Configure [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files and folders. For example, the File Explorer decides which files and folders to show or hide based on this setting. Refer to the `#search.exclude#` setting to define search-specific excludes. Refer to the `#explorer.excludeGitIgnore#` setting for ignoring files based on your `.gitignore`."),
            'default': {
                ...{ '**/.git': true, '**/.svn': true, '**/.hg': true, '**/.DS_Store': true, '**/Thumbs.db': true },
                ...(isWeb ? { '**/*.crswap': true /* filter out swap files used for local file access */ } : undefined)
            },
            'scope': 5 /* ConfigurationScope.RESOURCE */,
            'additionalProperties': {
                'anyOf': [
                    {
                        'type': 'boolean',
                        'enum': [true, false],
                        'enumDescriptions': [nls.localize('trueDescription', "Enable the pattern."), nls.localize('falseDescription', "Disable the pattern.")],
                        'description': nls.localize('files.exclude.boolean', "The glob pattern to match file paths against. Set to true or false to enable or disable the pattern."),
                    },
                    {
                        'type': 'object',
                        'properties': {
                            'when': {
                                'type': 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                'pattern': '\\w*\\$\\(basename\\)\\w*',
                                'default': '$(basename).ext',
                                'markdownDescription': nls.localize({ key: 'files.exclude.when', comment: ['\\$(basename) should not be translated'] }, "Additional check on the siblings of a matching file. Use \\$(basename) as variable for the matching file name.")
                            }
                        }
                    }
                ]
            }
        },
        [FILES_ASSOCIATIONS_CONFIG]: {
            'type': 'object',
            'markdownDescription': nls.localize('associations', "Configure [glob patterns](https://aka.ms/vscode-glob-patterns) of file associations to languages (for example `\"*.extension\": \"html\"`). Patterns will match on the absolute path of a file if they contain a path separator and will match on the name of the file otherwise. These have precedence over the default associations of the languages installed."),
            'additionalProperties': {
                'type': 'string'
            }
        },
        'files.encoding': {
            'type': 'string',
            'enum': Object.keys(SUPPORTED_ENCODINGS),
            'default': 'utf8',
            'description': nls.localize('encoding', "The default character set encoding to use when reading and writing files. This setting can also be configured per language."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            'enumDescriptions': Object.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].labelLong),
            'enumItemLabels': Object.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].labelLong)
        },
        'files.autoGuessEncoding': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize('autoGuessEncoding', "When enabled, the editor will attempt to guess the character set encoding when opening files. This setting can also be configured per language. Note, this setting is not respected by text search. Only {0} is respected.", '`#files.encoding#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.candidateGuessEncodings': {
            'type': 'array',
            'items': {
                'type': 'string',
                'enum': Object.keys(GUESSABLE_ENCODINGS),
                'enumDescriptions': Object.keys(GUESSABLE_ENCODINGS).map(key => GUESSABLE_ENCODINGS[key].labelLong)
            },
            'default': [],
            'markdownDescription': nls.localize('candidateGuessEncodings', "List of character set encodings that the editor should attempt to guess in the order they are listed. In case it cannot be determined, {0} is respected", '`#files.encoding#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.eol': {
            'type': 'string',
            'enum': [
                '\n',
                '\r\n',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize('eol.LF', "LF"),
                nls.localize('eol.CRLF', "CRLF"),
                nls.localize('eol.auto', "Uses operating system specific end of line character.")
            ],
            'default': 'auto',
            'description': nls.localize('eol', "The default end of line character."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.enableTrash': {
            'type': 'boolean',
            'default': true,
            'description': nls.localize('useTrash', "Moves files/folders to the OS trash (recycle bin on Windows) when deleting. Disabling this will delete files/folders permanently.")
        },
        'files.trimTrailingWhitespace': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize('trimTrailingWhitespace', "When enabled, will trim trailing whitespace when saving a file."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.trimTrailingWhitespaceInRegexAndStrings': {
            'type': 'boolean',
            'default': true,
            'description': nls.localize('trimTrailingWhitespaceInRegexAndStrings', "When enabled, trailing whitespace will be removed from multiline strings and regexes will be removed on save or when executing 'editor.action.trimTrailingWhitespace'. This can cause whitespace to not be trimmed from lines when there isn't up-to-date token information."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.insertFinalNewline': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize('insertFinalNewline', "When enabled, insert a final new line at the end of the file when saving it."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.trimFinalNewlines': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize('trimFinalNewlines', "When enabled, will trim all new lines after the final new line at the end of the file when saving it."),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.autoSave': {
            'type': 'string',
            'enum': [AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE],
            'markdownEnumDescriptions': [
                nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.off' }, "An editor with changes is never automatically saved."),
                nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.afterDelay' }, "An editor with changes is automatically saved after the configured `#files.autoSaveDelay#`."),
                nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.onFocusChange' }, "An editor with changes is automatically saved when the editor loses focus."),
                nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.onWindowChange' }, "An editor with changes is automatically saved when the window loses focus.")
            ],
            'default': isWeb ? AutoSaveConfiguration.AFTER_DELAY : AutoSaveConfiguration.OFF,
            'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'autoSave' }, "Controls [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors that have unsaved changes.", AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE, AutoSaveConfiguration.AFTER_DELAY),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveDelay': {
            'type': 'number',
            'default': 1000,
            'minimum': 0,
            'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'autoSaveDelay' }, "Controls the delay in milliseconds after which an editor with unsaved changes is saved automatically. Only applies when `#files.autoSave#` is set to `{0}`.", AutoSaveConfiguration.AFTER_DELAY),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveWorkspaceFilesOnly': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize('autoSaveWorkspaceFilesOnly', "When enabled, will limit [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors to files that are inside the opened workspace. Only applies when {0} is enabled.", '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveWhenNoErrors': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize('autoSaveWhenNoErrors', "When enabled, will limit [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors to files that have no errors reported in them at the time the auto save is triggered. Only applies when {0} is enabled.", '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.watcherExclude': {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': { '**/.git/objects/**': true, '**/.git/subtree-cache/**': true, '**/.hg/store/**': true },
            'markdownDescription': nls.localize('watcherExclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to exclude from file watching. Paths can either be relative to the watched folder or absolute. Glob patterns are matched relative from the watched folder. When you experience the file watcher process consuming a lot of CPU, make sure to exclude large folders that are of less interest (such as build output folders)."),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        'files.watcherInclude': {
            'type': 'array',
            'items': {
                'type': 'string'
            },
            'default': [],
            'description': nls.localize('watcherInclude', "Configure extra paths to watch for changes inside the workspace. By default, all workspace folders will be watched recursively, except for folders that are symbolic links. You can explicitly add absolute or relative paths to support watching folders that are symbolic links. Relative paths will be resolved to an absolute path using the currently opened workspace."),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        'files.hotExit': hotExitConfiguration,
        'files.defaultLanguage': {
            'type': 'string',
            'markdownDescription': nls.localize('defaultLanguage', "The default language identifier that is assigned to new files. If configured to `${activeEditorLanguage}`, will use the language identifier of the currently active text editor if any.")
        },
        [FILES_READONLY_INCLUDE_CONFIG]: {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': {},
            'markdownDescription': nls.localize('filesReadonlyInclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to mark as read-only. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. You can exclude matching paths via the `#files.readonlyExclude#` setting. Files from readonly file system providers will always be read-only independent of this setting."),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        [FILES_READONLY_EXCLUDE_CONFIG]: {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': {},
            'markdownDescription': nls.localize('filesReadonlyExclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to exclude from being marked as read-only if they match as a result of the `#files.readonlyInclude#` setting. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. Files from readonly file system providers will always be read-only independent of this setting."),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        [FILES_READONLY_FROM_PERMISSIONS_CONFIG]: {
            'type': 'boolean',
            'markdownDescription': nls.localize('filesReadonlyFromPermissions', "Marks files as read-only when their file permissions indicate as such. This can be overridden via `#files.readonlyInclude#` and `#files.readonlyExclude#` settings."),
            'default': false
        },
        'files.restoreUndoStack': {
            'type': 'boolean',
            'description': nls.localize('files.restoreUndoStack', "Restore the undo stack when a file is reopened."),
            'default': true
        },
        'files.saveConflictResolution': {
            'type': 'string',
            'enum': [
                'askUser',
                'overwriteFileOnDisk'
            ],
            'enumDescriptions': [
                nls.localize('askUser', "Will refuse to save and ask for resolving the save conflict manually."),
                nls.localize('overwriteFileOnDisk', "Will resolve the save conflict by overwriting the file on disk with the changes in the editor.")
            ],
            'description': nls.localize('files.saveConflictResolution', "A save conflict can occur when a file is saved to disk that was changed by another program in the meantime. To prevent data loss, the user is asked to compare the changes in the editor with the version on disk. This setting should only be changed if you frequently encounter save conflict errors and may result in data loss if used without caution."),
            'default': 'askUser',
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.dialog.defaultPath': {
            'type': 'string',
            'pattern': '^((\\/|\\\\\\\\|[a-zA-Z]:\\\\).*)?$', // slash OR UNC-root OR drive-root OR undefined
            'patternErrorMessage': nls.localize('defaultPathErrorMessage', "Default path for file dialogs must be an absolute path (e.g. C:\\\\myFolder or /myFolder)."),
            'description': nls.localize('fileDialogDefaultPath', "Default path for file dialogs, overriding user's home path. Only used in the absence of a context-specific path, such as most recently opened file or folder."),
            'scope': 2 /* ConfigurationScope.MACHINE */
        },
        'files.simpleDialog.enable': {
            'type': 'boolean',
            'description': nls.localize('files.simpleDialog.enable', "Enables the simple file dialog for opening and saving files and folders. The simple file dialog replaces the system file dialog when enabled."),
            'default': false
        },
        'files.participants.timeout': {
            type: 'number',
            default: 60000,
            markdownDescription: nls.localize('files.participants.timeout', "Timeout in milliseconds after which file participants for create, rename, and delete are cancelled. Use `0` to disable participants."),
        }
    }
});
configurationRegistry.registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.formatOnSave': {
            'type': 'boolean',
            'markdownDescription': nls.localize('formatOnSave', "Format a file on save. A formatter must be available and the editor must not be shutting down. When {0} is set to `afterDelay`, the file will only be formatted when saved explicitly.", '`#files.autoSave#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'editor.formatOnSaveMode': {
            'type': 'string',
            'default': 'file',
            'enum': [
                'file',
                'modifications',
                'modificationsIfAvailable'
            ],
            'enumDescriptions': [
                nls.localize({ key: 'everything', comment: ['This is the description of an option'] }, "Format the whole file."),
                nls.localize({ key: 'modification', comment: ['This is the description of an option'] }, "Format modifications (requires source control)."),
                nls.localize({ key: 'modificationIfAvailable', comment: ['This is the description of an option'] }, "Will attempt to format modifications only (requires source control). If source control can't be used, then the whole file will be formatted."),
            ],
            'markdownDescription': nls.localize('formatOnSaveMode', "Controls if format on save formats the whole file or only modifications. Only applies when `#editor.formatOnSave#` is enabled."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
    }
});
configurationRegistry.registerConfiguration({
    'id': 'explorer',
    'order': 10,
    'title': nls.localize('explorerConfigurationTitle', "File Explorer"),
    'type': 'object',
    'properties': {
        'explorer.openEditors.visible': {
            'type': 'number',
            'description': nls.localize({ key: 'openEditorsVisible', comment: ['Open is an adjective'] }, "The initial maximum number of editors shown in the Open Editors pane. Exceeding this limit will show a scroll bar and allow resizing the pane to display more items."),
            'default': 9,
            'minimum': 1
        },
        'explorer.openEditors.minVisible': {
            'type': 'number',
            'description': nls.localize({ key: 'openEditorsVisibleMin', comment: ['Open is an adjective'] }, "The minimum number of editor slots pre-allocated in the Open Editors pane. If set to 0 the Open Editors pane will dynamically resize based on the number of editors."),
            'default': 0,
            'minimum': 0
        },
        'explorer.openEditors.sortOrder': {
            'type': 'string',
            'enum': ['editorOrder', 'alphabetical', 'fullPath'],
            'description': nls.localize({ key: 'openEditorsSortOrder', comment: ['Open is an adjective'] }, "Controls the sorting order of editors in the Open Editors pane."),
            'enumDescriptions': [
                nls.localize('sortOrder.editorOrder', 'Editors are ordered in the same order editor tabs are shown.'),
                nls.localize('sortOrder.alphabetical', 'Editors are ordered alphabetically by tab name inside each editor group.'),
                nls.localize('sortOrder.fullPath', 'Editors are ordered alphabetically by full path inside each editor group.')
            ],
            'default': 'editorOrder'
        },
        'explorer.autoReveal': {
            'type': ['boolean', 'string'],
            'enum': [true, false, 'focusNoScroll'],
            'default': true,
            'enumDescriptions': [
                nls.localize('autoReveal.on', 'Files will be revealed and selected.'),
                nls.localize('autoReveal.off', 'Files will not be revealed and selected.'),
                nls.localize('autoReveal.focusNoScroll', 'Files will not be scrolled into view, but will still be focused.'),
            ],
            'description': nls.localize('autoReveal', "Controls whether the Explorer should automatically reveal and select files when opening them.")
        },
        'explorer.autoRevealExclude': {
            'type': 'object',
            'markdownDescription': nls.localize('autoRevealExclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files and folders from being revealed and selected in the Explorer when they are opened. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths."),
            'default': { '**/node_modules': true, '**/bower_components': true },
            'additionalProperties': {
                'anyOf': [
                    {
                        'type': 'boolean',
                        'description': nls.localize('explorer.autoRevealExclude.boolean', "The glob pattern to match file paths against. Set to true or false to enable or disable the pattern."),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                description: nls.localize('explorer.autoRevealExclude.when', 'Additional check on the siblings of a matching file. Use $(basename) as variable for the matching file name.')
                            }
                        }
                    }
                ]
            }
        },
        'explorer.enableDragAndDrop': {
            'type': 'boolean',
            'description': nls.localize('enableDragAndDrop', "Controls whether the Explorer should allow to move files and folders via drag and drop. This setting only effects drag and drop from inside the Explorer."),
            'default': true
        },
        'explorer.confirmDragAndDrop': {
            'type': 'boolean',
            'description': nls.localize('confirmDragAndDrop', "Controls whether the Explorer should ask for confirmation to move files and folders via drag and drop."),
            'default': true
        },
        'explorer.confirmPasteNative': {
            'type': 'boolean',
            'description': nls.localize('confirmPasteNative', "Controls whether the Explorer should ask for confirmation when pasting native files and folders."),
            'default': true
        },
        'explorer.confirmDelete': {
            'type': 'boolean',
            'description': nls.localize('confirmDelete', "Controls whether the Explorer should ask for confirmation when deleting a file via the trash."),
            'default': true
        },
        'explorer.enableUndo': {
            'type': 'boolean',
            'description': nls.localize('enableUndo', "Controls whether the Explorer should support undoing file and folder operations."),
            'default': true
        },
        'explorer.confirmUndo': {
            'type': 'string',
            'enum': ["verbose" /* UndoConfirmLevel.Verbose */, "default" /* UndoConfirmLevel.Default */, "light" /* UndoConfirmLevel.Light */],
            'description': nls.localize('confirmUndo', "Controls whether the Explorer should ask for confirmation when undoing."),
            'default': "default" /* UndoConfirmLevel.Default */,
            'enumDescriptions': [
                nls.localize('enableUndo.verbose', 'Explorer will prompt before all undo operations.'),
                nls.localize('enableUndo.default', 'Explorer will prompt before destructive undo operations.'),
                nls.localize('enableUndo.light', 'Explorer will not prompt before undo operations when focused.'),
            ],
        },
        'explorer.expandSingleFolderWorkspaces': {
            'type': 'boolean',
            'description': nls.localize('expandSingleFolderWorkspaces', "Controls whether the Explorer should expand multi-root workspaces containing only one folder during initialization"),
            'default': true
        },
        'explorer.sortOrder': {
            'type': 'string',
            'enum': ["default" /* SortOrder.Default */, "mixed" /* SortOrder.Mixed */, "filesFirst" /* SortOrder.FilesFirst */, "type" /* SortOrder.Type */, "modified" /* SortOrder.Modified */, "foldersNestsFiles" /* SortOrder.FoldersNestsFiles */],
            'default': "default" /* SortOrder.Default */,
            'enumDescriptions': [
                nls.localize('sortOrder.default', 'Files and folders are sorted by their names. Folders are displayed before files.'),
                nls.localize('sortOrder.mixed', 'Files and folders are sorted by their names. Files are interwoven with folders.'),
                nls.localize('sortOrder.filesFirst', 'Files and folders are sorted by their names. Files are displayed before folders.'),
                nls.localize('sortOrder.type', 'Files and folders are grouped by extension type then sorted by their names. Folders are displayed before files.'),
                nls.localize('sortOrder.modified', 'Files and folders are sorted by last modified date in descending order. Folders are displayed before files.'),
                nls.localize('sortOrder.foldersNestsFiles', 'Files and folders are sorted by their names. Folders are displayed before files. Files with nested children are displayed before other files.')
            ],
            'markdownDescription': nls.localize('sortOrder', "Controls the property-based sorting of files and folders in the Explorer. When `#explorer.fileNesting.enabled#` is enabled, also controls sorting of nested files.")
        },
        'explorer.sortOrderLexicographicOptions': {
            'type': 'string',
            'enum': ["default" /* LexicographicOptions.Default */, "upper" /* LexicographicOptions.Upper */, "lower" /* LexicographicOptions.Lower */, "unicode" /* LexicographicOptions.Unicode */],
            'default': "default" /* LexicographicOptions.Default */,
            'enumDescriptions': [
                nls.localize('sortOrderLexicographicOptions.default', 'Uppercase and lowercase names are mixed together.'),
                nls.localize('sortOrderLexicographicOptions.upper', 'Uppercase names are grouped together before lowercase names.'),
                nls.localize('sortOrderLexicographicOptions.lower', 'Lowercase names are grouped together before uppercase names.'),
                nls.localize('sortOrderLexicographicOptions.unicode', 'Names are sorted in Unicode order.')
            ],
            'description': nls.localize('sortOrderLexicographicOptions', "Controls the lexicographic sorting of file and folder names in the Explorer.")
        },
        'explorer.sortOrderReverse': {
            'type': 'boolean',
            'description': nls.localize('sortOrderReverse', "Controls whether the file and folder sort order, should be reversed."),
            'default': false,
        },
        'explorer.decorations.colors': {
            type: 'boolean',
            description: nls.localize('explorer.decorations.colors', "Controls whether file decorations should use colors."),
            default: true
        },
        'explorer.decorations.badges': {
            type: 'boolean',
            description: nls.localize('explorer.decorations.badges', "Controls whether file decorations should use badges."),
            default: true
        },
        'explorer.incrementalNaming': {
            'type': 'string',
            enum: ['simple', 'smart', 'disabled'],
            enumDescriptions: [
                nls.localize('simple', "Appends the word \"copy\" at the end of the duplicated name potentially followed by a number."),
                nls.localize('smart', "Adds a number at the end of the duplicated name. If some number is already part of the name, tries to increase that number."),
                nls.localize('disabled', "Disables incremental naming. If two files with the same name exist you will be prompted to overwrite the existing file.")
            ],
            description: nls.localize('explorer.incrementalNaming', "Controls which naming strategy to use when giving a new name to a duplicated Explorer item on paste."),
            default: 'simple'
        },
        'explorer.autoOpenDroppedFile': {
            'type': 'boolean',
            'description': nls.localize('autoOpenDroppedFile', "Controls whether the Explorer should automatically open a file when it is dropped into the explorer"),
            'default': true
        },
        'explorer.compactFolders': {
            'type': 'boolean',
            'description': nls.localize('compressSingleChildFolders', "Controls whether the Explorer should render folders in a compact form. In such a form, single child folders will be compressed in a combined tree element. Useful for Java package structures, for example."),
            'default': true
        },
        'explorer.copyRelativePathSeparator': {
            'type': 'string',
            'enum': [
                '/',
                '\\',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize('copyRelativePathSeparator.slash', "Use slash as path separation character."),
                nls.localize('copyRelativePathSeparator.backslash', "Use backslash as path separation character."),
                nls.localize('copyRelativePathSeparator.auto', "Uses operating system specific path separation character."),
            ],
            'description': nls.localize('copyRelativePathSeparator', "The path separation character used when copying relative file paths."),
            'default': 'auto'
        },
        'explorer.copyPathSeparator': {
            'type': 'string',
            'enum': [
                '/',
                '\\',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize('copyPathSeparator.slash', "Use slash as path separation character."),
                nls.localize('copyPathSeparator.backslash', "Use backslash as path separation character."),
                nls.localize('copyPathSeparator.auto', "Uses operating system specific path separation character."),
            ],
            'description': nls.localize('copyPathSeparator', "The path separation character used when copying file paths."),
            'default': 'auto'
        },
        'explorer.excludeGitIgnore': {
            type: 'boolean',
            markdownDescription: nls.localize('excludeGitignore', "Controls whether entries in .gitignore should be parsed and excluded from the Explorer. Similar to {0}.", '`#files.exclude#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'explorer.fileNesting.enabled': {
            'type': 'boolean',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            'markdownDescription': nls.localize('fileNestingEnabled', "Controls whether file nesting is enabled in the Explorer. File nesting allows for related files in a directory to be visually grouped together under a single parent file."),
            'default': false,
        },
        'explorer.fileNesting.expand': {
            'type': 'boolean',
            'markdownDescription': nls.localize('fileNestingExpand', "Controls whether file nests are automatically expanded. {0} must be set for this to take effect.", '`#explorer.fileNesting.enabled#`'),
            'default': true,
        },
        'explorer.fileNesting.patterns': {
            'type': 'object',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            'markdownDescription': nls.localize('fileNestingPatterns', "Controls nesting of files in the Explorer. {0} must be set for this to take effect. Each __Item__ represents a parent pattern and may contain a single `*` character that matches any string. Each __Value__ represents a comma separated list of the child patterns that should be shown nested under a given parent. Child patterns may contain several special tokens:\n- `${capture}`: Matches the resolved value of the `*` from the parent pattern\n- `${basename}`: Matches the parent file's basename, the `file` in `file.ts`\n- `${extname}`: Matches the parent file's extension, the `ts` in `file.ts`\n- `${dirname}`: Matches the parent file's directory name, the `src` in `src/file.ts`\n- `*`:  Matches any string, may only be used once per child pattern", '`#explorer.fileNesting.enabled#`'),
            patternProperties: {
                '^[^*]*\\*?[^*]*$': {
                    markdownDescription: nls.localize('fileNesting.description', "Each key pattern may contain a single `*` character which will match any string."),
                    type: 'string',
                    pattern: '^([^,*]*\\*?[^,*]*)(, ?[^,*]*\\*?[^,*]*)*$',
                }
            },
            additionalProperties: false,
            'default': {
                '*.ts': '${capture}.js',
                '*.js': '${capture}.js.map, ${capture}.min.js, ${capture}.d.ts',
                '*.jsx': '${capture}.js',
                '*.tsx': '${capture}.ts',
                'tsconfig.json': 'tsconfig.*.json',
                'package.json': 'package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb, bun.lock',
            }
        }
    }
});
UndoCommand.addImplementation(110, 'explorer', (accessor) => {
    const undoRedoService = accessor.get(IUndoRedoService);
    const explorerService = accessor.get(IExplorerService);
    const configurationService = accessor.get(IConfigurationService);
    const explorerCanUndo = configurationService.getValue().explorer.enableUndo;
    if (explorerService.hasViewFocus() && undoRedoService.canUndo(UNDO_REDO_SOURCE) && explorerCanUndo) {
        undoRedoService.undo(UNDO_REDO_SOURCE);
        return true;
    }
    return false;
});
RedoCommand.addImplementation(110, 'explorer', (accessor) => {
    const undoRedoService = accessor.get(IUndoRedoService);
    const explorerService = accessor.get(IExplorerService);
    const configurationService = accessor.get(IConfigurationService);
    const explorerCanUndo = configurationService.getValue().explorer.enableUndo;
    if (explorerService.hasViewFocus() && undoRedoService.canRedo(UNDO_REDO_SOURCE) && explorerCanUndo) {
        undoRedoService.redo(UNDO_REDO_SOURCE);
        return true;
    }
    return false;
});
ModesRegistry.registerLanguage({
    id: BINARY_TEXT_FILE_MODE,
    aliases: ['Binary'],
    mimetypes: ['text/x-code-binary']
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZmlsZXMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQTBCLFVBQVUsSUFBSSx1QkFBdUIsRUFBb0QsTUFBTSxvRUFBb0UsQ0FBQztBQUNyTSxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUE0QyxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSx5QkFBeUIsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hRLE9BQU8sRUFBbUMsb0JBQW9CLEVBQUUscUJBQXFCLEVBQXlDLE1BQU0sb0JBQW9CLENBQUM7QUFDekosT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWpFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSww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