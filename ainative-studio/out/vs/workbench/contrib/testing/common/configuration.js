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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUc5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUE4QixVQUFVLEVBQW1DLE1BQU0sa0NBQWtDLENBQUM7QUFFM0gsTUFBTSxDQUFOLElBQWtCLGlCQWVqQjtBQWZELFdBQWtCLGlCQUFpQjtJQUNsQywyRUFBc0QsQ0FBQTtJQUN0RCwyR0FBc0YsQ0FBQTtJQUN0Rix5RUFBb0QsQ0FBQTtJQUNwRCxvRUFBK0MsQ0FBQTtJQUMvQyxrRkFBNkQsQ0FBQTtJQUM3RCw0REFBdUMsQ0FBQTtJQUN2Qyw4REFBeUMsQ0FBQTtJQUN6Qyw0RkFBdUUsQ0FBQTtJQUN2RSxzREFBaUMsQ0FBQTtJQUNqQyxnRUFBMkMsQ0FBQTtJQUMzQyx5RUFBb0QsQ0FBQTtJQUNwRCw4RUFBeUQsQ0FBQTtJQUN6RCw0RUFBdUQsQ0FBQTtJQUN2RCw4RUFBeUQsQ0FBQTtBQUMxRCxDQUFDLEVBZmlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFlbEM7QUFFRCxNQUFNLENBQU4sSUFBa0IsZUFLakI7QUFMRCxXQUFrQixlQUFlO0lBQ2hDLDBDQUF1QixDQUFBO0lBQ3ZCLHNEQUFtQyxDQUFBO0lBQ25DLDBEQUF1QyxDQUFBO0lBQ3ZDLHNFQUFtRCxDQUFBO0FBQ3BELENBQUMsRUFMaUIsZUFBZSxLQUFmLGVBQWUsUUFLaEM7QUFFRCxN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