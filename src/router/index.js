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
        component: () => import('@/views/LoginPage.vue')
    },
    {
        path: '/admin',
        component: () => import('@/views/LayoutPage.vue'),
        redirect: {
            name: 'dashboard'
        },
        children: [
            {
                path: 'dashboard',
                name: 'dashboard',
                component: () => import('@/views/PlaceholderPage.vue'),
                meta: {
                    title: '工作台',
                    description: '查看后台概况与常用功能'
                },
            },
            {
                path: 'users',
                name: 'userList',
                component: () => import('@/views/PlaceholderPage.vue'),
                meta: {
                    title: '用户管理',
                    description: '查看与管理用户信息'
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

export default router