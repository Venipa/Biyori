import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/mainview/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/mainview/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/mainview/components/ui/tabs";
import { Textarea } from "@/mainview/components/ui/textarea";
import { listStatusSchema } from "@/shared/list";

const TITLE_LANGUAGE_ITEMS = {
	Romaji: "Romaji",
	English: "English",
	Native: "Native",
} as const;

const listStatusItems = Object.fromEntries(
	listStatusSchema.options.map((status) => [status, status]),
) as Record<(typeof listStatusSchema.options)[number], string>;

export function ApplicationPanel() {
	const titleLanguageId = useId();
	const defaultAddToListStatusId = useId();
	const autostartId = useId();
	const closeToTrayId = useId();
	const externalLinksId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<Tabs defaultValue="anime-list">
			<TabsList>
				<TabsTrigger value="anime-list">Anime list</TabsTrigger>
				<TabsTrigger value="general">General</TabsTrigger>
			</TabsList>
			<TabsContent value="anime-list" className="pt-4">
				<FieldGroup>
					<FieldSet className="rounded-md border p-3">
						<FieldLegend variant="label" className="text-muted-foreground">
							Appearance
						</FieldLegend>
						<Controller
							control={form.control}
							name="titleLanguage"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid || undefined}>
									<FieldLabel htmlFor={titleLanguageId}>
										Title language preference:
									</FieldLabel>
									<div className="max-w-64">
										<Select
											value={field.value}
											items={TITLE_LANGUAGE_ITEMS}
											onValueChange={(value) => {
												if (typeof value === "string") {
													field.onChange(value);
												}
											}}
										>
											<SelectTrigger id={titleLanguageId} className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem value="Romaji">Romaji</SelectItem>
													<SelectItem value="English">English</SelectItem>
													<SelectItem value="Native">Native</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
									</div>
									<FieldError errors={[fieldState.error]} />
								</Field>
							)}
						/>
					</FieldSet>
					<FieldSet className="rounded-md border p-3">
						<FieldLegend variant="label" className="text-muted-foreground">
							Add to list
						</FieldLegend>
						<Controller
							control={form.control}
							name="defaultAddToListStatus"
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid || undefined}>
									<FieldLabel htmlFor={defaultAddToListStatusId}>
										Default status when adding:
									</FieldLabel>
									<div className="max-w-64">
										<Select
											value={field.value ?? "Plan to watch"}
											items={listStatusItems}
											onValueChange={(value) => {
												if (typeof value === "string") {
													field.onChange(value);
												}
											}}
										>
											<SelectTrigger
												id={defaultAddToListStatusId}
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{listStatusSchema.options.map((status) => (
														<SelectItem key={status} value={status}>
															{status}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									</div>
									<FieldError errors={[fieldState.error]} />
								</Field>
							)}
						/>
					</FieldSet>
				</FieldGroup>
			</TabsContent>
			<TabsContent value="general" className="pt-4">
				<FieldGroup>
					<FieldSet className="rounded-md border p-3">
						<FieldLegend variant="label" className="text-muted-foreground">
							Startup
						</FieldLegend>
						<FormCheckbox
							control={form.control}
							name="autostart"
							id={autostartId}
							label="Autostart"
						/>
						<AutostartTrayField />
					</FieldSet>
					<FieldSet className="rounded-md border p-3">
						<FieldLegend variant="label" className="text-muted-foreground">
							Tray
						</FieldLegend>
						<FormCheckbox
							control={form.control}
							name="closeToTray"
							id={closeToTrayId}
							label="Close to tray"
						/>
					</FieldSet>
					<FieldSet className="rounded-md border p-3">
						<FieldLegend variant="label" className="text-muted-foreground">
							External links
						</FieldLegend>
						<Field>
							<Textarea
								id={externalLinksId}
								className="min-h-28 font-mono text-xs"
								{...form.register("externalLinks")}
							/>
							<FieldError errors={[form.formState.errors.externalLinks]} />
						</Field>
					</FieldSet>
				</FieldGroup>
			</TabsContent>
		</Tabs>
	);
}

function AutostartTrayField() {
	const autostartTrayId = useId();
	const form = useFormContext<AppSettingsInput>();
	const autostart = form.watch("autostart");
	return (
		<FormCheckbox
			control={form.control}
			name="autostartTray"
			id={autostartTrayId}
			label="Autostart in tray"
			disabled={!autostart}
		/>
	);
}
