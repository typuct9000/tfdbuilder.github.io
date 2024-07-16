export async function getModuleData()
{
	const { default: data } = await import("./assets/module.json", { assert: { type: "json" } });
	return data;
}

export type Module = Awaited<ReturnType<typeof getModuleData>>[0];


export function getModuleDrain(module: Module, level: number, isMatching: boolean)
{
	level = Math.max(0, Math.min(level, module.module_stat.length - 1));

	// Mods with negative drain are listed with 0 capacity.
	const drain = module.module_stat[level]!.module_capacity || -module.module_stat[level]!.level;

	return isMatching ? drain - Math.floor(Math.abs(drain) / 2) : drain;
}

