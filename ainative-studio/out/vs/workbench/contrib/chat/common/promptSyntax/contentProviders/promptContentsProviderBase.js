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
import { Emitter } from '../../../../../../base/common/event.js';
import { assert } from '../../../../../../base/common/assert.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { ObservableDisposable } from '../../../../../../base/common/observableDisposable.js';
import { FailedToResolveContentsStream, ResolveError } from '../../promptFileReferenceErrors.js';
import { cancelPreviousCalls } from '../../../../../../base/common/decorators/cancelPreviousCalls.js';
/**
 * Base class for prompt contents providers. Classes that extend this one are responsible to:
 *
 * - implement the {@linkcode getContentsStream} method to provide the contents stream
 *   of a prompt; this method should throw a `ResolveError` or its derivative if the contents
 *   cannot be parsed for any reason
 * - fire a {@linkcode TChangeEvent} event on the {@linkcode onChangeEmitter} event when
 * 	 prompt contents change
 * - misc:
 *   - provide the {@linkcode uri} property that represents the URI of a prompt that
 *     the contents are for
 *   - implement the {@linkcode toString} method to return a string representation of this
 *     provider type to aid with debugging/tracing
 */
export class PromptContentsProviderBase extends ObservableDisposable {
    constructor() {
        super();
        /**
         * Internal event emitter for the prompt contents change event. Classes that extend
         * this abstract class are responsible to use this emitter to fire the contents change
         * event when the prompt contents get modified.
         */
        this.onChangeEmitter = this._register(new Emitter());
        /**
         * Event emitter for the prompt contents change event.
         * See {@linkcode onContentChanged} for more details.
         */
        this.onContentChangedEmitter = this._register(new Emitter());
        /**
         * Event that fires when the prompt contents change. The event is either
         * a `VSBufferReadableStream` stream with changed contents or an instance of
         * the `ResolveError` class representing a parsing failure case.
         *
         * `Note!` this field is meant to be used by the external consumers of the prompt
         *         contents provider that the classes that extend this abstract class.
         *         Please use the {@linkcode onChangeEmitter} event to provide a change
         *         event in your prompt contents implementation instead.
         */
        this.onContentChanged = this.onContentChangedEmitter.event;
        // ensure that the `onChangeEmitter` always fires with the correct context
        this.onChangeEmitter.fire = this.onChangeEmitter.fire.bind(this.onChangeEmitter);
        // subscribe to the change event emitted by an extending class
        this._register(this.onChangeEmitter.event(this.onContentsChanged, this));
    }
    /**
     * Internal common implementation of the event that should be fired when
     * prompt contents change.
     */
    onContentsChanged(event, cancellationToken) {
        const promise = (cancellationToken?.isCancellationRequested)
            ? Promise.reject(new CancellationError())
            : this.getContentsStream(event, cancellationToken);
        promise
            .then((stream) => {
            if (cancellationToken?.isCancellationRequested || this.disposed) {
                stream.destroy();
                throw new CancellationError();
            }
            this.onContentChangedEmitter.fire(stream);
        })
            .catch((error) => {
            if (error instanceof ResolveError) {
                this.onContentChangedEmitter.fire(error);
                return;
            }
            this.onContentChangedEmitter.fire(new FailedToResolveContentsStream(this.uri, error));
        });
        return this;
    }
    /**
     * Start producing the prompt contents data.
     */
    start() {
        assert(!this.disposed, 'Cannot start contents provider that was already disposed.');
        // `'full'` means "everything has changed"
        this.onContentsChanged('full');
        return this;
    }
}
__decorate([
    cancelPreviousCalls
], PromptContentsProviderBase.prototype, "onContentsChanged", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0Q29udGVudHNQcm92aWRlckJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbnRlbnRQcm92aWRlcnMvcHJvbXB0Q29udGVudHNQcm92aWRlckJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUc1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFFdEc7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNILE1BQU0sT0FBZ0IsMEJBRXBCLFNBQVEsb0JBQW9CO0lBeUI3QjtRQUNDLEtBQUssRUFBRSxDQUFDO1FBUlQ7Ozs7V0FJRztRQUNnQixvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXlCLENBQUMsQ0FBQztRQVUxRjs7O1dBR0c7UUFDYyw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF5QyxDQUFDLENBQUM7UUFFaEg7Ozs7Ozs7OztXQVNHO1FBQ2EscUJBQWdCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQztRQXRCckUsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDakYsOERBQThEO1FBQzlELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQW9CRDs7O09BR0c7SUFFSyxpQkFBaUIsQ0FDeEIsS0FBNEIsRUFDNUIsaUJBQXFDO1FBRXJDLE1BQU0sT0FBTyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLENBQUM7WUFDM0QsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFcEQsT0FBTzthQUNMLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLElBQUksaUJBQWlCLEVBQUUsdUJBQXVCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNqRSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQy9CLENBQUM7WUFFRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2hCLElBQUksS0FBSyxZQUFZLFlBQVksRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUV6QyxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQ2hDLElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FDbEQsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLO1FBQ1gsTUFBTSxDQUNMLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFDZCwyREFBMkQsQ0FDM0QsQ0FBQztRQUVGLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFL0IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0Q7QUE5Q1E7SUFEUCxtQkFBbUI7bUVBK0JuQiJ9