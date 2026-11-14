import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 本函数用于去除开发代理路径中的 /api 前缀
 * @param {string} path 浏览器请求的路径
 * @returns {string} 转发给后端的路径
 * */
function rewriteApiPath(path) {
    return path.replace(/^\/api/, '')
}

/** @type {import('vite').UserConfig} Vite 配置 */
const option = {
    plugins: [vue()],
    server: {
        host: '0.0.0.0',
        port: 5062,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:4060',
                changeOrigin: true,
                rewrite: rewriteApiPath,
            },
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
}

/** @type {import('vite').UserConfig} 交给 Vite 加载的配置对象 */
const config = defineConfig(option)

export default config
