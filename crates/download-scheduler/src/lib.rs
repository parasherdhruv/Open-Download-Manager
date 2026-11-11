//! Future responsibility: queue ordering, global and per-host limits, retry timing, fairness, and
//! shutdown coordination.
//!
//! This crate must not own HTTP parsing, direct file writes, or UI.
//!
//! No behavior or public API is implemented in Wave 1.

#![forbid(unsafe_code)]
#![deny(missing_docs)]
