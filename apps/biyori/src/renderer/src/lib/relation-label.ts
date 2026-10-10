import { t } from "@biyori/translations/react";
import { relatedMediaLabel } from "@/lib/schemas/related-media";

export function relationLabel(relationType: string): string {
	switch (relationType) {
		case "ADAPTATION":
			return t("anime.relationAdaptation");
		case "PREQUEL":
			return t("anime.relationPrequel");
		case "SEQUEL":
			return t("anime.relationSequel");
		case "PARENT":
			return t("anime.relationParent");
		case "SIDE_STORY":
			return t("anime.relationSideStory");
		case "CHARACTER":
			return t("anime.relationCharacter");
		case "SUMMARY":
			return t("anime.relationSummary");
		case "ALTERNATIVE":
			return t("anime.relationAlternative");
		case "SPIN_OFF":
			return t("anime.relationSpinOff");
		case "OTHER":
			return t("anime.relationOther");
		case "SOURCE":
			return t("anime.relationSource");
		case "COMPILATION":
			return t("anime.relationCompilation");
		case "CONTAINS":
			return t("anime.relationContains");
		default:
			return relatedMediaLabel(relationType);
	}
}

export function relationHistoryLabel(viaRelation: string | undefined, season: string | undefined): string {
	const relation = viaRelation?.trim();
	if (relation) {
		return relationLabel(relation);
	}
	return season?.trim() ?? "";
}
