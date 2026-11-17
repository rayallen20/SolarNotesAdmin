import {bodyOptions} from "@/constants/body.js";

/**
 * 本函数用于根据天体的name获取对应的中文名称
 * @param {string} name 天体的匹配标识
 * @returns {string} name对应的中文名称(未匹配到则返回原始name)
 * */
function getBodyLabel(name) {
    for (const option of bodyOptions) {
        if (option.name === name) {
            return option.label
        }
    }

    return name
}

export {
    getBodyLabel,
}