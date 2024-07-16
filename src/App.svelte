<script lang="ts">
    import { CommonEffects } from "./Effects";
	import { getModuleData, type Module } from "./ModData";
    import ModCard from "./lib/ModCard.svelte";

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
		flags: ModFlags
	};

	let selected: SelectedMod[] = $state([]);

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
					selected = [...selected, { module, level: parseInt(level ?? "0"), flags: parseInt(flags ?? "0") }];
				}
			});
	}

	function updateUrl()
	{
		if (isLoaded)
		{
			window.history.replaceState(null, '', `?${buildCode}`);
		}
	}

	function selectMod(module: Module)
	{
		if (canSelect(module))
		{
			selected = [...selected, { module, level: getMaxLevel(module), flags: ModFlags.None }];
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

	const usedCapacity = $derived(selected.reduce((value, mod) => value + (mod.module.module_stat[mod.level]?.module_capacity ?? 0), 0));
	const buildCode = $derived(selected.map((m) => `${m.module.module_id}:${m.level}:${m.flags}`).join(","));

	$effect(updateUrl);

</script>

<main>

	<div><a href="{window.location.pathname + "?" + buildCode}">Build link</a> Used capacity: {usedCapacity}</div>

	<div style="display: flex; justify-content: space-between; align-items: flex-start;">

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div style="flex: 3" class="loadout-container" ondrop={handleDragDrop} ondragover={handleDragOver}>
			{#each selected as mod, i (mod.module.module_id)}
				{#if mod.module}
					<ModCard showButtons={true} mod={mod.module} bind:level={mod.level}
						ondblclick={(e) => { e.preventDefault(); unselectMod(mod.module); }}
						oncontextmenu={(e) => { e.preventDefault(); unselectMod(mod.module); }} />
				{/if}
			{/each}
		</div>

		<div style="flex: 1">
			<ul>
				{#each getStats() as item}
					<li>{item}</li>
				{/each}
			</ul>
		</div>

	</div>

	{#await modulesPromise}
		<div>Loading...</div>
	{:then modules}
		{@const filtered = filterModules(modules)}
		<div class="mod-list">
			<input type="search" placeholder="Search" bind:value={filter.text} />
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
		<div style="display: flex; flex-wrap: wrap; gap: 10px">
			{#each filtered as mod}
				<ModCard {mod} level={100} ondblclick={() => selectMod(mod)} />
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
		min-width: 975px;
		min-height: 550px;
		border: solid 1px black;
	}

	.mod-list
	{
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

</style>
