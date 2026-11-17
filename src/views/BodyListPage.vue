<template>
    <section class="body-list-page">
        <el-breadcrumb :separator-icon="ArrowRight">
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>天体管理</el-breadcrumb-item>
        </el-breadcrumb>

        <h1>天体管理</h1>

        <p class="page-description">管理太阳与八大行星的标题和内容</p>

        <el-card shadow="never">
            <template #header>
                <div class="list-toolbar">
                    <div class="list-heading">
                        <strong>天体列表</strong>

                        <span v-if="loadFailed === false">
                            列表共 {{ bodyList.length }} 条
                        </span>

                        <span v-if="statusFailed === false && isStatusLoading === false">
                            固定天体已创建 {{ createdBodyCount }} / {{ bodyOptions.length }} 个
                        </span>
                    </div>

                    <div class="toolbar-actions">
                        <el-button
                            :icon="Refresh"
                            :loading="isLoading || isStatusLoading"
                            :disabled="isLoading || isStatusLoading || isSubmitting"
                            @click="refreshData"
                        >
                            刷新列表和天体状态
                        </el-button>

                        <el-button
                            type="primary"
                            :icon="Plus"
                            :disabled="isLoading || isStatusLoading || isSubmitting"
                            @click="openAddDrawer"
                        >
                            创建天体
                        </el-button>
                    </div>
                </div>
            </template>

            <el-alert
                class="status-notice"
                v-if="statusFailed"
                :title="statusError"
                type="error"
                show-icon
                :closable="false">
            </el-alert>

            <el-alert
                v-if="loadFailed"
                :title="listError"
                type="error"
                show-icon
                :closable="false">
            </el-alert>

            <el-table
                v-else
                v-loading="isLoading"
                :data="bodyList"
                row-key="id"
                stripe
                empty-text="暂无天体,请点击创建天体"
                class="body-table"
            >
                <el-table-column label="天体" width="100">
                    <template #default="scope">
                        {{getBodyLabel(scope.row.name)}}
                    </template>
                </el-table-column>

                <el-table-column
                    prop="name"
                    label="匹配标识"
                    width="130"
                >
                </el-table-column>

                <el-table-column
                    prop="title"
                    label="天体标题"
                    min-width="180"
                >
                </el-table-column>

                <el-table-column
                    prop="intro"
                    label="天体简介"
                    min-width="280"
                >
                </el-table-column>
            </el-table>

            <p
                class="all-added"
                v-if="statusFailed === false && isStatusLoading === false && availableBodyCount === 0"
            >
                太阳与八大行星均已创建
            </p>
        </el-card>

        <el-drawer
            v-model="drawerVisible"
            title="创建天体"
            direction="rtl"
            size="min(520px, 100vw)"
            :close-on-click-modal="false"
            :close-on-press-escape="isSubmitting === false"
            :show-close="isSubmitting === false"
            :before-close="beforeCloseDrawer"
            @closed="resetAddForm"
        >
            <el-alert
                v-if="statusFailed"
                :title="statusError"
                class="status-notice"
                type="error"
                show-icon
                :closable="false"
            >
            </el-alert>

            <el-button
                :loading="isStatusLoading"
                :disabled="isSubmitting || isStatusLoading"
                @click="loadBodyStatuses"
            >
                刷新可选天体
            </el-button>

            <el-form
                ref="addFormRef"
                :model="addForm"
                :rules="addFormRules"
                :disabled="isSubmitting || isStatusLoading || statusFailed"
                label-position="top"
                @submit.prevent="submitBody"
            >
                <el-form-item label="天体" prop="name">
                    <el-select
                        v-model="addForm.name"
                        placeholder="请选择天体"
                        class="body-select"
                    >
                        <el-option
                            v-for="option in bodyOptions"
                            :key="option.name"
                            :label="getOptionLabel(option.name)"
                            :value="option.name"
                            :disabled="isBodySelectable(option.name) === false"
                        >
                        </el-option>
                    </el-select>

                    <p class="field-help">已创建的天体不可重复选择.状态加载失败时请先刷新.</p>
                </el-form-item>

                <el-form-item label="简介标题" prop="title">
                    <el-input
                        v-model="addForm.title"
                        placeholder="请输入简介标题"
                    >
                    </el-input>

                    <p class="field-help">最多 {{ BODY_TITLE_MAX_LENGTH }} 个字符</p>
                </el-form-item>

                <el-form-item label="简介内容" prop="intro">
                    <el-input
                        v-model="addForm.intro"
                        type="textarea"
                        placeholder="请输入简介内容"
                        :rows="6"
                    >
                    </el-input>

                    <p class="field-help">最多 {{ BODY_INTRO_MAX_LENGTH }} 个字符</p>
                </el-form-item>
            </el-form>

            <template #footer>
                <el-button :disabled="isSubmitting" @click="closeAddDrawer">
                    取消
                </el-button>

                <el-button
                    type="primary"
                    :loading="isSubmitting"
                    :disabled="isSubmitting || isStatusLoading || statusFailed || isBodySelectable(addForm.name) === false"
                    @click="submitBody"
                >
                    确认创建
                </el-button>
            </template>
        </el-drawer>
    </section>
