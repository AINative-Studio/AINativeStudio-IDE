/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { ReactNode, useState } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, useClick, useDismiss, useRole, useInteractions, FloatingFocusManager } from '@floating-ui/react';

interface PopoverProps {
	trigger: (props: { ref: (node: HTMLElement | null) => void; onClick: () => void; 'aria-expanded': boolean }) => ReactNode;
	/** Either static content, or a render function given `close()` - e.g. to close on row selection. */
	children: ReactNode | ((helpers: { close: () => void }) => ReactNode);
	/** Fixed popover width per spec (e.g. model switcher is 320px, account menu is 316px). */
	width?: number;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * Popover primitive built on the already-depended-on @floating-ui/react (see util/inputs.tsx
 * for the existing usage pattern in this codebase). 150ms open/close per the redesign's
 * animation spec; Esc closes per the keyboard spec.
 */
export const Popover: React.FC<PopoverProps> = ({ trigger, children, width = 320, open: controlledOpen, onOpenChange }) => {
	const [internalOpen, setInternalOpen] = useState(false);
	const open = controlledOpen ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;
	const { refs, floatingStyles, context } = useFloating({
		open,
		onOpenChange: setOpen,
		middleware: [offset(6), flip(), shift({ padding: 8 })],
		whileElementsMounted: autoUpdate,
		placement: 'bottom-start',
	});

	const click = useClick(context);
	const dismiss = useDismiss(context);
	const role = useRole(context, { role: 'menu' });
	const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

	return (
		<>
			{trigger({
				ref: refs.setReference,
				onClick: () => setOpen(!open),
				'aria-expanded': open,
				...getReferenceProps(),
			} as any)}
			{open && (
				<FloatingFocusManager context={context} modal={false}>
					<div
						ref={refs.setFloating}
						style={{ ...floatingStyles, width }}
						{...getFloatingProps()}
						className="z-50 rounded-xl border border-ainative-border-2 bg-ainative-bg-1 shadow-sm animate-ainative-fade-up"
					>
						{typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
					</div>
				</FloatingFocusManager>
			)}
		</>
	);
};
