<template>
    <el-dialog
        :model-value="modelValue"
        :title="title"
        width="min(860px, 94vw)"
        append-to-body
        @update:model-value="emit('update:modelValue', $event)"
    >
        <p v-if="loading" role="status">正在读取正文...</p>
        <div v-else-if="errorText !== ''" role="alert">
            <p>{{ errorText }}</p>
            <el-button @click="loadPreview">重新读取</el-button>
        </div>
        <article v-else-if="html !== ''" class="markdown" v-html="html"></article>
        <el-empty v-else description="这篇文章暂无正文" />
    </el-dialog>
</template>

<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {marked} from 'marked'
import DOMPurify from 'dompurify'
import {getArticlePreview} from '@/api/catalogue'
import {API_CODE} from '@/constants/apiCode'
import {getApiErrorCode, getApiErrorMessage, isAuthError} from '@/utils/apiError'

/** @typedef {import('@/api/catalogue').CatalogueNode} CatalogueNode */
const props = defineProps({
    modelValue: {type: Boolean, required: true},
    node: {type: /** @type {import('vue').PropType<CatalogueNode>} */ (Object), default: null},
})
const emit = defineEmits(['update:modelValue', 'lost'])

/** 只展示本次打开时请求的正文. */
const loading = ref(false)
const html = ref('')
const errorText = ref('')
const articleTitle = ref('')
let requestNumber = 0

const title = computed(function () {
    if (articleTitle.value !== '') return articleTitle.value
    if (props.node !== null) return props.node.name
    return 'Markdown 预览'
})

/** 打开文件或点击重试时读取正文. 已关闭或已切换文件的响应会被丢弃. */
async function loadPreview() {
    const number = ++requestNumber
    const node = props.node
    html.value = ''
    errorText.value = ''
    articleTitle.value = ''
    loading.value = false
    if (!props.modelValue || node === null || node.type !== 'file') return

    loading.value = true
    try {
        const article = await getArticlePreview(node.id)
        if (number !== requestNumber) return
        articleTitle.value = article.title
        const rendered = marked.parse(article.content, {async: false, gfm: true})
        html.value = DOMPurify.sanitize(rendered, {USE_PROFILES: {html: true}})
    } catch (error) {
        if (number !== requestNumber || isAuthError(error)) return
        const code = getApiErrorCode(error)
        if (code === API_CODE.CATALOGUE_NOT_FOUND) {
            errorText.value = '该目录节点已删除'
            emit('lost')
        } else if (code === API_CODE.ARTICLE_PREVIEW_UNAVAILABLE) {
            errorText.value = '该节点的 Markdown 正文暂时无法预览'
        } else {
            errorText.value = getApiErrorMessage(error, '读取文章失败')
        }
    } finally {
        if (number === requestNumber) loading.value = false
    }
}

watch([() => props.modelValue, () => props.node?.id], loadPreview, {immediate: true})
onBeforeUnmount(function () { requestNumber++ })
</script>

<style scoped>
.markdown { line-height: 1.75; overflow-wrap: anywhere; }
.markdown :deep(img) { max-width: 100%; height: auto; }
.markdown :deep(pre), .markdown :deep(table) { display: block; overflow-x: auto; }
.markdown :deep(pre) { padding: 14px; background: #f4f6fa; }
</style>
