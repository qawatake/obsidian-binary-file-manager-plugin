#!/bin/sh

# This script builds the plugin and copies the output files into the associated plugin directory
# After this build script is run, this plugin in Obisidian should disabled/enabled to refresh it

# variables
SOURCE_DIR="/Users/willjasen/GitHub/obsidian-binary-file-manager-plugin";
PLUGIN_DIR="/Users/willjasen/Library/Mobile Documents/iCloud~md~obsidian/Documents/willjasen/.obsidian/plugins/obsidian-binary-file-manager-plugin";
FILES=( "main.js" "manifest.json" "styles.css" );


# Create the directory if needed (handle spaces and parents)
if [ -d "$PLUGIN_DIR" ]; then 
  echo "Plugin directory already exists.";
else
  echo "Creating plugin directory at $PLUGIN_DIR"; mkdir -p "$PLUGIN_DIR";
fi

# Go to the source directory and build this plugin

cd "$SOURCE_DIR";
npm i --silent; npm run build > /dev/null 2>&1;

# Copy built files into the plugin directory
for file in "${FILES[@]}"
do
  echo "Copying file: $file --> $PLUGIN_DIR/$file";
  cp "$SOURCE_DIR/$file" "$PLUGIN_DIR/$file";
done
echo "All files copied!";