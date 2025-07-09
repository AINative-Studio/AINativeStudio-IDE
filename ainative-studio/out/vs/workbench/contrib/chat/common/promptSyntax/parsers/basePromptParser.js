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
import { TopError } from './topError.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ChatPromptCodec } from '../codecs/chatPromptCodec.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { FileReference } from '../codecs/tokens/fileReference.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { DeferredPromise } from '../../../../../../base/common/async.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { PromptVariableWithData } from '../codecs/tokens/promptVariable.js';
import { basename, extUri } from '../../../../../../base/common/resources.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { isPromptFile } from '../../../../../../platform/prompts/common/constants.js';
import { ObservableDisposable } from '../../../../../../base/common/observableDisposable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { MarkdownLink } from '../../../../../../editor/common/codecs/markdownCodec/tokens/markdownLink.js';
import { NotPromptFile, RecursiveReference, FolderReference, ResolveError } from '../../promptFileReferenceErrors.js';
/**
 * Base prompt parser class that provides a common interface for all
 * prompt parsers that are responsible for parsing chat prompt syntax.
 */
let BasePromptParser = class BasePromptParser extends ObservableDisposable {
    /**
     * Subscribe to the `onUpdate` event that is fired when prompt tokens are updated.
     * @param callback The callback function to be called on updates.
     */
    onUpdate(callback) {
        this._register(this._onUpdate.event(callback));
        return this;
    }
    /**
     * If file reference resolution fails, this attribute will be set
     * to an error instance that describes the error condition.
     */
    get errorCondition() {
        return this._errorCondition;
    }
    /**
     * Whether file references resolution failed.
     * Set to `undefined` if the `resolve` method hasn't been ever called yet.
     */
    get resolveFailed() {
        if (!this.firstParseResult.gotFirstResult) {
            return undefined;
        }
        return !!this._errorCondition;
    }
    /**
     * Returned promise is resolved when the parser process is settled.
     * The settled state means that the prompt parser stream exists and
     * has ended, or an error condition has been set in case of failure.
     *
     * Furthermore, this function can be called multiple times and will
     * block until the latest prompt contents parsing logic is settled
     * (e.g., for every `onContentChanged` event of the prompt source).
     */
    async settled() {
        assert(this.started, 'Cannot wait on the parser that did not start yet.');
        await this.firstParseResult.promise;
        if (this.errorCondition) {
            return this;
        }
        assertDefined(this.stream, 'No stream reference found.');
        await this.stream.settled;
        return this;
    }
    /**
     * Same as {@linkcode settled} but also waits for all possible
     * nested child prompt references and their children to be settled.
     */
    async allSettled() {
        await this.settled();
        await Promise.allSettled(this.references.map((reference) => {
            return reference.allSettled();
        }));
        return this;
    }
    constructor(promptContentsProvider, seenReferences = [], instantiationService, logService) {
        super();
        this.promptContentsProvider = promptContentsProvider;
        this.instantiationService = instantiationService;
        this.logService = logService;
        /**
         * List of file references in the current branch of the file reference tree.
         */
        this._references = [];
        /**
         * The event is fired when lines or their content change.
         */
        this._onUpdate = this._register(new Emitter());
        /**
         * The promise is resolved when at least one parse result (a stream or
         * an error) has been received from the prompt contents provider.
         */
        this.firstParseResult = new FirstParseResult();
        /**
         * Private attribute to track if the {@linkcode start}
         * method has been already called at least once.
         */
        this.started = false;
        this._onUpdate.fire = this._onUpdate.fire.bind(this._onUpdate);
        // to prevent infinite file recursion, we keep track of all references in
        // the current branch of the file reference tree and check if the current
        // file reference has been already seen before
        if (seenReferences.includes(this.uri.path)) {
            seenReferences.push(this.uri.path);
            this._errorCondition = new RecursiveReference(this.uri, seenReferences);
            this._onUpdate.fire();
            this.firstParseResult.complete();
            return this;
        }
        // we don't care if reading the file fails below, hence can add the path
        // of the current reference to the `seenReferences` set immediately, -
        // even if the file doesn't exist, we would never end up in the recursion
        seenReferences.push(this.uri.path);
        this._register(this.promptContentsProvider.onContentChanged((streamOrError) => {
            // process the received message
            this.onContentsChanged(streamOrError, seenReferences);
            // indicate that we've received at least one `onContentChanged` event
            this.firstParseResult.complete();
        }));
        // dispose self when contents provider is disposed
        this.promptContentsProvider.onDispose(this.dispose.bind(this));
    }
    /**
     * Handler the event event that is triggered when prompt contents change.
     *
     * @param streamOrError Either a binary stream of file contents, or an error object
     * 						that was generated during the reference resolve attempt.
     * @param seenReferences List of parent references that we've have already seen
     * 					 	during the process of traversing the references tree. It's
     * 						used to prevent the tree navigation to fall into an infinite
     * 						references recursion.
     */
    onContentsChanged(streamOrError, seenReferences) {
        // dispose and cleanup the previously received stream
        // object or an error condition, if any received yet
        this.stream?.dispose();
        delete this.stream;
        delete this._errorCondition;
        // dispose all currently existing references
        this.disposeReferences();
        // if an error received, set up the error condition and stop
        if (streamOrError instanceof ResolveError) {
            this._errorCondition = streamOrError;
            this._onUpdate.fire();
            return;
        }
        // decode the byte stream to a stream of prompt tokens
        this.stream = ChatPromptCodec.decode(streamOrError);
        // on error or stream end, dispose the stream and fire the update event
        this.stream.on('error', this.onStreamEnd.bind(this, this.stream));
        this.stream.on('end', this.onStreamEnd.bind(this, this.stream));
        // when some tokens received, process and store the references
        this.stream.on('data', (token) => {
            if (token instanceof PromptVariableWithData) {
                try {
                    this.onReference(FileReference.from(token), [...seenReferences]);
                }
                catch (error) {
                    // no-op
                }
            }
            // note! the `isURL` is a simple check and needs to be improved to truly
            // 		 handle only file references, ignoring broken URLs or references
            if (token instanceof MarkdownLink && !token.isURL) {
                this.onReference(token, [...seenReferences]);
            }
        });
        // calling `start` on a disposed stream throws, so we warn and return instead
        if (this.stream.disposed) {
            this.logService.warn(`[prompt parser][${basename(this.uri)}] cannot start stream that has been already disposed, aborting`);
            return;
        }
        // start receiving data on the stream
        this.stream.start();
    }
    /**
     * Handle a new reference token inside prompt contents.
     */
    onReference(token, seenReferences) {
        const referenceUri = extUri.resolvePath(this.dirname, token.path);
        const contentProvider = this.promptContentsProvider.createNew({ uri: referenceUri });
        const reference = this.instantiationService
            .createInstance(PromptReference, contentProvider, token, seenReferences);
        // the content provider is exclusively owned by the reference
        // hence dispose it when the reference is disposed
        reference.onDispose(contentProvider.dispose.bind(contentProvider));
        this._references.push(reference);
        reference.onUpdate(this._onUpdate.fire);
        this._onUpdate.fire();
        reference.start();
        return this;
    }
    /**
     * Handle the `stream` end event.
     *
     * @param stream The stream that has ended.
     * @param error Optional error object if stream ended with an error.
     */
    onStreamEnd(_stream, error) {
        if (error) {
            this.logService.warn(`[prompt parser][${basename(this.uri)}] received an error on the chat prompt decoder stream: ${error}`);
        }
        this._onUpdate.fire();
        return this;
    }
    /**
     * Dispose all currently held references.
     */
    disposeReferences() {
        for (const reference of [...this._references]) {
            reference.dispose();
        }
        this._references.length = 0;
    }
    /**
     * Start the prompt parser.
     */
    start() {
        // if already started, nothing to do
        if (this.started) {
            return this;
        }
        this.started = true;
        // if already in the error state that could be set
        // in the constructor, then nothing to do
        if (this.errorCondition) {
            return this;
        }
        this.promptContentsProvider.start();
        return this;
    }
    /**
     * Associated URI of the prompt.
     */
    get uri() {
        return this.promptContentsProvider.uri;
    }
    /**
     * Get the parent folder of the file reference.
     */
    get dirname() {
        return URI.joinPath(this.uri, '..');
    }
    /**
     * Get a list of immediate child references of the prompt.
     */
    get references() {
        return [...this._references];
    }
    /**
     * Get a list of all references of the prompt, including
     * all possible nested references its children may have.
     */
    get allReferences() {
        const result = [];
        for (const reference of this.references) {
            result.push(reference);
            if (reference.type === 'file') {
                result.push(...reference.allReferences);
            }
        }
        return result;
    }
    /**
     * Get list of all valid references.
     */
    get allValidReferences() {
        return this.allReferences
            // filter out unresolved references
            .filter((reference) => {
            const { errorCondition } = reference;
            // include all references without errors
            if (!errorCondition) {
                return true;
            }
            // filter out folder references from the list
            if (errorCondition instanceof FolderReference) {
                return false;
            }
            // include non-prompt file references
            return (errorCondition instanceof NotPromptFile);
        });
    }
    /**
     * Get list of all valid child references as URIs.
     */
    get allValidReferencesUris() {
        return this.allValidReferences
            .map(child => child.uri);
    }
    /**
     * Get list of errors for the direct links of the current reference.
     */
    get errors() {
        const childErrors = [];
        for (const reference of this.references) {
            const { errorCondition } = reference;
            if (errorCondition && (!(errorCondition instanceof NotPromptFile))) {
                childErrors.push(errorCondition);
            }
        }
        return childErrors;
    }
    /**
     * List of all errors that occurred while resolving the current
     * reference including all possible errors of nested children.
     */
    get allErrors() {
        const result = [];
        for (const reference of this.references) {
            const { errorCondition } = reference;
            if (errorCondition && (!(errorCondition instanceof NotPromptFile))) {
                result.push({
                    originalError: errorCondition,
                    parentUri: this.uri,
                });
            }
            // recursively collect all possible errors of its children
            result.push(...reference.allErrors);
        }
        return result;
    }
    /**
     * The top most error of the current reference or any of its
     * possible child reference errors.
     */
    get topError() {
        if (this.errorCondition) {
            return new TopError({
                errorSubject: 'root',
                errorsCount: 1,
                originalError: this.errorCondition,
            });
        }
        const childErrors = [...this.errors];
        const nestedErrors = [];
        for (const reference of this.references) {
            nestedErrors.push(...reference.allErrors);
        }
        if (childErrors.length === 0 && nestedErrors.length === 0) {
            return undefined;
        }
        const firstDirectChildError = childErrors[0];
        const firstNestedChildError = nestedErrors[0];
        const hasDirectChildError = (firstDirectChildError !== undefined);
        const firstChildError = (hasDirectChildError)
            ? {
                originalError: firstDirectChildError,
                parentUri: this.uri,
            }
            : firstNestedChildError;
        const totalErrorsCount = childErrors.length + nestedErrors.length;
        const subject = (hasDirectChildError)
            ? 'child'
            : 'indirect-child';
        return new TopError({
            errorSubject: subject,
            originalError: firstChildError.originalError,
            parentUri: firstChildError.parentUri,
            errorsCount: totalErrorsCount,
        });
    }
    /**
     * Check if the current reference points to a given resource.
     */
    sameUri(otherUri) {
        return this.uri.toString() === otherUri.toString();
    }
    /**
     * Check if the current reference points to a prompt snippet file.
     */
    get isPromptFile() {
        return isPromptFile(this.uri);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt:${this.uri.path}`;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposeReferences();
        this.stream?.dispose();
        this._onUpdate.fire();
        super.dispose();
    }
};
BasePromptParser = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], BasePromptParser);
export { BasePromptParser };
/**
 * Prompt reference object represents any reference inside prompt text
 * contents. For instance the file variable(`#file:/path/to/file.md`) or
 * a markdown link(`[#file:file.md](/path/to/file.md)`).
 */
let PromptReference = class PromptReference extends ObservableDisposable {
    constructor(promptContentsProvider, token, seenReferences = [], initService) {
        super();
        this.promptContentsProvider = promptContentsProvider;
        this.token = token;
        this.range = this.token.range;
        this.path = this.token.path;
        this.text = this.token.text;
        this.parser = this._register(initService.createInstance(BasePromptParser, this.promptContentsProvider, seenReferences));
    }
    /**
     * Get the range of the `link` part of the reference.
     */
    get linkRange() {
        // `#file:` references
        if (this.token instanceof FileReference) {
            return this.token.dataRange;
        }
        // `markdown link` references
        if (this.token instanceof MarkdownLink) {
            return this.token.linkRange;
        }
        return undefined;
    }
    /**
     * Type of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get type() {
        if (this.token instanceof FileReference) {
            return 'file';
        }
        if (this.token instanceof MarkdownLink) {
            return 'file';
        }
        assertNever(this.token, `Unknown token type '${this.token}'.`);
    }
    /**
     * Subtype of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get subtype() {
        if (this.token instanceof FileReference) {
            return 'prompt';
        }
        if (this.token instanceof MarkdownLink) {
            return 'markdown';
        }
        assertNever(this.token, `Unknown token type '${this.token}'.`);
    }
    /**
     * Start parsing the reference contents.
     */
    start() {
        this.parser.start();
        return this;
    }
    /**
     * Subscribe to the `onUpdate` event that is fired when prompt tokens are updated.
     * @param callback The callback function to be called on updates.
     */
    onUpdate(callback) {
        this.parser.onUpdate(callback);
        return this;
    }
    get resolveFailed() {
        return this.parser.resolveFailed;
    }
    get errorCondition() {
        return this.parser.errorCondition;
    }
    get topError() {
        return this.parser.topError;
    }
    get uri() {
        return this.parser.uri;
    }
    get isPromptFile() {
        return this.parser.isPromptFile;
    }
    get errors() {
        return this.parser.errors;
    }
    get allErrors() {
        return this.parser.allErrors;
    }
    get references() {
        return this.parser.references;
    }
    get allReferences() {
        return this.parser.allReferences;
    }
    get allValidReferences() {
        return this.parser.allValidReferences;
    }
    async settled() {
        await this.parser.settled();
        return this;
    }
    async allSettled() {
        await this.parser.allSettled();
        return this;
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt-reference/${this.type}:${this.subtype}/${this.token}`;
    }
};
PromptReference = __decorate([
    __param(3, IInstantiationService)
], PromptReference);
export { PromptReference };
/**
 * A tiny utility object that helps us to track existence
 * of at least one parse result from the content provider.
 */
class FirstParseResult extends DeferredPromise {
    constructor() {
        super(...arguments);
        /**
         * Private attribute to track if we have
         * received at least one result.
         */
        this._gotResult = false;
    }
    /**
     * Whether we've received at least one result.
     */
    get gotFirstResult() {
        return this._gotResult;
    }
    /**
     * Get underlying promise reference.
     */
    get promise() {
        return this.p;
    }
    /**
     * Complete the underlying promise.
     */
    complete() {
        this._gotResult = true;
        return super.complete(void 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVByb21wdFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9iYXNlUHJvbXB0UGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUd2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLFlB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