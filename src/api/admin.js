/**
 * @typedef {Object} LoginRequest 管理员登录接口的请求体
 * @property {{username: string, password: string}} admin 管理员凭据,按原值提交即可
 */

/**
 * @typedef {Object} LoginAdmin 登录接口返回的管理员信息
 * @property {string} id 管理员 ID,保留字符串形式
 * @property {string} username 服务端返回的管理员用户名
 * @property {string} access_token 服务端签发的访问令牌
 * */

import request from "@/utils/request";

/**
 * 本函数用于请求管理员登录接口,并从解包后的数据中取得管理员信息
 * @param {string} username 用户输入的用户名
 * @param {string} password 用户输入的原始密码,不做 trim 或前端哈希
 * @returns {Promise<LoginAdmin>} 已检查字段类型的管理员信息
 * @throws {Error} 响应格式异常时拒绝;业务错误和网络错误直接向调用方传递
 * */
async function loginAdmin(username, password) {
    /** @type {LoginRequest} 管理员登录接口的请求体 */
    const body = {
        admin: {
            username: username,
            password: password,
        },
    }

    /**
     * request 的响应拦截器(已经返回 payload.data)
     * 先作为 unknown 检查,避免误用 AxiosResponse 类型或未经校验的数据
     * @type {unknown}
     */
    const data = await request.post('/v1/admin/login', body)
    if (typeof data !== 'object' || data === null || !('admin' in data)) {
        throw new Error('登录响应格式异常，请稍后重试')
    }

    /** @type {unknown} 待检查的管理员信息 */
    const admin = data.admin
    if (typeof admin !== 'object' || admin === null) {
        throw new Error('登录响应缺少管理员信息,请稍后重试')
    }

    if (!hasValidAdminId(admin)) {
        throw new Error('登录响应中的管理员信息不完整,请稍后重试')
    }

    if (!hasValidAdminUsername(admin)) {
            throw new Error('登录响应中的管理员信息不完整,请稍后重试')
    }

    if (!hasValidAdminAccessToken(admin)) {
        throw new Error('登录响应中的管理员信息不完整,请稍后重试')
    }

    return {
        id: admin.id,
        username: admin.username,
        access_token: admin.access_token,
    }
}

/**
 * 本函数用于检查管理员信息中的 id 字段是否存在且为非空字符串
 * @param {unknown} admin 待检查的管理员信息
 * @returns {admin is {id: string}} id 字段通过校验时返回 true
 * */
function hasValidAdminId(admin) {
    if (typeof admin !== 'object' || admin === null) {
        return false
    }

    if (!('id' in admin) || typeof admin.id !== 'string') {
        return false
    }

    return admin.id !== ''
}

/**
 * 本函数用于检查管理员信息中的 username 字段是否存在且为非空字符串
 * @param {unknown} admin 待检查的管理员信息
 * @returns {admin is {username: string}} username 字段通过校验时返回 true
 * */
function hasValidAdminUsername(admin) {
    if (typeof admin !== 'object' || admin === null) {
        return false
    }

    if (!('username' in admin) || typeof admin.username !== 'string') {
        return false
    }

    return admin.username !== ''
}

/**
 * 本函数用于检查管理员信息中的 access_token 字段是否存在且为非空字符串
 * @param {unknown} admin 待检查的管理员信息
 * @returns {admin is {access_token: string}} access_token 字段通过校验时返回 true
 */
function hasValidAdminAccessToken(admin) {
    if (typeof admin !== 'object' || admin === null) {
        return false
    }

    if (!('access_token' in admin) || typeof admin.access_token !== 'string') {
        return false
    }

    return admin.access_token !== ''
}

/**
 * 提交当前管理员的原密码和新密码.
 * @param {string} currentPassword 原始输入的原密码.
 * @param {string} newPassword 原始输入的新密码.
 * @returns {Promise<void>} 后端确认写入后完成.
 */
async function changeAdminPassword(currentPassword, newPassword) {
    await request.post('/v1/admin/password/change', {
        admin: {
            current_password: currentPassword,
            new_password: newPassword,
        },
    })
}

/**
 * 请求服务端撤销当前管理员会话.
 * @returns {Promise<void>} 服务端确认撤销后完成.
 */
async function logoutAdmin() {
    await request.post('/v1/admin/logout')
}

export {
    loginAdmin,
    changeAdminPassword,
    logoutAdmin,
}
