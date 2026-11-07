<template>
    <main class="login-page">
        <el-card class="login-card">
            <template #header>
                SolarNotes 管理后台登录
            </template>

            <el-form :model="loginForm" label-width="60px">
                <el-form-item label="用户名">
                    <el-input v-model="loginForm.username" placeholder="请输入用户名">
                    </el-input>
                </el-form-item>

                <el-form-item label="密码">
                    <el-input
                        v-model="loginForm.password"
                        type="password"
                        placeholder="请输入密码"
                        show-password
                        @keyup.enter="login"
                    >
                    </el-input>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="login">
                        登录
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </main>
</template>

<script setup>
import {ref} from "vue";
import {ElMessage} from "element-plus";
import useUserStore from "@/stores/user";
import {useRouter} from "vue-router";

/**
 * 本常量表示登录表单中用户输入的用户名和密码
 * @type {import('vue').Ref<{username: string, password: string}>}
 * */
const loginForm = ref({
    username: "",
    password: "",
})

/**
 * 用户Store实例
 * */
const userStore = /** @type {import('@/stores/user').UserStore} */ (useUserStore())

/**
 * 路由实例
 * @type {import('vue-router').Router}
 */
const router = useRouter()

/**
 * 本函数用于处理登录请求
 * */
function login() {
    ElMessage.info("当前为登录占位页, 后续接入登录API")
}

/**
 * 本函数用于将登录API响应的token和用户名保存至本地存储
 * @param {string} token 服务端发放的token
 * @param {string} username 用户名
 * @returns {Promise<void>}
 * @throws {TypeError} 参数类型不为string时抛出此异常
 * */
async function onLoginSuccess(token, username) {
    userStore.setSession(token, username)
    await router.replace({name: "bodyList"})
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
