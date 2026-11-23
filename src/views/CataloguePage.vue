<template>
    <section class="catalogue-page">
        <el-breadcrumb separator="/">
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>目录管理</el-breadcrumb-item>
        </el-breadcrumb>
        <div class="toolbar">
            <h1>目录管理</h1>
            <el-button :disabled="reading || writing" @click="retryRead">刷新数据</el-button>
        </div>
        <el-card shadow="never">
            <div class="filters">
                <label>天体
                    <select :value="planetId" :disabled="writing || planets.length === 0"
                            @change="selectPlanet($event.target.value)">
                        <option value="">请选择天体</option>
                        <option v-for="planet in planets" :key="planet.id" :value="planet.id">
                            {{ getBodyLabel(planet.name) }}
                        </option>
                    </select>
                </label>
                <label>书籍
                    <select :value="bookId" :disabled="writing || books.length === 0"
                            @change="selectBook($event.target.value)">
                        <option value="">请选择书籍</option>
                        <option v-for="item in books" :key="item.id" :value="item.id">{{ item.title }}</option>
                    </select>
                </label>
                <div v-if="selectedBook">
                    书籍状态
                    <el-tag :type="selectedBook.display_status === 'visible' ? 'success' : 'info'">
                        {{ selectedBook.display_status === 'visible' ? '显示' : '隐藏' }}
                    </el-tag>
                </div>
                <div v-if="book && readError === ''" class="progress">
                    <label>全书排序进度 {{ sortedCount }} / {{ nonRootCount }}
                        <progress :value="sortedCount" :max="Math.max(1, nonRootCount)"></progress>
                    </label>
                </div>
            </div>
        </el-card>

        <div v-if="readError !== ''" role="alert" class="notice">
            {{ readError }}
            <el-button @click="retryRead" :disabled="reading || writing">重新读取</el-button>
        </div>
        <p v-else-if="reading" role="status">正在读取...</p>
        <el-empty v-else-if="book === null" :description="selectionHint" />
        <el-empty v-else-if="folder === null" description="这本书尚未导入目录" />

        <div v-else class="panels">
            <el-card shadow="never">
                <div class="toolbar">
                    <h2>目录树</h2>
                    <el-button link type="primary" :disabled="expandableIds.length === 0"
                               @click="toggleAll">{{ allOpen ? '收起全部' : '展开全部' }}</el-button>
                </div>
                <p>全书 {{ index.size }} 个节点</p>
                <ul aria-label="目录树" class="tree">
                    <li v-for="entry in visibleRows" :key="entry.node.id"
                        :style="{ paddingInlineStart: (entry.depth * 14) + 'px' }"
                        :class="{ selected: entry.node.id === (fileId || folderId) }">
                        <button v-if="entry.node.children.length > 0" type="button" class="arrow"
                                :aria-expanded="expanded.has(entry.node.id)"
                                :aria-label="(expanded.has(entry.node.id) ? '收起' : '展开') + entry.node.name"
                                @click="toggleFolder(entry.node.id)">
                            {{ expanded.has(entry.node.id) ? '▾' : '▸' }}
                        </button>
                        <span v-else class="arrow"></span>
                        <button class="node" type="button" @click="openNode(entry.node)"
                                :aria-current="entry.node.id === (fileId || folderId) ? 'true' : undefined">
                            <el-icon><component :is="entry.node.type === 'folder' ? Folder : Document" /></el-icon>
                            {{ entry.node.name }}
                        </button>
                        <span class="dot" :class="{ ranked: entry.node.sort !== null }"
                              role="img" :aria-label="entry.node.sort === null ? '待排序' : '已排序'"></span>
                    </li>
                </ul>
                <small>绿色 · 已排序　橙色 · 待排序</small>
            </el-card>

            <el-card shadow="never">
                <nav class="path" aria-label="当前目录路径">
                    <el-button v-for="item in currentPath" :key="item.id" link @click="openNode(item)">
                        {{ item.parent_id === '0' ? '书籍根目录' : item.name }}
                    </el-button>
                </nav>
                <div class="toolbar">
                    <h2>{{ folder.name }}</h2>
                    <el-button type="primary" :disabled="writing || folder.children.length === 0"
                               @click="openOrder('')">编排本级</el-button>
                </div>
                <p>本级 {{ folder.children.length }} 项 · 已排序 {{ rankedChildren }} 项 · 待排序 {{ folder.children.length - rankedChildren }} 项</p>
                <div class="current">
                    {{ folder.parent_id === '0' ? '根节点' : '当前目录' }} ·
                    {{ folder.sort === null ? '待排序' : '序号 ' + folder.sort }}
                    <el-switch :model-value="folder.display_status === 'visible'" :aria-label="folder.name + '的显示状态'"
                               active-text="显示" inactive-text="隐藏" :disabled="writing || folder.sort === null"
                               @change="changeDisplay(folder, $event)" />
                </div>
                <!-- 右表只列直接子项. 将树表子节点键指向此 DTO 未使用的名称. -->
                <el-table :data="folder.children" row-key="id" :tree-props="{ children: 'tableChildren' }"
                          empty-text="该目录没有子节点">
                    <el-table-column label="节点名称" min-width="190">
                        <template #default="{ row }">
                            <el-button link type="primary" class="name" @click="openNode(row)">
                                <el-icon><component :is="row.type === 'folder' ? Folder : Document" /></el-icon>
                                {{ row.name }}
                            </el-button>
                        </template>
                    </el-table-column>
                    <el-table-column label="同级序号" width="86">
                        <template #default="{ row }">{{ row.sort === null ? '待排序' : row.sort }}</template>
                    </el-table-column>
                    <el-table-column label="显示状态" width="106">
                        <template #default="{ row }">
                            <el-switch :model-value="row.display_status === 'visible'"
                                       :aria-label="row.name + '的显示状态'" :disabled="writing || row.sort === null"
                                       @change="changeDisplay(row, $event)" />
                            {{ row.display_status === 'visible' ? '显示' : '隐藏' }}
                        </template>
                    </el-table-column>
                    <el-table-column label="排序操作" width="98">
                        <template #default="{ row }">
                            <el-button link type="primary" :disabled="writing" @click="openOrder(row.id)">
                                {{ row.sort === null ? '编入顺序' : '调整顺序' }}
                            </el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <p><small>隐藏可见目录会同时隐藏全部下级, 后代的序号保留. 重新显示时仅显示该目录.</small></p>
            </el-card>
        </div>
        <CatalogueOrderDrawer v-model="orderOpen" :parent="folder" :busy="writing" :candidate-id="candidateId"
                              @save="saveOrder" />
        <ArticlePreviewDialog v-model="previewOpen" :node="previewNode" @lost="loadTree" />
    </section>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {ElMessage} from 'element-plus'
