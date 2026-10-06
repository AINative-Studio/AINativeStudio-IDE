/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js'
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js'
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js'
import { ISCMService, ISCMRepository } from '../../scm/common/scm.js'
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js'
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js'
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js'
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js'
import { ThrottledDelayer } from '../../../../base/common/async.js'
import { localize2 } from '../../../../nls.js'
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js'
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js'
import { IAINativeSettingsService } from '../common/ainativeSettingsService.js'
import { IAINativeSCMService } from '../common/ainativeSCMTypes.js'
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js'
import { ILLMMessageService } from '../common/sendLLMMessageService.js'
import { gitCommitMessage_systemMessage, gitCommitMessage_userMessage } from '../common/prompt/prompts.js'
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js'

/**
 * Hooks: event-driven agent automation (issue #162).
 *
 * This is a first, intentionally narrow slice: exactly one built-in hook,
 * "summarize the commit that was just made," triggered by observing SCM
 * resource changes + a HEAD diff (see HOOKS_DESIGN.md §4a for why a true
 * `onDidCommit` event isn't reachable from the workbench side without a new
 * extension-host IPC bridge). Generic hook authoring is out of scope here;
 * see HOOKS_DESIGN.md for the full design and future phases.
 */

export interface IHooksService {
	readonly _serviceBrand: undefined
}

export const IHooksService = createDecorator<IHooksService>('ainativeHooksService')

const POST_COMMIT_DEBOUNCE_MS = 500

class HooksService extends Disposable implements IHooksService {
	readonly _serviceBrand: undefined

	private readonly _repoDisposables = this._register(new DisposableMap<string, { dispose(): void }>())
	private readonly _lastSeenHeadOfRepo = new Map<string, string>()
	private readonly _ainativeSCM: IAINativeSCMService

	constructor(
		@ISCMService private readonly _scmService: ISCMService,
		@IMainProcessService mainProcessService: IMainProcessService,
		@IAINativeSettingsService private readonly _settingsService: IAINativeSettingsService,
		@IConvertToLLMMessageService private readonly _convertToLLMMessageService: IConvertToLLMMessageService,
		@ILLMMessageService private readonly _llmMessageService: ILLMMessageService,
		@INotificationService private readonly _notificationService: INotificationService,
		@IClipboardService private readonly _clipboardService: IClipboardService,
	) {
		super()
		this._ainativeSCM = ProxyChannel.toService<IAINativeSCMService>(mainProcessService.getChannel('ainative-channel-scm'))

		for (const repo of this._scmService.repositories) {
			this._watchRepo(repo)
		}
		this._register(this._scmService.onDidAddRepository(repo => this._watchRepo(repo)))
		this._register(this._scmService.onDidRemoveRepository(repo => {
			this._repoDisposables.deleteAndDispose(repo.id)
			this._lastSeenHeadOfRepo.delete(repo.id)
		}))
	}

	private _isGitRepo(repo: ISCMRepository): boolean {
		return (repo.provider as any).contextValue === 'git'
	}

	private _watchRepo(repo: ISCMRepository) {
		if (!this._isGitRepo(repo)) return

		const delayer = new ThrottledDelayer<void>(POST_COMMIT_DEBOUNCE_MS)
		const listener = repo.provider.onDidChangeResources(() => {
			delayer.trigger(() => this._checkForNewCommit(repo)).catch(() => { /* superseded trigger, ignore */ })
		})
		this._repoDisposables.set(repo.id, { dispose: () => { listener.dispose(); delayer.dispose() } })

		// seed the baseline so we don't fire on startup / initial repo discovery
		this._checkForNewCommit(repo, { seedOnly: true })
	}

