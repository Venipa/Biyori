import { ToggleGroup, ToggleGroupItem } from "@/mainview/components/ui/toggle-group";
import { parseUpdateChannel, UPDATE_CHANNEL_LABELS, UPDATE_CHANNELS, type UpdateChannel } from "@/shared/updater";

type UpdateChannelToggleProps = {
	value: UpdateChannel;
	onValueChange: (channel: UpdateChannel) => void;
	disabled?: boolean;
	id?: string;
};

export function UpdateChannelToggle({ value, onValueChange, disabled, id }: UpdateChannelToggleProps) {
	return (
		<ToggleGroup
			id={id}
			variant='outline'
			size='sm'
			disabled={disabled}
			value={[value]}
			onValueChange={(next) => {
				const channel = next[0];
				if (channel) {
					onValueChange(parseUpdateChannel(channel));
				}
			}}>
			{UPDATE_CHANNELS.map((channel) => (
				<ToggleGroupItem key={channel} value={channel} aria-label={UPDATE_CHANNEL_LABELS[channel]}>
					{UPDATE_CHANNEL_LABELS[channel]}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
