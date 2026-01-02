/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { StorageTarget, StorageScope } from '../../../../platform/storage/common/storage.js';
import { IApplicationStorageMainService } from '../../../../platform/storage/electron-main/storageMainService.js';

import { IMetricsService } from '../common/metricsService.js';
import { PostHog } from 'posthog-node'
import {
	OPT_OUT_KEY,
	MACHINE_ID_KEY,
	OLD_MACHINE_ID_KEY,
	USER_MACHINE_ID_KEY,
	LEGACY_OPT_OUT_KEY,
	LEGACY_MACHINE_ID_KEY,
	LEGACY_OLD_MACHINE_ID_KEY,
	LEGACY_USER_MACHINE_ID_KEY
} from '../common/storageKeys.js';


const os = isWindows ? 'windows' : isMacintosh ? 'mac' : isLinux ? 'linux' : null
const _getOSInfo = () => {
	try {
		const { platform, arch } = process // see platform.ts
		return { platform, arch }
	}
	catch (e) {
		return { osInfo: { platform: '??', arch: '??' } }
	}
}
const osInfo = _getOSInfo()

// we'd like to use devDeviceId on telemetryService, but that gets sanitized by the time it gets here as 'someValue.devDeviceId'



export class MetricsMainService extends Disposable implements IMetricsService {
	_serviceBrand: undefined;

	private readonly client: PostHog

	private _initProperties: object = {}


	// helper - looks like this is stored in a .vscdb file in ~/Library/Application Support/Void
	private _memoStorage(key: string, target: StorageTarget, setValIfNotExist?: string) {
		const currVal = this._appStorage.get(key, StorageScope.APPLICATION)
		if (currVal !== undefined) return currVal
		const newVal = setValIfNotExist ?? generateUuid()
		this._appStorage.store(key, newVal, StorageScope.APPLICATION, target)
		return newVal
	}


	// this is old, eventually we can just delete this since all the keys will have been transferred over
	// returns 'NULL' or the old key
	private get oldId() {
		// check new storage key first
		const newOldId = this._appStorage.get(OLD_MACHINE_ID_KEY, StorageScope.APPLICATION)
		if (newOldId) return newOldId

		// Migrate from legacy void key if exists
		const legacyOldId = this._appStorage.get(LEGACY_OLD_MACHINE_ID_KEY, StorageScope.APPLICATION)
		if (legacyOldId) {
			this._appStorage.store(OLD_MACHINE_ID_KEY, legacyOldId, StorageScope.APPLICATION, StorageTarget.MACHINE)
			return legacyOldId
		}

		// put old key into new key if didn't already
		const oldValue = this._appStorage.get(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION) ?? 'NULL' // the old way of getting the key
		this._appStorage.store(OLD_MACHINE_ID_KEY, oldValue, StorageScope.APPLICATION, StorageTarget.MACHINE)
		return oldValue

		// in a few weeks we can replace above with this
		// private get oldId() {
		// 	return this._memoStorage(OLD_MACHINE_ID_KEY, StorageTarget.MACHINE, 'NULL')
		// }
	}


	// the main id
	private get distinctId() {
		// Migrate from legacy key if needed
		this._migrateMachineId();

		const oldId = this.oldId
		const setValIfNotExist = oldId === 'NULL' ? undefined : oldId
		return this._memoStorage(MACHINE_ID_KEY, StorageTarget.MACHINE, setValIfNotExist)
	}

	/**
	 * Migrate machine ID from legacy 'void.app.machineId' to 'ainative.app.machineId'
	 */
	private _migrateMachineId(): void {
		// Check if new key already exists
		const newKeyData = this._appStorage.get(MACHINE_ID_KEY, StorageScope.APPLICATION);
		if (newKeyData) {
			return; // Already migrated
		}

		// Read from legacy key
		const legacyData = this._appStorage.get(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION);
		if (!legacyData) {
			return; // No legacy data to migrate
		}

		// Migrate
		this._appStorage.store(MACHINE_ID_KEY, legacyData, StorageScope.APPLICATION, StorageTarget.MACHINE);
		this._appStorage.remove(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION);
		console.log('[AINative Migration] Successfully migrated machine ID from void.app.machineId to ainative.app.machineId');
	}

