import {createRouter, createWebHistory} from "vue-router";
import useUserStore from "@/stores/user";
import pinia from "@/stores";

/**
 * 路由列表
 * @type {import('vue-router').RouteRecordRaw[]}
 * */
const routes = [
    {
        path: '/',
        redirect: '/admin',
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/LoginPage.vue')
    },
    {
        path: '/admin',
        component: () => import('@/views/LayoutPage.vue'),
        redirect: {
            name: 'bodyList'
        },
        meta: {
            requiresAuth: true,
        },
        children: [
            {
                path: 'bodies',
                name: 'bodyList',
                component: () => import('@/views/BodyListPage.vue'),
                meta: {
                    title: '天体管理',
                    description: '管理太阳与八大行星的简介信息',
                },
            },
            {
                path: 'books',
                name: 'bookList',
                component: () => import('@/views/BookListPage.vue'),
                meta: {
                    title: '书籍管理',
                    description: '管理书籍/所属天体/排序/显示状态'
                },
            },
            {
                path: 'catalogues',
                name: 'catalogueList',
                component: () => import('@/views/CataloguePage.vue'),
                meta: {
                    title: '目录管理',
                    description: '编排书籍目录并预览文章',
                },
            },
            {
                path: 'account/password',
                name: 'changePassword',
                component: () => import('@/views/ChangePasswordPage.vue'),
                meta: {
                    title: '修改密码',
                },
            },
            {
                path: 'notes',
                name: 'noteList',
                component: () => import('@/views/PlaceholderPage.vue'),
                meta: {
                    title: '笔记管理',
                    description: '查看和管理笔记内容',
                },
            },
        ],
    }
]

/**
 * 路由配置
 * @type {import('vue-router').RouterOptions}
 * */
const option = {
    routes,
    history: createWebHistory(import.meta.env.BASE_URL),
}

/**
 * 路由实例
 * @type {import('vue-router').Router}
 * */
const router = createRouter(option)

/**
 * 本函数用于在访问后台页面前检查本地是否持有令牌
 * @param {import('vue-router').RouteLocationNormalized} to 即将进入的路由
 * @returns {true | import('vue-router').RouteLocationRaw} 允许继续或返回登录页地址
 * */
function checkLogin(to) {
    /** 当前 Pinia 实例中的用户 Store,在组件外显式传入 pinia */
    const userStore = /** @type {import('@/stores/user').UserStore} */ (useUserStore(pinia))

    if (to.meta.requiresAuth === true && userStore.token === '') {
        return {
            name: 'login',
            replace: true,
        }
    }

    return true
}

router.beforeEach(checkLogin)

export default router
