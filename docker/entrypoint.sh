+12
-0

#!/bin/sh
set -e

TEMPLATE=/usr/share/nginx/html/assets/js/config.template.js
TARGET=/usr/share/nginx/html/assets/js/config.js

if [ -f "$TEMPLATE" ]; then
  echo "Generating config.js from environment";
  envsubst < "$TEMPLATE" > "$TARGET"
fi

exec nginx -g 'daemon off;'
