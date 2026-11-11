//! Future responsibility: safe destination resolution, temporary files, positioned writes, and
//! finalization.
//!
//! This crate must not own network requests, queues, or UI.
//!
//! No behavior or public API is implemented in Wave 1.

#![forbid(unsafe_code)]
#![deny(missing_docs)]
