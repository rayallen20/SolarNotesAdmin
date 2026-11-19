import request from '@/utils/request'
import {isRecord} from '@/utils/typeGuard'
import {readRequiredStringField, readSafeIntegerField, readStringField} from '@/utils/fileReader'
import {BOOK_SORT_MAX} from '@/constants/book'
import {readPagination, validatePageItemCount, validatePaginationInput} from '@/types/pagination'

/**
 * 书籍响应结构
 * @typedef {Object} BookRecord
 * @property {string} id 书籍 ID
 * @property {string} title 书籍标题
 * @property {number} sort 排序值
 * @property {import('@/constants/book').BookDisplayStatus} display_status 显示状态
 * @property {import('@/api/body').BodyRecord} planet 所属天体
 * */

/**
 * 已完成字段校验的书籍列表结果
 * @typedef {Object} BookListResult
 * @property {BookRecord[]} books 当前页的书籍, 保留服务端顺序
 * @property {import('@/types/pagination').Pagination} pagination 分页信息
 * */

/**
 * 已通过页面校验的创建输入, API 模块负责转换请求体结构
 * @typedef {Object} CreateBookInput
 * @property {string} planet_id 真实天体 ID
 * @property {string} title 书籍标题
 * @property {number} sort 排序正整数
 * @property {import('@/constants/book').BookDisplayStatus} display_status 显示状态
 * */

/**
 * 本函数用于读取书籍记录, 并检查嵌套的天体字段
 * @param {unknown} value 未经校验的书籍记录
 * @returns {BookRecord} 已校验的书籍记录
 * @throws {Error} 书籍/天体字段缺失/类型错误时抛出
 * */
function readBook(value) {
    if (isRecord(value) === false || isRecord(value.planet) === false) {
        throw new Error('书籍记录或所属天体格式异常')
    }

    /** @type {string} 保留原值的书籍 ID */
    const id = readRequiredStringField(value, 'id')

    /** @type {string} 书籍标题, 列表读取不修改历史内容 */
    const title = readStringField(value, 'title')

    /** @type {number} 列表排序值,从 1 开始 */
    const sort = readSafeIntegerField(value, 'sort', 1, BOOK_SORT_MAX)

    /** @type {string} 待检查的显示状态 */
    const displayStatus = readRequiredStringField(value, 'display_status')
    if (displayStatus !== 'visible' && displayStatus !== 'hidden') {
        throw new Error('书籍显示状态必须是 visible 或 hidden')
    }

    /** @type {import('@/api/body').BodyRecord} 完整的所属天体, 未知名称原样保留 */
    const planet = {
        id: readRequiredStringField(value.planet, 'id'),
        name: readRequiredStringField(value.planet, 'name'),
        title: readStringField(value.planet, 'title'),
        intro: readStringField(value.planet, 'intro'),
    }

    return {
        id: id,
        title: title,
        sort: sort,
        display_status: displayStatus,
        planet: planet,
    }
}

/**
 * 本函数用于请求一页书籍, 校验数据后保持服务端排序返回
 * @param {number} currentPage 当前页码
 * @param {number} itemPerPage 每页条数, 使用公共分页模块校验范围
 * @returns {Promise<BookListResult>} 当前页记录和分页信息
 * @throws {Error} 入参/响应格式不合法时拒绝, 业务及网络错误直接向外传递
 * */
async function getBookList(currentPage, itemPerPage) {
    validatePaginationInput(currentPage, itemPerPage)

    /** @type {{pagination: {currentPage: number, itemPerPage: number}}} 后端要求的请求体 */
    const body = {
        pagination: {
            currentPage: currentPage,
            itemPerPage: itemPerPage,
        },
    }
    /** @type {unknown} 公共请求模块已经解包后的 data */
    const data = await request.post('/v1/book/list', body)
    if (isRecord(data) === false || Array.isArray(data.books) === false) {
        throw new Error('书籍列表响应缺少 books 数组')
    }

    /** @type {import('@/types/pagination').Pagination} 已校验的分页信息 */
    const pagination = readPagination(data.pagination, currentPage, itemPerPage)
    validatePageItemCount(data.books.length, pagination)

    /** @type {BookRecord[]} 当前页记录, 不重新排序 */
    const books = []
    /** @type {unknown} 未经校验的当前记录 */
    for (const item of data.books) {
        books.push(readBook(item))
    }

    return {
        books: books,
        pagination: pagination,
    }
}

/**
 * 本函数用于请求创建书籍API
 * @param {CreateBookInput} form 已通过页面业务规则校验的输入
 * @returns {Promise<void>} 服务端已确认创建成功
 * @throws {Error} 成功响应格式异常时拒绝, 业务及网络错误直接向外传递
 * */
async function addBook(form) {
    /**
     * @type {{book: {title: string, sort: number, display_status: import('@/constants/book').BookDisplayStatus, planet: {id: string}}}}
     * 后端要求的嵌套请求体, 只引用天体 ID
     */
    const body = {
        book: {
            title: form.title.trim(),
            sort: form.sort,
            display_status: form.display_status,
            planet: {
                id: form.planet_id,
            },
        },
    }

    /** @type {unknown} 创建成功时, 解包后的 data 是空对象 */
    const data = await request.post('/v1/book/create', body)
    if (isRecord(data) === false) {
        throw new Error('创建书籍响应格式异常, 请刷新列表确认结果')
    }
}

export {
    getBookList,
    addBook,
}
