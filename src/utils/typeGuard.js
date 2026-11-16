/**
 * 本函数用于判断输入是否为可读取字段的非空对象
 * @param {unknown} value 待检查值
 * @returns {value is Record<string, unknown>} 给定值类型为 Object 时返回 true
 * */
function isObject(value) {
    return typeof value === 'object' && value !== null
}

/**
 * 本函数用于判断输入是否为非 null/非数组的对象
 * @param {unknown} value 待检查值
 * @returns {value is Record<string, unknown>} 输入为非 null/非数组的对象时返回 true
 * */
function isRecord(value) {
    if (isObject(value) === false) {
        return false
    }

    return Array.isArray(value) === false
}

export {
    isObject,
    isRecord,
}