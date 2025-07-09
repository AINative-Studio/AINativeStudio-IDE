/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../base/common/assert.js';
import { clamp } from '../../../../base/common/numbers.js';
import { localize } from '../../../../nls.js';
import { chartsGreen, chartsRed, chartsYellow } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariableName } from '../../../../platform/theme/common/colorUtils.js';
import { getTotalCoveragePercent } from '../common/testCoverage.js';
export const percent = (cc) => clamp(cc.total === 0 ? 1 : cc.covered / cc.total, 0, 1);
const colorThresholds = [
    { color: `var(${asCssVariableName(chartsRed)})`, key: 'red' },
    { color: `var(${asCssVariableName(chartsYellow)})`, key: 'yellow' },
    { color: `var(${asCssVariableName(chartsGreen)})`, key: 'green' },
];
export const getCoverageColor = (pct, thresholds) => {
    let best = colorThresholds[0].color; //  red
    let distance = pct;
    for (const { key, color } of colorThresholds) {
        const t = thresholds[key] / 100;
        if (t && pct >= t && pct - t < distance) {
            best = color;
            distance = pct - t;
        }
    }
    return best;
};
const epsilon = 10e-8;
export const displayPercent = (value, precision = 2) => {
    const display = (value * 100).toFixed(precision);
    // avoid showing 100% coverage if it just rounds up:
    if (value < 1 - epsilon && display === '100') {
        return `${100 - (10 ** -precision)}%`;
    }
    return `${display}%`;
};
export const calculateDisplayedStat = (coverage, method) => {
    switch (method) {
        case "statement" /* TestingDisplayedCoveragePercent.Statement */:
            return percent(coverage.statement);
        case "minimum" /* TestingDisplayedCoveragePercent.Minimum */: {
            let value = percent(coverage.statement);
            if (coverage.branch) {
                value = Math.min(value, percent(coverage.branch));
            }
            if (coverage.declaration) {
                value = Math.min(value, percent(coverage.declaration));
            }
            return value;
        }
        case "totalCoverage" /* TestingDisplayedCoveragePercent.TotalCoverage */:
            return getTotalCoveragePercent(coverage.statement, coverage.branch, coverage.declaration);
        default:
            assertNever(method);
    }
};
export function getLabelForItem(result, testId, commonPrefixLen) {
    const parts = [];
    for (const id of testId.idsFromRoot()) {
        const item = result.getTestById(id.toString());
        if (!item) {
            break;
        }
        parts.push(item.label);
    }
    return parts.slice(commonPrefixLen).join(' \u203a ');
}
export var labels;
(function (labels) {
    labels.showingFilterFor = (label) => localize('testing.coverageForTest', "Showing \"{0}\"", label);
    labels.clickToChangeFiltering = localize('changePerTestFilter', 'Click to view coverage for a single test');
    labels.percentCoverage = (percent, precision) => localize('testing.percentCoverage', '{0} Coverage', displayPercent(percent, precision));
    labels.allTests = localize('testing.allTests', 'All tests');
    labels.pickShowCoverage = localize('testing.pickTest', 'Pick a test to show coverage for');
})(labels || (labels = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNvdmVyYWdlRGlzcGxheVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci9jb2RlQ292ZXJhZ2VEaXNwbGF5VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFHcEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFLcEUsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLENBQUMsRUFBa0IsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFdkcsTUFBTSxlQUFlLEdBQUc7SUFDdkIsRUFBRSxLQUFLLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7SUFDN0QsRUFBRSxLQUFLLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUU7SUFD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