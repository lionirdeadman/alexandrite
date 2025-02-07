<style lang="scss">
	main {
		max-width: 100vw;
	}
	.loading-overlay {
		position: fixed;
		z-index: 1000000;
		inset: 0;
		background: var(--sx-gray-transparent-dark);
	}
	.root-layout-content {
		margin-top: var(--app-header-height);
	}
</style>

<Header
	appName={$siteMeta.site_view.site.name}
	href="/{$instance}"
	on:titleclick={onHeaderTitleClick}
	showMenuTrigger={true}
	bind:menuOpen={$navSidebarOpen}
	position="fixed"
>
	<div slot="logo" class="header-logo">
		{#if $siteMeta.site_view.site.icon}
			<InstanceLogo />
		{:else}
			<Logo />
		{/if}
	</div>
	<div slot="headerCenter">
		<form method="GET" action="/{$instance}/search" on:submit={onSearchSubmit}>
			<Search name="q" placeholder="Search" bind:value={headerSearchText} />
		</form>
	</div>
	<div slot="headerEnd" class="f-row align-items-center">
		{#if data.loggedIn}
			<IconLink
				text="Unread"
				{placement}
				icon="bell"
				cl="{$unreadCount > 0 ? 'sx-badge-orange' : ''} p-2"
				href="/{$profile.instance}/inbox"
			>
				{$unreadCount}
			</IconLink>
		{/if}
		{#if isModerator}
			<IconLink
				text="Unread Reports"
				{placement}
				icon="shield-halved"
				cl="{$unreadReportCount > 0 ? 'sx-badge-red' : ''} p-2"
				href="/{$profile.instance}/reports"
			>
				{$unreadReportCount}
			</IconLink>
		{/if}

		<span class="sx-badge-gray">
			{#if !$profile.loggedIn}
				<Icon icon="user-secret" />
			{/if}
			{instanceText}
		</span>

		<LogButton on:click={() => console.log(data)} text="Log Layout Data" small={false} {placement} />
		<HeaderUserMenu on:accounts={() => (showAccountsSelector = true)} />
		<IconButton
			icon={$sidebarVisible ? 'angles-right' : 'angles-left'}
			on:click={() => ($sidebarVisible = !$sidebarVisible)}
			text="Toggle sidebar"
			{placement}
		/>
	</div>
</Header>

<div class="f-row f-1 root-layout-content">
	<Toasts />
	<Modals />
	<Sidebar bind:menuOpen={$navSidebarOpen} docked={$navSidebarDocked}>
		<div slot="header" class="f-row align-items-center">
			<InstanceLogo />
			<h1 class="ml-2 sx-font-size-4">{$siteMeta.site_view.site.name}</h1>
		</div>

		<AppSidebar subscriptions={$siteMeta.my_user?.follows ?? []} />
	</Sidebar>

	<main class="f-column f-1">
		<ModContext>
			<CommunityContext>
				<slot />
			</CommunityContext>
		</ModContext>
	</main>

	{#if showAccountsSelector}
		<ProfileOverlay bind:visible={showAccountsSelector} />
	{/if}
</div>

{#if showLoadingOverlay}
	<div class="loading-overlay sx-font-size-10 f-row align-items-center justify-content-center">
		<Spinner />
	</div>
{/if}

<script lang="ts">
	import { afterNavigate, beforeNavigate, goto, invalidateAll } from '$app/navigation';
	import CommunityContext from '$lib/community-context/CommunityContext.svelte';
	import ModContext from '$lib/mod/ModContext.svelte';
	import { Sidebar, Header, Icon, Search, Toasts, Modals } from 'sheodox-ui';
	import ProfileOverlay from '$lib/profiles/ProfileOverlay.svelte';
	import { onDestroy, onMount } from 'svelte';
	import AppSidebar from './AppSidebar.svelte';
	import { getCtrlBasedHotkeys, setAppContext } from '$lib/app-context';
	import LogButton from '$lib/LogButton.svelte';
	import Spinner from '$lib/Spinner.svelte';
	import IconLink from '$lib/IconLink.svelte';
	import Logo from '$lib/Logo.svelte';
	import { writable, type Unsubscriber, readable } from 'svelte/store';
	import IconButton from '$lib/IconButton.svelte';
	import { setSettingsContext } from '$lib/settings-context';
	import HeaderUserMenu from './HeaderUserMenu.svelte';
	import { localStorageBackedStore } from '$lib/utils';
	import { AlexandriteSettingsDefaults } from '$lib/settings-context';
	import { profile, instance } from '$lib/profiles/profiles';
	import InstanceLogo from './InstanceLogo.svelte';

	export let data;

	const siteMeta = writable(data.site);
	$: $siteMeta = data.site;

	// there's an overlay that shows when navigating, but if the navigation is fast we don't want to show it,
	// so we delay it a little bit to cut down on annoying one or two frame flashes of the overlay
	const LOADING_OVERLAY_DELAY = 50;

	$: client = $profile.client;
	$: jwt = $profile.jwt;

	const placement = 'bottom-end',
		unreadCount = writable(0),
		unreadReportCount = writable(0);

	let showLoadingOverlay = false,
		showOverlayTimeout: ReturnType<typeof setTimeout>,
		showAccountsSelector = false,
		headerSearchText = '';

	$: isModerator = ($siteMeta.my_user?.moderates.length ?? 0) > 0;

	beforeNavigate(() => {
		clearTimeout(showOverlayTimeout);
		showOverlayTimeout = setTimeout(() => (showLoadingOverlay = true), LOADING_OVERLAY_DELAY);
	});

	afterNavigate(() => {
		clearTimeout(showOverlayTimeout);
		showLoadingOverlay = false;
		if (!$navSidebarDocked) {
			$navSidebarOpen = false;
		}
	});

	const sidebarVisible = localStorageBackedStore('sidebar-visible', AlexandriteSettingsDefaults.sidebarVisible),
		themeHue = localStorageBackedStore('theme-hue', AlexandriteSettingsDefaults.themeHue),
		nsfwImageHandling = localStorageBackedStore('nsfw-handling', AlexandriteSettingsDefaults.nsfwImageHandling),
		loadImagesAsWebp = localStorageBackedStore('load-images-as-webp', AlexandriteSettingsDefaults.loadImagesAsWebp),
		feedLayout = localStorageBackedStore('feed-layout', AlexandriteSettingsDefaults.feedLayout),
		navSidebarOpen = writable(false),
		navSidebarDocked = localStorageBackedStore('nav-sidebar-docked', AlexandriteSettingsDefaults.navSidebarDocked),
		cssVariables = writable<Record<string, string | number>>({});

	async function checkUnread() {
		if (!jwt) {
			return;
		}

		const unread = await client.getUnreadCount({
			auth: jwt
		});

		$unreadCount = unread.replies + unread.mentions + unread.private_messages;
	}

	async function checkUnreadReports() {
		if (!jwt || !isModerator) {
			return;
		}

		const unread = await client.getReportCount({
			auth: jwt
		});

		$unreadReportCount = unread.post_reports + unread.comment_reports;
	}

	function onSearchSubmit(e: Event) {
		const communityReg = /^!([a-zA-Z0-9_]+@[\w-]+(\.[\w-]+)*(\.[a-z]+))$/g;

		// they are trying to search for a community they copied from somewhere,
		// redirect right to it instead of doing a search
		if (communityReg.test(headerSearchText)) {
			e.preventDefault();
			// trim the leading !
			goto(`/${$profile.instance}/c/${headerSearchText.substring(1)}`);
		}
	}

	setAppContext({
		siteMeta,
		navSidebarOpen,
		unreadCount,
		unreadReportCount,
		ctrlBasedHotkeys: getCtrlBasedHotkeys(),
		checkUnread,
		checkUnreadReports,
		screenDimensions: readable({ width: window.innerWidth, height: window.innerHeight }, (set) => {
			function update() {
				set({ width: window.innerWidth, height: window.innerHeight });
			}

			window.addEventListener('resize', update);
			return () => window.removeEventListener('resize', update);
		})
	});

	setSettingsContext({
		themeHue,
		nsfwImageHandling,
		sidebarVisible,
		loadImagesAsWebp,
		feedLayout,
		navSidebarDocked
	});

	$: instanceText = $profile.username ? `${$profile.username}@${$profile.instance}` : $profile.instance;

	const unreadPollMS = 1000 * 60 * 15;
	// if you're a moderator you want to be alerted of stuff faster
	const unreadReportPollMS = 1000 * 60 * 1;
	const styleId = 'alexandrite-style-overrides';
	let pollIntervals: ReturnType<typeof setInterval>[] = [],
		headerResizeObserver: ResizeObserver,
		storeUnsubs: Unsubscriber[] = [];

	$: $cssVariables['--sx-hue-gray'] = $themeHue + ' !important';

	onMount(async () => {
		// track the height of the header, wanted for some styling in various places
		// where fixed/absolutely positioned elements need to be below the header (which is fixed)
		const header = document.querySelector('header');
		if (header) {
			headerResizeObserver = new ResizeObserver((entries) => {
				const height = entries.at(0)?.borderBoxSize[0].blockSize;
				cssVariables.update((v) => {
					return { ...v, '--app-header-height': `${height || 45}px` };
				});
			});
			headerResizeObserver.observe(header);
		}

		storeUnsubs.push(
			cssVariables.subscribe((vars) => {
				let style = document.getElementById(styleId);
				if (!style) {
					style = document.createElement('style');
					style.id = styleId;
					document.head.appendChild(style);
				}

				const rules = [];

				for (const [varName, val] of Object.entries(vars)) {
					rules.push(`${varName}: ${val};`);
				}

				style.textContent = `:root { ${rules.join('\n')} }`;
			})
		);

		if (!jwt) {
			return;
		}

		checkUnread();
		checkUnreadReports();

		pollIntervals = [setInterval(checkUnread, unreadPollMS), setInterval(checkUnreadReports, unreadReportPollMS)];
	});

	onDestroy(() => {
		pollIntervals.forEach(clearInterval);
		headerResizeObserver?.disconnect();
		storeUnsubs.forEach((unsub) => unsub());
		storeUnsubs = [];
		document.getElementById(styleId)?.remove();
	});

	function onHeaderTitleClick() {
		// todo: try doing something more granular that doesn't invalidate siteMeta.
		// this is here so you can click the header title while on the home page already and have it refresh the feed,
		// otherwise if the URL doesn't change it won't refresh
		invalidateAll();
	}
</script>
