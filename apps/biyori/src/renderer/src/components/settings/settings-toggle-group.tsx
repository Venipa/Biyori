import { ToggleGroup, ToggleGroupItem } from "@/mainview/components/ui/toggle-group";

export type SettingsToggleOption = {
	value: string;
	label: string;
	disabled?: boolean;
};

type SettingsToggleGroupProps = {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	options: readonly SettingsToggleOption[];
	"aria-invalid"?: boolean;
};

export function SettingsToggleGroup({ id, value, onValueChange, options, "aria-invalid": ariaInvalid }: SettingsToggleGroupProps) {
	return (
		<ToggleGroup
			id={id}
			variant='outline'
			size='sm'
			className='flex-wrap'
			value={[value]}
			aria-invalid={ariaInvalid || undefined}
			onValueChange={(next) => {
				const selected = next[0];
				if (selected) {
					onValueChange(selected);
				}
			}}>
			{options.map((option) => (
				<ToggleGroupItem key={option.value} value={option.value} disabled={option.disabled}>
					{option.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
