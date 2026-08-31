fn main() {
	let napi_cli = std::env::var_os("TYPE_DEF_TMP_PATH").is_some()
		|| std::env::var_os("NAPI_TYPE_DEF_TMP_FOLDER").is_some()
		|| std::env::var_os("CARGO_CFG_NAPI_RS_CLI_VERSION").is_some();
	if napi_cli {
		napi_build::setup();
	}
}
