<script setup lang="ts">
import {ref} from 'vue';
import {useRequest} from "@/hooks/useRequest.ts";

const {upload} = useRequest()

const uploadTrigger = ref<HTMLDivElement>();
const uploadTriggerStatus = ref<HTMLSpanElement>();
const uploadStatus = ref<HTMLSpanElement>();
const uploadStatusResponse = ref<string[]>();
const selectedFiles = ref<File[]>([]);
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);


const triggerFileInput = () => {
  fileInput.value?.click();
};
const onDragOver = () => {
  if (uploadTriggerStatus.value) {
    uploadTriggerStatus.value.innerText = '松开上传';
  }
  isDragging.value = true;
};
const onDragLeave = () => {
  if (uploadTriggerStatus.value) {
    uploadTriggerStatus.value.innerText = '点击或拖拽文件上传';
  }
  isDragging.value = false;
};
const onDrop = (event: DragEvent) => {
  if (uploadTriggerStatus.value) {
    uploadTriggerStatus.value.innerText = '上传中';
  }
  // stop firefox open tab
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = false;
  if (event.dataTransfer && event.dataTransfer.files) {
    selectedFiles.value = Array.from(event.dataTransfer.files);
    console.log(selectedFiles)
    upload(selectedFiles.value).then(
      (res) => {
        uploadStatusResponse.value = res;
      }
    );
    if (uploadTriggerStatus.value) {
      uploadTriggerStatus.value.innerText = '点击或拖拽文件上传';
    }
  }
};
const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (items) {
    console.log(items)
    selectedFiles.value = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          selectedFiles.value.push(file);
        }
      }
    }
    console.log(selectedFiles)
    upload(selectedFiles.value).then(
      (res) => {
        uploadStatusResponse.value = res;
      }
    );
  }
};

const change = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    selectedFiles.value = Array.from(target.files);
    console.log(selectedFiles)
    upload(selectedFiles.value).then(
      (res) => {
        uploadStatusResponse.value = res;
      }
    );
  }
};

</script>
<template>
  <div ref="effectiveArea" class="effective-area" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave"
       @drop.prevent="onDrop" @paste="handlePaste">
    <div ref="uploadTrigger" class="upload-trigger" :class="{ dragging: isDragging}" @click="triggerFileInput">
      <span ref="uploadTriggerStatus" class="upload-trigger-status">点击或拖拽文件上传</span>
      <div class="upload-status-interval"></div>
      <div ref="uploadStatus" v-for="uploadStatusText in uploadStatusResponse" :key="uploadStatusText"
           class="upload-status">
        {{ uploadStatusText }}
      </div>
      <input ref="fileInput" type="file" @change="change" hidden="hidden" multiple>
    </div>
  </div>
</template>

<style scoped>
.effective-area {
  display: flex;
  height: 93vh;
  text-align: center;
  justify-content: center;
  background-color: #cefcec;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 300px;
  cursor: pointer;
  font-size: x-large;
  background-color: #e9bfff;
}

.upload-trigger-status {
  order: -1;
}

.upload-status-interval {
  margin-top: auto;
}

.upload-status {
  margin-top: 0;
}

.dragging {
  background-color: #cf6969;
}

</style>
