import { useState } from "react";
import type { ColumnSizingState, OnChangeFn } from "@tanstack/react-table";
import { z } from "zod";

const STORAGE_PREFIX = "biyori.table-columns.";
const sizingSchema = z.record(z.string(), z.number().finite().min(1).max(4000));

export function parseColumnSizing(raw: unknown): ColumnSizingState {
	const parsed = sizingSchema.safeParse(raw);
	return parsed.success ? parsed.data : {};
}

export function readColumnSizing(tableId: string): ColumnSizingState {
	try {
		const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
		if (raw == null) {
			return {};
		}
		return parseColumnSizing(JSON.parse(raw));
	} catch {
		return {};
	}
}

export function writeColumnSizing(tableId: string, sizing: ColumnSizingState): void {
	window.localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(sizing));
}

export function usePersistedColumnSizing(tableId: string): {
	columnSizing: ColumnSizingState;
	onColumnSizingChange: OnChangeFn<ColumnSizingState>;
} {
	const [columnSizing, setColumnSizing] = useState(() => readColumnSizing(tableId));
	return {
		columnSizing,
		onColumnSizingChange: (updater) => {
			setColumnSizing((prev) => {
				const next = typeof updater === "function" ? updater(prev) : updater;
				writeColumnSizing(tableId, next);
				return next;
			});
		},
	};
}