	// just to see if there are ever multiple machineIDs per userID (instead of this, we should just track by the user's email)
	private get userId() {
		// Migrate from legacy key if needed
		const newKeyData = this._appStorage.get(USER_MACHINE_ID_KEY, StorageScope.APPLICATION);
		if (!newKeyData) {
			const legacyData = this._appStorage.get(LEGACY_USER_MACHINE_ID_KEY, StorageScope.APPLICATION);
			if (legacyData) {
				this._appStorage.store(USER_MACHINE_ID_KEY, legacyData, StorageScope.APPLICATION, StorageTarget.USER);
			}
		}
		return this._memoStorage(USER_MACHINE_ID_KEY, StorageTarget.USER)
	}

	constructor(
		@IProductService private readonly _productService: IProductService,
		@IEnvironmentMainService private readonly _envMainService: IEnvironmentMainService,
		@IApplicationStorageMainService private readonly _appStorage: IApplicationStorageMainService,
	) {
		super()
		this.client = new PostHog('phc_UanIdujHiLp55BkUTjB1AuBXcasVkdqRwgnwRlWESH2', {
			host: 'https://us.i.posthog.com',
		})

		this.initialize() // async
	}

	/**
	 * Migrate opt-out setting from legacy 'void.app.optOutAll' to 'ainative.app.optOutAll'
	 */
	private _migrateOptOut(): void {
		// Check if new key already exists
		const newKeyData = this._appStorage.get(OPT_OUT_KEY, StorageScope.APPLICATION);
		if (newKeyData !== undefined) {
			return; // Already migrated
		}

		// Read from legacy key
		const legacyData = this._appStorage.get(LEGACY_OPT_OUT_KEY, StorageScope.APPLICATION);
		if (!legacyData) {
			return; // No legacy data to migrate
		}

		// Migrate
		this._appStorage.store(OPT_OUT_KEY, legacyData, StorageScope.APPLICATION, StorageTarget.MACHINE);
		this._appStorage.remove(LEGACY_OPT_OUT_KEY, StorageScope.APPLICATION);
		console.log('[AINative Migration] Successfully migrated opt-out setting from void.app.optOutAll to ainative.app.optOutAll');
	}

	async initialize() {
		// very important to await whenReady!
		await this._appStorage.whenReady

		// Migrate legacy storage keys
		this._migrateOptOut();

		const { commit, version, voidVersion, release, quality } = this._productService

		const isDevMode = !this._envMainService.isBuilt // found in abstractUpdateService.ts

		// custom properties we identify
		this._initProperties = {
			commit,
			vscodeVersion: version,
			voidVersion: voidVersion,
			release,
			os,
			quality,
			distinctId: this.distinctId,
			distinctIdUser: this.userId,
			oldId: this.oldId,
			isDevMode,
			...osInfo,
		}

		const identifyMessage = {
			distinctId: this.distinctId,
			properties: this._initProperties,
		}

		const didOptOut = this._appStorage.getBoolean(OPT_OUT_KEY, StorageScope.APPLICATION, false)

		console.log('User is opted out of basic Void metrics?', didOptOut)
		if (didOptOut) {
			this.client.optOut()
		}
		else {
			this.client.optIn()
			this.client.identify(identifyMessage)
		}


		console.log('Void posthog metrics info:', JSON.stringify(identifyMessage, null, 2))
	}


	capture: IMetricsService['capture'] = (event, params) => {
		const capture = { distinctId: this.distinctId, event, properties: params } as const
		// console.log('full capture:', this.distinctId)
		this.client.capture(capture)
	}

	setOptOut: IMetricsService['setOptOut'] = (newVal: boolean) => {
		if (newVal) {
			this._appStorage.store(OPT_OUT_KEY, 'true', StorageScope.APPLICATION, StorageTarget.MACHINE)
		}
		else {
			this._appStorage.remove(OPT_OUT_KEY, StorageScope.APPLICATION)
		}
	}

	async getDebuggingProperties() {
		return this._initProperties
	}
}


