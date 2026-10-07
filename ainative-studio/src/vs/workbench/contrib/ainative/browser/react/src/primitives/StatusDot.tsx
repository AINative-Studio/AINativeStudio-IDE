/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';

/**
 * Status vocabulary shared across tool-call rows, MCP server rows, and checkpoints.
 * See docs/design/handoff README "Status vocabulary": connected/done = ok, connecting/running
 * = accent (pulsing), failed = error, disabled/pending/skipped = fg-2 (not pulsing).
 */
export type StatusDotState = 'pending' | 'running' | 'done' | 'waiting' | 'failed' | 'skipped' | 'disabled';

const colorForState: Record<StatusDotState, string> = {
	pending: 'bg-ainative-border-2',
	running: 'bg-ainative-accent',
	done: 'bg-ainative-ok',
	waiting: 'bg-ainative-warning',
	failed: 'bg-ainative-error',
	skipped: 'bg-ainative-fg-2',
	disabled: 'bg-ainative-fg-2',
};

interface StatusDotProps {
	state: StatusDotState;
	className?: string;
}

/** 8px state dot. Pulses only for 'running' (and 'connecting', which maps to 'running'). */
export const StatusDot: React.FC<StatusDotProps> = ({ state, className = '' }) => {
	return (
		<span
			className={`inline-block h-2 w-2 shrink-0 rounded-full ${colorForState[state]} ${state === 'running' ? 'animate-ainative-running-pulse' : ''} ${className}`}
		/>
	);
};