</template>

<script setup>
import {computed, nextTick, onMounted, reactive, ref} from "vue";
import {BODY_INTRO_MAX_LENGTH, BODY_TITLE_MAX_LENGTH, bodyOptions} from "@/constants/body";
import {ElMessage} from "element-plus";
import {addBody, getBodyList, getBodyStatus} from "@/api/body";
import {ArrowRight, Plus, Refresh} from "@element-plus/icons-vue";
import {getApiErrorCode, getApiErrorMessage, isAuthError} from "@/utils/apiError";
import {API_CODE} from "@/constants/apiCode";
import {getBodyLabel} from "@/utils/body.js";

defineOptions({
    name: 'BodyListPage',
})

/**
 * 天体列表
 * @type {import('vue').Ref<import('@/api/body').BodyRecord[]>}
 * */
const bodyList = ref([])

/**
 * 后端返回的下拉选项状态
 * @type {import('vue').Ref<import('@/api/body').BodyStatus[]>}
 * */
const bodyStatuses = ref([])

/**
 * 本标量用于表示是否正在请求天体状态API
 * @type {import('vue').Ref<boolean>}
 * */
const isStatusLoading = ref(false)

/**
 * 本标量用于表示状态数据是否不可用(首次加载前也不可用)
 * @type {import('vue').Ref<boolean>}
 * */
const statusFailed = ref(true)

/**
 * 状态数据错误说明
 * @type {import('vue').Ref<string>}
 * */
const statusError = ref('天体状态尚未加载,请刷新')

/**
 * 天体列表错误说明
 * @type {import('vue').Ref<string>}
 * */
const listError = ref('')

/**
 * 本标量用于标记是否正在读取列表
 * @type {import('vue').Ref<boolean>}
 * */
const isLoading = ref(false)

/**
 * 本标量用于标记最后一次读取列表是否失败
 * @type {import('vue').Ref<boolean>}
 * */
const loadFailed = ref(false)

/**
 * 本标量用于标记创建天体的抽屉是否可见
 * @type {import('vue').Ref<boolean>}
 * */
const drawerVisible = ref(false)

/**
 * 本标量用于标记是否正在校验或提交创建天体表单
 * @type {import('vue').Ref<boolean>}
 * */
const isSubmitting = ref(false)

/**
 * 表单组件实例
 * @type {import('vue').Ref<import('element-plus').FormInstance | null>}
 * */
const addFormRef = ref(null)

/**
 * 创建天体的表单数据
 * @type {import('@/api/body').AddBodyForm}
 * */
const addForm = reactive({
    name: '',
    title: '',
    intro: '',
})

/**
 * 表单校验规则
 * @type {import('element-plus').FormRules<import('@/api/body').AddBodyForm>}
 * */
const addFormRules = {
    name: [
        {
            required: true,
            message: '请选择天体',
            trigger: 'change'
        },
    ],
    title: [
        {
            required: true,
            whitespace: true,
            message: '请输入天体标题',
            trigger: 'blur'
        },
        {
            max: BODY_TITLE_MAX_LENGTH,
            message: '天体标题最多 20 个字符',
            trigger: 'blur'
        },
    ],
    intro: [
        {
            required: true,
            whitespace: true,
            message: '请输入天体简介',
            trigger: 'blur'
        },
        {
            max: BODY_INTRO_MAX_LENGTH,
            message: '天体简介最多 150 个字符',
            trigger: 'blur'
        },
    ],
}

/** @type {import('vue').ComputedRef<number>} 已创建的固定天体数量，与列表总数区分。 */
const createdBodyCount = computed(getCreatedBodyCount)

/**
 * 未被创建的天体数量
 * @type {import('vue').ComputedRef<number>}
 * */
const availableBodyCount = computed(getAvailableBodyCount)

/**
 * 本函数用于判定给定名称的天体是否已被创建,若未创建则返回false
 * @param {string} name 天体标识
 * @returns {boolean} 是否允许创建
 * */
