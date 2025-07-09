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
var ChatModel_1;
import { asArray } from '../../../../base/common/arrays.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { equals } from '../../../../base/common/objects.js';
import { ObservablePromise, observableValue } from '../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../base/common/resources.js';
import { URI, isUriComponents } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { OffsetRange } from '../../../../editor/common/core/offsetRange.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { IChatAgentService, reviveSerializedAgent } from './chatAgents.js';
import { IChatEditingService } from './chatEditingService.js';
import { ChatRequestTextPart, reviveParsedChatRequest } from './chatParserTypes.js';
import { isIUsedContext } from './chatService.js';
import { ChatAgentLocation } from './constants.js';
export var IDiagnosticVariableEntryFilterData;
(function (IDiagnosticVariableEntryFilterData) {
    IDiagnosticVariableEntryFilterData.icon = Codicon.error;
    function fromMarker(marker) {
        return {
            filterUri: marker.resource,
            owner: marker.owner,
            problemMessage: marker.message,
            filterRange: { startLineNumber: marker.startLineNumber, endLineNumber: marker.endLineNumber, startColumn: marker.startColumn, endColumn: marker.endColumn }
        };
    }
    IDiagnosticVariableEntryFilterData.fromMarker = fromMarker;
    function toEntry(data) {
        return {
            id: id(data),
            name: label(data),
            icon: IDiagnosticVariableEntryFilterData.icon,
            value: data,
            kind: 'diagnostic',
            range: data.filterRange ? new OffsetRange(data.filterRange.startLineNumber, data.filterRange.endLineNumber) : undefined,
            ...data,
        };
    }
    IDiagnosticVariableEntryFilterData.toEntry = toEntry;
    function id(data) {
        return [data.filterUri, data.owner, data.filterSeverity, data.filterRange?.startLineNumber].join(':');
    }
    IDiagnosticVariableEntryFilterData.id = id;
    function label(data) {
        let TrimThreshold;
        (function (TrimThreshold) {
            TrimThreshold[TrimThreshold["MaxChars"] = 30] = "MaxChars";
            TrimThreshold[TrimThreshold["MaxSpaceLookback"] = 10] = "MaxSpaceLookback";
        })(TrimThreshold || (TrimThreshold = {}));
        if (data.problemMessage) {
            if (data.problemMessage.length < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage;
            }
            // Trim the message, on a space if it would not lose too much
            // data (MaxSpaceLookback) or just blindly otherwise.
            const lastSpace = data.problemMessage.lastIndexOf(' ', 30 /* TrimThreshold.MaxChars */);
            if (lastSpace === -1 || lastSpace + 10 /* TrimThreshold.MaxSpaceLookback */ < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage.substring(0, 30 /* TrimThreshold.MaxChars */) + '…';
            }
            return data.problemMessage.substring(0, lastSpace) + '…';
        }
        let labelStr = localize('chat.attachment.problems.all', "All Problems");
        if (data.filterUri) {
            labelStr = localize('chat.attachment.problems.inFile', "Problems in {0}", basename(data.filterUri));
        }
        return labelStr;
    }
    IDiagnosticVariableEntryFilterData.label = label;
})(IDiagnosticVariableEntryFilterData || (IDiagnosticVariableEntryFilterData = {}));
export function isImplicitVariableEntry(obj) {
    return obj.kind === 'implicit';
}
export function isPasteVariableEntry(obj) {
    return obj.kind === 'paste';
}
export function isImageVariableEntry(obj) {
    return obj.kind === 'image';
}
export function isDiagnosticsVariableEntry(obj) {
    return obj.kind === 'diagnostic';
}
export function isChatRequestVariableEntry(obj) {
    const entry = obj;
    return typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string';
}
export function isCellTextEditOperation(value) {
    const candidate = value;
    return !!candidate && !!candidate.edit && !!candidate.uri && URI.isUri(candidate.uri);
}
const nonHistoryKinds = new Set(['toolInvocation', 'toolInvocationSerialized']);
function isChatProgressHistoryResponseContent(content) {
    return !nonHistoryKinds.has(content.kind);
}
export function toChatHistoryContent(content) {
    return content.filter(isChatProgressHistoryResponseContent);
}
const defaultChatResponseModelChangeReason = { reason: 'other' };
export class ChatRequestModel {
    get session() {
        return this._session;
    }
    get username() {
        return this.session.requesterUsername;
    }
    get avatarIconUri() {
        return this.session.requesterAvatarIconUri;
    }
    get attempt() {
        return this._attempt;
    }
    get variableData() {
        return this._variableData;
    }
    set variableData(v) {
        this._variableData = v;
    }
    get confirmation() {
        return this._confirmation;
    }
    get locationData() {
        return this._locationData;
    }
    get attachedContext() {
        return this._attachedContext;
    }
    constructor(_session, message, _variableData, timestamp, _attempt = 0, _confirmation, _locationData, _attachedContext, isCompleteAddedRequest = false, modelId, restoredId) {
        this._session = _session;
        this.message = message;
        this._variableData = _variableData;
        this.timestamp = timestamp;
        this._attempt = _attempt;
        this._confirmation = _confirmation;
        this._locationData = _locationData;
        this._attachedContext = _attachedContext;
        this.isCompleteAddedRequest = isCompleteAddedRequest;
        this.modelId = modelId;
        this.id = restoredId ?? 'request_' + generateUuid();
        // this.timestamp = Date.now();
    }
    adoptTo(session) {
        this._session = session;
    }
}
class AbstractResponse {
    get value() {
        return this._responseParts;
    }
    constructor(value) {
        /**
         * A stringified representation of response data which might be presented to a screenreader or used when copying a response.
         */
        this._responseRepr = '';
        /**
         * Just the markdown content of the response, used for determining the rendering rate of markdown
         */
        this._markdownContent = '';
        this._responseParts = value;
        this._updateRepr();
    }
    toString() {
        return this._responseRepr;
    }
    /**
     * _Just_ the content of markdown parts in the response
     */
    getMarkdown() {
        return this._markdownContent;
    }
    _updateRepr() {
        this._responseRepr = this.partsToRepr(this._responseParts);
        this._markdownContent = this._responseParts.map(part => {
            if (part.kind === 'inlineReference') {
                return this.inlineRefToRepr(part);
            }
            else if (part.kind === 'markdownContent' || part.kind === 'markdownVuln') {
                return part.content.value;
            }
            else {
                return '';
            }
        })
            .filter(s => s.length > 0)
            .join('');
    }
    partsToRepr(parts) {
        const blocks = [];
        let currentBlockSegments = [];
        for (const part of parts) {
            let segment;
            switch (part.kind) {
                case 'treeData':
                case 'progressMessage':
                case 'codeblockUri':
                case 'toolInvocation':
                case 'toolInvocationSerialized':
                case 'undoStop':
                    // Ignore
                    continue;
                case 'inlineReference':
                    segment = { text: this.inlineRefToRepr(part) };
                    break;
                case 'command':
                    segment = { text: part.command.title, isBlock: true };
                    break;
                case 'textEditGroup':
                case 'notebookEditGroup':
                    segment = { text: localize('editsSummary', "Made changes."), isBlock: true };
                    break;
                case 'confirmation':
                    segment = { text: `${part.title}\n${part.message}`, isBlock: true };
                    break;
                default:
                    segment = { text: part.content.value };
                    break;
            }
            if (segment.isBlock) {
                if (currentBlockSegments.length) {
                    blocks.push(currentBlockSegments.join(''));
                    currentBlockSegments = [];
                }
                blocks.push(segment.text);
            }
            else {
                currentBlockSegments.push(segment.text);
            }
        }
        if (currentBlockSegments.length) {
            blocks.push(currentBlockSegments.join(''));
        }
        return blocks.join('\n\n');
    }
    inlineRefToRepr(part) {
        if ('uri' in part.inlineReference) {
            return this.uriToRepr(part.inlineReference.uri);
        }
        return 'name' in part.inlineReference
            ? '`' + part.inlineReference.name + '`'
            : this.uriToRepr(part.inlineReference);
    }
    uriToRepr(uri) {
        if (uri.scheme === Schemas.http || uri.scheme === Schemas.https) {
            return uri.toString(false);
        }
        return basename(uri);
    }
}
/** A view of a subset of a response */
class ResponseView extends AbstractResponse {
    constructor(_response, undoStop) {
        const idx = _response.value.findIndex(v => v.kind === 'undoStop' && v.id === undoStop);
        super(idx === -1 ? _response.value.slice() : _response.value.slice(0, idx));
        this.undoStop = undoStop;
    }
}
export class Response extends AbstractResponse {
    get onDidChangeValue() {
        return this._onDidChangeValue.event;
    }
    constructor(value) {
        super(asArray(value).map((v) => (isMarkdownString(v) ?
            { content: v, kind: 'markdownContent' } :
            'kind' in v ? v : { kind: 'treeData', treeData: v })));
        this._onDidChangeValue = new Emitter();
        this._citations = [];
    }
    dispose() {
        this._onDidChangeValue.dispose();
    }
    clear() {
        this._responseParts = [];
        this._updateRepr(true);
    }
    updateContent(progress, quiet) {
        if (progress.kind === 'markdownContent') {
            // last response which is NOT a text edit group because we do want to support heterogenous streaming but not have
            // the MD be chopped up by text edit groups (and likely other non-renderable parts)
            const lastResponsePart = this._responseParts
                .filter(p => p.kind !== 'textEditGroup')
                .at(-1);
            if (!lastResponsePart || lastResponsePart.kind !== 'markdownContent' || !canMergeMarkdownStrings(lastResponsePart.content, progress.content)) {
                // The last part can't be merged with- not markdown, or markdown with different permissions
                this._responseParts.push(progress);
            }
            else {
                // Don't modify the current object, since it's being diffed by the renderer
                const idx = this._responseParts.indexOf(lastResponsePart);
                this._responseParts[idx] = { ...lastResponsePart, content: appendMarkdownString(lastResponsePart.content, progress.content) };
            }
            this._updateRepr(quiet);
        }
        else if (progress.kind === 'textEdit' || progress.kind === 'notebookEdit') {
            // If the progress.uri is a cell Uri, its possible its part of the inline chat.
            // Old approach of notebook inline chat would not start and end with notebook Uri, so we need to check for old approach.
            const useOldApproachForInlineNotebook = progress.uri.scheme === Schemas.vscodeNotebookCell && !this._responseParts.find(part => part.kind === 'notebookEditGroup');
            // merge edits for the same file no matter when they come in
            const notebookUri = useOldApproachForInlineNotebook ? undefined : CellUri.parse(progress.uri)?.notebook;
            const uri = notebookUri ?? progress.uri;
            let found = false;
            const groupKind = progress.kind === 'textEdit' && !notebookUri ? 'textEditGroup' : 'notebookEditGroup';
            const edits = groupKind === 'textEditGroup' ? progress.edits : progress.edits.map(edit => TextEdit.isTextEdit(edit) ? { uri: progress.uri, edit } : edit);
            for (let i = 0; !found && i < this._responseParts.length; i++) {
                const candidate = this._responseParts[i];
                if (candidate.kind === groupKind && !candidate.done && isEqual(candidate.uri, uri)) {
                    candidate.edits.push(edits);
                    candidate.done = progress.done;
                    found = true;
                }
            }
            if (!found) {
                this._responseParts.push({
                    kind: groupKind,
                    uri,
                    edits: groupKind === 'textEditGroup' ? [edits] : edits,
                    done: progress.done
                });
            }
            this._updateRepr(quiet);
        }
        else if (progress.kind === 'progressTask') {
            // Add a new resolving part
            const responsePosition = this._responseParts.push(progress) - 1;
            this._updateRepr(quiet);
            const disp = progress.onDidAddProgress(() => {
                this._updateRepr(false);
            });
            progress.task?.().then((content) => {
                // Stop listening for progress updates once the task settles
                disp.dispose();
                // Replace the resolving part's content with the resolved response
                if (typeof content === 'string') {
                    this._responseParts[responsePosition].content = new MarkdownString(content);
                }
                this._updateRepr(false);
            });
        }
        else if (progress.kind === 'toolInvocation') {
            if (progress.confirmationMessages) {
                progress.confirmed.p.then(() => {
                    this._updateRepr(false);
                });
            }
            progress.isCompletePromise.then(() => {
                this._updateRepr(false);
            });
            this._responseParts.push(progress);
            this._updateRepr(quiet);
        }
        else {
            this._responseParts.push(progress);
            this._updateRepr(quiet);
        }
    }
    addCitation(citation) {
        this._citations.push(citation);
        this._updateRepr();
    }
    _updateRepr(quiet) {
        super._updateRepr();
        if (!this._onDidChangeValue) {
            return; // called from parent constructor
        }
        this._responseRepr += this._citations.length ? '\n\n' + getCodeCitationsMessage(this._citations) : '';
        if (!quiet) {
            this._onDidChangeValue.fire();
        }
    }
}
export class ChatResponseModel extends Disposable {
    get session() {
        return this._session;
    }
    get shouldBeRemovedOnSend() {
        return this._shouldBeRemovedOnSend;
    }
    get isComplete() {
        return this._isComplete;
    }
    set shouldBeRemovedOnSend(disablement) {
        this._shouldBeRemovedOnSend = disablement;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    get isCanceled() {
        return this._isCanceled;
    }
    get vote() {
        return this._vote;
    }
    get voteDownReason() {
        return this._voteDownReason;
    }
    get followups() {
        return this._followups;
    }
    get entireResponse() {
        return this._finalizedResponse || this._response;
    }
    get result() {
        return this._result;
    }
    get username() {
        return this.session.responderUsername;
    }
    get avatarIcon() {
        return this.session.responderAvatarIcon;
    }
    get agent() {
        return this._agent;
    }
    get slashCommand() {
        return this._slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._agentOrSlashCommandDetected ?? false;
    }
    get usedContext() {
        return this._usedContext;
    }
    get contentReferences() {
        return Array.from(this._contentReferences);
    }
    get codeCitations() {
        return this._codeCitations;
    }
    get progressMessages() {
        return this._progressMessages;
    }
    get isStale() {
        return this._isStale;
    }
    get isPaused() {
        return this._isPaused;
    }
    get isPendingConfirmation() {
        return this._response.value.some(part => part.kind === 'toolInvocation' && part.isConfirmed === undefined
            || part.kind === 'confirmation' && part.isUsed === false);
    }
    get response() {
        const undoStop = this._shouldBeRemovedOnSend?.afterUndoStop;
        if (!undoStop) {
            return this._finalizedResponse || this._response;
        }
        if (this._responseView?.undoStop !== undoStop) {
            this._responseView = new ResponseView(this._response, undoStop);
        }
        return this._responseView;
    }
    constructor(_response, _session, _agent, _slashCommand, requestId, _isComplete = false, _isCanceled = false, _vote, _voteDownReason, _result, followups, isCompleteAddedRequest = false, _shouldBeRemovedOnSend = undefined, restoredId) {
        super();
        this._session = _session;
        this._agent = _agent;
        this._slashCommand = _slashCommand;
        this.requestId = requestId;
        this._isComplete = _isComplete;
        this._isCanceled = _isCanceled;
        this._vote = _vote;
        this._voteDownReason = _voteDownReason;
        this._result = _result;
        this.isCompleteAddedRequest = isCompleteAddedRequest;
        this._shouldBeRemovedOnSend = _shouldBeRemovedOnSend;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._contentReferences = [];
        this._codeCitations = [];
        this._progressMessages = [];
        this._isStale = false;
        this._isPaused = observableValue('isPaused', false);
        // If we are creating a response with some existing content, consider it stale
        this._isStale = Array.isArray(_response) && (_response.length !== 0 || isMarkdownString(_response) && _response.value.length !== 0);
        this._followups = followups ? [...followups] : undefined;
        this._response = this._register(new Response(_response));
        this._register(this._response.onDidChangeValue(() => this._onDidChange.fire(defaultChatResponseModelChangeReason)));
        this.id = restoredId ?? 'response_' + generateUuid();
    }
    /**
     * Apply a progress update to the actual response content.
     */
    updateContent(responsePart, quiet) {
        this.bufferWhenPaused(() => this._response.updateContent(responsePart, quiet));
    }
    /**
     * Adds an undo stop at the current position in the stream.
     */
    addUndoStop(undoStop) {
        this.bufferWhenPaused(() => {
            this._onDidChange.fire({ reason: 'undoStop', id: undoStop.id });
            this._response.updateContent(undoStop, true);
        });
    }
    /**
     * Apply one of the progress updates that are not part of the actual response content.
     */
    applyReference(progress) {
        if (progress.kind === 'usedContext') {
            this._usedContext = progress;
        }
        else if (progress.kind === 'reference') {
            this._contentReferences.push(progress);
            this._onDidChange.fire(defaultChatResponseModelChangeReason);
        }
    }
    applyCodeCitation(progress) {
        this._codeCitations.push(progress);
        this._response.addCitation(progress);
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setAgent(agent, slashCommand) {
        this._agent = agent;
        this._slashCommand = slashCommand;
        this._agentOrSlashCommandDetected = !agent.isDefault || !!slashCommand;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setResult(result) {
        this._result = result;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    complete() {
        if (this._result?.errorDetails?.responseIsRedacted) {
            this._response.clear();
        }
        this._isComplete = true;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    cancel() {
        this._isComplete = true;
        this._isCanceled = true;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setFollowups(followups) {
        this._followups = followups;
        this._onDidChange.fire(defaultChatResponseModelChangeReason); // Fire so that command followups get rendered on the row
    }
    setVote(vote) {
        this._vote = vote;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setVoteDownReason(reason) {
        this._voteDownReason = reason;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setEditApplied(edit, editCount) {
        if (!this.response.value.includes(edit)) {
            return false;
        }
        if (!edit.state) {
            return false;
        }
        edit.state.applied = editCount; // must not be edit.edits.length
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
        return true;
    }
    adoptTo(session) {
        this._session = session;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setPaused(isPause, tx) {
        this._isPaused.set(isPause, tx);
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
        this.bufferedPauseContent?.forEach(f => f());
        this.bufferedPauseContent = undefined;
    }
    finalizeUndoState() {
        this._finalizedResponse = this.response;
        this._responseView = undefined;
        this._shouldBeRemovedOnSend = undefined;
    }
    bufferWhenPaused(apply) {
        if (!this._isPaused.get()) {
            apply();
        }
        else {
            this.bufferedPauseContent ??= [];
            this.bufferedPauseContent.push(apply);
        }
    }
}
export var ChatPauseState;
(function (ChatPauseState) {
    ChatPauseState[ChatPauseState["NotPausable"] = 0] = "NotPausable";
    ChatPauseState[ChatPauseState["Paused"] = 1] = "Paused";
    ChatPauseState[ChatPauseState["Unpaused"] = 2] = "Unpaused";
})(ChatPauseState || (ChatPauseState = {}));
/**
 * Normalize chat data from storage to the current format.
 * TODO- ChatModel#_deserialize and reviveSerializedAgent also still do some normalization and maybe that should be done in here too.
 */
export function normalizeSerializableChatData(raw) {
    normalizeOldFields(raw);
    if (!('version' in raw)) {
        return {
            version: 3,
            ...raw,
            lastMessageDate: raw.creationDate,
            customTitle: undefined,
        };
    }
    if (raw.version === 2) {
        return {
            ...raw,
            version: 3,
            customTitle: raw.computedTitle
        };
    }
    return raw;
}
function normalizeOldFields(raw) {
    // Fill in fields that very old chat data may be missing
    if (!raw.sessionId) {
        raw.sessionId = generateUuid();
    }
    if (!raw.creationDate) {
        raw.creationDate = getLastYearDate();
    }
    if ('version' in raw && (raw.version === 2 || raw.version === 3)) {
        if (!raw.lastMessageDate) {
            // A bug led to not porting creationDate properly, and that was copied to lastMessageDate, so fix that up if missing.
            raw.lastMessageDate = getLastYearDate();
        }
    }
}
function getLastYearDate() {
    const lastYearDate = new Date();
    lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
    return lastYearDate.getTime();
}
export function isExportableSessionData(obj) {
    const data = obj;
    return typeof data === 'object' &&
        typeof data.requesterUsername === 'string';
}
export function isSerializableSessionData(obj) {
    const data = obj;
    return isExportableSessionData(obj) &&
        typeof data.creationDate === 'number' &&
        typeof data.sessionId === 'string' &&
        obj.requests.every((request) => !request.usedContext /* for backward compat allow missing usedContext */ || isIUsedContext(request.usedContext));
}
export var ChatRequestRemovalReason;
(function (ChatRequestRemovalReason) {
    /**
     * "Normal" remove
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Removal"] = 0] = "Removal";
    /**
     * Removed because the request will be resent
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Resend"] = 1] = "Resend";
    /**
     * Remove because the request is moving to another model
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Adoption"] = 2] = "Adoption";
})(ChatRequestRemovalReason || (ChatRequestRemovalReason = {}));
export var ChatModelInitState;
(function (ChatModelInitState) {
    ChatModelInitState[ChatModelInitState["Created"] = 0] = "Created";
    ChatModelInitState[ChatModelInitState["Initializing"] = 1] = "Initializing";
    ChatModelInitState[ChatModelInitState["Initialized"] = 2] = "Initialized";
})(ChatModelInitState || (ChatModelInitState = {}));
let ChatModel = ChatModel_1 = class ChatModel extends Disposable {
    static getDefaultTitle(requests) {
        const firstRequestMessage = requests.at(0)?.message ?? '';
        const message = typeof firstRequestMessage === 'string' ?
            firstRequestMessage :
            firstRequestMessage.text;
        return message.split('\n')[0].substring(0, 50);
    }
    get sampleQuestions() {
        return this._sampleQuestions;
    }
    get sessionId() {
        return this._sessionId;
    }
    get requestInProgress() {
        const lastRequest = this.lastRequest;
        if (!lastRequest?.response) {
            return false;
        }
        if (lastRequest.response.isPendingConfirmation) {
            return false;
        }
        return !lastRequest.response.isComplete;
    }
    get requestPausibility() {
        const lastRequest = this.lastRequest;
        if (!lastRequest?.response?.agent || lastRequest.response.isComplete || lastRequest.response.isPendingConfirmation) {
            return 0 /* ChatPauseState.NotPausable */;
        }
        return lastRequest.response.isPaused.get() ? 1 /* ChatPauseState.Paused */ : 2 /* ChatPauseState.Unpaused */;
    }
    get hasRequests() {
        return this._requests.length > 0;
    }
    get lastRequest() {
        return this._requests.at(-1);
    }
    get creationDate() {
        return this._creationDate;
    }
    get lastMessageDate() {
        return this._lastMessageDate;
    }
    get _defaultAgent() {
        return this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
    }
    get requesterUsername() {
        return this._defaultAgent?.metadata.requester?.name ??
            this.initialData?.requesterUsername ?? '';
    }
    get responderUsername() {
        return this._defaultAgent?.fullName ??
            this.initialData?.responderUsername ?? '';
    }
    get requesterAvatarIconUri() {
        return this._defaultAgent?.metadata.requester?.icon ??
            this._initialRequesterAvatarIconUri;
    }
    get responderAvatarIcon() {
        return this._defaultAgent?.metadata.themeIcon ??
            this._initialResponderAvatarIconUri;
    }
    get initState() {
        return this._initState;
    }
    get isImported() {
        return this._isImported;
    }
    get customTitle() {
        return this._customTitle;
    }
    get title() {
        return this._customTitle || ChatModel_1.getDefaultTitle(this._requests);
    }
    get initialLocation() {
        return this._initialLocation;
    }
    get editingSessionObs() {
        return this._editingSession;
    }
    get editingSession() {
        return this._editingSession?.promiseResult.get()?.data;
    }
    constructor(initialData, _initialLocation, logService, chatAgentService, chatEditingService) {
        super();
        this.initialData = initialData;
        this._initialLocation = _initialLocation;
        this.logService = logService;
        this.chatAgentService = chatAgentService;
        this.chatEditingService = chatEditingService;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._initState = ChatModelInitState.Created;
        this._isInitializedDeferred = new DeferredPromise();
        this._isImported = false;
        this._checkpoint = undefined;
        const isValid = isSerializableSessionData(initialData);
        if (initialData && !isValid) {
            this.logService.warn(`ChatModel#constructor: Loaded malformed session data: ${JSON.stringify(initialData)}`);
        }
        this._isImported = (!!initialData && !isValid) || (initialData?.isImported ?? false);
        this._sessionId = (isValid && initialData.sessionId) || generateUuid();
        this._requests = initialData ? this._deserialize(initialData) : [];
        this._creationDate = (isValid && initialData.creationDate) || Date.now();
        this._lastMessageDate = (isValid && initialData.lastMessageDate) || this._creationDate;
        this._customTitle = isValid ? initialData.customTitle : undefined;
        this._initialRequesterAvatarIconUri = initialData?.requesterAvatarIconUri && URI.revive(initialData.requesterAvatarIconUri);
        this._initialResponderAvatarIconUri = isUriComponents(initialData?.responderAvatarIconUri) ? URI.revive(initialData.responderAvatarIconUri) : initialData?.responderAvatarIconUri;
    }
    startEditingSession(isGlobalEditingSession) {
        const editingSessionPromise = isGlobalEditingSession ?
            this.chatEditingService.startOrContinueGlobalEditingSession(this) :
            this.chatEditingService.createEditingSession(this);
        this._editingSession = new ObservablePromise(editingSessionPromise);
        this._editingSession.promise.then(editingSession => this._store.isDisposed ? editingSession.dispose() : this._register(editingSession));
    }
    _deserialize(obj) {
        const requests = obj.requests;
        if (!Array.isArray(requests)) {
            this.logService.error(`Ignoring malformed session data: ${JSON.stringify(obj)}`);
            return [];
        }
        try {
            return requests.map((raw) => {
                const parsedRequest = typeof raw.message === 'string'
                    ? this.getParsedRequestFromString(raw.message)
                    : reviveParsedChatRequest(raw.message);
                // Old messages don't have variableData, or have it in the wrong (non-array) shape
                const variableData = this.reviveVariableData(raw.variableData);
                const request = new ChatRequestModel(this, parsedRequest, variableData, raw.timestamp ?? -1, undefined, undefined, undefined, undefined, undefined, undefined, raw.requestId);
                request.shouldBeRemovedOnSend = raw.isHidden ? { requestId: raw.requestId } : raw.shouldBeRemovedOnSend;
                if (raw.response || raw.result || raw.responseErrorDetails) {
                    const agent = (raw.agent && 'metadata' in raw.agent) ? // Check for the new format, ignore entries in the old format
                        reviveSerializedAgent(raw.agent) : undefined;
                    // Port entries from old format
                    const result = 'responseErrorDetails' in raw ?
                        // eslint-disable-next-line local/code-no-dangerous-type-assertions
                        { errorDetails: raw.responseErrorDetails } : raw.result;
                    request.response = new ChatResponseModel(raw.response ?? [new MarkdownString(raw.response)], this, agent, raw.slashCommand, request.id, true, raw.isCanceled, raw.vote, raw.voteDownReason, result, raw.followups, undefined, undefined, raw.responseId);
                    request.response.shouldBeRemovedOnSend = raw.isHidden ? { requestId: raw.requestId } : raw.shouldBeRemovedOnSend;
                    if (raw.usedContext) { // @ulugbekna: if this's a new vscode sessions, doc versions are incorrect anyway?
                        request.response.applyReference(revive(raw.usedContext));
                    }
                    raw.contentReferences?.forEach(r => request.response.applyReference(revive(r)));
                    raw.codeCitations?.forEach(c => request.response.applyCodeCitation(revive(c)));
                }
                return request;
            });
        }
        catch (error) {
            this.logService.error('Failed to parse chat data', error);
            return [];
        }
    }
    reviveVariableData(raw) {
        const variableData = raw && Array.isArray(raw.variables)
            ? raw :
            { variables: [] };
        variableData.variables = variableData.variables.map((v) => {
            // Old variables format
            if (v && 'values' in v && Array.isArray(v.values)) {
                return {
                    id: v.id ?? '',
                    name: v.name,
                    value: v.values[0]?.value,
                    range: v.range,
                    modelDescription: v.modelDescription,
                    references: v.references
                };
            }
            else {
                return v;
            }
        });
        return variableData;
    }
    getParsedRequestFromString(message) {
        // TODO These offsets won't be used, but chat replies need to go through the parser as well
        const parts = [new ChatRequestTextPart(new OffsetRange(0, message.length), { startColumn: 1, startLineNumber: 1, endColumn: 1, endLineNumber: 1 }, message)];
        return {
            text: message,
            parts
        };
    }
    toggleLastRequestPaused(isPaused) {
        if (this.requestPausibility !== 0 /* ChatPauseState.NotPausable */ && this.lastRequest?.response?.agent) {
            const pausedValue = isPaused ?? !this.lastRequest.response.isPaused.get();
            this.lastRequest.response.setPaused(pausedValue);
            this.chatAgentService.setRequestPaused(this.lastRequest.response.agent.id, this.lastRequest.id, pausedValue);
            this._onDidChange.fire({ kind: 'changedRequest', request: this.lastRequest });
        }
    }
    startInitialize() {
        if (this.initState !== ChatModelInitState.Created) {
            throw new Error(`ChatModel is in the wrong state for startInitialize: ${ChatModelInitState[this.initState]}`);
        }
        this._initState = ChatModelInitState.Initializing;
    }
    deinitialize() {
        this._initState = ChatModelInitState.Created;
        this._isInitializedDeferred = new DeferredPromise();
    }
    initialize(sampleQuestions) {
        if (this.initState !== ChatModelInitState.Initializing) {
            // Must call startInitialize before initialize, and only call it once
            throw new Error(`ChatModel is in the wrong state for initialize: ${ChatModelInitState[this.initState]}`);
        }
        this._initState = ChatModelInitState.Initialized;
        this._sampleQuestions = sampleQuestions;
        this._isInitializedDeferred.complete();
        this._onDidChange.fire({ kind: 'initialize' });
    }
    setInitializationError(error) {
        if (this.initState !== ChatModelInitState.Initializing) {
            throw new Error(`ChatModel is in the wrong state for setInitializationError: ${ChatModelInitState[this.initState]}`);
        }
        if (!this._isInitializedDeferred.isSettled) {
            this._isInitializedDeferred.error(error);
        }
    }
    waitForInitialization() {
        return this._isInitializedDeferred.p;
    }
    getRequests() {
        return this._requests;
    }
    get checkpoint() {
        return this._checkpoint;
    }
    setDisabledRequests(requestIds) {
        this._requests.forEach((request) => {
            const shouldBeRemovedOnSend = requestIds.find(r => r.requestId === request.id);
            request.shouldBeRemovedOnSend = shouldBeRemovedOnSend;
            if (request.response) {
                request.response.shouldBeRemovedOnSend = shouldBeRemovedOnSend;
            }
        });
        this._onDidChange.fire({
            kind: 'setHidden',
            hiddenRequestIds: requestIds,
        });
    }
    addRequest(message, variableData, attempt, chatAgent, slashCommand, confirmation, locationData, attachments, isCompleteAddedRequest, modelId) {
        const request = new ChatRequestModel(this, message, variableData, Date.now(), attempt, confirmation, locationData, attachments, isCompleteAddedRequest, modelId);
        request.response = new ChatResponseModel([], this, chatAgent, slashCommand, request.id, undefined, undefined, undefined, undefined, undefined, undefined, isCompleteAddedRequest);
        this._requests.push(request);
        this._lastMessageDate = Date.now();
        this._onDidChange.fire({ kind: 'addRequest', request });
        return request;
    }
    setCustomTitle(title) {
        this._customTitle = title;
    }
    updateRequest(request, variableData) {
        request.variableData = variableData;
        this._onDidChange.fire({ kind: 'changedRequest', request });
    }
    adoptRequest(request) {
        // this doesn't use `removeRequest` because it must not dispose the request object
        const oldOwner = request.session;
        const index = oldOwner._requests.findIndex(candidate => candidate.id === request.id);
        if (index === -1) {
            return;
        }
        oldOwner._requests.splice(index, 1);
        request.adoptTo(this);
        request.response?.adoptTo(this);
        this._requests.push(request);
        oldOwner._onDidChange.fire({ kind: 'removeRequest', requestId: request.id, responseId: request.response?.id, reason: 2 /* ChatRequestRemovalReason.Adoption */ });
        this._onDidChange.fire({ kind: 'addRequest', request });
    }
    acceptResponseProgress(request, progress, quiet) {
        if (!request.response) {
            request.response = new ChatResponseModel([], this, undefined, undefined, request.id);
        }
        if (request.response.isComplete) {
            throw new Error('acceptResponseProgress: Adding progress to a completed response');
        }
        if (progress.kind === 'markdownContent' ||
            progress.kind === 'treeData' ||
            progress.kind === 'inlineReference' ||
            progress.kind === 'codeblockUri' ||
            progress.kind === 'markdownVuln' ||
            progress.kind === 'progressMessage' ||
            progress.kind === 'command' ||
            progress.kind === 'textEdit' ||
            progress.kind === 'notebookEdit' ||
            progress.kind === 'warning' ||
            progress.kind === 'progressTask' ||
            progress.kind === 'confirmation' ||
            progress.kind === 'toolInvocation') {
            request.response.updateContent(progress, quiet);
        }
        else if (progress.kind === 'usedContext' || progress.kind === 'reference') {
            request.response.applyReference(progress);
        }
        else if (progress.kind === 'codeCitation') {
            request.response.applyCodeCitation(progress);
        }
        else if (progress.kind === 'move') {
            this._onDidChange.fire({ kind: 'move', target: progress.uri, range: progress.range });
        }
        else if (progress.kind === 'undoStop') {
            request.response.addUndoStop(progress);
        }
        else {
            this.logService.error(`Couldn't handle progress: ${JSON.stringify(progress)}`);
        }
    }
    removeRequest(id, reason = 0 /* ChatRequestRemovalReason.Removal */) {
        const index = this._requests.findIndex(request => request.id === id);
        const request = this._requests[index];
        if (index !== -1) {
            this._onDidChange.fire({ kind: 'removeRequest', requestId: request.id, responseId: request.response?.id, reason });
            this._requests.splice(index, 1);
            request.response?.dispose();
        }
    }
    cancelRequest(request) {
        if (request.response) {
            request.response.cancel();
        }
    }
    setResponse(request, result) {
        if (!request.response) {
            request.response = new ChatResponseModel([], this, undefined, undefined, request.id);
        }
        request.response.setResult(result);
    }
    completeResponse(request) {
        if (!request.response) {
            throw new Error('Call setResponse before completeResponse');
        }
        request.response.complete();
        this._onDidChange.fire({ kind: 'completedRequest', request });
    }
    setFollowups(request, followups) {
        if (!request.response) {
            // Maybe something went wrong?
            return;
        }
        request.response.setFollowups(followups);
    }
    setResponseModel(request, response) {
        request.response = response;
        this._onDidChange.fire({ kind: 'addResponse', response });
    }
    toExport() {
        return {
            requesterUsername: this.requesterUsername,
            requesterAvatarIconUri: this.requesterAvatarIconUri,
            responderUsername: this.responderUsername,
            responderAvatarIconUri: this.responderAvatarIcon,
            initialLocation: this.initialLocation,
            requests: this._requests.map((r) => {
                const message = {
                    ...r.message,
                    parts: r.message.parts.map(p => p && 'toJSON' in p ? p.toJSON() : p)
                };
                const agent = r.response?.agent;
                const agentJson = agent && 'toJSON' in agent ? agent.toJSON() :
                    agent ? { ...agent } : undefined;
                return {
                    requestId: r.id,
                    message,
                    variableData: r.variableData,
                    response: r.response ?
                        r.response.entireResponse.value.map(item => {
                            // Keeping the shape of the persisted data the same for back compat
                            if (item.kind === 'treeData') {
                                return item.treeData;
                            }
                            else if (item.kind === 'markdownContent') {
                                return item.content;
                            }
                            else {
                                return item; // TODO
                            }
                        })
                        : undefined,
                    responseId: r.response?.id,
                    shouldBeRemovedOnSend: r.shouldBeRemovedOnSend,
                    result: r.response?.result,
                    followups: r.response?.followups,
                    isCanceled: r.response?.isCanceled,
                    vote: r.response?.vote,
                    voteDownReason: r.response?.voteDownReason,
                    agent: agentJson,
                    slashCommand: r.response?.slashCommand,
                    usedContext: r.response?.usedContext,
                    contentReferences: r.response?.contentReferences,
                    codeCitations: r.response?.codeCitations,
                    timestamp: r.timestamp
                };
            }),
        };
    }
    toJSON() {
        return {
            version: 3,
            ...this.toExport(),
            sessionId: this.sessionId,
            creationDate: this._creationDate,
            isImported: this._isImported,
            lastMessageDate: this._lastMessageDate,
            customTitle: this._customTitle
        };
    }
    dispose() {
        this._requests.forEach(r => r.response?.dispose());
        this._onDidDispose.fire();
        super.dispose();
    }
};
ChatModel = ChatModel_1 = __decorate([
    __param(2, ILogService),
    __param(3, IChatAgentService),
    __param(4, IChatEditingService)
], ChatModel);
export { ChatModel };
export function updateRanges(variableData, diff) {
    return {
        variables: variableData.variables.map(v => ({
            ...v,
            range: v.range && {
                start: v.range.start - diff,
                endExclusive: v.range.endExclusive - diff
            }
        }))
    };
}
export function canMergeMarkdownStrings(md1, md2) {
    if (md1.baseUri && md2.baseUri) {
        const baseUriEquals = md1.baseUri.scheme === md2.baseUri.scheme
            && md1.baseUri.authority === md2.baseUri.authority
            && md1.baseUri.path === md2.baseUri.path
            && md1.baseUri.query === md2.baseUri.query
            && md1.baseUri.fragment === md2.baseUri.fragment;
        if (!baseUriEquals) {
            return false;
        }
    }
    else if (md1.baseUri || md2.baseUri) {
        return false;
    }
    return equals(md1.isTrusted, md2.isTrusted) &&
        md1.supportHtml === md2.supportHtml &&
        md1.supportThemeIcons === md2.supportThemeIcons;
}
export function appendMarkdownString(md1, md2) {
    const appendedValue = typeof md2 === 'string' ? md2 : md2.value;
    return {
        value: md1.value + appendedValue,
        isTrusted: md1.isTrusted,
        supportThemeIcons: md1.supportThemeIcons,
        supportHtml: md1.supportHtml,
        baseUri: md1.baseUri
    };
}
export function getCodeCitationsMessage(citations) {
    if (citations.length === 0) {
        return '';
    }
    const licenseTypes = citations.reduce((set, c) => set.add(c.license), new Set());
    const label = licenseTypes.size === 1 ?
        localize('codeCitation', "Similar code found with 1 license type", licenseTypes.size) :
        localize('codeCitations', "Similar code found with {0} license types", licenseTypes.size);
    return label;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBbUIsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDM0csT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBNkIsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsR0FBRyxFQUF5QixlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFnQixXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUUxRixPQUFPLEVBQXdCLFFBQVEsRUFBRSxN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