/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * @returns Returns a random port between 1025 and 65535.
 */
export function randomPort() {
    const min = 1025;
    const max = 65535;
    return min + Math.floor((max - min) * Math.random());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vcG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxNQUFNLFVBQVUsVUFBVTtJQUN6QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDakIsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLE9BQU8sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDdEQsQ0FBQyJ9