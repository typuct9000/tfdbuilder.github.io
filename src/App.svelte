<script lang="ts">
    import { fade } from "svelte/transition";
	import { CommonEffects, type CommonStat, type Stats, type StatValue } from "./Effects";
	import { getModuleData, getModuleDrain, type Module } from "./ModData";
	import ModCard from "./lib/ModCard.svelte";
    import ModSlot from "./lib/ModSlot.svelte";
    import WeaponCalc from "./lib/WeaponCalc.svelte";

	const modulesPromise = getModuleData();
	modulesPromise.then(init);

	let isLoaded = false;

	function init()
	{
		isLoaded = true;
		initFromBuildCode(window.location.search.slice(1));
	}

	const ModFlags = 
	{
		None: 0,
		MatchingSocket: 1,
	} as const;

	type ModFlags = typeof ModFlags[keyof typeof ModFlags];

	type SelectedMod = 
	{
		module: Module,
		level: number,
		isMatching: boolean,
	};

	let selected = $state([] as SelectedMod[]);
	let stats = $derived(parseStats(selected));

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
			(filter.tier === "" || m.module_tier_id === filter.tier) &&
			(filter.type === "" || m.module_type === filter.type) &&
			(filter.socket === "" || m.module_socket_type === filter.socket));
		return after;
	}

	function getFilterOptions(modules: Module[], key: keyof Pick<Module, "module_class" | "module_socket_type" | "module_tier_id" | "module_type">)
	{
		const options = new Set<string>();
		modules.forEach((mod) => { if (mod[key]) options.add(mod[key]); });
		return options;
	}

	function parseStats(selected: SelectedMod[])
	{
		const statValuesRaw = new Map<CommonStat, string[]>();
		const otherEffects = new Set<string>();
		for (const mod of selected)
		{
			const description = mod.module.module_stat[mod.level]?.value;
			if (description)
			{
				const effects = parseModDescription(description);
				for (const effect of Object.keys(effects))
				{
					if (isKnownEffect(effect))
					{
						statValuesRaw.set(effect as CommonStat, [...statValuesRaw.get(effect as CommonStat) ?? [], effects[effect] ?? ""]);
					}
					else
					{
						otherEffects.add(description);
					}
				}
			}
		}

		const stats = new Map<CommonStat, StatValue>();
		for (const [name, values] of statValuesRaw)
		{
			stats.set(name, parseValues(values));
		}

		return { stats, effects: otherEffects };
	}

	function isKnownEffect(name: string)
	{
		return (CommonEffects as unknown as string[]).includes(name);
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

	function parseValues(values: string[]): StatValue
	{
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
					isPercentage = isPercentage || Boolean(percent);
					const float = parseFloat(value);
					result += /*percent ? float / 100 :*/ float;
				}
			}
			else
			{
				console.warn(`Couldn't parse mod value ${item}`);
			}
		}

		return { value: result, isPercentage, toString: function() { return `${this.value >= 0 ? "+" : ""}${this.value.toFixed(1)}${this.isPercentage ? "%" : ""}`; }};
	}

	const InvertedStats =
	[
		"Skill Cooldown",
		"Skill Cost",
		"Recoil",

	] as const;

	function isInverted(name: CommonStat)
	{
		return InvertedStats.includes(name as typeof InvertedStats[number]);
	}

	function sorted(stats: Stats)
	{
		return [...stats.entries()].sort((a, b) => Math.abs(b[1].value) - Math.abs(a[1].value));
	}

	const usedCapacity = $derived(selected.reduce((value, mod) => value + getModuleDrain(mod.module, mod.level, mod.isMatching), 0));
	const buildCode = $derived(selected.map((m) => `${m.module.module_id}:${m.level}:${m.isMatching ? ModFlags.MatchingSocket : ModFlags.None}`).join(","));

	$effect(updateUrl);

</script>

<main>

	<div class="loadout-column">

		<div style="display: flex; flex-direction: row; gap: 10px; margin-bottom: 15px">

			<select style="flex: 1;">
				<optgroup label="Descendant">
					<option>Ajax</option>
				</optgroup>
				<optgroup label="Weapon">
					<option>Eternal Willpower</option>
				</optgroup>
			</select>

			<input type="text" placeholder="Description" style="flex: 10; border: none;" />

		</div>

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

		{#await modulesPromise}
			<div>Loading...</div>
		{:then modules}
			{@const filtered = filterModules(modules)}
			<div class="flex-flow filter-list" style="margin: 10px 0;">
				<input type="search" title="Search in titles and description. Accepts Regural Expressions" placeholder="Search" bind:value={filter.text} />
				<select bind:value={filter.class}>
					<option value="">Class</option>
					{#each getFilterOptions(modules, "module_class") as option}
						<option>{option}</option>
					{/each}
				</select>
				<select bind:value={filter.tier}>
					<option value="">Rarity</option>
					{#each getFilterOptions(modules, "module_tier_id") as option}
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

	</div>

	<div class="stats-column">

		<button title="Copy link to this build to clipboard" onclick={copyBuildLink}>Copy Build Link</button> {#if isCopiedShown}<span style="position: absolute; margin: 10px 10px;" out:fade>Copied!</span>{/if}

		<p>Used capacity: {usedCapacity}</p>

		<div class="mod-stats">
			{#each sorted(stats.stats) as [name, value] (name)}
				<li>{name} {value.toString()}</li>
			{/each}
			{#each stats.effects as effect}
				<li>{effect}</li>
			{/each}
		</div>

		<WeaponCalc stats={stats.stats} />

	</div>

	

</main>

<style>
	main
	{
		display: flex;
		gap: 10px;
	}

	.loadout-column
	{
		min-width: 150px;
		max-width: 980px;
		flex: 2 1 980px;
	}

	.stats-column
	{
		flex: 1 2 450px;
	}

	.flex-flow
	{
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		gap: 10px;
	}

	.loadout-container
	{
		min-width: 150px;
		max-width: 980px;
		min-height: 450px;

		display: grid;
		grid-template-columns: repeat(auto-fit, 150px);
		column-gap: 14px;
		row-gap: 10px;

		margin-bottom: 20px;
	}

	.loadout-container > *
	{
		grid-column: 1 / -1;
	}

	.mod-list
	{
		min-width: 150px;
		display: grid;
		grid-template-columns: repeat(auto-fit, 150px);
		column-gap: 14px;
		row-gap: 10px;
	}

	.stats-column
	{
		list-style-type: none;
		/* font-size: 90%; */
	}

	.stats-column li
	{
		background: lightgray;
		padding: 2px 5px;
		margin-bottom: 5px;
	}

	/* .stats-column li:nth-child(odd)
	{
		background: gray;
	} */

	@media (prefers-color-scheme: dark) {
		.stats-column li
		{
			background: #333333;
		}
	}

</style>
