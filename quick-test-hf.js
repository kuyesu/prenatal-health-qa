#!/usr/bin/env node

const { InferenceClient } = require('@huggingface/inference');
require('dotenv').config({ path: '.env.local' });

async function quickTest() {
  console.log('🧪 Quick Hugging Face API Test...\n');
  
  if (!process.env.HF_TOKEN) {
    console.error('❌ HF_TOKEN not found');
    return;
  }
  
  console.log('✅ HF_TOKEN found:', process.env.HF_TOKEN.substring(0, 10) + '...');
  
  const client = new InferenceClient(process.env.HF_TOKEN);
  
  // Very simple test with timeout
  console.log('Testing basic text generation...');
  
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000);
  });
  
  const apiCall = client.textGeneration({
    model: 'gpt2',
    inputs: 'Hello',
    parameters: {
      max_new_tokens: 5,
      temperature: 0.7,
    },
  });
  
  try {
    const result = await Promise.race([apiCall, timeout]);
    console.log('✅ Success! Generated text:', result.generated_text);
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Try to check if it's a token issue
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.error('🔑 This looks like a token authentication issue');
      console.error('💡 Check if your HF_TOKEN is valid at https://huggingface.co/settings/tokens');
    } else if (error.message.includes('404')) {
      console.error('📍 This looks like a model not found issue');
      console.error('💡 The model might not exist or you might not have access to it');
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      console.error('⏰ Request timed out - API might be slow or down');
    }
    
    return false;
  }
}

quickTest().catch(console.error);
