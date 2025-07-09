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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2aWNlQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9kZXZpY2VBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFxQmhHLE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsT0FBaUM7SUFDdkUsTUFBTSxHQUFHLEdBQUksU0FBaUIsQ0FBQyxHQUFHLENBQUM7SUFDbkMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ1YsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE9BQU87UUFDTixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7UUFDL0IsY0FBYyxFQUFFLE1BQU0sQ0FBQyxjQUFjO1FBQ3JDLGNBQWMsRUFBRSxNQUFNLENBQUMsY0FBYztRQUNyQyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1FBQzdDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7UUFDN0MscUJBQXFCLEVBQUUsTUFBTSxDQUFDLHFCQUFxQjtRQUNuRCxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO1FBQ3pDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztRQUMzQixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7UUFDL0IsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZO1FBQ2pDLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZTtRQUN2QyxlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWU7UUFDdkMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtRQUM3QyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7S0FDekIsQ0FBQztBQUNILENBQUM7QUFTRCxNQUFNLENBQUMsS0FBSyxVQUFVLGlCQUFpQixDQUFDLE9BQWlDO0lBQ3hFLE1BQU0sTUFBTSxHQUFJLFNBQWlCLENBQUMsTUFBTSxDQUFDO0lBQ3pDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzNFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUIsT0FBTztRQUNOLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztRQUM3QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7S0FDL0IsQ0FBQztBQUNILENBQUM7QUFZRCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUFDLE9BQWlDO0lBQ3ZFLE1BQU0sR0FBRyxHQUFJLFNBQWlCLENBQUMsR0FBRyxDQUFDO0lBQ25DLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNWLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxNQUFNLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDckIsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQixPQUFPO1FBQ04sTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1FBQ3JCLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtRQUN6QixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7UUFDM0IsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1FBQy9CLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztLQUMvQixDQUFDO0FBQ0gsQ0FBQyJ9