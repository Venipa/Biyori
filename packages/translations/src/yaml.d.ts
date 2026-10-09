declare module "*.yaml" {
	const value: {
		[key: string]: string | { [key: string]: string };
	};
	export default value;
}
