# Release Process

Este documento describe cómo crear releases para que WordPress detecte automáticamente las actualizaciones del plugin.

## Prerrequisitos

El plugin utiliza [Plugin Update Checker](https://github.com/YahnisElsts/plugin-update-checker) para detectar actualizaciones desde GitHub.

## Pasos para Crear un Release

### 1. Actualizar la Versión

Antes de crear el release, actualiza el número de versión en estos archivos:

- `ffl-upsell.php`: línea 6 y línea 23
  ```php
  * Version: 1.0.6
  define('FFL_UPSELL_VERSION', '1.0.6');
  ```

### 2. Commit y Push

```bash
git add .
git commit -m "Bump version to 1.0.6"
git push origin main
```

### 3. Crear el Release en GitHub

#### Opción A: Desde la interfaz web

1. Ve a: https://github.com/alearuca/ffl-upsell/releases
2. Click en "Create a new release"
3. En "Choose a tag", escribe el nuevo tag (ej: `v1.0.6`) y selecciona "Create new tag"
4. **Release title**: `Version 1.0.6` (o el número correspondiente)
5. **Describe this release**: Agrega las notas del release:
   ```markdown
   ## What's New

   - Feature: Description of new feature
   - Fix: Description of bug fix
   - Enhancement: Description of improvement

   ## Changelog

   - Added: New functionality
   - Fixed: Bug fixes
   - Changed: Modifications to existing features
   ```
6. Click en "Publish release"

#### Opción B: Desde la línea de comandos

```bash
# Crear el tag
git tag v1.0.6

# Push del tag
git push origin v1.0.6

# Crear release usando GitHub CLI (si tienes gh instalado)
gh release create v1.0.6 --title "Version 1.0.6" --notes "Release notes here"
```

### 4. Verificar la Actualización

Una vez publicado el release:

1. En un sitio WordPress con el plugin instalado
2. Ve a **Plugins** en el dashboard
3. WordPress debería mostrar que hay una actualización disponible
4. Click en "Update now" para actualizar

## Formato de Tags

- Usar siempre el formato `vX.Y.Z` (ej: `v1.0.6`, `v2.1.0`)
- El tag debe coincidir con la versión en `ffl-upsell.php`

## Versionado Semántico

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Cambios incompatibles en la API
- **MINOR** (1.0.0 → 1.1.0): Nueva funcionalidad compatible con versiones anteriores
- **PATCH** (1.0.0 → 1.0.1): Correcciones de bugs compatibles

## Notas Importantes

- El sistema verifica actualizaciones cada 12 horas automáticamente
- Los usuarios también pueden verificar manualmente desde la página de plugins
- Asegúrate de que el repositorio sea público para que funcione sin autenticación
- Si el repositorio es privado, necesitarás configurar un token en `UpdateChecker.php`

## Repositorio Privado (Opcional)

Si tu repositorio es privado, edita `includes/Admin/UpdateChecker.php`:

```php
// Agregar después de setBranch()
$this->update_checker->setAuthentication('your-github-personal-access-token');
```

Token necesario con permisos: `repo` (Full control of private repositories)
