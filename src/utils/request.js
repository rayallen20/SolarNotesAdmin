import axios from "axios";
import useUserStore from "@/stores/user";
import pinia from "@/stores";
import {API_CODE} from "@/constants/apiCode";
import router from "@/router";
import {ElMessage} from "element-plus";
import {getApiErrorMessage, isAuthError} from "@/utils/apiError";
import {isNavigationFailure} from "vue-router";
import {isObject} from "@/utils/typeGuard";

/**
 * Axios实例的配置对象
 * @type {import('axios').CreateAxiosDefaults}
 * */
const config = {
    /** 后端API的基础地址 */
    baseURL: import.meta.env.VITE_API_BASE_URL,
    /** 请求超时时间 单位:ms */
    timeout: 5000,
}

/**
 * 全工程共用的Axios实例
 * @type {import('axios').AxiosInstance}
 * */
const request = axios.create(config)

/**
 * 本标量用于表示是否正在处理当前会话失效,失效则合并并发提示和跳转
 * @type {boolean}
 * */
let isHandlingAuthFailure = false

/**
 * 本函数用于在请求头中添加token(请求登录API时不添加)
 * @param {import('axios').InternalAxiosRequestConfig} requestConfig 请求配置
 * @returns {import('axios').InternalAxiosRequestConfig} 处理后的配置
 * */
function attachToken(requestConfig) {
    /** 当前 Pinia 的用户 Store */
    const userStore = /** @type {import('@/stores/user').UserStore} */ (useUserStore(pinia))
    if (requestConfig.url === '/v1/admin/login' || userStore.token === '') {
        requestConfig.headers.delete('Authorization')
        return requestConfig
    }

    requestConfig.headers.set('Authorization', 'Bearer ' + userStore.token)
    return requestConfig
}

/**
 * 本函数用于清理失效会话并返回登录页
 * @param {unknown} error 后端鉴权错误
 * @param {import('axios').InternalAxiosRequestConfig} requestConfig 原请求配置
 * @returns {Promise<void>} 会话失效处理结束
 * */
async function handleAuthFailure(error, requestConfig) {
    if (requestConfig.url === '/v1/admin/login') {
        return
    }

    /** 当前 Pinia 的用户 Store */
    const userStore = /** @type {import('@/stores/user').UserStore} */ (useUserStore(pinia))

    /** @type {string} 当前会话应携带的 Authorization 值 */
    let currentAuthorization = ''

    if (userStore.token !== '') {
        currentAuthorization = 'Bearer ' + userStore.token
    }

    /** 原请求实际发出的 Authorization 值 */
    const sentHeader = requestConfig.headers.get('Authorization')

    /** @type {string} 规范化的原请求头 */
    let sentAuthorization = ''

    if (typeof sentHeader === 'string') {
        sentAuthorization = sentHeader
    }

    if (sentAuthorization !== currentAuthorization || isHandlingAuthFailure === true) {
        return
    }
    isHandlingAuthFailure = true
    try {
        userStore.clearSession()

        if (router.currentRoute.value.name !== 'login') {
            ElMessage.warning(getApiErrorMessage(error, '请重新登录'))

            // 路由跳转结果
            const failure = await router.replace({name: 'login'})
            if (isNavigationFailure(failure) === true) {
                ElMessage.error('未能打开登录页,请手动进入 /login 重新登录')
            }
        }
    } catch {
        ElMessage.error('登录状态清理或跳转失败,请手动进入 /login 重新登录')
    } finally {
        isHandlingAuthFailure = false
    }
}

/**
 * 本函数用于按业务码处理响应,仅在后端响应成功时解包 data
 * @param {import('axios').AxiosResponse} response HTTP 响应
 * @returns {Promise<any>} 解包后的业务数据；失败时保持 Promise 拒绝
 * */
async function unwrapResponse(response) {
    /** @type {unknown} 待检查的响应包 */
    const payload = response.data

    if (isObject(payload) === false || typeof payload.code !== 'number') {
        throw new Error('接口响应格式异常,请稍后重试')
    }

    if (payload.code === API_CODE.SUCCESS) {
        return payload.data
    }

    if (isAuthError(payload) === true) {
        await handleAuthFailure(payload, response.config)
    }

    return Promise.reject(payload)
}

request.interceptors.request.use(attachToken)
request.interceptors.response.use(unwrapResponse)

export default request