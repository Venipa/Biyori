import {
  anilistTokenSchema,
  type AnilistToken,
  type AnilistTokenInput,
} from "@/lib/schemas/anilist-token";
import type { AppSettingsInput } from "@/lib/schemas/app-settings";
import { Button } from "@/mainview/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/mainview/components/ui/field";
import { Input } from "@/mainview/components/ui/input";
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
import { trpc } from "@/mainview/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";

export function ServicesPanel() {
	const serviceId = useId();
	const usernameId = useId();
	const tokenId = useId();
	const form = useFormContext<AppSettingsInput>();
	const tokenForm = useForm<AnilistTokenInput, unknown, AnilistToken>({
		resolver: zodResolver(anilistTokenSchema),
		defaultValues: { token: "" },
	});
	const statusQuery = trpc.anilist.status.useQuery();
	const authorize = trpc.anilist.authorize.useMutation();
	const connectWithToken = trpc.anilist.connectWithToken.useMutation({
		onSuccess: async () => {
			tokenForm.reset({ token: "" });
			await statusQuery.refetch();
		},
	});
	const disconnect = trpc.anilist.disconnect.useMutation({
		onSuccess: async () => {
			await statusQuery.refetch();
		},
	});
	const connected = Boolean(statusQuery.data?.connected);
	const username = statusQuery.data?.username ?? "";
	const errorMessage =
		statusQuery.data?.loginError ??
		authorize.error?.message ??
		connectWithToken.error?.message ??
		disconnect.error?.message ??
		null;

	return (
		<Tabs defaultValue="anilist">
			<TabsList>
				<TabsTrigger value="main">Main</TabsTrigger>
					<TabsTrigger value="myanimelist" disabled>
						MyAnimeList
					</TabsTrigger>
					<TabsTrigger value="kitsu" disabled>
						Kitsu
					</TabsTrigger>
				<TabsTrigger value="anilist">AniList</TabsTrigger>
			</TabsList>
			<TabsContent value="main" className="pt-4">
				<FieldSet className="rounded-md border p-3">
					<FieldLegend variant="label" className="text-muted-foreground">
						Default service
					</FieldLegend>
					<p className="text-sm text-muted-foreground">
						Choose which service your list, updates, and synchronization use by
						default.
					</p>
					<Controller
						control={form.control}
						name="defaultService"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid || undefined}>
								<FieldLabel htmlFor={serviceId}>Default service</FieldLabel>
								<Select
									value={field.value}
									items={{
										anilist: "AniList",
										myanimelist: "MyAnimeList (coming soon)",
										kitsu: "Kitsu (coming soon)",
									}}
									onValueChange={(value) => {
										if (typeof value === "string") {
											field.onChange(value);
										}
									}}
								>
									<SelectTrigger id={serviceId} className="max-w-64">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="anilist">AniList</SelectItem>
											<SelectItem value="myanimelist" disabled>
												MyAnimeList (coming soon)
											</SelectItem>
											<SelectItem value="kitsu" disabled>
												Kitsu (coming soon)
											</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>
				</FieldSet>
			</TabsContent>
			<TabsContent value="myanimelist" className="pt-4">
				<p className="text-sm text-muted-foreground">
					Connect your MyAnimeList account to sync your list.
				</p>
			</TabsContent>
			<TabsContent value="kitsu" className="pt-4">
				<p className="text-sm text-muted-foreground">
					Connect your Kitsu account to sync your list.
				</p>
			</TabsContent>
			<TabsContent value="anilist" className="pt-4">
				<FieldSet className="rounded-md border p-3">
					<FieldLegend variant="label" className="text-muted-foreground">
						Account
					</FieldLegend>
					<FieldGroup>
						{connected ? (
							<Field>
								<FieldLabel htmlFor={usernameId}>Username</FieldLabel>
								<div className="flex items-center gap-2">
									<Input
										id={usernameId}
										value={username}
										readOnly
										className="flex-1 pointer-events-none select-none"
									/>
									<Button
										type="button"
										variant="outline"
										className="shrink-0"
										disabled={disconnect.isPending}
										onClick={() => {
											void disconnect.mutateAsync();
										}}
									>
										Disconnect
									</Button>
								</div>
							</Field>
						) : (
							<div className="flex flex-col gap-3">
								<Controller
									control={tokenForm.control}
									name="token"
									render={({ field, fieldState }) => (
										<Field data-invalid={fieldState.invalid || undefined}>
											<FieldLabel htmlFor={tokenId}>Access token</FieldLabel>
											<Textarea
												id={tokenId}
												rows={4}
												placeholder="Paste the access token or the full redirect URL"
												aria-invalid={fieldState.invalid || undefined}
												name={field.name}
												ref={field.ref}
												onBlur={field.onBlur}
												value={typeof field.value === "string" ? field.value : ""}
												onChange={field.onChange}
											/>
											<FieldError errors={[fieldState.error]} />
										</Field>
									)}
								/>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										disabled={authorize.isPending}
										onClick={() => {
											void authorize.mutateAsync();
										}}
									>
										Authorize...
									</Button>
									<Button
										type="button"
										disabled={tokenForm.formState.isSubmitting}
										onClick={() => {
											void tokenForm.handleSubmit((data) => {
												void connectWithToken.mutateAsync(data);
											})();
										}}
									>
										Connect
									</Button>
								</div>
								<p className="text-sm text-muted-foreground">
									Authorize opens your browser. After login, copy the token
									from the address bar (or the token itself), paste it here,
									then Connect.
								</p>
							</div>
						)}
						{errorMessage ? (
							<p className="text-sm text-destructive">{errorMessage}</p>
						) : null}
					</FieldGroup>
				</FieldSet>
			</TabsContent>
		</Tabs>
	);
}
