<template>
    <section class="book-list-page">
        <el-breadcrumb :separator-icon="ArrowRight">
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>书籍管理</el-breadcrumb-item>
        </el-breadcrumb>

        <h1>书籍管理</h1>
        <p class="page-description">按所属天体管理书籍/排序/显示状态</p>

        <el-alert
            class="page-notice"
            title="当前列表为固定示例数据,仅供预览.添加表单尚未接入保存"
            type="info"
            show-icon
            :closable="false"
        >
        </el-alert>

        <el-card shadow="never">
            <template #header>
                <div class="list-toolbar">
                    <strong>书籍列表</strong>

                    <el-button type="primary" :icon="Plus" @click="openAddDrawer">
                        添加书籍
                    </el-button>
                </div>
            </template>

            <el-table
                :data="list"
                row-key="id"
                stripe
                class="book-table"
            >
                <el-table-column
                    prop="id"
                    label="书籍 ID"
                    min-width="190"
                >
                </el-table-column>

                <el-table-column
                    prop="title"
                    label="书籍标题"
                    min-width="180"
                >
                </el-table-column>

                <el-table-column label="所属天体" min-width="180">
                    <template #default="scope">
                        {{ getBodyLabel(scope.row.planet.name) }}
                    </template>
                </el-table-column>

                <el-table-column
                    prop="sort"
                    label="排序值"
                    width="110">
                </el-table-column>

                <el-table-column label="显示状态" width="110">
                    <template #default="scope">
                        <el-tag v-if="scope.row.display_status === 'visible'" type="success">显示</el-tag>

                        <el-tag v-else-if="scope.row.display_status === 'hidden'" type="info">隐藏</el-tag>

                        <el-tag v-else type="warning">未知状态</el-tag>
                    </template>
                </el-table-column>

                <template #empty>
                    <el-empty description="暂无书籍"></el-empty>
                </template>
            </el-table>
        </el-card>

        <el-drawer
            v-model="drawerVisible"
            title="添加书籍"
            direction="rtl"
            size="min(520px, 100vw)"
            :close-on-click-modal="false"
            :close-on-press-escape="isValidating === false"
            :show-close="isValidating === false"
            :before-close="beforeCloseDrawer"
            @closed="resetAddForm"
        >
            <el-alert
                v-if="isPlanetLoading === false && planetLoadFailed === true"
                class="page-notice"
                :title="planetError"
                type="error"
                show-icon
                :closable="false"
            >
            </el-alert>

            <el-alert
                v-else-if="isPlanetLoading === false && planetOptions.length === 0"
                class="page-notice"
                title="暂无可选天体,请先在天体管理中创建天体,再刷新选项"
                type="info"
                show-icon
                :closable="false"
            >
            </el-alert>

            <el-button
                class="refresh-planets"
                :icon="Refresh"
                :loading="isPlanetLoading"
                :disabled="isPlanetLoading || isValidating"
                @click="loadPlanetOptions"
            >
                刷新天体选项
            </el-button>

            <el-form
                ref="addFormRef"
                :model="addForm"
                :rules="addFormRules"
                :disabled="isValidating"
                label-position="top"
                @submit.prevent="submitBook"
            >
                <el-form-item label="所属天体" prop="planet_id">
                    <el-select
                        v-model="addForm.planet_id"
                        class="full-width"
                        placeholder="请选择已创建的天体"
                        :loading="isPlanetLoading"
                        :disabled="isPlanetLoading || planetLoadFailed || planetOptions.length === 0"
                    >
                        <el-option
                            v-for="planet in planetOptions"
                            :key="planet.id"
                            :label="getBodyLabel(planet.name)"
                            :value="planet.id"
                        >
                        </el-option>
                    </el-select>
                </el-form-item>

                <el-form-item label="书籍标题" prop="title">
                    <el-input v-model="addForm.title" placeholder="请输入书籍标题"></el-input>

                    <p class="field-help">最多 {{ BOOK_TITLE_MAX_LENGTH }} 个字符,首尾空白会在校验时移除</p>
                </el-form-item>

                <el-form-item label="排序值" prop="sort">
                    <el-input-number
                        v-model="addForm.sort"
                        class="full-width"
                        :min="BOOK_SORT_MIN"
                        :max="BOOK_SORT_MAX"
                        :step="1"
                        controls-position="right"
                    >
                    </el-input-number>

                    <p class="field-help">请输入整数,同一天体下不同书籍的排序值不能重复</p>
                </el-form-item>

                <el-form-item label="显示状态" prop="display_status">
                    <el-select v-model="addForm.display_status" class="full-width">
                        <el-option
                            v-for="option in displayStatusOptions"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                        >
                        </el-option>
                    </el-select>
                </el-form-item>
            </el-form>

            <template #footer>
                <el-button
                    :disabled="isValidating"
                    @click="closeAddDrawer"
                >
                    取消
                </el-button>

                <el-button
                    type="primary"
                    :loading="isValidating"
                    :disabled="isValidating || isPlanetLoading || planetLoadFailed || planetOptions.length === 0"
                    @click="submitBook"
                >
                    确认添加
                </el-button>
            </template>
        </el-drawer>
    </section>
