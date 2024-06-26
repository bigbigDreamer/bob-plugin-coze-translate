/**
 * 由于各大服务商的语言代码都不大一样，
 * 所以我定义了一份 Bob 专用的语言代码，以便 Bob 主程序和插件之间互传语种。
 * Bob 语言代码列表 https://ripperhe.gitee.io/bob/#/plugin/addtion/language
 *
 * 转换的代码建议以下面的方式实现，
 * `xxx` 代表服务商特有的语言代码，请替换为真实的，
 * 具体支持的语种数量请根据实际情况而定。
 *
 * Bob 语言代码转服务商语言代码(以为 'zh-Hans' 为例): var lang = langMap.get('zh-Hans');
 * 服务商语言代码转 Bob 语言代码: var standardLang = langMapReverse.get('xxx');
 */
var { pluginValidate, generateHeader, httpStreamHandler, generateBody} = require('./helper')

var items = [
    ["auto", "auto"],
    ["zh-Hans", "zh-CN"],
    ["zh-Hant", "zh-TW"],
    ["en", "en"],
    ["en", "en"],
    ["ja", "ja"],
];

var langMap = new Map(items);
var langMapReverse = new Map(items.map(([standardLang, lang]) => [lang, standardLang]));

function supportLanguages() {
    return items.map(([standardLang, lang]) => standardLang);
}

function translate(query, completion) {
    (async () => {
        await $http.streamRequest({
            method: "POST",
            url: "https://api.coze.cn/open_api/v2/chat",
            header: generateHeader($option.apiToken),
            body: {
                ...generateBody($option.botId, `翻译成简体白话文：\n\n${query.text}}`)
            },
            cancelSignal: query.cancelSignal,
            ...httpStreamHandler(query)
        });
    })()

}

function pluginTimeoutInterval() {
    return 60;
}

exports.pluginTimeoutInterval = pluginTimeoutInterval;
exports.pluginValidate = pluginValidate;
exports.supportLanguages = supportLanguages;
exports.translate = translate;
