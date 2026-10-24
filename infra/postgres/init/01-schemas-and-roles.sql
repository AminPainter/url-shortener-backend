-- Runs once, on an empty data volume. Each service connects as its own role and
-- can only see its own schema. Passwords are local-dev only.

CREATE SCHEMA auth;
CREATE SCHEMA shorturls;

REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE ROLE auth_svc LOGIN PASSWORD 'auth_svc';
CREATE ROLE shorturls_writer LOGIN PASSWORD 'shorturls_writer';
CREATE ROLE shorturls_reader LOGIN PASSWORD 'shorturls_reader';

ALTER ROLE auth_svc SET search_path = auth;
ALTER ROLE shorturls_writer SET search_path = shorturls;
ALTER ROLE shorturls_reader SET search_path = shorturls;

GRANT USAGE ON SCHEMA auth TO auth_svc;
GRANT USAGE ON SCHEMA shorturls TO shorturls_writer, shorturls_reader;

-- Tables are created later by migrations running as postgres; these grants apply
-- to them automatically.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auth_svc;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA auth
  GRANT USAGE, SELECT ON SEQUENCES TO auth_svc;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA shorturls
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO shorturls_writer;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA shorturls
  GRANT USAGE, SELECT ON SEQUENCES TO shorturls_writer;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA shorturls
  GRANT SELECT ON TABLES TO shorturls_reader;
