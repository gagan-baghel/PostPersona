-- Secure the add_coins function to prevent public misuse
REVOKE EXECUTE ON FUNCTION add_coins FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION add_coins FROM anon;
REVOKE EXECUTE ON FUNCTION add_coins FROM authenticated;

-- Only allow service_role to execute it
GRANT EXECUTE ON FUNCTION add_coins TO service_role;
