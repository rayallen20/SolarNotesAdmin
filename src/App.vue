<template>
    <ElConfigProvider :locale="zhCn">
        <RouterView></RouterView>
    </ElConfigProvider>
</template>

<script setup>
import {ElConfigProvider} from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";

defineOptions({
  name: "App",
})
</script>

<style scoped>

</style>
