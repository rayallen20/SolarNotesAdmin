import axios from "axios";
import {API_CODE} from "@/constants/apiCode";
import {isObject} from "@/utils/typeGuard";

/**
 * 本函数用于提取可按业务错误处理的 code
 * 超时/未收到响应/ HTTP 5xx 时返回 undefined
 * @param {unknown} error 业务错误或 Axios 异常
 * @returns {number | undefined} 可用的业务状态码(不存在或应优先处理传输错误时返回 undefined)
 * */
function getApiErrorCode(error) {
    if (axios.isAxiosError(error) === true) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return undefined
        }

        if (error.response === undefined || error.response.status >= 500) {
            return undefined
        }

        error = error.response.data
    }

    if (isObject(error) === true && typeof error.code === 'number') {
        return error.code
    }

    return undefined
}

/**
 * 本函数用于判断后端是否明确拒绝了当前请求的登录令牌
 * @param {unknown} error 接口异常
 * @returns {boolean} 业务码表示token过期/无效时返回 true
 * */
function isAuthError(error) {
    /** @type {number | undefined} 后端业务码 */
    const code = getApiErrorCode(error)

    return code === API_CODE.TOKEN_EXPIRED || code === API_CODE.TOKEN_INVALID
}

/**
 * 本函数用于生成公共错误说明(不包含页面业务文案)
 * Tips: 本函数只返回文字,不弹窗/不清理会话/不跳转路由
 * @param {unknown} error 业务错误或 Axios 异常
 * @param {string} fallback 没有可用错误信息时显示的备用文字
 * @returns {string} 可供调用方展示的错误说明
 * */
function getApiErrorMessage(error, fallback) {
    if (axios.isAxiosError(error) === true) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return '请求超时,请稍后刷新重试'
        }

        if (error.response === undefined) {
            return '暂时无法连接服务,请检查网络或后端是否启动'
        }

        if (error.response.status >= 500) {
            return '服务暂时不可用,请稍后重试'
        }

        error = error.response.data
    }

    switch (getApiErrorCode(error)) {
        case API_CODE.VALIDATION_ERROR:
            return '请求参数不符合要求,请检查后重试'
        case API_CODE.TOKEN_EXPIRED:
            return '登录已过期,请重新登录'
        case API_CODE.TOKEN_INVALID:
            return '登录状态无效,请重新登录'
        case API_CODE.DATABASE_ERROR:
        case API_CODE.INTERNAL_ERROR:
            return '服务暂时不可用,请稍后重试'
    }

    if (isObject(error) === true && typeof error.message === 'string') {
        if (error.message.trim() !== '') {
            return error.message
        }
    }

    return fallback
}

export {
    getApiErrorCode,
    getApiErrorMessage,
    isAuthError,
}