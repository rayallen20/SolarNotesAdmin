<template>
    <section class="book-page">
        <el-breadcrumb separator="/">
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>书籍管理</el-breadcrumb-item>
        </el-breadcrumb>
        <h1>书籍管理</h1>
        <el-card shadow="never">
            <div class="toolbar">
                <AdminFilterSelect label="所属天体" placeholder="请选择天体" :model-value="planetId"
                                   :disabled="writing || drawerOpen || orderDraft !== null || planets.length === 0"
                                   @update:model-value="selectPlanet">
                    <el-option v-for="planet in planets" :key="planet.id" :value="planet.id" :label="getBodyLabel(planet.name)" />
                </AdminFilterSelect>
                <span v-if="planetId !== '' && !reading && readError === ''">
                    显示 {{ visibleCount }} 本 · 隐藏 {{ books.length - visibleCount }} 本
                </span>
            </div>
        </el-card>

        <div v-if="readError !== ''" role="alert" class="notice">
            {{ readError }}
            <el-button :disabled="writing || reading" @click="reload()">重新读取</el-button>
        </div>
        <p v-else-if="reading" role="status">正在读取...</p>
        <el-empty v-else-if="planetId === ''" :description="planets.length ? '请先选择天体' : '暂无已创建的天体'">
            <el-button v-if="planets.length === 0" @click="reload()">刷新天体选项</el-button>
        </el-empty>
        <el-card v-else shadow="never">
            <template #header>
                <div class="toolbar">
                    <h2>{{ planetLabel }}的书籍 <small>共 {{ books.length }} 本</small></h2>
                    <div class="actions">
                        <template v-if="orderDraft === null">
                            <el-button :icon="Refresh" :disabled="writing" @click="reload()">刷新列表</el-button>
                            <el-button :disabled="writing || books.length < 2" @click="beginOrder">调整书序</el-button>
                            <el-button type="primary" :icon="Plus" :disabled="writing" @click="openForm(null)">添加书籍</el-button>
                        </template>
                        <template v-else>
                            <el-button :disabled="writing" @click="orderDraft = null">取消调序</el-button>
                            <el-button type="primary" :loading="writing" :disabled="!orderChanged" @click="saveOrder">保存书序</el-button>
                        </template>
                    </div>
                </div>
            </template>
            <el-table :data="orderDraft === null ? books : orderDraft" row-key="id" stripe
                      empty-text="该天体暂无书籍, 可以添加第一本书">
                <el-table-column label="排序值" min-width="72" align="center">
                    <template #default="scope">{{ orderDraft === null ? scope.row.sort : scope.$index + 1 }}</template>
                </el-table-column>
                <el-table-column prop="title" label="书籍标题" min-width="152" />
                <el-table-column label="显示状态" min-width="88" align="center">
                    <template #default="{ row }">
                        <el-tag :type="row.display_status === 'visible' ? 'success' : 'info'">
                            {{ row.display_status === 'visible' ? '显示' : '隐藏' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column :label="orderDraft === null ? '操作' : '移动'" min-width="96" align="center">
                    <template #default="scope">
                        <el-button v-if="orderDraft === null" link type="primary" :disabled="writing"
                                   :aria-label="'编辑《' + scope.row.title + '》'" @click="openForm(scope.row)">编辑</el-button>
                        <OrderMoveButtons v-else :up-label="'上移《' + scope.row.title + '》'"
                                          :down-label="'下移《' + scope.row.title + '》'"
                                          :disable-up="writing || scope.$index === 0"
                                          :disable-down="writing || scope.$index === orderDraft.length - 1"
                                          @move="move(scope.$index, $event)" />
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-drawer v-model="drawerOpen" :title="original === null ? '添加书籍' : '编辑书籍'"
                   size="min(480px, 100vw)" :close-on-click-modal="false"
                   :close-on-press-escape="!writing && !reading" :show-close="!writing && !reading">
            <el-form label-position="top" :disabled="writing || reading" @submit.prevent="submitForm">
                <el-form-item label="所属天体">{{ planetLabel }}</el-form-item>
                <el-form-item label="书籍标题" :error="titleError">
                    <el-input v-model="form.title" @input="titleError = ''" />
                    <small>最多 {{ BOOK_TITLE_MAX_LENGTH }} 个字符, 首尾空白会自动去除.</small>
                </el-form-item>
                <el-form-item v-if="original === null" label="排序值">
                    {{ books.length + 1 }} (自动追加到末尾)
                </el-form-item>
                <el-form-item label="显示状态">
                    <el-switch v-model="form.display_status" active-value="visible" inactive-value="hidden"
                               aria-label="书籍显示状态" />
                    <span class="status-text">{{ form.display_status === 'visible' ? '显示' : '隐藏' }}</span>
                </el-form-item>
            </el-form>
            <div v-if="reviewEdit" class="notice" role="alert">
                <template v-if="readError !== ''">
                    {{ readError }}
                    <el-button :disabled="reading || writing" @click="recoverEdit()">重新读取原值</el-button>
                </template>
                <template v-else-if="reading">正在读取最新原值...</template>
                <template v-else-if="original">
                    他人已编辑这本书. 当前保存的是《{{ original.title }}》,
                    状态为{{ original.display_status === 'visible' ? '显示' : '隐藏' }}.
                    请核对上面的输入, 再决定是否保存.
                </template>
            </div>
            <template #footer>
                <el-button :disabled="writing || reading" @click="drawerOpen = false">取消</el-button>
                <el-button type="primary" :loading="writing" :disabled="reading || readError !== ''" @click="submitForm">
                    {{ original === null ? '确认添加' : (reviewEdit ? '确认并保存修改' : '保存修改') }}
                </el-button>
            </template>
        </el-drawer>
    </section>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {ElMessage} from 'element-plus'
import {Plus, Refresh} from '@element-plus/icons-vue'
import OrderMoveButtons from '@/components/OrderMoveButtons.vue'
import AdminFilterSelect from '@/components/AdminFilterSelect.vue'
import {getBodyList} from '@/api/body'
import {addBook, getBookOptions, reorderBooks, updateBook} from '@/api/book'
import {API_CODE} from '@/constants/apiCode'
import {BOOK_TITLE_MAX_LENGTH} from '@/constants/book'
import {getApiErrorCode, getApiErrorMessage, isAuthError} from '@/utils/apiError'
import {getBodyLabel} from '@/utils/body'

/** @typedef {import('@/api/book').BookOption} BookOption */
/** @typedef {import('@/constants/book').BookDisplayStatus} BookDisplayStatus */
/** @type {import('vue').Ref<import('@/api/body').BodyRecord[]>} 已创建的天体. */
const planets = ref([])
/** 选中的天体 ID. */
const planetId = ref('')
/** @type {import('vue').Ref<BookOption[]>} 当前天体最近一次成功读取的书单. */
const books = ref([])
/** @type {import('vue').Ref<BookOption[] | null>} 独立排列的行数组, 其中的记录只读. */
const orderDraft = ref(null)
/** @type {import('vue').Ref<BookOption | null>} 编辑基线, 添加时为 null. */
const original = ref(null)
/** @type {{title: string, display_status: BookDisplayStatus}} 供抽屉编辑的副本. */
const form = reactive({title: '', display_status: 'visible'})
/** 编辑快照失效后显示最新原值, 保留表单输入. */
const reviewEdit = ref(false)
/** 抽屉和请求状态. */
const drawerOpen = ref(false)
const reading = ref(false)
const writing = ref(false)
const readError = ref('')
const titleError = ref('')
/** 每次开始读取时作废前一次结果, 包括切回同一天体的情形. */
let readVersion = 0
/** 卸载后忽略进行中的请求结果. */
let active = true

const planetLabel = computed(function () {
    const planet = planets.value.find(function (item) { return item.id === planetId.value })
    return planet === undefined ? '' : getBodyLabel(planet.name)
})
const visibleCount = computed(function () {
    return books.value.filter(function (book) { return book.display_status === 'visible' }).length
})
const orderChanged = computed(function () {
    return orderDraft.value !== null && orderDraft.value.some(function (book, index) {
        return book.id !== books.value[index].id
    })
})

/** 清除已失效的天体及相关草稿, 重新读取天体列表. */
async function recoverPlanet() {
    ElMessage.warning('所选天体已不存在, 请重新选择')
    drawerOpen.value = false
    orderDraft.value = null
    planetId.value = ''
    books.value = []
    planets.value = []
    await reload()
}

/**
 * 按当前选择读天体列表或书单. 写后刷新失败时, 错误区只提供读取操作.
 * @param {string} [failurePrefix] 用于标明之前已经提交的操作.
 * @returns {Promise<boolean>} 读取成功且结果仍属于当前页面.
 */
async function reload(failurePrefix = '') {
    const version = ++readVersion
    const id = planetId.value
    reading.value = true
    readError.value = ''
    try {
        if (id === '') {
            const result = await getBodyList()
            if (version !== readVersion) return false
            planets.value = result
        } else {
            const result = await getBookOptions(id)
            if (version !== readVersion) return false
            books.value = result
        }
        return true
    } catch (error) {
        if (version !== readVersion) return false
        if (isAuthError(error)) {
            readError.value = getApiErrorMessage(error, '请重新登录')
            return false
        }
        if (id !== '' && getApiErrorCode(error) === API_CODE.BOOK_PLANET_NOT_FOUND) {
            await recoverPlanet()
        } else {
            readError.value = failurePrefix + getApiErrorMessage(error, '读取失败, 请重试')
        }
        return false
    } finally {
        if (version === readVersion) reading.value = false
    }
}

/** @param {string} id 新选择的天体 ID. */
function selectPlanet(id) {
    if (writing.value || drawerOpen.value || orderDraft.value !== null) return
    planetId.value = id
    books.value = []
    void reload()
}

/** @param {BookOption | null} book 编辑的书籍, null 表示添加. */
function openForm(book) {
    if (writing.value || reading.value || readError.value !== '') return
    original.value = book
    form.title = book === null ? '' : book.title
    form.display_status = book === null ? 'visible' : book.display_status
    reviewEdit.value = false
    titleError.value = ''
    drawerOpen.value = true
}

/** 重新读取编辑基线. 用户的输入仍保留在 form 中, 等待再次确认. */
async function recoverEdit() {
    reviewEdit.value = true
    if (await reload('读取最新书籍失败. ') === false) return
    const latest = books.value.find(function (item) { return item.id === original.value.id })
    if (latest === undefined) {
        drawerOpen.value = false
        ElMessage.warning('书籍已不存在')
        return
    }
    original.value = latest
}

/** @param {BookOption} book 读取编辑原值, 保留历史标题的首尾空白. */
function fieldsOf(book) {
    return {title: book.title, display_status: book.display_status}
}

/**
 * 根据业务码处理写失败. 网络中断时先读取书单, 避免重复追加.
 * @param {unknown} error 写接口抛出的异常.
 */
async function handleWriteError(error) {
    if (!active || isAuthError(error)) return
    const code = getApiErrorCode(error)
    if (code === API_CODE.BOOK_PLANET_NOT_FOUND) {
        await recoverPlanet()
    } else if (code === API_CODE.BOOK_EDIT_CHANGED) {
        await recoverEdit()
    } else if (code === API_CODE.BOOK_ORDER_CHANGED || code === API_CODE.BOOK_NOT_FOUND || code === undefined) {
        drawerOpen.value = false
        orderDraft.value = null
        const message = code === undefined ? '保存结果待确认, 请核对最新书单' : getApiErrorMessage(error, '书单已变化')
        ElMessage.warning(message)
        await reload(message + '. ')
    } else {
        ElMessage.error(getApiErrorMessage(error, '保存失败'))
    }
}

/** 创建后重读完整书单. 编辑时使用后端返回的书籍摘要. */
async function submitForm() {
    if (!drawerOpen.value || writing.value || reading.value || readError.value !== '') return
    const title = form.title.trim()
    if (title === '' || Array.from(title).length > BOOK_TITLE_MAX_LENGTH) {
        titleError.value = '书籍标题需要 1 至 ' + BOOK_TITLE_MAX_LENGTH + ' 个字符'
        return
    }
    const target = {title, display_status: form.display_status}
    writing.value = true
    try {
        const before = original.value
        if (before === null) {
            await addBook({planet_id: planetId.value, ...target})
            if (!active) return
            drawerOpen.value = false
            ElMessage.success('已添加书籍')
            await reload('书籍已添加, 列表刷新失败. ')
        } else {
            const updated = await updateBook(before.id, fieldsOf(before), target)
            if (!active) return
            drawerOpen.value = false
            ElMessage.success('已保存修改')
            if (updated.sort !== before.sort) {
                await reload('修改已保存, 列表刷新失败. ')
            } else {
                books.value = books.value.map(function (book) { return book.id === updated.id ? updated : book })
            }
        }
    } catch (error) {
        await handleWriteError(error)
    } finally {
        if (active) writing.value = false
    }
}

/** 复制列表顺序. 调序期间锁定读取和编辑入口, 保留 books 作为原始顺序. */
function beginOrder() {
    if (writing.value || reading.value || books.value.length < 2) return
    orderDraft.value = books.value.slice()
}

/**
 * @param {number} index 行下标.
 * @param {number} step 单次移动量.
 */
function move(index, step) {
    const rows = orderDraft.value
    const next = index + step
    if (writing.value || rows === null || next < 0 || next >= rows.length) return
    const item = rows.splice(index, 1)[0]
    rows.splice(next, 0, item)
}

/**
 * @param {BookOption} book 书籍摘要.
 * @returns {string} 后端返回的字符串 ID.
 */
function bookId(book) {
    return book.id
}

/** 一次提交完整快照和目标, 以响应中的完整书单结束调序. */
async function saveOrder() {
    if (writing.value || orderDraft.value === null || !orderChanged.value) return
    writing.value = true
    try {
        const result = await reorderBooks(planetId.value, books.value.map(bookId), orderDraft.value.map(bookId))
        if (!active) return
        orderDraft.value = null
        books.value = result
        ElMessage.success('已保存书序')
    } catch (error) {
        await handleWriteError(error)
    } finally {
        if (active) writing.value = false
    }
}

onMounted(function () { void reload() })
onBeforeUnmount(function () {
    active = false
    readVersion++
})
</script>

<style scoped>
.book-page { display: grid; gap: 16px; min-width: 0; }
h1, h2 { margin: 0; }
h2 { font-size: 18px; }
small { color: var(--el-text-color-secondary); font-weight: normal; }
.toolbar, .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.toolbar { justify-content: space-between; }
.actions .el-button { margin: 0; }
.status-text { margin-inline-start: 6px; }
.notice { border-left: 3px solid var(--el-color-warning); padding: 12px; background: var(--el-fill-color-light); }
</style>
