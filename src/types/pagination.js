import {PAGE_SIZE_MAX} from '@/constants/pagination'
import {isRecord} from '@/utils/typeGuard'
import {readSafeIntegerField} from '@/utils/fileReader'

/**
 * 列表响应中的公共分页信息
 * @typedef {Object} Pagination
 * @property {number} currentPage 当前页码
 * @property {number} itemPerPage 每页条数
 * @property {number} totalPage 总页数(无记录时为 0 )
 * @property {number} totalItem 总记录数
 * */

/**
 * 本函数用于检查列表请求的分页参数, 避免产生不精确的偏移值
 * @param {number} currentPage 当前页码
 * @param {number} itemPerPage 每页条数
 * @returns {void}
 * @throws {Error} 页码/页大小/偏移值不合法时抛出
 * */
function validatePaginationInput(currentPage, itemPerPage) {
    if (Number.isSafeInteger(currentPage) === false || currentPage < 1) {
        throw new Error('页码必须是从 1 开始的安全整数')
    }

    if (Number.isSafeInteger(itemPerPage) === false || itemPerPage < 1 || itemPerPage > PAGE_SIZE_MAX) {
        throw new Error('每页条数必须是 1 到 ' + PAGE_SIZE_MAX + ' 之间的整数')
    }

    if (currentPage - 1 > Math.floor(Number.MAX_SAFE_INTEGER / itemPerPage)) {
        throw new Error('页码过大, 无法精确计算分页位置')
    }
}

/**
 * 本函数用于读取分页响应, 检查回显值和总页数是否一致
 * @param {unknown} value 未经校验的分页对象
 * @param {number} currentPage 请求使用的页码
 * @param {number} itemPerPage 请求使用的每页条数
 * @returns {Pagination} 已校验的分页对象
 * @throws {Error} 分页字段或总数关系不合法时抛出
 * */
function readPagination(value, currentPage, itemPerPage) {
    validatePaginationInput(currentPage, itemPerPage)

    if (isRecord(value) === false) {
        throw new Error('列表响应缺少 pagination 对象')
    }

    /** @type {Pagination} 四个字段都必须是安全整数. */
    const pagination = {
        currentPage: readSafeIntegerField(value, 'currentPage', 1, Number.MAX_SAFE_INTEGER),
        itemPerPage: readSafeIntegerField(value, 'itemPerPage', 1, PAGE_SIZE_MAX),
        totalPage: readSafeIntegerField(value, 'totalPage', 0, Number.MAX_SAFE_INTEGER),
        totalItem: readSafeIntegerField(value, 'totalItem', 0, Number.MAX_SAFE_INTEGER),
    }

    if (pagination.currentPage !== currentPage || pagination.itemPerPage !== itemPerPage) {
        throw new Error('列表响应的分页参数与请求不一致')
    }

    /** @type {number} 根据总条数计算的页数, 空列表为 0 */
    let expectedTotalPage = 0
    if (pagination.totalItem > 0) {
        expectedTotalPage = Math.floor((pagination.totalItem - 1) / itemPerPage) + 1
    }

    if (pagination.totalPage !== expectedTotalPage) {
        throw new Error('列表的总页数与总条数不一致')
    }

    return pagination
}

/**
 * 本函数用于校验完整分页列表的条数, 要求列表与总数来自同一数据快照
 * @param {number} itemCount 接口原始列表的条数, 未经页面筛选
 * @param {Pagination} pagination 已通过 readPagination 校验的分页信息
 * @returns {void}
 * @throws {Error} 条数无效或与分页信息不一致时抛出
 */
function validatePageItemCount(itemCount, pagination) {
    if (Number.isSafeInteger(itemCount) === false || itemCount < 0) {
        throw new Error('列表条数必须是非负安全整数')
    }

    /** @type {number} 当前页的偏移值, 分页参数已通过安全范围检查 */
    const offset = (pagination.currentPage - 1) * pagination.itemPerPage
    /** @type {number} 当前数据快照应返回的本页条数 */
    const expectedCount = Math.min(pagination.itemPerPage, Math.max(pagination.totalItem - offset, 0))
    if (itemCount !== expectedCount) {
        throw new Error('列表条数与分页信息不一致')
    }
}

export {
    validatePaginationInput,
    readPagination,
    validatePageItemCount,
}
