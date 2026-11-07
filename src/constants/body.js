/**
 * @typedef {Object} BodyOption 可选择的天体
 * @property {string} name 天体名称(和前台前端定义的名称一致)
 * @property {string} label 天体中文名称
 * */

/**
 * 前台前端中已存在的太阳和八大行星(英文标识区分大小写)
 * @type {BodyOption[]} bodyOptions
 * */
const bodyOptions = [
    {
        name: 'Sun',
        label: '太阳'
    },
    {
        name: 'Mercury',
        label: '水星'
    },
    {
        name: 'Venus',
        label: '金星'
    },
    {
        name: 'Earth',
        label: '地球'
    },
    {
        name: 'Mars',
        label: '火星'
    },
    {
        name: 'Jupiter',
        label: '木星'
    },
    {
        name: 'Saturn',
        label: '土星'
    },
    {
        name: 'Uranus',
        label: '天王星'
    },
    {
        name: 'Neptune',
        label: '海王星'
    },
]

/**
 * 天体标题内容长度上限
 * @type {number}
 */
const BODY_TITLE_MAX_LENGTH = 20

/**
 * 天体简介内容长度上限
 * @type {number}
 */
const BODY_INTRO_MAX_LENGTH = 150

export {
    bodyOptions,
    BODY_TITLE_MAX_LENGTH,
    BODY_INTRO_MAX_LENGTH
}
