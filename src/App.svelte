<script lang="ts">
	import { getModuleData, type Module } from "./ModData";
    import ModCard from "./lib/ModCard.svelte";

	const modulesPromise = getModuleData();
	modulesPromise.then(() => initFromBuildCode(window.location.search.slice(1)));
	modulesPromise.then((m) => console.log(m.length));

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

	// function updateUrl()
	// {
	// 	window.history.pushState(null, '', window.location.origin + window.location.pathname + `?${buildCode}`);
	// }

	function selectMod(module: Module)
	{
		if (canSelect(module))
		{
			selected = [...selected, { module, level: getMaxLevel(module), flags: ModFlags.None }];
		}
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
		console.log($state.snapshot(filter));
		const after = modules.filter((m) =>
			(filter.text === "" || m.module_name.includes(filter.text) || m.module_stat[0]?.value.includes(filter.text)) &&
			(filter.class === "" || m.module_class === filter.class) &&
			(filter.tier === "" || m.module_tier === filter.tier) &&
			(filter.type === "" || m.module_type === filter.type) &&
			(filter.socket === "" || m.module_socket_type === filter.socket));
		console.log({ before: modules.length, after: after.length });
		return after;
	}

	function getFilterOptions(modules: Module[], key: keyof Pick<Module, "module_class" | "module_socket_type" | "module_tier" | "module_type">)
	{
		const options = new Set<string>();
		modules.forEach((mod) => { if (mod[key]) options.add(mod[key]); });
		return options;
	}

	const usedCapacity = $derived(selected.reduce((value, mod) => value + (mod.module.module_stat[mod.level]?.module_capacity ?? 0), 0));
	const buildCode = $derived(selected.map((m) => `${m.module.module_id}:${m.level}:${m.flags}`).join(","));

</script>

<main>

	<div><a href="{window.location.pathname + "?" + buildCode}">Build link</a> Used capacity: {usedCapacity}</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div style="width: 1020px; height: 550px; border: solid 1px black; display: flex; flex-wrap: wrap; gap: 10px; overflow: scroll" ondrop={handleDragDrop} ondragover={handleDragOver}>
		{#each selected as mod, i (mod.module.module_id)}
			{#if mod.module}
				<ModCard showButtons={true} mod={mod.module} bind:level={mod.level} 
					oncontextmenu={(e) => { e.preventDefault(); selected = selected.filter((m) => m.module.module_id !== mod.module.module_id); }} />
			{/if}
		{/each}
	</div>

	{#await modulesPromise}
		<div>Loading...</div>
	{:then modules}
		{@const filtered = filterModules(modules)}
		<div style="display: flex; flex-wrap: wrap; gap: 10px;">
			<input type="search" bind:value={filter.text} />
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
		</div>
		<div>Showing {filtered.length}</div>
		<div style="display: flex; flex-wrap: wrap; gap: 10px">
			{#each filtered as mod}
				<ModCard {mod} level={100} ondblclick={() => selectMod(mod)} />
			{/each}
		</div>
	{/await}

</main>

<style>


</style>
