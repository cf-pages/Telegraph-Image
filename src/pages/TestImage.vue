<script setup lang="ts">
import {ref} from 'vue';

const logout = ref<HTMLDivElement>();

const logoutTrigger = () => {
  window.location.href = '/logout_request'
}

</script>

<template>
  <button ref="logout" @click="logoutTrigger"><span>Logout</span></button>
</template>

<style scoped>

</style>
