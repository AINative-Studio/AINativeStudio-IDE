/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
/**
 * The editor model is the heavyweight counterpart of editor input. Depending on the editor input, it
 * resolves from a file system retrieve content and may allow for saving it back or reverting it.
 * Editor models are typically cached for some while because they are expensive to construct.
 */
export class EditorModel extends Disposable {
    constructor() {
        super(...arguments);
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.resolved = false;
    }
    /**
     * Causes this model to resolve returning a promise when loading is completed.
     */
    async resolve() {
        this.resolved = true;
    }
    /**
     * Returns whether this model was loaded or not.
     */
    isResolved() {
        return this.resolved;
    }
    /**
     * Find out if this model has been disposed.
     */
    isDisposed() {
        return this._store.isDisposed;
    }
    /**
     * Subclasses should implement to free resources that have been claimed through loading.
     */
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvZWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUvRDs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLFdBQVksU0FBUSxVQUFVO0lBQTNDOztRQUVrQixtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzdELGtCQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7UUFFM0MsYUFBUSxHQUFHLEtBQUssQ0FBQztJQStCMUIsQ0FBQztJQTdCQTs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPO1FBQ1osSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7SUFDdEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztJQUMvQixDQUFDO0lBRUQ7O09BRUc7SUFDTSxPQUFPO1FBQ2YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUUzQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNEIn0=