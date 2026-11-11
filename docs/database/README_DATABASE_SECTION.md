## Database documentation

See [`docs/database/DATABASE_DOCUMENTATION.md`](docs/database/DATABASE_DOCUMENTATION.md) for the full data dictionary, constraints, relationships, indexes, trigger, stored procedure, transaction example, MongoDB audit collection, execution order, and verification checklist.

Diagrams:
- [`ER_DIAGRAM.md`](docs/database/ER_DIAGRAM.md)
- [`RELATIONAL_SCHEMA.md`](docs/database/RELATIONAL_SCHEMA.md)

**SQL setup order:** `schema.sql` -> `correction_update.sql` -> `advanced.sql` -> `seed.sql`. The correction migration must run before `advanced.sql` because the procedure references `correction_requests.requested_status`.

