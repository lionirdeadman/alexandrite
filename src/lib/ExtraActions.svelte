<style>
	ul .spinner {
		/* match the width of icons in dropdown menus from sheodox-ui */
		width: 1.5rem;
	}
</style>

{#if actions.length}
	{@const text = 'Extra actions'}
	<Tooltip title={text}>
		<MenuButton triggerClasses="small">
			<span slot="trigger">
				<span class="sr-only">{text}</span>
				<Icon icon="caret-down" />
			</span>

			<ul slot="menu">
				{#each actions as opt}
					{@const variant = opt.variant || 'solid'}
					<li>
						{#if opt.href}
							<a href={opt.href} class="button"><Icon icon={opt.icon} {variant} /> {opt.text}</a>
						{:else if opt.click}
							<button on:click={opt.click} class="button" disabled={opt.busy ?? false} use:ripple>
								<div class="f-row gap-1">
									{#if opt.busy}
										<div class="spinner">
											<Spinner />
										</div>
									{:else}
										<Icon icon={opt.icon} {variant} />
									{/if}
									<span>{opt.text}</span>
								</div>
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</MenuButton>
	</Tooltip>
{/if}

<script lang="ts">
	import { Tooltip, MenuButton, Icon, ripple } from 'sheodox-ui';
	import type { ExtraAction } from './utils';
	import Spinner from './Spinner.svelte';

	export let actions: ExtraAction[];
</script>
