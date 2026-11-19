/**
 * 书籍显示状态
 * @typedef {'visible' | 'hidden'} BookDisplayStatus
 * */

/**
 * 书籍标题的 Unicode 码点数量上限
 * @type {number}
 * */
const BOOK_TITLE_MAX_LENGTH = 20

/**
 * 创建书籍时的排序下限
 * @type {number}
 * */
const BOOK_SORT_MIN = 1

/**
 * 后端 uint32 排序值上限
 * @type {number}
 * */
const BOOK_SORT_MAX = 4294967295

/**
 * 新表单的初始排序值(不代表该值尚未占用)
 * @type {number}
 * */
const BOOK_DEFAULT_SORT = 1

/**
 * 表单中的显示状态选项
 * @type {{value: BookDisplayStatus, label: string}[]}
 * */
const displayStatusOptions = [
    {value: 'visible', label: '显示'},
    {value: 'hidden', label: '隐藏'},
]

export {
    BOOK_TITLE_MAX_LENGTH,
    BOOK_SORT_MIN,
    BOOK_SORT_MAX,
    BOOK_DEFAULT_SORT,
    displayStatusOptions,
}
