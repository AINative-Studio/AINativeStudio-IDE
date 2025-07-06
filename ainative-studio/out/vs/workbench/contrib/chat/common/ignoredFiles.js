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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlZEZpbGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9pZ25vcmVkRmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU03RixNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQW9DLGtDQUFrQyxDQUFDLENBQUM7QUFReEksTUFBTSxPQUFPLGdDQUFnQztJQUE3QztRQUdrQixlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQXFDLENBQUM7SUFnQjVFLENBQUM7SUFkQSxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUF3QjtRQUNyRCw4QkFBOEI7UUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDdkQsT0FBTyxRQUFRLENBQUMsQ0FBQztZQUNoQixRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLEtBQUssQ0FBQztJQUNSLENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxRQUEyQztRQUN0RSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==