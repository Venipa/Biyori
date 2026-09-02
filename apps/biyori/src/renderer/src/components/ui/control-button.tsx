import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/mainview/components/ui/button";

type ControlButtonBase = Omit<ComponentProps<typeof Button>, "variant" | "size" | "children"> & {
	inactive?: boolean;
};

export type ControlButtonProps =
	| (ControlButtonBase & { control: "minimize" | "close" })
	| (ControlButtonBase & { control: "maximize"; maximized?: boolean });

const CONTROL_LABEL = {
	minimize: "Minimize",
	close: "Close",
} as const;

export function ControlButton(props: ControlButtonProps) {
	const { control, inactive, ...rest } = props;
	const restore = control === "maximize" && props.maximized;
	const { maximized: _maximized, ...buttonProps } = rest as ControlButtonBase & { maximized?: boolean };
	const label = control === "maximize" ? (restore ? "Restore" : "Maximize") : CONTROL_LABEL[control];

	return (
		<Button
			{...buttonProps}
			type='button'
			variant='window'
			size='window'
			data-slot='control-button'
			data-control={control}
			data-inactive={inactive ? "" : undefined}
			aria-label={label}
			onDoubleClick={(event) => {
				event.stopPropagation();
				buttonProps.onDoubleClick?.(event);
			}}>
			{control === "minimize" ? <MinusIcon /> : null}
			{control === "maximize" ? restore ? <CopyIcon /> : <SquareIcon /> : null}
			{control === "close" ? <XIcon /> : null}
		</Button>
	);
}
