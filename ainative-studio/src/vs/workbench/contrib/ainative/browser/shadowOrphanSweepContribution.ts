/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IShadowWorkspaceService } from '../common/shadowWorkspaceService.js';

/**
 * #159 phase 2 bullet 4 (design doc SHADOW_WORKSPACE_DESIGN.md §4 "Disk space / cleanup" / §6):
 * if AINative Studio crashes or is force-quit while a thread's shadow workspace is active, the
 * shadow directory under `<tmpdir>/ainative-shadow/` is left behind on disk - disposeShadow()
 * only ever runs on normal thread-deletion/discard/promotion, never on an abnormal process exit.
 * This contribution sweeps those orphaned directories once, early in the NEXT startup, via
 * IShadowWorkspaceService.sweepOrphanedShadows() (the actual sweep logic, including the 24h
 * age-based safety margin against a concurrently-running second window, lives there - see that
 * method's own doc comment for why age rather than PID/liveness is the chosen signal).
 *
 * Registered at WorkbenchPhase.Eventually, same phase CloudBootstrapContribution (#184) uses for
 * its own best-effort, non-blocking startup work: this is disk housekeeping, not anything the user
 * is waiting on, so it must never compete with startup time for showing the editor.
 */
class ShadowOrphanSweepContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.ainative.shadowOrphanSweep';
	_serviceBrand: undefined;

	constructor(
		@IShadowWorkspaceService private readonly _shadowWorkspaceService: IShadowWorkspaceService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();
		this._sweep();
	}

	private async _sweep(): Promise<void> {
		try {
			const removed = await this._shadowWorkspaceService.sweepOrphanedShadows();
			if (removed.length > 0) {
				this._logService.info(`[ShadowOrphanSweep] Removed ${removed.length} orphaned shadow workspace director${removed.length === 1 ? 'y' : 'ies'} left over from a previous session: ${removed.join(', ')}`);
			}
		} catch (e) {
			// sweepOrphanedShadows is itself documented as never-throwing (best-effort per-entry), so
			// reaching this catch would mean something unexpected (e.g. the service itself failing to
			// construct) - still must never fail workbench startup over disk housekeeping.
			this._logService.error('[ShadowOrphanSweep] Unexpected error sweeping orphaned shadow workspaces:', e);
		}
	}
}

registerWorkbenchContribution2(ShadowOrphanSweepContribution.ID, ShadowOrphanSweepContribution, WorkbenchPhase.Eventually);
