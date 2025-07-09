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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NBY2Nlc3NpYmlsaXR5U2lnbmFsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9wcm9ncmVzc2Jhci9wcm9ncmVzc0FjY2Vzc2liaWxpdHlTaWduYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSw0Q0FBNEMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzNELFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDZCxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQ2YsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7Q0FDbEIsQ0FBQyxDQUFDO0FBQ0gsSUFBSSwyQ0FBMkMsR0FBNkYsNENBQTRDLENBQUM7QUFFekwsTUFBTSxVQUFVLHdDQUF3QyxDQUFDLG9DQUE4SDtJQUN0TCwyQ0FBMkMsR0FBRyxvQ0FBb0MsQ0FBQztBQUNwRixDQUFDO0FBRUQsTUFBTSxVQUFVLHdDQUF3QyxDQUFDLFdBQW1CLEVBQUUsVUFBbUI7SUFDaEcsT0FBTywyQ0FBMkMsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDN0UsQ0FBQyJ9