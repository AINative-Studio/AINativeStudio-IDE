/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as processes from '../../../../node/processes.js';
const sender = processes.createQueuedSender(process);
process.on('message', msg => {
    sender.send(msg);
});
sender.send('ready');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9wcm9jZXNzZXMvZml4dHVyZXMvZm9yay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssU0FBUyxNQUFNLCtCQUErQixDQUFDO0FBRTNELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBTSxPQUFPLENBQUMsQ0FBQztBQUUxRCxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUMzQixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyJ9