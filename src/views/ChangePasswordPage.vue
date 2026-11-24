<template>
    <section class="password-page" aria-labelledby="password-title">
        <el-breadcrumb separator="/">
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>账号管理</el-breadcrumb-item>
            <el-breadcrumb-item>修改密码</el-breadcrumb-item>
        </el-breadcrumb>

        <header class="heading">
            <el-icon class="lock" aria-hidden="true"><Lock /></el-icon>
            <div>
                <h1 id="password-title">修改密码</h1>
                <p>为当前账号 {{ userStore.username }} 设置新的登录密码。</p>
            </div>
        </header>

        <form ref="formElement" class="card" novalidate :aria-busy="pending"
              @submit.prevent="submit">
            <div class="fields">
                <div v-for="field in fields" :key="field.key" class="field">
                    <label :for="field.key">{{ field.label }}</label>
                    <el-input :id="field.key" v-model="values[field.key]" :name="field.key"
                              :type="revealed[field.key] ? 'text' : 'password'"
                              :autocomplete="field.autocomplete" :placeholder="field.placeholder"
                              :disabled="pending || needsLogin" required :spellcheck="false"
                              :aria-invalid="errors[field.key] !== ''"
                              :aria-describedby="field.key + '-feedback'"
                              :class="{invalid: errors[field.key] !== ''}"
                              @input="onEdit(field.key)" @blur="onBlur(field.key)">
                        <template #suffix>
                            <button type="button" class="eye" :aria-controls="field.key"
                                    :aria-label="(revealed[field.key] ? '隐藏' : '显示') + field.label"
                                    :disabled="pending || needsLogin"
                                    @click="revealed[field.key] = !revealed[field.key]">
                                <el-icon aria-hidden="true">
                                    <Hide v-if="revealed[field.key]" /><View v-else />
                                </el-icon>
                            </button>
                        </template>
                    </el-input>
                    <div :id="field.key + '-feedback'" aria-live="polite">
                        <p v-if="errors[field.key] !== ''" class="error">{{ errors[field.key] }}</p>
                        <p v-else-if="field.key === 'newPassword'" class="hint">
                            使用 {{ PASSWORD_MIN_LENGTH }}–{{ PASSWORD_MAX_LENGTH }} 个字符。
                        </p>
                    </div>
                </div>
            </div>

            <footer>
                <p v-if="notice !== ''" role="alert">{{ notice }}</p>
                <a v-if="needsLogin" :href="loginHref" @click="userStore.clearSession()">前往登录页</a>
                <div v-else class="actions">
                    <el-button native-type="button" :disabled="pending" @click="resetForm">清空</el-button>
                    <el-button native-type="submit" type="primary" :loading="pending" :disabled="pending">
                        确认修改
                    </el-button>
                </div>
            </footer>
        </form>
    </section>
</template>

<script setup>
import {nextTick, reactive, ref} from 'vue'
import {isNavigationFailure, useRouter} from 'vue-router'
import {ElMessage} from 'element-plus'
import {Hide, Lock, View} from '@element-plus/icons-vue'
import {changeAdminPassword} from '@/api/admin'
import {API_CODE} from '@/constants/apiCode'
import {PASSWORD_TEXT_PATTERN, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH} from '@/constants/adminPassword'
import {getApiErrorCode, getApiErrorMessage, isAuthError} from '@/utils/apiError'
import useUserStore from '@/stores/user'

/** @typedef {'currentPassword' | 'newPassword' | 'confirmation'} PasswordField */

/** @type {{key: PasswordField, label: string, autocomplete: string, placeholder: string}[]} 字段显示顺序. */
const fields = [
    {key: 'currentPassword', label: '原密码', autocomplete: 'current-password', placeholder: '请输入原密码'},
    {key: 'newPassword', label: '新密码', autocomplete: 'new-password', placeholder: '请输入新密码'},
    {key: 'confirmation', label: '确认新密码', autocomplete: 'new-password', placeholder: '请再次输入新密码'},
]

/** @type {Record<PasswordField, string>} 仅保存在当前表单中的原始输入. */
const values = reactive({currentPassword: '', newPassword: '', confirmation: ''})
/** @type {Record<PasswordField, string>} 各字段的行内错误. */
const errors = reactive({currentPassword: '', newPassword: '', confirmation: ''})
/** @type {Record<PasswordField, boolean>} 各输入框是否显示明文. */
const revealed = reactive({currentPassword: false, newPassword: false, confirmation: false})
/** @type {import('vue').Ref<HTMLFormElement | null>} 原生表单, 用于定位输入框. */
const formElement = ref(null)
/** @type {import('vue').Ref<boolean>} 当前写请求是否正在处理. */
const pending = ref(false)
/** @type {import('vue').Ref<boolean>} 是否需要用户前往登录页核实结果. */
const needsLogin = ref(false)
/** @type {import('vue').Ref<string>} 表单级反馈. */
const notice = ref('')
/** 当前管理员会话. */
const userStore = /** @type {import('@/stores/user').UserStore} */ (useUserStore())
/** 当前路由实例. */
const router = useRouter()
/** @type {string} 含部署基础路径的登录地址. */
const loginHref = router.resolve({name: 'login'}).href

/**
 * 返回字段提示, 空字符串表示通过.
 * @param {PasswordField} key 字段名.
 * @returns {string} 字段级错误.
 */
