/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';

/**
 * UI-facing half of #161's steering docs feature. The data-loading half (reading
 * .ainative/steering/*.md into every chat turn's context) has existed and been tested since
 * commit 25c55b91 - this is the create/list/open half that was the actual remaining gap: a user
 * had no in-IDE way to discover or create these files, only to have hand-made them via a
 * terminal or external editor. Follows the exact same "ensure dir/file exists, open in
 * IWorkbench editor" pattern MCPService.revealMCPConfigFile() already uses for mcp.json.
 */
export interface SteeringFile {
	readonly name: string;
	readonly uri: URI;
}

export interface ISteeringDocsService {
	readonly _serviceBrand: undefined;
	/** Lists .md files under .ainative/steering/ in the first workspace folder. Empty array if there is no workspace folder or no steering directory yet. */
	listSteeringFiles(): Promise<SteeringFile[]>;
	/** Creates (if missing) and opens a new steering file with the given name (".md" appended if not already present). */
	createAndOpenSteeringFile(name: string): Promise<void>;
	/** Opens an existing steering file in the editor. */
	openSteeringFile(uri: URI): Promise<void>;
}

export const ISteeringDocsService = createDecorator<ISteeringDocsService>('steeringDocsService');

const STEERING_DOC_TEMPLATE = (name: string) => `# ${name}

<!-- This file is automatically included in every chat turn's context for this workspace.
     Use it for standing project context: coding conventions, architecture notes,
     "always use X", "never touch Y" - anything you'd otherwise have to re-explain every session. -->
`;

class SteeringDocsService extends Disposable implements ISteeringDocsService {
	readonly _serviceBrand: undefined;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super();
	}

	private _steeringDirUri(): URI | undefined {
		const folder = this.workspaceContextService.getWorkspace().folders[0];
		if (!folder) return undefined;
		return URI.joinPath(folder.uri, '.ainative', 'steering');
	}

	async listSteeringFiles(): Promise<SteeringFile[]> {
		const dirUri = this._steeringDirUri();
		if (!dirUri) return [];
		try {
			const stat = await this.fileService.resolve(dirUri);
			if (!stat.children) return [];
			return stat.children
				.filter(c => !c.isDirectory && c.name.toLowerCase().endsWith('.md'))
				.map(c => ({ name: c.name, uri: c.resource }))
				.sort((a, b) => a.name.localeCompare(b.name));
		} catch {
			return []; // no steering directory yet - not an error, just nothing to list
		}
	}

	async createAndOpenSteeringFile(name: string): Promise<void> {
		const dirUri = this._steeringDirUri();
		if (!dirUri) throw new Error('No workspace folder is open.');

		const fileName = name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
		const fileUri = URI.joinPath(dirUri, fileName);

		const exists = await this.fileService.exists(fileUri);
		if (!exists) {
			// .ainative/steering/ may not exist yet (e.g. the very first steering doc in this
			// workspace) - createFile does not create missing parent directories on its own.
			const dirExists = await this.fileService.exists(dirUri);
			if (!dirExists) await this.fileService.createFolder(dirUri);

			const title = fileName.replace(/\.md$/i, '');
			await this.fileService.createFile(fileUri, VSBuffer.fromString(STEERING_DOC_TEMPLATE(title)));
		}

		await this.openSteeringFile(fileUri);
	}

	async openSteeringFile(uri: URI): Promise<void> {
		await this.editorService.openEditor({
			resource: uri,
			options: { pinned: true, revealIfOpened: true },
		});
	}
}

registerSingleton(ISteeringDocsService, SteeringDocsService, InstantiationType.Delayed);
