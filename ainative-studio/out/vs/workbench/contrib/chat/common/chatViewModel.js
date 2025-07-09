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
import { Emitter } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { annotateVulnerabilitiesInText } from './annotations.js';
import { getFullyQualifiedId, IChatAgentNameService } from './chatAgents.js';
import { ChatModelInitState } from './chatModel.js';
import { countWords } from './chatWordCounter.js';
export function isRequestVM(item) {
    return !!item && typeof item === 'object' && 'message' in item;
}
export function isResponseVM(item) {
    return !!item && typeof item.setVote !== 'undefined';
}
let ChatViewModel = class ChatViewModel extends Disposable {
    get inputPlaceholder() {
        return this._inputPlaceholder;
    }
    get model() {
        return this._model;
    }
    setInputPlaceholder(text) {
        this._inputPlaceholder = text;
        this._onDidChange.fire({ kind: 'changePlaceholder' });
    }
    resetInputPlaceholder() {
        this._inputPlaceholder = undefined;
        this._onDidChange.fire({ kind: 'changePlaceholder' });
    }
    get sessionId() {
        return this._model.sessionId;
    }
    get requestInProgress() {
        return this._model.requestInProgress;
    }
    get requestPausibility() {
        return this._model.requestPausibility;
    }
    get initState() {
        return this._model.initState;
    }
    constructor(_model, codeBlockModelCollection, instantiationService) {
        super();
        this._model = _model;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.instantiationService = instantiationService;
        this._onDidDisposeModel = this._register(new Emitter());
        this.onDidDisposeModel = this._onDidDisposeModel.event;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._items = [];
        this._inputPlaceholder = undefined;
        _model.getRequests().forEach((request, i) => {
            const requestModel = this.instantiationService.createInstance(ChatRequestViewModel, request);
            this._items.push(requestModel);
            this.updateCodeBlockTextModels(requestModel);
            if (request.response) {
                this.onAddResponse(request.response);
            }
        });
        this._register(_model.onDidDispose(() => this._onDidDisposeModel.fire()));
        this._register(_model.onDidChange(e => {
            if (e.kind === 'addRequest') {
                const requestModel = this.instantiationService.createInstance(ChatRequestViewModel, e.request);
                this._items.push(requestModel);
                this.updateCodeBlockTextModels(requestModel);
                if (e.request.response) {
                    this.onAddResponse(e.request.response);
                }
            }
            else if (e.kind === 'addResponse') {
                this.onAddResponse(e.response);
            }
            else if (e.kind === 'removeRequest') {
                const requestIdx = this._items.findIndex(item => isRequestVM(item) && item.id === e.requestId);
                if (requestIdx >= 0) {
                    this._items.splice(requestIdx, 1);
                }
                const responseIdx = e.responseId && this._items.findIndex(item => isResponseVM(item) && item.id === e.responseId);
                if (typeof responseIdx === 'number' && responseIdx >= 0) {
                    const items = this._items.splice(responseIdx, 1);
                    const item = items[0];
                    if (item instanceof ChatResponseViewModel) {
                        item.dispose();
                    }
                }
            }
            const modelEventToVmEvent = e.kind === 'addRequest' ? { kind: 'addRequest' }
                : e.kind === 'initialize' ? { kind: 'initialize' }
                    : e.kind === 'setHidden' ? { kind: 'setHidden' }
                        : null;
            this._onDidChange.fire(modelEventToVmEvent);
        }));
    }
    onAddResponse(responseModel) {
        const response = this.instantiationService.createInstance(ChatResponseViewModel, responseModel, this);
        this._register(response.onDidChange(() => {
            if (response.isComplete) {
                this.updateCodeBlockTextModels(response);
            }
            return this._onDidChange.fire(null);
        }));
        this._items.push(response);
        this.updateCodeBlockTextModels(response);
    }
    getItems() {
        return this._items.filter((item) => !item.shouldBeRemovedOnSend || item.shouldBeRemovedOnSend.afterUndoStop);
    }
    dispose() {
        super.dispose();
        dispose(this._items.filter((item) => item instanceof ChatResponseViewModel));
    }
    updateCodeBlockTextModels(model) {
        let content;
        if (isRequestVM(model)) {
            content = model.messageText;
        }
        else {
            content = annotateVulnerabilitiesInText(model.response.value).map(x => x.content.value).join('');
        }
        let codeBlockIndex = 0;
        marked.walkTokens(marked.lexer(content), token => {
            if (token.type === 'code') {
                const lang = token.lang || '';
                const text = token.text;
                this.codeBlockModelCollection.update(this._model.sessionId, model, codeBlockIndex++, { text, languageId: lang, isComplete: true });
            }
        });
    }
};
ChatViewModel = __decorate([
    __param(2, IInstantiationService)
], ChatViewModel);
export { ChatViewModel };
export class ChatRequestViewModel {
    get id() {
        return this._model.id;
    }
    get dataId() {
        return this.id + `_${ChatModelInitState[this._model.session.initState]}_${hash(this.variables)}_${hash(this.isComplete)}`;
    }
    get sessionId() {
        return this._model.session.sessionId;
    }
    get username() {
        return this._model.username;
    }
    get avatarIcon() {
        return this._model.avatarIconUri;
    }
    get message() {
        return this._model.message;
    }
    get messageText() {
        return this.message.text;
    }
    get attempt() {
        return this._model.attempt;
    }
    get variables() {
        return this._model.variableData.variables;
    }
    get contentReferences() {
        return this._model.response?.contentReferences;
    }
    get confirmation() {
        return this._model.confirmation;
    }
    get isComplete() {
        return this._model.response?.isComplete ?? false;
    }
    get isCompleteAddedRequest() {
        return this._model.isCompleteAddedRequest;
    }
    get shouldBeRemovedOnSend() {
        return this._model.shouldBeRemovedOnSend;
    }
    get slashCommand() {
        return this._model.response?.slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._model.response?.agentOrSlashCommandDetected ?? false;
    }
    constructor(_model) {
        this._model = _model;
    }
}
let ChatResponseViewModel = class ChatResponseViewModel extends Disposable {
    get model() {
        return this._model;
    }
    get id() {
        return this._model.id;
    }
    get dataId() {
        return this._model.id +
            `_${this._modelChangeCount}` +
            `_${ChatModelInitState[this._model.session.initState]}` +
            (this.isLast ? '_last' : '');
    }
    get sessionId() {
        return this._model.session.sessionId;
    }
    get username() {
        if (this.agent) {
            const isAllowed = this.chatAgentNameService.getAgentNameRestriction(this.agent);
            if (isAllowed) {
                return this.agent.fullName || this.agent.name;
            }
            else {
                return getFullyQualifiedId(this.agent);
            }
        }
        return this._model.username;
    }
    get avatarIcon() {
        return this._model.avatarIcon;
    }
    get agent() {
        return this._model.agent;
    }
    get slashCommand() {
        return this._model.slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._model.agentOrSlashCommandDetected;
    }
    get response() {
        return this._model.response;
    }
    get usedContext() {
        return this._model.usedContext;
    }
    get contentReferences() {
        return this._model.contentReferences;
    }
    get codeCitations() {
        return this._model.codeCitations;
    }
    get progressMessages() {
        return this._model.progressMessages;
    }
    get isComplete() {
        return this._model.isComplete;
    }
    get isCanceled() {
        return this._model.isCanceled;
    }
    get shouldBeRemovedOnSend() {
        return this._model.shouldBeRemovedOnSend;
    }
    get isCompleteAddedRequest() {
        return this._model.isCompleteAddedRequest;
    }
    get replyFollowups() {
        return this._model.followups?.filter((f) => f.kind === 'reply');
    }
    get result() {
        return this._model.result;
    }
    get errorDetails() {
        return this.result?.errorDetails;
    }
    get vote() {
        return this._model.vote;
    }
    get voteDownReason() {
        return this._model.voteDownReason;
    }
    get requestId() {
        return this._model.requestId;
    }
    get isStale() {
        return this._model.isStale;
    }
    get isLast() {
        return this._chatViewModel.getItems().at(-1) === this;
    }
    get usedReferencesExpanded() {
        if (typeof this._usedReferencesExpanded === 'boolean') {
            return this._usedReferencesExpanded;
        }
        return undefined;
    }
    set usedReferencesExpanded(v) {
        this._usedReferencesExpanded = v;
    }
    get vulnerabilitiesListExpanded() {
        return this._vulnerabilitiesListExpanded;
    }
    set vulnerabilitiesListExpanded(v) {
        this._vulnerabilitiesListExpanded = v;
    }
    get contentUpdateTimings() {
        return this._contentUpdateTimings;
    }
    get isPaused() {
        return this._model.isPaused;
    }
    constructor(_model, _chatViewModel, logService, chatAgentNameService) {
        super();
        this._model = _model;
        this._chatViewModel = _chatViewModel;
        this.logService = logService;
        this.chatAgentNameService = chatAgentNameService;
        this._modelChangeCount = 0;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.renderData = undefined;
        this._vulnerabilitiesListExpanded = false;
        this._contentUpdateTimings = undefined;
        if (!_model.isComplete) {
            this._contentUpdateTimings = {
                totalTime: 0,
                lastUpdateTime: Date.now(),
                impliedWordLoadRate: 0,
                lastWordCount: 0,
            };
        }
        this._register(_model.onDidChange(() => {
            // This is set when the response is loading, but the model can change later for other reasons
            if (this._contentUpdateTimings) {
                const now = Date.now();
                const wordCount = countWords(_model.entireResponse.getMarkdown());
                if (wordCount === this._contentUpdateTimings.lastWordCount) {
                    this.trace('onDidChange', `Update- no new words`);
                }
                else {
                    if (this._contentUpdateTimings.lastWordCount === 0) {
                        this._contentUpdateTimings.lastUpdateTime = now;
                    }
                    const timeDiff = Math.min(now - this._contentUpdateTimings.lastUpdateTime, 1000);
                    const newTotalTime = Math.max(this._contentUpdateTimings.totalTime + timeDiff, 250);
                    const impliedWordLoadRate = wordCount / (newTotalTime / 1000);
                    this.trace('onDidChange', `Update- got ${wordCount} words over last ${newTotalTime}ms = ${impliedWordLoadRate} words/s`);
                    this._contentUpdateTimings = {
                        totalTime: this._contentUpdateTimings.totalTime !== 0 || this.response.value.some(v => v.kind === 'markdownContent') ?
                            newTotalTime :
                            this._contentUpdateTimings.totalTime,
                        lastUpdateTime: now,
                        impliedWordLoadRate,
                        lastWordCount: wordCount
                    };
                }
            }
            // new data -> new id, new content to render
            this._modelChangeCount++;
            this._onDidChange.fire();
        }));
    }
    trace(tag, message) {
        this.logService.trace(`ChatResponseViewModel#${tag}: ${message}`);
    }
    setVote(vote) {
        this._modelChangeCount++;
        this._model.setVote(vote);
    }
    setVoteDownReason(reason) {
        this._modelChangeCount++;
        this._model.setVoteDownReason(reason);
    }
    setEditApplied(edit, editCount) {
        this._modelChangeCount++;
        this._model.setEditApplied(edit, editCount);
    }
};
ChatResponseViewModel = __decorate([
    __param(2, ILogService),
    __param(3, IChatAgentNameService)
], ChatResponseViewModel);
export { ChatResponseViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0Vmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRSxPQUFPLEtBQUssTUFBTSxNQUFNLDBDQUEwQyxDQUFDO0FBSW5FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQXFDLHFCQUFxQixFQUFvQixNQUFNLGlCQUFpQixDQUFDO0FBQ2xJLE9BQU8sRUFBRSxrQkFBa0IsRUFBZ00sTUFBTSxnQkFBZ0IsQ0FBQztBQUdsUCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHbEQsTUFBTSxVQUFVLFdBQVcsQ0FBQyxJQUFhO0lBQ3hDLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksU0FBUyxJQUFJLElBQUksQ0FBQztBQUNoRSxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxJQUFhO0lBQ3pDLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxPQUFRLElBQStCLENBQUMsT0FBTyxLQUFLLFdBQVcsQ0FB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