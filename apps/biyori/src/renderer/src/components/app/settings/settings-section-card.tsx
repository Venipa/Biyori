import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/mainview/components/ui/card";
import { FieldGroup } from "@/mainview/components/ui/field";

type SettingsSectionCardProps = {
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
};

export function SettingsSectionCard({ title, description, children, footer }: SettingsSectionCardProps) {
	return (
		<Card>
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
