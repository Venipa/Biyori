import { ListFilterBar } from "@/mainview/components/app/anime-list/filter-bar";
import { parseFilterQuery, serializeFilterQuery } from "@/mainview/lib/anime-list-filter";
import { setListFilterText, useListFilterText } from "@/mainview/lib/list-filter";
import { trpc } from "@/mainview/trpc";

/** Filter chips for the shared list filter text; the title-bar search keeps the free text part. */
export function ListClauseFilter() {
	const listFilter = useListFilterText();
	const parsed = parseFilterQuery(listFilter);
	const tagNames = trpc.anime.tagNames.useQuery(undefined, { staleTime: Number.POSITIVE_INFINITY }).data ?? [];
	return (
		<ListFilterBar
			clauses={parsed.clauses}
			tagNames={tagNames}
			onClausesChange={(clauses) => {
				setListFilterText(serializeFilterQuery({ freeText: parsed.freeText, clauses }));
			}}
		/>
	);
}
