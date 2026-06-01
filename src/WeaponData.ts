async function getWeaponData()
{
	const { default: data } = await import("./assets/weapon.json");
	return data;
}

async function getStatStringData()
{
	const { default: data } = await import("./assets/stat.json");

	const result = {} as Record<string, string>;
	data.forEach(item => result[item.stat_id] = item.stat_name);
	return result;
}

export async function getWeaponsData()
{
	const weapons = await getWeaponData() as Weapon[];
	const statNames = await getStatStringData();

	for (const weapon of weapons)
	{
		weapon.stats = {};

		const attacks = weapon.firearm_atk.find(item => item.level === 100)?.firearm;
		if (attacks)
		{
			for (const attack of attacks)
			{
				const name = statNames[attack.firearm_atk_type];
				if (name)
				{
					weapon.stats[name] = attack.firearm_atk_value;
				}
				else
				{
					console.warn(`Can't find name for attack type ${attack.firearm_atk_type}`);
				}
			}
		}
		else
		{
			console.warn(`Can't find level 100 attack value for ${weapon.weapon_name}`);
		}

		for (const stat of weapon.base_stat)
		{
			const statName = statNames[stat.stat_id];
			if (statName)
			{
				if (typeof stat.stat_value === "number")
				{
					weapon.stats[statName] = stat.stat_value;
				}
			}
			// else
			// {
			// 	console.warn(`Can't find name for stat id ${stat.stat_id}`);
			// }
		}
	}

	return weapons;
}

export type Weapon = Awaited<ReturnType<typeof getWeaponData>>[0] & { stats: Record<string, number> };


export async function getWeaponMaxRolls()
{
	const { default: data } = await import("./assets/weaponrolls.json");
	return data;
}

export type WeaponType = keyof Awaited<ReturnType<typeof getWeaponMaxRolls>>;
export type WeaponRollStat = keyof Awaited<ReturnType<typeof getWeaponMaxRolls>>[WeaponType];
