/**
 * Bob 插件 - Coze 翻译
 * 使用 Coze API 进行智能翻译
 *
 * Bob 语言代码列表: https://bobtranslate.com/plugin/addition/language.html
 */
var {
    pluginValidate,
    generateHeader,
    httpStreamHandler,
    httpHandler,
    generateBody,
    buildPrompt
} = require('./helper');

// Bob 语言代码 -> 显示名称映射
var langNames = {
    "auto": "自动检测",
    "zh-Hans": "简体中文",
    "zh-Hant": "繁体中文",
    "en": "英语",
    "ja": "日语",
    "ko": "韩语",
    "fr": "法语",
    "de": "德语",
    "es": "西班牙语",
    "pt": "葡萄牙语",
    "it": "意大利语",
    "ru": "俄语",
    "ar": "阿拉伯语",
    "th": "泰语",
    "vi": "越南语",
    "id": "印尼语",
    "ms": "马来语",
    "nl": "荷兰语",
    "pl": "波兰语",
    "tr": "土耳其语",
    "uk": "乌克兰语",
    "cs": "捷克语",
    "el": "希腊语",
    "he": "希伯来语",
    "hi": "印地语",
    "hu": "匈牙利语",
    "sv": "瑞典语",
    "da": "丹麦语",
    "fi": "芬兰语",
    "no": "挪威语",
    "ro": "罗马尼亚语",
    "sk": "斯洛伐克语",
    "bg": "保加利亚语"
};

function supportLanguages() {
    return Object.keys(langNames);
}

function translate(query, completion) {
    var apiEndpoint = $option.apiEndpoint || "https://api.coze.com";
    var useStream = $option.streamOutput !== "false";
    var prompt = buildPrompt(query, langNames, $option.customPrompt);

    var requestConfig = {
        method: "POST",
        url: apiEndpoint + "/open_api/v2/chat",
        header: generateHeader($option.apiToken),
        body: generateBody($option.botId, prompt, useStream),
        cancelSignal: query.cancelSignal
    };

    if (useStream) {
        $http.streamRequest({
            ...requestConfig,
            ...httpStreamHandler(query)
        });
    } else {
        $http.request({
            ...requestConfig,
            handler: httpHandler(query)
        });
    }
}

function pluginTimeoutInterval() {
    return 60;
}

exports.pluginTimeoutInterval = pluginTimeoutInterval;
exports.pluginValidate = pluginValidate;
exports.supportLanguages = supportLanguages;
exports.translate = translate;
