export async function getModuleData()
{
	const { default: data } = await import("./assets/module.json", { assert: { type: "json" } });
	return data;
}

export type Module = Awaited<ReturnType<typeof getModuleData>>[0];