function isBodySelectable(name) {
    if (statusFailed.value === true || isStatusLoading.value === true) {
        return false
    }

    for (const status of bodyStatuses.value) {
        if (status.name === name) {
            return status.exist === false
        }
    }

    return false
}

/**
 * 本函数用于组合天体的中文名/标识/可选状态
 * @param {string} name 天体标识
 * @returns {string} 下拉选项文字
 * */
function getOptionLabel(name) {
    /** @type {string} 不含状态的基础文字 */
    const label = getBodyLabel(name) + '（' + name + '）'

    if (isStatusLoading.value === true) {
        return label + ' 正在读取状态'
    }

    if (statusFailed.value === true) {
        return label + ' 状态未知'
    }

    for (const status of bodyStatuses.value) {
        if (status.name === name) {
            if (status.exist === true) {
                return label + ' 已创建'
            }

            return label + ' 可创建'
        }
    }

    return label + ' 状态未知'
}

/**
 * 本函数用于在天体状态API的响应中统计已创建的天体数量,若状态数据不可用则返回0
 * @returns {number} 已创建天体数量
 * */
function getCreatedBodyCount() {
    /** @type {number} 已创建天体数量 */
    let count = 0

    for (const status of bodyStatuses.value) {
        if (status.exist === true) {
            count += 1
        }
    }

    return count
}

/**
 * 本函数用于在天体状态API的响应中统计可创建的天体数量,若状态数据不可用则返回0
 * @returns {number} 可创建天体数量
 * */
function getAvailableBodyCount() {
    /** @type {number} 可创建天体数量 */

    let count = 0

    for (const option of bodyOptions) {
        if (isBodySelectable(option.name) === true) {
            count += 1
        }
    }

    return count
}

/**
 * 本函数用于解释天体业务错误(其他异常交给公共模块)
 * @param {unknown} error 接口异常
 * @param {string} fallback 当前操作没有具体错误信息时的提示
 * @returns {string} 天体页面可展示的错误说明
 * */
function getBodyErrorMessage(error, fallback) {
    switch (getApiErrorCode(error)) {
        case API_CODE.VALIDATION_ERROR:
            return '提交内容不符合要求,请检查天体/标题/简介'
        case API_CODE.BODY_ALREADY_EXISTS:
            return '该天体已被创建,请选择其他天体'
    }
    return getApiErrorMessage(error, fallback)
}

/**
 * 本函数用于读取列表,失败时保留错误状态并允许重新刷新
 * @returns {Promise<void>} 本次读取结束
 * */
async function loadBodies() {
    if (isLoading.value === true) {
        return
    }

    isLoading.value = true
    loadFailed.value = false
    listError.value = ''

    try {
        bodyList.value = await getBodyList()
    } catch (error) {
        loadFailed.value = true
        listError.value = getBodyErrorMessage(error, '天体列表加载失败') + '.请刷新列表重试'
    } finally {
        isLoading.value = false
    }
}

/**
 * 本函数用于请求天体状态API,失败时保留错误状态并允许重新刷新
 * @returns {Promise<void>}
 * */
async function loadBodyStatuses() {
    if (isStatusLoading.value === true) {
        return
    }

    isStatusLoading.value = true
    statusError.value = ''

    try {
        bodyStatuses.value = await getBodyStatus()
        statusFailed.value = false
    } catch (error) {
        bodyStatuses.value = []
        statusFailed.value = true
        statusError.value = getBodyErrorMessage(error, '天体状态加载失败') + '.请刷新可选天体重试'
    } finally {
        isStatusLoading.value = false
    }

    // 刷新发现该天体已被其他管理员创建时,只清除名称,保留已填写的标题和简介
    if (addForm.name !== '' && isBodySelectable(addForm.name) === false) {
        addForm.name = ''
    }
}

/**
 * 本函数用于从错误对象中读取可展示的信息,若无可展示的信息则返回备用文字
 * @param {unknown} error 捕获到的异常
 * @param {string} fallback 没有可用错误信息时显示的备用文字
 * @returns {string} 错误信息
 * */
function getErrorMessage(error, fallback) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
        if (typeof error.message === 'string' && error.message.trim() !== '') {
            return error.message
        }
    }

    return fallback
}

/**
 * 本函数用于等待2个独立的API请求均结束后,各自维护错误状态
 * @returns {Promise<void>}
 * */
async function refreshData() {
    await Promise.all([
        loadBodies(),
        loadBodyStatuses()
    ])
}

/**
 * 本函数用于清空表单内容及校验提示(在抽屉关闭或重新打开时调用)
 * @returns {void}
 */