</template>

<script setup>
import {nextTick, reactive, ref} from "vue";
import {getApiErrorMessage} from "@/utils/apiError.js";
import {getBodyList} from "@/api/body.js";
import {ElMessage} from "element-plus";
import {ArrowRight, Plus, Refresh} from "@element-plus/icons-vue";
import {getBodyLabel} from "@/utils/body.js";

defineOptions({
    name: 'BookListPage',
})

/**
 * 书籍显示状态
 * @typedef {'visible' | 'hidden'} BookDisplayStatus
 *  */

/**
 * 书籍对象
 * @typedef {Object} BookRecord
 * @property {string} id 书籍 ID
 * @property {string} title 书籍标题
 * @property {number} sort 同一天体下唯一的排序整数
 * @property {BookDisplayStatus} display_status 显示状态
 * @property {import('@/api/body').BodyRecord} planet 所属天体
 * */

/**
 * 添加表单
 * @typedef {Object} AddBookForm
 * @property {string} planet_id 已创建天体的字符串 ID
 * @property {string} title 书籍标题
 * @property {number | undefined} sort 排序值(清空数字输入框时可能没有值)
 * @property {BookDisplayStatus} display_status 显示状态
 * */

/**
 * 书籍标题业务长度上限
 * @type {number}
 * */
const BOOK_TITLE_MAX_LENGTH = 20

/**
 * MySQL 有符号 INT 的最小值
 * @type {number}
 * */
const BOOK_SORT_MIN = -2147483648

/**
 * MySQL 有符号 INT 的最大值
 * @type {number}
 * */
const BOOK_SORT_MAX = 2147483647

/**
 * 新表单的排序初始值(仅是默认值,不保证未被占用)
 * @type {number}
 * */
const BOOK_DEFAULT_SORT = 1

/**
 * 显示状态选项
 * @type {{value: BookDisplayStatus, label: string}[]}
 * */
const displayStatusOptions = [
    {
        value: 'visible',
        label: '显示'
    },
    {
        value: 'hidden',
        label: '隐藏'
    },
]

/**
 * 沿用当前组件中的四条固定书籍数据,结构与预期的后端列表项一致
 * 示例记录仅供展示.添加表单不会修改此数组.接入列表 API 时删除这些初始记录
 * @type {import('vue').Ref<BookRecord[]>}
 * */
const list = ref([
    {
        id: '1000000000000000003',
        title: '太阳观测入门1',
        sort: 1,
        display_status: 'visible',
        planet: {
            id: '2000000000000000002',
            name: 'Sun',
            title: '太阳的标题',
            intro: '太阳的简介',
        },
    },
    {
        id: '1000000000000000004',
        title: '太阳观测入门2',
        sort: 2,
        display_status: 'hidden',
        planet: {
            id: '2000000000000000002',
            name: 'Sun',
            title: '太阳的标题',
            intro: '太阳的简介',
        },
    },
    {
        id: '1000000000000000001',
        title: '地球观测入门1',
        sort: 1,
        display_status: 'visible',
        planet: {
            id: '2000000000000000001',
            name: 'Earth',
            title: '地球的标题',
            intro: '地球的简介',
        },
    },
    {
        id: '1000000000000000002',
        title: '地球观测入门2',
        sort: 2,
        display_status: 'hidden',
        planet: {
            id: '2000000000000000001',
            name: 'Earth',
            title: '地球的标题',
            intro: '地球的简介',
        },
    },
])

