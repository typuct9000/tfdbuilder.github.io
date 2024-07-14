<script lang="ts">
	import type { Module } from "../ModData";

	type Props = { mod: Module, level?: number, matchingSocket?: boolean, showButtons?: boolean, ondblclick?: (e: MouseEvent) => void, oncontextmenu?: (e: MouseEvent) => void};

	let { mod, level = $bindable(0), matchingSocket = false, showButtons = false, ondblclick, oncontextmenu }: Props = $props();

	const maxLevel = mod.module_stat.at(-1)?.level ?? 0;
	level = Math.max(0, Math.min(level, maxLevel));

	const colors: Record<string, string[]> = 
	{
		"Standard": ["#2B5F89", "#53B7F7"],
		"Rare": ["#6B4888", "#D487F5"],
		"Ultimate": ["#7C7147", "#F7DB78"],
		"Transcendent": ["#ab574e", "#ff7c70"]
	};

	function getBorderColor()
	{
		return colors[mod.module_tier]?.[1] ?? "black";
	}

	function getBackgroundColor()
	{
		return colors[mod.module_tier]?.[0] ?? "white";
	}

	function increase(e: MouseEvent)
	{
		if (level < maxLevel)
		{
			if (e.shiftKey)
			{
				level = maxLevel;
			}
			else
			{
				level += 1;
			}
		}
	}

	function decrease(e: MouseEvent)
	{
		if (level > 0)
		{
			if (e.shiftKey)
			{
				level = 0;
			}
			else
			{
				level -= 1;
			}
		}
	}

	function handleDragStart(e: DragEvent)
	{
		if (e.dataTransfer)
		{
			e.dataTransfer.dropEffect = "move";
			e.dataTransfer.setData("mod", mod.module_id);
		}
	}

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modcard" style="background-color: {getBackgroundColor()}; border-color: {getBorderColor()}; " draggable="true" ondragstart={handleDragStart} ondblclick={ondblclick} oncontextmenu={oncontextmenu}>
	<div class="power">{mod.module_socket_type.slice(0, 1)} {matchingSocket ? Math.ceil((mod.module_stat[level]?.module_capacity ?? 0) / 2) : (mod.module_stat[level]?.module_capacity ?? 0)}</div>
	<div class="name">{mod.module_name}</div>
	<div class="description">{mod.module_stat[level]?.value}</div>
	{#if mod.module_type !== null}<div>Category: {mod.module_type}</div>{/if}
	<div>Type: {mod.module_class}</div>
	{#if showButtons}<button onclick={decrease}>-</button><button onclick={increase}>+</button>{/if}
</div>

<style>
	.modcard
	{
		font-size: small;
		color: white;
		border: solid 2px;
		border-radius: 10px;
		padding-bottom: 5px;
		width: 150px;
		min-height: 220px;
		max-height: 280px;
	}

	.power
	{
		font-size: larger;
		font-weight: bold;
	}

	.name
	{
		font-size: medium;
		font-weight: bold;
		text-shadow: 1px 1px #333333;
		padding: 0 5px 5px 5px;
	}

	.description
	{
		padding: 5px;
		border-bottom: solid 1px gray;
		overflow-y: hidden;
		scrollbar-width: thin;
	}

</style>