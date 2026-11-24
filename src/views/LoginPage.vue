<template>
    <main class="login-page">
        <el-card class="login-card">
            <template #header>
                SolarNotes 管理后台登录
            </template>

            <el-form
                ref="loginFormRef"
                :model="loginForm"
                :rules="loginFormRules"
                :disabled="isSubmitting"
                label-position="top"
                @submit.prevent="login"
            >
                <el-form-item label="用户名" prop="username">
                    <el-input
                        v-model="loginForm.username"
                        name="username"
                        autocomplete="username"
                        placeholder="请输入用户名"
                        clearable
                    >
                    </el-input>
                </el-form-item>

                <el-form-item label="密码" prop="password">
                    <el-input
                        v-model="loginForm.password"
                        name="password"
                        type="password"
                        autocomplete="current-password"
                        placeholder="请输入密码"
                        show-password
                    >
                    </el-input>
                </el-form-item>

                <el-form-item>
                    <el-button
                        type="primary"
                        native-type="submit"
                        :loading="isSubmitting"
                        :disabled="isSubmitting"
                        class="login-button"
                    >
                        登录
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </main>
</template>

<script setup>
import {reactive, ref} from "vue";
import {ElMessage} from "element-plus";
import useUserStore from "@/stores/user";
import {isNavigationFailure, useRouter} from "vue-router";
import axios from "axios";
import {loginAdmin} from "@/api/admin";
import {getApiErrorCode, getApiErrorMessage} from "@/utils/apiError";
import {API_CODE} from "@/constants/apiCode";
import {PASSWORD_TEXT_PATTERN, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH} from "@/constants/adminPassword";

defineOptions({
    name: 'LoginPage',
})

/**
 * @typedef {Object} LoginForm 本常量用于表示登录表单数据
 * @property {string} username 用户名,长度为 5-20 个字符
 * @property {string} password 原始密码,长度为 6-20 个字符
 * */

/**
 * 本常量用于表示登录表单中用户输入的用户名和密码,输入内容按输入原值保存
 * @type {LoginForm}
 * */
const loginForm = reactive({
    username: '',
    password: '',
})

/**
 * 本常量用于表示登录表单实例
 * @type {import('vue').Ref<import('element-plus').FormInstance | null>}
 * */
const loginFormRef = ref(null)

/**
 * 本标量用于表示是否正在校验/请求登录/处理成功后的跳转
 * @type {import('vue').Ref<boolean>}
 * */
const isSubmitting = ref(false)

/** @type {import('element-plus').FormRules<LoginForm>} 本常量用于表示表单字段校验规则 */
const loginFormRules = {
    username: [
        {required: true, whitespace: true, message: '请输入用户名', trigger: 'blur'},
        {min: 5, max: 20, message: '用户名长度为 5-20 个字符', trigger: 'blur'},
    ],
    password: [
        {required: true, pattern: PASSWORD_TEXT_PATTERN, message: '请输入密码', trigger: 'blur'},
        {
            min: PASSWORD_MIN_LENGTH,
            max: PASSWORD_MAX_LENGTH,
            message: `密码长度为 ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} 个字符`,
            trigger: 'blur',
        },
    ],
}

/**
 * 用户Store实例
 * */
const userStore = /** @type {import('@/stores/user').UserStore} */ (useUserStore())

/**
 * 路由实例
 * @type {import('vue-router').Router}
 * */
const router = useRouter()

/**
 * 本函数用于校验并提交登录凭据,成功后保存会话并进入天体管理
 * @returns {Promise<void>} 本次登录处理结束
 * */
async function login() {
    if (isSubmitting.value === true || loginFormRef.value === null) {
        return
    }

    isSubmitting.value = true

    try {
        /** @type {boolean} 本标量用于表示表单校验是否通过 */
        const isValid = await loginFormRef.value.validate()

        if (isValid === false) {
            isSubmitting.value = false
            return
        }
    } catch {
        // 校验错误由表单项显示,恢复按钮后允许用户修改输入
        isSubmitting.value = false
        return
    }

    /** @type {import('@/api/admin').LoginAdmin} 本变量用于表示成功响应中的管理员信息 */
    let admin

    try {
        admin = await loginAdmin(loginForm.username, loginForm.password)
    } catch (error) {
        isSubmitting.value = false
        ElMessage.error(getLoginErrorMessage(error))
        return
    }

    try {
        await onLoginSuccess(admin.access_token, admin.username)
        ElMessage.success('登录成功')
    } catch {
        ElMessage.error('登录后的页面未能打开,请刷新页面后重试')
    } finally {
        isSubmitting.value = false
    }
}

/**
 * 本函数用于解释登录专属业务错误(其他异常交给公共模块)
 * @param {unknown} error 登录请求抛出的异常
 * @returns {string} 登录页可展示的错误说明
 * */
function getLoginErrorMessage(error) {
    switch (getApiErrorCode(error)) {
        case API_CODE.VALIDATION_ERROR:
            return '登录信息格式不正确,请检查用户名和密码'
        case API_CODE.LOGIN_CREDENTIAL_ERROR:
            return '账号或密码错误'
        case API_CODE.LOGIN_STATE_CHANGED:
            return '账号状态已变化,请重新登录'
        case API_CODE.LOGIN_RATE_LIMIT:
            return '请求过于频繁,请稍后再试'
    }
    return getApiErrorMessage(error, '登录失败,请稍后重试')
}

/**
 * 本函数用于清空表单中的密码,保存服务端返回的会话并进入天体管理
 * @param {string} token 服务端返回的 access_token
 * @param {string} username 服务端返回的管理员用户名
 * @returns {Promise<void>} 会话保存及页面跳转完成
 * @throws {Error} 会话保存或路由跳转失败时抛出
 * */
async function onLoginSuccess(token, username) {
    loginForm.password = ''
    userStore.setSession(token, username)

    /** @type {void | import('vue-router').NavigationFailure} 路由跳转的结果 */
    const failure = await router.replace({name: 'bodyList'})

    if (isNavigationFailure(failure) === true) {
        throw new Error('未能进入天体管理页面')
    }
}
</script>

<style scoped>
.login-page {
    display: grid;
    place-items: center;
    min-height: 100vh;
}

.login-card {
    width: 360px;
    max-width: calc(100vw - 32px);
}
</style>
