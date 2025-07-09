/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const editorFeatures = [];
/**
 * Registers an editor feature. Editor features will be instantiated only once, as soon as
 * the first code editor is instantiated.
 */
export function registerEditorFeature(ctor) {
    editorFeatures.push(ctor);
}
export function getEditorFeatures() {
    return editorFeatures.slice(0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9lZGl0b3JGZWF0dXJlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWFoRyxNQUFNLGNBQWMsR0FBd0IsRUFBRSxDQUFDO0FBRS9DOzs7R0FHRztBQUNILE1BQU0sVUFBVSxxQkFBcUIsQ0FBb0MsSUFBb0Q7SUFDNUgsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUF5QixDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUI7SUFDaEMsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMifQ==