/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExplorerTestCoverageBars_1;
import { h } from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import * as coverUtils from './codeCoverageDisplayUtils.js';
import { getTestingConfiguration, observeTestingConfiguration } from '../common/configuration.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
let ManagedTestCoverageBars = class ManagedTestCoverageBars extends Disposable {
    /** Gets whether coverage is currently visible for the resource. */
    get visible() {
        return !!this._coverage;
    }
    constructor(options, configurationService, hoverService) {
        super();
        this.options = options;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.el = new Lazy(() => {
            if (this.options.compact) {
                const el = h('.test-coverage-bars.compact', [
                    h('.tpc@overall'),
                    h('.bar@tpcBar'),
                ]);
                this.attachHover(el.tpcBar, getOverallHoverText);
                return el;
            }
            else {
                const el = h('.test-coverage-bars', [
                    h('.tpc@overall'),
                    h('.bar@statement'),
                    h('.bar@function'),
                    h('.bar@branch'),
                ]);
                this.attachHover(el.statement, stmtCoverageText);
                this.attachHover(el.function, fnCoverageText);
                this.attachHover(el.branch, branchCoverageText);
                return el;
            }
        });
        this.visibleStore = this._register(new DisposableStore());
        this.customHovers = [];
    }
    attachHover(target, factory) {
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), target, () => this._coverage && factory(this._coverage)));
    }
    setCoverageInfo(coverage) {
        const ds = this.visibleStore;
        if (!coverage) {
            if (this._coverage) {
                this._coverage = undefined;
                this.customHovers.forEach(c => c.hide());
                ds.clear();
            }
            return;
        }
        if (!this._coverage) {
            const root = this.el.value.root;
            ds.add(toDisposable(() => root.remove()));
            this.options.container.appendChild(root);
            ds.add(this.configurationService.onDidChangeConfiguration(c => {
                if (!this._coverage) {
                    return;
                }
                if (c.affectsConfiguration("testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */) || c.affectsConfiguration("testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */)) {
                    this.doRender(this._coverage);
                }
            }));
        }
        this._coverage = coverage;
        this.doRender(coverage);
    }
    doRender(coverage) {
        const el = this.el.value;
        const precision = this.options.compact ? 0 : 2;
        const thresholds = getTestingConfiguration(this.configurationService, "testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */);
        const overallStat = coverUtils.calculateDisplayedStat(coverage, getTestingConfiguration(this.configurationService, "testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */));
        if (this.options.overall !== false) {
            el.overall.textContent = coverUtils.displayPercent(overallStat, precision);
        }
        else {
            el.overall.style.display = 'none';
        }
        if ('tpcBar' in el) { // compact mode
            renderBar(el.tpcBar, overallStat, false, thresholds);
        }
        else {
            renderBar(el.statement, coverUtils.percent(coverage.statement), coverage.statement.total === 0, thresholds);
            renderBar(el.function, coverage.declaration && coverUtils.percent(coverage.declaration), coverage.declaration?.total === 0, thresholds);
            renderBar(el.branch, coverage.branch && coverUtils.percent(coverage.branch), coverage.branch?.total === 0, thresholds);
        }
    }
};
ManagedTestCoverageBars = __decorate([
    __param(1, IConfigurationService),
    __param(2, IHoverService)
], ManagedTestCoverageBars);
export { ManagedTestCoverageBars };
const barWidth = 16;
const renderBar = (bar, pct, isZero, thresholds) => {
    if (pct === undefined) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'block';
    bar.style.width = `${barWidth}px`;
    // this is floored so the bar is only completely filled at 100% and not 99.9%
    bar.style.setProperty('--test-bar-width', `${Math.floor(pct * 16)}px`);
    if (isZero) {
        bar.style.color = 'currentColor';
        bar.style.opacity = '0.5';
        return;
    }
    bar.style.color = coverUtils.getCoverageColor(pct, thresholds);
    bar.style.opacity = '1';
};
const nf = new Intl.NumberFormat();
const stmtCoverageText = (coverage) => localize('statementCoverage', '{0}/{1} statements covered ({2})', nf.format(coverage.statement.covered), nf.format(coverage.statement.total), coverUtils.displayPercent(coverUtils.percent(coverage.statement)));
const fnCoverageText = (coverage) => coverage.declaration && localize('functionCoverage', '{0}/{1} functions covered ({2})', nf.format(coverage.declaration.covered), nf.format(coverage.declaration.total), coverUtils.displayPercent(coverUtils.percent(coverage.declaration)));
const branchCoverageText = (coverage) => coverage.branch && localize('branchCoverage', '{0}/{1} branches covered ({2})', nf.format(coverage.branch.covered), nf.format(coverage.branch.total), coverUtils.displayPercent(coverUtils.percent(coverage.branch)));
const getOverallHoverText = (coverage) => {
    const str = [
        stmtCoverageText(coverage),
        fnCoverageText(coverage),
        branchCoverageText(coverage),
    ].filter(isDefined).join('\n\n');
    return {
        markdown: new MarkdownString().appendText(str),
        markdownNotSupportedFallback: str
    };
};
/**
 * Renders test coverage bars for a resource in the given container. It will
 * not render anything unless a test coverage report has been opened.
 */
let ExplorerTestCoverageBars = class ExplorerTestCoverageBars extends ManagedTestCoverageBars {
    static { ExplorerTestCoverageBars_1 = this; }
    static { this.hasRegistered = false; }
    static register() {
        if (this.hasRegistered) {
            return;
        }
        this.hasRegistered = true;
        Registry.as("workbench.registry.explorer.fileContributions" /* ExplorerExtensions.FileContributionRegistry */).register({
            create(insta, container) {
                return insta.createInstance(ExplorerTestCoverageBars_1, { compact: true, container });
            },
        });
    }
    constructor(options, configurationService, hoverService, testCoverageService) {
        super(options, configurationService, hoverService);
        this.resource = observableValue(this, undefined);
        const isEnabled = observeTestingConfiguration(configurationService, "testing.showCoverageInExplorer" /* TestingConfigKeys.ShowCoverageInExplorer */);
        this._register(autorun(async (reader) => {
            let info;
            const coverage = testCoverageService.selected.read(reader);
            if (coverage && isEnabled.read(reader)) {
                const resource = this.resource.read(reader);
                if (resource) {
                    info = coverage.getComputedForUri(resource);
                }
            }
            this.setCoverageInfo(info);
        }));
    }
    /** @inheritdoc */
    setResource(resource, transaction) {
        this.resource.set(resource, transaction);
    }
    setCoverageInfo(coverage) {
        super.setCoverageInfo(coverage);
        this.options.container?.classList.toggle('explorer-item-with-test-coverage', this.visible);
    }
};
ExplorerTestCoverageBars = ExplorerTestCoverageBars_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IHoverService),
    __param(3, ITestCoverageService)
], ExplorerTestCoverageBars);
export { ExplorerTestCoverageBars };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlQmFycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdENvdmVyYWdlQmFycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXBELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakcsT0FBTyxFQUFnQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE9BQU8sS0FBSyxVQUFVLE1BQU0sK0JBQStCLENBQUM7QUFDNUQsT0FBTyxFQUFvRCx1QkFBdUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRXBKLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBcUJqRSxJQUFN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