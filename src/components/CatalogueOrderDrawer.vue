<template>
    <el-drawer
        :model-value="modelValue" title="编排同级节点" size="min(560px, 100%)"
        :show-close="!busy" :close-on-press-escape="!busy" :close-on-click-modal="!busy"
        :before-close="beforeClose" @update:model-value="changeOpen" @opened="focusCandidate"
    >
        <div ref="listArea" :aria-busy="busy">
            <p>{{ parentName }}</p>
            <p>将节点加入阅读顺序后, 可用上下箭头调整位置. 保存时, 可见目录移回待排区会隐藏整棵子树, 后代保留原序号.</p>
            <h3>阅读顺序 ({{ ranked.length }})</h3>
            <p v-if="ranked.length === 0">请从待排区加入节点.</p>
            <ol v-else class="draft-list">
                <li v-for="(node, index) in ranked" :key="node.id" :data-node="node.id" tabindex="-1">
                    <span class="node-name">{{ index + 1 }}. {{ node.name }}</span>
                    <div class="row-actions">
                        <button type="button" :disabled="busy || index === 0"
                                :aria-label="'上移 ' + node.name" @click="moveAt(index, -1)">↑</button>
                        <button type="button" :disabled="busy || index === ranked.length - 1"
                                :aria-label="'下移 ' + node.name" @click="moveAt(index, 1)">↓</button>
                        <button type="button" :disabled="busy" @click="removeAt(index)">
                            {{ node.sort === null ? '撤回加入' : '移回待排' }}
                        </button>
                    </div>
                </li>
            </ol>
            <h3>待排区 ({{ pending.length }})</h3>
            <p v-if="pending.length === 0">本级节点已全部加入阅读顺序.</p>
            <ul v-else class="draft-list">
                <li v-for="node in pending" :key="node.id" :data-node="node.id" tabindex="-1">
                    <span class="node-name">{{ node.name }}</span>
                    <button type="button" :disabled="busy" @click="addNode(node)">加入</button>
                </li>
            </ul>
        </div>
        <template #footer>
            <el-button :disabled="busy" @click="changeOpen(false)">取消</el-button>
            <el-button type="primary" :loading="busy" :disabled="busy || !changed" @click="submit">
                保存排序
            </el-button>
        </template>
    </el-drawer>
</template>

<script setup>
import {computed, nextTick, ref, watch} from 'vue'

/** @typedef {import('@/api/catalogue').CatalogueNode} CatalogueNode */
/** @typedef {Pick<CatalogueNode, 'id' | 'name' | 'sort'>} DraftNode */
/** @typedef {import('@/api/catalogue').OrderGroups} OrderGroups */

/** 抽屉显示状态, 当前父目录, 可选的快捷编排项和提交状态. */
const props = defineProps({
    modelValue: {type: Boolean, required: true},
    parent: {type: /** @type {import('vue').PropType<CatalogueNode | null>} */ (Object), default: null},
    candidateId: {type: String, default: ''},
    busy: {type: Boolean, default: false},
})
/** 父页面执行 API 写入和目录刷新. */
const emit = defineEmits(['update:modelValue', 'save'])
/** @type {import('vue').Ref<HTMLElement | null>} 抽屉内的列表区域. */
const listArea = ref(null)
/** 打开时的父目录 ID. */
const parentId = ref('')
/** 打开时的父目录名称. */
const parentName = ref('')
/** @type {import('vue').Ref<DraftNode[]>} 本层记录的副本. */
const siblings = ref([])
/** @type {import('vue').Ref<DraftNode[]>} 按阅读顺序排列的草稿. */
const ranked = ref([])
/** @type {OrderGroups} 打开时的快照, 编辑草稿期间保留原值. */
let expected = {sorted_children: [], unsorted_children: []}
/** 待排项按中文名称自然排序. */
const collator = new Intl.Collator('zh-CN', {numeric: true})
/** 剩余节点形成待排组, 保证每个直接子项仅出现一次. */
const pending = computed(function () {
    const rankedIds = new Set(ranked.value.map(node => node.id))
    return siblings.value.filter(node => !rankedIds.has(node.id)).sort(function (a, b) {
        return collator.compare(a.name, b.name) || collator.compare(a.id, b.id)
    })
})
/** 成员变化或已排项换位均允许保存. */
const changed = computed(function () {
    const original = expected.sorted_children
    return ranked.value.length !== original.length ||
        ranked.value.some((node, index) => node.id !== original[index].id)
})

