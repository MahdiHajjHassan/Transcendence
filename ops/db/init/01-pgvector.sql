DO $$
BEGIN
	CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
	WHEN undefined_file THEN
		RAISE NOTICE 'pgvector extension package not available; continuing without vector extension';
END
$$;
