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
var TextModelContentsProvider_1;
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { FilePromptContentProvider } from './filePromptContentsProvider.js';
import { PromptContentsProviderBase } from './promptContentsProviderBase.js';
import { newWriteableStream } from '../../../../../../base/common/stream.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { TextModel } from '../../../../../../editor/common/model/textModel.js';
/**
 * Prompt contents provider for a {@link ITextModel} instance.
 */
let TextModelContentsProvider = TextModelContentsProvider_1 = class TextModelContentsProvider extends PromptContentsProviderBase {
    constructor(model, initService) {
        super();
        this.model = model;
        this.initService = initService;
        /**
         * URI component of the prompt associated with this contents provider.
         */
        this.uri = this.model.uri;
        this._register(this.model.onWillDispose(this.dispose.bind(this)));
        this._register(this.model.onDidChangeContent(this.onChangeEmitter.fire));
    }
    /**
     * Creates a stream of binary data from the text model based on the changes
     * listed in the provided event.
     *
     * Note! this method implements a basic logic which does not take into account
     * 		 the `_event` argument for incremental updates. This needs to be improved.
     *
     * @param _event - event that describes the changes in the text model; `'full'` is
     * 				   the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    async getContentsStream(_event, cancellationToken) {
        const stream = newWriteableStream(null);
        const linesCount = this.model.getLineCount();
        // provide the changed lines to the stream incrementally and asynchronously
        // to avoid blocking the main thread and save system resources used
        let i = 1;
        const interval = setInterval(() => {
            // if we have written all lines or lines count is zero,
            // end the stream and stop the interval timer
            if (i >= linesCount) {
                clearInterval(interval);
                stream.end();
                stream.destroy();
            }
            // if model was disposed or cancellation was requested,
            // end the stream with an error and stop the interval timer
            if (this.model.isDisposed() || cancellationToken?.isCancellationRequested) {
                clearInterval(interval);
                stream.error(new CancellationError());
                stream.destroy();
                return;
            }
            try {
                // write the current line to the stream
                stream.write(VSBuffer.fromString(this.model.getLineContent(i)));
                // for all lines except the last one, write the EOL character
                // to separate the lines in the stream
                if (i !== linesCount) {
                    stream.write(VSBuffer.fromString(this.model.getEOL()));
                }
            }
            catch (error) {
                console.log(this.uri, i, error);
            }
            // use the next line in the next iteration
            i++;
        }, 1);
        return stream;
    }
    createNew(promptContentsSource) {
        if (promptContentsSource instanceof TextModel) {
            return this.initService.createInstance(TextModelContentsProvider_1, promptContentsSource);
        }
        return this.initService.createInstance(FilePromptContentProvider, promptContentsSource.uri);
    }
    /**
     * String representation of this object.
     */
    toString() {
        return `text-model-prompt-contents-provider:${this.uri.path}`;
    }
};
TextModelContentsProvider = TextModelContentsProvider_1 = __decorate([
    __param(1, IInstantiationService)
], TextModelContentsProvider);
export { TextModelContentsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsQ29udGVudHNQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb250ZW50UHJvdmlkZXJzL3RleHRNb2RlbENvbnRlbnRzUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQWtCLE1BQU0seUNBQXlDLENBQUM7QUFFN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRS9FOztHQUVHO0FBQ0ksSUFBTSx5QkFBeUIsaUNBQS9CLE1BQU0seUJBQTBCLFNBQVEsMEJBQXFEO0lBTW5HLFlBQ2tCLEtBQWlCLEVBQ1gsV0FBbUQ7UUFFMUUsS0FBSyxFQUFFLENBQUM7UUFIUyxVQUFLLEdBQUwsS0FBSyxDQUFZO1FBQ00sZ0JBQVcsR0FBWCxXQUFXLENBQXVCO1FBUDNFOztXQUVHO1FBQ2EsUUFBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1FBUXBDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMs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