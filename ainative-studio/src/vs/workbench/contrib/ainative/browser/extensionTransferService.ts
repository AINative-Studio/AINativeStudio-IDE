/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { env } from '../../../../base/common/process.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { TransferEditorType, TransferFilesInfo } from './extensionTransferTypes.js';


export interface IExtensionTransferService {
	readonly _serviceBrand: undefined; // services need this, just leave it undefined
	transferExtensions(os: 'mac' | 'windows' | 'linux' | null, fromEditor: TransferEditorType): Promise<string | undefined>
	deleteBlacklistExtensions(os: 'mac' | 'windows' | 'linux' | null): Promise<void>

}

export const IExtensionTransferService = createDecorator<IExtensionTransferService>('ExtensionTransferService');





// Define extensions to skip when transferring
const extensionBlacklist = [
	// ignore extensions
	'ms-vscode-remote.remote', // ms-vscode-remote.remote-ssh, ms-vscode-remote.remote-wsl
	'ms-vscode.remote', // ms-vscode.remote-explorer
	// ignore other AI copilots that could conflict with Void keybindings
	'sourcegraph.cody-ai',
	'continue.continue',
	'codeium.codeium',
	'saoudrizwan.claude-dev', // cline
	'rooveterinaryinc.roo-cline', // roo
	'supermaven.supermaven' // supermaven
	// 'github.copilot',
];


const isBlacklisted = (fsPath: string | undefined) => {
	return extensionBlacklist.find(bItem => fsPath?.includes(bItem))
}


// Settings keys that are identity/machine/app-specific and should never be carried over
// from another editor's settings.json into AINativeStudio's. These are either:
//  - telemetry/identity values tied to the OTHER app's installation
//  - window/update/sync state that only makes sense for the app that wrote it
//  - keys that reference the other app's product name directly
// Matching is by exact key or by key-prefix (anything before the last '.' segment group below).
const settingsKeyBlacklist = [
	// telemetry / machine identity
	'telemetry.machineId',
	'telemetry.devDeviceId',
	'telemetry.enableCrashReporter',
	'telemetry.telemetryLevel',
	// update channel - the other app's update settings don't apply to us
	'update.mode',
	'update.channel',
	'update.enableWindowsBackgroundUpdates',
	// window/UI chrome state that's app-instance specific, not a "preference" to port
	'window.restoreWindows',
	'window.restoreFullscreen',
	'window.titleBarStyle', // platform rendering quirks differ between forks
	// account-based settings sync - pointing at the other app's sync service would be wrong/break
	'settingsSync.enabled',
	'sync.enable',
	// extensions auto-update / gallery pointed at the other app's marketplace config
	'extensions.autoUpdate',
	'extensions.autoCheckUpdates',
	'extensions.gallery.serviceUrl',
	'extensions.gallery.itemUrl',
	'extensions.gallery.cacheUrl',
	'extensions.gallery.controlUrl',
	'extensions.gallery.nlsUrl',
	'extensions.gallery.publisherUrl',
	'extensions.gallery.resourceUrlTemplate',
]

const isBlacklistedSettingsKey = (key: string) => {
	return settingsKeyBlacklist.some(bItem => key === bItem || key.startsWith(bItem + '.'))
}

/**
 * Merge `incoming` settings (parsed from another editor's settings.json) into
 * `existing` settings (AINativeStudio's current settings.json, parsed, may be {}).
 * - Keys already present in `existing` are preserved (we never clobber the user's
 *   current AINativeStudio configuration with values from the other editor).
 * - Keys on `settingsKeyBlacklist` are dropped from the incoming set entirely,
 *   since they are identity/app-instance specific and should not transfer.
 */
