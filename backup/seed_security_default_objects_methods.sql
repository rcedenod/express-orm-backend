-- seed_security_default_objects_methods.sql
-- Inserta SOLO objetos/metodos faltantes para BO predeterminados.
-- Es idempotente: puedes ejecutarlo varias veces sin duplicar filas.

BEGIN;

-- 1) Objetos de negocio predeterminados
WITH default_objects(object_name) AS (
  VALUES
    ('UserBO'),
    ('PersonBO'),
    ('ProfileBO'),
    ('MethodBO'),
    ('ObjectBO')
)
INSERT INTO security.object (object)
SELECT d.object_name
FROM default_objects d
WHERE NOT EXISTS (
  SELECT 1
  FROM security.object o
  WHERE o.object = d.object_name
);

-- 2) Metodos predeterminados por objeto
WITH default_methods(object_name, method_name) AS (
  VALUES
    -- UserBO
    ('UserBO', 'getUsers'),
    ('UserBO', 'createUser'),
    ('UserBO', 'updateUser'),
    ('UserBO', 'deleteUsers'),

    -- PersonBO
    ('PersonBO', 'getPeople'),

    -- ProfileBO
    ('ProfileBO', 'getProfiles'),
    ('ProfileBO', 'createProfile'),
    ('ProfileBO', 'updateProfile'),
    ('ProfileBO', 'deleteProfiles'),

    -- MethodBO
    ('MethodBO', 'getMethods'),
    ('MethodBO', 'createMethod'),
    ('MethodBO', 'updateMethod'),
    ('MethodBO', 'deleteMethods'),
    ('MethodBO', 'getPermissionMethods'),
    ('MethodBO', 'createPermissionMethod'),
    ('MethodBO', 'updatePermissionMethod'),
    ('MethodBO', 'deletePermissionMethods'),
    ('MethodBO', 'syncPermissions'),

    -- ObjectBO
    ('ObjectBO', 'getObjects'),
    ('ObjectBO', 'createObject'),
    ('ObjectBO', 'updateObject'),
    ('ObjectBO', 'deleteObjects')
)
INSERT INTO security.method (method, fk_id_object)
SELECT dm.method_name, o.id_object
FROM default_methods dm
INNER JOIN security.object o
  ON o.object = dm.object_name
WHERE NOT EXISTS (
  SELECT 1
  FROM security.method m
  WHERE m.method = dm.method_name
    AND m.fk_id_object = o.id_object
);

COMMIT;


-- ============================================
-- OPCIONAL A) Dar todos los metodos al perfil Admin
-- ============================================
-- WITH admin_profile AS (
--   SELECT id_profile
--   FROM security.profile
--   WHERE lower(profile) = 'admin'
--   ORDER BY id_profile
--   LIMIT 1
-- )
-- INSERT INTO security.permission_method (fk_id_profile, fk_id_method)
-- SELECT ap.id_profile, m.id_method
-- FROM admin_profile ap
-- CROSS JOIN security.method m
-- WHERE NOT EXISTS (
--   SELECT 1
--   FROM security.permission_method pm
--   WHERE pm.fk_id_profile = ap.id_profile
--     AND pm.fk_id_method = m.id_method
-- );


-- ============================================
-- OPCIONAL B) Limpiar permisos de seguridad en no-admin
-- (UserBO, PersonBO, ProfileBO, MethodBO, ObjectBO)
-- ============================================
-- WITH admin_profile AS (
--   SELECT id_profile
--   FROM security.profile
--   WHERE lower(profile) = 'admin'
--   ORDER BY id_profile
--   LIMIT 1
-- )
-- DELETE FROM security.permission_method pm
-- USING security.method m
-- INNER JOIN security.object o
--   ON o.id_object = m.fk_id_object
-- WHERE pm.fk_id_method = m.id_method
--   AND o.object IN ('UserBO', 'PersonBO', 'ProfileBO', 'MethodBO', 'ObjectBO')
--   AND pm.fk_id_profile <> (SELECT id_profile FROM admin_profile);