/**
 * 生成 API 要求的两份完整子项数组.
 * @returns {OrderGroups} ID 分组.
 */
function groups() {
    return {
        sorted_children: ranked.value.map(node => ({id: node.id})),
        unsorted_children: pending.value.map(node => ({id: node.id})),
    }
}

/** 每次打开时取得新的快照, 将快捷编入操作应用到草稿. */
function startDraft() {
    const parent = props.parent
    if (parent === null) return
    parentId.value = parent.id
    parentName.value = parent.name
    siblings.value = parent.children.map(node => ({id: node.id, name: node.name, sort: node.sort}))
    ranked.value = siblings.value.filter(node => node.sort !== null)
    expected = groups()
    const candidate = siblings.value.find(node => node.id === props.candidateId)
    if (candidate && candidate.sort === null) ranked.value.push(candidate)
}
watch(() => props.modelValue, function (open) {
    if (open) startDraft()
}, {immediate: true})

/**
 * 将焦点放在移动后的节点, 支持键盘连续操作.
 * @param {string} id 节点 ID.
 */
async function focusRow(id) {
    await nextTick()
    if (listArea.value === null || id === '') return
    const row = listArea.value.querySelector('[data-node="' + CSS.escape(id) + '"]')
    if (row instanceof HTMLElement) row.focus()
}

/** 从表格行进入时滚动到相应节点. */
function focusCandidate() {
    focusRow(props.candidateId)
}

/**
 * 加入阅读顺序.
 * @param {DraftNode} node 待排节点.
 */
function addNode(node) {
    if (props.busy) return
    ranked.value.push(node)
    focusRow(node.id)
}

/**
 * 将节点移回待排组.
 * @param {number} index 当前索引.
 */
function removeAt(index) {
    if (props.busy) return
    const [node] = ranked.value.splice(index, 1)
    focusRow(node.id)
}

/**
 * 调整已排节点的位置.
 * @param {number} index 当前索引.
 * @param {number} delta 移动距离.
 */
function moveAt(index, delta) {
    const to = index + delta
    if (props.busy || to < 0 || to >= ranked.value.length) return
    const [node] = ranked.value.splice(index, 1)
    ranked.value.splice(to, 0, node)
    focusRow(node.id)
}

/**
 * 写入期间阻止关闭.
 * @param {Function} done Element Plus 提供的关闭回调.
 */
function beforeClose(done) {
    if (!props.busy) done()
}

/**
 * 通知父页面切换抽屉.
 * @param {boolean} open 期望的打开状态.
 */
function changeOpen(open) {
    if (!props.busy) emit('update:modelValue', open)
}

/** 发送完整请求体, 父页面根据服务端结果决定是否关闭. */
function submit() {
    if (props.busy || !changed.value) return
    emit('save', {catalogue: {parent_id: parentId.value, expected, target: groups()}})
}
</script>

<style scoped>
.draft-list { list-style: none; padding: 0; }
.draft-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 9px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.node-name { min-width: 0; overflow-wrap: anywhere; }
.row-actions { display: flex; gap: 4px; flex-shrink: 0; }
.draft-list button { border: 1px solid var(--el-border-color); background: var(--el-bg-color);
    color: var(--el-text-color-primary); border-radius: 4px; padding: 5px 8px; cursor: pointer; }
.draft-list button:disabled { color: var(--el-disabled-text-color); cursor: not-allowed; }
.draft-list li:focus-visible, .draft-list button:focus-visible { outline: 2px solid var(--el-color-primary); }
</style>
