<script setup lang="ts">
import {RouterLink} from "vue-router";
const logoutTrigger = () => {
  window.location.href = '/logout_request'
}
</script>

<template>
  <div class="index-navigate">
    <div class="navigate-item">
      <RouterLink to="/"><span>上传图片</span></RouterLink>
      <RouterLink :to="{name: 'manage-image'}"><span>管理图片</span></RouterLink>
      <RouterLink :to="{name: 'test-image'}"><span>测试</span></RouterLink>
    </div>
    <button class="logout" ref="logout" @click="logoutTrigger"><span>Logout</span></button>
  </div>
</template>

<style scoped>
.index-navigate{
  display: flex;
  height: 60px;
  text-align: center;
  justify-items: center;
  font-size: xx-large;
}
.navigate-item{
  margin: auto;
}
.logout{
  margin-left: 0;
}
span{
  padding: 0 20px 0 20px;
}
</style>
