<style>
	.community-header {
		border-radius: 20px;
		overflow: hidden;
	}
</style>

<Title title="Post" />

<Layout size="medium">
	<div class="community-header my-2">
		<CommunityHeader contentView={communityViewToContentView(data.communityView)} readOnly />
	</div>

	<slot />
</Layout>

<script lang="ts">
	import CommunityHeader from '$lib/feeds/posts/CommunityHeader.svelte';
	import { Layout } from 'sheodox-ui';
	import Title from '$lib/Title.svelte';
	import { communityViewToContentView } from '$lib/content-views';

	export let data;
</script>
