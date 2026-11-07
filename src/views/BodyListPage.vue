<template>
    <section class="body-list-page">
        <el-breadcrumb :separator-icon="ArrowRight">
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>天体管理</el-breadcrumb-item>
        </el-breadcrumb>

        <h1>天体管理</h1>

        <p class="page-description">管理太阳与八大行星的标题和内容</p>

        <el-alert
            class="demo-notice"
            title="当前为页面演示,数据仅在本次浏览中保留,刷新整个浏览器后清空"
            type="info"
            show-icon
            :closable="false"
        >
        </el-alert>

        <el-card shadow="never">
            <template #header>
                <div class="list-toolbar">
                    <div class="list-heading">
                        <strong>天体列表</strong>
                        <span>已创建 {{bodyList.length}} / {{bodyOptions.length}} 个天体</span>
                    </div>

                    <div class="toolbar-actions">
                        <el-button
                            :icon="Refresh"
                            :loading="isLoading"
                            :disabled="isLoading || isSubmitting"
                            @click="loadBodies"
                        >
                            刷新列表
                        </el-button>

                        <el-button
                            type="primary"
                            :icon="Plus"
                            :disabled="isLoading || loadFailed || isSubmitting || availableBodyCount === 0"
                            @click="openAddDrawer"
                        >
                            添加天体
                        </el-button>
                    </div>
                </div>
            </template>

            <el-alert
                v-if="loadFailed"
                title="列表加载失败,请点击刷新列表重试"
                type="error"
                show-icon
                :closable="false"
            ></el-alert>

            <el-table
                v-else
                v-loading="isLoading"
                :data="bodyList"
                row-key="id"
                stripe
                empty-text="暂无天体,请点击添加天体"
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

            <p v-if="loadFailed === false && isLoading === false && availableBodyCount === 0" class="all-added">
                太阳与八大行星均已添加,无法再创建新的天体
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
            <el-form
                ref="addFormRef"
                :model="addForm"
                :rules="addFormRules"
                :disabled="isSubmitting"
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
                            :label="option.label + '(' + option.name + ')' "
                            :value="option.name"
                            :disabled="isBodyAdded(option.name)"
                        >
                        </el-option>
                    </el-select>

                    <p class="field-help">已添加的天体不可重复选择</p>
                </el-form-item>

                <el-form-item label="简介标题" prop="title">
                    <el-input
                        v-model="addForm.title"
                        placeholder="请输入简介标题"
                        :maxlength="BODY_TITLE_MAX_LENGTH"
                        show-word-limit
                    >
                    </el-input>
                </el-form-item>

                <el-form-item label="简介内容" prop="intro">
                    <el-input
                        v-model="addForm.intro"
                        type="textarea"
                        placeholder="请输入简介内容"
                        :rows="6"
                        :maxlength="BODY_INTRO_MAX_LENGTH"
                        show-word-limit
                    >
                    </el-input>
                </el-form-item>
            </el-form>

            <template #footer>
                <el-button :disabled="isSubmitting" @click="closeAddDrawer">
                    取消
                </el-button>

                <el-button type="primary" :loading="isSubmitting" @click="submitBody">
                    确认添加
                </el-button>
            </template>
        </el-drawer>
    </section>
</template>

<script setup>
import {computed, nextTick, onMounted, reactive, ref} from "vue";
import {BODY_INTRO_MAX_LENGTH, BODY_TITLE_MAX_LENGTH, bodyOptions} from "@/constants/body";
import {ElMessage} from "element-plus";
import {addBody, getBodyList} from "@/api/body";
import {ArrowRight, Plus, Refresh} from "@element-plus/icons-vue";

defineOptions({
    name: 'BodyListPage',
})

/**
 * 天体列表
 * @type {import('vue').Ref<import('@/api/body').BodyRecord[]>}
 * */
const bodyList = ref([])

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

/**
 * 未被创建的天体数量
 * @type {import('vue').ComputedRef<number>}
 * */
const availableBodyCount = computed(getAvailableBodyCount)

