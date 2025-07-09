/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
export class SharedWebContentExtractorService {
    async readImage(uri, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }
        try {
            const response = await fetch(uri.toString(true), {
                headers: {
                    'Accept': 'image/*',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            const contentType = response.headers.get('content-type');
            if (!response.ok || !contentType?.startsWith('image/') || !/(webp|jpg|jpeg|gif|png|bmp)$/i.test(contentType)) {
                return undefined;
            }
            const content = VSBuffer.wrap(await response.bytes());
            return content;
        }
        catch (err) {
            console.log(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkV2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2ViQ29udGVudEV4dHJhY3Rvci9ub2RlL3NoYXJlZFdlYkNvbnRlbnRFeHRyYWN0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUsxRCxNQUFNLE9BQU8sZ0NBQWdDO0lBRzVDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBUSxFQUFFLEtBQXdCO1FBQ2pELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hELE9BQU8sRUFBRTtvQkFDUixRQUFRLEVBQUUsU0FBUztvQkFDbkIsWUFBWSxFQUFFLGFBQWE7aUJBQzNCO2FBQ0QsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDekQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQzlHLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDdEQsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==