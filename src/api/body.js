import request from '@/utils/request'
import {bodyOptions} from '@/constants/body'
import {isRecord} from '@/utils/typeGuard'
import {readRequiredStringField, readSafeIntegerField, readStringField} from '@/utils/fileReader'

/**
 * @typedef {Object} BodyStatus 固定天体的创建状态.
 * @property {string} name 固定英文标识.
 * @property {boolean} exist 已创建时为 true.
 */

/**
 * @typedef {Object} BodyReadiness 后端完整性检测结果.
 * @property {boolean} ready 九个必需天体均已创建时为 true.
 * @property {number} required_count 必需天体总数.
 * @property {number} created_count 已创建的必需天体数.
 * @property {string[]} missing_names 按固定顺序列出的缺失标识.
 */

/**
 * @typedef {Object} BodyStatusResult 同一次检测的明细和摘要.
 * @property {BodyStatus[]} planets 太阳与八颗行星的创建状态.
 * @property {BodyReadiness} readiness 完整性摘要.
 */

/**
 * @typedef {Object} BodyFields 可编辑的字段.
 * @property {string} title 天体标题.
 * @property {string} intro 天体简介.
 */

/**
 * @typedef {Object} BodyRecord 数据库中已创建的天体.
 * @property {string} id 十进制字符串 ID.
 * @property {string} name 大小写敏感的原始标识.
 * @property {string} title 天体标题原文.
 * @property {string} intro 天体简介原文.
 */

/**
 * @typedef {Object} AddBodyForm 创建表单.
 * @property {string} name 待创建天体的固定标识.
 * @property {string} title 天体标题.
 * @property {string} intro 天体简介.
 */

/**
 * 读取已经由 Axios 解包的数据中的 planets.
 * @param {unknown} data 业务响应中的 data.
 * @returns {unknown[]} 待校验的数组.
 */
function readPlanets(data) {
    if (isRecord(data) === false || Array.isArray(data.planets) === false) {
        throw new Error('天体接口响应缺少 planets 数组')
    }
    return data.planets
}

/**
 * 逐项核对后端约定的九个固定标识及其顺序.
 * @param {unknown[]} items 状态明细原值.
 * @returns {BodyStatus[]} 可供表单使用的创建状态.
 */
function readStatuses(items) {
    if (items.length !== bodyOptions.length) {
        throw new Error('天体状态明细不完整')
    }
    /** @type {BodyStatus[]} */
    const planets = []
    for (const [index, item] of items.entries()) {
        if (isRecord(item) === false) {
            throw new Error('天体状态记录格式异常')
        }
        const name = readRequiredStringField(item, 'name')
        if (name !== bodyOptions[index].name || typeof item.exist !== 'boolean') {
            throw new Error('天体状态的标识, 顺序或创建标记异常')
        }
        planets.push({name, exist: item.exist})
    }
    return planets
}

/**
 * 核对同一响应的摘要与逐项状态, 拒绝相互矛盾的结果.
 * @param {unknown} value 后端返回的 readiness.
 * @param {BodyStatus[]} planets 已校验的明细.
 * @returns {BodyReadiness} 可用于提示和计数的摘要.
 */
function readReadiness(value, planets) {
    if (isRecord(value) === false || typeof value.ready !== 'boolean' || Array.isArray(value.missing_names) === false) {
        throw new Error('天体完整性摘要格式异常')
    }

    const required = readSafeIntegerField(value, 'required_count', planets.length, planets.length)
    const created = readSafeIntegerField(value, 'created_count', 0, required)
    /** @type {string[]} */
    const missing = []
    for (const planet of planets) {
        if (planet.exist === false) {
            if (value.missing_names[missing.length] !== planet.name) {
                throw new Error('缺失天体与逐项状态不一致')
            }
            missing.push(planet.name)
        }
    }
    if (value.missing_names.length !== missing.length ||
        created !== required - missing.length || value.ready !== (missing.length === 0)) {
        throw new Error('天体完整性摘要与逐项状态不一致')
    }
    return {ready: value.ready, required_count: required, created_count: created, missing_names: missing}
}

/**
 * 同时获取固定天体的创建状态和完整性检测结论.
 * @returns {Promise<BodyStatusResult>} 已校验的一次检测结果.
 */
async function getBodyStatus() {
    /** @type {unknown} */
    const data = await request.get('/v1/planet/status')
    if (isRecord(data) === false) {
        throw new Error('天体状态响应格式异常')
    }
    const planets = readStatuses(readPlanets(data))
    return {planets, readiness: readReadiness(data.readiness, planets)}
}

/**
 * 从列表元素或编辑响应读取完整天体, 保留历史标题和简介原文.
 * @param {unknown} value 一条天体记录.
 * @returns {BodyRecord} 已校验的天体.
 */
function readBodyRecord(value) {
    if (isRecord(value) === false) {
        throw new Error('天体记录格式异常')
    }
    return {
        id: readRequiredStringField(value, 'id'),
        name: readRequiredStringField(value, 'name'),
        title: readStringField(value, 'title'),
        intro: readStringField(value, 'intro'),
    }
}

/**
 * 按服务端顺序读取全部已创建记录, 包括历史名称.
 * @returns {Promise<BodyRecord[]>} 列表为空时返回空数组.
 */
async function getBodyList() {
    const data = await request.get('/v1/planet/list')
    return readPlanets(data).map(readBodyRecord)
}

/**
 * 创建一个缺失天体.
 * @param {AddBodyForm} form 已校验的创建表单.
 * @returns {Promise<void>} 创建成功后由页面重查列表与状态.
 */
async function addBody(form) {
    const data = await request.post('/v1/planet/create', {
        planet: {name: form.name, title: form.title.trim(), intro: form.intro.trim()},
    })
    if (isRecord(data) === false) {
        throw new Error('创建响应格式异常, 请刷新列表确认结果')
    }
}

/**
 * 按 ID 保存标题和简介.
 * @param {string} id 列表中的字符串 ID.
 * @param {BodyFields} expected 打开抽屉或确认最新版本时取得的原文.
 * @param {BodyFields} target 本次表单的目标值.
 * @returns {Promise<BodyRecord>} 数据库已保存的完整行.
 */
async function updateBody(id, expected, target) {
    const data = await request.post('/v1/planet/update', {
        planet: {
            id,
            expected: {title: expected.title, intro: expected.intro},
            target: {title: target.title.trim(), intro: target.intro.trim()},
        },
    })
    if (isRecord(data) === false) {
        throw new Error('编辑响应格式异常, 请刷新列表确认结果')
    }
    const saved = readBodyRecord(data.planet)
    if (saved.id !== id) {
        throw new Error('返回的天体 ID 与请求不一致, 请刷新列表确认结果')
    }
    return saved
}

export {getBodyStatus, getBodyList, addBody, updateBody}
