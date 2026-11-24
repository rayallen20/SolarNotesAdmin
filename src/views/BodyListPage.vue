<template>
    <section class="body-page">
        <el-breadcrumb :separator-icon="ArrowRight">
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>天体管理</el-breadcrumb-item>
        </el-breadcrumb>
        <h1>天体管理</h1>
        <p class="description">管理太阳与八颗行星的标题和简介。</p>

        <el-card shadow="never" class="check-card" :class="{
            'is-complete': allCreated,
            'is-missing': readiness !== null && readiness.ready === false,
            'has-error': checkError !== '',
        }">
            <div class="toolbar" aria-live="polite">
                <div class="check-result">
                    <span class="check-symbol" aria-hidden="true"></span>
                    <div>
                        <h2 v-if="checking">正在检测必需天体</h2>
                        <h2 v-else-if="readiness === null">暂时无法确认天体是否齐全</h2>
                        <h2 v-else-if="readiness.ready">太阳与八颗行星均已创建</h2>
                        <h2 v-else>尚有未被创建的天体，前台页面无法正常启动</h2>
                        <p v-if="checking">正在核对太阳与八颗行星的创建状态。</p>
                        <p v-else-if="readiness === null">{{ checkError }}</p>
                        <p v-else-if="readiness.ready">前台页面所需的天体均已就绪。</p>
                        <p v-else>待创建：{{ readiness.missing_names.map(getBodyLabel).join('、') }}</p>
                    </div>
                </div>
                <div class="actions">
                    <span class="check-count">已创建天体
                        <strong v-if="readiness !== null">{{ readiness.created_count }} / {{ readiness.required_count }}</strong>
                        <strong v-else>—</strong>
                    </span>
                    <el-button :loading="checking" :disabled="writing" @click="loadStatus">
                        {{ checkError === '' ? '重新检测' : '重试检测' }}
                    </el-button>
                </div>
            </div>
        </el-card>

        <el-card shadow="never">
            <template #header>
                <div class="toolbar">
                    <h2>天体列表 <small v-if="listError === '' && !reading">共 {{ rows.length }} 个天体</small></h2>
                    <el-button type="primary" :icon="Plus" :disabled="writing || allCreated" @click="openCreate">
                        创建天体
                    </el-button>
                </div>
            </template>
            <div v-if="listError !== ''" role="alert">
                {{ listError }} <el-button link type="primary" :loading="reading" @click="loadList">重试列表</el-button>
            </div>
            <el-table v-else v-loading="reading" :data="rows" row-key="id" stripe empty-text="暂无已创建的天体">
                <el-table-column label="天体" min-width="110" align="center">
                    <template #default="{ row }">
                        <span class="identity">
                            <i class="planet" :data-name="row.name" aria-hidden="true"></i>{{ getBodyLabel(row.name) }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="name" label="匹配标识" min-width="110" align="center" />
                <el-table-column prop="title" label="天体标题" min-width="160" align="center" />
                <el-table-column prop="intro" label="天体简介" min-width="240" align="center" />
                <el-table-column label="操作" width="80" align="center">
                    <template #default="{ row }">
                        <el-button link type="primary" :disabled="writing || reading" :aria-label="'编辑' + getBodyLabel(row.name)"
                                   @click="openEdit(row)">编辑</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-drawer v-model="drawer" :title="original === null ? '创建天体' : '编辑天体'" size="min(520px, 100vw)"
                   :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy">
            <el-form label-position="top" :disabled="busy" @submit.prevent="save">
                <template v-if="original === null">
                    <AdminFilterSelect v-model="form.name" label="天体" placeholder="请选择天体"
                                       :disabled="busy || checking || readiness === null || allCreated">
                        <el-option v-for="name in missingNames" :key="name" :value="name" :label="getBodyLabel(name)" />
                    </AdminFilterSelect>
                    <p v-if="checking" role="status">正在读取可创建的天体…</p>
                    <p v-else-if="readiness === null" role="alert">{{ checkError }}
                        <el-button link type="primary" :disabled="busy" @click="loadStatus">重试检测</el-button>
                    </p>
                    <p v-else-if="allCreated">太阳与八颗行星均已创建。</p>
                </template>
                <el-form-item v-else label="天体">
                    <span class="identity">{{ getBodyLabel(original.name) }} <code>{{ original.name }}</code></span>
                </el-form-item>
                <el-form-item label="天体标题" :error="titleError">
                    <el-input v-model="form.title" placeholder="请输入天体标题" @input="titleError = ''" />
                    <small>{{ lengthOf(form.title.trim()) }} / {{ BODY_TITLE_MAX_LENGTH }}</small>
                </el-form-item>
                <el-form-item label="天体简介" :error="introError">
                    <el-input v-model="form.intro" type="textarea" :rows="6" placeholder="请输入天体简介" @input="introError = ''" />
                    <small>{{ lengthOf(form.intro.trim()) }} / {{ BODY_INTRO_MAX_LENGTH }}</small>
                </el-form-item>
                <div v-if="review" class="review" role="alert">
                    <strong>{{ notice }}</strong>
                    <p v-if="reading">正在读取服务器原文…</p>
                    <p v-else-if="listError !== ''">{{ listError }}
                        <el-button link type="primary" :disabled="busy" @click="recoverEdit">重新读取原文</el-button>
                    </p>
                    <template v-else-if="latest !== null">
                        <p>服务器标题：<span>{{ latest.title }}</span></p>
                        <p>服务器简介：<span>{{ latest.intro }}</span></p>
                        <p>请与上方草稿核对，确认后再保存。</p>
                    </template>
                </div>
                <p v-else-if="notice !== ''" role="alert">{{ notice }}</p>
            </el-form>
            <template #footer>
                <el-button :disabled="busy" @click="drawer = false">取消</el-button>
                <el-button type="primary" :loading="writing" :disabled="!canSave" @click="save">
                    {{ original === null ? '确认创建' : (review ? '确认并保存修改' : '保存修改') }}
                </el-button>
            </template>
        </el-drawer>
    </section>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {ElMessage} from 'element-plus'
import {ArrowRight, Plus} from '@element-plus/icons-vue'
import AdminFilterSelect from '@/components/AdminFilterSelect.vue'
import {addBody, getBodyList, getBodyStatus, updateBody} from '@/api/body'
import {BODY_TITLE_MAX_LENGTH, BODY_INTRO_MAX_LENGTH} from '@/constants/body'
import {API_CODE} from '@/constants/apiCode'
import {getBodyLabel} from '@/utils/body'
import {getApiErrorCode, getApiErrorMessage, isAuthError} from '@/utils/apiError'

defineOptions({name: 'BodyListPage'})

/** @typedef {import('@/api/body').BodyRecord} BodyRecord */
/** @typedef {import('@/api/body').BodyReadiness} BodyReadiness */
/** @type {import('vue').Ref<BodyRecord[]>} 已创建的记录, 保留服务端顺序. */
const rows = ref([])
/** @type {import('vue').Ref<BodyReadiness|null>} 已核验的后端检测摘要. */
const readiness = ref(null)
/** 列表正在加载. */
const reading = ref(false)
/** 首屏和复检期间的独立状态. */
const checking = ref(true)
/** 列表读取失败说明. */
const listError = ref('')
/** 完整性检测失败说明. */
const checkError = ref('')
/** 创建或编辑抽屉是否可见. */
const drawer = ref(false)
/** 是否已有写请求在途. */
const writing = ref(false)
/** @type {import('vue').Ref<BodyRecord|null>} 打开编辑抽屉时的原始行. */
const original = ref(null)
/** @type {import('vue').Ref<BodyRecord|null>} 冲突后读回的最新服务器原文. */
const latest = ref(null)
/** 是否需要对照服务器原文后再次确认. */
const review = ref(false)
/** 当前草稿, 独立于列表和编辑快照. */
const form = reactive({name: '', title: '', intro: ''})
/** 天体标题的校验说明. */
const titleError = ref('')
/** 天体简介的校验说明. */
const introError = ref('')
/** 需要管理员处理的业务提示. */
const notice = ref('')
/** 组件仍接收请求结果. */
let active = true
/** 列表请求序号. */
let listVersion = 0
/** 检测请求序号. */
let statusVersion = 0

/** 服务端确认九项都存在. */
const allCreated = computed(function () {
    return readiness.value !== null && readiness.value.ready === true
})
/** @type {import('vue').ComputedRef<string[]>} 按后端顺序列出的可创建标识. */
const missingNames = computed(function () {
    if (readiness.value === null) return []
    return readiness.value.missing_names
})
/** 核对原文或提交期间锁定抽屉. */
const busy = computed(function () {
    return writing.value || (review.value && reading.value)
})
/** 仅允许使用可信的创建选项或已经取得的编辑快照. */
const canSave = computed(function () {
    if (busy.value) return false
    if (original.value !== null) return review.value === false || latest.value !== null
    return missingNames.value.includes(form.name)
})

/**
 * @param {string} text 待计数的正文.
 * @returns {number} Unicode 码点数.
 */
function lengthOf(text) {
    return Array.from(text).length
}

/**
 * 读取列表, 用序号丢弃已过期请求.
 * @returns {Promise<boolean>} 本次读取成功且仍属于当前页面时返回 true.
 */
async function loadList() {
    const version = ++listVersion
    reading.value = true
    listError.value = ''
    try {
        const result = await getBodyList()
        if (active === false || version !== listVersion) return false
        rows.value = result
        return true
    } catch (error) {
        if (active && version === listVersion) {
            listError.value = getApiErrorMessage(error, '天体列表加载失败')
        }
        return false
    } finally {
        if (active && version === listVersion) reading.value = false
    }
}

/**
 * 读取服务端摘要. 检测期间及失败后均显示未知状态.
 * @returns {Promise<void>}
 */
async function loadStatus() {
    const version = ++statusVersion
    checking.value = true
    readiness.value = null
    checkError.value = ''
    try {
        const result = await getBodyStatus()
        if (active === false || version !== statusVersion) return
        readiness.value = result.readiness
        if (drawer.value && original.value === null) {
            if (form.name !== '' && missingNames.value.includes(form.name) === false) form.name = ''
            if (form.name === '' && notice.value === '' && missingNames.value.length === 1) {
                form.name = missingNames.value[0]
            }
        }
    } catch (error) {
        if (active && version === statusVersion) {
            checkError.value = getApiErrorMessage(error, '检测失败, 请重试')
        }
    } finally {
        if (active && version === statusVersion) checking.value = false
    }
}

/**
 * 首次进入及创建后并行读取, 两类失败可分别重试.
 * @returns {Promise<void>}
 */
async function refreshBoth() {
    await Promise.all([loadList(), loadStatus()])
}

/** @param {BodyRecord|null} row 编辑时的列表行, 创建时为 null. */
function openForm(row) {
    original.value = row === null ? null : {...row}
    review.value = false
    latest.value = null
    notice.value = ''
    titleError.value = ''
    introError.value = ''
    form.name = ''
    form.title = ''
    form.intro = ''
    if (row !== null) {
        form.title = row.title
        form.intro = row.intro
    } else if (missingNames.value.length === 1) {
        form.name = missingNames.value[0]
    }
    drawer.value = true
}

/** 打开创建抽屉. 无可信摘要时可以在抽屉中重试检测. */
function openCreate() {
    if (allCreated.value === false && writing.value === false) openForm(null)
}

/** @param {BodyRecord} row 已创建天体的列表行. */
function openEdit(row) {
    if (writing.value === false && reading.value === false) openForm(row)
}

/**
 * 记录失效后关闭编辑入口并同步两组读数据.
 * @returns {Promise<void>}
 */
async function recoverMissing() {
    drawer.value = false
    ElMessage.warning('该天体已不存在, 正在刷新列表和创建状态')
    await refreshBoth()
}

/**
 * 重新取得编辑原文, 供管理员与仍在抽屉中的草稿比较.
 * @returns {Promise<void>}
 */
async function recoverEdit() {
    review.value = true
    latest.value = null
    const row = original.value
    if (row === null) return
    if (await loadList() === false) return
    const found = rows.value.find(function (item) { return item.id === row.id })
    if (found === undefined) {
        await recoverMissing()
        return
    }
    latest.value = {...found}
}

/**
 * @param {unknown} error 创建或编辑的异常.
 * @returns {Promise<void>}
 */
async function handleWriteError(error) {
    if (active === false || isAuthError(error)) return
    const code = getApiErrorCode(error)
    if (original.value !== null && code === API_CODE.BODY_NOT_FOUND) {
        await recoverMissing()
        return
    }
    if (original.value !== null && (code === API_CODE.BODY_EDIT_CHANGED || code === undefined)) {
        notice.value = code === API_CODE.BODY_EDIT_CHANGED ? '天体已被其他管理员修改' : '保存结果待确认'
        await recoverEdit()
        return
    }
    if (original.value === null && (code === API_CODE.BODY_ALREADY_EXISTS || code === undefined)) {
        notice.value = code === API_CODE.BODY_ALREADY_EXISTS ? '该天体已被创建, 请重新核对' : '创建结果待确认, 请核对最新列表'
        await refreshBoth()
        return
    }
    notice.value = getApiErrorMessage(error, '保存失败, 请稍后重试')
}

/**
 * 校验目标, 创建后复检, 编辑成功按字符串 ID 替换单行.
 * @returns {Promise<void>}
 */
async function save() {
    if (drawer.value === false || canSave.value === false) return
    const title = form.title.trim()
    const intro = form.intro.trim()
    titleError.value = ''
    introError.value = ''
    if (title === '' || lengthOf(title) > BODY_TITLE_MAX_LENGTH) {
        titleError.value = '天体标题需要 1 至 ' + BODY_TITLE_MAX_LENGTH + ' 个字符'
    }
    if (intro === '' || lengthOf(intro) > BODY_INTRO_MAX_LENGTH) {
        introError.value = '天体简介需要 1 至 ' + BODY_INTRO_MAX_LENGTH + ' 个字符'
    }
    if (titleError.value !== '' || introError.value !== '') return
    writing.value = true
    try {
        if (original.value === null) {
            await addBody({name: form.name, title, intro})
            if (active === false) return
            drawer.value = false
            ElMessage.success('天体已创建')
            await refreshBoth()
        } else {
            let before = original.value
            if (review.value && latest.value !== null) before = latest.value
            const expected = {title: before.title, intro: before.intro}
            const updated = await updateBody(before.id, expected, {title, intro})
            if (active === false) return
            rows.value = rows.value.map(function (row) {
                if (row.id === updated.id) return updated
                return row
            })
            drawer.value = false
            ElMessage.success('天体信息已更新')
        }
    } catch (error) {
        await handleWriteError(error)
    } finally {
        if (active) writing.value = false
    }
}

onMounted(refreshBoth)
onBeforeUnmount(function () { active = false })
</script>

<style scoped>
.body-page h1 { margin: 20px 0 8px; }
.body-page h2 { margin: 0; font-size: 18px; }
.body-page small, .description, .check-card p { color: var(--el-text-color-secondary); }
.description, .check-card { margin-bottom: 16px; }
.check-card {
    --tone: #51599a;
    --tint: #f6f6ff;
    --edge: #d7d8f1;
    --symbol: "…";
    background: linear-gradient(105deg, var(--tint), white 85%);
    border-color: var(--edge);
}
.check-card.is-missing { --tone: #91531d; --tint: #fff8ed; --edge: #edcf9c; --symbol: "!"; }
.check-card.is-complete { --tone: #227258; --tint: #f0faf5; --edge: #bddfce; --symbol: "✓"; }
.check-card.has-error { --tone: #a03e44; --tint: #fff6f5; --edge: #f0c9c9; --symbol: "?"; }
.check-result { display: flex; align-items: center; gap: 12px; }
.check-symbol {
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    border: 1px solid var(--edge);
    border-radius: 50%;
    background: var(--tint);
    color: var(--tone);
    font: 700 20px/1 system-ui, sans-serif;
}
.check-symbol::before { content: var(--symbol); }
.check-card p { margin: 6px 0 0; }
.check-count { display: grid; gap: 2px; text-align: center; font-size: 13px; }
.check-count strong { color: var(--tone); font: 650 21px/1.3 system-ui, sans-serif; font-variant-numeric: tabular-nums; }
.toolbar, .actions, .identity { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar { justify-content: space-between; }
.identity { display: inline-flex; justify-content: center; gap: 8px; }
.planet {
    position: relative;
    flex: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: radial-gradient(at 32% 25%, #e0d9cf, #9a9087 72%);
}
.planet[data-name="Sun"] { background: radial-gradient(at 34% 28%, #fff3ac, #f2b841 53%, #db812c); box-shadow: 0 0 0 2px #fff2d0; }
.planet[data-name="Venus"] { background: repeating-linear-gradient(163deg, #ebc58b 0 4px, #d7a871 5px 7px, #f0d6a4 8px 10px); }
.planet[data-name="Earth"] { background: radial-gradient(ellipse at 29% 33%, #83b59d 0 22%, transparent 24%), linear-gradient(135deg, #98cce8, #416eaa); }
.planet[data-name="Mars"] { background: radial-gradient(at 28% 23%, #efb195, #cc7c62 60%, #ad624d); }
.planet[data-name="Jupiter"] { background: repeating-linear-gradient(173deg, #d4a383 0 3px, #edcead 4px 7px, #af795f 8px 9px); }
.planet[data-name="Saturn"] { background: linear-gradient(157deg, #f2dab0, #bb9a74); }
.planet[data-name="Saturn"]::after { content: ""; position: absolute; inset: 5px -4px; border: 1px solid #a48a6b; border-radius: 50%; transform: rotate(-25deg); }
.planet[data-name="Uranus"] { background: radial-gradient(at 28% 20%, #b4eded, #78b8c0 62%, #639aa8); }
.planet[data-name="Neptune"] { background: linear-gradient(156deg, #a4bfee, #547fc5 59%, #446fae); }
.body-page h2 small { font-size: 13px; font-weight: normal; }
.body-page :deep(.el-table .cell), .review span { white-space: pre-wrap; overflow-wrap: anywhere; }
.admin-filter-select { width: 100%; margin-bottom: 18px; }
.review { padding: 12px; border-left: 3px solid var(--el-color-warning); background: var(--el-color-warning-light-9); }
</style>
