/**
 * Bob 插件 - Coze 翻译 Helper
 */

/**
 * 内置的 user ID
 */
var INSIDE_USER_ID = 'BOB_COZE_TRANSLATE_PLUGIN';

/**
 * 生成请求头
 * @param {string} apiKey - API Token
 * @returns {Object} 请求头对象
 */
function generateHeader(apiKey) {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
    };
}

/**
 * 生成请求体 (Coze v3 API)
 * @param {string} botId - Bot ID
 * @param {string} userText - 用户输入文本
 * @param {boolean} stream - 是否流式输出
 * @returns {Object} 请求体对象
 */
function generateBody(botId, userText, stream) {
    return {
        bot_id: botId,
        stream: stream !== false,
        user_id: INSIDE_USER_ID,
        auto_save_history: false,
        additional_messages: [
            {
                role: 'user',
                content: userText,
                content_type: 'text'
            }
        ]
    };
}

/**
 * 构建翻译提示词
 * @param {Object} query - Bob 查询对象
 * @param {Object} langNames - 语言名称映射
 * @param {string} customPrompt - 自定义提示词模板
 * @returns {string} 最终提示词
 */
function buildPrompt(query, langNames, customPrompt) {
    var text = query.text;
    var fromLang = langNames[query.detectFrom] || query.detectFrom;
    var toLang = langNames[query.detectTo] || query.detectTo;

    if (customPrompt && customPrompt.trim()) {
        return customPrompt
            .replace(/\$\{text\}/g, text)
            .replace(/\$\{from\}/g, fromLang)
            .replace(/\$\{to\}/g, toLang);
    }

    // 默认提示词
    if (query.detectFrom === 'auto') {
        return '请将以下文本翻译成' + toLang + '，只输出翻译结果，不要解释：\n\n' + text;
    }
    return '请将以下' + fromLang + '文本翻译成' + toLang + '，只输出翻译结果，不要解释：\n\n' + text;
}

/**
 * 处理通用错误
 * @param {Object} query - Bob 查询对象
 * @param {Object} error - 错误对象
 */
function handleGeneralError(query, error) {
    var errorType = 'unknown';
    var errorMessage = '未知错误';
    var addition = '';

    if (error && error.response) {
        var statusCode = error.response.statusCode;
        if (statusCode === 401) {
            errorType = 'secretKey';
            errorMessage = 'API Token 无效或已过期';
        } else if (statusCode === 403) {
            errorType = 'secretKey';
            errorMessage = '无权访问该 Bot';
        } else if (statusCode === 404) {
            errorType = 'notFound';
            errorMessage = 'Bot 不存在';
        } else if (statusCode === 429) {
            errorType = 'api';
            errorMessage = '请求过于频繁，请稍后再试';
        } else if (statusCode >= 500) {
            errorType = 'api';
            errorMessage = 'Coze 服务暂时不可用';
        } else {
            errorType = 'api';
            errorMessage = '接口响应错误 (HTTP ' + statusCode + ')';
        }
        addition = JSON.stringify(error.response);
    } else if (error) {
        errorType = error.type || 'unknown';
        errorMessage = error.message || '未知错误';
        addition = error.addition || '';
    }

    query.onCompletion({
        error: {
            type: errorType,
            message: errorMessage,
            addition: addition
        }
    });
}

/**
 * 解析流式 SSE 事件 (Coze v3 格式)
 * v3 使用 event: + data: 的标准 SSE 格式
 * conversation.message.delta 事件的 content 是增量内容
 * @param {string} eventType - SSE 事件类型
 * @param {string} dataStr - SSE data 字段内容
 * @param {Object} query - Bob 查询对象
 * @param {string} currentResult - 当前累积结果
 * @returns {string} 更新后的累积结果
 */
function parseStreamEvent(eventType, dataStr, query, currentResult) {
    if (!dataStr || dataStr === '[DONE]') {
        return currentResult;
    }

    try {
        var data = JSON.parse(dataStr);

        if (eventType === 'conversation.message.delta') {
            // v3 delta 事件的 content 是增量文本
            if (data.type === 'answer' && data.content) {
                currentResult += data.content;
                query.onStream({
                    result: {
                        from: query.detectFrom,
                        to: query.detectTo,
                        toParagraphs: [currentResult]
                    }
                });
            }
        } else if (eventType === 'conversation.chat.failed') {
            // 聊天失败事件
            handleGeneralError(query, {
                type: 'api',
                message: data.last_error && data.last_error.msg || '聊天失败',
                addition: dataStr
            });
        } else if (eventType === 'error') {
            // 错误事件
            handleGeneralError(query, {
                type: 'api',
                message: data.msg || '接口返回错误',
                addition: dataStr
            });
        }
    } catch (e) {
        // 解析失败，忽略
    }

    return currentResult;
}