import {Document, Folder} from '@element-plus/icons-vue'
import {getBodyList} from '@/api/body'
import {getBodyLabel} from '@/utils/body'
import {getBookOptions, getCatalogueTree, saveCatalogueOrder, setCatalogueDisplay} from '@/api/catalogue'
import {API_CODE} from '@/constants/apiCode'
import {getApiErrorCode, getApiErrorMessage, isAuthError} from '@/utils/apiError'
import CatalogueOrderDrawer from '@/components/CatalogueOrderDrawer.vue'
import ArticlePreviewDialog from '@/components/ArticlePreviewDialog.vue'

/** @typedef {import('@/api/catalogue').CatalogueNode} CatalogueNode */
/** @type {import('vue').Ref<import('@/api/body').BodyRecord[]>} 天体选项. */
const planets = ref([])
/** @type {import('vue').Ref<import('@/api/catalogue').BookOption[]>} 所选天体的书籍. */
const books = ref([])
/** @type {import('vue').Ref<import('@/api/catalogue').CatalogueBook | null>} 当前已读取的书和目录树. */
const book = ref(null)
const planetId = ref('')
const bookId = ref('')
const folderId = ref('')
const fileId = ref('')
const expanded = ref(new Set())
const readError = ref('')
const reading = ref(false)
const writing = ref(false)
const orderOpen = ref(false)
const candidateId = ref('')
const previewOpen = ref(false)
/** 最近一次读取的编号. 切换选项及离开页面时, 作废较早的响应. */
let readVersion = 0
let active = true

