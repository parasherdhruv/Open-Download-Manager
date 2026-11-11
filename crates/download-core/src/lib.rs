//! Future responsibility: transfer lifecycle, state validation, segment coordination, and
//! integrity decisions.
//!
//! This crate must not own UI, browser protocol, or global queue fairness.
//!
//! No behavior or public API is implemented in Wave 1.

#![forbid(unsafe_code)]
#![deny(missing_docs)]
