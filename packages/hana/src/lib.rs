mod anitomy;
pub mod detect;
pub mod identify;
#[cfg(not(test))]
pub mod native;
pub mod parse;
pub mod scan;
pub mod types;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg(test)]
mod tests {
	#[test]
	fn version_is_set() {
		assert!(!crate::VERSION.is_empty());
	}
}
