/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { rtrim } from '../../../../base/common/strings.js';
export function normalizeGitHubUrl(url) {
    // If the url has a .git suffix, remove it
    if (url.endsWith('.git')) {
        url = url.substr(0, url.length - 4);
    }
    // Remove trailing slash
    url = rtrim(url, '/');
    if (url.endsWith('/new')) {
        url = rtrim(url, '/new');
    }
    if (url.endsWith('/issues')) {
        url = rtrim(url, '/issues');
    }
    return url;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvY29tbW9uL2lzc3VlUmVwb3J0ZXJVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUzRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsR0FBVztJQUM3QywwQ0FBMEM7SUFDMUMsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDMUIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELHdCQUF3QjtJQUN4QixHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUV0QixJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUMxQixHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRUQsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDN0IsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELE9BQU8sR0FBRyxDQUFDO0FBQ1osQ0FBQyJ9