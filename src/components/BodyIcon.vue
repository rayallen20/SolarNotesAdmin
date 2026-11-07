<template>
    <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
    >
        <circle
            cx="12"
            cy="12"
            r="6.5"
            stroke="currentColor"
            stroke-width="1.7"
        >
        </circle>

        <ellipse
            cx="12"
            cy="12"
            rx="11"
            ry="3.5"
            transform="rotate(-28 12 12)"
            stroke="currentColor"
            stroke-width="1.7"
        >
        </ellipse>
    </svg>
</template>

<script setup>
defineOptions({
    name: 'BodyIcon',
})
</script>

<style scoped>
svg {
    display: block;
    width: 1em;
    height: 1em;
}
</style>