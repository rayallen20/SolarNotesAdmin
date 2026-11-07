/**
 * @typedef {Object} BodyRecord 天体列表中的一条记录
 * @property {string} id 天体ID
 * @property {string} name 天体名称(和前台前端定义的名称一致)
 * @property {string} title 天体标题
 * @property {string} intro 天体简介
 * */

/**
 * @typedef {Object} AddBodyForm 创建天体时提交的表单数据
 * @property {string} name 天体名称(从固定选项中选择的匹配标识)
 * @property {string} title 天体标题
 * @property {string} intro 天体简介
 * */

import {BODY_INTRO_MAX_LENGTH, BODY_TITLE_MAX_LENGTH, bodyOptions} from "@/constants/body";

/**
 * 当前页面演示使用的内存数据,刷新浏览器后会清空
 * @type {BodyRecord[]}
 */
const memoryBodies = []

/**
 * 演示记录的递增序号,仅用于构造列表的字符串ID
 * @type {number}
 */
let nextDemoId = 1

/**
 * 本函数用于读取天体列表(切换页面后重新进入,仍可读取本次浏览中的演示数据)
 * @returns {Promise<BodyRecord[]>} 记录的副本(避免页面直接修改数据源)
 */
async function getBodyList() {
    /** @type {BodyRecord[]} 返回给页面的记录列表 */
    const result = []

    for (const body of memoryBodies) {
        result.push({...body})
    }

    return result
}

/**
 * 本函数用于添加一条天体简介 (当前实现仅操作内存,后续用真实请求替换)
 * @param {AddBodyForm} form 表单数据(三个字段均为必填字符串)
 * @returns {Promise<void>} 添加完成
 * @throws {Error} 天体未知/已存在/标题简介长度不合规时拒绝操作
 */
async function addBody(form) {
    /** @type {string} 保持原样的匹配标识(不转换大小写或删除空格) */
    const name = form.name
    /** @type {string} 去除首尾空白后的天体标题  */
    const title = form.title.trim()
    /** @type {string} 去除首尾空白后的天体简介 */
    const intro = form.intro.trim()
    /** @type {boolean} 标识是否属于已知天体 */
    let isKnownBody = false

    for (const option of bodyOptions) {
        if (option.name === name) {
            isKnownBody = true
            break
        }
    }

    if (isKnownBody === false) {
        throw new Error('请选择列表中提供的天体')
    }

    for (const body of memoryBodies) {
        if (body.name === name) {
            throw new Error('该天体已经添加,请选择其他天体')
        }
    }

    if (title === '' || title.length > BODY_TITLE_MAX_LENGTH) {
        throw new Error('天体标题应为 1 至 20 个字符')
    }

    if (intro === '' || intro.length > BODY_INTRO_MAX_LENGTH) {
        throw new Error('天体内容应为 1 至 150 个字符')
    }

    /** @type {BodyRecord} 即将加入内存列表的记录 */
    const body = {
        id: `demo-body-${nextDemoId}`,
        name,
        title,
        intro,
    }

    memoryBodies.push(body)
    nextDemoId += 1
}

export {
    getBodyList,
    addBody,
}