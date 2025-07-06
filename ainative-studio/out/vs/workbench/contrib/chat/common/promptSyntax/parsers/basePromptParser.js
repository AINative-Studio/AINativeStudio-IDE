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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVByb21wdFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL2Jhc2VQcm9tcHRQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsWUFB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