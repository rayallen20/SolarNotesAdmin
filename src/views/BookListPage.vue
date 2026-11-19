<template>
    <section class="book-list-page">
        <el-breadcrumb :separator-icon="ArrowRight">
            <el-breadcrumb-item>管理后台</el-breadcrumb-item>
            <el-breadcrumb-item>书籍管理</el-breadcrumb-item>
        </el-breadcrumb>

        <h1>书籍管理</h1>
        <p class="page-description">按所属天体管理书籍/排序/显示状态</p>

        <el-card shadow="never">
            <template #header>
                <div class="list-toolbar">
                    <strong>书籍列表</strong>

                    <div class="toolbar-actions">
                        <el-button
                            :icon="Refresh"
                            :loading="isLoading"
                            :disabled="isLoading || isSubmitting"
                            @click="refreshBooks"
                        >刷新列表</el-button>
                        <el-button
                            type="primary"
                            :icon="Plus"
                            :disabled="isLoading || isSubmitting"
                            @click="openAddDrawer"
                        >添加书籍</el-button>
                    </div>
                </div>
            </template>

            <el-alert
                v-if="loadFailed === true"
                :title="listError"
                type="error"
                show-icon
                :closable="false"
            >
            </el-alert>

            <el-table
                v-else
                v-loading="isLoading"
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
                    <el-empty v-if="isLoading === false" :description="getEmptyDescription()"></el-empty>

                    <span v-else>正在读取书籍</span>
                </template>
            </el-table>
            <div v-if="loadFailed === false" class="pagination-wrap">
                <el-pagination
                    :current-page="pagination.currentPage"
                    :page-size="pagination.itemPerPage"
                    :page-sizes="PAGE_SIZES"
                    :total="pagination.totalItem"
                    :pager-count="5"
                    :disabled="isLoading || isSubmitting"
                    layout="total, sizes, prev, pager, next"
                    @update:current-page="changePage"
                    @update:page-size="changePageSize"
                >
                </el-pagination>
            </div>
        </el-card>

        <el-drawer
            v-model="drawerVisible"
            title="添加书籍"
            direction="rtl"
            size="min(520px, 100vw)"
            :close-on-click-modal="false"
            :close-on-press-escape="isSubmitting === false"
            :show-close="isSubmitting === false"
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
                :disabled="isPlanetLoading || isSubmitting"
                @click="loadPlanetOptions"
            >
                刷新天体选项
            </el-button>

            <el-form
                ref="addFormRef"
                :model="addForm"
                :rules="addFormRules"
                :disabled="isSubmitting"
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

                    <p class="field-help">排序必须是从 1 开始的正整数, 与显示状态无关. 同一天体下排序值不能重复</p>
                </el-form-item>

                <el-form-item label="显示状态" prop="display_status">
                    <el-select
                        v-model="addForm.display_status"
                        class="full-width"
                    >
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
                    :disabled="isSubmitting"
                    @click="closeAddDrawer"
                >
                    取消
                </el-button>

                <el-button
                    type="primary"
                    :loading="isSubmitting"
                    :disabled="isSubmitting || isLoading || isPlanetLoading || planetLoadFailed || planetOptions.length === 0"
                    @click="submitBook"
                >
                    确认添加
                </el-button>
            </template>
        </el-drawer>
    </section>
</template>

<script setup>
import {nextTick, onMounted, reactive, ref} from "vue";
import {getApiErrorCode, getApiErrorMessage, isAuthError} from '@/utils/apiError'
import {API_CODE} from '@/constants/apiCode'
import {addBook, getBookList} from '@/api/book'
import {
    BOOK_TITLE_MAX_LENGTH,
    BOOK_SORT_MIN,
    BOOK_SORT_MAX,
    BOOK_DEFAULT_SORT,
    displayStatusOptions,
} from '@/constants/book'
import {DEFAULT_PAGE_SIZE, PAGE_SIZES} from '@/constants/pagination'
import {getBodyList} from "@/api/body.js";
import {ElMessage} from "element-plus";
import {ArrowRight, Plus, Refresh} from "@element-plus/icons-vue";
import {getBodyLabel} from "@/utils/body.js";

defineOptions({
    name: 'BookListPage',
})

/**
 * 添加书籍表单, 校验后转换为 CreateBookInput
 * @typedef {Object} AddBookForm
 * @property {string} planet_id 所选真实天体的字符串 ID
 * @property {string} title 书籍标题
 * @property {number | null | undefined} sort 排序整数
 * @property {import('@/constants/book').BookDisplayStatus} display_status 显示状态
 * */

