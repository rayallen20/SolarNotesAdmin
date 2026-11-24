/**
 * 天体不存在, 供天体编辑与书籍关联共用.
 * @type {number}
 */
const BODY_NOT_FOUND = 20102

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
    /** 编辑中的天体已不存在. */
    BODY_NOT_FOUND,
    /** 保留现有书籍与目录页面使用的名称. */
    BOOK_PLANET_NOT_FOUND: BODY_NOT_FOUND,
    /** 当前标题或简介与编辑前的原文不一致. */
    BODY_EDIT_CHANGED: 20103,
    /** 所选书籍已不存在. */
    BOOK_NOT_FOUND: 20202,
    /** 所选天体的书单或顺序已变化. */
    BOOK_ORDER_CHANGED: 20203,
    /** 编辑快照中的书名或显隐已变化. */
    BOOK_EDIT_CHANGED: 20204,
    /** 目录节点已不存在. */
    CATALOGUE_NOT_FOUND: 20301,
    /** 同级排序快照已失效. */
    CATALOGUE_ORDER_CHANGED: 20302,
    /** 显示该节点前需要先排序. */
    CATALOGUE_SORT_REQUIRED: 20303,
    /** 文章正文暂时无法预览. */
    ARTICLE_PREVIEW_UNAVAILABLE: 20401,
}

export {API_CODE}
