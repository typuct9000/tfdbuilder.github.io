<script lang="ts">
    import type { CommonStat, Stats } from "../Effects";
    import { keysOf } from "../Utility";
    import { getWeaponMaxRolls, getWeaponsData, type Weapon, type WeaponRollStat, type WeaponType } from "../WeaponData";

	let { value = $bindable(""), stats = new Map() } : { value?: string, stats?: Stats } = $props();

	const weaponsPromise = getWeaponsData();
	const maxRollsPromise = getWeaponMaxRolls();

	let headshotAccuracy = $state(50);

	function getModStat(name: CommonStat)
	{
		const stat = stats.get(name);
		if (stat)
		{
			return stat.isPercentage ? stat.value / 100 : stat.value;
		}

		return 0;
	}

	async function getRollStat(maxRolls: Awaited<ReturnType<typeof getMaxRolls>>, stat: WeaponRollStat)
	{
		if (stat in maxRolls)
		{
			return maxRolls[stat];
		}

		return 0;
	}

	function calculateWeaponDPS(weapon: Weapon)
	{
		console.log(stats);
		const atk = (weapon.stats["Firearm ATK"] ?? 0) * (1 + getModStat("Firearm ATK"));
		const fireRate = (weapon.stats["Fire Rate"] ?? 1) * (1 + getModStat("Fire Rate"));
		const roundsPerMag = (weapon.stats["Rounds per Magazine"] ?? 0) * (1 + getModStat("Rounds per Magazine"));
		const reloadTime = (weapon.stats["Reload Time"] ?? 0) * (1 + getModStat("Reload Time Modifier"));
		const critRate = (weapon.stats["Firearm Critical Hit Rate"] ?? 0) * (1 + getModStat("Firearm Critical Hit Rate"));
		const critDamage = (weapon.stats["Firearm Critical Hit Damage"] ?? 1) * (1 + getModStat("Firearm Critical Hit Damage"));
		const headshotDamage = (weapon.stats["Weak Point Damage"] ?? 1) * (1 + getModStat("Weak Point Damage"));

		let critMod = 1 + Math.min(1, critRate) * (critDamage - 1);
		let headshotMod = 1 + (headshotDamage - 1 + 0.5) * headshotAccuracy / 100;

		let burst = atk * critMod * headshotMod * fireRate / 60;
		let sustained = atk * critMod * headshotMod * Math.floor(roundsPerMag) / (Math.floor(roundsPerMag) / (fireRate / 60) + reloadTime);

		return { burst, sustained };
	}

	// [ [ "Weapon ATK", 0.11], ["Weapon Critical Hit Chance", 0.2], ["Weapon Critical Hit Multiplier", 0.3], ["Weak Point Damage", 0.15] ]
	let weaponRolls = $state([] as WeaponRollStat[]);
	$inspect(weaponRolls);

	async function addRoll(weapon: Weapon)
	{
		if (weaponRolls.length > 3)
		{
			return;
		}

		const maxRolls = await getMaxRolls(weapon);
		for (const stat of keysOf(maxRolls))
		{
			if (!weaponRolls.includes(stat))
			{
				weaponRolls.push(stat);
				return;
			}
		}
	}

	function removeRoll(weapon: Weapon, stat: WeaponRollStat)
	{
		weaponRolls = weaponRolls.filter(item => item !== stat);
	}

	async function getMaxRolls(weapon: Weapon)
	{
		const maxRolls = await maxRollsPromise;
		if (weapon.weapon_type in maxRolls)
		{
			return maxRolls[weapon.weapon_type as WeaponType];
		}
		else
		{
			throw `No rolls data for weapon type ${weapon.weapon_type}`;
		}
	}

</script>

{#await weaponsPromise}

	<div>Loading...</div>

{:then weapons}

	<select bind:value>
		<option value="">Weapon</option>
		{#each weapons as weapon (weapon.weapon_id)}
			<option>{weapon.weapon_name}</option>
		{/each}
	</select>

	{#if value}
		{@const weapon = weapons.find(item => item.weapon_name === value)}
		{#if weapon}
			{#await getMaxRolls(weapon)}
				<span></span>
			{:then maxRolls} 
				{#each weaponRolls as stat, i (i)}
					<div>
						<select class="inline" bind:value={weaponRolls[i]}>
							{#each keysOf(maxRolls) as stat}
								<option>{stat}</option>
							{/each}
						</select>
						{Intl.NumberFormat().format(maxRolls[weaponRolls[i]!])}
						<button onclick={() => removeRoll(weapon, stat)}>-</button>
					</div>	
				{/each}
				{#if weaponRolls.length < 4}
					<div><button onclick={() => addRoll(weapon)}>+ Add Roll</button></div>	
				{/if}
				<hr/>
			{/await}
			<div><label>Headshot Accuracy <input type="range" min="0" max="100" bind:value={headshotAccuracy}></label></div>
			{@const dps = calculateWeaponDPS(weapon)}
			<li>Burst DPS: {Intl.NumberFormat().format(dps.burst)}</li>
			<li>Sustained DPS: {Intl.NumberFormat().format(dps.sustained)}</li>
			<hr/>
			{#each Object.entries(weapon.stats) as [name, value] (name)}
				<li>{name}: {value}</li>
			{/each}
		{/if}
	{/if}

{/await}

<style>
button
{
	border: none;
	border-radius: 0;
	padding: 2px 5px;
	margin: 0;
	font-size: smaller;
	font-weight: bold;
}

select
{
	height: 24px;
	padding: 1px 2px 1px 2px;
	margin: 5px 0;
}

select.inline
{
	border: none;
	border-bottom: solid 1px gainsboro;
	outline: none;
}

@media (prefers-color-scheme: light)
{
	select.inline
	{
		border-bottom-color: black;
	}
}

</style>
