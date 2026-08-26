export type TitleParts = {
	title: string;
	season: number | null;
	year: number | null;
};

export type TitleCandidate = {
	id: number;
	names: string[];
	episodes: number;
	status?: string;
};

export type RelationRule = {
	fromId: number;
	fromStart: number;
	fromEnd: number | null;
	toId: number;
	toStart: number;
};
