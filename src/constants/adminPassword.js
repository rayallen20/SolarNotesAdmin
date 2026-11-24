/** @type {RegExp} 密码中至少应包含一个 Unicode 非空白码点. */
const PASSWORD_TEXT_PATTERN = /\P{White_Space}/u

/** @type {number} 新密码和登录密码的最少码点数. */
const PASSWORD_MIN_LENGTH = 6

/** @type {number} 新密码和登录密码的最多码点数. */
const PASSWORD_MAX_LENGTH = 20

export {PASSWORD_TEXT_PATTERN, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH}
