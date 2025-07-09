/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../common/lifecycle.js';
import { autorun } from '../../common/observable.js';
import { createStyleSheet2 } from '../domStylesheets.js';
export function createStyleSheetFromObservable(css) {
    const store = new DisposableStore();
    const w = store.add(createStyleSheet2());
    store.add(autorun(reader => {
        w.setStyle(css.read(reader));
    }));
    return store;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tT2JzZXJ2YWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZG9tSW1wbC9kb21PYnNlcnZhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sNEJBQTRCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFekQsTUFBTSxVQUFVLDhCQUE4QixDQUFDLEdBQXdCO0lBQ3RFLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDcEMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7SUFDekMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDMUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNKLE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQyJ9