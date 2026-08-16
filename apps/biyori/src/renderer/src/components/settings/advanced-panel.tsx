import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/mainview/components/ui/tabs";
import { FieldDescription, FieldError } from "@/mainview/components/ui/field";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { Input } from "@/mainview/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/mainview/components/ui/table";
import { pickLibraryFolderPath } from "@/mainview/lib/library-folder";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";

export function AdvancedPanel() {
	const themeId = useId();
	const sizeId = useId();
	const intervalId = useId();
	const magnetId = useId();
	const torrentFileId = useId();
	const archiveId = useId();
	const form = useFormContext<AppSettingsInput>();

	return (
		<Tabs defaultValue="settings">
			<TabsList>
				<TabsTrigger value="settings">Settings</TabsTrigger>
			</TabsList>
			<TabsContent value="settings" className="pt-4">
				<FieldDescription className="font-medium text-destructive">
					Warning: Do not change these settings unless you are sure of what you
					are doing.
				</FieldDescription>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead className="text-right">Value</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell>
									<label htmlFor={themeId}>Application / UI theme</label>
								</TableCell>
								<TableCell className="text-right">
									<Input
										id={themeId}
										className="ml-auto h-7 w-40 font-mono text-xs"
										{...form.register("uiTheme")}
									/>
									<FieldError errors={[form.formState.errors.uiTheme]} />
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>
									<label htmlFor={sizeId}>Library / File size threshold</label>
								</TableCell>
								<TableCell className="text-right">
									<Input
										id={sizeId}
										type="number"
										className="ml-auto h-7 w-40 font-mono text-xs"
										{...form.register("fileSizeThreshold", {
											valueAsNumber: true,
										})}
									/>
									<FieldError
										errors={[form.formState.errors.fileSizeThreshold]}
									/>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>
									<label htmlFor={intervalId}>
										Recognition / Media detection interval
									</label>
								</TableCell>
								<TableCell className="text-right">
									<Input
										id={intervalId}
										type="number"
										className="ml-auto h-7 w-40 font-mono text-xs"
										{...form.register("mediaDetectionInterval", {
											valueAsNumber: true,
										})}
									/>
									<FieldError
										errors={[form.formState.errors.mediaDetectionInterval]}
									/>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>
									<label htmlFor={magnetId}>
										Torrents / Use magnet links if available
									</label>
								</TableCell>
								<TableCell className="text-right">
									<Controller
										control={form.control}
										name="torrentUseMagnet"
										render={({ field, fieldState }) => (
											<div className="flex flex-col items-end">
												<Checkbox
													id={magnetId}
													checked={Boolean(field.value)}
													onCheckedChange={(checked) => {
														field.onChange(checked === true);
													}}
												/>
												<FieldError errors={[fieldState.error]} />
											</div>
										)}
									/>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>
									<label htmlFor={torrentFileId}>
										Torrents / Download path for .torrent files
									</label>
								</TableCell>
								<TableCell className="text-right">
									<div className="ml-auto flex w-full max-w-80 items-center justify-end gap-2">
										<Input
											id={torrentFileId}
											className="h-7 min-w-0 flex-1 font-mono text-xs"
											{...form.register("torrentFileDownloadPath")}
										/>
										<Button
											type="button"
											variant="outline"
											size="xs"
											onClick={() => {
												void pickLibraryFolderPath().then((path) => {
													if (path) {
														form.setValue("torrentFileDownloadPath", path, {
															shouldDirty: true,
														});
													}
												});
											}}
										>
											Browse...
										</Button>
									</div>
									<FieldError
										errors={[form.formState.errors.torrentFileDownloadPath]}
									/>
								</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>
									<label htmlFor={archiveId}>
										Torrents / Archive limit
									</label>
								</TableCell>
								<TableCell className="text-right">
									<Input
										id={archiveId}
										type="number"
										className="ml-auto h-7 w-40 font-mono text-xs"
										{...form.register("torrentArchiveMaxCount", {
											valueAsNumber: true,
										})}
									/>
									<FieldError
										errors={[form.formState.errors.torrentArchiveMaxCount]}
									/>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
			</TabsContent>
		</Tabs>
	);
}
