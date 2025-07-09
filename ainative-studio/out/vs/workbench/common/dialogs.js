/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../base/common/async.js';
import { Emitter } from '../../base/common/event.js';
import { Disposable } from '../../base/common/lifecycle.js';
export class DialogsModel extends Disposable {
    constructor() {
        super(...arguments);
        this.dialogs = [];
        this._onWillShowDialog = this._register(new Emitter());
        this.onWillShowDialog = this._onWillShowDialog.event;
        this._onDidShowDialog = this._register(new Emitter());
        this.onDidShowDialog = this._onDidShowDialog.event;
    }
    show(dialog) {
        const promise = new DeferredPromise();
        const item = {
            args: dialog,
            close: result => {
                this.dialogs.splice(0, 1);
                if (result instanceof Error) {
                    promise.error(result);
                }
                else {
                    promise.complete(result);
                }
                this._onDidShowDialog.fire();
            }
        };
        this.dialogs.push(item);
        this._onWillShowDialog.fire();
        return {
            item,
            result: promise.p
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9ncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2RpYWxvZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUF3QjVELE1BQU0sT0FBTyxZQUFhLFNBQVEsVUFBVTtJQUE1Qzs7UUFFVSxZQUFPLEdBQXNCLEVBQUUsQ0FBQztRQUV4QixzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNoRSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1FBRXhDLHFCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQy9ELG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztJQTBCeEQsQ0FBQztJQXhCQSxJQUFJLENBQUMsTUFBbUI7UUFDdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxlQUFlLEVBQTZCLENBQUM7UUFFakUsTUFBTSxJQUFJLEdBQW9CO1lBQzdCLElBQUksRUFBRSxNQUFNO1lBQ1osS0FBSyxFQUFFLE1BQU0sQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxNQUFNLFlBQVksS0FBSyxFQUFFLENBQUM7b0JBQzdCLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMxQixDQUFDO2dCQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixDQUFDO1NBQ0QsQ0FBQztRQUVGLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUU5QixPQUFPO1lBQ04sSUFBSTtZQUNKLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNqQixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=