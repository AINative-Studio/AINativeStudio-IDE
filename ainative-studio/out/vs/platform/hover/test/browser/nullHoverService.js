/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
export const NullHoverService = {
    _serviceBrand: undefined,
    hideHover: () => undefined,
    showInstantHover: () => undefined,
    showDelayedHover: () => undefined,
    setupDelayedHover: () => Disposable.None,
    setupDelayedHoverAtMouse: () => Disposable.None,
    setupManagedHover: () => Disposable.None,
    showAndFocusLastHover: () => undefined,
    showManagedHover: () => undefined
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbEhvdmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9ob3Zlci90ZXN0L2Jyb3dzZXIvbnVsbEhvdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHbEUsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQWtCO0lBQzlDLGFBQWEsRUFBRSxTQUFTO0lBQ3hCLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0lBQzFCLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7SUFDakMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztJQUNqQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtJQUN4Qyx3QkFBd0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtJQUMvQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBVztJQUMvQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0lBQ3RDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7Q0FDakMsQ0FBQyJ9