/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { clearNode } from '../../../base/browser/dom.js';
import { createCSSRule, createStyleSheet } from '../../../base/browser/domStylesheets.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
export var ZIndex;
(function (ZIndex) {
    ZIndex[ZIndex["Base"] = 0] = "Base";
    ZIndex[ZIndex["Sash"] = 35] = "Sash";
    ZIndex[ZIndex["SuggestWidget"] = 40] = "SuggestWidget";
    ZIndex[ZIndex["Hover"] = 50] = "Hover";
    ZIndex[ZIndex["DragImage"] = 1000] = "DragImage";
    ZIndex[ZIndex["MenubarMenuItemsHolder"] = 2000] = "MenubarMenuItemsHolder";
    ZIndex[ZIndex["ContextView"] = 2500] = "ContextView";
    ZIndex[ZIndex["ModalDialog"] = 2600] = "ModalDialog";
    ZIndex[ZIndex["PaneDropOverlay"] = 10000] = "PaneDropOverlay";
})(ZIndex || (ZIndex = {}));
const ZIndexValues = Object.keys(ZIndex).filter(key => !isNaN(Number(key))).map(key => Number(key)).sort((a, b) => b - a);
function findBase(z) {
    for (const zi of ZIndexValues) {
        if (z >= zi) {
            return zi;
        }
    }
    return -1;
}
class ZIndexRegistry {
    constructor() {
        this.styleSheet = createStyleSheet();
        this.zIndexMap = new Map();
        this.scheduler = new RunOnceScheduler(() => this.updateStyleElement(), 200);
    }
    registerZIndex(relativeLayer, z, name) {
        if (this.zIndexMap.get(name)) {
            throw new Error(`z-index with name ${name} has already been registered.`);
        }
        const proposedZValue = relativeLayer + z;
        if (findBase(proposedZValue) !== relativeLayer) {
            throw new Error(`Relative layer: ${relativeLayer} + z-index: ${z} exceeds next layer ${proposedZValue}.`);
        }
        this.zIndexMap.set(name, proposedZValue);
        this.scheduler.schedule();
        return this.getVarName(name);
    }
    getVarName(name) {
        return `--z-index-${name}`;
    }
    updateStyleElement() {
        clearNode(this.styleSheet);
        let ruleBuilder = '';
        this.zIndexMap.forEach((zIndex, name) => {
            ruleBuilder += `${this.getVarName(name)}: ${zIndex};\n`;
        });
        createCSSRule(':root', ruleBuilder, this.styleSheet);
    }
}
const zIndexRegistry = new ZIndexRegistry();
export function registerZIndex(relativeLayer, z, name) {
    return zIndexRegistry.registerZIndex(relativeLayer, z, name);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiekluZGV4UmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbGF5b3V0L2Jyb3dzZXIvekluZGV4UmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVqRSxNQUFNLENBQU4sSUFBWSxNQVVYO0FBVkQsV0FBWSxNQUFNO0lBQ2pCLG1DQUFRLENBQUE7SUFDUixvQ0FBUyxDQUFBO0lBQ1Qsc0RBQWtCLENBQUE7SUFDbEIsc0NBQVUsQ0FBQTtJQUNWLGdEQUFnQixDQUFBO0lBQ2hCLDBFQUE2QixDQUFBO0lBQzdCLG9EQUFrQixDQUFBO0lBQ2xCLG9EQUFrQixDQUFBO0lBQ2xCLDZEQUF1QixDQUFBO0FBQ3hCLENBQUMsRUFWVyxNQUFNLEtBQU4sTUFBTSxRQVVqQjtBQUVELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDMUgsU0FBUyxRQUFRLENBQUMsQ0FBUztJQUMxQixLQUFLLE1BQU0sRUFBRSxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2IsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRUQsTUFBTSxjQUFjO0lBSW5CO1FBQ0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDM0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxjQUFjLENBQUMsYUFBcUIsRUFBRSxDQUFTLEVBQUUsSUFBWTtRQUM1RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSwrQkFBK0IsQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3pDLElBQUksUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLGFBQWEsRUFBRSxDQUFDO1lBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLGFBQWEsZUFBZSxDQUFDLHVCQUF1QixjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQzNHLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVPLFVBQVUsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sYUFBYSxJQUFJLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDM0IsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3ZDLFdBQVcsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssTUFBTSxLQUFLLENBQUM7UUFDekQsQ0FBQyxDQUFDLENBQUM7UUFDSCxhQUFhLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztBQUU1QyxNQUFNLFVBQVUsY0FBYyxDQUFDLGFBQXFCLEVBQUUsQ0FBUyxFQUFFLElBQVk7SUFDNUUsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUQsQ0FBQyJ9