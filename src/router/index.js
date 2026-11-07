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
            name: 'bodyList'
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