SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('products','cart_items')
  AND column_name IN ('sizes','selected_size')
ORDER BY table_name, column_name;


