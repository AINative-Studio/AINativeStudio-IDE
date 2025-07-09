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
import { asPromise } from '../../../base/common/async.js';
import { debounce } from '../../../base/common/decorators.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import * as languages from '../../../editor/common/languages.js';
import { ExtensionIdentifierMap } from '../../../platform/extensions/common/extensions.js';
import * as extHostTypeConverter from './extHostTypeConverters.js';
import * as types from './extHostTypes.js';
import { MainContext } from './extHost.protocol.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
export function createExtHostComments(mainContext, commands, documents) {
    const proxy = mainContext.getProxy(MainContext.MainThreadComments);
    class ExtHostCommentsImpl {
        static { this.handlePool = 0; }
        constructor() {
            this._commentControllers = new Map();
            this._commentControllersByExtension = new ExtensionIdentifierMap();
            commands.registerArgumentProcessor({
                processArgument: arg => {
                    if (arg && arg.$mid === 6 /* MarshalledId.CommentController */) {
                        const commentController = this._commentControllers.get(arg.handle);
                        if (!commentController) {
                            return arg;
                        }
                        return commentController.value;
                    }
                    else if (arg && arg.$mid === 7 /* MarshalledId.CommentThread */) {
                        const marshalledCommentThread = arg;
                        const commentController = this._commentControllers.get(marshalledCommentThread.commentControlHandle);
                        if (!commentController) {
                            return marshalledCommentThread;
                        }
                        const commentThread = commentController.getCommentThread(marshalledCommentThread.commentThreadHandle);
                        if (!commentThread) {
                            return marshalledCommentThread;
                        }
                        return commentThread.value;
                    }
                    else if (arg && (arg.$mid === 9 /* MarshalledId.CommentThreadReply */ || arg.$mid === 8 /* MarshalledId.CommentThreadInstance */)) {
                        const commentController = this._commentControllers.get(arg.thread.commentControlHandle);
                        if (!commentController) {
                            return arg;
                        }
                        const commentThread = commentController.getCommentThread(arg.thread.commentThreadHandle);
                        if (!commentThread) {
                            return arg;
                        }
                        if (arg.$mid === 8 /* MarshalledId.CommentThreadInstance */) {
                            return commentThread.value;
                        }
                        return {
                            thread: commentThread.value,
                            text: arg.text
                        };
                    }
                    else if (arg && arg.$mid === 10 /* MarshalledId.CommentNode */) {
                        const commentController = this._commentControllers.get(arg.thread.commentControlHandle);
                        if (!commentController) {
                            return arg;
                        }
                        const commentThread = commentController.getCommentThread(arg.thread.commentThreadHandle);
                        if (!commentThread) {
                            return arg;
                        }
                        const commentUniqueId = arg.commentUniqueId;
                        const comment = commentThread.getCommentByUniqueId(commentUniqueId);
                        if (!comment) {
                            return arg;
                        }
                        return comment;
                    }
                    else if (arg && arg.$mid === 11 /* MarshalledId.CommentThreadNode */) {
                        const commentController = this._commentControllers.get(arg.thread.commentControlHandle);
                        if (!commentController) {
                            return arg;
                        }
                        const commentThread = commentController.getCommentThread(arg.thread.commentThreadHandle);
                        if (!commentThread) {
                            return arg;
                        }
                        const body = arg.text;
                        const commentUniqueId = arg.commentUniqueId;
                        const comment = commentThread.getCommentByUniqueId(commentUniqueId);
                        if (!comment) {
                            return arg;
                        }
                        // If the old comment body was a markdown string, use a markdown string here too.
                        if (typeof comment.body === 'string') {
                            comment.body = body;
                        }
                        else {
                            comment.body = new types.MarkdownString(body);
                        }
                        return comment;
                    }
                    return arg;
                }
            });
        }
        createCommentController(extension, id, label) {
            const handle = ExtHostCommentsImpl.handlePool++;
            const commentController = new ExtHostCommentController(extension, handle, id, label);
            this._commentControllers.set(commentController.handle, commentController);
            const commentControllers = this._commentControllersByExtension.get(extension.identifier) || [];
            commentControllers.push(commentController);
            this._commentControllersByExtension.set(extension.identifier, commentControllers);
            return commentController.value;
        }
        async $createCommentThreadTemplate(commentControllerHandle, uriComponents, range, editorId) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            if (!commentController) {
                return;
            }
            commentController.$createCommentThreadTemplate(uriComponents, range, editorId);
        }
        async $setActiveComment(controllerHandle, commentInfo) {
            const commentController = this._commentControllers.get(controllerHandle);
            if (!commentController) {
                return;
            }
            commentController.$setActiveComment(commentInfo ?? undefined);
        }
        async $updateCommentThreadTemplate(commentControllerHandle, threadHandle, range) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            if (!commentController) {
                return;
            }
            commentController.$updateCommentThreadTemplate(threadHandle, range);
        }
        $deleteCommentThread(commentControllerHandle, commentThreadHandle) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            commentController?.$deleteCommentThread(commentThreadHandle);
        }
        async $updateCommentThread(commentControllerHandle, commentThreadHandle, changes) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            commentController?.$updateCommentThread(commentThreadHandle, changes);
        }
        async $provideCommentingRanges(commentControllerHandle, uriComponents, token) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            if (!commentController || !commentController.commentingRangeProvider) {
                return Promise.resolve(undefined);
            }
            const document = await documents.ensureDocumentData(URI.revive(uriComponents));
            return asPromise(async () => {
                const rangesResult = await commentController.commentingRangeProvider?.provideCommentingRanges(document.document, token);
                let ranges;
                if (Array.isArray(rangesResult)) {
                    ranges = {
                        ranges: rangesResult,
                        fileComments: false
                    };
                }
                else if (rangesResult) {
                    ranges = {
                        ranges: rangesResult.ranges || [],
                        fileComments: rangesResult.enableFileComments || false
                    };
                }
                else {
                    ranges = rangesResult ?? undefined;
                }
                return ranges;
            }).then(ranges => {
                let convertedResult = undefined;
                if (ranges) {
                    convertedResult = {
                        ranges: ranges.ranges.map(x => extHostTypeConverter.Range.from(x)),
                        fileComments: ranges.fileComments
                    };
                }
                return convertedResult;
            });
        }
        $toggleReaction(commentControllerHandle, threadHandle, uri, comment, reaction) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            if (!commentController || !commentController.reactionHandler) {
                return Promise.resolve(undefined);
            }
            return asPromise(() => {
                const commentThread = commentController.getCommentThread(threadHandle);
                if (commentThread) {
                    const vscodeComment = commentThread.getCommentByUniqueId(comment.uniqueIdInThread);
                    if (commentController !== undefined && vscodeComment) {
                        if (commentController.reactionHandler) {
                            return commentController.reactionHandler(vscodeComment, convertFromReaction(reaction));
                        }
                    }
                }
                return Promise.resolve(undefined);
            });
        }
    }
    class ExtHostCommentThread {
        static { this._handlePool = 0; }
        set threadId(id) {
            this._id = id;
        }
        get threadId() {
            return this._id;
        }
        get id() {
            return this._id;
        }
        get resource() {
            return this._uri;
        }
        get uri() {
            return this._uri;
        }
        set range(range) {
            if (((range === undefined) !== (this._range === undefined)) || (!range || !this._range || !range.isEqual(this._range))) {
                this._range = range;
                this.modifications.range = range;
                this._onDidUpdateCommentThread.fire();
            }
        }
        get range() {
            return this._range;
        }
        set canReply(state) {
            if (this._canReply !== state) {
                this._canReply = state;
                this.modifications.canReply = state;
                this._onDidUpdateCommentThread.fire();
            }
        }
        get canReply() {
            return this._canReply;
        }
        get label() {
            return this._label;
        }
        set label(label) {
            this._label = label;
            this.modifications.label = label;
            this._onDidUpdateCommentThread.fire();
        }
        get contextValue() {
            return this._contextValue;
        }
        set contextValue(context) {
            this._contextValue = context;
            this.modifications.contextValue = context;
            this._onDidUpdateCommentThread.fire();
        }
        get comments() {
            return this._comments;
        }
        set comments(newComments) {
            this._comments = newComments;
            this.modifications.comments = newComments;
            this._onDidUpdateCommentThread.fire();
        }
        get collapsibleState() {
            return this._collapseState;
        }
        set collapsibleState(newState) {
            if (this._collapseState === newState) {
                return;
            }
            this._collapseState = newState;
            this.modifications.collapsibleState = newState;
            this._onDidUpdateCommentThread.fire();
        }
        get state() {
            return this._state;
        }
        set state(newState) {
            this._state = newState;
            if (typeof newState === 'object') {
                checkProposedApiEnabled(this.extensionDescription, 'commentThreadApplicability');
                this.modifications.state = newState.resolved;
                this.modifications.applicability = newState.applicability;
            }
            else {
                this.modifications.state = newState;
            }
            this._onDidUpdateCommentThread.fire();
        }
        get isDisposed() {
            return this._isDiposed;
        }
        constructor(commentControllerId, _commentControllerHandle, _id, _uri, _range, _comments, extensionDescription, _isTemplate, editorId) {
            this._commentControllerHandle = _commentControllerHandle;
            this._id = _id;
            this._uri = _uri;
            this._range = _range;
            this._comments = _comments;
            this.extensionDescription = extensionDescription;
            this._isTemplate = _isTemplate;
            this.handle = ExtHostCommentThread._handlePool++;
            this.commentHandle = 0;
            this.modifications = Object.create(null);
            this._onDidUpdateCommentThread = new Emitter();
            this.onDidUpdateCommentThread = this._onDidUpdateCommentThread.event;
            this._canReply = true;
            this._commentsMap = new Map();
            this._acceptInputDisposables = new MutableDisposable();
            this._acceptInputDisposables.value = new DisposableStore();
            if (this._id === undefined) {
                this._id = `${commentControllerId}.${this.handle}`;
            }
            proxy.$createCommentThread(_commentControllerHandle, this.handle, this._id, this._uri, extHostTypeConverter.Range.from(this._range), this._comments.map(cmt => convertToDTOComment(this, cmt, this._commentsMap, this.extensionDescription)), extensionDescription.identifier, this._isTemplate, editorId);
            this._localDisposables = [];
            this._isDiposed = false;
            this._localDisposables.push(this.onDidUpdateCommentThread(() => {
                this.eventuallyUpdateCommentThread();
            }));
            this._localDisposables.push({
                dispose: () => {
                    proxy.$deleteCommentThread(_commentControllerHandle, this.handle);
                }
            });
            const that = this;
            this.value = {
                get uri() { return that.uri; },
                get range() { return that.range; },
                set range(value) { that.range = value; },
                get comments() { return that.comments; },
                set comments(value) { that.comments = value; },
                get collapsibleState() { return that.collapsibleState; },
                set collapsibleState(value) { that.collapsibleState = value; },
                get canReply() { return that.canReply; },
                set canReply(state) { that.canReply = state; },
                get contextValue() { return that.contextValue; },
                set contextValue(value) { that.contextValue = value; },
                get label() { return that.label; },
                set label(value) { that.label = value; },
                get state() { return that.state; },
                set state(value) { that.state = value; },
                reveal: (comment, options) => that.reveal(comment, options),
                hide: () => that.hide(),
                dispose: () => {
                    that.dispose();
                }
            };
        }
        updateIsTemplate() {
            if (this._isTemplate) {
                this._isTemplate = false;
                this.modifications.isTemplate = false;
            }
        }
        eventuallyUpdateCommentThread() {
            if (this._isDiposed) {
                return;
            }
            this.updateIsTemplate();
            if (!this._acceptInputDisposables.value) {
                this._acceptInputDisposables.value = new DisposableStore();
            }
            const modified = (value) => Object.prototype.hasOwnProperty.call(this.modifications, value);
            const formattedModifications = {};
            if (modified('range')) {
                formattedModifications.range = extHostTypeConverter.Range.from(this._range);
            }
            if (modified('label')) {
                formattedModifications.label = this.label;
            }
            if (modified('contextValue')) {
                /*
                 * null -> cleared contextValue
                 * undefined -> no change
                 */
                formattedModifications.contextValue = this.contextValue ?? null;
            }
            if (modified('comments')) {
                formattedModifications.comments =
                    this._comments.map(cmt => convertToDTOComment(this, cmt, this._commentsMap, this.extensionDescription));
            }
            if (modified('collapsibleState')) {
                formattedModifications.collapseState = convertToCollapsibleState(this._collapseState);
            }
            if (modified('canReply')) {
                formattedModifications.canReply = this.canReply;
            }
            if (modified('state')) {
                formattedModifications.state = convertToState(this._state);
            }
            if (modified('applicability')) {
                formattedModifications.applicability = convertToRelevance(this._state);
            }
            if (modified('isTemplate')) {
                formattedModifications.isTemplate = this._isTemplate;
            }
            this.modifications = {};
            proxy.$updateCommentThread(this._commentControllerHandle, this.handle, this._id, this._uri, formattedModifications);
        }
        getCommentByUniqueId(uniqueId) {
            for (const key of this._commentsMap) {
                const comment = key[0];
                const id = key[1];
                if (uniqueId === id) {
                    return comment;
                }
            }
            return;
        }
        async reveal(commentOrOptions, options) {
            checkProposedApiEnabled(this.extensionDescription, 'commentReveal');
            let comment;
            if (commentOrOptions && commentOrOptions.body !== undefined) {
                comment = commentOrOptions;
            }
            else {
                options = options ?? commentOrOptions;
            }
            let commentToReveal = comment ? this._commentsMap.get(comment) : undefined;
            commentToReveal ??= this._commentsMap.get(this._comments[0]);
            let preserveFocus = true;
            let focusReply = false;
            if (options?.focus === types.CommentThreadFocus.Reply) {
                focusReply = true;
                preserveFocus = false;
            }
            else if (options?.focus === types.CommentThreadFocus.Comment) {
                preserveFocus = false;
            }
            return proxy.$revealCommentThread(this._commentControllerHandle, this.handle, commentToReveal, { preserveFocus, focusReply });
        }
        async hide() {
            return proxy.$hideCommentThread(this._commentControllerHandle, this.handle);
        }
        dispose() {
            this._isDiposed = true;
            this._acceptInputDisposables.dispose();
            this._localDisposables.forEach(disposable => disposable.dispose());
        }
    }
    __decorate([
        debounce(100)
    ], ExtHostCommentThread.prototype, "eventuallyUpdateCommentThread", null);
    class ExtHostCommentController {
        get id() {
            return this._id;
        }
        get label() {
            return this._label;
        }
        get handle() {
            return this._handle;
        }
        get commentingRangeProvider() {
            return this._commentingRangeProvider;
        }
        set commentingRangeProvider(provider) {
            this._commentingRangeProvider = provider;
            if (provider?.resourceHints) {
                checkProposedApiEnabled(this._extension, 'commentingRangeHint');
            }
            proxy.$updateCommentingRanges(this.handle, provider?.resourceHints);
        }
        get reactionHandler() {
            return this._reactionHandler;
        }
        set reactionHandler(handler) {
            this._reactionHandler = handler;
            proxy.$updateCommentControllerFeatures(this.handle, { reactionHandler: !!handler });
        }
        get options() {
            return this._options;
        }
        set options(options) {
            this._options = options;
            proxy.$updateCommentControllerFeatures(this.handle, { options: this._options });
        }
        get activeComment() {
            checkProposedApiEnabled(this._extension, 'activeComment');
            return this._activeComment;
        }
        get activeCommentThread() {
            checkProposedApiEnabled(this._extension, 'activeComment');
            return this._activeThread?.value;
        }
        constructor(_extension, _handle, _id, _label) {
            this._extension = _extension;
            this._handle = _handle;
            this._id = _id;
            this._label = _label;
            this._threads = new Map();
            proxy.$registerCommentController(this.handle, _id, _label, this._extension.identifier.value);
            const that = this;
            this.value = Object.freeze({
                id: that.id,
                label: that.label,
                get options() { return that.options; },
                set options(options) { that.options = options; },
                get commentingRangeProvider() { return that.commentingRangeProvider; },
                set commentingRangeProvider(commentingRangeProvider) { that.commentingRangeProvider = commentingRangeProvider; },
                get reactionHandler() { return that.reactionHandler; },
                set reactionHandler(handler) { that.reactionHandler = handler; },
                // get activeComment(): vscode.Comment | undefined { return that.activeComment; },
                get activeCommentThread() { return that.activeCommentThread; },
                createCommentThread(uri, range, comments) {
                    return that.createCommentThread(uri, range, comments).value;
                },
                dispose: () => { that.dispose(); },
            }); // TODO @alexr00 remove this cast when the proposed API is stable
            this._localDisposables = [];
            this._localDisposables.push({
                dispose: () => {
                    proxy.$unregisterCommentController(this.handle);
                }
            });
        }
        createCommentThread(resource, range, comments) {
            const commentThread = new ExtHostCommentThread(this.id, this.handle, undefined, resource, range, comments, this._extension, false);
            this._threads.set(commentThread.handle, commentThread);
            return commentThread;
        }
        $setActiveComment(commentInfo) {
            if (!commentInfo) {
                this._activeComment = undefined;
                this._activeThread = undefined;
                return;
            }
            const thread = this._threads.get(commentInfo.commentThreadHandle);
            if (thread) {
                this._activeComment = commentInfo.uniqueIdInThread ? thread.getCommentByUniqueId(commentInfo.uniqueIdInThread) : undefined;
                this._activeThread = thread;
            }
        }
        $createCommentThreadTemplate(uriComponents, range, editorId) {
            const commentThread = new ExtHostCommentThread(this.id, this.handle, undefined, URI.revive(uriComponents), extHostTypeConverter.Range.to(range), [], this._extension, true, editorId);
            commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Expanded;
            this._threads.set(commentThread.handle, commentThread);
            return commentThread;
        }
        $updateCommentThreadTemplate(threadHandle, range) {
            const thread = this._threads.get(threadHandle);
            if (thread) {
                thread.range = extHostTypeConverter.Range.to(range);
            }
        }
        $updateCommentThread(threadHandle, changes) {
            const thread = this._threads.get(threadHandle);
            if (!thread) {
                return;
            }
            const modified = (value) => Object.prototype.hasOwnProperty.call(changes, value);
            if (modified('collapseState')) {
                thread.collapsibleState = convertToCollapsibleState(changes.collapseState);
            }
        }
        $deleteCommentThread(threadHandle) {
            const thread = this._threads.get(threadHandle);
            thread?.dispose();
            this._threads.delete(threadHandle);
        }
        getCommentThread(handle) {
            return this._threads.get(handle);
        }
        dispose() {
            this._threads.forEach(value => {
                value.dispose();
            });
            this._localDisposables.forEach(disposable => disposable.dispose());
        }
    }
    function convertToDTOComment(thread, vscodeComment, commentsMap, extension) {
        let commentUniqueId = commentsMap.get(vscodeComment);
        if (!commentUniqueId) {
            commentUniqueId = ++thread.commentHandle;
            commentsMap.set(vscodeComment, commentUniqueId);
        }
        if (vscodeComment.state !== undefined) {
            checkProposedApiEnabled(extension, 'commentsDraftState');
        }
        if (vscodeComment.reactions?.some(reaction => reaction.reactors !== undefined)) {
            checkProposedApiEnabled(extension, 'commentReactor');
        }
        return {
            mode: vscodeComment.mode,
            contextValue: vscodeComment.contextValue,
            uniqueIdInThread: commentUniqueId,
            body: (typeof vscodeComment.body === 'string') ? vscodeComment.body : extHostTypeConverter.MarkdownString.from(vscodeComment.body),
            userName: vscodeComment.author.name,
            userIconPath: vscodeComment.author.iconPath,
            label: vscodeComment.label,
            commentReactions: vscodeComment.reactions ? vscodeComment.reactions.map(reaction => convertToReaction(reaction)) : undefined,
            state: vscodeComment.state,
            timestamp: vscodeComment.timestamp?.toJSON()
        };
    }
    function convertToReaction(reaction) {
        return {
            label: reaction.label,
            iconPath: reaction.iconPath ? extHostTypeConverter.pathOrURIToURI(reaction.iconPath) : undefined,
            count: reaction.count,
            hasReacted: reaction.authorHasReacted,
            reactors: ((reaction.reactors && (reaction.reactors.length > 0) && (typeof reaction.reactors[0] !== 'string')) ? reaction.reactors.map(reactor => reactor.name) : reaction.reactors)
        };
    }
    function convertFromReaction(reaction) {
        return {
            label: reaction.label || '',
            count: reaction.count || 0,
            iconPath: reaction.iconPath ? URI.revive(reaction.iconPath) : '',
            authorHasReacted: reaction.hasReacted || false,
            reactors: reaction.reactors?.map(reactor => ({ name: reactor }))
        };
    }
    function convertToCollapsibleState(kind) {
        if (kind !== undefined) {
            switch (kind) {
                case types.CommentThreadCollapsibleState.Expanded:
                    return languages.CommentThreadCollapsibleState.Expanded;
                case types.CommentThreadCollapsibleState.Collapsed:
                    return languages.CommentThreadCollapsibleState.Collapsed;
            }
        }
        return languages.CommentThreadCollapsibleState.Collapsed;
    }
    function convertToState(kind) {
        let resolvedKind;
        if (typeof kind === 'object') {
            resolvedKind = kind.resolved;
        }
        else {
            resolvedKind = kind;
        }
        if (resolvedKind !== undefined) {
            switch (resolvedKind) {
                case types.CommentThreadState.Unresolved:
                    return languages.CommentThreadState.Unresolved;
                case types.CommentThreadState.Resolved:
                    return languages.CommentThreadState.Resolved;
            }
        }
        return languages.CommentThreadState.Unresolved;
    }
    function convertToRelevance(kind) {
        let applicabilityKind = undefined;
        if (typeof kind === 'object') {
            applicabilityKind = kind.applicability;
        }
        if (applicabilityKind !== undefined) {
            switch (applicabilityKind) {
                case types.CommentThreadApplicability.Current:
                    return languages.CommentThreadApplicability.Current;
                case types.CommentThreadApplicability.Outdated:
                    return languages.CommentThreadApplicability.Outdated;
            }
        }
        return languages.CommentThreadApplicability.Current;
    }
    return new ExtHostCommentsImpl();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDb21tZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFdkYsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUVqRSxPQUFPLEtBQUssU0FBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUVsSCxPQUFPLEtBQUssb0JBQW9CLE1BQU0sNEJBQTRCLENBQUM7QUFDbkUsT0FBTyxLQUFLLEtBQUssTUFBTSxtQkFBbUIsQ0FBQztBQUUzQyxPQUFPLEVBQXNDLFdBQVcsRUFBd0MsTUFBTSx1QkFBdUIsQ0FBQztBQUU5SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQVN6RixNQUFNLFVBQVUscUJBQXFCLENBQUMsV0FBeUIsRUFBRSxRQUF5QixFQUFFLFNBQTJCO0lBQ3RILE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFFbkUsTUFBTSxtQkFBbUI7aUJBRVQsZUFBVSxHQUFHLENBQUMsQUFBSixDQUFLO1FBUTlCO1lBTFEsd0JBQW1CLEdBQWtELElB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