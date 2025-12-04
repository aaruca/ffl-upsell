#!/bin/bash

# FFL Upsell - Build Script
# Crea un archivo ZIP listo para distribución

set -e

PLUGIN_NAME="ffl-upsell"
VERSION=$(grep "Version:" ffl-upsell.php | head -1 | awk '{print $3}')
BUILD_DIR="build"
DIST_DIR="dist"

echo "🚀 Building FFL Upsell v${VERSION}"

# Crear directorios
mkdir -p "${BUILD_DIR}/${PLUGIN_NAME}"
mkdir -p "${DIST_DIR}"

# Copiar archivos necesarios
echo "📦 Copying files..."
rsync -av \
  --exclude=".git*" \
  --exclude=".DS_Store" \
  --exclude="node_modules" \
  --exclude="build" \
  --exclude="dist" \
  --exclude="*.log" \
  --exclude=".vscode" \
  --exclude=".idea" \
  --exclude=".claude" \
  --exclude="build.sh" \
  --exclude="composer.lock" \
  --exclude="composer.phar" \
  ./ "${BUILD_DIR}/${PLUGIN_NAME}/"

# Verificar que vendor/ existe
if [ ! -d "${BUILD_DIR}/${PLUGIN_NAME}/vendor" ]; then
  echo "❌ Error: vendor/ directory not found!"
  echo "   Run 'composer install' or ensure vendor/ is committed to repo"
  exit 1
fi

# Crear ZIP
echo "🗜️  Creating ZIP archive..."
cd "${BUILD_DIR}"
zip -r "../${DIST_DIR}/${PLUGIN_NAME}-${VERSION}.zip" "${PLUGIN_NAME}" -q

# Limpiar
cd ..
rm -rf "${BUILD_DIR}"

# Resultado
FILE_SIZE=$(du -h "${DIST_DIR}/${PLUGIN_NAME}-${VERSION}.zip" | cut -f1)
echo ""
echo "✅ Build complete!"
echo "   File: ${DIST_DIR}/${PLUGIN_NAME}-${VERSION}.zip"
echo "   Size: ${FILE_SIZE}"
echo ""
echo "🎯 Ready to upload to WordPress!"
