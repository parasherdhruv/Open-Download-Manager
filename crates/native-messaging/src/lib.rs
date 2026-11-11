//! Future responsibility: the browser native-host executable boundary and a validated bridge to
//! IPC.
//!
//! This crate must not own engine state or unrestricted network or filesystem access.
//!
//! No behavior or public API is implemented in Wave 1.

#![forbid(unsafe_code)]
#![deny(missing_docs)]
