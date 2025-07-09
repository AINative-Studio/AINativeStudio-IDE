/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { networkInterfaces } from 'os';
const invalidMacAddresses = new Set([
    '00:00:00:00:00:00',
    'ff:ff:ff:ff:ff:ff',
    'ac:de:48:00:11:22'
]);
function validateMacAddress(candidate) {
    const tempCandidate = candidate.replace(/\-/g, ':').toLowerCase();
    return !invalidMacAddresses.has(tempCandidate);
}
export function getMac() {
    const ifaces = networkInterfaces();
    for (const name in ifaces) {
        const networkInterface = ifaces[name];
        if (networkInterface) {
            for (const { mac } of networkInterface) {
                if (validateMacAddress(mac)) {
                    return mac;
                }
            }
        }
    }
    throw new Error('Unable to retrieve mac address (unexpected format)');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFjQWRkcmVzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvbWFjQWRkcmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFFdkMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUNuQyxtQkFBbUI7SUFDbkIsbUJBQW1CO0lBQ25CLG1CQUFtQjtDQUNuQixDQUFDLENBQUM7QUFFSCxTQUFTLGtCQUFrQixDQUFDLFNBQWlCO0lBQzVDLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2xFLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUVELE1BQU0sVUFBVSxNQUFNO0lBQ3JCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixFQUFFLENBQUM7SUFDbkMsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUMzQixNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsS0FBSyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM3QixPQUFPLEdBQUcsQ0FBQztnQkFDWixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO0FBQ3ZFLENBQUMifQ==