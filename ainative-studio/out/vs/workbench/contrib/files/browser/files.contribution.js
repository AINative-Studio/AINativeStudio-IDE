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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2ZpbGVzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQW9ELE1BQU0sb0VBQW9FLENBQUM7QUFDck0sT0FBTyxFQUEwQyw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFILE9BQU8sRUFBNEMsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUseUJBQXlCLEVBQUUsNkJBQTZCLEVBQUUsNkJBQTZCLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoUSxPQUFPLEVBQW1DLG9CQUFvQixFQUFFLHFCQUFxQixFQUF5QyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1B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