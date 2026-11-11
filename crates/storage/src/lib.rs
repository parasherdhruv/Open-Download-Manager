//! Future responsibility: SQLite persistence, transactions, migrations, and recovery records.
//!
//! This crate must not own network transfer, UI, or scheduling policy.
//!
//! No behavior or public API is implemented in Wave 1.

#![forbid(unsafe_code)]
#![deny(missing_docs)]
