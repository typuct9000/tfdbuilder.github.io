<script lang="ts">
    import { fade } from "svelte/transition";
	import { CommonEffects } from "./Effects";
	import { getModuleData, getModuleDrain, type Module } from "./ModData";
	import ModCard from "./lib/ModCard.svelte";
    import ModSlot from "./lib/ModSlot.svelte";

	const modulesPromise = getModuleData();
	modulesPromise.then(init);

	let isLoaded = false;

	function init()
	{
		isLoaded = true;
		initFromBuildCode(window.location.search.slice(1));
	}

	enum ModFlags
	{
		None = 0,
		MatchingSocket = 1
	};

	type SelectedMod = 
	{
		module: Module,
		level: number,
		isMatching: boolean,
	};

	let selected = $state([] as SelectedMod[]);

	function initFromBuildCode(code: string)
	{
		selected = [];
		code.split(",").forEach(async (i) =>
			{
				const [id, level, flags] = i.split(":");
				const modulesData = await modulesPromise;
				const module = modulesData.find((m) => m.module_id === id);
				if (module)
				{
					selected = [...selected, { module, level: parseInt(level ?? "0"), isMatching: (parseInt(flags ?? "0") & ModFlags.MatchingSocket) === ModFlags.MatchingSocket }];
				}
			});
	}

	function updateUrl()
	{
		const param = `?${buildCode}`;
		if (isLoaded)
		{
			window.history.replaceState(null, '', param);
		}
	}

	let isCopiedShown = $state(false);
	function copyBuildLink()
	{
		navigator.clipboard.writeText(window.location.origin + window.location.pathname + "?" + buildCode);
		isCopiedShown = true;
		setTimeout(() => isCopiedShown = false, 1500);
	}

	function selectMod(module: Module)
	{
		if (canSelect(module))
		{
			selected = [...selected, { module, level: getMaxLevel(module), isMatching: false }];
		}
	}

	function unselectMod(module: Module)
	{
		selected = selected.filter((m) => m.module.module_id !== module.module_id);
	}

	async function handleDragDrop(e: DragEvent)
	{
		e.preventDefault();
		const module = await getDroppedModule(e);
		if (module)
		{
			selectMod(module);
		}
	}

	async function handleDragOver(e: DragEvent)
	{
		e.preventDefault();
	}

	async function getDroppedModule(e: DragEvent)
	{
		const id = e.dataTransfer?.getData("mod");
		if (id)
		{
			const modulesData = await modulesPromise;
			return modulesData.find((m) => m.module_id === id);
		}

		return undefined;
	}

	function canSelect(module: Module)
	{
		return selected.length < 12 && !selected.some((i) => (i.module.module_id === module.module_id || (i.module.module_type && module.module_type && i.module.module_type === module.module_type)));
	}

	function getMaxLevel(module: Module)
	{
		return module.module_stat.at(-1)?.level ?? 0;
	}


	let filter = $state(
		{
			text: "",
			class: "",
			tier: "",
			type: "",
			socket: ""
		});

	function filterModules(modules: Module[])
	{
		let textFilter: RegExp | null = null;
		if (filter.text !== "")
		{
			try { textFilter = new RegExp(filter.text, "i"); } catch (err) {}
		}

		const after = modules.filter((m) =>
			(!textFilter || textFilter.test(m.module_name) || textFilter.test(m.module_stat.at(-1)?.value ?? "")) &&
			(filter.class === "" || m.module_class === filter.class) &&
			(filter.tier === "" || m.module_tier === filter.tier) &&
			(filter.type === "" || m.module_type === filter.type) &&
			(filter.socket === "" || m.module_socket_type === filter.socket));
		return after;
	}

	function getFilterOptions(modules: Module[], key: keyof Pick<Module, "module_class" | "module_socket_type" | "module_tier" | "module_type">)
	{
		const options = new Set<string>();
		modules.forEach((mod) => { if (mod[key]) options.add(mod[key]); });
		return options;
	}

	function getStats()
	{
		const result = new Map<string, string[]>();
		for (const mod of selected)
		{
			const description = mod.module.module_stat[mod.level]?.value;
			if (description)
			{
				const effects = parseModDescription(description);
				for (const effect of Object.keys(effects))
				{
					if (CommonEffects.includes(effect))
					{
						result.set(effect, [...result.get(effect) ?? [], effects[effect]!]);
					}
					else
					{
						result.set(description, []);
					}
				}
			}
		}

		return result;
	}

	function parseModDescription(description: string)
	{
		const result = {} as Record<string, string>;

		const regex = /([A-Za-z\-.,;'"()& ]+) ([+\-0-9.%]+),?\s*/g;
		for (const [_, key, value] of description.matchAll(regex))
		{
			if (key && value)
			{
				result[key] = value;
			}
		}

		return result;
	}

	function formatValues(values: string[])
	{
		if (values.length < 2)
		{
			return values.join(", ");
		}

		let result = 0;
		let isPercentage = false;
		for (const item of values)
		{
			const matches = item.match(/([+-]?\d+(?:\.\d+)?)(%?)/);
			if (matches)
			{
				const [_, value, percent] = matches;
				if (value)
				{
					isPercentage = isPercentage || !!percent;
					const float = parseFloat(value);
					result += /*percent ? float / 100 :*/ float;
				}
			}
			else
			{
				console.warn(`Couldn't parse mod value ${item}`);
			}
		}

		//return isPercentage ? `${result >= 0 ? "+" : ""}${result * 100}%` : `${result >= 0 ? "+" : ""}${result}`;
		return `${result >= 0 ? "+" : ""}${result.toFixed(1)}${isPercentage ? "%" : ""}`;
	}

	const usedCapacity = $derived(selected.reduce((value, mod) => value + getModuleDrain(mod.module, mod.level, mod.isMatching), 0));
	const buildCode = $derived(selected.map((m) => `${m.module.module_id}:${m.level}:${m.isMatching ? ModFlags.MatchingSocket : ModFlags.None}`).join(","));

	$effect(updateUrl);

</script>

<main>

	<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 20px">

		<div style="flex: 4; max-width: 980px;">

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="loadout-container" ondrop={handleDragDrop} ondragover={handleDragOver}>
				{#each Array.from<SelectedMod|undefined>({...selected, length: 12}) as mod, i (mod?.module.module_id ?? i)}
					{#if mod?.module}
						<ModCard interactive={true} mod={mod.module} bind:level={mod.level} bind:matchingSocket={mod.isMatching}
							ondblclick={(e) => { e.preventDefault(); unselectMod(mod.module); }}
							oncontextmenu={(e) => { e.preventDefault(); unselectMod(mod.module); }} />
					{:else}
						<ModSlot />
					{/if}
				{/each}
			</div>

		</div>

		<div style="flex: 1">

			<button title="Copy link to this build to clipboard" onclick={copyBuildLink}>Copy Build Link</button> {#if isCopiedShown}<span style="position: absolute; margin: 10px 10px;" out:fade>Copied!</span>{/if}

			<p>Used capacity: {usedCapacity}</p>

			<div class="mod-stats">
				{#each getStats() as [name, values] (name)}
					<li>{name} {formatValues(values)}</li>
				{/each}
			</div>
		</div>

	</div>

	{#await modulesPromise}
		<div>Loading...</div>
	{:then modules}
		{@const filtered = filterModules(modules)}
		<div class="filter-list">
			<input type="search" title="Search in titles and description. Accepts Regural Expressions" placeholder="Search" bind:value={filter.text} />
			<select bind:value={filter.class}>
				<option value="">Class</option>
				{#each getFilterOptions(modules, "module_class") as option}
					<option>{option}</option>
				{/each}
			</select>
			<select bind:value={filter.tier}>
				<option value="">Rarity</option>
				{#each getFilterOptions(modules, "module_tier") as option}
					<option>{option}</option>
				{/each}
			</select>
			<select bind:value={filter.type}>
				<option value="">Category</option>
				{#each getFilterOptions(modules, "module_type") as option}
					<option>{option}</option>
				{/each}
			</select>
			<select bind:value={filter.socket}>
				<option value="">Socket</option>
				{#each getFilterOptions(modules, "module_socket_type") as option}
					<option>{option}</option>
				{/each}
			</select>
			<div>Showing {filtered.length}</div>
		</div>
		<div class="mod-list">
			{#each filtered as mod (mod.module_id)}
				<ModCard {mod} ondblclick={() => selectMod(mod)} />
			{/each}
		</div>
	{/await}

</main>

<style>
	.loadout-container
	{
		display: flex; 
		flex-wrap: wrap;
		flex-direction: row;
		gap: 10px; 
		min-width: 150px;
		max-width: 980px;
		min-height: 450px;
	}

	.filter-list
	{
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-bottom: 10px;
	}

	.mod-list
	{
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.mod-stats
	{
		list-style-type: none;
		/* font-size: 90%; */
	}

	.mod-stats li
	{
		background: lightgray;
		padding: 2px 5px;
		margin-bottom: 5px;
	}

	/* .mod-stats li:nth-child(odd)
	{
		background: gray;
	} */

	@media (prefers-color-scheme: dark) {
		.mod-stats li
		{
			background: #333333;
		}
	}

</style>
