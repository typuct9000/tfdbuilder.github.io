<script lang="ts">
	type Attribute = "Non-Attribute" | "Fire" | "Chill" | "Electric" | "Toxic";
	type ArcheType = "Tech" | "Dimension" | "Singular" | "Fusion";

	type ScalingSource = "Power" | "HP" | "Shield" | "DEF";

	type DamagePart =
	{
		attribute: Attribute,
		archetype: ArcheType,
		scaling: ScalingSource,
		modifier: number,
		duration: number,
		interval: number,
		range: number
	};

	type Damage = DamagePart[];

	type Stats =
	{
		base: { [attr in ScalingSource]: number },
		power: { [attr in "General" | Attribute | ArcheType]: number },
		modifiers: { [attr in "General" | Attribute | ArcheType]: number },
	};

	const PlaceholderBaseStats =
	{
		base:
		{
			Power: 11000,
			HP: 8000,
			Shield: 2000,
			DEF: 17000,
		},

		power:
		{
			General: 0.53,
			"Non-Attribute": 0.2,
			Fire: 0,
			Chill: 0,
			Electric: 0,
			Toxic: 0,
			Tech: 0.2,
			Dimension: 0,
			Singular: 0,
			Fusion: 0
		},

		modifiers:
		{
			General: 0,
			"Non-Attribute": 0,
			Fire: 0,
			Chill: 0,
			Electric: 0,
			Toxic: 0,
			Tech: 0.2,
			Dimension: 0,
			Singular: 0,
			Fusion: 0
		}

	} satisfies Stats;


	function calculate(damage: Damage, stats = PlaceholderBaseStats)
	{
		let total = 0;
		for (const part of damage)
		{
			const ticks = (part.duration > 0 && part.interval > 0) ? Math.max(1, Math.floor(part.duration / part.interval)) : 1;
			total += ticks * stats.base[part.scaling] * (stats.power.General + stats.power[part.attribute] + stats.power[part.archetype]) * (part.modifier + stats.modifiers.General + stats.modifiers[part.attribute] + stats.modifiers[part.archetype]);
		}

		return total;
	}

</script>




<style>
</style>