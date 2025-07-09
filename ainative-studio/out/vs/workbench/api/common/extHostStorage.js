/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
import { Emitter } from '../../../base/common/event.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export class ExtHostStorage {
    constructor(mainContext, _logService) {
        this._logService = _logService;
        this._onDidChangeStorage = new Emitter();
        this.onDidChangeStorage = this._onDidChangeStorage.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadStorage);
    }
    registerExtensionStorageKeysToSync(extension, keys) {
        this._proxy.$registerExtensionStorageKeysToSync(extension, keys);
    }
    async initializeExtensionStorage(shared, key, defaultValue) {
        const value = await this._proxy.$initializeExtensionStorage(shared, key);
        let parsedValue;
        if (value) {
            parsedValue = this.safeParseValue(shared, key, value);
        }
        return parsedValue || defaultValue;
    }
    setValue(shared, key, value) {
        return this._proxy.$setValue(shared, key, value);
    }
    $acceptValue(shared, key, value) {
        const parsedValue = this.safeParseValue(shared, key, value);
        if (parsedValue) {
            this._onDidChangeStorage.fire({ shared, key, value: parsedValue });
        }
    }
    safeParseValue(shared, key, value) {
        try {
            return JSON.parse(value);
        }
        catch (error) {
            // Do not fail this call but log it for diagnostics
            // https://github.com/microsoft/vscode/issues/132777
            this._logService.error(`[extHostStorage] unexpected error parsing storage contents (extensionId: ${key}, global: ${shared}): ${error}`);
        }
        return undefined;
    }
}
export const IExtHostStorage = createDecorator('IExtHostStorage');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBK0MsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBVTFGLE1BQU0sT0FBTyxjQUFjO0lBUzFCLFlBQ0MsV0FBK0IsRUFDZCxXQUF3QjtRQUF4QixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUx6Qix3QkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztRQUNqRSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBTTVELElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsa0NBQWtDLENBQUMsU0FBa0MsRUFBRSxJQUFjO1FBQ3BGLElBQUksQ0FBQyxNQUFNLENBQUMsbUNBQW1DLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxLQUFLLENBQUMsMEJBQTBCLENBQUMsTUFBZSxFQUFFLEdBQVcsRUFBRSxZQUFxQjtRQUNuRixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRXpFLElBQUksV0FBK0IsQ0FBQztRQUNwQyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsT0FBTyxXQUFXLElBQUksWUFBWSxDQUFDO0lBQ3BDLENBQUM7SUFFRCxRQUFRLENBQUMsTUFBZSxFQUFFLEdBQVcsRUFBRSxLQUFhO1FBQ25ELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQWUsRUFBRSxHQUFXLEVBQUUsS0FBYTtRQUN2RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNwRSxDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxNQUFlLEVBQUUsR0FBVyxFQUFFLEtBQWE7UUFDakUsSUFBSSxDQUFDO1lBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLG1EQUFtRDtZQUNuRCxvREFBb0Q7WUFDcEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsNEVBQTRFLEdBQUcsYUFBYSxNQUFNLE1BQU0sS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN6SSxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBR0QsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsaUJBQWlCLENBQUMsQ0FBQyJ9