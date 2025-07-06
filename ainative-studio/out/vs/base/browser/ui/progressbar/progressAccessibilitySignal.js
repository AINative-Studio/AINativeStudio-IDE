/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const nullScopedAccessibilityProgressSignalFactory = () => ({
    msLoopTime: -1,
    msDelayTime: -1,
    dispose: () => { },
});
let progressAccessibilitySignalSchedulerFactory = nullScopedAccessibilityProgressSignalFactory;
export function setProgressAcccessibilitySignalScheduler(progressAccessibilitySignalScheduler) {
    progressAccessibilitySignalSchedulerFactory = progressAccessibilitySignalScheduler;
}
export function getProgressAcccessibilitySignalScheduler(msDelayTime, msLoopTime) {
    return progressAccessibilitySignalSchedulerFactory(msDelayTime, msLoopTime);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvcHJvZ3Jlc3NiYXIvcHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sNENBQTRDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMzRCxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ2QsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUNmLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0NBQ2xCLENBQUMsQ0FBQztBQUNILElBQUksMkNBQTJDLEdBQTZGLDRDQUE0QyxDQUFDO0FBRXpMLE1BQU0sVUFBVSx3Q0FBd0MsQ0FBQyxvQ0FBOEg7SUFDdEwsMkNBQTJDLEdBQUcsb0NBQW9DLENBQUM7QUFDcEYsQ0FBQztBQUVELE1BQU0sVUFBVSx3Q0FBd0MsQ0FBQyxXQUFtQixFQUFFLFVBQW1CO0lBQ2hHLE9BQU8sMkNBQTJDLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQzdFLENBQUMifQ==