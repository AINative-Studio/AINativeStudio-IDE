/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Resizes an image provided as a UInt8Array string. Resizing is based on Open AI's algorithm for tokenzing images.
 * https://platform.openai.com/docs/guides/vision#calculating-costs
 * @param data - The UInt8Array string of the image to resize.
 * @returns A promise that resolves to the UInt8Array string of the resized image.
 */
export async function resizeImage(data) {
    if (typeof data === 'string') {
        data = convertStringToUInt8Array(data);
    }
    const blob = new Blob([data]);
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    return new Promise((resolve, reject) => {
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width <= 768 || height <= 768) {
                resolve(data);
                return;
            }
            // Calculate the new dimensions while maintaining the aspect ratio
            if (width > 2048 || height > 2048) {
                const scaleFactor = 2048 / Math.max(width, height);
                width = Math.round(width * scaleFactor);
                height = Math.round(height * scaleFactor);
            }
            const scaleFactor = 768 / Math.min(width, height);
            width = Math.round(width * scaleFactor);
            height = Math.round(height * scaleFactor);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve(new Uint8Array(reader.result));
                        };
                        reader.onerror = (error) => reject(error);
                        reader.readAsArrayBuffer(blob);
                    }
                    else {
                        reject(new Error('Failed to create blob from canvas'));
                    }
                }, 'image/png');
            }
            else {
                reject(new Error('Failed to get canvas context'));
            }
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(url);
            reject(error);
        };
    });
}
export function convertStringToUInt8Array(data) {
    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    if (isValidBase64(base64Data)) {
        return Uint8Array.from(atob(base64Data), char => char.charCodeAt(0));
    }
    return new TextEncoder().encode(data);
}
// Only used for URLs
export function convertUint8ArrayToString(data) {
    try {
        const decoder = new TextDecoder();
        const decodedString = decoder.decode(data);
        return decodedString;
    }
    catch {
        return '';
    }
}
function isValidBase64(str) {
    // checks if the string is a valid base64 string that is NOT encoded
    return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && (() => {
        try {
            atob(str);
            return true;
        }
        catch {
            return false;
        }
    })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hZ2VVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvaW1hZ2VVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRzs7Ozs7R0FLRztBQUVILE1BQU0sQ0FBQyxLQUFLLFVBQVUsV0FBVyxDQUFDLElBQXlCO0lBRTFELElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDOUIsSUFBSSxHQUFHLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDOUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUN4QixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBRWQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN0QyxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNqQixHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pCLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDO1lBRTVCLElBQUksS0FBSyxJQUFJLEdBQUcsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDZCxPQUFPO1lBQ1IsQ0FBQztZQUVELGtFQUFrRTtZQUNsRSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDO2dCQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ25ELEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbEQsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQztZQUUxQyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1lBQ3ZCLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO29CQUN0QixJQUFJLElBQUksRUFBRSxDQUFDO3dCQUNWLE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7d0JBQ2hDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFOzRCQUNwQixPQUFPLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQXFCLENBQUMsQ0FBQyxDQUFDO3dCQUN2RCxDQUFDLENBQUM7d0JBQ0YsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUMxQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2hDLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDO29CQUN4RCxDQUFDO2dCQUNGLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNqQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQztZQUNuRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBQ0YsR0FBRyxDQUFDLE9BQU8sR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3ZCLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2YsQ0FBQyxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLElBQVk7SUFDckQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ2xFLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDL0IsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBQ0QsT0FBTyxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QyxDQUFDO0FBRUQscUJBQXFCO0FBQ3JCLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxJQUFnQjtJQUN6RCxJQUFJLENBQUM7UUFDSixNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNSLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUFXO0lBQ2pDLG9FQUFvRTtJQUNwRSxPQUFPLHdCQUF3QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUNsRCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDVixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ04sQ0FBQyJ9