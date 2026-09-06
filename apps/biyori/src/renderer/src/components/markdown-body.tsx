import { useQuery } from "@tanstack/react-query";
import { type ComponentProps, useEffect, useRef } from "react";
import { desktopRpc } from "@/desktop-rpc";
import { Skeleton } from "@/mainview/components/ui/skeleton";
import { type MDXContent, parseReleaseMarkdown } from "@/mainview/lib/markdown-parser";
import { cn } from "@/mainview/lib/utils";

const mdxComponents = {
	a: (props: ComponentProps<"a">) => <a {...props} className={cn("text-primary underline-offset-2 hover:underline", props.className)} target='_blank' rel='noreferrer' />,
	img: (props: ComponentProps<"img">) => (
		<img {...props} className={cn("inline-block size-5 rounded-full align-middle ring-1 ring-border", props.className)} alt={props.alt ?? ""} />
	),
	ul: (props: ComponentProps<"ul">) => <ul {...props} className={cn("my-1 flex flex-col gap-1.5 pl-4 list-disc", props.className)} />,
	ol: (props: ComponentProps<"ol">) => <ol {...props} className={cn("my-1 flex flex-col gap-1.5 pl-4 list-decimal", props.className)} />,
	li: (props: ComponentProps<"li">) => <li {...props} className={cn("text-sm/relaxed text-muted-foreground", props.className)} />,
	p: (props: ComponentProps<"p">) => <p {...props} className={cn("text-sm/relaxed text-muted-foreground", props.className)} />,
	h1: (props: ComponentProps<"h1">) => <h3 {...props} className={cn("text-sm font-medium text-foreground", props.className)} />,
	h2: (props: ComponentProps<"h2">) => <h3 {...props} className={cn("text-sm font-medium text-foreground", props.className)} />,
	h3: (props: ComponentProps<"h3">) => <h4 {...props} className={cn("text-sm font-medium text-foreground", props.className)} />,
	code: (props: ComponentProps<"code">) => <code {...props} className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]", props.className)} />,
	hr: (props: ComponentProps<"hr">) => <hr {...props} className={cn("border-border", props.className)} />,
};

export function MarkdownBody({ markdown, className }: { markdown: string; className?: string }) {
	const query = useQuery({
		queryKey: ["release-mdx", markdown],
		queryFn: () => parseReleaseMarkdown(markdown),
		staleTime: Number.POSITIVE_INFINITY,
	});

	if (query.isError) {
		return <pre className={cn("whitespace-pre-wrap text-sm/relaxed text-muted-foreground", className)}>{markdown}</pre>;
	}

	if (!query.data) {
		return (
			<div className={cn("flex flex-col gap-2", className)}>
				<Skeleton className='h-3 w-3/4' />
				<Skeleton className='h-3 w-full' />
			</div>
		);
	}

	return <MarkdownBodyReady className={className} Content={query.data} />;
}

function MarkdownBodyReady({ className, Content }: { className?: string; Content: MDXContent }) {
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = rootRef.current;
		if (!el) {
			return;
		}
		const onClick = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}
			const anchor = target.closest("a");
			const href = anchor?.getAttribute("href");
			if (!href) {
				return;
			}
			event.preventDefault();
			void desktopRpc.request.openExternal({ url: href });
		};
		el.addEventListener("click", onClick);
		return () => el.removeEventListener("click", onClick);
	}, []);

	return (
		<div ref={rootRef} className={cn("flex flex-col gap-1", className)}>
			<Content components={mdxComponents} />
		</div>
	);
}
