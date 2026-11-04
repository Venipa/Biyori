import { useTranslation } from "@biyori/translations/react";
import { PlusIcon } from "lucide-react";
import { ListFilterChips, ListFilterMenu } from "@/mainview/components/app/anime-list/filter-bar";
import { ButtonToggle } from "@/mainview/components/ui/button-toggle";
import { parseFilterQuery, serializeFilterQuery } from "@/mainview/lib/anime-list-filter";
import { setListFilterText, useListFilterText } from "@/mainview/lib/list-filter";
import { trpc } from "@/mainview/trpc";

/** Clauses of the shared list filter text; the title-bar search keeps the free text part. */
export function useListClauses() {
	const listFilter = useListFilterText();
	const parsed = parseFilterQuery(listFilter);
	const tagNames = trpc.anime.tagNames.useQuery(undefined, { staleTime: Number.POSITIVE_INFINITY }).data ?? [];
	return {
		clauses: parsed.clauses,
		tagNames,
		onClausesChange: (clauses: typeof parsed.clauses) => {
			setListFilterText(serializeFilterQuery({ freeText: parsed.freeText, clauses }));
		},
	};
}

/** Chip row for the active filters (editors stay on the chips). */
export function ListClauseChips() {
	const props = useListClauses();
	return props.clauses.length > 0 ? (
		<div className='flex min-w-0 flex-wrap items-center gap-1 border-b px-3 py-1.5'>
			<ListFilterChips {...props} />
		</div>
	) : null;
}

/** Chips plus the add-filter button (seasons page). */
export function ListClauseFilter() {
	const { t } = useTranslation();
	const props = useListClauses();
	return (
		<div className='flex min-w-0 flex-wrap items-center gap-1'>
			<ListFilterChips {...props} />
			<ListFilterMenu {...props}>
				<ButtonToggle pressed={false} onPressedChange={() => undefined} size='xs'>
					<PlusIcon />
					{t("list.addFilter")}
				</ButtonToggle>
			</ListFilterMenu>
		</div>
	);
}
