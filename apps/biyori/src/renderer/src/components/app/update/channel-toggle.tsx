import { useTranslation } from "@biyori/translations/react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { parseUpdateChannel, UPDATE_CHANNELS, type UpdateChannel } from "@/shared/updater";

type UpdateChannelToggleProps = {
	value: UpdateChannel;
	onValueChange: (channel: UpdateChannel) => void;
	disabled?: boolean;
	id?: string;
};

const channelLabel = {
	stable: "update.stable",
	beta: "update.beta",
	alpha: "update.alpha",
} as const;

export function UpdateChannelToggle({ value, onValueChange, disabled, id }: UpdateChannelToggleProps) {
	const { t } = useTranslation();
	const items = {
		stable: t(channelLabel.stable),
		beta: t(channelLabel.beta),
		alpha: t(channelLabel.alpha),
	};
	return (
		<Select
			value={value}
			items={items}
			disabled={disabled}
			onValueChange={(next) => {
				if (typeof next === "string") {
					onValueChange(parseUpdateChannel(next));
				}
			}}>
			<SelectTrigger id={id} size='sm'>
				<SelectValue />
			</SelectTrigger>
			<SelectContent alignItemWithTrigger={false} align='start'>
				<SelectGroup>
					{UPDATE_CHANNELS.map((channel) => (
						<SelectItem key={channel} value={channel}>
							{items[channel]}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
