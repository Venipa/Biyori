import { Popover } from "@base-ui/react/popover";
import { cva } from "class-variance-authority";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/mainview/components/ui/button";
import { Calendar } from "@/mainview/components/ui/calendar";
import { cn } from "@/mainview/lib/utils";

const datePopoverVariants = cva("z-[60] overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none");

const CALENDAR_START = new Date(1970, 0);
const CALENDAR_END = new Date(new Date().getFullYear() + 1, 11);

function parseFieldDate(value: string): Date | undefined {
	if (value.length === 0) {
		return undefined;
	}
	const date = parse(value.slice(0, 10), "yyyy-MM-dd", new Date());
	return isValid(date) ? date : undefined;
}

function DateField({
	id,
	value,
	onChange,
	onBlur,
	invalid,
	placeholder = "Pick a date",
}: {
	id: string;
	value: string;
	onChange: (next: string) => void;
	onBlur?: () => void;
	invalid?: boolean;
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = parseFieldDate(value);

	return (
		<Popover.Root
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) {
					onBlur?.();
				}
			}}>
			<Popover.Trigger
				render={
					<Button
						id={id}
						type='button'
						variant='outline'
						aria-invalid={invalid || undefined}
						className={cn("w-full justify-start font-normal", selected ? undefined : "text-muted-foreground")}
					/>
				}>
				<CalendarIcon />
				{selected ? format(selected, "MMM d, yyyy") : placeholder}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner className='isolate z-[60] outline-none' side='bottom' align='start' sideOffset={4}>
					<Popover.Popup data-slot='popover-content' className={datePopoverVariants()}>
						<Calendar
							mode='single'
							selected={selected}
							captionLayout='dropdown'
							startMonth={CALENDAR_START}
							endMonth={CALENDAR_END}
							onSelect={(next) => {
								onChange(next ? format(next, "yyyy-MM-dd") : "");
								setOpen(false);
							}}
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

export { DateField };
