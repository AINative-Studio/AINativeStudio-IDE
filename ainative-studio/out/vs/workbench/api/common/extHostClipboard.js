/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
export class ExtHostClipboard {
    constructor(mainContext) {
        const proxy = mainContext.getProxy(MainContext.MainThreadClipboard);
        this.value = Object.freeze({
            readText() {
                return proxy.$readText();
            },
            writeText(value) {
                return proxy.$writeText(value);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENsaXBib2FyZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q2xpcGJvYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZ0IsV0FBVyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHbEUsTUFBTSxPQUFPLGdCQUFnQjtJQUk1QixZQUFZLFdBQXlCO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQzFCLFFBQVE7Z0JBQ1AsT0FBTyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDMUIsQ0FBQztZQUNELFNBQVMsQ0FBQyxLQUFhO2dCQUN0QixPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsQ0FBQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9