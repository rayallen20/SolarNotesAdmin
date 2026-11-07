<template>
    <section class="placeholder-page">
        <h1>{{pageTitle}}</h1>

        <p class="page-description">{{pageDescription}}</p>

        <el-card shadow="never">
            <el-empty :description="pageTitle + '内容待完善'"></el-empty>
        </el-card>
    </section>
</template>

<script setup>
import {useRoute} from "vue-router";
import {computed} from "vue";

defineOptions({
    name: 'PlaceholderPage',
})

/**
 * 当前路由信息
 * @type {import('vue-router').RouteLocationNormalizedLoaded}
 * */
const route = useRoute()

/**
 * 当前页面的标题
 * @type {import('vue').ComputedRef<string>}
 * */
const pageTitle = computed(getPageTitle)

/**
 * 当前页面的说明文案
 * @type {import('vue').ComputedRef<string>}
 * */
const pageDescription = computed(getPageDescription)

/**
 * 本函数用于获取页面标题
 * @returns {string} 当前页面的标题
 */
function getPageTitle() {
    if (typeof route.meta.title === 'string') {
        return route.meta.title
    }

    return '管理页面'
}

/**
 * 本函数用于获取页面说明文案
 * @returns {string} 当前页面的说明文案
 * */
function getPageDescription() {
    if (typeof route.meta.description === 'string') {
        return route.meta.description
    }

    return '请选择左侧菜单'
}
</script>

<style scoped>
.placeholder-page h1 {
    margin: 0 0 8px;
    color: #35405b;
    font-size: 24px;
    font-weight: 600;
}

.page-description {
    margin: 0 0 24px;
    color: #657089;
    line-height: 1.6;
}

.placeholder-page :deep(.el-card) {
    border-color: #e8ecf3;
    border-radius: 8px;
}
</style>