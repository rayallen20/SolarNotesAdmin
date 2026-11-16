/**
 * 后端业务响应码(对应响应体中的 code 字段)
 * @enum {number}
 * */
const API_CODE = {
    /** 响应成功 */
    SUCCESS: 200,
    /** 服务端内部错误 */
    INTERNAL_ERROR: 500,
    /** 请求参数校验失败 */
    VALIDATION_ERROR: 10101,
    /** 数据库操作失败,包括鉴权查询数据库失败 */
    DATABASE_ERROR: 10201,
    /** 登录账号或密码错误 */
    LOGIN_CREDENTIAL_ERROR: 20001,
    /** 登录过程中账号状态变化,需重新登录 */
    LOGIN_STATE_CHANGED: 20002,
    /** token过期 */
    TOKEN_EXPIRED: 20003,
    /** token缺失/无效/已撤销 */
    TOKEN_INVALID: 20004,
    /** 登录请求触发访问频率限制 */
    LOGIN_RATE_LIMIT: 20005,
    /** 请求创建的天体已经存在 */
    BODY_ALREADY_EXISTS: 20101,
}

export {API_CODE}