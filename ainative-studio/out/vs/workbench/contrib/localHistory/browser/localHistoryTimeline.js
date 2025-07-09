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
var LocalHistoryTimeline_1;
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ITimelineService } from '../../timeline/common/timeline.js';
import { IWorkingCopyHistoryService } from '../../../services/workingCopy/common/workingCopyHistory.js';
import { URI } from '../../../../base/common/uri.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { LocalHistoryFileSystemProvider } from './localHistoryFileSystemProvider.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { COMPARE_WITH_FILE_LABEL, toDiffEditorArguments } from './localHistoryCommands.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { getLocalHistoryDateFormatter, LOCAL_HISTORY_ICON_ENTRY, LOCAL_HISTORY_MENU_CONTEXT_VALUE } from './localHistory.js';
import { Schemas } from '../../../../base/common/network.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { getVirtualWorkspaceAuthority } from '../../../../platform/workspace/common/virtualWorkspace.js';
let LocalHistoryTimeline = class LocalHistoryTimeline extends Disposable {
    static { LocalHistoryTimeline_1 = this; }
    static { this.ID = 'workbench.contrib.localHistoryTimeline'; }
    static { this.LOCAL_HISTORY_ENABLED_SETTINGS_KEY = 'workbench.localHistory.enabled'; }
    constructor(timelineService, workingCopyHistoryService, pathService, fileService, environmentService, configurationService, contextService) {
        super();
        this.timelineService = timelineService;
        this.workingCopyHistoryService = workingCopyHistoryService;
        this.pathService = pathService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.id = 'timeline.localHistory';
        this.label = localize('localHistory', "Local History");
        this.scheme = '*'; // we try to show local history for all schemes if possible
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.timelineProviderDisposable = this._register(new MutableDisposable());
        this.registerComponents();
        this.registerListeners();
    }
    registerComponents() {
        // Timeline (if enabled)
        this.updateTimelineRegistration();
        // File Service Provider
        this._register(this.fileService.registerProvider(LocalHistoryFileSystemProvider.SCHEMA, new LocalHistoryFileSystemProvider(this.fileService)));
    }
    updateTimelineRegistration() {
        if (this.configurationService.getValue(LocalHistoryTimeline_1.LOCAL_HISTORY_ENABLED_SETTINGS_KEY)) {
            this.timelineProviderDisposable.value = this.timelineService.registerTimelineProvider(this);
        }
        else {
            this.timelineProviderDisposable.clear();
        }
    }
    registerListeners() {
        // History changes
        this._register(this.workingCopyHistoryService.onDidAddEntry(e => this.onDidChangeWorkingCopyHistoryEntry(e.entry)));
        this._register(this.workingCopyHistoryService.onDidChangeEntry(e => this.onDidChangeWorkingCopyHistoryEntry(e.entry)));
        this._register(this.workingCopyHistoryService.onDidReplaceEntry(e => this.onDidChangeWorkingCopyHistoryEntry(e.entry)));
        this._register(this.workingCopyHistoryService.onDidRemoveEntry(e => this.onDidChangeWorkingCopyHistoryEntry(e.entry)));
        this._register(this.workingCopyHistoryService.onDidRemoveEntries(() => this.onDidChangeWorkingCopyHistoryEntry(undefined /* all entries */)));
        this._register(this.workingCopyHistoryService.onDidMoveEntries(() => this.onDidChangeWorkingCopyHistoryEntry(undefined /* all entries */)));
        // Configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(LocalHistoryTimeline_1.LOCAL_HISTORY_ENABLED_SETTINGS_KEY)) {
                this.updateTimelineRegistration();
            }
        }));
    }
    onDidChangeWorkingCopyHistoryEntry(entry) {
        // Re-emit as timeline change event
        this._onDidChange.fire({
            id: this.id,
            uri: entry?.workingCopy.resource,
            reset: true // there is no other way to indicate that items might have been replaced/removed
        });
    }
    async provideTimeline(uri, options, token) {
        const items = [];
        // Try to convert the provided `uri` into a form that is likely
        // for the provider to find entries for so that we can ensure
        // the timeline is always providing local history entries
        let resource = undefined;
        if (uri.scheme === LocalHistoryFileSystemProvider.SCHEMA) {
            // `vscode-local-history`: convert back to the associated resource
            resource = LocalHistoryFileSystemProvider.fromLocalHistoryFileSystem(uri).associatedResource;
        }
        else if (uri.scheme === this.pathService.defaultUriScheme || uri.scheme === Schemas.vscodeUserData) {
            // default-scheme / settings: keep as is
            resource = uri;
        }
        else if (this.fileService.hasProvider(uri)) {
            // anything that is backed by a file system provider:
            // try best to convert the URI back into a form that is
            // likely to match the workspace URIs. That means:
            // - change to the default URI scheme
            // - change to the remote authority or virtual workspace authority
            // - preserve the path
            resource = URI.from({
                scheme: this.pathService.defaultUriScheme,
                authority: this.environmentService.remoteAuthority ?? getVirtualWorkspaceAuthority(this.contextService.getWorkspace()),
                path: uri.path
            });
        }
        if (resource) {
            // Retrieve from working copy history
            const entries = await this.workingCopyHistoryService.getEntries(resource, token);
            // Convert to timeline items
            for (const entry of entries) {
                items.push(this.toTimelineItem(entry));
            }
        }
        return {
            source: this.id,
            items
        };
    }
    toTimelineItem(entry) {
        return {
            handle: entry.id,
            label: SaveSourceRegistry.getSourceLabel(entry.source),
            tooltip: new MarkdownString(`$(history) ${getLocalHistoryDateFormatter().format(entry.timestamp)}\n\n${SaveSourceRegistry.getSourceLabel(entry.source)}${entry.sourceDescription ? ` (${entry.sourceDescription})` : ``}`, { supportThemeIcons: true }),
            source: this.id,
            timestamp: entry.timestamp,
            themeIcon: LOCAL_HISTORY_ICON_ENTRY,
            contextValue: LOCAL_HISTORY_MENU_CONTEXT_VALUE,
            command: {
                id: API_OPEN_DIFF_EDITOR_COMMAND_ID,
                title: COMPARE_WITH_FILE_LABEL.value,
                arguments: toDiffEditorArguments(entry, entry.workingCopy.resource)
            }
        };
    }
};
LocalHistoryTimeline = LocalHistoryTimeline_1 = __decorate([
    __param(0, ITimelineService),
    __param(1, IWorkingCopyHistoryService),
    __param(2, IPathService),
    __param(3, IFileService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IConfigurationService),
    __param(6, IWorkspaceContextService)
], LocalHistoryTimeline);
export { LocalHistoryTimeline };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5VGltZWxpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxIaXN0b3J5L2Jyb3dzZXIvbG9jYWxIaXN0b3J5VGltZWxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXJGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBa0YsTUFBTSxtQ0FBbUMsQ0FBQztBQUNySixPQUFPLEVBQTRCLDBCQUEwQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEksT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFD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