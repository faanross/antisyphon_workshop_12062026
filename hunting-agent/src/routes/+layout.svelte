<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if page.url.pathname !== '/'}
	<a class="lab-back-link" href="/" aria-label="Back to lab dashboard">Labs</a>
{/if}

{@render children()}

<style>
	.lab-back-link {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 50;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.5rem;
		padding: 0 .9rem;
		border: 1px solid rgba(245, 230, 99, 0.45);
		border-radius: 999px;
		background: rgba(25, 26, 33, 0.88);
		box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
		color: var(--dracula-cyan);
		font-family: var(--font-heading);
		font-size: .78rem;
		font-weight: 800;
		text-decoration: none;
		backdrop-filter: blur(10px);
	}

	.lab-back-link:hover {
		border-color: rgba(245, 230, 99, 0.75);
		background: rgba(33, 34, 44, 0.95);
	}
</style>
