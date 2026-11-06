import {defineStore} from "pinia";

/**
 * 用户状态
 * @typedef {Object} UserState
 * @property {string} token 当前登录token(未登录时为空字符串)
 * @property {string} username 当前用户名(未登录时为空字符串)
 * */

/**
 * 用户Store公开的会话操作，供IDE直接解析方法签名
 * @typedef {Object} UserStoreActions
 * @property {function(string, string): void} setSession 更新会话，依次传入token和用户名
 * @property {function(): void} clearSession 清空用户会话
 * */

/**
 * 用户Store实例类型，包含Pinia标准能力和显式声明的业务成员
 * @typedef {import('pinia').Store<'user', UserState, typeof userStoreOptions.getters, typeof userStoreOptions.actions> & UserStoreActions} UserStore
 * */

/**
 * token在本地存储中存储的键名
 * @type {string}
 * */
const TOKEN_KEY = 'solar-notes-admin-token'

/**
 * 用户名在本地存储中存储的键名
 * @type {string}
 * */
const USERNAME_KEY = 'solar-notes-admin-username'

/**
 * 用户Store配置对象
 * @constant
 * */
const userStoreOptions = {
    /**
     * 本函数用于从浏览器本地存储中恢复用户状态
     * @returns {UserState} 包含token和用户名的初始状态
     * */
    state: function () {
        let token = localStorage.getItem(TOKEN_KEY)
        if (token === null || token === undefined) {
            token = ''
        }

        let username = localStorage.getItem(USERNAME_KEY)
        if (username === null || username === undefined) {
            username = ''
        }

        return {
            token,
            username
        }
    },
    getters: {
        /**
         * 本函数用于判断用户是否处于登录状态
         * @param {UserState} state 用户状态
         * @returns {boolean} 表示用户是否处于登录状态的标量
         * */
        isLoggedIn: function (state) {
            return state.token !== ''
        }
    },
    actions: {
        /**
         * 本函数用于更新用户会话(token和username),并同步保存至本地存储
         * @this {UserState}
         * @param {string} token 服务端下发的token
         * @param {string} username 用户名
         * @returns {void}
         * @throws {TypeError} 任一参数类型不为string时抛出该异常
         * */
        setSession: function (token, username) {
            if (typeof token !== 'string' || token === '') {
                throw new TypeError('token 必须是非空字符串')
            }

            if (typeof username !== 'string' || username === '') {
                throw new TypeError('username 必须是非空字符串')
            }

            this.token = token
            this.username = username

            localStorage.setItem(TOKEN_KEY, this.token)
            localStorage.setItem(USERNAME_KEY, this.username)
        },
        /**
         * 本函数用于清空本地存储中的token和用户名
         * @this {UserState}
         * @returns {void}
         * */
        clearSession: function () {
            this.token = ''
            this.username = ''

            localStorage.removeItem(TOKEN_KEY)
            localStorage.removeItem(USERNAME_KEY)
        },
    },
}

/**
 * 获取用户Store实例的函数
 * @type {import('pinia').StoreDefinition<'user', UserState, typeof userStoreOptions.getters, typeof userStoreOptions.actions>}
 * */
const useUserStore = defineStore('user', userStoreOptions)

export default useUserStore
