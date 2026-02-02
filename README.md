# Bob Plugin - Coze 翻译

使用 [Coze](https://www.coze.cn/) API 为 [Bob](https://bobtranslate.com/) 提供智能翻译服务。

## 功能特性

- 支持 30+ 种语言互译
- 支持流式输出，实时显示翻译结果
- 支持自定义翻译提示词
- 支持中国区和国际区 API
- 智能错误处理和友好提示

## 安装

### 方式一：直接下载

1. 从 [Releases](https://github.com/ryanwang/bob-plugin-coze-translate/releases) 下载最新的 `.bobplugin` 文件
2. 双击安装，或拖拽到 Bob 偏好设置 -> 服务页面

### 方式二：手动打包

```bash
# 克隆仓库
git clone https://github.com/ryanwang/bob-plugin-coze-translate.git

# 进入目录并打包
cd bob-plugin-coze-translate
zip -r coze-translate.bobplugin info.json main.js helper.js

# 双击 coze-translate.bobplugin 安装
```

## 配置

### 1. 获取 Coze API Token

1. 访问 [Coze 平台](https://www.coze.com/)
2. 登录后进入「Settings」->「API Tokens」
3. 创建新的 Personal Access Token

### 2. 创建翻译 Bot

> **为什么需要 Bot？** Coze 的 API 架构基于 Bot，API Token 仅用于身份认证，Bot 才是实际执行翻译的实体，包含了系统提示词、模型配置等。

1. 在 Coze 平台创建一个新的 Bot
2. 配置 Bot 的系统提示词，建议使用：
   ```
   You are a professional translator. Output only the translation result without any explanation.
   ```
3. 发布 Bot (Publish) 并获取 Bot ID（在 Bot 的 URL 或设置页面可以找到）

### 3. 配置插件

在 Bob 的服务设置中配置：

| 配置项 | 说明 |
|--------|------|
| API Token | Coze 平台的 Personal Access Token |
| Bot ID | 你创建的翻译 Bot 的 ID |
| API 区域 | 根据你的账号选择中国区或国际区 |
| 自定义提示词 | 可选，留空使用默认提示词 |
| 流式输出 | 建议开启，可实时显示翻译结果 |

## 自定义提示词

支持以下变量：

- `${text}` - 待翻译的文本
- `${from}` - 源语言名称
- `${to}` - 目标语言名称

示例：
```
请将以下${from}文本翻译成${to}，保持原文的语气和风格：

${text}
```

## 支持的语言

简体中文、繁体中文、英语、日语、韩语、法语、德语、西班牙语、葡萄牙语、意大利语、俄语、阿拉伯语、泰语、越南语、印尼语、马来语、荷兰语、波兰语、土耳其语、乌克兰语、捷克语、希腊语、希伯来语、印地语、匈牙利语、瑞典语、丹麦语、芬兰语、挪威语、罗马尼亚语、斯洛伐克语、保加利亚语

## 常见问题

### Q: 提示 "API Token 无效或已过期"

请检查：
1. Token 是否正确复制
2. Token 是否已过期，需要重新生成

### Q: 提示 "Bot 不存在"

请检查：
1. Bot ID 是否正确
2. Bot 是否已发布
3. API 区域是否正确（中国区 Bot 使用中国区 API）

### Q: 翻译结果不理想

尝试：
1. 优化 Bot 的系统提示词
2. 使用自定义提示词配置

## 致谢

- [bob-plugin-openai-translator](https://github.com/openai-translator/bob-plugin-openai-translator) - 参考实现
- [Bob 官方文档](https://bobtranslate.com/plugin/) - 插件开发指南

## License

MIT
