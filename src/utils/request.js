import axios from "axios";
import useUserStore from "@/stores/user";
import pinia from "@/stores";

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
 * Axios实例
 * @type {import('axios').AxiosInstance}
 * */
const request = axios.create(config)

request.interceptors.request.use(
    /**
     * 本函数用于读取用户的token,并添加至请求头中
     * @param {import('axios').InternalAxiosRequestConfig} config Axios请求配置对象
     * @returns {import('axios').InternalAxiosRequestConfig} 已附加token的Axios请求配置对象
     * */
    (config) => {
        /**
         * 用户Store实例
         * */
        const userStore = /** @type {import('@/stores/user').UserStore} */ (
            useUserStore(pinia)
        )

        if (userStore.token !== '') {
            config.headers.Authorization = `Bearer ${userStore.token}`
        }

        return config
    }
)

request.interceptors.response.use(
    /**
     * 本函数用于根据业务响应码解包接口结果,失败时返回被拒绝的Promise对象
     * @param {import('axios').AxiosResponse} response Axios响应对象
     * @returns {*} 成功时返回解包后的数据,失败时返回被拒绝的Promise对象
     * */
    (response) => {
        const payload = response.data

        if (payload.code === 200) {
            return payload.data
        }

        return Promise.reject(payload)
    }
)

export default request