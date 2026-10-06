/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ISCMService } from '../../scm/common/scm.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IAINativeSettingsService } from '../common/ainativeSettingsService.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { gitCommitMessage_systemMessage, gitCommitMessage_userMessage } from '../common/prompt/prompts.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
export const IHooksService = createDecorator('ainativeHooksService');
const POST_COMMIT_DEBOUNCE_MS = 500;
let HooksService = class HooksService extends Disposable {
    constructor(_scmService, mainProcessService, _settingsService, _convertToLLMMessageService, _llmMessageService, _notificationService, _clipboardService) {
        super();
        this._scmService = _scmService;
        this._settingsService = _settingsService;
        this._convertToLLMMessageService = _convertToLLMMessageService;
        this._llmMessageService = _llmMessageService;
        this._notificationService = _notificationService;
        this._clipboardService = _clipboardService;
        this._repoDisposables = this._register(new DisposableMap());
        this._lastSeenHeadOfRepo = new Map();
        this._ainativeSCM = ProxyChannel.toService(mainProcessService.getChannel('ainative-channel-scm'));
        for (const repo of this._scmService.repositories) {
            this._watchRepo(repo);
        }
        this._register(this._scmService.onDidAddRepository(repo => this._watchRepo(repo)));
        this._register(this._scmService.onDidRemoveRepository(repo => {
            this._repoDisposables.deleteAndDispose(repo.id);
            this._lastSeenHeadOfRepo.delete(repo.id);
        }));
    }
    _isGitRepo(repo) {
        return repo.provider.contextValue === 'git';
    }
    _watchRepo(repo) {
        if (!this._isGitRepo(repo))
            return;
        const delayer = new ThrottledDelayer(POST_COMMIT_DEBOUNCE_MS);
        const listener = repo.provider.onDidChangeResources(() => {
            delayer.trigger(() => this._checkForNewCommit(repo)).catch(() => { });
        });
        this._repoDisposables.set(repo.id, { dispose: () => { listener.dispose(); delayer.dispose(); } });
        // seed the baseline so we don't fire on startup / initial repo discovery
        this._checkForNewCommit(repo, { seedOnly: true });
    }
    async _checkForNewCommit(repo, opts) {
        const enabled = this._settingsService.state.globalSettings.enableCommitMessageHook;
        if (!opts?.seedOnly && !enabled)
            return;
        const rootUri = repo.provider.rootUri;
        if (!rootUri?.fsPath)
            return;
        let log;
        try {
            log = await this._ainativeSCM.gitLog(rootUri.fsPath);
        }
        catch {
            return; // not a git repo on disk, or git unavailable - nothing to do
        }
        const latestHash = log.split('\n')[0]?.split('|')[0];
        if (!latestHash)
            return;
        const prevHash = this._lastSeenHeadOfRepo.get(repo.id);
        this._lastSeenHeadOfRepo.set(repo.id, latestHash);
        if (opts?.seedOnly || prevHash === undefined)
            return; // first observation - just establish baseline
        if (prevHash === latestHash)
            return; // resources changed but HEAD didn't move - not a commit
        await this._onNewCommitDetected(repo, rootUri.fsPath);
    }
    async _onNewCommitDetected(repo, path) {
        try {
            const [stat, sampledDiffs, branch, log] = await Promise.all([
                this._ainativeSCM.gitStat(path),
                this._ainativeSCM.gitSampledDiffs(path),
                this._ainativeSCM.gitBranch(path),
                this._ainativeSCM.gitLog(path),
            ]);
            const modelSelection = this._settingsService.state.modelSelectionOfFeature['SCM'] ?? null;
            const modelSelectionOptions = modelSelection
                ? this._settingsService.state.optionsOfModelSelection['SCM'][modelSelection.providerName]?.[modelSelection.modelName]
                : undefined;
            const overridesOfModel = this._settingsService.state.overridesOfModel;
            // note: stat/diffs reflect the working tree post-commit, which is typically
            // empty right after a clean commit; the log's latest entry carries the
            // actual commit subject, which is what we primarily summarize/surface here.
            const prompt = gitCommitMessage_userMessage(stat, sampledDiffs, branch, log);
            const simpleMessages = [{ role: 'user', content: prompt }];
            const { messages, separateSystemMessage } = this._convertToLLMMessageService.prepareLLMSimpleMessages({
                simpleMessages,
                systemMessage: gitCommitMessage_systemMessage,
                modelSelection,
                featureName: 'SCM',
            });
            const summary = await new Promise((resolve, reject) => {
                this._llmMessageService.sendLLMMessage({
                    messagesType: 'chatMessages',
                    messages,
                    separateSystemMessage: separateSystemMessage,
                    chatMode: null,
                    modelSelection,
                    modelSelectionOptions,
                    overridesOfModel,
                    onText: () => { },
                    onFinalMessage: (params) => {
                        const match = params.fullText.match(/<output>([\s\S]*?)<\/output>/i);
                        resolve(match ? match[1].trim() : params.fullText.trim());
                    },
                    onError: (error) => reject(error),
                    onAbort: () => reject(new CancellationError()),
                    logging: { loggingName: 'AINativeHooks - Post-Commit Summary' },
                });
            });
            if (!summary)
                return;
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
                            run: () => { this._clipboardService.writeText(summary); },
                        }],
                },
            });
        }
        catch (error) {
            if (!isCancellationError(error)) {
                console.error('[ainative hooks] failed to summarize commit', error);
            }
        }
    }
};
HooksService = __decorate([
    __param(0, ISCMService),
    __param(1, IMainProcessService),
    __param(2, IAINativeSettingsService),
    __param(3, IConvertToLLMMessageService),
    __param(4, ILLMMessageService),
    __param(5, INotificationService),
    __param(6, IClipboardService)
], HooksService);
registerSingleton(IHooksService, HooksService, 0 /* InstantiationType.Eager */);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'ainative.hooks.toggleCommitMessageHook',
            title: localize2('ainativeToggleCommitMessageHook', 'AINative Studio: Toggle "Summarize Commit" Hook'),
            f1: true,
        });
    }
    async run(accessor) {
        const settingsService = accessor.get(IAINativeSettingsService);
        const notificationService = accessor.get(INotificationService);
        const newVal = !settingsService.state.globalSettings.enableCommitMessageHook;
        await settingsService.setGlobalSetting('enableCommitMessageHook', newVal);
        notificationService.info(newVal
            ? localize2('ainativeHookEnabled', 'Commit-summary hook enabled: a suggested one-line summary will be shown after each commit.').value
            : localize2('ainativeHookDisabled', 'Commit-summary hook disabled.').value);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9va3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL2hvb2tzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBa0IsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9FLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBaUIxRixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFnQixzQkFBc0IsQ0FBQyxDQUFBO0FBRW5GLE1BQU0sdUJBQXVCLEdBQUcsR0FBRyxDQUFBO0FBRW5DLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxVQUFVO0lBT3BDLFlBQ2MsV0FBeUMsRUFDakMsa0JBQXVDLEVBQ2xDLGdCQUEyRCxFQUN4RCwyQkFBeUUsRUFDbEYsa0JBQXVELEVBQ3JELG9CQUEyRCxFQUM5RCxpQkFBcUQ7UUFFeEUsS0FBSyxFQUFFLENBQUE7UUFSdUIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFFWCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTBCO1FBQ3ZDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFDakUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNwQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQzdDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFYeEQscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBK0IsQ0FBQyxDQUFBO1FBQ25GLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO1FBYS9ELElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBc0Isa0JBQWtCLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQTtRQUV0SCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDL0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFTyxVQUFVLENBQUMsSUFBb0I7UUFDdEMsT0FBUSxJQUFJLENBQUMsUUFBZ0IsQ0FBQyxZQUFZLEtBQUssS0FBSyxDQUFBO0lBQ3JELENBQUM7SUFFTyxVQUFVLENBQUMsSUFBb0I7UUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQUUsT0FBTTtRQUVsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLGdCQUFnQixDQUFPLHVCQUF1QixDQUFDLENBQUE7UUFDbkUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDeEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQW9DLENBQUMsQ0FBQyxDQUFBO1FBQ3ZHLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFaEcseUVBQXlFO1FBQ3pFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQW9CLEVBQUUsSUFBNkI7UUFDbkYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUE7UUFDbEYsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTTtRQUV2QyxNQUFNLE9BQU8sR0FBSSxJQUFJLENBQUMsUUFBZ0IsQ0FBQyxPQUFPLENBQUE7UUFDOUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNO1lBQUUsT0FBTTtRQUU1QixJQUFJLEdBQVcsQ0FBQTtRQUNmLElBQUksQ0FBQztZQUNKLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyRCxDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTSxDQUFDLDZEQUE2RDtRQUNyRSxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLFVBQVU7WUFBRSxPQUFNO1FBRXZCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUVqRCxJQUFJLElBQUksRUFBRSxRQUFRLElBQUksUUFBUSxLQUFLLFNBQVM7WUFBRSxPQUFNLENBQUMsOENBQThDO1FBQ25HLElBQUksUUFBUSxLQUFLLFVBQVU7WUFBRSxPQUFNLENBQUMsd0RBQXdEO1FBRTVGLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFvQixFQUFFLElBQVk7UUFDcEUsSUFBSSxDQUFDO1lBQ0osTUFBTSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDM0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztnQkFDakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO2FBQzlCLENBQUMsQ0FBQTtZQUVGLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFBO1lBQ3pGLE1BQU0scUJBQXFCLEdBQUcsY0FBYztnQkFDM0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQztnQkFDckgsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUNaLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQTtZQUVyRSw0RUFBNEU7WUFDNUUsdUVBQXVFO1lBQ3ZFLDRFQUE0RTtZQUM1RSxNQUFNLE1BQU0sR0FBRyw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUM1RSxNQUFNLGNBQWMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFXLENBQUMsQ0FBQTtZQUNuRSxNQUFNLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLHdCQUF3QixDQUFDO2dCQUNyRyxjQUFjO2dCQUNkLGFBQWEsRUFBRSw4QkFBOEI7Z0JBQzdDLGNBQWM7Z0JBQ2QsV0FBVyxFQUFFLEtBQUs7YUFDbEIsQ0FBQyxDQUFBO1lBRUYsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDN0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQztvQkFDdEMsWUFBWSxFQUFFLGNBQWM7b0JBQzVCLFFBQVE7b0JBQ1IscUJBQXFCLEVBQUUscUJBQXNCO29CQUM3QyxRQUFRLEVBQUUsSUFBSTtvQkFDZCxjQUFjO29CQUNkLHFCQUFxQjtvQkFDckIsZ0JBQWdCO29CQUNoQixNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztvQkFDakIsY0FBYyxFQUFFLENBQUMsTUFBNEIsRUFBRSxFQUFFO3dCQUNoRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO3dCQUNwRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtvQkFDMUQsQ0FBQztvQkFDRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7b0JBQ2pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO29CQUM5QyxPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUscUNBQXFDLEVBQUU7aUJBQy9ELENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQyxDQUFBO1lBRUYsSUFBSSxDQUFDLE9BQU87Z0JBQUUsT0FBTTtZQUVwQixJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDO2dCQUNoQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7Z0JBQ3ZCLE9BQU8sRUFBRSxTQUFTLENBQUMsNEJBQTRCLEVBQUUscURBQXFELEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSztnQkFDdEgsT0FBTyxFQUFFO29CQUNSLE9BQU8sRUFBRSxDQUFDOzRCQUNULEVBQUUsRUFBRSxrQ0FBa0M7NEJBQ3RDLEtBQUssRUFBRSxTQUFTLENBQUMsMEJBQTBCLEVBQUUsTUFBTSxDQUFDLENBQUMsS0FBSzs0QkFDMUQsT0FBTyxFQUFFLEVBQUU7NEJBQ1gsS0FBSyxFQUFFLFNBQVM7NEJBQ2hCLE9BQU8sRUFBRSxJQUFJOzRCQUNiLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFBLENBQUMsQ0FBQzt5QkFDeEQsQ0FBQztpQkFDRjthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE3SUssWUFBWTtJQVFmLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsaUJBQWlCLENBQUE7R0FkZCxZQUFZLENBNklqQjtBQUVELGlCQUFpQixDQUFDLGFBQWEsRUFBRSxZQUFZLGtDQUEwQixDQUFBO0FBRXZFLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3Q0FBd0M7WUFDNUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxpQ0FBaUMsRUFBRSxpREFBaUQsQ0FBQztZQUN0RyxFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM5RCxNQUFNLE1BQU0sR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFBO1FBQzVFLE1BQU0sZUFBZSxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3pFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNO1lBQzlCLENBQUMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsNEZBQTRGLENBQUMsQ0FBQyxLQUFLO1lBQ3RJLENBQUMsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0NBQ0QsQ0FBQyxDQUFBIn0=