function resetAddForm() {
    addForm.name = ''
    addForm.title = ''
    addForm.intro = ''

    if (addFormRef.value !== null) {
        addFormRef.value.clearValidate()
    }
}

/**
 * 本函数用于打开创建天体抽屉,并等待懒加载的表单挂载后清除旧校验信息
 * @returns {Promise<void>} 抽屉内容已完成本轮更新
 * */
async function openAddDrawer() {
    if (isSubmitting.value === true || isLoading.value === true || isStatusLoading.value === true) {
        return
    }

    resetAddForm()
    drawerVisible.value = true

    // 先启动请求,使本轮渲染立即禁用提交,再等待抽屉懒加载表单
    /** @type {Promise<void>} 本次状态刷新 */
    const loading = loadBodyStatuses()
    await nextTick()
    if (addFormRef.value !== null) {
        addFormRef.value.clearValidate()
    }

    await loading
}

/**
 * 本函数用于响应抽屉关闭动作,在提交期间阻止通过关闭按钮等途径离开
 * @param {() => void} done Element Plus 提供的关闭回调
 * @returns {void}
 */
function beforeCloseDrawer(done) {
    if (isSubmitting.value === false) {
        done()
    }
}

/**
 * 本函数用于响应取消按钮,确保提交期间保持抽屉打开
 * @returns {void}
 */
function closeAddDrawer() {
    if (isSubmitting.value === false) {
        drawerVisible.value = false
    }
}

/**
 * 本函数用于校验表单并创建天体,创建成功后关闭抽屉并重新读取列表
 * @returns {Promise<void>} 本次提交处理结束
 */
async function submitBody() {
    if (isSubmitting.value === true || drawerVisible.value === false || addFormRef.value === null) {
        return
    }

    if (isBodySelectable(addForm.name) === false) {
        ElMessage.warning('请选择状态已确认可创建的天体')
        return
    }

    isSubmitting.value = true
    try {
        addForm.title = addForm.title.trim()
        addForm.intro = addForm.intro.trim()
        const isValid = await addFormRef.value.validate()
        if (isValid === false) {
            isSubmitting.value = false
            return
        }
    } catch {
        isSubmitting.value = false
        return
    }

    try {
        await addBody({
            name: addForm.name,
            title: addForm.title,
            intro: addForm.intro
        })
    } catch (error) {
        // 鉴权错误已由 request.js 统一提示和跳转,此处不再重复弹窗
        if (isAuthError(error) === true) {
            return
        }
        /** @type {number | undefined} 业务错误码 */
        const code = getApiErrorCode(error)
        ElMessage.error(getBodyErrorMessage(error, '创建失败,请稍后重试'))

        if (code === API_CODE.BODY_ALREADY_EXISTS || code === undefined) {
            // 超时/断网可能发生在数据库写入之后,因此先读取结果,读取后不自动重发创建请求
            if (code === undefined) {
                ElMessage.warning('尚未确认创建结果,请核对刷新后的列表再决定是否提交')
            }

            await refreshData()
        }
        return
    } finally {
        isSubmitting.value = false
    }

    drawerVisible.value = false
    ElMessage.success('天体创建成功')

    // 创建已确认成功后,列表或状态刷新失败只显示各自的错误
    await refreshData()
}

onMounted(refreshData)
</script>

<style scoped lang="scss">
.body-list-page h1 {
    margin: 20px 0 8px;
    color: #35405b;
    font-size: 24px;
    font-weight: 600;
}

.page-description {
    margin: 0 0 20px;
    color: #657089;
    line-height: 1.6;
}

.demo-notice {
    margin-bottom: 20px;
}

.list-toolbar,
.list-heading,
.toolbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.list-toolbar {
    justify-content: space-between;
    flex-wrap: wrap;
}

.list-heading {
    flex-wrap: wrap;
    gap: 8px 12px;
}

.list-heading span,
.all-added,
.field-help {
    color: #657089;
    font-size: 13px;
}

.toolbar-actions {
    flex-wrap: wrap;
}

.toolbar-actions :deep(.el-button + .el-button) {
    margin-left: 0;
}

.body-table {
    width: 100%;
}

.body-table :deep(.cell) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.body-select {
    width: 100%;
}

.field-help {
    margin: 6px 0 0;
    line-height: 1.6;
}

.all-added {
    margin: 16px 0 0;
}

.body-list-page :deep(.el-card) {
    border-color: #e8ecf3;
    border-radius: 8px;
}

@media (max-width: 640px) {
    .list-toolbar {
        align-items: flex-start;
    }

    .toolbar-actions {
        width: 100%;
    }
}
</style>