/**
 * 本常量用于表示当前页书籍列表
 * @type {import('vue').Ref<import('@/api/book').BookRecord[]>}
 * */
const list = ref([])

/**
 * 本常量用于表示当前查询与后端返回的分页信息
 * @type {import('@/types/pagination').Pagination}
 * */
const pagination = reactive({
    currentPage: 1,
    itemPerPage: DEFAULT_PAGE_SIZE,
    totalPage: 0,
    totalItem: 0,
})

/**
 * 本标量用于表示是否正在读取书籍列表
 * @type {import('vue').Ref<boolean>}
 * */
const isLoading = ref(false)

/**
 * 本标量用于表示最近一次列表读取是否失败
 * @type {import('vue').Ref<boolean>}
 * */
const loadFailed = ref(false)

/**
 * 本常量用于表示列表读取失败的说明
 * @type {import('vue').Ref<string>}
 * */
const listError = ref('')

/**
 * 本常量用于表示天体列表,下拉框中的选项值取 id
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
 * 是否正在校验或请求创建书籍(用于防止重复操作)
 * @type {import('vue').Ref<boolean>}
 * */
const isSubmitting = ref(false)

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
        {required: true, validator: validateBookSort, trigger: ['blur', 'change']},
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
 * 本函数用于解释书籍业务错误, 其余错误复用公共提示
 * @param {unknown} error 捕获的异常
 * @param {string} fallback 没有可用说明时的提示
 * @returns {string} 页面错误说明
 * */
function getBookErrorMessage(error, fallback) {
    switch (getApiErrorCode(error)) {
        case API_CODE.VALIDATION_ERROR:
            return '请求参数不符合要求, 请检查书籍字段或分页参数'
        case API_CODE.BOOK_PLANET_NOT_FOUND:
            return '所选天体已不存在, 请重新选择天体'
        case API_CODE.BOOK_SORT_OCCUPIED:
            return '该天体下的排序值已被占用, 请更换排序值'
    }

    return getApiErrorMessage(error, fallback)
}

/**
 * 本函数用于校验排序字段值
 * @param {unknown} rule 当前规则, 本函数无需读取
 * @param {unknown} value 待校验的排序值
 * @param {(error?: string | Error) => void} callback 校验结果回调
 * @returns {void}
 * */
function validateBookSort(rule, value, callback) {
    if (typeof value !== 'number' || Number.isInteger(value) === false) {
        callback(new Error('请输入有效的排序整数'))
        return
    }

    if (value < BOOK_SORT_MIN || value > BOOK_SORT_MAX) {
        callback(new Error('排序值必须是 ' + BOOK_SORT_MIN + ' 到 ' + BOOK_SORT_MAX + ' 之间的正整数'))
        return
    }

    callback()
}

/**
 * 本函数用于根据真实总数提供空态说明, 不把越界页误报为数据库没有书籍
 * @returns {string} 表格空态文字
 * */
function getEmptyDescription() {
    if (pagination.totalItem === 0) {
        return '暂无书籍, 请点击添加书籍'
    }

    return '当前页暂无书籍, 请刷新列表'
}

/**
 * 本函数读取指定页 (加载期间禁止并发翻页, 越界时最多补读一次有效末页)
 * @param {number} currentPage 请求页码
 * @param {number} itemPerPage 请求每页条数
 * @returns {Promise<void>} 本轮列表读取结束
 * */
async function loadBooks(currentPage, itemPerPage) {
    if (isLoading.value === true || isSubmitting.value === true) {
        return
    }

    isLoading.value = true
    loadFailed.value = false
    listError.value = ''
    list.value = []
    pagination.currentPage = currentPage
    pagination.itemPerPage = itemPerPage

    try {
        /** @type {import('@/api/book').BookListResult} 本轮列表结果 */
        let result = await getBookList(currentPage, itemPerPage)
        if (result.pagination.totalPage > 0 && currentPage > result.pagination.totalPage) {
            result = await getBookList(result.pagination.totalPage, itemPerPage)
        }

        if (result.pagination.totalPage > 0 && result.pagination.currentPage > result.pagination.totalPage) {
            pagination.currentPage = result.pagination.totalPage
            loadFailed.value = true
            listError.value = '列表在读取期间发生变化, 请刷新重试'
            return
        }

        list.value = result.books
        pagination.currentPage = result.pagination.currentPage
        pagination.itemPerPage = result.pagination.itemPerPage
        pagination.totalPage = result.pagination.totalPage
        pagination.totalItem = result.pagination.totalItem

        if (pagination.totalItem === 0) {
            pagination.currentPage = 1
        }
    } catch (error) {
        loadFailed.value = true
        listError.value = getBookErrorMessage(error, '书籍列表加载失败') + ', 请刷新重试'
    } finally {
        isLoading.value = false
    }
}

