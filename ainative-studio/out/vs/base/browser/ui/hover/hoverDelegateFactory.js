/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Lazy } from '../../../common/lazy.js';
const nullHoverDelegateFactory = () => ({
    get delay() { return -1; },
    dispose: () => { },
    showHover: () => { return undefined; },
});
let hoverDelegateFactory = nullHoverDelegateFactory;
const defaultHoverDelegateMouse = new Lazy(() => hoverDelegateFactory('mouse', false));
const defaultHoverDelegateElement = new Lazy(() => hoverDelegateFactory('element', false));
// TODO: Remove when getDefaultHoverDelegate is no longer used
export function setHoverDelegateFactory(hoverDelegateProvider) {
    hoverDelegateFactory = hoverDelegateProvider;
}
// TODO: Refine type for use in new IHoverService interface
export function getDefaultHoverDelegate(placement) {
    if (placement === 'element') {
        return defaultHoverDelegateElement.value;
    }
    return defaultHoverDelegateMouse.value;
}
// TODO: Create equivalent in IHoverService
export function createInstantHoverDelegate() {
    // Creates a hover delegate with instant hover enabled.
    // This hover belongs to the consumer and requires the them to dispose it.
    // Instant hover only makes sense for 'element' placement.
    return hoverDelegateFactory('element', true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJEZWxlZ2F0ZUZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2hvdmVyL2hvdmVyRGVsZWdhdGVGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUUvQyxNQUFNLHdCQUF3QixHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDdkMsSUFBSSxLQUFLLEtBQWEsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7SUFDbEIsU0FBUyxFQUFFLEdBQUcsRUFBRSxHQUFHLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztDQUN0QyxDQUFDLENBQUM7QUFFSCxJQUFJLG9CQUFvQixHQUEwRix3QkFBd0IsQ0FBQztBQUMzSSxNQUFNLHlCQUF5QixHQUFHLElBQUksSUFBSSxDQUFpQixHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN2RyxNQUFNLDJCQUEyQixHQUFHLElBQUksSUFBSSxDQUFpQixHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUUzRyw4REFBOEQ7QUFDOUQsTUFBTSxVQUFVLHVCQUF1QixDQUFDLHFCQUE4RztJQUNySixvQkFBb0IsR0FBRyxxQkFBcUIsQ0FBQztBQUM5QyxDQUFDO0FBRUQsMkRBQTJEO0FBQzNELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxTQUE4QjtJQUNyRSxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUM3QixPQUFPLDJCQUEyQixDQUFDLEtBQUssQ0FBQztJQUMxQyxDQUFDO0lBQ0QsT0FBTyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7QUFDeEMsQ0FBQztBQUVELDJDQUEyQztBQUMzQyxNQUFNLFVBQVUsMEJBQTBCO0lBQ3pDLHVEQUF1RDtJQUN2RCwwRUFBMEU7SUFDMUUsMERBQTBEO0lBQzFELE9BQU8sb0JBQW9CLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzlDLENBQUMifQ==