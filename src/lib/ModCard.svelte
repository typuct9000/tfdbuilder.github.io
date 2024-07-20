<script lang="ts">
	import { getModuleDrain, type Module } from "../ModData";

	type Props = { mod: Module, level?: number, matchingSocket?: boolean, interactive?: boolean, ondblclick?: (e: MouseEvent) => void, oncontextmenu?: (e: MouseEvent) => void};

	let { mod, level = $bindable(mod.module_stat.at(-1)?.level ?? 0), matchingSocket = $bindable(false), interactive = false, ondblclick, oncontextmenu }: Props = $props();

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


	const maxLevel = mod.module_stat.at(-1)?.level ?? 0;

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

	function toggleMatching()
	{
		if (interactive)
		{
			matchingSocket = !matchingSocket;
		}
	}

	function nothing(e: Event)
	{
		if (interactive)
		{
			e.preventDefault();
			e.stopPropagation();
		}
	}

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modcard" style="background-color: {getBackgroundColor()}; border-color: {getBorderColor()}; " draggable="true" ondragstart={handleDragStart} ondblclick={ondblclick} oncontextmenu={oncontextmenu}>
	<div class="power" class:matchingSocket onclick={toggleMatching} ondblclick={nothing}>{mod.module_socket_type.slice(0, 1)} {getModuleDrain(mod, level, matchingSocket)}</div>
	<div class="name">{mod.module_name}</div>
	<div class="description">{mod.module_stat[level]?.value ?? ""}</div>
	{#if mod.module_type !== null}<div class="category">{mod.module_type}</div>{/if}
	<!-- <div>Type: {mod.module_class}</div> -->
	{#if interactive}<div><button onclick={decrease} ondblclick={nothing}>-</button><button onclick={increase} ondblclick={nothing}>+</button></div>{/if}
</div>

<style>
	.modcard
	{
		font-size: small;
		text-align: center;
		color: white;
		border: solid 2px;
		border-radius: 10px;
		padding-bottom: 5px;
		width: 150px;
		min-height: 220px;
		max-height: 280px;
		display: flex;
		flex-direction: column;
	}

	.power
	{
		font-size: larger;
		font-weight: bold;
		text-shadow: 1px 1px #333333;
	}

	.matchingSocket
	{
		color: lightgreen;
	}

	.name
	{
		font-size: medium;
		font-weight: bold;
		text-shadow: 1px 1px #333333;
		padding: 0 5px 8px 5px;
	}

	.description
	{
		font-size: small;
		line-height: normal;
		padding: 0 5px 5px 5px;
		overflow-y: auto;
		scrollbar-width: thin;
		flex: 1;
	}

	.category
	{
		border-top: solid 1px gray;
		text-align: center;
	}

	button
	{
		width: 30%;
		height: 20px;
		padding: 0;
		margin: 5px;
	}

</style>