#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="hyperlocal-web-sdk-examples"
SITE_DIR="_site"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

# Discover example dirs (dirs with package.json, excluding root)
examples=()
for dir in */; do
    dir="${dir%/}"
    [[ -f "$dir/package.json" ]] && examples+=("$dir")
done

if [[ ${#examples[@]} -eq 0 ]]; then
    echo "No example directories found."
    exit 1
fi

echo "Found examples: ${examples[*]}"

# Build each example
for example in "${examples[@]}"; do
    echo ""
    echo "=== $example ==="

    echo "  npm ci"
    (cd "$example" && npm ci)

    echo "  npm audit"
    (cd "$example" && npm audit --audit-level=moderate) || echo "  ⚠ audit warnings (non-blocking)"

    echo "  npm run build (base=/$REPO_NAME/$example/)"
    (cd "$example" && npm run build -- --base="/$REPO_NAME/$example/")
done

# Assemble _site/
rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"

for example in "${examples[@]}"; do
    cp -r "$example/dist" "$SITE_DIR/$example"
done

# Generate root index.html
cat > "$SITE_DIR/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hyperlocal Web SDK Examples</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 0 1rem; }
        a { color: #0969da; }
        li { margin: 0.5rem 0; }
    </style>
</head>
<body>
    <h1>Hyperlocal Web SDK Examples</h1>
    <ul>
EOF

for example in "${examples[@]}"; do
    echo "        <li><a href=\"./$example/\">$example</a></li>" >> "$SITE_DIR/index.html"
done

cat >> "$SITE_DIR/index.html" <<EOF
    </ul>
</body>
</html>
EOF

echo ""
echo "Site assembled at $SITE_DIR/"
