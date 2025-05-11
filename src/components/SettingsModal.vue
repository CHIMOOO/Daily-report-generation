<script setup>
import { ref } from 'vue'
import { Modal, Form, Input, Button, message } from 'ant-design-vue'
import { saveApiKey, isApiKeyConfigured } from '../services/deepseekService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible', 'saved'])

const apiKey = ref('')
const isApiConfigured = ref(isApiKeyConfigured())
const loading = ref(false)

const showModal = () => {
  emit('update:visible', true)
}

const handleCancel = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  if (!apiKey.value.trim()) {
    message.error('请输入有效的API密钥')
    return
  }

  loading.value = true

  // 模拟API验证
  setTimeout(() => {
    saveApiKey(apiKey.value.trim())
    isApiConfigured.value = true
    loading.value = false
    message.success('API密钥已保存')
    emit('saved')
    handleCancel()
  }, 500)
}

// 暴露方法供父组件调用
defineExpose({
  showModal,
})
</script>

<template>
  <Modal title="设置" :visible="props.visible" :footer="null" @cancel="handleCancel">
    <Form layout="vertical">
      <Form.Item label="DeepSeek API密钥" required>
        <Input.Password v-model:value="apiKey" placeholder="请输入DeepSeek API密钥" />
        <div class="mt-2 text-gray-500 text-sm">
          获取API密钥请访问:
          <a href="https://platform.deepseek.com" target="_blank" class="text-blue-500"
            >DeepSeek平台</a
          >
        </div>
      </Form.Item>

      <div class="flex justify-end gap-2">
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" :loading="loading" @click="handleSave">保存</Button>
      </div>
    </Form>
  </Modal>
</template>