/**
 * 真实天体列表,选择值取 id
 * @type {import('vue').Ref<import('@/api/body').BodyRecord[]>}
 * */
const planetOptions = ref([])

/**
 * 本标量用于表示是否正在加载天体选项
 * @type {import('vue').Ref<boolean>}
 * */
const isPlanetLoading = ref(false)

/**
 * 本标量用于表示天体选项是否不可用(初次读取前也视为不可用)
 * @type {import('vue').Ref<boolean>}
 * */
const planetLoadFailed = ref(true)

/**
 * 天体选项读取失败的说明
 * @type {import('vue').Ref<string>}
 * */
const planetError = ref('天体选项尚未加载')

/**
 * 添加抽屉是否打开
 * @type {import('vue').Ref<boolean>}
 * */
const drawerVisible = ref(false)

/**
 * 是否正在校验表单(用于防止重复操作)
 * @type {import('vue').Ref<boolean>}
 * */
const isValidating = ref(false)

/**
 * 表单组件实例
 * @type {import('vue').Ref<import('element-plus').FormInstance | null>}
 * */
const addFormRef = ref(null)

/**
 * 创建书籍表单(只维护尚未保存的输入内容)
 * @type {AddBookForm}
 * */
const addForm = reactive({
    planet_id: '',
    title: '',
    sort: BOOK_DEFAULT_SORT,
    display_status: 'visible',
})

/**
 * 创建书籍表单的字段校验规则
 * @type {import('element-plus').FormRules<AddBookForm>}
 * */
const addFormRules = {
    planet_id: [
        {
            required: true,
            validator: validatePlanetId,
            trigger: 'change'
        }
    ],
    title: [
        {
            required: true,
            whitespace: true,
            message: '请输入书籍标题',
            trigger: 'blur'
        },
        {
            max: BOOK_TITLE_MAX_LENGTH,
            message: '书籍标题最多 20 个字符',
            trigger: 'blur'
        }
    ],
    sort: [
        {
            required: true,
            type: 'integer',
            message: '请输入有效的排序整数',
            trigger: ['blur', 'change']
        },
        {
            type: 'integer',
            min: BOOK_SORT_MIN,
            max: BOOK_SORT_MAX,
            message: '排序值超出 INT 范围',
            trigger: ['blur', 'change']
        },
    ],
    display_status: [
        {
            required: true,
            type: 'enum',
            enum: ['visible', 'hidden'],
            message: '请选择显示或隐藏',
            trigger: 'change'
        },
    ],
}

/**
 * 本函数用于检查选定的天体 ID 是否存在于当前成功读取的天体列表中
 * @param {string} planetId 待检查的天体 ID
 * @returns {boolean} 是否允许选择此天体
 * */
function isPlanetSelectable(planetId) {
    if (isPlanetLoading.value === true) {
        return false
    }

    if (planetLoadFailed.value === true) {
        return false
    }

    if (planetId === '') {
        return false
    }

    /** @type {import('@/api/body').BodyRecord} 当前天体 */
    for (const planet of planetOptions.value) {
        if (planet.id === planetId) {
            return true
        }
    }

    return false
}

/**
 * 本函数用于校验所属天体字段: 不能用天体名称代替关联 ID
 * @param {unknown} rule 当前校验规则,本函数无需读取
 * @param {unknown} value 待校验的字段值
 * @param {(error?: string | Error) => void} callback 校验结果回调
 * @returns {void}
 * */
function validatePlanetId(rule, value, callback) {
    if (typeof value !== 'string') {
        callback(new Error('请选择当前列表中的已创建天体'))
        return
    }

    if (isPlanetSelectable(value) === false) {
        callback(new Error('请选择当前列表中的已创建天体'))
        return
    }

    callback()
}

