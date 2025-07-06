/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { observableFromEvent } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/configuration.js';
export var TestingConfigKeys;
(function (TestingConfigKeys) {
    TestingConfigKeys["AutoOpenPeekView"] = "testing.automaticallyOpenPeekView";
    TestingConfigKeys["AutoOpenPeekViewDuringContinuousRun"] = "testing.automaticallyOpenPeekViewDuringAutoRun";
    TestingConfigKeys["OpenResults"] = "testing.automaticallyOpenTestResults";
    TestingConfigKeys["FollowRunningTest"] = "testing.followRunningTest";
    TestingConfigKeys["DefaultGutterClickAction"] = "testing.defaultGutterClickAction";
    TestingConfigKeys["GutterEnabled"] = "testing.gutterEnabled";
    TestingConfigKeys["SaveBeforeTest"] = "testing.saveBeforeTest";
    TestingConfigKeys["AlwaysRevealTestOnStateChange"] = "testing.alwaysRevealTestOnStateChange";
    TestingConfigKeys["CountBadge"] = "testing.countBadge";
    TestingConfigKeys["ShowAllMessages"] = "testing.showAllMessages";
    TestingConfigKeys["CoveragePercent"] = "testing.displayedCoveragePercent";
    TestingConfigKeys["ShowCoverageInExplorer"] = "testing.showCoverageInExplorer";
    TestingConfigKeys["CoverageBarThresholds"] = "testing.coverageBarThresholds";
    TestingConfigKeys["CoverageToolbarEnabled"] = "testing.coverageToolbarEnabled";
})(TestingConfigKeys || (TestingConfigKeys = {}));
export var AutoOpenTesting;
(function (AutoOpenTesting) {
    AutoOpenTesting["NeverOpen"] = "neverOpen";
    AutoOpenTesting["OpenOnTestStart"] = "openOnTestStart";
    AutoOpenTesting["OpenOnTestFailure"] = "openOnTestFailure";
    AutoOpenTesting["OpenExplorerOnTestStart"] = "openExplorerOnTestStart";
})(AutoOpenTesting || (AutoOpenTesting = {}));
export var AutoOpenPeekViewWhen;
(function (AutoOpenPeekViewWhen) {
    AutoOpenPeekViewWhen["FailureVisible"] = "failureInVisibleDocument";
    AutoOpenPeekViewWhen["FailureAnywhere"] = "failureAnywhere";
    AutoOpenPeekViewWhen["Never"] = "never";
})(AutoOpenPeekViewWhen || (AutoOpenPeekViewWhen = {}));
export var DefaultGutterClickAction;
(function (DefaultGutterClickAction) {
    DefaultGutterClickAction["Run"] = "run";
    DefaultGutterClickAction["Debug"] = "debug";
    DefaultGutterClickAction["Coverage"] = "runWithCoverage";
    DefaultGutterClickAction["ContextMenu"] = "contextMenu";
})(DefaultGutterClickAction || (DefaultGutterClickAction = {}));
export var TestingCountBadge;
(function (TestingCountBadge) {
    TestingCountBadge["Failed"] = "failed";
    TestingCountBadge["Off"] = "off";
    TestingCountBadge["Passed"] = "passed";
    TestingCountBadge["Skipped"] = "skipped";
})(TestingCountBadge || (TestingCountBadge = {}));
export var TestingDisplayedCoveragePercent;
(function (TestingDisplayedCoveragePercent) {
    TestingDisplayedCoveragePercent["TotalCoverage"] = "totalCoverage";
    TestingDisplayedCoveragePercent["Statement"] = "statement";
    TestingDisplayedCoveragePercent["Minimum"] = "minimum";
})(TestingDisplayedCoveragePercent || (TestingDisplayedCoveragePercent = {}));
export const testingConfiguration = {
    id: 'testing',
    order: 21,
    title: localize('testConfigurationTitle', "Testing"),
    type: 'object',
    properties: {
        ["testing.automaticallyOpenPeekView" /* TestingConfigKeys.AutoOpenPeekView */]: {
            description: localize('testing.automaticallyOpenPeekView', "Configures when the error Peek view is automatically opened."),
            enum: [
                "failureAnywhere" /* AutoOpenPeekViewWhen.FailureAnywhere */,
                "failureInVisibleDocument" /* AutoOpenPeekViewWhen.FailureVisible */,
                "never" /* AutoOpenPeekViewWhen.Never */,
            ],
            default: "never" /* AutoOpenPeekViewWhen.Never */,
            enumDescriptions: [
                localize('testing.automaticallyOpenPeekView.failureAnywhere', "Open automatically no matter where the failure is."),
                localize('testing.automaticallyOpenPeekView.failureInVisibleDocument', "Open automatically when a test fails in a visible document."),
                localize('testing.automaticallyOpenPeekView.never', "Never automatically open."),
            ],
        },
        ["testing.showAllMessages" /* TestingConfigKeys.ShowAllMessages */]: {
            description: localize('testing.showAllMessages', "Controls whether to show messages from all test runs."),
            type: 'boolean',
            default: false,
        },
        ["testing.automaticallyOpenPeekViewDuringAutoRun" /* TestingConfigKeys.AutoOpenPeekViewDuringContinuousRun */]: {
            description: localize('testing.automaticallyOpenPeekViewDuringContinuousRun', "Controls whether to automatically open the Peek view during continuous run mode."),
            type: 'boolean',
            default: false,
        },
        ["testing.countBadge" /* TestingConfigKeys.CountBadge */]: {
            description: localize('testing.countBadge', 'Controls the count badge on the Testing icon on the Activity Bar.'),
            enum: [
                "failed" /* TestingCountBadge.Failed */,
                "off" /* TestingCountBadge.Off */,
                "passed" /* TestingCountBadge.Passed */,
                "skipped" /* TestingCountBadge.Skipped */,
            ],
            enumDescriptions: [
                localize('testing.countBadge.failed', 'Show the number of failed tests'),
                localize('testing.countBadge.off', 'Disable the testing count badge'),
                localize('testing.countBadge.passed', 'Show the number of passed tests'),
                localize('testing.countBadge.skipped', 'Show the number of skipped tests'),
            ],
            default: "failed" /* TestingCountBadge.Failed */,
        },
        ["testing.followRunningTest" /* TestingConfigKeys.FollowRunningTest */]: {
            description: localize('testing.followRunningTest', 'Controls whether the running test should be followed in the Test Explorer view.'),
            type: 'boolean',
            default: false,
        },
        ["testing.defaultGutterClickAction" /* TestingConfigKeys.DefaultGutterClickAction */]: {
            description: localize('testing.defaultGutterClickAction', 'Controls the action to take when left-clicking on a test decoration in the gutter.'),
            enum: [
                "run" /* DefaultGutterClickAction.Run */,
                "debug" /* DefaultGutterClickAction.Debug */,
                "runWithCoverage" /* DefaultGutterClickAction.Coverage */,
                "contextMenu" /* DefaultGutterClickAction.ContextMenu */,
            ],
            enumDescriptions: [
                localize('testing.defaultGutterClickAction.run', 'Run the test.'),
                localize('testing.defaultGutterClickAction.debug', 'Debug the test.'),
                localize('testing.defaultGutterClickAction.coverage', 'Run the test with coverage.'),
                localize('testing.defaultGutterClickAction.contextMenu', 'Open the context menu for more options.'),
            ],
            default: "run" /* DefaultGutterClickAction.Run */,
        },
        ["testing.gutterEnabled" /* TestingConfigKeys.GutterEnabled */]: {
            description: localize('testing.gutterEnabled', 'Controls whether test decorations are shown in the editor gutter.'),
            type: 'boolean',
            default: true,
        },
        ["testing.saveBeforeTest" /* TestingConfigKeys.SaveBeforeTest */]: {
            description: localize('testing.saveBeforeTest', 'Control whether save all dirty editors before running a test.'),
            type: 'boolean',
            default: true,
        },
        ["testing.automaticallyOpenTestResults" /* TestingConfigKeys.OpenResults */]: {
            enum: [
                "neverOpen" /* AutoOpenTesting.NeverOpen */,
                "openOnTestStart" /* AutoOpenTesting.OpenOnTestStart */,
                "openOnTestFailure" /* AutoOpenTesting.OpenOnTestFailure */,
                "openExplorerOnTestStart" /* AutoOpenTesting.OpenExplorerOnTestStart */,
            ],
            enumDescriptions: [
                localize('testing.openTesting.neverOpen', 'Never automatically open the testing views'),
                localize('testing.openTesting.openOnTestStart', 'Open the test results view when tests start'),
                localize('testing.openTesting.openOnTestFailure', 'Open the test result view on any test failure'),
                localize('testing.openTesting.openExplorerOnTestStart', 'Open the test explorer when tests start'),
            ],
            default: 'openOnTestStart',
            description: localize('testing.openTesting', "Controls when the testing view should open.")
        },
        ["testing.alwaysRevealTestOnStateChange" /* TestingConfigKeys.AlwaysRevealTestOnStateChange */]: {
            markdownDescription: localize('testing.alwaysRevealTestOnStateChange', "Always reveal the executed test when {0} is on. If this setting is turned off, only failed tests will be revealed.", '`#testing.followRunningTest#`'),
            type: 'boolean',
            default: false,
        },
        ["testing.showCoverageInExplorer" /* TestingConfigKeys.ShowCoverageInExplorer */]: {
            description: localize('testing.ShowCoverageInExplorer', "Whether test coverage should be down in the File Explorer view."),
            type: 'boolean',
            default: true,
        },
        ["testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */]: {
            markdownDescription: localize('testing.displayedCoveragePercent', "Configures what percentage is displayed by default for test coverage."),
            default: "totalCoverage" /* TestingDisplayedCoveragePercent.TotalCoverage */,
            enum: [
                "totalCoverage" /* TestingDisplayedCoveragePercent.TotalCoverage */,
                "statement" /* TestingDisplayedCoveragePercent.Statement */,
                "minimum" /* TestingDisplayedCoveragePercent.Minimum */,
            ],
            enumDescriptions: [
                localize('testing.displayedCoveragePercent.totalCoverage', 'A calculation of the combined statement, function, and branch coverage.'),
                localize('testing.displayedCoveragePercent.statement', 'The statement coverage.'),
                localize('testing.displayedCoveragePercent.minimum', 'The minimum of statement, function, and branch coverage.'),
            ],
        },
        ["testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */]: {
            markdownDescription: localize('testing.coverageBarThresholds', "Configures the colors used for percentages in test coverage bars."),
            default: { red: 0, yellow: 60, green: 90 },
            properties: {
                red: { type: 'number', minimum: 0, maximum: 100, default: 0 },
                yellow: { type: 'number', minimum: 0, maximum: 100, default: 60 },
                green: { type: 'number', minimum: 0, maximum: 100, default: 90 },
            },
        },
        ["testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */]: {
            description: localize('testing.coverageToolbarEnabled', 'Controls whether the coverage toolbar is shown in the editor.'),
            type: 'boolean',
            default: false, // todo@connor4312: disabled by default until UI sync
        },
    }
};
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'testing.openTesting',
        migrateFn: (value) => {
            return [["testing.automaticallyOpenTestResults" /* TestingConfigKeys.OpenResults */, { value }]];
        }
    }, {
        key: 'testing.automaticallyOpenResults', // insiders only during 1.96, remove after 1.97
        migrateFn: (value) => {
            return [["testing.automaticallyOpenTestResults" /* TestingConfigKeys.OpenResults */, { value }]];
        }
    }]);