	private async _checkForNewCommit(repo: ISCMRepository, opts?: { seedOnly?: boolean }) {
		const enabled = this._settingsService.state.globalSettings.enableCommitMessageHook
		if (!opts?.seedOnly && !enabled) return

		const rootUri = (repo.provider as any).rootUri
		if (!rootUri?.fsPath) return

		let log: string
		try {
			log = await this._ainativeSCM.gitLog(rootUri.fsPath)
		} catch {
			return // not a git repo on disk, or git unavailable - nothing to do
		}

		const latestHash = log.split('\n')[0]?.split('|')[0]
		if (!latestHash) return

		const prevHash = this._lastSeenHeadOfRepo.get(repo.id)
		this._lastSeenHeadOfRepo.set(repo.id, latestHash)

		if (opts?.seedOnly || prevHash === undefined) return // first observation - just establish baseline
		if (prevHash === latestHash) return // resources changed but HEAD didn't move - not a commit

		await this._onNewCommitDetected(repo, rootUri.fsPath)
	}

	private async _onNewCommitDetected(repo: ISCMRepository, path: string) {
		try {
			const [stat, sampledDiffs, branch, log] = await Promise.all([
				this._ainativeSCM.gitStat(path),
				this._ainativeSCM.gitSampledDiffs(path),
				this._ainativeSCM.gitBranch(path),
				this._ainativeSCM.gitLog(path),
			])

			const modelSelection = this._settingsService.state.modelSelectionOfFeature['SCM'] ?? null
			const modelSelectionOptions = modelSelection
				? this._settingsService.state.optionsOfModelSelection['SCM'][modelSelection.providerName]?.[modelSelection.modelName]
				: undefined
			const overridesOfModel = this._settingsService.state.overridesOfModel

			// note: stat/diffs reflect the working tree post-commit, which is typically
			// empty right after a clean commit; the log's latest entry carries the
			// actual commit subject, which is what we primarily summarize/surface here.
			const prompt = gitCommitMessage_userMessage(stat, sampledDiffs, branch, log)
			const simpleMessages = [{ role: 'user', content: prompt } as const]
			const { messages, separateSystemMessage } = this._convertToLLMMessageService.prepareLLMSimpleMessages({
				simpleMessages,
				systemMessage: gitCommitMessage_systemMessage,
				modelSelection,
				featureName: 'SCM',
			})

			const summary = await new Promise<string>((resolve, reject) => {
				this._llmMessageService.sendLLMMessage({
					messagesType: 'chatMessages',
					messages,
					separateSystemMessage: separateSystemMessage!,
					chatMode: null,
					modelSelection,
					modelSelectionOptions,
					overridesOfModel,
					onText: () => { },
					onFinalMessage: (params: { fullText: string }) => {
						const match = params.fullText.match(/<output>([\s\S]*?)<\/output>/i)
						resolve(match ? match[1].trim() : params.fullText.trim())
					},
					onError: (error) => reject(error),
					onAbort: () => reject(new CancellationError()),
					logging: { loggingName: 'AINativeHooks - Post-Commit Summary' },
				})
			})

			if (!summary) return

			this._notificationService.notify({
				severity: Severity.Info,
				message: localize2('ainativeHooksCommitSummary', 'Cody: suggested summary for the last commit:\n"{0}"', summary).value,
				actions: {
					primary: [{
						id: 'ainative.hooks.copyCommitSummary',
						label: localize2('ainativeHooksCopySummary', 'Copy').value,
						tooltip: '',
						class: undefined,
						enabled: true,
						run: () => { this._clipboardService.writeText(summary) },
					}],
				},
			})
		} catch (error) {
			if (!isCancellationError(error)) {
				console.error('[ainative hooks] failed to summarize commit', error)
			}
		}
	}
}

registerSingleton(IHooksService, HooksService, InstantiationType.Eager)

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'ainative.hooks.toggleCommitMessageHook',
			title: localize2('ainativeToggleCommitMessageHook', 'AINative Studio: Toggle "Summarize Commit" Hook'),
			f1: true,
		})
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const settingsService = accessor.get(IAINativeSettingsService)
		const notificationService = accessor.get(INotificationService)
		const newVal = !settingsService.state.globalSettings.enableCommitMessageHook
		await settingsService.setGlobalSetting('enableCommitMessageHook', newVal)
		notificationService.info(newVal
			? localize2('ainativeHookEnabled', 'Commit-summary hook enabled: a suggested one-line summary will be shown after each commit.').value
			: localize2('ainativeHookDisabled', 'Commit-summary hook disabled.').value)
	}
})
