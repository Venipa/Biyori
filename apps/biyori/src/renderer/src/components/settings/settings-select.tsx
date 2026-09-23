import type { SettingsToggleOption } from "@/mainview/components/settings/settings-toggle-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";

type SettingsSelectProps = {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	options: readonly SettingsToggleOption[];
	"aria-invalid"?: boolean;
};

export function SettingsSelect({ id, value, onValueChange, options, "aria-invalid": ariaInvalid }: SettingsSelectProps) {
	const items = Object.fromEntries(options.map((option) => [option.value, option.label]));
	return (
		<Select
			value={value}
			items={items}
			onValueChange={(next) => {
				if (typeof next === "string") {
					onValueChange(next);
				}
			}}>
			<SelectTrigger id={id} size='sm' aria-invalid={ariaInvalid || undefined}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent alignItemWithTrigger={false} align='start'>
				<SelectGroup>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value} disabled={option.disabled}>
							{option.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
