<template>
    <div class="admin-select-field admin-filter-select">
        <label :for="inputId">{{ label }}</label>
        <el-select :id="inputId" v-model="selection" :disabled="disabled" :placeholder="placeholder"
                   :suffix-icon="CaretBottom" fit-input-width popper-class="admin-filter-options">
            <el-option value="" :label="placeholder" />
            <slot />
        </el-select>
    </div>
</template>

<script setup>
import {useId} from 'vue'
import {CaretBottom} from '@element-plus/icons-vue'

defineProps({
    label: {type: String, required: true},
    placeholder: {type: String, required: true},
    disabled: Boolean,
})
const selection = defineModel({type: String, required: true})
const inputId = useId()
</script>
