//! Future responsibility: HTTP/HTTPS inspection, redirects, range requests, and response
//! validation.
//!
//! This crate must not own scheduling, final paths, or database policy.
//!
//! No behavior or public API is implemented in Wave 1.

#![forbid(unsafe_code)]
#![deny(missing_docs)]