/**
 * 本函数用于根据天体的name获取对应的中文名称
 * @param {string} name 天体的匹配标识
 * @returns {string} name对应的中文名称,未匹配到则返回原始name
 */
function getBodyLabel(name) {
    for (const option of bodyOptions) {
        if (option.name === name) {
            return option.label
        }
    }

    return name
}

/**
 * 本函数用于判断给定天体是否已存在于当前列表中
 * @param {string} name 天体的匹配标识
 * @returns {boolean} 已被创建时返回true
 */
function isBodyAdded(name) {
    for (const body of bodyList.value) {
        if (body.name === name) {
            return true
        }
    }

    return false
}

/**
 * 本函数用于在预定义的天体选项中,计算未被创建的天体数量
 * @returns {number} 未被创建的天体数量
 */
function getAvailableBodyCount() {
    /** @type {number} 未被创建的天体数量 */
    let count = 0

    for (const option of bodyOptions) {
        if (isBodyAdded(option.name) === false) {
            count += 1
        }
    }

    return count
}

/**
 * 本函数用于从错误对象中读取可展示的信息,若无可展示的信息则返回备用文字
 * @param {unknown} error 捕获到的异常
 * @param {string} fallback 没有可用错误信息时显示的备用文字
 * @returns {string} 错误信息
 */
function getErrorMessage(error, fallback) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
        if (typeof error.message === 'string' && error.message.trim() !== '') {
            return error.message
        }
    }

    return fallback
}

/**
 * 本函数用于读取列表,失败时保留错误状态并允许重新刷新
 * @returns {Promise<void>} 本次读取结束
 */
async function loadBodies() {
    if (isLoading.value === true) {
        return
    }

    isLoading.value = true
    loadFailed.value = false

    try {
        bodyList.value = await getBodyList()
    } catch (error) {
        loadFailed.value = true
        ElMessage.error(getErrorMessage(error, '天体列表加载失败'))
    } finally {
        isLoading.value = false
    }
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
 */
async function openAddDrawer() {
    if (isLoading.value === true || loadFailed.value === true || isSubmitting.value === true) {
        return
    }

    if (availableBodyCount.value === 0) {
        return
    }

    resetAddForm()
    drawerVisible.value = true
    await nextTick()

    if (addFormRef.value !== null) {
        addFormRef.value.clearValidate()
    }
}

/**
 * 本函数用于响应抽屉关闭动作,在提交期间阻止通过关闭按钮等途径离开
 * @param {() => void} done Element Plus 提供的关闭回调
 * @returns {void}
 */
function beforeCloseDrawer(done) {
    if (isSubmitting.value === true) {
        return
    }

    done()
}

/**
 * 本函数用于响应取消按钮,确保提交期间保持抽屉打开
 * @returns {void}
 */
function closeAddDrawer() {
    if (isSubmitting.value === true) {
        return
    }

    drawerVisible.value = false
}

/**
 * 本函数用于校验表单并创建天体,创建成功后关闭抽屉并重新读取列表
 * @returns {Promise<void>} 本次提交处理结束
 */
async function submitBody() {
    if (isSubmitting.value === true || drawerVisible.value === false) {
        return
    }

    if (addFormRef.value === null) {
        return
    }

    isSubmitting.value = true

    try {
        addForm.title = addForm.title.trim()
        addForm.intro = addForm.intro.trim()

        /** @type {boolean} Element Plus 表单校验结果 */
        const isValid = await addFormRef.value.validate()

        if (isValid === false) {
            isSubmitting.value = false
            return
        }
    } catch {
        // 校验失败时表单项已经显示提示,此处保留用户输入并解除提交锁即可
        isSubmitting.value = false
        return
    }

    try {
        await addBody({
            name: addForm.name,
            title: addForm.title,
            intro: addForm.intro,
        })
    } catch (error) {
        ElMessage.error(getErrorMessage(error, '创建天体失败,请重试'))
        return
    } finally {
        isSubmitting.value = false
    }

    drawerVisible.value = false
    ElMessage.success('天体创建成功(演示)')
    // 读取失败由 loadBodies() 单独处理,避免误报为创建失败
    await loadBodies()
}

onMounted(loadBodies)
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