/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ColorDecorationInjectedTextMarker } from '../colorDetector.js';
export function isOnColorDecorator(mouseEvent) {
    const target = mouseEvent.target;
    return !!target
        && target.type === 6 /* MouseTargetType.CONTENT_TEXT */
        && target.detail.injectedText?.options.attachedData === ColorDecorationInjectedTextMarker;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2hvdmVyQ29sb3JQaWNrZXIvaG92ZXJDb2xvclBpY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUd4RSxNQUFNLFVBQVUsa0JBQWtCLENBQUMsVUFBb0M7SUFDdEUsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztJQUNqQyxPQUFPLENBQUMsQ0FBQyxNQUFNO1dBQ1gsTUFBTSxDQUFDLElBQUkseUNBQWlDO1dBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxZQUFZLEtBQUssaUNBQWlDLENBQUM7QUFDNUYsQ0FBQyJ9