function validateField(key) {
    const value = values[key]
    if (key === 'currentPassword') {
        return PASSWORD_TEXT_PATTERN.test(value) ? '' : '请输入原密码'
    }
    if (key === 'confirmation') {
        if (value === '') {
            return '请再次输入新密码'
        }
        return value === values.newPassword ? '' : '两次输入的新密码不一致'
    }
    if (PASSWORD_TEXT_PATTERN.test(value) === false) {
        return '请输入新密码'
    }
    const length = Array.from(value).length
    if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
        return `新密码须为 ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} 个字符`
    }
    return ''
}

/**
 * 修正错误时重新校验. 新密码改变时同步检查已填写的确认项.
 * @param {PasswordField} key 刚编辑的字段.
 * @returns {void}
 */
function onEdit(key) {
    notice.value = ''
    if (errors[key] !== '') {
        errors[key] = validateField(key)
    }
    if (key === 'newPassword' && values.confirmation !== '') {
        errors.confirmation = validateField('confirmation')
    }
}

/**
 * 已填写字段失焦时校验. 服务端给出的原密码错误保留到下次编辑.
 * @param {PasswordField} key 失去焦点的字段.
 * @returns {void}
 */
function onBlur(key) {
    if (values[key] !== '' && errors[key] === '') {
        errors[key] = validateField(key)
    }
}

/**
 * 将焦点移至指定输入框.
 * @param {PasswordField} key 字段名.
 * @returns {void}
 */
function focusField(key) {
    const input = formElement.value?.elements.namedItem(key)
    if (input instanceof HTMLInputElement) {
        input.focus()
    }
}

/**
 * 清除所有输入及校验反馈, 恢复密码遮罩.
 * @returns {void}
 */
function clearFields() {
    for (const field of fields) {
        values[field.key] = ''
        errors[field.key] = ''
        revealed[field.key] = false
    }
    notice.value = ''
}

/**
 * 处理用户点击清空.
 * @returns {void}
 */
function resetForm() {
    clearFields()
    focusField('currentPassword')
}

/**
 * 后端已确认成功. 先清会话, 再在登录页显示成功原因.
 * @returns {Promise<void>}
 */
async function finishChange() {
    clearFields()
    needsLogin.value = true
    const loginNotice = '密码已修改，请使用新密码重新登录'
    notice.value = loginNotice
    userStore.clearSession()
    try {
        const failure = await router.replace({name: 'login'})
        if (isNavigationFailure(failure) && router.currentRoute.value.name !== 'login') {
            return
        }
    } catch {
        return
    }
    ElMessage.success(loginNotice)
}

/**
 * 校验全部字段并提交一次. 回包只处理发起请求的会话.
 * @returns {Promise<void>}
 */
async function submit() {
    if (pending.value || needsLogin.value) {
        return
    }
    notice.value = ''
    /** @type {PasswordField | null} 首个需要修正的字段. */
    let firstInvalid = null
    for (const field of fields) {
        errors[field.key] = validateField(field.key)
        if (firstInvalid === null && errors[field.key] !== '') {
            firstInvalid = field.key
        }
    }
    if (firstInvalid !== null) {
        focusField(firstInvalid)
        return
    }

    const submittedToken = userStore.token
    pending.value = true
    try {
        await changeAdminPassword(values.currentPassword, values.newPassword)
    } catch (error) {
        if (isAuthError(error) || userStore.token !== submittedToken) {
            return
        }
        const code = getApiErrorCode(error)
        if (code === API_CODE.CURRENT_PASSWORD_INCORRECT) {
            errors.currentPassword = '原密码不正确，请重新输入'
            nextTick(() => focusField('currentPassword'))
        } else if (code === undefined) {
            clearFields()
            needsLogin.value = true
            notice.value = '未能确认密码是否已修改，请使用新密码登录核实。'
        } else {
            notice.value = getApiErrorMessage(error, '修改密码失败，请稍后再试')
        }
        return
    } finally {
        pending.value = false
    }

    if (userStore.token === submittedToken) {
        await finishChange()
    }
}
</script>

<style scoped>
.password-page {
    max-width: 740px;
    margin: 0 auto;
    color: #35405b;
}

.heading, .actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.heading {
    margin: 28px 0 22px;
}

h1, p {
    margin: 0;
}

.heading p, .hint {
    color: #657089;
}

.lock {
    flex: 0 0 46px;
    height: 46px;
    border-radius: 12px;
    background: #eef0ff;
    color: #5864c8;
    font-size: 24px;
}

.card {
    border: 1px solid #dfe5ef;
    border-radius: 12px;
    background: white;
}

.fields, footer {
    padding: clamp(16px, 3vw, 32px);
}

.field + .field {
    margin-top: 20px;
}

.field:first-child {
    border-bottom: 1px solid #edf0f5;
    padding-bottom: 22px;
}

.field label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
}

.eye {
    display: inline-flex;
    align-items: center;
    background: transparent;
    color: #657089;
    border: 0;
    padding: 6px;
    cursor: pointer;
}

.eye:focus-visible {
    outline: 2px solid #5966c8;
}

.hint, .error {
    margin-top: 5px;
    font-size: 13px;
}

.error {
    color: #b33436;
}

.invalid :deep(.el-input__wrapper) {
    box-shadow: inset 0 0 0 1px #b33436;
}

footer {
    border-top: 1px solid #edf0f5;
}

footer p {
    margin-bottom: 10px;
}

.actions {
    justify-content: flex-end;
}

.actions :deep(.el-button + .el-button) {
    margin-left: 0;
}
</style>