/** @returns {Map<string, CatalogueNode>} 便于按 ID 恢复选择及获取父节点. */
function indexTree() {
    const result = new Map()
    const stack = book.value === null ? [] : [...book.value.catalogues]
    while (stack.length > 0) {
        const node = stack.pop()
        result.set(node.id, node)
        for (const child of node.children) stack.push(child)
    }
    return result
}
const index = computed(indexTree)
const folder = computed(() => index.value.get(folderId.value) || null)
const previewNode = computed(() => index.value.get(fileId.value) || null)
const selectedBook = computed(() => book.value || books.value.find(item => item.id === bookId.value))
const nonRootCount = computed(() => [...index.value.values()].filter(node => node.parent_id !== '0').length)
const sortedCount = computed(() => [...index.value.values()].filter(node => node.parent_id !== '0' && node.sort !== null).length)
const rankedChildren = computed(() => folder.value === null ? 0 : folder.value.children.filter(node => node.sort !== null).length)
const expandableIds = computed(() => [...index.value.values()].filter(node => node.children.length > 0).map(node => node.id))
const allOpen = computed(() => expandableIds.value.length > 0 && expandableIds.value.every(id => expanded.value.has(id)))
const selectionHint = computed(function () {
    if (planets.value.length === 0) return '暂无已创建的天体'
    if (planetId.value === '') return '请先选择天体'
    if (books.value.length === 0) return '该天体暂无书籍'
    return '请选择书籍'
})

/**
 * @param {CatalogueNode | null} node 路径终点.
 * @returns {CatalogueNode[]} 从根到终点的路径.
 */
function pathTo(node) {
    const path = []
    while (node) {
        path.push(node)
        node = index.value.get(node.parent_id)
    }
    return path.reverse()
}
const currentPath = computed(() => pathTo(folder.value))
/** 按后端给定的顺序生成可见行. 展开状态与节点的显示开关相互独立. */
const visibleRows = computed(function () {
    const rows = []
    function visit(node, depth) {
        rows.push({node, depth})
        if (expanded.value.has(node.id)) {
            for (const child of node.children) visit(child, depth + 1)
        }
    }
    if (book.value !== null) {
        for (const root of book.value.catalogues) visit(root, 0)
    }
    return rows
})

/** @param {string} id 手动展开或收起的节点. */
function toggleFolder(id) {
    if (expanded.value.has(id)) expanded.value.delete(id)
    else expanded.value.add(id)
}
/** 展开或收起全部有子项的节点. */
function toggleAll() {
    expanded.value = new Set(allOpen.value ? [] : expandableIds.value)
}
/** @param {CatalogueNode} node 选中的目录或待预览的文件. */
function openNode(node) {
    if (writing.value) return
    const isFile = node.type === 'file'
    fileId.value = isFile ? node.id : ''
    folderId.value = isFile ? node.parent_id : node.id
    for (const parent of currentPath.value) expanded.value.add(parent.id)
    previewOpen.value = isFile
}