export const getTestingConfiguration = (config, key) => config.getValue(key);
export const observeTestingConfiguration = (config, key) => observableFromEvent(config.onDidChangeConfiguration, () => getTestingConfiguration(config, key));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vY29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBOEIsVUFBVSxFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBRTNILE1BQU0sQ0FBTixJQUFrQixpQkFlakI7QUFmRCxXQUFrQixpQkFBaUI7SUFDbEMsMkVBQXNELENBQUE7SUFDdEQsMkdBQXNGLENBQUE7SUFDdEYseUVBQW9ELENBQUE7SUFDcEQsb0VBQStDLENBQUE7SUFDL0Msa0ZBQTZELENBQUE7SUFDN0QsNERBQXVDLENBQUE7SUFDdkMsOERBQXlDLENBQUE7SUFDekMsNEZBQXVFLENBQUE7SUFDdkUsc0RBQWlDLENBQUE7SUFDakMsZ0VBQTJDLENBQUE7SUFDM0MseUVBQW9ELENBQUE7SUFDcEQsOEVBQXlELENBQUE7SUFDekQsNEVBQXVELENBQUE7SUFDdkQsOEVBQXlELENBQUE7QUFDMUQsQ0FBQyxFQWZpQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBZWxDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGVBS2pCO0FBTEQsV0FBa0IsZUFBZTtJQUNoQywwQ0FBdUIsQ0FBQTtJQUN2QixzREFBbUMsQ0FBQTtJQUNuQywwREFBdUMsQ0FBQTtJQUN2QyxzRUFBbUQsQ0FBQTtBQUNwRCxDQUFDLEVBTGlCLGVBQWUsS0FBZixlQUFlLFFBS2hDO0FBRUQsTUFBTSxDQUFOLElBQWtCLG9CQUlqQjtBQUpELFdBQWtCLG9CQUFvQjtJQUNyQyxtRUFBMkMsQ0FBQTtJQUMzQywyREFBbUMsQ0FBQTtJQUNuQyx1Q0FBZSxDQUFBO0FBQ2hCLENBQUMsRUFKaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUlyQztBQUVELE1BQU0sQ0FBTixJQUFrQix3QkFLakI7QUFMRCxXQUFrQix3QkFBd0I7SUFDekMsdUNBQVcsQ0FBQTtJQUNYLDJDQUFlLENBQUE7SUFDZix3REFBNEIsQ0FBQTtJQUM1Qix1REFBMkIsQ0FBQTtBQUM1QixDQUFDLEVBTGlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFLekM7QUFFRCxNQUFNLENBQU4sSUFBa0IsaUJBS2pCO0FBTEQsV0FBa0IsaUJBQWlCO0lBQ2xDLHNDQUFpQixDQUFBO0lBQ2pCLGdDQUFXLENBQUE7SUFDWCxzQ0FBaUIsQ0FBQTtJQUNqQix3Q0FBbUIsQ0FBQTtBQUNwQixDQUFDLEVBTGlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFLbEM7QUFFRCxNQUFNLENBQU4sSUFBa0IsK0JBSWpCO0FBSkQsV0FBa0IsK0JBQStCO0lBQ2hELGtFQUErQixDQUFBO0lBQy9CLDBEQUF1QixDQUFBO0lBQ3ZCLHNEQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFKaUIsK0JBQStCLEtBQS9CLCtCQUErQixRQUloRDtBQUVELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUF1QjtJQUN2RCxFQUFFLEVBQUUsU0FBUztJQUNiLEtBQUssRUFBRSxFQUFFO0lBQ1QsS0FBSyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxTQUFTLENBQUM7SUFDcEQsSUFBSSxFQUFFLFFBQVE7SUFDZCxVQUFVLEVBQUU7UUFDWCw4RUFBb0MsRUFBRTtZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLDhEQUE4RCxDQUFDO1lBQzFILElBQUksRUFBRTs7OzthQUlMO1lBQ0QsT0FBTywwQ0FBNEI7WUFDbkMsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FBQyxtREFBbUQsRUFBRSxvREFBb0QsQ0FBQztnQkFDbkgsUUFBUSxDQUFDLDREQUE0RCxFQUFFLDZEQUE2RCxDQUFDO2dCQUNySSxRQUFRLENBQUMseUNBQXlDLEVBQUUsMkJBQTJCLENBQUM7YUFDaEY7U0FDRDtRQUNELG1FQUFtQyxFQUFFO1lBQ3BDLFdBQVcsRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsdURBQXVELENBQUM7WUFDekcsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsOEdBQXVELEVBQUU7WUFDeEQsV0FBVyxFQUFFLFFBQVEsQ0FBQyxzREFBc0QsRUFBRSxrRkFBa0YsQ0FBQztZQUNqSyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCx5REFBOEIsRUFBRTtZQUMvQixXQUFXLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG1FQUFtRSxDQUFDO1lBQ2hILElBQUksRUFBRTs7Ozs7YUFLTDtZQUNELGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMsMkJBQTJCLEVBQUUsaUNBQWlDLENBQUM7Z0JBQ3hFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxpQ0FBaUMsQ0FBQztnQkFDckUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGlDQUFpQyxDQUFDO2dCQUN4RSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsa0NBQWtDLENBQUM7YUFDMUU7WUFDRCxPQUFPLHlDQUEwQjtTQUNqQztRQUNELHVFQUFxQyxFQUFFO1lBQ3RDLFdBQVcsRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsaUZBQWlGLENBQUM7WUFDckksSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QscUZBQTRDLEVBQUU7WUFDN0MsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxvRkFBb0YsQ0FBQztZQUMvSSxJQUFJLEVBQUU7Ozs7O2FBS0w7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLGVBQWUsQ0FBQztnQkFDakUsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLGlCQUFpQixDQUFDO2dCQUNyRSxRQUFRLENBQUMsMkNBQTJDLEVBQUUsNkJBQTZCLENBQUM7Z0JBQ3BGLFFBQVEsQ0FBQyw4Q0FBOEMsRUFBRSx5Q0FBeUMsQ0FBQzthQUNuRztZQUNELE9BQU8sMENBQThCO1NBQ3JDO1FBQ0QsK0RBQWlDLEVBQUU7WUFDbEMsV0FBVyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxtRUFBbUUsQ0FBQztZQUNuSCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCxpRUFBa0MsRUFBRTtZQUNuQyxXQUFXLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLCtEQUErRCxDQUFDO1lBQ2hILElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDYjtRQUNELDRFQUErQixFQUFFO1lBQ2hDLElBQUksRUFBRTs7Ozs7YUFLTDtZQUNELGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMsK0JBQStCLEVBQUUsNENBQTRDLENBQUM7Z0JBQ3ZGLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSw2Q0FBNkMsQ0FBQztnQkFDOUYsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLCtDQUErQyxDQUFDO2dCQUNsRyxRQUFRLENBQUMsNkNBQTZDLEVBQUUseUNBQXlDLENBQUM7YUFDbEc7WUFDRCxPQUFPLEVBQUUsaUJBQWlCO1lBQzFCLFdBQVcsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsNkNBQTZDLENBQUM7U0FDM0Y7UUFDRCwrRkFBaUQsRUFBRTtZQUNsRCxtQkFBbUIsRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsb0hBQW9ILEVBQUUsK0JBQStCLENBQUM7WUFDN04sSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNkO1FBQ0QsaUZBQTBDLEVBQUU7WUFDM0MsV0FBVyxFQUFFLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxpRUFBaUUsQ0FBQztZQUMxSCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2I7UUFDRCw0RUFBbUMsRUFBRTtZQUNwQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsa0NBQWtDLEVBQUUsdUVBQXVFLENBQUM7WUFDMUksT0FBTyxxRUFBK0M7WUFDdEQsSUFBSSxFQUFFOzs7O2FBSUw7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUFDLGdEQUFnRCxFQUFFLHlFQUF5RSxDQUFDO2dCQUNySSxRQUFRLENBQUMsNENBQTRDLEVBQUUseUJBQXlCLENBQUM7Z0JBQ2pGLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSwwREFBMEQsQ0FBQzthQUNoSDtTQUNEO1FBQ0QsK0VBQXlDLEVBQUU7WUFDMUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLG1FQUFtRSxDQUFDO1lBQ25JLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzFDLFVBQVUsRUFBRTtnQkFDWCxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO2dCQUM3RCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO2dCQUNqRSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO2FBQ2hFO1NBQ0Q7UUFDRCxpRkFBMEMsRUFBRTtZQUMzQyxXQUFXLEVBQUUsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLCtEQUErRCxDQUFDO1lBQ3hILElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUssRUFBRSxxREFBcUQ7U0FDckU7S0FDRDtDQUNELENBQUM7QUFFRixRQUFRLENBQUMsRUFBRSxDQUFrQyxVQUFVLENBQUMsc0JBQXNCLENBQUM7S0FDN0UsK0JBQStCLENBQUMsQ0FBQztRQUNqQyxHQUFHLEVBQUUscUJBQXFCO1FBQzFCLFNBQVMsRUFBRSxDQUFDLEtBQXNCLEVBQThCLEVBQUU7WUFDakUsT0FBTyxDQUFDLDZFQUFnQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDO0tBQ0QsRUFBRTtRQUNGLEdBQUcsRUFBRSxrQ0FBa0MsRUFBRSwrQ0FBK0M7UUFDeEYsU0FBUyxFQUFFLENBQUMsS0FBc0IsRUFBOEIsRUFBRTtZQUNqRSxPQUFPLENBQUMsNkVBQWdDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7S0FDRCxDQUFDLENBQUMsQ0FBQztBQXlCTCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxDQUE4QixNQUE2QixFQUFFLEdBQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBMkIsR0FBRyxDQUFDLENBQUM7QUFFOUosTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsQ0FBOEIsTUFBNkIsRUFBRSxHQUFNLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUUsQ0FDNUssdUJBQXVCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMifQ==