/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
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
/**
 * Shadow Workspace Service
 *
 * Phase 0 primitive for the "shadow workspace" feature (see /SHADOW_WORKSPACE_DESIGN.md at the
 * repo root for the full design). This service owns creation and lifecycle of a per-chat-thread
 * temporary directory that mirrors the real workspace, so an agent can eventually read/write files
 * there instead of the user's real files, before any change is promoted.
 *
 * Deliberately out of scope for this pass (see design doc §6/§7):
 * - No wiring into toolsService.ts's edit_file/rewrite_file/create_file_or_folder/delete_file_or_folder.
 * - No UI surface (no chat-panel status, no diff promotion view).
 * - No type-checking/lint invocation against the shadow tree.
 * - No URI scheme/file-system-provider for the shadow tree; shadow files live under file:// at a
 *   real temp path, so every existing disk-based tool (tsserver, eslint, etc.) keeps working
 *   unmodified if/when phase 1 wires this up.
 *
 * This service is registered as a singleton but is not invoked from anywhere yet - adding it here
 * now is intentionally inert so phase 1 has a tested foundation instead of starting from nothing.
 */
import { tmpdir } from 'os';
import * as path from 'path';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { generateUuid } from '../../../../base/common/uuid.js';
export const IShadowWorkspaceService = createDecorator('shadowWorkspaceService');
const SHADOW_ROOT_FOLDER_NAME = 'ainative-shadow';
let ShadowWorkspaceService = class ShadowWorkspaceService extends Disposable {
    constructor(_fileService) {
        super();
        this._fileService = _fileService;
        // threadId -> mutable shadow workspace state
        this._shadowOfThreadId = new Map();
    }
    async createShadowForThread(threadId) {
        const existing = this._shadowOfThreadId.get(threadId);
        if (existing) {
            return this._toShadowWorkspace(threadId, existing);
        }
        const rootUri = URI.file(path.join(tmpdir(), SHADOW_ROOT_FOLDER_NAME, this._sanitizeForPath(threadId) + '-' + generateUuid().slice(0, 8)));
        await this._fileService.createFolder(rootUri);
        const state = { rootUri, syncedFsPaths: new Set() };
        this._shadowOfThreadId.set(threadId, state);
        return this._toShadowWorkspace(threadId, state);
    }
    getShadowForThread(threadId) {
        const state = this._shadowOfThreadId.get(threadId);
        return state ? this._toShadowWorkspace(threadId, state) : undefined;
    }
    shadowUriFor(threadId, workspaceRootUri, realFileUri) {
        const state = this._shadowOfThreadId.get(threadId);
        const rootUri = state?.rootUri ?? this._plannedRootUri(threadId);
        return this._mapToShadow(rootUri, workspaceRootUri, realFileUri);
    }
    async syncFileIntoShadow(threadId, workspaceRootUri, realFileUri, opts) {
        let state = this._shadowOfThreadId.get(threadId);
        if (!state) {
            await this.createShadowForThread(threadId);
            state = this._shadowOfThreadId.get(threadId);
        }
        const shadowUri = this._mapToShadow(state.rootUri, workspaceRootUri, realFileUri);
        const alreadySynced = state.syncedFsPaths.has(realFileUri.fsPath);
        if (!alreadySynced || opts?.force) {
            const exists = await this._fileService.exists(realFileUri);
            if (exists) {
                const content = await this._fileService.readFile(realFileUri);
                await this._fileService.writeFile(shadowUri, content.value);
            }
            // If the real file doesn't exist yet (e.g. the agent is about to create it), there's
            // nothing to copy - the shadow file simply won't exist until something writes to it.
            state.syncedFsPaths.add(realFileUri.fsPath);
        }
        return shadowUri;
    }
    async disposeShadow(threadId) {
        const state = this._shadowOfThreadId.get(threadId);
        if (!state)
            return;
        this._shadowOfThreadId.delete(threadId);
        try {
            await this._fileService.del(state.rootUri, { recursive: true, useTrash: false });
        }
        catch {
            // best-effort cleanup; an orphaned temp dir is not a correctness problem, just disk
            // space, and a future startup sweep (design doc §6, phase 2) is the backstop for this.
        }
    }
    dispose() {
        // Note: deliberately not deleting shadow directories here - dispose() of the service happens
        // on window/workbench shutdown, and we want shadow content to survive an IDE restart so a
        // crash mid-edit doesn't silently lose agent work-in-progress. Cleanup of orphaned shadow
        // dirs on startup is a phase-2 concern (design doc §4/§6), not this service's dispose path.
        super.dispose();
    }
    _toShadowWorkspace(threadId, state) {
        return { threadId, rootUri: state.rootUri, syncedFsPaths: state.syncedFsPaths };
    }
    _plannedRootUri(threadId) {
        // Used only by shadowUriFor() when called before createShadowForThread() - the returned URI
        // won't exist on disk yet, but the path mapping is still useful for callers that just want
        // to know "where would this file go".
        return URI.file(path.join(tmpdir(), SHADOW_ROOT_FOLDER_NAME, this._sanitizeForPath(threadId)));
    }
    _mapToShadow(shadowRootUri, workspaceRootUri, realFileUri) {
        const relative = path.relative(workspaceRootUri.fsPath, realFileUri.fsPath);
        if (relative.startsWith('..')) {
            throw new Error(`ShadowWorkspaceService: file ${realFileUri.fsPath} is not inside workspace root ${workspaceRootUri.fsPath}`);
        }
        return URI.file(path.join(shadowRootUri.fsPath, path.basename(workspaceRootUri.fsPath), relative));
    }
    _sanitizeForPath(threadId) {
        return threadId.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
};
ShadowWorkspaceService = __decorate([
    __param(0, IFileService)
], ShadowWorkspaceService);
export { ShadowWorkspaceService };
registerSingleton(IShadowWorkspaceService, ShadowWorkspaceService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhZG93V29ya3NwYWNlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NoYWRvd1dvcmtzcGFjZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEc7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUVILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUEwQix3QkFBd0IsQ0FBQyxDQUFDO0FBaUQxRyxNQUFNLHVCQUF1QixHQUFHLGlCQUFpQixDQUFDO0FBRTNDLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQU1yRCxZQUNlLFlBQTJDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBRnVCLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBSjFELDZDQUE2QztRQUM1QixzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBd0QsQ0FBQztJQU1yRyxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLFFBQWdCO1FBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLHVCQUF1QixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLEdBQUcsWUFBWSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0ksTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU5QyxNQUFNLEtBQUssR0FBRyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxHQUFHLEVBQVUsRUFBRSxDQUFDO1FBQzVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBZ0I7UUFDbEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxZQUFZLENBQUMsUUFBZ0IsRUFBRSxnQkFBcUIsRUFBRSxXQUFnQjtRQUNyRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxPQUFPLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNqRSxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBZ0IsRUFBRSxnQkFBcUIsRUFBRSxXQUFnQixFQUFFLElBQTBCO1FBQzdHLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0MsS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFFLENBQUM7UUFDL0MsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbEUsSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDbkMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMzRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzlELE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3RCxDQUFDO1lBQ0QscUZBQXFGO1lBQ3JGLHFGQUFxRjtZQUNyRixLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQWdCO1FBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPO1FBRW5CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNsRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1Isb0ZBQW9GO1lBQ3BGLHVGQUF1RjtRQUN4RixDQUFDO0lBQ0YsQ0FBQztJQUVRLE9BQU87UUFDZiw2RkFBNkY7UUFDN0YsMEZBQTBGO1FBQzFGLDBGQUEwRjtRQUMxRiw0RkFBNEY7UUFDNUYsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLEtBQW1EO1FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNqRixDQUFDO0lBRU8sZUFBZSxDQUFDLFFBQWdCO1FBQ3ZDLDRGQUE0RjtRQUM1RiwyRkFBMkY7UUFDM0Ysc0NBQXNDO1FBQ3RDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLHVCQUF1QixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVPLFlBQVksQ0FBQyxhQUFrQixFQUFFLGdCQUFxQixFQUFFLFdBQWdCO1FBQy9FLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RSxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxXQUFXLENBQUMsTUFBTSxpQ0FBaUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUMvSCxDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDcEcsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFFBQWdCO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqRCxDQUFDO0NBQ0QsQ0FBQTtBQXhHWSxzQkFBc0I7SUFPaEMsV0FBQSxZQUFZLENBQUE7R0FQRixzQkFBc0IsQ0F3R2xDOztBQUVELGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLHNCQUFzQixvQ0FBNEIsQ0FBQyJ9