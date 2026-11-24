import request from '@/utils/request'
import {isRecord} from '@/utils/typeGuard'
import {readRequiredStringField, readSafeIntegerField, readStringField} from '@/utils/fileReader'
import {BOOK_SORT_MAX} from '@/constants/book'
import {readPagination, validatePageItemCount, validatePaginationInput} from '@/types/pagination'

/** @typedef {import('@/constants/book').BookDisplayStatus} DisplayStatus */
/**
 * 编辑面板的快照或目标字段.
 * @typedef {Object} BookFields
 * @property {string} title 书名.
 * @property {DisplayStatus} display_status 书籍自身的显示状态.
 */
/** @typedef {BookFields & {id: string, sort: number}} BookOption 书单与目录树共用的书籍摘要. */
/** @typedef {BookOption & {planet: import('@/api/body').BodyRecord}} BookRecord 旧分页接口的一行. */
/** @typedef {{books: BookRecord[], pagination: import('@/types/pagination').Pagination}} BookListResult */
/** @typedef {BookFields & {planet_id: string}} CreateBookInput 创建时由后端分配排序值. */

/**
 * 读取响应中的显隐枚举, 供书籍和目录共用.
 * @param {Record<string, unknown>} record 含 display_status 的记录.
 * @returns {DisplayStatus} 已检查的枚举.
 */
function readDisplayStatus(record) {
    const status = readRequiredStringField(record, 'display_status')
    if (status !== 'visible' && status !== 'hidden') {
        throw new Error('显示状态无效')
    }
    return status
}

/**
 * 读取一条书籍摘要. 保留历史书名原文及目录模块支持的序号 0.
 * @param {unknown} value 原始响应中的记录.
 * @returns {BookOption} 对应的书籍摘要.
 */
function readBookOption(value) {
    if (isRecord(value) === false) {
        throw new Error('书籍记录格式异常')
    }
    return {
        id: readRequiredStringField(value, 'id'),
        title: readStringField(value, 'title'),
        sort: readSafeIntegerField(value, 'sort', 0, BOOK_SORT_MAX),
        display_status: readDisplayStatus(value),
    }
}

/**
 * 按服务端顺序读取选项或重排响应的整份书单.
 * @param {unknown} data 拦截器解包后的数据.
 * @returns {BookOption[]} 当前天体的全部书籍.
 */
function readBookOptions(data) {
    if (isRecord(data) === false || Array.isArray(data.books) === false) {
        throw new Error('书籍响应缺少 books 数组')
    }
    return data.books.map(readBookOption)
}

/**
 * 读取既有全库分页接口的一条记录, 保持原来的正整数校验.
 * @param {unknown} value 含所属天体的完整记录.
 * @returns {BookRecord} 经过校验的分页行.
 */
function readBook(value) {
    if (isRecord(value) === false || isRecord(value.planet) === false) {
        throw new Error('书籍记录或所属天体格式异常')
    }
    const book = readBookOption(value)
    if (book.sort === 0) {
        throw new Error('接口响应中的 sort 超出允许范围')
    }
    return {
        ...book,
        planet: {
            id: readRequiredStringField(value.planet, 'id'),
            name: readRequiredStringField(value.planet, 'name'),
            title: readStringField(value.planet, 'title'),
            intro: readStringField(value.planet, 'intro'),
        },
    }
}

/**
 * 读取原有全库分页列表.
 * @param {number} currentPage 当前页码.
 * @param {number} itemPerPage 每页条数.
 * @returns {Promise<BookListResult>} 当前页及分页信息.
 */
async function getBookList(currentPage, itemPerPage) {
    validatePaginationInput(currentPage, itemPerPage)
    /** @type {unknown} */
    const data = await request.post('/v1/book/list', {pagination: {currentPage, itemPerPage}})
    if (isRecord(data) === false || Array.isArray(data.books) === false) {
        throw new Error('书籍列表响应缺少 books 数组')
    }
    const pagination = readPagination(data.pagination, currentPage, itemPerPage)
    validatePageItemCount(data.books.length, pagination)
    return {books: data.books.map(readBook), pagination}
}

/**
 * 读取当前天体的全部书籍, 包括隐藏书籍.
 * @param {string} planetId 天体 ID.
 * @returns {Promise<BookOption[]>} 按后端书序排列的摘要.
 */
async function getBookOptions(planetId) {
    const data = await request.post('/v1/book/options', {planet: {id: planetId}})
    return readBookOptions(data)
}

/**
 * 追加一本书, 排序值由服务端在事务内分配.
 * @param {CreateBookInput} form 已通过页面校验的表单.
 * @returns {Promise<void>} 提交成功, 调用方另行刷新书单.
 */
async function addBook(form) {
    const data = await request.post('/v1/book/create', {
        book: {
            planet: {id: form.planet_id},
            title: form.title.trim(),
            display_status: form.display_status,
        },
    })
    if (isRecord(data) === false) {
        throw new Error('创建响应格式异常, 请刷新书单确认结果')
    }
}

/**
 * 更新书名及书籍自身的显隐.
 * @param {string} bookId 书籍 ID.
 * @param {BookFields} expected 打开抽屉时的原始值, 包括书名首尾空白.
 * @param {BookFields} target 保存时的表单值.
 * @returns {Promise<BookOption>} 后端已保存的书籍摘要.
 */
async function updateBook(bookId, expected, target) {
    const data = await request.post('/v1/book/update', {
        book: {
            id: bookId,
            expected: {title: expected.title, display_status: expected.display_status},
            target: {title: target.title.trim(), display_status: target.display_status},
        },
    })
    if (isRecord(data) === false) {
        throw new Error('编辑响应缺少 book 对象, 请刷新书单确认结果')
    }
    const book = readBookOption(data.book)
    if (book.id !== bookId) {
        throw new Error('编辑响应中的书籍 ID 与请求不一致')
    }
    return book
}

/**
 * 将 ID 包装为书籍引用, 保留 ID 的字符串精度.
 * @param {string} id 书籍 ID.
 * @returns {{id: string}} 请求中的书籍引用.
 */
function bookRef(id) {
    return {id}
}

/**
 * 保存一个天体的完整书序, 以数组位置表达排序.
 * @param {string} planetId 天体 ID.
 * @param {string[]} expectedIds 开始调序时的全部 ID.
 * @param {string[]} targetIds 调整后的全部 ID.
 * @returns {Promise<BookOption[]>} 后端返回的最新书单.
 */
async function reorderBooks(planetId, expectedIds, targetIds) {
    const data = await request.post('/v1/book/reorder', {
        planet: {
            id: planetId,
            expected: {books: expectedIds.map(bookRef)},
            target: {books: targetIds.map(bookRef)},
        },
    })
    const books = readBookOptions(data)
    if (books.length !== targetIds.length || books.some(function (book, index) {
        return book.id !== targetIds[index]
    })) {
        throw new Error('保存书序响应与目标顺序不一致, 请刷新书单确认结果')
    }
    return books
}

export {getBookList, getBookOptions, addBook, updateBook, reorderBooks, readBookOption, readDisplayStatus}
