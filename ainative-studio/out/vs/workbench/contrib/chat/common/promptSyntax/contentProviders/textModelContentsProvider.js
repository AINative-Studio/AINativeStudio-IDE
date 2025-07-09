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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsQ29udGVudHNQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29udGVudFByb3ZpZGVycy90ZXh0TW9kZWxDb250ZW50c1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFrQixNQUFNLHlDQUF5QyxDQUFDO0FBRTdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUUvRTs7R0FFRztBQUNJLElBQU0seUJBQXlCLGlDQUEvQixNQUFNLHlCQUEwQixTQUFRLDBCQUFxRDtJQU1uRyxZQUNrQixLQUFpQixFQUNYLFdBQW1EO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBSFMsVUFBSyxHQUFMLEtBQUssQ0FBWTtRQUNNLGdCQUFXLEdBQVgsV0FBVyxDQUF1QjtRQVAzRTs7V0FFRztRQUNhLFFBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQVFwQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFD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