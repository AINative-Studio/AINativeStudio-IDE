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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1BZGRvbkltcG9ydGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3h0ZXJtL3h0ZXJtQWRkb25JbXBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQW1CN0QsTUFBTSxjQUFjLEdBQTJCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFekQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUM5QixLQUFLLENBQUMsV0FBVyxDQUF3QyxJQUFPO1FBQy9ELElBQUksS0FBSyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFDZCxLQUFLLFdBQVc7b0JBQUUsS0FBSyxHQUFHLENBQUMsTUFBTSxtQkFBbUIsQ0FBMEMsd0JBQXdCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLGNBQTBDLENBQUM7b0JBQUMsTUFBTTtnQkFDck0sS0FBSyxPQUFPO29CQUFFLEtBQUssR0FBRyxDQUFDLE1BQU0sbUJBQW1CLENBQXNDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxVQUFzQyxDQUFDO29CQUFDLE1BQU07Z0JBQ2pMLEtBQUssV0FBVztvQkFBRSxLQUFLLEdBQUcsQ0FBQyxNQUFNLG1CQUFtQixDQUEwQyx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsY0FBMEMsQ0FBQztvQkFBQyxNQUFNO2dCQUNyTSxLQUFLLFVBQVU7b0JBQUUsS0FBSyxHQUFHLENBQUMsTUFBTSxtQkFBbUIsQ0FBeUMsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLGFBQXlDLENBQUM7b0JBQUMsTUFBTTtnQkFDaE0sS0FBSyxRQUFRO29CQUFFLEtBQUssR0FBRyxDQUFDLE1BQU0sbUJBQW1CLENBQXVDLHFCQUFxQixFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxXQUF1QyxDQUFDO29CQUFDLE1BQU07Z0JBQ3RMLEtBQUssV0FBVztvQkFBRSxLQUFLLEdBQUcsQ0FBQyxNQUFNLG1CQUFtQixDQUEwQyx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsY0FBMEMsQ0FBQztvQkFBQyxNQUFNO2dCQUNyTSxLQUFLLFdBQVc7b0JBQUUsS0FBSyxHQUFHLENBQUMsTUFBTSxtQkFBbUIsQ0FBMEMsd0JBQXdCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLGNBQTBDLENBQUM7b0JBQUMsTUFBTTtnQkFDck0sS0FBSyxPQUFPO29CQUFFLEtBQUssR0FBRyxDQUFDLE1BQU0sbUJBQW1CLENBQXNDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxVQUFzQyxDQUFDO29CQUFDLE1BQU07WUFDbEwsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELENBQUM7WUFDRCxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsT0FBTyxLQUFpQyxDQUFDO0lBQzFDLENBQUM7Q0FDRCJ9