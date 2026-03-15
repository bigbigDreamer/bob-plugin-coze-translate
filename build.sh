#!/bin/bash

set -e

PLUGIN_NAME="coze-translate"
OUTPUT_FILE="${PLUGIN_NAME}.bobplugin"
PLUGIN_FILES=("info.json" "main.js" "helper.js")

# 检查必要文件是否存在
for file in "${PLUGIN_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "错误: 缺少必要文件 $file"
        exit 1
    fi
done

# 删除旧的打包文件
rm -f "$OUTPUT_FILE"

# 打包为 zip（bobplugin 格式）
zip -9 "$OUTPUT_FILE" "${PLUGIN_FILES[@]}"

echo "打包完成: $OUTPUT_FILE"