const mergeSettingsJSON = (existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> => {
	const merged: Record<string, unknown> = { ...existing }
	for (const key of Object.keys(incoming)) {
		if (isBlacklistedSettingsKey(key)) continue
		if (Object.prototype.hasOwnProperty.call(merged, key)) continue // don't clobber user's existing AINativeStudio setting
		merged[key] = incoming[key]
	}
	return merged
}

class ExtensionTransferService extends Disposable implements IExtensionTransferService {
	_serviceBrand: undefined;

	constructor(
		@IFileService private readonly _fileService: IFileService,
	) {
		super()
	}

	async transferExtensions(os: 'mac' | 'windows' | 'linux' | null, fromEditor: TransferEditorType) {
		const transferTheseFiles = transferTheseFilesOfOS(os, fromEditor)
		const fileService = this._fileService

		let errAcc = ''

		for (const { from, to, isExtensions, isSettingsJSON } of transferTheseFiles) {
			// Check if the source file exists before attempting to copy
			try {
				if (isSettingsJSON) {
					console.log('transferring settings.json (merge)', from, to)

					const exists = await fileService.exists(from)
					if (exists) {
						// Ensure the destination directory exists
						const toParent = URI.joinPath(to, '..')
						const toParentExists = await fileService.exists(toParent)
						if (!toParentExists) {
							await fileService.createFolder(toParent)
						}

						try {
							const incomingStr = await fileService.readFile(from)
							const incomingJSON: Record<string, unknown> = JSON.parse(incomingStr.value.toString())

							let existingJSON: Record<string, unknown> = {}
							const destExists = await fileService.exists(to)
							if (destExists) {
								try {
									const existingStr = await fileService.readFile(to)
									existingJSON = JSON.parse(existingStr.value.toString())
								} catch {
									console.log(`Could not parse existing settings.json at ${to.toString()}, treating as empty`)
									existingJSON = {}
								}
							}

							const merged = mergeSettingsJSON(existingJSON, incomingJSON)
							await fileService.writeFile(to, VSBuffer.fromString(JSON.stringify(merged, null, '\t')))
						} catch (parseErr) {
							// If the source settings.json isn't valid JSON (e.g. has comments some
							// editors tolerate), skip the merge rather than corrupting the user's settings.
							console.log(`Could not parse settings.json at ${from.toString()}, skipping settings import`, parseErr)
						}
					} else {
						console.log(`Skipping file that doesn't exist: ${from.toString()}`)
					}
				}
				else if (!isExtensions) {
					console.log('transferring item', from, to)

					const exists = await fileService.exists(from)
					if (exists) {
						// Ensure the destination directory exists
						const toParent = URI.joinPath(to, '..')
						const toParentExists = await fileService.exists(toParent)
						if (!toParentExists) {
							await fileService.createFolder(toParent)
						}
						await fileService.copy(from, to, true)
					} else {
						console.log(`Skipping file that doesn't exist: ${from.toString()}`)
					}
				}
				// extensions folder
				else {
					console.log('transferring extensions...', from, to)
					const exists = await fileService.exists(from)
					if (exists) {
						const stat = await fileService.resolve(from)
						const toParent = URI.joinPath(to) // extensions/
						const toParentExists = await fileService.exists(toParent)
						if (!toParentExists) {
							await fileService.createFolder(toParent)
						}
						for (const extensionFolder of stat.children ?? []) {
							const from = extensionFolder.resource
							const to = URI.joinPath(toParent, extensionFolder.name)
							const toStat = await fileService.resolve(from)

							if (toStat.isDirectory) {
								if (!isBlacklisted(extensionFolder.resource.fsPath)) {
									await fileService.copy(from, to, true)
								}
							}
							else if (toStat.isFile) {
								if (extensionFolder.name === 'extensions.json') {
									try {
										const contentsStr = await fileService.readFile(from)
										const json: any = JSON.parse(contentsStr.value.toString())
										const j2 = json.filter((entry: { identifier?: { id?: string } }) => !isBlacklisted(entry?.identifier?.id))
										const jsonStr = JSON.stringify(j2)
										await fileService.writeFile(to, VSBuffer.fromString(jsonStr))
									}
									catch {
										console.log('Error copying extensions.json, skipping')
									}
								}
							}
						}

					} else {
						console.log(`Skipping file that doesn't exist: ${from.toString()}`)
					}
					console.log('done transferring extensions.')
				}
			}
			catch (e) {
				console.error('Error copying file:', e)
				errAcc += `Error copying ${from.toString()}: ${e}\n`
			}
		}

		if (errAcc) return errAcc
		return undefined
	}

	async deleteBlacklistExtensions(os: 'mac' | 'windows' | 'linux' | null) {
		const fileService = this._fileService
		const extensionsURI = getExtensionsFolder(os)
		if (!extensionsURI) return

		let eURI
		try {
			eURI = await fileService.resolve(extensionsURI)
		} catch {
			// Nothing to clean up on a fresh install - this extensions folder
			// (from a prior app version/name) may simply never have existed.
			return
		}

		for (const child of eURI.children ?? []) {


			try {
				if (child.isDirectory) {
					// if is blacklisted
					if (isBlacklisted(child.resource.fsPath)) {
						console.log('Deleting extension', child.resource.fsPath)
						await fileService.del(child.resource, { recursive: true, useTrash: true })
					}
				}
				else if (child.isFile) {
					// if is extensions.json

					if (child.name === 'extensions.json') {
						console.log('Updating extensions.json', child.resource.fsPath)
						try {
							const contentsStr = await fileService.readFile(child.resource)
							const json: any = JSON.parse(contentsStr.value.toString())
							const j2 = json.filter((entry: { identifier?: { id?: string } }) => !isBlacklisted(entry?.identifier?.id))
							const jsonStr = JSON.stringify(j2)
							await fileService.writeFile(child.resource, VSBuffer.fromString(jsonStr))
						}
						catch {
							console.log('Error copying extensions.json, skipping')
						}
					}
				}
			}
			catch (e) {
				console.error('Could not delete extension', child.resource.fsPath, e)
			}
		}
	}
}


registerSingleton(IExtensionTransferService, ExtensionTransferService, InstantiationType.Eager); // lazily loaded, even if Eager









const transferTheseFilesOfOS = (os: 'mac' | 'windows' | 'linux' | null, fromEditor: TransferEditorType = 'VS Code'): TransferFilesInfo => {
	if (os === null)
		throw new Error(`One-click switch is not possible in this environment.`)
	if (os === 'mac') {
		const homeDir = env['HOME']
		if (!homeDir) throw new Error(`$HOME not found`)

		if (fromEditor === 'VS Code') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Code', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.vscode', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		} else if (fromEditor === 'Cursor') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.cursor', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		} else if (fromEditor === 'Windsurf') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.windsurf', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		}
	}

	if (os === 'linux') {
		const homeDir = env['HOME']
		if (!homeDir) throw new Error(`variable for $HOME location not found`)

		if (fromEditor === 'VS Code') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Code', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Code', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.vscode', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		} else if (fromEditor === 'Cursor') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Cursor', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Cursor', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.cursor', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		} else if (fromEditor === 'Windsurf') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Windsurf', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Windsurf', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.windsurf', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		}
	}

	if (os === 'windows') {
		const appdata = env['APPDATA']
		if (!appdata) throw new Error(`variable for %APPDATA% location not found`)
		const userprofile = env['USERPROFILE']
		if (!userprofile) throw new Error(`variable for %USERPROFILE% location not found`)

		if (fromEditor === 'VS Code') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Code', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Code', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.vscode', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		} else if (fromEditor === 'Cursor') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Cursor', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Cursor', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.cursor', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		} else if (fromEditor === 'Windsurf') {
			return [{
				from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Windsurf', 'User', 'settings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
				isSettingsJSON: true,
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Windsurf', 'User', 'keybindings.json'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
			}, {
				from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.windsurf', 'extensions'),
				to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.ainative-studio', 'extensions'),
				isExtensions: true,
			}]
		}
	}

	throw new Error(`os '${os}' not recognized or editor type '${fromEditor}' not supported for this OS`)
}


const getExtensionsFolder = (os: 'mac' | 'windows' | 'linux' | null) => {
	const t = transferTheseFilesOfOS(os, 'VS Code') // from editor doesnt matter
	return t.find(f => f.isExtensions)?.to
}
