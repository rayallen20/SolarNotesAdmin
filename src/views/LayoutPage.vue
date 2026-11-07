<template>
    <el-container class="layout-page">
        <!-- 左侧菜单栏部分开始 -->
        <el-aside class="layout-sidebar">
            <RouterLink
                class="brand"
                :to="{name: 'bodyList'}"
                aria-label="SolarNotes 天体管理"
            >
                <el-icon class="brand-icon">
                    <Sunny></Sunny>
                </el-icon>

                <span class="brand-name">SolarNotes 管理后台</span>
            </RouterLink>

            <nav aria-label="后台导航">
                <el-menu
                    router
                    :default-active="activeMenuPath"
                    background-color="#2D3A4B"
                    text-color="#AEB8C7"
                    active-text-color="#FFFFFF"
                    class="sidebar-menu"
                >
                    <el-menu-item
                        :index="getMenuPath('bodyList')"
                        title="天体管理"
                        aria-label="天体管理"
                    >
                        <el-icon>
                            <BodyIcon></BodyIcon>
                        </el-icon>
                        <span>天体管理</span>
                    </el-menu-item>

                    <el-menu-item
                        :index="getMenuPath('userList')"
                        title="用户管理"
                        aria-label="用户管理"
                    >
                        <el-icon>
                            <User></User>
                        </el-icon>
                        <span>用户管理</span>
                    </el-menu-item>

                    <el-menu-item
                        :index="getMenuPath('noteList')"
                        title="笔记管理"
                        aria-label="笔记管理"
                    >
                        <el-icon><Document></Document></el-icon>
                        <span>笔记管理</span>
                    </el-menu-item>
                </el-menu>
            </nav>
        </el-aside>
        <!-- 左侧菜单栏部分结束 -->

        <!-- 右侧用户栏与页面内容部分开始 -->
        <el-container direction="vertical" class="layout-workspace">
            <el-header class="layout-header">
                <span class="current-page">{{pageTitle}}</span>

                <div class="user-area">
                    <el-avatar :size="32">
                        <el-icon>
                            <User></User>
                        </el-icon>
                    </el-avatar>

                    <span class="username"> {{username}}</span>

                    <el-popconfirm
                        title="确认退出登录吗?"
                        confirm-button-text="确认"
                        cancel-button-text="取消"
                        :width="220"
                        @confirm="logout"
                    >
                        <template #reference>
                            <el-button
                                text
                                class="logout-button"
                                aria-label="退出登录"
                            >
                                <el-icon><SwitchButton></SwitchButton></el-icon>

                                <span class="logout-label">退出登录</span>
                            </el-button>
                        </template>
                    </el-popconfirm>
                </div>
            </el-header>

            <el-main class="layout-main">
                <!-- 随二级路由切换区域 -->
                <RouterView></RouterView>
            </el-main>
        </el-container>
        <!-- 右侧用户栏与页面内容部分结束 -->
    </el-container>
</template>

<script setup>
import {Document, Sunny, SwitchButton, User} from "@element-plus/icons-vue";
import {useRoute, useRouter} from "vue-router";
import useUserStore from "@/stores/user";
import {computed} from "vue";
import BodyIcon from "@/components/BodyIcon.vue";

defineOptions({
    name: 'LayoutPage',
})

/**
 * 当前路由信息
 * @type {import('vue-router').RouteLocationNormalizedLoaded}
 * */
const route = useRoute()

/**
 * 路由实例 用于退出登录后控制地址返回首页
 * @type {import('vue-router').Router}
 * */
const router = useRouter()

/**
 * 用户状态管理实例
 * */
const userStore = /** @type {import('@/stores/user').UserStore} */ (useUserStore())

/**
 * 当前页面的标题
 * @type {import('vue').ComputedRef<string>}
 * */
const pageTitle = computed(getPageTitle)

/**
 * 当前用户的用户名
 * @type {import('vue').ComputedRef<string>}
 */
const username = computed(getUsername)

/**
 * 当前选中菜单的规范路径
 * @type {import('vue').ComputedRef<string>}
 */
const activeMenuPath = computed(getActiveMenuPath)

/**
 * 本函数用于获取页面标题
 * @returns {string} 当前页面的标题
 */
function getPageTitle() {
    if (typeof route.meta.title === 'string') {
        return route.meta.title
    }

    return '管理后台'
}

/**
 * 本函数用于获取当前用户名
 * @returns {string} 当前用户的用户名
 * */
function getUsername() {
    if (userStore.username !== '') {
        return userStore.username
    }

    return '预览用户'
}

/**
 * 本函数用于根据给定的路由名称获取该路由对应的path
 * @param {string} routeName
 * @returns {string} 对应路由的path
 * @throws {Error} 若路由名称不存在或缺少必填路径参数时抛出此异常
 * */
function getMenuPath(routeName) {
    return router.resolve({name: routeName}).path
}

/**
 * 本函数用于根据当前路由名称获取当前应被高亮显示的菜单路径
 * @returns {string} 当前应被高亮显示的路由路径
 * */
function getActiveMenuPath() {
    if (typeof route.name === 'string') {
        return getMenuPath(route.name)
    }

    return ''
}

/**
 * 本函数用于清空本地存储中的用户信息并跳转到登录页
 * @returns {Promise<void>}
 * */
async function logout() {
    userStore.clearSession()
    await router.replace({name: 'login'})
}
</script>

<style scoped lang="scss">
.layout-page {
    height: 100vh; // 兼容不支持dvh的浏览器
    height: 100dvh; // 若浏览器支持则使用动态视口高度
    overflow: hidden;
}

.layout-sidebar {
    width: 240px;
    background: #2d3a4b;
}

.brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 60px;
    color: #ffffff;
    text-decoration: none;
    white-space: nowrap;
}

.brand-icon {
    color: #a9afff;
    font-size: 24px;
}

.brand-name {
    font-size: 17px;
    font-weight: 600;
}

.sidebar-menu {
    margin-top: 16px;
    border-right: none;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
    background-color: #727cf5;
}

.layout-workspace {
    min-width: 0;
    min-height: 0;
}

.layout-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    height: 60px;
    padding: 0 24px;
    border-bottom: 1px solid #edf0f5;
    background: #ffffff;
}

.current-page {
    overflow: hidden;
    color: #35405b;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-area {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 12px;
    color: #657089;
}

.user-area :deep(.el-avatar) {
    background: #727cf5;
}

.username {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.logout-button {
    color: #657089;
}

.logout-label {
    margin-left: 6px;
}

.layout-main {
    min-height: 0;
    padding: 24px;
    overflow: auto;
    background: #fafbfe;
}

@media (max-width: 767px) {
    .layout-sidebar {
        width: 72px;
    }

    .brand-name,
    .username,
    .logout-label {
        display: none;
    }

    .sidebar-menu :deep(.el-menu-item) {
        justify-content: center;
        padding: 0 !important;
    }

    .sidebar-menu :deep(.el-menu-item > span) {
        display: none;
    }

    .sidebar-menu :deep(.el-menu-item .el-icon) {
        margin-right: 0;
    }

    .layout-header {
        padding: 0 16px;
    }

    .layout-main {
        padding: 16px;
    }
}
</style>