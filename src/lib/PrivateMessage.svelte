<style lang="scss">
	$indent: var(--sx-spacing-10);
	.msg {
		border-radius: 20px;
		padding: var(--sx-spacing-3);
	}
	.message {
		&.sent {
			padding-left: #{$indent};
			.msg {
				background: var(--sx-blue-transparent-faint);
			}
		}

		&.recieved {
			padding-right: #{$indent};
			.msg {
				background: var(--sx-gray-transparent);
			}
		}
	}
</style>

<div class="message {toMe ? 'recieved' : 'sent'}">
	<div class="msg">
		<Stack dir="c" gap={2}>
			<Stack dir="r" gap={1}>
				<span>Message {toMe ? 'from' : 'to'}</span>
				<UserLink user={otherPerson} />
				<UserBadges user={otherPerson} />
				<span class="muted">&centerdot;</span>
				<RelativeTime date={privateMessageView.private_message.published} />
			</Stack>
			<Markdown md={privateMessageView.private_message.content} />
			<Stack dir="r" gap={2} align="center">
				<slot name="actions-start" {toMe} />

				<IconButton icon="reply" small on:click={() => (showReply = true)} disabled={showReply} text="Reply" />
				<LogButton on:click={() => console.log({ privateMessageView })} />
			</Stack>

			{#if showReply}
				<div class="mx-8">
					<PrivateMessageCompose to={otherPerson} on:sent={sent} on:cancel={() => (showReply = false)} cancellable />
				</div>
			{/if}
		</Stack>
	</div>
</div>

<script lang="ts">
	import { Stack } from 'sheodox-ui';
	import RelativeTime from './RelativeTime.svelte';
	import Markdown from './Markdown.svelte';
	import type { PrivateMessageView } from 'lemmy-js-client';
	import IconButton from './IconButton.svelte';
	import UserLink from './UserLink.svelte';
	import PrivateMessageCompose from './PrivateMessageCompose.svelte';
	import LogButton from './LogButton.svelte';
	import UserBadges from './feeds/posts/UserBadges.svelte';
	import { profile } from './profiles/profiles';

	export let privateMessageView: PrivateMessageView;

	let showReply = false;

	$: toMe = privateMessageView.recipient.local && privateMessageView.recipient.name === $profile.username;
	$: otherPerson = toMe ? privateMessageView.creator : privateMessageView.recipient;

	function sent() {
		showReply = false;
	}
</script>
