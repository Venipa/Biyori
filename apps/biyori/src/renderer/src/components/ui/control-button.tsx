import { useTranslation } from "@biyori/translations/react";
import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/mainview/components/ui/button";

type ControlButtonBase = Omit<ComponentProps<typeof Button>, "variant" | "size" | "children"> & {
	inactive?: boolean;
};

export type ControlButtonProps = (ControlButtonBase & { control: "minimize" | "close" }) | (ControlButtonBase & { control: "maximize"; maximized?: boolean });

export function ControlButton(props: ControlButtonProps) {
	const { t } = useTranslation();
	const { control, inactive, ...rest } = props;
	const restore = control === "maximize" && props.maximized;
	const { maximized: _maximized, ...buttonProps } = rest as ControlButtonBase & { maximized?: boolean };
	const label = control === "maximize" ? (restore ? t("shell.restore") : t("shell.maximize")) : control === "close" ? t("common.close") : t("shell.minimize");

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
			{control === "minimize" ? <MinusIcon className='self-end mb-1.5 size-3' /> : null}
			{control === "maximize" ? restore ? <CopyIcon /> : <SquareIcon className='size-3' /> : null}
			{control === "close" ? <XIcon /> : null}
		</Button>
	);
}
