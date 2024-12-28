<script setup lang="ts">
import {RouterLink} from "vue-router";
</script>

<template>
  <div>
    <RouterLink to="/">上传图片</RouterLink>
    <RouterLink :to="{name: 'manage-image'}">管理图片</RouterLink>
  </div>
</template>

<style scoped>

</style>
