import {createRouter, createWebHistory} from 'vue-router'
import UploadImage from "@/pages/UploadImage.vue";
import ManageImage from "@/pages/ManageImage.vue";
import TestImage from "@/pages/TestImage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/upload'
    }, {
      path: '/upload',
      name: 'upload',
      component: UploadImage
    },
    {
      path: '/manage',
      name: 'manage-image',
      component: ManageImage
    },
    {
      path: '/test',
      name: 'test-image',
      component: TestImage
    }
  ]
});

export default router;
