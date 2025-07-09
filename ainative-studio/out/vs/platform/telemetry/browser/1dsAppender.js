/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractOneDataSystemAppender } from '../common/1dsAppender.js';
export class OneDataSystemWebAppender extends AbstractOneDataSystemAppender {
    constructor(isInternalTelemetry, eventPrefix, defaultData, iKeyOrClientFactory) {
        super(isInternalTelemetry, eventPrefix, defaultData, iKeyOrClientFactory);
        // If we cannot fetch the endpoint it means it is down and we should not send any telemetry.
        // This is most likely due to ad blockers
        fetch(this.endPointHealthUrl, { method: 'GET' }).catch(err => {
            this._aiCoreOrKey = undefined;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMWRzQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2Jyb3dzZXIvMWRzQXBwZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDZCQUE2QixFQUFvQixNQUFNLDBCQUEwQixDQUFDO0FBRzNGLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSw2QkFBNkI7SUFDMUUsWUFDQyxtQkFBNEIsRUFDNUIsV0FBbUIsRUFDbkIsV0FBMEMsRUFDMUMsbUJBQXNEO1FBRXRELEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFFMUUsNEZBQTRGO1FBQzVGLHlDQUF5QztRQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzVELElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIn0=