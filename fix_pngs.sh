#!/bin/bash
find site2android-pro/MyQuroRider/src/assets -name "*.png" | while read -r file; do
  if file "$file" | grep -q "JPEG image data"; then
    echo "Converting $file to true PNG..."
    sips -s format png "$file" --out "$file"
  fi
done
