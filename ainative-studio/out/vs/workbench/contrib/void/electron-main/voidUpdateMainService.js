/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
let VoidMainUpdateService = class VoidMainUpdateService extends Disposable {
    constructor(_productService, _envMainService, _updateService) {
        super();
        this._productService = _productService;
        this._envMainService = _envMainService;
        this._updateService = _updateService;
    }
    async check(explicit) {
        const isDevMode = !this._envMainService.isBuilt; // found in abstractUpdateService.ts
        if (isDevMode) {
            return { message: null };
        }
        // if disabled and not explicitly checking, return early
        if (this._updateService.state.type === "disabled" /* StateType.Disabled */) {
            if (!explicit)
                return { message: null };
        }
        this._updateService.checkForUpdates(false); // implicity check, then handle result ourselves
        console.log('updateState', this._updateService.state);
        if (this._updateService.state.type === "uninitialized" /* StateType.Uninitialized */) {
            // The update service hasn't been initialized yet
            return { message: explicit ? 'Checking for updates soon...' : null, action: explicit ? 'reinstall' : undefined };
        }
        if (this._updateService.state.type === "idle" /* StateType.Idle */) {
            // No updates currently available
            return { message: explicit ? 'No updates found!' : null, action: explicit ? 'reinstall' : undefined };
        }
        if (this._updateService.state.type === "checking for updates" /* StateType.CheckingForUpdates */) {
            // Currently checking for updates
            return { message: explicit ? 'Checking for updates...' : null };
        }
        if (this._updateService.state.type === "available for download" /* StateType.AvailableForDownload */) {
            // Update available but requires manual download (mainly for Linux)
            return { message: 'A new update is available!', action: 'download', };
        }
        if (this._updateService.state.type === "downloading" /* StateType.Downloading */) {
            // Update is currently being downloaded
            return { message: explicit ? 'Currently downloading update...' : null };
        }
        if (this._updateService.state.type === "downloaded" /* StateType.Downloaded */) {
            // Update has been downloaded but not yet ready
            return { message: explicit ? 'An update is ready to be applied!' : null, action: 'apply' };
        }
        if (this._updateService.state.type === "updating" /* StateType.Updating */) {
            // Update is being applied
            return { message: explicit ? 'Applying update...' : null };
        }
        if (this._updateService.state.type === "ready" /* StateType.Ready */) {
            // Update is ready
            return { message: 'Restart Void to update!', action: 'restart' };
        }
        if (this._updateService.state.type === "disabled" /* StateType.Disabled */) {
            return await this._manualCheckGHTagIfDisabled(explicit);
        }
        return null;
    }
    async _manualCheckGHTagIfDisabled(explicit) {
        try {
            const response = await fetch('https://api.github.com/repos/voideditor/binaries/releases/latest');
            const data = await response.json();
            const version = data.tag_name;
            const myVersion = this._productService.version;
            const latestVersion = version;
            const isUpToDate = myVersion === latestVersion; // only makes sense if response.ok
            let message;
            let action;
            // explicit
            if (explicit) {
                if (response.ok) {
                    if (!isUpToDate) {
                        message = 'A new version of Void is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!';
                        action = 'reinstall';
                    }
                    else {
                        message = 'Void is up-to-date!';
                    }
                }
                else {
                    message = `An error occurred when fetching the latest GitHub release tag. Please try again in ~5 minutes, or reinstall.`;
                    action = 'reinstall';
                }
            }
            // not explicit
            else {
                if (response.ok && !isUpToDate) {
                    message = 'A new version of Void is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!';
                    action = 'reinstall';
                }
                else {
                    message = null;
                }
            }
            return { message, action };
        }
        catch (e) {
            if (explicit) {
                return {
                    message: `An error occurred when fetching the latest GitHub release tag: ${e}. Please try again in ~5 minutes.`,
                    action: 'reinstall',
                };
            }
            else {
                return { message: null };
            }
        }
    }
};
VoidMainUpdateService = __decorate([
    __param(0, IProductService),
    __param(1, IEnvironmentMainService),
    __param(2, IUpdateService)
], VoidMainUpdateService);
export { VoidMainUpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZU1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL3ZvaWRVcGRhdGVNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDbkgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQWEsTUFBTSw4Q0FBOEMsQ0FBQztBQU1sRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFHcEQsWUFDbUMsZUFBZ0MsRUFDeEIsZUFBd0MsRUFDakQsY0FBOEI7UUFFL0QsS0FBSyxFQUFFLENBQUE7UUFKMkIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ3hCLG9CQUFlLEdBQWYsZUFBZSxDQUF5QjtRQUNqRCxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7SUFHaEUsQ0FBQztJQUdELEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBaUI7UUFFNUIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQSxDQUFDLG9DQUFvQztRQUVwRixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQVcsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsd0RBQXdEO1FBQ3hELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSx3Q0FBdUIsRUFBRSxDQUFDO1lBQzNELElBQUksQ0FBQyxRQUFR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