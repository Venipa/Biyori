declare module "*.yml" {
	const value: {
		[key: string]: string | { [key: string]: string };
	};
	export default value;
}
