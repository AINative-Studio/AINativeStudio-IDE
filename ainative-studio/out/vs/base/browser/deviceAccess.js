/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export async function requestUsbDevice(options) {
    const usb = navigator.usb;
    if (!usb) {
        return undefined;
    }
    const device = await usb.requestDevice({ filters: options?.filters ?? [] });
    if (!device) {
        return undefined;
    }
    return {
        deviceClass: device.deviceClass,
        deviceProtocol: device.deviceProtocol,
        deviceSubclass: device.deviceSubclass,
        deviceVersionMajor: device.deviceVersionMajor,
        deviceVersionMinor: device.deviceVersionMinor,
        deviceVersionSubminor: device.deviceVersionSubminor,
        manufacturerName: device.manufacturerName,
        productId: device.productId,
        productName: device.productName,
        serialNumber: device.serialNumber,
        usbVersionMajor: device.usbVersionMajor,
        usbVersionMinor: device.usbVersionMinor,
        usbVersionSubminor: device.usbVersionSubminor,
        vendorId: device.vendorId,
    };
}
export async function requestSerialPort(options) {
    const serial = navigator.serial;
    if (!serial) {
        return undefined;
    }
    const port = await serial.requestPort({ filters: options?.filters ?? [] });
    if (!port) {
        return undefined;
    }
    const info = port.getInfo();
    return {
        usbVendorId: info.usbVendorId,
        usbProductId: info.usbProductId
    };
}
export async function requestHidDevice(options) {
    const hid = navigator.hid;
    if (!hid) {
        return undefined;
    }
    const devices = await hid.requestDevice({ filters: options?.filters ?? [] });
    if (!devices.length) {
        return undefined;
    }
    const device = devices[0];
    return {
        opened: device.opened,
        vendorId: device.vendorId,
        productId: device.productId,
        productName: device.productName,
        collections: device.collections
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2aWNlQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2RldmljZUFjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXFCaEcsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxPQUFpQztJQUN2RSxNQUFNLEdBQUcsR0FBSSxTQUFpQixDQUFDLEdBQUcsQ0FBQztJQUNuQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDVixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1RSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsT0FBTztRQUNOLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztRQUMvQixjQUFjLEVBQUUsTUFBTSxDQUFDLGNBQWM7UUFDckMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxjQUFjO1FBQ3JDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7UUFDN0Msa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtRQUM3QyxxQkFBcUIsRUFBRSxNQUFNLENBQUMscUJBQXFCO1FBQ25ELGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7UUFDekMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO1FBQzNCLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztRQUMvQixZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7UUFDakMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlO1FBQ3ZDLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZTtRQUN2QyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1FBQzdDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtLQUN6QixDQUFDO0FBQ0gsQ0FBQztBQVNELE1BQU0sQ0FBQyxLQUFLLFVBQVUsaUJBQWlCLENBQUMsT0FBaUM7SUFDeEUsTUFBTSxNQUFNLEdBQUksU0FBaUIsQ0FBQyxNQUFNLENBQUM7SUFDekMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDM0UsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1gsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM1QixPQUFPO1FBQ04sV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1FBQzdCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtLQUMvQixDQUFDO0FBQ0gsQ0FBQztBQVlELE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsT0FBaUM7SUFDdkUsTUFBTSxHQUFHLEdBQUksU0FBaUIsQ0FBQyxHQUFHLENBQUM7SUFDbkMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ1YsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDN0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNyQixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFCLE9BQU87UUFDTixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07UUFDckIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1FBQ3pCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztRQUMzQixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7UUFDL0IsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO0tBQy9CLENBQUM7QUFDSCxDQUFDIn0=