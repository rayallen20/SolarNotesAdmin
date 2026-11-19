/**
 * 每页最大条数
 * @type {number}
 * */
const PAGE_SIZE_MAX = 100

/**
 * 页面初始每页条数
 * @type {number}
 * */
const DEFAULT_PAGE_SIZE = 10

/**
 * 分页器可选择的每页条数
 * @type {number[]}
 * */
const PAGE_SIZES = [
    10,
    20,
    50,
    PAGE_SIZE_MAX
]

export {
    PAGE_SIZE_MAX,
    DEFAULT_PAGE_SIZE,
    PAGE_SIZES,
}