import type { ReactNode } from "react";
import { useSettingsPageCard } from "@/mainview/components/app/settings/settings-page-nav";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/mainview/components/ui/card";
import { FieldGroup } from "@/mainview/components/ui/field";
import { settingsCardElementId } from "@/mainview/lib/settings-nav";

type SettingsSectionCardProps = {
	id?: string;
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
};

export function SettingsSectionCard({ id, title, description, children, footer }: SettingsSectionCardProps) {
	useSettingsPageCard(id, title);
	return (
		<Card id={id ? settingsCardElementId(id) : undefined} className={id ? "scroll-mt-16" : undefined}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<CardContent>
				<FieldGroup>{children}</FieldGroup>
			</CardContent>
			{footer ? <CardFooter>{footer}</CardFooter> : null}
		</Card>
	);
}
