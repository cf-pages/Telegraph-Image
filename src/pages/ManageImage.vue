<script setup lang="ts">
import {ref} from 'vue';
import axios from "axios";

const manage = ref<HTMLDivElement>();
await axios.get('/user_login_request').then(
  res => {
    console.log('res', res)
  }
).catch(e => console.log(e))

await axios.get('/get_image_url').then(
  res => {
    console.log('res', res)
  }
).catch(e => console.log(e))

</script>

<template>
  <div ref="manage">manage</div>

</template>

<style scoped>

</style>
