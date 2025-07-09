/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
export class TextModelPart extends Disposable {
    constructor() {
        super(...arguments);
        this._isDisposed = false;
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
    assertNotDisposed() {
        if (this._isDisposed) {
            throw new Error('TextModelPart is disposed!');
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3RleHRNb2RlbFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE1BQU0sT0FBTyxhQUFjLFNBQVEsVUFBVTtJQUE3Qzs7UUFDUyxnQkFBVyxHQUFHLEtBQUssQ0FBQztJQVc3QixDQUFDO0lBVGdCLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLENBQUM7SUFDUyxpQkFBaUI7UUFDMUIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==