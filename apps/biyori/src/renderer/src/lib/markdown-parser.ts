import { type EvaluateOptions, evaluate } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";

const evaluateOptions = {
	...runtime,
	format: "md",
	remarkPlugins: [remarkGfm],
} as EvaluateOptions;

export async function parseReleaseMarkdown(source: string): Promise<MDXContent> {
	const mod = await evaluate(source, evaluateOptions);
	return mod.default;
}

export type { MDXContent };
