/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
export class ChatCodeBlockContextProviderService {
    constructor() {
        this._providers = new Map();
    }
    get providers() {
        return [...this._providers.values()];
    }
    registerProvider(provider, id) {
        this._providers.set(id, provider);
        return toDisposable(() => this._providers.delete(id));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrQ29udGV4dFByb3ZpZGVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29kZUJsb2NrQ29udGV4dFByb3ZpZGVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakYsTUFBTSxPQUFPLG1DQUFtQztJQUFoRDtRQUVrQixlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQTJDLENBQUM7SUFTbEYsQ0FBQztJQVBBLElBQUksU0FBUztRQUNaLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsUUFBeUMsRUFBRSxFQUFVO1FBQ3JFLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsQyxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7Q0FDRCJ9