/**
 * 本函数用于刷新当前页, 失败后保留相同分页条件供重试
 * @returns {Promise<void>} 本轮刷新结束
 * */
async function refreshBooks() {
    await loadBooks(pagination.currentPage, pagination.itemPerPage)
}

/**
 * 本函数用于响应页码变化, 使用受控属性避免加载期间提前修改查询条件
 * @param {number} page 新页码
 * @returns {Promise<void>} 本轮翻页结束
 * */
async function changePage(page) {
    if (isLoading.value === true || isSubmitting.value === true || page === pagination.currentPage) {
        return
    }

    await loadBooks(page, pagination.itemPerPage)
}

/**
 * 本函数用于修改每页条数时回到第一页
 * @param {number} size 新的每页条数
 * @returns {Promise<void>} 本轮读取结束
 * */
async function changePageSize(size) {
    if (isLoading.value === true || isSubmitting.value === true || size === pagination.itemPerPage) {
        return
    }

    await loadBooks(1, size)
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

    if (isSubmitting.value === true) {
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
    if (isLoading.value === true) {
        return
    }

    if (isSubmitting.value === true) {
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
 * 本函数用于在校验和创建请求期间阻止抽屉关闭
 * @param {() => void} done 抽屉提供的关闭回调
 * @returns {void}
 * */
function beforeCloseDrawer(done) {
    if (isSubmitting.value === false) {
        done()
    }
}

/**
 * 本函数用于响应取消按钮,实际重置由 closed 事件完成
 * @returns {void}
 * */
function closeAddDrawer() {
    if (isSubmitting.value === false) {
        drawerVisible.value = false
    }
}

/**
 * 本函数用于校验并创建书籍, 创建请求结束后再执行列表或天体选项刷新
 * @returns {Promise<void>} 本次提交及必要的读取处理结束
 * */
async function submitBook() {
    if (isSubmitting.value === true || isLoading.value === true || drawerVisible.value === false || addFormRef.value === null) {
        return
    }

    if (isPlanetLoading.value === true || planetLoadFailed.value === true) {
        ElMessage.warning('请先成功加载天体选项')
        return
    }

    isSubmitting.value = true
    try {
        addForm.title = addForm.title.trim()
        /** @type {boolean} 当前表单是否有效 */
        const isValid = await addFormRef.value.validate()
        if (isValid === false) {
            isSubmitting.value = false
            return
        }
    } catch {
        isSubmitting.value = false
        return
    }

    if (typeof addForm.sort !== 'number') {
        isSubmitting.value = false
        return
    }

    /** @type {import('@/api/book').CreateBookInput} 已校验的本次提交快照 */
    const input = {
        planet_id: addForm.planet_id,
        title: addForm.title,
        sort: addForm.sort,
        display_status: addForm.display_status,
    }

    /** @type {boolean} 后端是否明确确认创建成功.*/
    let created = false

    /** @type {boolean} 是否需要重新读取天体选项 */
    let reloadPlanets = false

    /** @type {boolean} 创建结果是否尚未确认 */
    let resultUnknown = false
    try {
        await addBook(input)
        created = true
    } catch (error) {
        if (isAuthError(error) === true) {
            return
        }

        /** @type {number | undefined} 可识别的业务错误码 */
        const code = getApiErrorCode(error)
        if (code === undefined) {
            resultUnknown = true
            ElMessage.warning('尚未确认创建结果, 请核对刷新后的列表再决定是否重试')
        } else {
            ElMessage.error(getBookErrorMessage(error, '创建书籍失败'))
        }
        reloadPlanets = code === API_CODE.BOOK_PLANET_NOT_FOUND
    } finally {
        isSubmitting.value = false
    }

    if (created === true) {
        drawerVisible.value = false
        ElMessage.success('书籍创建成功')
        // 创建已经成功. 列表刷新失败只显示列表错误, 不会改成创建失败
        await loadBooks(1, pagination.itemPerPage)
        return
    }

    if (reloadPlanets === true) {
        // 先释放提交锁, 再刷新选项, 避免被 loadPlanetOptions 的防重入检查拦截
        await loadPlanetOptions()
    }

    if (resultUnknown === true) {
        // 只重新读取, 不自动重发创建请求. 新书不一定在当前页
        await refreshBooks()
    }
}

onMounted(refreshBooks)
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

.toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.toolbar-actions :deep(.el-button + .el-button) { margin-left: 0; }

.pagination-wrap {
    margin-top: 20px;
    overflow-x: auto;
    padding-bottom: 4px;
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
