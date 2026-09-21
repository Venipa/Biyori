import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/mainview/components/ui/select";
import { parseUpdateChannel, UPDATE_CHANNEL_LABELS, UPDATE_CHANNELS, type UpdateChannel } from "@/shared/updater";

type UpdateChannelToggleProps = {
	value: UpdateChannel;
	onValueChange: (channel: UpdateChannel) => void;
	disabled?: boolean;
	id?: string;
};

export function UpdateChannelToggle({ value, onValueChange, disabled, id }: UpdateChannelToggleProps) {
	return (
		<Select
			value={value}
			items={UPDATE_CHANNEL_LABELS}
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
							{UPDATE_CHANNEL_LABELS[channel]}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
