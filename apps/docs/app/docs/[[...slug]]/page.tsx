import { DocsBody, DocsDescription, DocsPage, DocsTitle, MarkdownCopyButton, ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { getMDXComponents } from "@/components/mdx";
import { getBlobUrl } from "@/lib/github";
import { absoluteFileUrl, absolutePageUrl, docPageJsonLd, docSeoTitle } from "@/lib/seo";
import { getPageImageUrl, getPageMarkdownUrl, source } from "@/lib/source";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) notFound();

	const MDX = page.data.body;
	const markdownUrl = getPageMarkdownUrl(page).url;

	return (
		<DocsPage toc={page.data.toc} full={page.data.full}>
			<JsonLd data={docPageJsonLd(page)} />
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className='mb-0'>{page.data.description}</DocsDescription>
			<div className='flex flex-row items-center gap-2 border-b pb-6'>
				<MarkdownCopyButton markdownUrl={markdownUrl} />
				<ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={getBlobUrl(`apps/docs/content/docs/${page.path}`)} />
			</div>
			<DocsBody>
				<MDX
					components={getMDXComponents({
						a: createRelativeLink(source, page),
					})}
				/>
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return source.generateParams();
}

export async function generateMetadata(props: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) notFound();

	const title = docSeoTitle(page.slugs, page.data.title);
	const canonical = absolutePageUrl(page.url);
	const ogImage = absoluteFileUrl(getPageImageUrl(page).url);

	return {
		title: { absolute: title },
		description: page.data.description,
		alternates: { canonical },
		openGraph: {
			type: "article",
			url: canonical,
			title,
			description: page.data.description,
			images: [
				{
					url: ogImage,
					width: 1200,
					height: 630,
					alt: page.data.title,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description: page.data.description,
			images: [ogImage],
		},
	};
}
