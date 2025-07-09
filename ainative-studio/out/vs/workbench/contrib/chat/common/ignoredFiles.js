/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const ILanguageModelIgnoredFilesService = createDecorator('languageModelIgnoredFilesService');
export class LanguageModelIgnoredFilesService {
    constructor() {
        this._providers = new Set();
    }
    async fileIsIgnored(uri, token) {
        // Just use the first provider
        const provider = this._providers.values().next().value;
        return provider ?
            provider.isFileIgnored(uri, token) :
            false;
    }
    registerIgnoredFileProvider(provider) {
        this._providers.add(provider);
        return toDisposable(() => {
            this._providers.delete(provider);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlZEZpbGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2lnbm9yZWRGaWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTTdGLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLGVBQWUsQ0FBb0Msa0NBQWtDLENBQUMsQ0FBQztBQVF4SSxNQUFNLE9BQU8sZ0NBQWdDO0lBQTdDO1FBR2tCLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztJQWdCNUUsQ0FBQztJQWRBLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBUSxFQUFFLEtBQXdCO1FBQ3JELDhCQUE4QjtRQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztRQUN2RCxPQUFPLFFBQVEsQ0FBQyxDQUFDO1lBQ2hCLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDcEMsS0FBSyxDQUFDO0lBQ1IsQ0FBQztJQUVELDJCQUEyQixDQUFDLFFBQTJDO1FBQ3RFLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlCLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9