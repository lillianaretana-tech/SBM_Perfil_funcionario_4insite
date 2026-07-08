# Perfil de Nuevo Funcionario SBM

Formulario publico para conocer mejor a cada funcionario nuevo de SBM. Usa HTML, CSS y JavaScript vanilla, Supabase JS v2 y GitHub Pages.

## Archivos

- `index.html`: formulario y panel administrativo.
- `styles.css`: diseno mobile-first con logo y colores SBM.
- `app.js`: conexion Supabase, guardado de perfiles, panel admin y CSV.
- `supabase_setup.sql`: tabla `sbm_new_employee_profiles`, trigger `updated_at`, RLS y policies.
- `assets/Logo_SBM.png`: logo SBM.

## Puesta en marcha

1. Ejecute `supabase_setup.sql` en Supabase SQL Editor.
2. Publique esta carpeta en GitHub Pages.
3. Comparta el enlace con funcionarios nuevos.

## Campos

- Nombre completo
- Numero de cedula
- Sobre mi
- Tiempo libre
- Entorno familiar
- Intereses en la vida
- Viajes o lugares especiales
- Algo mas que quisiera compartir

## Panel administrativo

PIN temporal:

```js
const ADMIN_PIN = "2580";
```

Permite ver perfiles recibidos, buscar por nombre/cedula y exportar CSV.

Nota: este PIN local no es seguridad fuerte. Para acceso privado real conviene implementar autenticacion Supabase.
