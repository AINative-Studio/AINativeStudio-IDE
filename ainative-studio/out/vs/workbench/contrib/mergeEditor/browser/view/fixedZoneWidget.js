/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Event } from '../../../../../base/common/event.js';
export class FixedZoneWidget extends Disposable {
    static { this.counter = 0; }
    constructor(editor, viewZoneAccessor, afterLineNumber, height, viewZoneIdsToCleanUp) {
        super();
        this.editor = editor;
        this.overlayWidgetId = `fixedZoneWidget-${FixedZoneWidget.counter++}`;
        this.widgetDomNode = h('div.fixed-zone-widget').root;
        this.overlayWidget = {
            getId: () => this.overlayWidgetId,
            getDomNode: () => this.widgetDomNode,
            getPosition: () => null
        };
        this.viewZoneId = viewZoneAccessor.addZone({
            domNode: document.createElement('div'),
            afterLineNumber: afterLineNumber,
            heightInPx: height,
            ordinal: 50000 + 1,
            onComputedHeight: (height) => {
                this.widgetDomNode.style.height = `${height}px`;
            },
            onDomNodeTop: (top) => {
                this.widgetDomNode.style.top = `${top}px`;
            }
        });
        viewZoneIdsToCleanUp.push(this.viewZoneId);
        this._register(Event.runAndSubscribe(this.editor.onDidLayoutChange, () => {
            this.widgetDomNode.style.left = this.editor.getLayoutInfo().contentLeft + 'px';
        }));
        this.editor.addOverlayWidget(this.overlayWidget);
        this._register({
            dispose: () => {
                this.editor.removeOverlayWidget(this.overlayWidget);
            },
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4ZWRab25lV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy9maXhlZFpvbmVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQsTUFBTSxPQUFnQixlQUFnQixTQUFRLFVBQVU7YUFDeEMsWUFBTyxHQUFHLENBQUMsQUFBSixDQUFLO0lBVzNCLFlBQ2tCLE1BQW1CLEVBQ3BDLGdCQUF5QyxFQUN6QyxlQUF1QixFQUN2QixNQUFjLEVBQ2Qsb0JBQThCO1FBRTlCLEtBQUssRUFBRSxDQUFDO1FBTlMsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQVhwQixvQkFBZSxHQUFHLG1CQUFtQixlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztRQUcvRCxrQkFBYSxHQUFHLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNsRCxrQkFBYSxHQUFtQjtZQUNoRCxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWU7WUFDakMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhO1lBQ3BDLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1NBQ3ZCLENBQUM7UUFXRCxJQUFJLENBQUMsVUFBVSxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQztZQUMxQyxPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7WUFDdEMsZUFBZSxFQUFFLGVBQWU7WUFDaEMsVUFBVSxFQUFFLE1BQU07WUFDbEIsT0FBTyxFQUFFLEtBQUssR0FBRyxDQUFDO1lBQ2xCLGdCQUFnQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDO1lBQ2pELENBQUM7WUFDRCxZQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDckIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7WUFDM0MsQ0FBQztTQUNELENBQUMsQ0FBQztRQUNILG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1lBQ3hFLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDaEYsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRWpELElBQUksQ0FBQyxTQUFTLENBQUM7WUFDZCxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELENBQUM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDIn0=