/**
 * 处理 HTTP 流式响应
 * @param {Object} query - Bob 查询对象
 * @returns {Object} 包含 streamHandler 和 handler 的对象
 */
function httpStreamHandler(query) {
    var finalResult = '';
    var buffer = '';
    var currentEvent = '';

    return {
        streamHandler: function(streamData) {
            if (!streamData || !streamData.text) {
                return;
            }

            buffer += streamData.text;

            // 按行分割处理 SSE 格式: event: xxx\ndata: xxx\n\n
            var lines = buffer.split('\n');
            // 保留最后一个可能不完整的行
            buffer = lines.pop() || '';

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line) {
                    // 空行表示一个 SSE 事件结束，重置 event
                    currentEvent = '';
                    continue;
                }
                if (line.startsWith('event:')) {
                    currentEvent = line.substring(6).trim();
                } else if (line.startsWith('data:')) {
                    var dataStr = line.substring(5).trim();
                    finalResult = parseStreamEvent(currentEvent, dataStr, query, finalResult);
                }
            }
        },
        handler: function(result) {
            // 处理缓冲区中剩余的数据
            if (buffer.trim()) {
                var remaining = buffer.trim();
                if (remaining.startsWith('data:')) {
                    var dataStr = remaining.substring(5).trim();
                    finalResult = parseStreamEvent(currentEvent, dataStr, query, finalResult);
                }
            }

            if (result.response && result.response.statusCode >= 400) {
                handleGeneralError(query, result);
                return;
            }

            if (!finalResult) {
                query.onCompletion({
                    error: {
                        type: 'api',
                        message: '未获取到翻译结果'
                    }
                });
                return;
            }

            query.onCompletion({
                result: {
                    from: query.detectFrom,
                    to: query.detectTo,
                    toParagraphs: [finalResult]
                }
            });
        }
    };
}

/**
 * 处理非流式 HTTP 响应
 * @param {Object} query - Bob 查询对象
 * @returns {Function} handler 函数
 */
function httpHandler(query) {
    return function(result) {
        if (result.error || (result.response && result.response.statusCode >= 400)) {
            handleGeneralError(query, result);
            return;
        }

        try {
            var data = result.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            // 查找 answer 类型的消息
            var answer = '';
            if (data.messages && Array.isArray(data.messages)) {
                for (var i = 0; i < data.messages.length; i++) {
                    if (data.messages[i].type === 'answer') {
                        answer += data.messages[i].content || '';
                    }
                }
            }

            if (!answer) {
                query.onCompletion({
                    error: {
                        type: 'api',
                        message: '未获取到翻译结果',
                        addition: JSON.stringify(data)
                    }
                });
                return;
            }

            query.onCompletion({
                result: {
                    from: query.detectFrom,
                    to: query.detectTo,
                    toParagraphs: [answer]
                }
            });
        } catch (e) {
            query.onCompletion({
                error: {
                    type: 'api',
                    message: '解析响应失败: ' + e.message
                }
            });
        }
    };
}

/**
 * 格式化验证错误
 * @param {Function} completion - 完成回调
 * @param {Object} error - 错误信息
 */
function formatValidateError(completion, error) {
    completion({
        result: false,
        error: {
            type: error.type || 'unknown',
            message: error.message || '未知错误',
            addition: error.addition || '',
            troubleshootingLink: error.troubleshootingLink || ''
        }
    });
}

/**
 * 插件配置验证
 * @param {Function} completion - 完成回调
 */
function pluginValidate(completion) {
    var apiToken = $option.apiToken;
    var botId = $option.botId;

    if (!apiToken || !apiToken.trim()) {
        formatValidateError(completion, {
            type: 'secretKey',
            message: '请填写 API Token',
            addition: '请在 Coze 平台获取 Personal Access Token',
            troubleshootingLink: 'https://www.coze.com/docs/developer_guides/pat'
        });
        return;
    }

    if (!botId || !botId.trim()) {
        formatValidateError(completion, {
            type: 'param',
            message: '请填写 Bot ID',
            addition: '请在 Coze 平台获取机器人 ID',
            troubleshootingLink: 'https://www.coze.com/docs/developer_guides/coze_api_overview'
        });
        return;
    }

    completion({ result: true });
}

exports.generateHeader = generateHeader;
exports.generateBody = generateBody;
exports.buildPrompt = buildPrompt;
exports.pluginValidate = pluginValidate;
exports.httpStreamHandler = httpStreamHandler;
exports.httpHandler = httpHandler;
