/**
 * @description 内置的 user ID
 * @type {string}
 */
const INSIDE_USER_ID = 'MONTAGE_TRANSLATE_BOT_FOR_BOB_BY_RYAN';

/**
 * @description For generate header
 * @params {apiKey} string
 */
function generateHeader(apiKey) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    }
}

/**
 * @description 生成请求 body
 * @params {botId} string
 * @params {userText} string
 */
function generateBody(botId,userText) {
    return {
        bot_id: botId,
        stream: true,
        query: userText,
        user: INSIDE_USER_ID,
    }
}

function handleGeneralError(query, error) {
    if ('response' in error) {
        // 处理 HTTP 响应错误
        const { statusCode, msg } = error.response;
        const reason = msg !== 'success' ? "param" : "api";
        query.onCompletion({
            error: {
                type: reason,
                message: `接口响应错误 - ${msg}`,
                addition: `${JSON.stringify(error)}`,
            },
        });
    } else {
        // 处理一般错误
        query.onCompletion({
            error: {
                ...error,
                type: error.type || "unknown",
                message: error.message || "Unknown error",
            },
        });
    }
}


/**
 * @description 解析流信息
 * @param streamRes
 * @param query
 * @param finalRes
 * @returns {*}
 */
function parseStream(streamRes, query, finalRes) {
    const match = streamRes.replace(/^data:/, '');
    if (JSON.parse(match).event !== 'done') {
        try {
            const dataObj = JSON.parse(match);
            // 仅对于模型的回答做翻译
            if (dataObj?.message?.type === 'answer') {
                const sliceData = dataObj?.message?.content;
                if (sliceData) {
                    finalRes += sliceData;
                    query.onStream({
                        result: {
                            from: query.detectFrom,
                            to: query.detectTo,
                            toParagraphs: [finalRes],
                        },
                    });
                }
            }
        } catch (err) {
            handleGeneralError(query, {
                type: err.type || "param",
                message: err.message || "Failed to parse JSON",
                addition: err.addition,
            });
        }
    }
    return finalRes;
}

/**
 * @description 处理 http 流式响应上下文
 */
function httpStreamHandler(query) {
    let finalRes = "";
    let buffer = "";

    return {
        streamHandler: (streamData) => {
            const matchData = streamData.text;
             if (matchData !== undefined) {
                // 将新的数据添加到缓冲变量中
                buffer += matchData;
                 while (true) {
                     // 全局匹配全量的消息体
                     const match = buffer.match(/data:\{.*?\}\n/g);
                     if (match) {
                         const textFromResponse = match[1].trim();
                         finalRes = parseStream(textFromResponse, query, finalRes);
                         buffer = buffer.slice(match[0].length);
                     } else {
                         break;
                     }
                 }
            }
        },
        handler: (result) => {
            if (result.response.statusCode >= 400) {
                handleGeneralError(query, result);
            } else {
                query.onCompletion({
                    result: {
                        from: query.detectFrom,
                        to: query.detectTo,
                        toParagraphs: [finalRes],
                    },
                });
            }
        }

    }
}

/**
 * @description 格式化验证的错误
 * @param completion
 * @param error
 */
function formatValidateError(completion, error) {
    completion({
        result: false,
        error: {
            ...error,
            type: error.type || '未知错误',
            message: error.message || "未知错误",
        }
    });
}


/**
 * @description
 * @param completion
 */
function pluginValidate(completion) {
    const { apiToken, botId } = $option;
    if (!apiToken) {
        formatValidateError(completion, {
            type: "apiToken",
            message: "配置错误 - 请确保您在插件配置中填入了正确的 API TOKEN",
            addition: "请在插件配置中填写正确的 API TOKEN",
            troubleshootingLink: "https://bobtranslate.com/service/translate/openai.html"
        });
        return;
    }

    if(!botId) {
        formatValidateError(completion, {
            type: "botId",
            message: "配置错误 - 请确保您在插件配置中填入了正确的 Coze Bot ID",
            addition: "请在插件配置中填写正确的 Coze Bot ID",
            troubleshootingLink: "https://bobtranslate.com/service/translate/openai.html"
        });
        return
    }
    completion({
        result: true,
    })
}

exports.generateHeader = generateHeader;
exports.pluginValidate = pluginValidate;
exports.httpStreamHandler = httpStreamHandler;
exports.generateBody = generateBody;
