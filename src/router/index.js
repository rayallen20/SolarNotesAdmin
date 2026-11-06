import {createRouter, createWebHistory} from "vue-router";

/**
 * 路由列表
 * @type {import('vue-router').RouteRecordRaw[]}
 * */
const routes = [
    {
        path: '/',
        redirect: '/login',
    },
    {
        path: '/login',
        name: 'login',
        /**
         * @returns {Promise<{default: import('vue').Component}>} 登录页面
         * */
        component: () => import('@/views/LoginPage.vue')
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

export default router