/** 丢弃上一棵树的视图状态. 请求版本号由发起新读取的调用方维护. */
function clearBook() {
    book.value = null
    bookId.value = ''
    folderId.value = ''
    fileId.value = ''
    expanded.value = new Set()
    orderOpen.value = false
    previewOpen.value = false
}
/** 开始一次可作废的读取. */
function startRead() {
    readError.value = ''
    reading.value = true
    return ++readVersion
}
/** @param {number} version 此次读取编号. */
function finishRead(version) {
    if (version === readVersion) reading.value = false
}
/** 获取天体选项. */
async function loadPlanets() {
    const version = startRead()
    clearBook()
    planets.value = []
    planetId.value = ''
    books.value = []
    try {
        const result = await getBodyList()
        if (version === readVersion) planets.value = result
    } catch (error) {
        if (version === readVersion && !isAuthError(error)) readError.value = getApiErrorMessage(error, '读取天体失败')
    } finally {
        finishRead(version)
    }
}
/** @param {string} id 新选择的天体, 空串清空选择. */
async function selectPlanet(id) {
    const version = startRead()
    planetId.value = id
    books.value = []
    clearBook()
    try {
        if (id === '') return
        const result = await getBookOptions(id)
        if (version === readVersion) books.value = result
    } catch (error) {
        if (version !== readVersion || isAuthError(error)) return
        if (getApiErrorCode(error) === API_CODE.BOOK_PLANET_NOT_FOUND) {
            ElMessage.warning('所选天体已不存在, 请重新选择')
            await loadPlanets()
        } else {
            readError.value = getApiErrorMessage(error, '读取书籍选项失败')
        }
    } finally {
        finishRead(version)
    }
}
/** @param {string} id 书籍 ID, 保持为字符串. */
function selectBook(id) {
    ++readVersion
    clearBook()
    reading.value = false
    readError.value = ''
    bookId.value = id
    if (id !== '') loadTree()
}
/** 重读权威目录树, 尽量恢复选中的目录和展开位置. */
async function loadTree() {
    const id = bookId.value
    if (id === '') return
    const version = startRead()
    const previousPath = currentPath.value.map(node => node.id).reverse()
    const hadTree = book.value !== null && book.value.catalogues.length > 0
    try {
        const result = await getCatalogueTree(id)
        if (version !== readVersion) return
        book.value = result
        const root = result.catalogues[0]
        expanded.value = hadTree
            ? new Set([...expanded.value].filter(key => index.value.has(key)))
            : new Set(root ? [root.id] : [])
        const nearest = previousPath.find(key => index.value.get(key)?.type === 'folder')
        folderId.value = nearest || (root ? root.id : '')
        if (!index.value.has(fileId.value)) {
            fileId.value = ''
            previewOpen.value = false
        }
    } catch (error) {
        if (version !== readVersion || isAuthError(error)) return
        if (getApiErrorCode(error) === API_CODE.BOOK_NOT_FOUND) {
            ElMessage.warning('书籍已不存在, 请重新选择')
            await selectPlanet(planetId.value)
        } else {
            readError.value = getApiErrorMessage(error, '目录读取失败, 请重新读取')
        }
    } finally {
        finishRead(version)
    }
}
/** 按当前选择重试失败的读取. */
function retryRead() {
    if (bookId.value !== '') return loadTree()
    if (planetId.value !== '') return selectPlanet(planetId.value)
    return loadPlanets()
}
/** @param {string} id 表格行的 ID, 从标题进入时使用空串. */
function openOrder(id) {
    if (writing.value || reading.value || folder.value === null) return
    candidateId.value = id
    orderOpen.value = true
}

/** 在单次写入结束前锁定上下文. 排序或隐藏成功后重新读取整棵树.
 * @param {() => Promise<void>} send 发出一次写请求.
 * @param {boolean} isOrder 是否从排序抽屉提交.
 * @param {CatalogueNode} [shownNode] 仅显示此节点时可直接更新开关.
 */
