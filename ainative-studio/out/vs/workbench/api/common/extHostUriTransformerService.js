/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export const IURITransformerService = createDecorator('IURITransformerService');
export class URITransformerService {
    constructor(delegate) {
        if (!delegate) {
            this.transformIncoming = arg => arg;
            this.transformOutgoing = arg => arg;
            this.transformOutgoingURI = arg => arg;
            this.transformOutgoingScheme = arg => arg;
        }
        else {
            this.transformIncoming = delegate.transformIncoming.bind(delegate);
            this.transformOutgoing = delegate.transformOutgoing.bind(delegate);
            this.transformOutgoingURI = delegate.transformOutgoingURI.bind(delegate);
            this.transformOutgoingScheme = delegate.transformOutgoingScheme.bind(delegate);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFVyaVRyYW5zZm9ybWVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VXJpVHJhbnNmb3JtZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQU8xRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUM7QUFFeEcsTUFBTSxPQUFPLHFCQUFxQjtJQVFqQyxZQUFZLFFBQWdDO1FBQzNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztRQUMzQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pFLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxRQUFRLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==