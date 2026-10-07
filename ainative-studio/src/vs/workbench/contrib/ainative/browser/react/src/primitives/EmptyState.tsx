/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { ReactNode } from 'react';

/**
 * Mascot roles, per docs/design/handoff README section 10: Visitor = first contact
 * (signed-out usage), Blob = waiting/ready (chat, models), 8-Bit Cody = tools, servers,
 * logs, welcome, Vibe empty.
 *
 * No raster-asset bundling pipeline exists yet in this codebase's React islands (everything
 * today is Lucide/codicon vector icons - confirmed via repo search). Building one is its own
 * piece of work, so EmptyState takes an optional `mascotSrc` instead of hardcoding a path
 * that would 404: pass it once the three PNGs from https://ainative.studio/mediakit are
 * bundled and a real URL/import is wired up. Until then the empty state still renders
 * correctly with just title/body/action - the mascot image degrades to nothing, not a
 * broken-image icon.
 */
export type MascotRole = 'visitor' | 'blob' | 'cody';

interface EmptyStateProps {
	mascot: MascotRole;
	title: string;
	body: string;
	/** Resolved image URL for the mascot, once the asset pipeline exists. Omit to render without an image. */
	mascotSrc?: string;
	/** At most one filled (primary) action, per the single empty-state pattern in the spec. */
	action?: ReactNode;
	className?: string;
}

/**
 * The single empty-state pattern used across every surface (new workspace, chat empty,
 * Vibe empty, MCP none/zero-tools, tool log empty/filtered, usage signed-out, model list
 * empty): one mascot, a title saying what's missing, one body sentence, at most one button.
 * A failed server is an error state, not this - callers should route failures elsewhere.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ mascot, title, body, mascotSrc, action, className = '' }) => {
	return (
		<div className={`flex flex-col items-center justify-center gap-3 text-center px-6 py-10 ${className}`}>
			{mascotSrc && (
				<img
					src={mascotSrc}
					alt=""
					role="presentation"
					className="h-16 w-16 object-contain"
					style={{ imageRendering: mascot === 'cody' ? 'pixelated' : 'auto' }}
				/>
			)}
			<h3 className="text-lg font-medium text-ainative-fg-0">{title}</h3>
			<p className="max-w-[320px] text-root text-ainative-fg-2">{body}</p>
			{action}
		</div>
	);
};
