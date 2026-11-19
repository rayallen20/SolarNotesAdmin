/**
 * 本函数用于读取一个字符串字段,保留输入对象中的原值
 * @param {Record<string, unknown>} record 待检查的记录
 * @param {string} field 字段名
 * @returns {string} 已确认类型的字段值
 * @throws {Error} 字段缺失或类型错误时抛出
 * */
function readStringField(record, field) {
    /** @type {unknown} 待校验的字段值 */
    const value = record[field]

    if (typeof value !== 'string') {
        throw new Error('接口响应中的 ' + field + ' 字段类型异常')
    }

    return value
}

/**
 * 本函数用于读取必须非空的字符串字段
 * @param {Record<string, unknown>} record 待检查的记录
 * @param {string} field 字段名
 * @returns {string} 非空字符串
 * @throws {Error} 字段缺失/类型错误或为空时抛出
 * */
function readRequiredStringField(record, field) {
    /** @type {string} 已确认类型的字段值 */
    const value = readStringField(record, field)

    if (value === '') {
        throw new Error('接口响应中的 ' + field + ' 字段不能为空')
    }

    return value
}

/**
 * 本函数用于读取指定范围内的安全整数(仅读取,不把字符串转换为数字)
 * @param {Record<string, unknown>} record 待检查的记录
 * @param {string} field 字段名
 * @param {number} minimum 允许的最小值
 * @param {number} maximum 允许的最大值
 * @returns {number} 已校验的整数
 * @throws {Error} 字段缺失/类型错误/超出范围时抛出
 * */
function readSafeIntegerField(record, field, minimum, maximum) {
    /** @type {unknown} 未经校验的字段值 */
    const value = record[field]
    if (typeof value !== 'number' || Number.isSafeInteger(value) === false) {
        throw new Error('接口响应中的 ' + field + ' 必须是安全整数')
    }

    if (value < minimum || value > maximum) {
        throw new Error('接口响应中的 ' + field + ' 超出允许范围')
    }

    return value
}

export {
    readStringField,
    readRequiredStringField,
    readSafeIntegerField,
}