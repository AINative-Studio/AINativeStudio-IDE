/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { useAccessor, useAINativeAuth, useIsDark, useSettingsState } from '../util/services.js';
import { Brain, Check, ChevronRight, DollarSign, ExternalLink, Lock, Terminal, X } from 'lucide-react';
import { displayInfoOfProviderName, ProviderName, providerNames, localProviderNames, featureNames, FeatureName, isFeatureNameDisabled } from '../../../../common/ainativeSettingsTypes.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
import { OllamaSetupInstructions, OneClickSwitchButton, SettingsForProvider, ModelDump, AnimatedCheckmarkButton } from '../ainative-settings-tsx/Settings.js';
import { AINativeLoginModal } from '../ainative-settings-tsx/AINativeLoginModal.js';
import { AINativeButtonBgDarken } from '../util/inputs.js';
import { ColorScheme } from '../../../../../../../platform/theme/common/theme.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { isLinux } from '../../../../../../../base/common/platform.js';

const OVERRIDE_VALUE = false

export const AINativeOnboarding = () => {

	const voidSettingsState = useSettingsState()
	const isOnboardingComplete = voidSettingsState.globalSettings.isOnboardingComplete || OVERRIDE_VALUE

	const isDark = useIsDark()

	return (
		<div className={`@@ainative-scope ${isDark ? 'dark' : ''}`}>
			<div
				className={`
					bg-ainative-bg-3 fixed top-0 right-0 bottom-0 left-0 width-full z-[99999]
					transition-all duration-1000 ${isOnboardingComplete ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}
				`}
				style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
			>
				<ErrorBoundary>
					<AINativeOnboardingContent />
				</ErrorBoundary>
			</div>
		</div>
	)
}

const AINativeIcon = () => {
	const accessor = useAccessor()
	const themeService = accessor.get('IThemeService')

	const divRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		// ainative icon style
		const updateTheme = () => {
			const theme = themeService.getColorTheme().type
			const isDark = theme === ColorScheme.DARK || theme === ColorScheme.HIGH_CONTRAST_DARK
			if (divRef.current) {
				divRef.current.style.maxWidth = '220px'
				divRef.current.style.opacity = '50%'
				divRef.current.style.filter = isDark ? '' : 'invert(1)' //brightness(.5)
			}
		}
		updateTheme()
		const d = themeService.onDidColorThemeChange(updateTheme)
		return () => d.dispose()
	}, [])

	return <div ref={divRef} className='@@ainative-ainative-icon' />
}

const FADE_DURATION_MS = 2000

const FadeIn = ({ children, className, delayMs = 0, durationMs, ...props }: { children: React.ReactNode, delayMs?: number, durationMs?: number, className?: string } & React.HTMLAttributes<HTMLDivElement>) => {

	const [opacity, setOpacity] = useState(0)

	const effectiveDurationMs = durationMs ?? FADE_DURATION_MS

	useEffect(() => {

		const timeout = setTimeout(() => {
			setOpacity(1)
		}, delayMs)

		return () => clearTimeout(timeout)
	}, [setOpacity, delayMs])


	return (
		<div className={className} style={{ opacity, transition: `opacity ${effectiveDurationMs}ms ease-in-out` }} {...props}>
			{children}
		</div>
	)
}

// Onboarding

// =============================================
//  New AddProvidersPage Component and helpers
// =============================================

const tabNames = ['Free', 'Paid', 'Local'] as const;

type TabName = typeof tabNames[number] | 'Cloud/Other';

// Data for cloud providers tab
const cloudProviders: ProviderName[] = ['googleVertex', 'liteLLM', 'microsoftAzure', 'awsBedrock', 'openAICompatible'];

// Data structures for provider tabs
const providerNamesOfTab: Record<TabName, ProviderName[]> = {
	Free: ['gemini', 'openRouter'],
	Local: localProviderNames,
	Paid: providerNames.filter(pn => !(['gemini', 'openRouter', ...localProviderNames, ...cloudProviders] as string[]).includes(pn)) as ProviderName[],
	'Cloud/Other': cloudProviders,
};

const descriptionOfTab: Record<TabName, string> = {
	Free: `Providers with a 100% free tier. Add as many as you'd like!`,
	Paid: `Connect directly with any provider (bring your own key).`,
	Local: `Active providers should appear automatically. Add as many as you'd like! `,
	'Cloud/Other': `Add as many as you'd like! Reach out for custom configuration requests.`,
};


