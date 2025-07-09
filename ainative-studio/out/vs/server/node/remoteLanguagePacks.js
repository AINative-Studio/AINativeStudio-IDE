/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileAccess } from '../../base/common/network.js';
import { join } from '../../base/common/path.js';
import { resolveNLSConfiguration } from '../../base/node/nls.js';
import { Promises } from '../../base/node/pfs.js';
import product from '../../platform/product/common/product.js';
const nlsMetadataPath = join(FileAccess.asFileUri('').fsPath);
const defaultMessagesFile = join(nlsMetadataPath, 'nls.messages.json');
const nlsConfigurationCache = new Map();
export async function getNLSConfiguration(language, userDataPath) {
    if (!product.commit || !(await Promises.exists(defaultMessagesFile))) {
        return {
            userLocale: 'en',
            osLocale: 'en',
            resolvedLanguage: 'en',
            defaultMessagesFile,
            // NLS: below 2 are a relic from old times only used by vscode-nls and deprecated
            locale: 'en',
            availableLanguages: {}
        };
    }
    const cacheKey = `${language}||${userDataPath}`;
    let result = nlsConfigurationCache.get(cacheKey);
    if (!result) {
        result = resolveNLSConfiguration({ userLocale: language, osLocale: language, commit: product.commit, userDataPath, nlsMetadataPath });
        nlsConfigurationCache.set(cacheKey, result);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlTGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9yZW1vdGVMYW5ndWFnZVBhY2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFakQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xELE9BQU8sT0FBTyxNQUFNLDBDQUEwQyxDQUFDO0FBRS9ELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzlELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3ZFLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUM7QUFFNUUsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxRQUFnQixFQUFFLFlBQW9CO0lBQy9FLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdEUsT0FBTztZQUNOLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFFBQVEsRUFBRSxJQUFJO1lBQ2QsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixtQkFBbUI7WUFFbkIsaUZBQWlGO1lBQ2pGLE1BQU0sRUFBRSxJQUFJO1lBQ1osa0JBQWtCLEVBQUUsRUFBRTtTQUN0QixDQUFDO0lBQ0gsQ0FBQztJQUVELE1BQU0sUUFBUSxHQUFHLEdBQUcsUUFBUSxLQUFLLFlBQVksRUFBRSxDQUFDO0lBQ2hELElBQUksTUFBTSxHQUFHLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixNQUFNLEdBQUcsdUJBQXVCLENBQUMsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDdEkscUJBQXFCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDIn0=