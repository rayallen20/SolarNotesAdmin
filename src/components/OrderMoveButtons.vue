<template>
    <div class="move-group">
        <span :class="{ blocked: disableUp }">
            <button type="button" :disabled="disableUp" :aria-label="upLabel" @click="emit('move', -1)">
                <el-icon><ArrowUp /></el-icon>
            </button>
        </span>
        <span :class="{ blocked: disableDown }">
            <button type="button" :disabled="disableDown" :aria-label="downLabel" @click="emit('move', 1)">
                <el-icon><ArrowDown /></el-icon>
            </button>
        </span>
    </div>
</template>

<script setup>
import {ArrowDown, ArrowUp} from '@element-plus/icons-vue'

defineProps({
    upLabel: {type: String, required: true},
    downLabel: {type: String, required: true},
    disableUp: Boolean,
    disableDown: Boolean,
})

/** 移动方向: -1 表示上移, 1 表示下移. */
const emit = defineEmits(['move'])
</script>

<style scoped>
.move-group { display: inline-flex; gap: 4px; }
.move-group span { display: inline-flex; }
.move-group button {
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    padding: 0;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    background: var(--el-bg-color);
    cursor: pointer;
}
.move-group button:focus-visible { outline: 2px solid var(--el-color-primary); }
.blocked { cursor: not-allowed; }
.blocked button { pointer-events: none; color: var(--el-disabled-text-color); }
</style>
