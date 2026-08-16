import { useId, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { FolderIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/mainview/components/ui/tabs";
import { Button } from "@/mainview/components/ui/button";
import { FormCheckbox } from "@/mainview/components/form-checkbox";
import {
	FieldError,
	FieldGroup,
	FieldSet,
	FieldLegend,
	FieldDescription,
} from "@/mainview/components/ui/field";
import { pickLibraryFolderPath } from "@/mainview/lib/library-folder";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";

export function LibraryPanel() {
	const realtimeId = useId();
	const form = useFormContext<AppSettingsInput>();
	const folders = useFieldArray({
		control: form.control,
		name: "libraryFolders",
	});
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	return (
		<Tabs defaultValue="folders">
			<TabsList>
				<TabsTrigger value="folders">Folders</TabsTrigger>
			</TabsList>
			<TabsContent value="folders" className="pt-4">
				<FieldGroup>
					<FieldSet className="rounded-md border p-3">
						<FieldLegend variant="label" className="text-muted-foreground">
							Library folders
						</FieldLegend>
						<FieldDescription>
							These folders will be scanned and monitored for new episodes.
						</FieldDescription>
						<ul className="flex min-h-32 flex-col gap-1 rounded-md border bg-background p-2">
							{folders.fields.map((folder, index) => (
								<li key={folder.id}>
									<button
										type="button"
										className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-sm hover:bg-muted"
										onClick={() => {
											setSelectedIndex(index);
										}}
									>
										<FolderIcon className="size-4 shrink-0 text-muted-foreground" />
										<span className="truncate">{folder.path}</span>
									</button>
								</li>
							))}
						</ul>
						<FieldError
							errors={[
								{
									message:
										form.formState.errors.libraryFolders?.message ??
										form.formState.errors.libraryFolders?.root?.message,
								},
							]}
						/>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									void pickLibraryFolderPath().then((path) => {
										if (path) {
											folders.append({ path });
										}
									});
								}}
							>
								Add new...
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={selectedIndex == null}
								onClick={() => {
									if (selectedIndex == null) {
										return;
									}
									folders.remove(selectedIndex);
									setSelectedIndex(null);
								}}
							>
								Remove
							</Button>
						</div>
					</FieldSet>
					<FieldSet className="rounded-md border p-3">
						<FieldLegend variant="label" className="text-muted-foreground">
							Real-time monitor
						</FieldLegend>
						<FormCheckbox
							control={form.control}
							name="realtimeMonitor"
							id={realtimeId}
							label="Detect new files and folders under library folders"
						/>
					</FieldSet>
				</FieldGroup>
			</TabsContent>
		</Tabs>
	);
}
