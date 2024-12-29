<script setup lang="ts">
import {RouterLink} from "vue-router";
</script>

<template>
  <div class="index-navigate">
    <RouterLink to="/">上传图片</RouterLink>
    <RouterLink :to="{name: 'manage-image'}">管理图片</RouterLink>
    <RouterLink :to="{name: 'test-image'}">测试</RouterLink>
  </div>
</template>

<style scoped>
.index-navigate{
  height: 30px;
  text-align: center;
  justify-items: center;
}
</style>
