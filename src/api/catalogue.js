import request from '@/utils/request'
import {isRecord} from '@/utils/typeGuard'
import {readRequiredStringField, readSafeIntegerField, readStringField} from '@/utils/fileReader'
import {BOOK_SORT_MAX} from '@/constants/book'

/** @typedef {import('@/constants/book').BookDisplayStatus} DisplayStatus */
/**
 * @typedef {Object} BookOption
 * @property {string} id 书籍 ID.
 * @property {string} title 书名.
 * @property {number} sort 书籍排序.
 * @property {DisplayStatus} display_status 书籍自身的显隐.
 */
/**
 * @typedef {Object} CatalogueNode
 * @property {string} id 目录节点 ID.
 * @property {string} parent_id 直接父节点的 ID, 根节点为 "0".
 * @property {string} name 目录名或文件名.
 * @property {'folder' | 'file'} type 节点类型.
 * @property {number | null} sort 序号, null 表示待排.
 * @property {DisplayStatus} display_status 节点自身的显隐.
 * @property {CatalogueNode[]} children 已按阅读顺序排列的直接子节点.
 */
/** @typedef {BookOption & {catalogues: CatalogueNode[]}} CatalogueBook */
/** @typedef {{sorted_children: {id: string}[], unsorted_children: {id: string}[]}} OrderGroups */
/** @typedef {{catalogue: {parent_id: string, expected: OrderGroups, target: OrderGroups}}} ReorderRequest */
/** @typedef {{id: string, title: string, content: string}} ArticlePreview */

/**
 * 读取书籍或目录的显示状态.
 * @param {Record<string, unknown>} record 解包后的记录.
 * @returns {DisplayStatus} 服务端保存的状态.
 */
function readDisplayStatus(record) {
    const status = readRequiredStringField(record, 'display_status')
    if (status !== 'visible' && status !== 'hidden') {
        throw new Error('显示状态无效')
    }
    return status
}

/**
 * 读取书籍下拉选项与目录树共有的书籍字段.
 * @param {unknown} value 接口返回的书籍.
 * @returns {BookOption} 书籍摘要.
 */
function readBookOption(value) {
    if (isRecord(value) === false) {
        throw new Error('书籍记录格式异常')
    }
    return {
        id: readRequiredStringField(value, 'id'),
        title: readStringField(value, 'title'),
        // 读取时保留历史书籍的序号 0.
        sort: readSafeIntegerField(value, 'sort', 0, BOOK_SORT_MAX),
        display_status: readDisplayStatus(value),
    }
}

/**
 * 读取后端已组装的节点, 保留各层 children 的顺序.
 * @param {unknown} value 目录树中的一个节点.
 * @returns {CatalogueNode} 可交给页面的节点.
 */
function readCatalogueNode(value) {
    if (isRecord(value) === false || Array.isArray(value.children) === false) {
        throw new Error('目录节点缺少 children 数组')
    }
    const type = readRequiredStringField(value, 'type')
    if (type !== 'folder' && type !== 'file') {
        throw new Error('目录节点类型无效')
    }
    const parentId = readRequiredStringField(value, 'parent_id')
    let sort = null
    if (parentId === '0') {
        sort = readSafeIntegerField(value, 'sort', 0, 0)
    } else if (value.sort !== null) {
        sort = readSafeIntegerField(value, 'sort', 1, Number.MAX_SAFE_INTEGER)
    }
    return {
        id: readRequiredStringField(value, 'id'),
        parent_id: parentId,
        name: readStringField(value, 'name'),
        type,
        sort,
        display_status: readDisplayStatus(value),
        children: value.children.map(readCatalogueNode),
    }
}

/**
 * 读取选中天体下的全部书籍选项, 包括隐藏书籍.
 * @param {string} planetId 天体 ID.
 * @returns {Promise<BookOption[]>} 服务端排序后的书籍选项.
 */
async function getBookOptions(planetId) {
    /** @type {unknown} request 已解包的 data. */
    const data = await request.post('/v1/book/options', {planet: {id: planetId}})
    if (isRecord(data) === false || Array.isArray(data.books) === false) {
        throw new Error('书籍选项响应缺少 books 数组')
    }
    return data.books.map(readBookOption)
}

/**
 * 读取一本书和它的完整目录树.
 * @param {string} bookId 书籍 ID.
 * @returns {Promise<CatalogueBook>} 尚未导入目录时 catalogues 是空数组.
 */
async function getCatalogueTree(bookId) {
    /** @type {unknown} request 已解包的 data. */
    const data = await request.post('/v1/catalogue/tree', {book: {id: bookId}})
    if (isRecord(data) === false || isRecord(data.book) === false ||
        Array.isArray(data.book.catalogues) === false) {
        throw new Error('目录树响应缺少 book.catalogues 数组')
    }
    const book = readBookOption(data.book)
    if (book.id !== bookId) {
        throw new Error('目录树响应中的书籍 ID 与请求不一致')
    }
    return {...book, catalogues: data.book.catalogues.map(readCatalogueNode)}
}

/**
 * 保存父目录下的阅读顺序. 两个分组均包含该层全部直接子项.
 * @param {ReorderRequest} payload 已含外层 catalogue 的完整请求体.
 * @returns {Promise<void>} 排序事务已提交.
 */
async function saveCatalogueOrder(payload) {
    await request.post('/v1/catalogue/reorder', payload)
}

/**
 * 设置单个节点的目标状态, 由后端处理级联隐藏.
 * @param {string} id 目录节点 ID.
 * @param {DisplayStatus} status 目标显隐状态.
 * @returns {Promise<void>} 显隐事务已提交.
 */
async function setCatalogueDisplay(id, status) {
    await request.post('/v1/catalogue/display', {catalogue: {id, display_status: status}})
}

/**
 * 用文件节点 ID 读取文章. 响应内的 id 是文章主键.
 * @param {string} nodeId 所点击的文件节点 ID.
 * @returns {Promise<ArticlePreview>} 标题与保留换行的 Markdown 正文.
 */
async function getArticlePreview(nodeId) {
    /** @type {unknown} request 已解包的 data. */
    const data = await request.post('/v1/article/preview', {catalogue: {id: nodeId}})
    if (isRecord(data) === false || isRecord(data.article) === false) {
        throw new Error('预览响应缺少 article 对象')
    }
    return {
        id: readRequiredStringField(data.article, 'id'),
        title: readStringField(data.article, 'title'),
        content: readStringField(data.article, 'content'),
    }
}

export {getBookOptions, getCatalogueTree, saveCatalogueOrder, setCatalogueDisplay, getArticlePreview}
