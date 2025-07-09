/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../../amdX.js';
const importedAddons = new Map();
/**
 * Exposes a simple interface to consumers, encapsulating the messy import xterm
 * addon import and caching logic.
 */
export class XtermAddonImporter {
    async importAddon(name) {
        let addon = importedAddons.get(name);
        if (!addon) {
            switch (name) {
                case 'clipboard':
                    addon = (await importAMDNodeModule('@xterm/addon-clipboard', 'lib/addon-clipboard.js')).ClipboardAddon;
                    break;
                case 'image':
                    addon = (await importAMDNodeModule('@xterm/addon-image', 'lib/addon-image.js')).ImageAddon;
                    break;
                case 'ligatures':
                    addon = (await importAMDNodeModule('@xterm/addon-ligatures', 'lib/addon-ligatures.js')).LigaturesAddon;
                    break;
                case 'progress':
                    addon = (await importAMDNodeModule('@xterm/addon-progress', 'lib/addon-progress.js')).ProgressAddon;
                    break;
                case 'search':
                    addon = (await importAMDNodeModule('@xterm/addon-search', 'lib/addon-search.js')).SearchAddon;
                    break;
                case 'serialize':
                    addon = (await importAMDNodeModule('@xterm/addon-serialize', 'lib/addon-serialize.js')).SerializeAddon;
                    break;
                case 'unicode11':
                    addon = (await importAMDNodeModule('@xterm/addon-unicode11', 'lib/addon-unicode11.js')).Unicode11Addon;
                    break;
                case 'webgl':
                    addon = (await importAMDNodeModule('@xterm/addon-webgl', 'lib/addon-webgl.js')).WebglAddon;
                    break;
            }
            if (!addon) {
                throw new Error(`Could not load addon ${name}`);
            }
            importedAddons.set(name, addon);
        }
        return addon;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1BZGRvbkltcG9ydGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIveHRlcm0veHRlcm1BZGRvbkltcG9ydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBVWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBbUI3RCxNQUFNLGNBQWMsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV6RDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBQzlCLEtBQUssQ0FBQyxXQUFXLENBQXdDLElBQU87UUFDL0QsSUFBSSxLQUFLLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixRQUFRLElBQUksRUFBRSxDQUFDO2dCQUNkLEtBQUssV0FBVztvQkFBRSxLQUFLLEdBQUcsQ0FBQyxNQUFNLG1CQUFtQixDQUEwQyx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsY0FBMEMsQ0FBQztvQkFBQyxNQUFNO2dCQUNyTSxLQUFLLE9BQU87b0JBQUUsS0FBSyxHQUFHLENBQUMsTUFBTSxtQkFBbUIsQ0FBc0Msb0JBQW9CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFVBQXNDLENBQUM7b0JBQUMsTUFBTTtnQkFDakwsS0FBSyxXQUFXO29CQUFFLEtBQUssR0FBRyxDQUFDLE1BQU0sbUJBQW1CLENBQTBDLHdCQUF3QixFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxjQUEwQyxDQUFDO29CQUFDLE1BQU07Z0JBQ3JNLEtBQUssVUFBVTtvQkFBRSxLQUFLLEdBQUcsQ0FBQyxNQUFNLG1CQUFtQixDQUF5Qyx1QkFBdUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsYUFBeUMsQ0FBQztvQkFBQyxNQUFNO2dCQUNoTSxLQUFLLFFBQVE7b0JBQUUsS0FBSyxHQUFHLENBQUMsTUFBTSxtQkFBbUIsQ0FBdUMscUJBQXFCLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLFdBQXVDLENBQUM7b0JBQUMsTUFBTTtnQkFDdEwsS0FBSyxXQUFXO29CQUFFLEtBQUssR0FBRyxDQUFDLE1BQU0sbUJBQW1CLENBQTBDLHdCQUF3QixFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxjQUEwQyxDQUFDO29CQUFDLE1BQU07Z0JBQ3JNLEtBQUssV0FBVztvQkFBRSxLQUFLLEdBQUcsQ0FBQyxNQUFNLG1CQUFtQixDQUEwQyx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsY0FBMEMsQ0FBQztvQkFBQyxNQUFNO2dCQUNyTSxLQUFLLE9BQU87b0JBQUUsS0FBSyxHQUFHLENBQUMsTUFBTSxtQkFBbUIsQ0FBc0Msb0JBQW9CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFVBQXNDLENBQUM7b0JBQUMsTUFBTTtZQUNsTCxDQUFDO1lBQ0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDLENBQUM7WUFDakQsQ0FBQztZQUNELGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxPQUFPLEtBQWlDLENBQUM7SUFDMUMsQ0FBQztDQUNEIn0=