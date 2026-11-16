/**
 * @typedef {Object} BodyStatus 本对象表示天体下拉选项对应的服务端状态
 * @property {string} name 天体标识(区分大小写)
 * @property {boolean} exist 是否已经创建(true 表示不可再次创建)
 * */

/**
 * @typedef {Object} BodyRecord 列表接口返回的一条天体记录
 * @property {string} id 雪花 ID 的字符串(不转换为 Number )
 * @property {string} name 天体标识(历史未知名称也保留展示)
 * @property {string} title 天体标题
 * @property {string} intro 天体简介
 * */

/**
 * @typedef {Object} AddBodyForm 创建天体的表单数据
 * @property {string} name 固定选项中的天体标识(保持大小写及原值)
 * @property {string} title 天体标题
 * @property {string} intro 天体简介
 * */

import {isRecord} from "@/utils/typeGuard";
import {bodyOptions} from "@/constants/body";
import {readRequiredStringField, readStringField} from "@/utils/fileReader";
import request from "@/utils/request";

/**
 * 本函数用于从已解包的 data 中读取 planets 数组
 * @param {unknown} data request 响应拦截器返回的 payload.data
 * @returns {unknown[]} 尚未逐项校验的数组
 * @throws {Error} 缺少数组或数据结构异常时抛出
 * */
function readPlanets(data) {
    if (isRecord(data) === false) {
        throw new Error('天体接口响应格式异常,请刷新后重试')
    }

    if (Array.isArray(data.planets) === false) {
        throw new Error('天体接口响应缺少 planets 数组')
    }

    return data.planets
}

/**
 * 本函数用于判断状态项的名称是否属于当前前端支持的9个选项
 * @param {string} name 待检查的天体标识
 * @returns {boolean} 名称精确匹配时返回 true
 * */
function isKnownBodyName(name) {
    for (const option of bodyOptions) {
        if (option.name === name) {
            return true
        }
    }

    return false
}

/**
 * 本函数用于请求天体状态接口(任何缺失/重复/格式错误都视为加载失败)
 * @returns {Promise<BodyStatus[]>} 包含全部9个天体的有效状态
 * @throws {Error} 响应结构或状态字段不符合当前协议时拒绝
 * */
async function getBodyStatus() {
    /** @type {unknown} 已解包的响应 data(不用再读取一层 data) */
    const data = await request.get('/v1/planet/status')

    /** @type {unknown[]} 未经校验的状态项 */
    const planets = readPlanets(data)

    /** @type {Set<string>} 已出现的名称,防止重复项冒充完整状态 */
    const seenNames = new Set()

    /** @type {BodyStatus[]} 返回给组件的已校验状态 */
    const result = []

    for (const item of planets) {
        if (isRecord(item) === false) {
            throw new Error('天体状态记录格式异常')
        }

        /** @type {string} 状态项中的精确名称 */
        const name = readRequiredStringField(item, 'name')

        if (isKnownBodyName(name) === false || seenNames.has(name) === true) {
            throw new Error('天体状态包含未知或重复的名称')
        }

        if (typeof item.exist !== 'boolean') {
            throw new Error('天体状态中的 exist 必须为布尔值')
        }

        seenNames.add(name)
        result.push({name: name, exist: item.exist})
    }

    if (seenNames.size !== bodyOptions.length) {
        throw new Error('天体状态不完整,请刷新状态后重试')
    }

    return result
}

/**
 * 本函数用于请求天体列表接口
 * @returns {Promise<BodyRecord[]>} 天体列表(按接口返回顺序)
 * @throws {Error} 列表字段缺失或类型错误时拒绝
 */
async function getBodyList() {
    /** @type {unknown} 已解包的响应 data */
    const data = await request.get('/v1/planet/list')
    /** @type {unknown[]} 未经校验的天体记录 */
    const planets = readPlanets(data)

    /** @type {BodyRecord[]} 返回给页面的天体列表 */
    const result = []

    for (const item of planets) {
        if (isRecord(item) === false) {
            throw new Error('天体列表记录格式异常')
        }

        /** @type {string} 保持为字符串的天体 ID */
        const id = readRequiredStringField(item, 'id')
        /** @type {string} 不转换大小写的名称 */
        const name = readRequiredStringField(item, 'name')
        /** @type {string} 数据库中的标题 */
        const title = readStringField(item, 'title')
        /** @type {string} 数据库中的简介 */
        const intro = readStringField(item, 'intro')

        result.push({
            id: id,
            name: name,
            title: title,
            intro: intro
        })
    }

    return result
}

/**
 * 本函数用于创建天体解耦
 * @param {AddBodyForm} form 已通过前端校验的3个必填字段
 * @returns {Promise<void>} 后端确认创建成功
 * @throws {Error} 成功响应结构异常时拒绝(业务及网络错误直接向外传递)
 * */
async function addBody(form) {
    /** @type {{planet: AddBodyForm}} 后端要求的嵌套请求体 */
    const body = {
        planet: {
            name: form.name,
            title: form.title.trim(),
            intro: form.intro.trim(),
        },
    }

    /** @type {unknown} 创建成功时,解包后的 data 是空对象 */
    const data = await request.post('/v1/planet/create', body)

    if (isRecord(data) === false) {
        throw new Error('创建接口响应格式异常,请刷新列表确认结果')
    }
}

export {
    getBodyStatus,
    getBodyList,
    addBody,
}
