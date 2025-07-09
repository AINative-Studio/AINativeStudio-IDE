/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { networkInterfaces } from 'os';
import { TernarySearchTree } from '../common/ternarySearchTree.js';
import * as uuid from '../common/uuid.js';
import { getMac } from './macAddress.js';
import { isWindows } from '../common/platform.js';
// http://www.techrepublic.com/blog/data-center/mac-address-scorecard-for-common-virtual-machine-platforms/
// VMware ESX 3, Server, Workstation, Player	00-50-56, 00-0C-29, 00-05-69
// Microsoft Hyper-V, Virtual Server, Virtual PC	00-03-FF
// Parallels Desktop, Workstation, Server, Virtuozzo	00-1C-42
// Virtual Iron 4	00-0F-4B
// Red Hat Xen	00-16-3E
// Oracle VM	00-16-3E
// XenSource	00-16-3E
// Novell Xen	00-16-3E
// Sun xVM VirtualBox	08-00-27
export const virtualMachineHint = new class {
    _isVirtualMachineMacAddress(mac) {
        if (!this._virtualMachineOUIs) {
            this._virtualMachineOUIs = TernarySearchTree.forStrings();
            // dash-separated
            this._virtualMachineOUIs.set('00-50-56', true);
            this._virtualMachineOUIs.set('00-0C-29', true);
            this._virtualMachineOUIs.set('00-05-69', true);
            this._virtualMachineOUIs.set('00-03-FF', true);
            this._virtualMachineOUIs.set('00-1C-42', true);
            this._virtualMachineOUIs.set('00-16-3E', true);
            this._virtualMachineOUIs.set('08-00-27', true);
            // colon-separated
            this._virtualMachineOUIs.set('00:50:56', true);
            this._virtualMachineOUIs.set('00:0C:29', true);
            this._virtualMachineOUIs.set('00:05:69', true);
            this._virtualMachineOUIs.set('00:03:FF', true);
            this._virtualMachineOUIs.set('00:1C:42', true);
            this._virtualMachineOUIs.set('00:16:3E', true);
            this._virtualMachineOUIs.set('08:00:27', true);
        }
        return !!this._virtualMachineOUIs.findSubstr(mac);
    }
    value() {
        if (this._value === undefined) {
            let vmOui = 0;
            let interfaceCount = 0;
            const interfaces = networkInterfaces();
            for (const name in interfaces) {
                const networkInterface = interfaces[name];
                if (networkInterface) {
                    for (const { mac, internal } of networkInterface) {
                        if (!internal) {
                            interfaceCount += 1;
                            if (this._isVirtualMachineMacAddress(mac.toUpperCase())) {
                                vmOui += 1;
                            }
                        }
                    }
                }
            }
            this._value = interfaceCount > 0
                ? vmOui / interfaceCount
                : 0;
        }
        return this._value;
    }
};
let machineId;
export async function getMachineId(errorLogger) {
    if (!machineId) {
        machineId = (async () => {
            const id = await getMacMachineId(errorLogger);
            return id || uuid.generateUuid(); // fallback, generate a UUID
        })();
    }
    return machineId;
}
async function getMacMachineId(errorLogger) {
    try {
        const crypto = await import('crypto');
        const macAddress = getMac();
        return crypto.createHash('sha256').update(macAddress, 'utf8').digest('hex');
    }
    catch (err) {
        errorLogger(err);
        return undefined;
    }
}
const SQM_KEY = 'Software\\Microsoft\\SQMClient';
export async function getSqmMachineId(errorLogger) {
    if (isWindows) {
        const Registry = await import('@vscode/windows-registry');
        try {
            return Registry.GetStringRegKey('HKEY_LOCAL_MACHINE', SQM_KEY, 'MachineId') || '';
        }
        catch (err) {
            errorLogger(err);
            return '';
        }
    }
    return '';
}
export async function getdevDeviceId(errorLogger) {
    try {
        const deviceIdPackage = await import('@vscode/deviceid');
        const id = await deviceIdPackage.getDeviceId();
        return id;
    }
    catch (err) {
        errorLogger(err);
        return uuid.generateUuid();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL2lkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLElBQUksQ0FBQztBQUN2QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEtBQUssSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFbEQsMkdBQTJHO0FBQzNHLHlFQUF5RTtBQUN6RSx5REFBeUQ7QUFDekQsNkRBQTZEO0FBQzdELDBCQUEwQjtBQUMxQix1QkFBdUI7QUFDdkIscUJBQXFCO0FBQ3JCLHFCQUFxQjtBQUNyQixzQkFBc0I7QUFDdEIsOEJBQThCO0FBQzlCLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUF3QixJQUFJO0lBS2xELDJCQUEyQixDQUFDLEdBQVc7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLEVBQVcsQ0FBQztZQUVuRSxpQkFBaUI7WUFDakIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLG1C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