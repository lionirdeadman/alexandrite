import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { get } from 'svelte/store';
import { profile } from '$lib/profiles/profiles';

export const load = (async ({ params }) => {
	const { client, jwt } = get(profile);

	if (!params.postId) {
		throw error(400, 'Missing Post ID');
	}

	if (!jwt) {
		throw error(400, 'Not Logged In');
	}

	const postView = client.getPost({ id: +params.postId, auth: jwt }).then(({ post_view }) => post_view);

	// TODO redirect if it's not your post

	return {
		postView
	};
}) satisfies PageLoad;
