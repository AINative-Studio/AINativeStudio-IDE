/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export class EncryptionService {
    encrypt(value) {
        return Promise.resolve(value);
    }
    decrypt(value) {
        return Promise.resolve(value);
    }
    isEncryptionAvailable() {
        return Promise.resolve(false);
    }
    getKeyStorageProvider() {
        return Promise.resolve("basic_text" /* KnownStorageProvider.basicText */);
    }
    setUsePlainTextEncryption() {
        return Promise.resolve(undefined);
    }
}
registerSingleton(IEncryptionService, EncryptionService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VuY3J5cHRpb24vYnJvd3Nlci9lbmNyeXB0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQXdCLE1BQU0sNkRBQTZELENBQUM7QUFDdkgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRS9HLE1BQU0sT0FBTyxpQkFBaUI7SUFJN0IsT0FBTyxDQUFDLEtBQWE7UUFDcEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxPQUFPLENBQUMsS0FBYTtRQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLG1EQUFnQyxDQUFDO0lBQ3hELENBQUM7SUFFRCx5QkFBeUI7UUFDeEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixvQ0FBNEIsQ0FBQyJ9