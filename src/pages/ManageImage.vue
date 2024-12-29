<script setup lang="ts">
import {ref} from 'vue';
import axios from "axios";

const manage = ref<HTMLDivElement>();
await axios.get('/user_login_request').then(
  res => {
    console.log('res', res)
  }
).catch(e => console.log(e))

interface ImgUrlArr {
  name: string
}

let img_url_arr = ref<ImgUrlArr[]>([{"name": "1"}, {"name": "2"}]);
axios.get('/get_image_url')
  .then(
    res => {
      img_url_arr = ref(res.data)
      console.log('res', img_url_arr)
    }
  ).catch(e => console.log(e))

</script>

<template>
  <div ref="manage">manage</div>
  <div v-for="item in img_url_arr" :key="item.name">
    {{ item.name }}
  </div>
</template>

<style scoped>

</style>
