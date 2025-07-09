/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebWorkerServer } from './webWorker.js';
let initialized = false;
export function initialize(factory) {
    if (initialized) {
        throw new Error('WebWorker already initialized!');
    }
    initialized = true;
    const webWorkerServer = new WebWorkerServer(msg => globalThis.postMessage(msg), (workerServer) => factory(workerServer));
    globalThis.onmessage = (e) => {
        webWorkerServer.onmessage(e.data);
    };
    return webWorkerServer;
}
export function bootstrapWebWorker(factory) {
    globalThis.onmessage = (_e) => {
        // Ignore first message in this case and initialize if not yet initialized
        if (!initialized) {
            initialize(factory);
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyQm9vdHN0cmFwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3dvcmtlci93ZWJXb3JrZXJCb290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUF5RSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQVd4SCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7QUFFeEIsTUFBTSxVQUFVLFVBQVUsQ0FBMkMsT0FBaUQ7SUFDckgsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUNELFdBQVcsR0FBRyxJQUFJLENBQUM7SUFFbkIsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLENBQzFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFDbEMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FDdkMsQ0FBQztJQUVGLFVBQVUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFlLEVBQUUsRUFBRTtRQUMxQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuQyxDQUFDLENBQUM7SUFFRixPQUFPLGVBQWUsQ0FBQztBQUN4QixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLE9BQW1EO0lBQ3JGLFVBQVUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFnQixFQUFFLEVBQUU7UUFDM0MsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsQ0FBQztJQUNGLENBQUMsQ0FBQztBQUNILENBQUMifQ==