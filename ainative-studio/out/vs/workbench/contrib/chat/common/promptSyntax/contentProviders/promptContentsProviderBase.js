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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0Q29udGVudHNQcm92aWRlckJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29udGVudFByb3ZpZGVycy9wcm9tcHRDb250ZW50c1Byb3ZpZGVyQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUV0Rzs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBTSxPQUFnQiwwQkFFcEIsU0FBUSxvQkFBb0I7SUF5QjdCO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFSVDs7OztXQUlHO1FBQ2dCLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBeUIsQ0FBQyxDQUFDO1FBVTFGOzs7V0FHRztRQUNjLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXlDLENBQUMsQ0FBQztRQUVoSDs7Ozs7Ozs7O1dBU0c7UUFDYSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDO1FBdEJyRSwwRUFBMEU7UUFDMUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNqRiw4REFBOEQ7UUFDOUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBb0JEOzs7T0FHRztJQUVLLGlCQUFpQixDQUN4QixLQUE0QixFQUM1QixpQkFBcUM7UUFFckMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSx1QkFBdUIsQ0FBQztZQUMzRCxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDekMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVwRCxPQUFPO2FBQ0wsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDaEIsSUFBSSxpQkFBaUIsRUFBRSx1QkFBdUIsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDL0IsQ0FBQztZQUVELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDaEIsSUFBSSxLQUFLLFlBQVksWUFBWSxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRXpDLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FDaEMsSUFBSSw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUNsRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUs7UUFDWCxNQUFNLENBQ0wsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUNkLDJEQUEyRCxDQUMzRCxDQUFDO1FBRUYsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUvQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRDtBQTlDUTtJQURQLG1CQUFtQjttRUErQm5CIn0=