const featureNameMap: { display: string, featureName: FeatureName }[] = [
	{ display: 'Chat', featureName: 'Chat' },
	{ display: 'Quick Edit', featureName: 'Ctrl+K' },
	{ display: 'Autocomplete', featureName: 'Autocomplete' },
	{ display: 'Fast Apply', featureName: 'Apply' },
	{ display: 'Source Control', featureName: 'SCM' },
];

const AddProvidersPage = ({ pageIndex, setPageIndex }: { pageIndex: number, setPageIndex: (index: number) => void }) => {
	const auth = useAINativeAuth()
	// Default to the tab that has "Add AINative Cloud" when the user just signed in on the
	// Welcome page, since they came here specifically to paste their API key, not to browse.
	const [currentTab, setCurrentTab] = useState<TabName>(auth.isAuthenticated ? 'Paid' : 'Free');
	const settingsState = useSettingsState();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Clear error message after 5 seconds
	useEffect(() => {
		let timeoutId: NodeJS.Timeout | null = null;

		if (errorMessage) {
			timeoutId = setTimeout(() => {
				setErrorMessage(null);
			}, 5000);
		}

		// Cleanup function to clear the timeout if component unmounts or error changes
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [errorMessage]);

	return (<div className="flex flex-col md:flex-row w-full h-[80vh] gap-6 max-w-[900px] mx-auto relative">
		{/* Left Column */}
		<div className="md:w-1/4 w-full flex flex-col gap-6 p-6 border-none border-ainative-border-2 h-full overflow-y-auto">
			{/* Tab Selector */}
			<div className="flex md:flex-col gap-2">
				{[...tabNames, 'Cloud/Other'].map(tab => (
					<button
						key={tab}
						className={`py-2 px-4 rounded-md text-left ${currentTab === tab
							? 'bg-ainative-accent-solid/80 text-white font-medium shadow-sm'
							: 'bg-ainative-bg-2 hover:bg-ainative-bg-2/80 text-ainative-fg-1'
							} transition-all duration-200`}
						onClick={() => {
							setCurrentTab(tab as TabName);
							setErrorMessage(null); // Reset error message when changing tabs
						}}
					>
						{tab}
					</button>
				))}
			</div>

			{/* Feature Checklist */}
			<div className="flex flex-col gap-1 mt-4 text-sm opacity-80">
				{featureNameMap.map(({ display, featureName }) => {
					const hasModel = settingsState.modelSelectionOfFeature[featureName] !== null;
					return (
						<div key={featureName} className="flex items-center gap-2">
							{hasModel ? (
								<Check className="w-4 h-4 text-emerald-500" />
							) : (
								<div className="w-3 h-3 rounded-full flex items-center justify-center">
									<div className="w-1 h-1 rounded-full bg-white/70"></div>
								</div>
							)}
							<span>{display}</span>
						</div>
					);
				})}
			</div>
		</div>

		{/* Right Column */}
		<div className="flex-1 flex flex-col items-center justify-start p-6 h-full overflow-y-auto">
			<div className="text-5xl mb-2 text-center w-full">Add a Provider</div>

			<div className="w-full max-w-xl mt-4 mb-10">
				<div className="text-4xl font-light my-4 w-full">{currentTab}</div>
				<div className="text-sm opacity-80 text-ainative-fg-3 my-4 w-full">{descriptionOfTab[currentTab]}</div>
			</div>

			{providerNamesOfTab[currentTab].map((providerName) => (
				<div
					key={providerName}
					className={`w-full max-w-xl mb-10 ${providerName === 'ainativeCloud' && auth.isAuthenticated
						? 'ring-1 ring-ainative-accent rounded-lg p-4 -m-4 mb-6'
						: ''
						}`}
				>
					<div className="text-xl mb-2">
						Add {displayInfoOfProviderName(providerName).title}
						{providerName === 'ainativeCloud' && auth.isAuthenticated && (
							<span className="ml-2 text-xs align-middle px-2 py-0.5 rounded-full bg-ainative-accent-bg text-ainative-accent-fg font-normal">
								Signed in — paste your key to finish
							</span>
						)}
						{providerName === 'gemini' && (
							<span
								data-tooltip-id="ainative-tooltip-provider-info"
								data-tooltip-content="Gemini 2.5 Pro offers 25 free messages a day, and Gemini 2.5 Flash offers 500. We recommend using models down the line as you run out of free credits."
								data-tooltip-place="right"
								className="ml-1 text-xs align-top text-blue-400"
							>*</span>
						)}
						{providerName === 'openRouter' && (
							<span
								data-tooltip-id="ainative-tooltip-provider-info"
								data-tooltip-content="OpenRouter offers 50 free messages a day, and 1000 if you deposit $10. Only applies to models labeled ':free'."
								data-tooltip-place="right"
								className="ml-1 text-xs align-top text-blue-400"
							>*</span>
						)}
					</div>
					<div>
						<SettingsForProvider providerName={providerName} showProviderTitle={false} showProviderSuggestions={true} />

					</div>
					{providerName === 'ollama' && <OllamaSetupInstructions />}
				</div>
			))}

			{(currentTab === 'Local' || currentTab === 'Cloud/Other') && (
				<div className="w-full max-w-xl mt-8 bg-ainative-bg-2/50 rounded-lg p-6 border border-ainative-border-4">
					<div className="flex items-center gap-2 mb-4">
						<div className="text-xl font-medium">Models</div>
					</div>

					{currentTab === 'Local' && (
						<div className="text-sm opacity-80 text-ainative-fg-3 my-4 w-full">Local models should be detected automatically. You can add custom models below.</div>
					)}

					{currentTab === 'Local' && <ModelDump filteredProviders={localProviderNames} />}
					{currentTab === 'Cloud/Other' && <ModelDump filteredProviders={cloudProviders} />}
				</div>
			)}



			{/* Navigation buttons in right column */}
			<div className="flex flex-col items-end w-full mt-auto pt-8">
				{errorMessage && (
					<div className="text-amber-400 mb-2 text-sm opacity-80 transition-opacity duration-300">{errorMessage}</div>
				)}
				<div className="flex items-center gap-2">
					<PreviousButton onClick={() => setPageIndex(pageIndex - 1)} />
					<NextButton
						onClick={() => {
							const isDisabled = isFeatureNameDisabled('Chat', settingsState)

							if (!isDisabled) {
								setPageIndex(pageIndex + 1);
								setErrorMessage(null);
							} else {
								// Show error message
								setErrorMessage("Please set up at least one Chat model before moving on.");
							}
						}}
					/>
				</div>
			</div>
		</div>
	</div>);
};
// =============================================
// 	OnboardingPage
// 		title:
// 			div
// 				"Welcome to Void"
// 			image
// 		content:<></>
// 		title
// 		content
// 		prev/next

// 	OnboardingPage
// 		title:
// 			div
// 				"How would you like to use Void?"
// 		content:
// 			ModelQuestionContent
// 				|
// 					div
// 						"I want to:"
// 					div
// 						"Use the smartest models"
// 						"Keep my data fully private"
// 						"Save money"
// 						"I don't know"
// 				| div
// 					| div
// 						"We recommend using "
// 						"Set API"
// 					| div
// 						""
// 					| div
//
// 		title
// 		content
// 		prev/next
//
// 	OnboardingPage
// 		title
// 		content
// 		prev/next

const NextButton = ({ onClick, ...props }: { onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {

	// Create a new props object without the disabled attribute
	const { disabled, ...buttonProps } = props;

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onDoubleClick={onClick}
			className={`px-6 py-2 bg-zinc-100 ${disabled
				? 'bg-zinc-100/40 cursor-not-allowed'
				: 'hover:bg-zinc-100'
				} rounded text-black duration-600 transition-all
			`}
			{...disabled && {
				'data-tooltip-id': 'ainative-tooltip',
				"data-tooltip-content": 'Please enter all required fields or choose another provider', // (double-click to proceed anyway, can come back in Settings)
				"data-tooltip-place": 'top',
			}}
			{...buttonProps}
		>
			Next
		</button>
	)
}

const PreviousButton = ({ onClick, ...props }: { onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			onClick={onClick}
			className="px-6 py-2 rounded text-ainative-fg-3 opacity-80 hover:brightness-115 duration-600 transition-all"
			{...props}
		>
			Back
		</button>
	)
}

const SkipButton = ({ onClick, children, ...props }: { onClick: () => void, children?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			onClick={onClick}
			className="px-6 py-2 rounded text-ainative-fg-3 opacity-80 hover:brightness-115 duration-600 transition-all"
			{...props}
		>
			{children ?? 'Skip'}
		</button>
	)
}



const OnboardingPageShell = ({ top, bottom, content, hasMaxWidth = true, className = '', }: {
	top?: React.ReactNode,
	bottom?: React.ReactNode,
	content?: React.ReactNode,
	hasMaxWidth?: boolean,
	className?: string,
}) => {
	return (
		<div className={`h-[80vh] text-lg flex flex-col gap-4 w-full mx-auto ${hasMaxWidth ? 'max-w-[600px]' : ''} ${className}`}>
			{top && <FadeIn className='w-full mb-auto pt-16'>{top}</FadeIn>}
			{content && <FadeIn className='w-full my-auto'>{content}</FadeIn>}
			{bottom && <div className='w-full pb-8'>{bottom}</div>}
		</div>
	)
}

const OllamaDownloadOrRemoveModelButton = ({ modelName, isModelInstalled, sizeGb }: { modelName: string, isModelInstalled: boolean, sizeGb: number | false | 'not-known' }) => {
	// for now just link to the ollama download page
	return <a
		href={`https://ollama.com/library/${modelName}`}
		target="_blank"
		rel="noopener noreferrer"
		className="flex items-center justify-center text-ainative-fg-2 hover:text-ainative-fg-1"
	>
		<ExternalLink className="w-3.5 h-3.5" />
	</a>

}


const YesNoText = ({ val }: { val: boolean | null }) => {

	return <div
		className={
			val === true ? "text text-emerald-500"
				: val === false ? 'text-rose-600'
					: "text text-amber-300"
		}
	>
		{
			val === true ? "Yes"
				: val === false ? 'No'
					: "Yes*"
		}
	</div>

}



const abbreviateNumber = (num: number): string => {
	if (num >= 1000000) {
		// For millions
		return Math.floor(num / 1000000) + 'M';
	} else if (num >= 1000) {
		// For thousands
		return Math.floor(num / 1000) + 'K';
	} else {
		// For numbers less than 1000
		return num.toString();
	}
}





const PrimaryActionButton = ({ children, className, ringSize, ...props }: { children: React.ReactNode, ringSize?: undefined | 'xl' | 'screen' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {


	return (
		<button
			type='button'
			className={`
				flex items-center justify-center

				text-white dark:text-black
				bg-black/90 dark:bg-white/90

				${ringSize === 'xl' ? `
					gap-2 px-16 py-8
					transition-all duration-300 ease-in-out
					`
					: ringSize === 'screen' ? `
					gap-2 px-16 py-8
					transition-all duration-1000 ease-in-out
					`: ringSize === undefined ? `
					gap-1 px-4 py-2
					transition-all duration-300 ease-in-out
				`: ''}

				rounded-lg
				group
				${className}
			`}
			{...props}
		>
			{children}
			<ChevronRight
				className={`
					transition-all duration-300 ease-in-out

					transform
					group-hover:translate-x-1
					group-active:translate-x-1
				`}
			/>
		</button>
	)
}


// Command registered in src/vs/workbench/electron-sandbox/actions/installActions.ts.
// It already handles platform privilege elevation and shows its own success/error dialogs,
// so this step only needs to trigger it and let it report its own outcome.
const INSTALL_SHELL_COMMAND_ID = 'workbench.action.installCommandLine'

/**
 * Step 3, "Two last things" per the redesign. Both rows are genuinely one-shot actions in
 * this codebase today (IExtensionTransferService.transferExtensions and the shell-install
 * command each run immediately on click, with their own in-progress/done states) - rather
 * than fake a deferred Switch that doesn't actually defer anything, each row is a real
 * action row with a status indicator, which is the honest equivalent of "default on" here:
 * the row reads as done once the action completes, same end state the spec's toggle implies.
 */
const TwoLastThingsPage = ({ pageIndex, setPageIndex, mode }: { pageIndex: number, setPageIndex: (index: number) => void, mode: WorkMode }) => {
	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const voidSettingsService = accessor.get('IAINativeSettingsService')
	const voidSettingsState = useSettingsState()
	const voidMetricsService = accessor.get('IMetricsService')

	const [isInstallingShell, setIsInstallingShell] = useState(false)
	const [shellInstalled, setShellInstalled] = useState(false)

	const onInstallShell = async () => {
		setIsInstallingShell(true)
		try {
			await commandService.executeCommand(INSTALL_SHELL_COMMAND_ID)
			voidMetricsService.capture('Onboarding - Installed Shell Command', {})
			setShellInstalled(true)
		} catch (e) {
			// InstallShellScriptAction already shows its own error dialog on failure
			// (and silently no-ops on user cancellation), so there's nothing more to surface here.
		} finally {
			setIsInstallingShell(false)
		}
	}

	return <OnboardingPageShell
		content={
			<div className='flex flex-col items-center gap-6 w-full max-w-md mx-auto'>
				<div className="text-4xl font-medium text-center -tracking-[0.02em]">Two last things.</div>

				<div className='w-full flex flex-col gap-3'>
					<div className='flex items-center justify-between gap-4 rounded-xl border border-ainative-border-1 bg-ainative-bg-2 p-4'>
						<div className='flex items-center gap-3 min-w-0'>
							<Terminal className='w-5 h-5 flex-shrink-0 opacity-80' />
							<div className='text-root text-ainative-fg-1'>Install the ainative command</div>
						</div>
						<AINativeButtonBgDarken
							className='flex-shrink-0 px-3 py-1.5 text-sm'
							disabled={isInstallingShell || shellInstalled}
							onClick={onInstallShell}
						>
							{shellInstalled ? <AnimatedCheckmarkButton text='Installed' className='bg-none' /> : isInstallingShell ? 'Installing…' : 'Install'}
						</AINativeButtonBgDarken>
					</div>

					<div className='rounded-xl border border-ainative-border-1 bg-ainative-bg-2 p-4'>
						<div className='flex items-center gap-3 min-w-0 mb-3'>
							<div className='text-root text-ainative-fg-1'>Import VS Code settings</div>
						</div>
						<div className='flex flex-wrap gap-2'>
							<OneClickSwitchButton className='w-auto px-3 py-1.5' fromEditor="VS Code" />
							<OneClickSwitchButton className='w-auto px-3 py-1.5' fromEditor="Cursor" />
							<OneClickSwitchButton className='w-auto px-3 py-1.5' fromEditor="Windsurf" />
						</div>
					</div>
				</div>
			</div>
		}
		bottom={
			<div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
				<div className="flex items-center gap-2">
					<PreviousButton onClick={() => { setPageIndex(pageIndex - 1) }} />
					<PrimaryActionButton
						onClick={() => {
							voidSettingsService.setGlobalSetting('isOnboardingComplete', true);
							voidMetricsService.capture('Completed Onboarding', { mode })
						}}
						ringSize={voidSettingsState.globalSettings.isOnboardingComplete ? 'screen' : undefined}
					>
						{mode === 'vibe' ? 'Open in Vibe mode' : 'Open AINative'}
					</PrimaryActionButton>
				</div>
			</div>
		}
	/>
}

/**
 * Step 1, "How do you want to work?" per the redesign (docs/design/handoff README
 * "Onboarding"). Sets only the *initial* mode - a starting point, not a lock-in; the user
 * can switch between the IDE and Vibe Coder Mode at any time afterward (⌘⇧V).
 */
type WorkMode = 'developer' | 'vibe'

const ModeChoicePage = ({ pageIndex, setPageIndex, mode, setMode }: { pageIndex: number, setPageIndex: (index: number) => void, mode: WorkMode, setMode: (mode: WorkMode) => void }) => {
	const options: { mode: WorkMode, title: string, body: string }[] = [
		{ mode: 'developer', title: `I'm a developer`, body: `Full IDE: file tree, editor, terminal, and the chat side bar.` },
		{ mode: 'vibe', title: `I just want to build something`, body: `A chat-first, natural-language surface. You can switch to the IDE any time.` },
	]

	return <OnboardingPageShell
		content={
			<div className='flex flex-col items-center gap-8 w-full max-w-2xl mx-auto'>
				<div className="text-4xl font-medium text-center -tracking-[0.02em]">How do you want to work?</div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4 w-full'>
					{options.map(opt => {
						const selected = mode === opt.mode
						return (
							<button
								key={opt.mode}
								type='button'
								onClick={() => setMode(opt.mode)}
								className={`text-left rounded-xl border p-5 transition-colors
									${selected ? 'border-ainative-accent bg-ainative-accent-bg' : 'border-ainative-border-1 bg-ainative-bg-2 hover:bg-ainative-bg-3'}`}
							>
								<div className='text-lg font-medium text-ainative-fg-0 mb-1'>{opt.title}</div>
								<div className='text-root text-ainative-fg-2'>{opt.body}</div>
							</button>
						)
					})}
				</div>
			</div>
		}
		bottom={
			<div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
				<div className="flex items-center gap-2">
					<SkipButton onClick={() => { setPageIndex(pageIndex + 1) }}>Skip setup</SkipButton>
					<PrimaryActionButton onClick={() => { setPageIndex(pageIndex + 1) }}>Continue</PrimaryActionButton>
				</div>
			</div>
		}
	/>
}

const AINativeOnboardingContent = () => {


	const accessor = useAccessor()
	const voidSettingsService = accessor.get('IAINativeSettingsService')
	const voidMetricsService = accessor.get('IMetricsService')

	const voidSettingsState = useSettingsState()
	const auth = useAINativeAuth()
	const [showLoginModal, setShowLoginModal] = useState(false)

	const [pageIndex, setPageIndex] = useState(0)

	// Step 1's mode choice (docs/design/handoff README "Onboarding"). Developer preselected,
	// per spec. This sets only the *initial* mode - the user can switch to/from Vibe Coder
	// Mode at any time afterward (⌘⇧V), so it's intentionally local state, not persisted
	// settings, mirroring how the spec describes onboarding as "sets the initial mode only."
	const [mode, setMode] = useState<WorkMode>('developer')

	// reset the page to page 0 if the user redos onboarding
	useEffect(() => {
		if (!voidSettingsState.globalSettings.isOnboardingComplete) {
			setPageIndex(0)
		}
	}, [setPageIndex, voidSettingsState.globalSettings.isOnboardingComplete])


	const contentOfIdx: { [pageIndex: number]: React.ReactNode } = {
		0: <OnboardingPageShell
			content={
				<div className='flex flex-col items-center gap-8'>
					<div className="text-5xl font-light text-center">Welcome to AINative Studio</div>

					{/* Slice of Void image */}
					<div className='max-w-md w-full h-[30vh] mx-auto flex items-center justify-center'>
						{!isLinux && <AINativeIcon />}
					</div>

					{auth.isAuthenticated ? (
						<FadeIn delayMs={1000} className='flex flex-col items-center gap-3'>
							<div className='text-ainative-fg-3 text-sm'>
								Signed in as {auth.user?.name || auth.user?.email}
							</div>
							<PrimaryActionButton onClick={() => { setPageIndex(1) }}>
								Get Started
							</PrimaryActionButton>
						</FadeIn>
					) : (
						<FadeIn delayMs={1000} className='flex flex-col items-center gap-3'>
							<PrimaryActionButton onClick={() => { setShowLoginModal(true) }}>
								Sign In to AINative Cloud
							</PrimaryActionButton>
							<button
								type='button'
								className='text-ainative-fg-3 text-sm hover:text-ainative-fg-1 underline underline-offset-2'
								onClick={() => { setPageIndex(1) }}
							>
								Skip and bring your own API key instead
							</button>
						</FadeIn>
					)}

				</div>
			}
		/>,

		1: <ModeChoicePage pageIndex={pageIndex} setPageIndex={setPageIndex} mode={mode} setMode={setMode} />,

		2: <OnboardingPageShell hasMaxWidth={false}
			content={
				<AddProvidersPage pageIndex={pageIndex} setPageIndex={setPageIndex} />
			}
		/>,
		// Shell integration is installable on macOS, Linux, and Windows
		// (see installActions.ts / nativeHostMainService.ts), so this step
		// is shown on all platforms.
		3: <TwoLastThingsPage pageIndex={pageIndex} setPageIndex={setPageIndex} mode={mode} />,
	}


	const pageIndices = Object.keys(contentOfIdx).map(Number).sort((a, b) => a - b)

	return <div key={pageIndex} className="w-full h-[80vh] text-left mx-auto flex flex-col items-center justify-center">
		<ErrorBoundary>
			{contentOfIdx[pageIndex]}
		</ErrorBoundary>

		{pageIndex !== 0 && (
			<div className="flex items-center gap-2 pb-4">
				{pageIndices.map(idx => (
					<div
						key={idx}
						className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === pageIndex ? 'bg-ainative-fg-1 opacity-90' : 'bg-ainative-fg-3 opacity-30'
							}`}
					/>
				))}
			</div>
		)}

		{showLoginModal && (
			<AINativeLoginModal
				onClose={() => { setShowLoginModal(false) }}
				onSuccess={() => {
					setShowLoginModal(false)
					// Same as the unauthenticated "Skip" path below: continue to the mode-choice
					// step rather than skip it, so the exit destination (Welcome vs. Vibe mode)
					// still gets set. The provider step after it already lists "Add AINative
					// Cloud" for pasting the key from app.ainative.studio - session auth doesn't
					// provision a chat-completions API key on its own today.
					setPageIndex(1)
				}}
			/>
		)}
	</div>

}