async function writeChange(send, isOrder, shownNode) {
    if (writing.value || reading.value || readError.value !== '') return
    writing.value = true
    try {
        await send()
        if (!active) return
        if (isOrder) orderOpen.value = false
        if (shownNode) shownNode.display_status = 'visible'
        else await loadTree()
    } catch (error) {
        if (!active || isAuthError(error)) return
        const code = getApiErrorCode(error)
        if (code === API_CODE.VALIDATION_ERROR) {
            ElMessage.error(getApiErrorMessage(error, '请核对提交内容'))
            return
        }
        orderOpen.value = false
        if (code === API_CODE.CATALOGUE_ORDER_CHANGED) ElMessage.warning('同级目录已变化, 请核对新顺序后重新编排')
        else if (code === API_CODE.CATALOGUE_SORT_REQUIRED) ElMessage.warning('请先为该节点排序')
        else if (code === API_CODE.CATALOGUE_NOT_FOUND) ElMessage.warning('节点已不存在, 正在刷新目录')
        else if (code === API_CODE.BOOK_NOT_FOUND) ElMessage.warning('书籍已不存在, 请重新选择')
        else ElMessage.warning(getApiErrorMessage(error, '请重新读取目录以确认保存结果'))
        if (code === API_CODE.BOOK_NOT_FOUND) await selectPlanet(planetId.value)
        else await loadTree()
    } finally {
        writing.value = false
    }
}
/** @param {import('@/api/catalogue').ReorderRequest} payload 抽屉冻结的快照与目标分组. */
function saveOrder(payload) {
    if (!orderOpen.value || payload.catalogue.parent_id !== folderId.value) return
    return writeChange(() => saveCatalogueOrder(payload), true)
}
/**
 * @param {CatalogueNode} node 目录或文件.
 * @param {boolean} visible 开关请求的目标状态.
 */
function changeDisplay(node, visible) {
    if (node.sort === null) return
    const status = visible === true ? 'visible' : 'hidden'
    return writeChange(() => setCatalogueDisplay(node.id, status), false, visible === true ? node : undefined)
}

onMounted(loadPlanets)
onBeforeUnmount(function () {
    active = false
    ++readVersion
})
</script>

<style scoped>
.catalogue-page { display: grid; gap: 16px; min-width: 0; }
h1, h2, p { margin: 0; }
h2 { font-size: 18px; }
.filters, .toolbar, .current, .path { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filters label { display: grid; gap: 6px; }
.filters > label { min-width: 0; max-width: 100%; grid-template-columns: minmax(0, 1fr); }
.filters select {
    box-sizing: border-box; width: 100%; min-width: 0; text-overflow: ellipsis;
    appearance: none; padding: 8px 34px 8px 12px; border: 1px solid #cdd4df;
    border-radius: 6px; font: inherit; color: inherit; background-color: white;
    background-image: linear-gradient(45deg, transparent 50%, #57657b 50%),
                      linear-gradient(135deg, #57657b 50%, transparent 50%);
    background-size: 5px 5px; background-repeat: no-repeat;
    background-position: right 16px center, right 11px center;
}
@media (forced-colors: active) { .filters select { appearance: auto; background-image: none; } }
.progress { margin-inline-start: auto; }
.progress progress { accent-color: #575acb; }
.panels { display: grid; grid-template-columns: minmax(230px, 1fr) minmax(0, 2fr); gap: 16px; align-items: start; }
.panels > * { min-width: 0; }
.toolbar { justify-content: space-between; }
.toolbar, .path, .current, .notice { margin: 10px 0; }
.tree { padding: 0; list-style: none; max-height: 58vh; overflow: auto; }
.tree li { display: flex; align-items: center; padding: 5px 4px; }
.tree button { border: 0; background: transparent; cursor: pointer; color: inherit; font: inherit; }
.tree .arrow { flex: 0 0 25px; }
.tree .node { flex: 1; text-align: start; overflow-wrap: anywhere; }
.selected { background: #eef0ff; color: #374897; border-radius: 4px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #bd862f; flex-shrink: 0; }
.dot.ranked { background: #268168; }
.name { height: auto; max-width: 100%; white-space: normal; text-align: start; }
.notice { color: #9c403c; }
@media (max-width: 880px) {
    .panels { grid-template-columns: minmax(0, 1fr); }
    .progress { margin-inline-start: 0; }
}
</style>
