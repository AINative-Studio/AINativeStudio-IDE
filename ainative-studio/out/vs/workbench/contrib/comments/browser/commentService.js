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
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CommentMenus } from './commentMenus.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CommentsModel } from './commentsModel.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Schemas } from '../../../../base/common/network.js';
export const ICommentService = createDecorator('commentService');
const CONTINUE_ON_COMMENTS = 'comments.continueOnComments';
let CommentService = class CommentService extends Disposable {
    constructor(instantiationService, layoutService, configurationService, contextKeyService, storageService, logService, modelService) {
        super();
        this.instantiationService = instantiationService;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.storageService = storageService;
        this.logService = logService;
        this.modelService = modelService;
        this._onDidSetDataProvider = this._register(new Emitter());
        this.onDidSetDataProvider = this._onDidSetDataProvider.event;
        this._onDidDeleteDataProvider = this._register(new Emitter());
        this.onDidDeleteDataProvider = this._onDidDeleteDataProvider.event;
        this._onDidSetResourceCommentInfos = this._register(new Emitter());
        this.onDidSetResourceCommentInfos = this._onDidSetResourceCommentInfos.event;
        this._onDidSetAllCommentThreads = this._register(new Emitter());
        this.onDidSetAllCommentThreads = this._onDidSetAllCommentThreads.event;
        this._onDidUpdateCommentThreads = this._register(new Emitter());
        this.onDidUpdateCommentThreads = this._onDidUpdateCommentThreads.event;
        this._onDidUpdateNotebookCommentThreads = this._register(new Emitter());
        this.onDidUpdateNotebookCommentThreads = this._onDidUpdateNotebookCommentThreads.event;
        this._onDidUpdateCommentingRanges = this._register(new Emitter());
        this.onDidUpdateCommentingRanges = this._onDidUpdateCommentingRanges.event;
        this._onDidChangeActiveEditingCommentThread = this._register(new Emitter());
        this.onDidChangeActiveEditingCommentThread = this._onDidChangeActiveEditingCommentThread.event;
        this._onDidChangeCurrentCommentThread = this._register(new Emitter());
        this.onDidChangeCurrentCommentThread = this._onDidChangeCurrentCommentThread.event;
        this._onDidChangeCommentingEnabled = this._register(new Emitter());
        this.onDidChangeCommentingEnabled = this._onDidChangeCommentingEnabled.event;
        this._onResourceHasCommentingRanges = this._register(new Emitter());
        this.onResourceHasCommentingRanges = this._onResourceHasCommentingRanges.event;
        this._onDidChangeActiveCommentingRange = this._register(new Emitter());
        this.onDidChangeActiveCommentingRange = this._onDidChangeActiveCommentingRange.event;
        this._commentControls = new Map();
        this._commentMenus = new Map();
        this._isCommentingEnabled = true;
        this._continueOnComments = new Map(); // uniqueOwner -> PendingCommentThread[]
        this._continueOnCommentProviders = new Set();
        this._commentsModel = this._register(new CommentsModel());
        this.commentsModel = this._commentsModel;
        this._commentingRangeResources = new Set(); // URIs
        this._commentingRangeResourceHintSchemes = new Set(); // schemes
        this._handleConfiguration();
        this._handleZenMode();
        this._workspaceHasCommenting = CommentContextKeys.WorkspaceHasCommenting.bindTo(contextKeyService);
        this._commentingEnabled = CommentContextKeys.commentingEnabled.bindTo(contextKeyService);
        const storageListener = this._register(new DisposableStore());
        const storageEvent = Event.debounce(this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, CONTINUE_ON_COMMENTS, storageListener), (last, event) => last?.external ? last : event, 500);
        storageListener.add(storageEvent(v => {
            if (!v.external) {
                return;
            }
            const commentsToRestore = this.storageService.getObject(CONTINUE_ON_COMMENTS, 1 /* StorageScope.WORKSPACE */);
            if (!commentsToRestore) {
                return;
            }
            this.logService.debug(`Comments: URIs of continue on comments from storage ${commentsToRestore.map(thread => thread.uri.toString()).join(', ')}.`);
            const changedOwners = this._addContinueOnComments(commentsToRestore, this._continueOnComments);
            for (const uniqueOwner of changedOwners) {
                const control = this._commentControls.get(uniqueOwner);
                if (!control) {
                    continue;
                }
                const evt = {
                    uniqueOwner: uniqueOwner,
                    owner: control.owner,
                    ownerLabel: control.label,
                    pending: this._continueOnComments.get(uniqueOwner) || [],
                    added: [],
                    removed: [],
                    changed: []
                };
                this.updateModelThreads(evt);
            }
        }));
        this._register(storageService.onWillSaveState(() => {
            const map = new Map();
            for (const provider of this._continueOnCommentProviders) {
                const pendingComments = provider.provideContinueOnComments();
                this._addContinueOnComments(pendingComments, map);
            }
            this._saveContinueOnComments(map);
        }));
        this._register(this.modelService.onModelAdded(model => {
            // Excluded schemes
            if ((model.uri.scheme === Schemas.vscodeSourceControl)) {
                return;
            }
            // Allows comment providers to cause their commenting ranges to be prefetched by opening text documents in the background.
            if (!this._commentingRangeResources.has(model.uri.toString())) {
                this.getDocumentComments(model.uri);
            }
        }));
    }
    _updateResourcesWithCommentingRanges(resource, commentInfos) {
        let addedResources = false;
        for (const comments of commentInfos) {
            if (comments && (comments.commentingRanges.ranges.length > 0 || comments.threads.length > 0)) {
                this._commentingRangeResources.add(resource.toString());
                addedResources = true;
            }
        }
        if (addedResources) {
            this._onResourceHasCommentingRanges.fire();
        }
    }
    _handleConfiguration() {
        this._isCommentingEnabled = this._defaultCommentingEnablement;
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('comments.visible')) {
                this.enableCommenting(this._defaultCommentingEnablement);
            }
        }));
    }
    _handleZenMode() {
        let preZenModeValue = this._isCommentingEnabled;
        this._register(this.layoutService.onDidChangeZenMode(e => {
            if (e) {
                preZenModeValue = this._isCommentingEnabled;
                this.enableCommenting(false);
            }
            else {
                this.enableCommenting(preZenModeValue);
            }
        }));
    }
    get _defaultCommentingEnablement() {
        return !!this.configurationService.getValue(COMMENTS_SECTION)?.visible;
    }
    get isCommentingEnabled() {
        return this._isCommentingEnabled;
    }
    enableCommenting(enable) {
        if (enable !== this._isCommentingEnabled) {
            this._isCommentingEnabled = enable;
            this._commentingEnabled.set(enable);
            this._onDidChangeCommentingEnabled.fire(enable);
        }
    }
    /**
     * The current comment thread is the thread that has focus or is being hovered.
     * @param commentThread
     */
    setCurrentCommentThread(commentThread) {
        this._onDidChangeCurrentCommentThread.fire(commentThread);
    }
    /**
     * The active comment thread is the thread that is currently being edited.
     * @param commentThread
     */
    setActiveEditingCommentThread(commentThread) {
        this._onDidChangeActiveEditingCommentThread.fire(commentThread);
    }
    get lastActiveCommentcontroller() {
        return this._lastActiveCommentController;
    }
    async setActiveCommentAndThread(uniqueOwner, commentInfo) {
        const commentController = this._commentControls.get(uniqueOwner);
        if (!commentController) {
            return;
        }
        if (commentController !== this._lastActiveCommentController) {
            await this._lastActiveCommentController?.setActiveCommentAndThread(undefined);
        }
        this._lastActiveCommentController = commentController;
        return commentController.setActiveCommentAndThread(commentInfo);
    }
    setDocumentComments(resource, commentInfos) {
        this._onDidSetResourceCommentInfos.fire({ resource, commentInfos });
    }
    setModelThreads(ownerId, owner, ownerLabel, commentThreads) {
        this._commentsModel.setCommentThreads(ownerId, owner, ownerLabel, commentThreads);
        this._onDidSetAllCommentThreads.fire({ ownerId, ownerLabel, commentThreads });
    }
    updateModelThreads(event) {
        this._commentsModel.updateCommentThreads(event);
        this._onDidUpdateCommentThreads.fire(event);
    }
    setWorkspaceComments(uniqueOwner, commentsByResource) {
        if (commentsByResource.length) {
            this._workspaceHasCommenting.set(true);
        }
        const control = this._commentControls.get(uniqueOwner);
        if (control) {
            this.setModelThreads(uniqueOwner, control.owner, control.label, commentsByResource);
        }
    }
    removeWorkspaceComments(uniqueOwner) {
        const control = this._commentControls.get(uniqueOwner);
        if (control) {
            this.setModelThreads(uniqueOwner, control.owner, control.label, []);
        }
    }
    registerCommentController(uniqueOwner, commentControl) {
        this._commentControls.set(uniqueOwner, commentControl);
        this._onDidSetDataProvider.fire();
    }
    unregisterCommentController(uniqueOwner) {
        if (uniqueOwner) {
            this._commentControls.delete(uniqueOwner);
        }
        else {
            this._commentControls.clear();
        }
        this._commentsModel.deleteCommentsByOwner(uniqueOwner);
        this._onDidDeleteDataProvider.fire(uniqueOwner);
    }
    getCommentController(uniqueOwner) {
        return this._commentControls.get(uniqueOwner);
    }
    async createCommentThreadTemplate(uniqueOwner, resource, range, editorId) {
        const commentController = this._commentControls.get(uniqueOwner);
        if (!commentController) {
            return;
        }
        return commentController.createCommentThreadTemplate(resource, range, editorId);
    }
    async updateCommentThreadTemplate(uniqueOwner, threadHandle, range) {
        const commentController = this._commentControls.get(uniqueOwner);
        if (!commentController) {
            return;
        }
        await commentController.updateCommentThreadTemplate(threadHandle, range);
    }
    disposeCommentThread(uniqueOwner, threadId) {
        const controller = this.getCommentController(uniqueOwner);
        controller?.deleteCommentThreadMain(threadId);
    }
    getCommentMenus(uniqueOwner) {
        if (this._commentMenus.get(uniqueOwner)) {
            return this._commentMenus.get(uniqueOwner);
        }
        const menu = this.instantiationService.createInstance(CommentMenus);
        this._commentMenus.set(uniqueOwner, menu);
        return menu;
    }
    updateComments(ownerId, event) {
        const control = this._commentControls.get(ownerId);
        if (control) {
            const evt = Object.assign({}, event, { uniqueOwner: ownerId, ownerLabel: control.label, owner: control.owner });
            this.updateModelThreads(evt);
        }
    }
    updateNotebookComments(ownerId, event) {
        const evt = Object.assign({}, event, { uniqueOwner: ownerId });
        this._onDidUpdateNotebookCommentThreads.fire(evt);
    }
    updateCommentingRanges(ownerId, resourceHints) {
        if (resourceHints?.schemes && resourceHints.schemes.length > 0) {
            for (const scheme of resourceHints.schemes) {
                this._commentingRangeResourceHintSchemes.add(scheme);
            }
        }
        this._workspaceHasCommenting.set(true);
        this._onDidUpdateCommentingRanges.fire({ uniqueOwner: ownerId });
    }
    async toggleReaction(uniqueOwner, resource, thread, comment, reaction) {
        const commentController = this._commentControls.get(uniqueOwner);
        if (commentController) {
            return commentController.toggleReaction(resource, thread, comment, reaction, CancellationToken.None);
        }
        else {
            throw new Error('Not supported');
        }
    }
    hasReactionHandler(uniqueOwner) {
        const commentProvider = this._commentControls.get(uniqueOwner);
        if (commentProvider) {
            return !!commentProvider.features.reactionHandler;
        }
        return false;
    }
    async getDocumentComments(resource) {
        const commentControlResult = [];
        for (const control of this._commentControls.values()) {
            commentControlResult.push(control.getDocumentComments(resource, CancellationToken.None)
                .then(documentComments => {
                // Check that there aren't any continue on comments in the provided comments
                // This can happen because continue on comments are stored separately from local un-submitted comments.
                for (const documentCommentThread of documentComments.threads) {
                    if (documentCommentThread.comments?.length === 0 && documentCommentThread.range) {
                        this.removeContinueOnComment({ range: documentCommentThread.range, uri: resource, uniqueOwner: documentComments.uniqueOwner });
                    }
                }
                const pendingComments = this._continueOnComments.get(documentComments.uniqueOwner);
                documentComments.pendingCommentThreads = pendingComments?.filter(pendingComment => pendingComment.uri.toString() === resource.toString());
                return documentComments;
            })
                .catch(_ => {
                return null;
            }));
        }
        const commentInfos = await Promise.all(commentControlResult);
        this._updateResourcesWithCommentingRanges(resource, commentInfos);
        return commentInfos;
    }
    async getNotebookComments(resource) {
        const commentControlResult = [];
        this._commentControls.forEach(control => {
            commentControlResult.push(control.getNotebookComments(resource, CancellationToken.None)
                .catch(_ => {
                return null;
            }));
        });
        return Promise.all(commentControlResult);
    }
    registerContinueOnCommentProvider(provider) {
        this._continueOnCommentProviders.add(provider);
        return {
            dispose: () => {
                this._continueOnCommentProviders.delete(provider);
            }
        };
    }
    _saveContinueOnComments(map) {
        const commentsToSave = [];
        for (const pendingComments of map.values()) {
            commentsToSave.push(...pendingComments);
        }
        this.logService.debug(`Comments: URIs of continue on comments to add to storage ${commentsToSave.map(thread => thread.uri.toString()).join(', ')}.`);
        this.storageService.store(CONTINUE_ON_COMMENTS, commentsToSave, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    removeContinueOnComment(pendingComment) {
        const pendingComments = this._continueOnComments.get(pendingComment.uniqueOwner);
        if (pendingComments) {
            const commentIndex = pendingComments.findIndex(comment => comment.uri.toString() === pendingComment.uri.toString() && Range.equalsRange(comment.range, pendingComment.range) && (pendingComment.isReply === undefined || comment.isReply === pendingComment.isReply));
            if (commentIndex > -1) {
                return pendingComments.splice(commentIndex, 1)[0];
            }
        }
        return undefined;
    }
    _addContinueOnComments(pendingComments, map) {
        const changedOwners = new Set();
        for (const pendingComment of pendingComments) {
            if (!map.has(pendingComment.uniqueOwner)) {
                map.set(pendingComment.uniqueOwner, [pendingComment]);
                changedOwners.add(pendingComment.uniqueOwner);
            }
            else {
                const commentsForOwner = map.get(pendingComment.uniqueOwner);
                if (commentsForOwner.every(comment => (comment.uri.toString() !== pendingComment.uri.toString()) || !Range.equalsRange(comment.range, pendingComment.range))) {
                    commentsForOwner.push(pendingComment);
                    changedOwners.add(pendingComment.uniqueOwner);
                }
            }
        }
        return changedOwners;
    }
    resourceHasCommentingRanges(resource) {
        return this._commentingRangeResourceHintSchemes.has(resource.scheme) || this._commentingRangeResources.has(resource.toString());
    }
};
CommentService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkbenchLayoutService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, IStorageService),
    __param(5, ILogService),
    __param(6, IModelService)
], CommentService);
export { CommentService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEgsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQVUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFakQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLG9DQUFvQyxDQUFDO0FBQzlGLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQWtCLE1BQU0sb0JBQW9CLENBQUM7QUFDbkUsT0FBTyxFQUFF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