/**
 * 本函数用于请求天体列表接口(失败后仍可点击刷新重试)
 * @returns {Promise<void>} 本轮读取结束,失败状态保存在页面中
 * */
async function loadPlanetOptions() {
    if (isPlanetLoading.value === true) {
        return
    }

    if (isValidating.value === true) {
        return
    }

    isPlanetLoading.value = true
    planetError.value = ''
    try {
        planetOptions.value = await getBodyList()
        planetLoadFailed.value = false
    } catch (error) {
        planetOptions.value = []
        planetLoadFailed.value = true
        planetError.value = getApiErrorMessage(error, '天体选项加载失败') + ',请刷新重试'
    } finally {
        isPlanetLoading.value = false
    }

    // 刷新后所选天体已不可用时,则只清空关联字段,保留其他输入
    if (addForm.planet_id !== '' && isPlanetSelectable(addForm.planet_id) === false) {
        addForm.planet_id = ''
    }
}

/**
 * 本函数用于重置表单及旧校验提示(关闭抽屉或再次打开时调用)
 * @returns {void}
 * */
function resetAddForm() {
    addForm.planet_id = ''
    addForm.title = ''
    addForm.sort = BOOK_DEFAULT_SORT
    addForm.display_status = 'visible'

    if (addFormRef.value !== null) {
        addFormRef.value.clearValidate()
    }
}

/**
 * 本函数用于打开抽屉并请求天体列表接口,等待表单挂载后清除旧提示
 * @returns {Promise<void>} 抽屉打开及本轮选项读取处理结束
 * */
async function openAddDrawer() {
    if (isValidating.value === true) {
        return
    }

    if (drawerVisible.value === true) {
        return
    }

    resetAddForm()

    drawerVisible.value = true
    /** @type {Promise<void>} 立即启动的选项读取,防止短暂使用旧数据 */
    const loading = loadPlanetOptions()
    await nextTick()

    if (addFormRef.value !== null) {
        addFormRef.value.clearValidate()
    }

    await loading
}

/**
 * 本函数用于校验期间阻止抽屉关闭
 * @param {() => void} done 抽屉提供的关闭回调
 * @returns {void}
 * */
function beforeCloseDrawer(done) {
    if (isValidating.value === false) {
        done()
    }
}

/**
 * 本函数用于响应取消按钮,实际重置由 closed 事件完成
 * @returns {void}
 * */
function closeAddDrawer() {
    if (isValidating.value === false) {
        drawerVisible.value = false
    }
}

/**
 * 本函数用于校验添加表单(本阶段不发送创建请求,也不向列表追加记录)
 * @returns {Promise<void>} 本轮校验结束
 * */
async function submitBook() {
    if (isValidating.value === true) {
        return
    }

    if (drawerVisible.value === false) {
        return
    }

    if (addFormRef.value === null) {
        return
    }

    if (isPlanetLoading.value === true) {
        ElMessage.warning('请先成功加载天体选项')
        return
    }

    if (planetLoadFailed.value === true) {
        ElMessage.warning('请先成功加载天体选项')
        return
    }

    isValidating.value = true
    try {
        addForm.title = addForm.title.trim()

        /** @type {boolean} 所有字段是否通过校验 */
        const isValid = await addFormRef.value.validate()
        if (isValid === false) {
            return
        }
    } catch {
        // 字段错误由 el-form-item 展示,保留本次输入以便修正
        return
    } finally {
        isValidating.value = false
    }

    // 后续在这里接入书籍创建 API.现在不关闭抽屉/不清空/不提示创建成功
    ElMessage.info('表单校验通过.保存功能尚未开放,本次内容未保存')
}
</script>

<style scoped lang="scss">
.book-list-page h1 {
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

.page-notice { margin-bottom: 20px; }

.list-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.book-table,
.full-width { width: 100%; }

.book-table :deep(.cell) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.field-help {
    margin: 6px 0 0;
    color: #657089;
    font-size: 13px;
    line-height: 1.6;
}

.refresh-planets { margin-bottom: 20px; }

.book-list-page :deep(.el-card) {
    border-color: #e8ecf3;
    border-radius: 8px;
}

@media (max-width: 640px) {
    .list-toolbar { align-items: flex-start; }
}
</style>