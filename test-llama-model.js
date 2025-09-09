#!/usr/bin/env node

const { InferenceClient } = require('@huggingface/inference');
require('dotenv').config({ path: '.env.local' });

async function testLlamaModel() {
  console.log('🦙 Testing Meta-Llama-3-8B-Instruct model...\n');
  
  if (!process.env.HF_TOKEN) {
    console.error('❌ HF_TOKEN not found in environment variables');
    return;
  }
  
  console.log('✅ HF_TOKEN found:', process.env.HF_TOKEN.substring(0, 10) + '...');
  
  const client = new InferenceClient(process.env.HF_TOKEN);
  const model = 'meta-llama/Meta-Llama-3-8B-Instruct';
  
  // Test 1: Basic chat completion (non-streaming)
  console.log('\n💬 Test 1: Basic chat completion with Llama model...');
  try {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000);
    });
    
    const apiCall = client.chatCompletion({
      model: model,
      messages: [{ role: 'user', content: 'Hello, how are you?' }],
      max_tokens: 50,
      temperature: 0.2,
    });
    
    const result = await Promise.race([apiCall, timeout]);
    console.log('✅ Chat completion successful!');
    console.log('Response:', result.choices[0].message.content);
  } catch (error) {
    console.error('❌ Chat completion failed:', error.message);
    
    if (error.message.includes('401')) {
      console.error('🔑 Authentication issue - check your HF_TOKEN');
    } else if (error.message.includes('404')) {
      console.error('📍 Model not found or not accessible');
    } else if (error.message.includes('403')) {
      console.error('🚫 Access denied - you might not have access to this model');
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      console.error('⏰ Request timed out');
    }
    return false;
  }
  
  // Test 2: Chat completion streaming
  console.log('\n🌊 Test 2: Chat completion streaming with Llama model...');
  try {
    const stream = client.chatCompletionStream({
      model: model,
      messages: [{ role: 'user', content: 'What is pregnancy? Please give a short answer.' }],
      max_tokens: 100,
      temperature: 0.2,
    });
    
    let fullResponse = '';
    let chunkCount = 0;
    
    console.log('Streaming response:');
    
    for await (const chunk of stream) {
      chunkCount++;
      if (chunk.choices && chunk.choices.length > 0) {
        const content = chunk.choices[0].delta?.content;
        if (content) {
          fullResponse += content;
          process.stdout.write(content);
        }
      }
    }
    
    console.log(`\n\n✅ Streaming test successful! (${chunkCount} chunks)`);
    console.log('Full response length:', fullResponse.length);
    return true;
  } catch (error) {
    console.error('\n❌ Streaming test failed:', error.message);
    
    if (error.message.includes('Server response contains error: 404')) {
      console.error('📍 Model endpoint not found or model not available for streaming');
    } else if (error.message.includes('Server response contains error: 403')) {
      console.error('🚫 Access denied for streaming - you might not have streaming access');
    }
    return false;
  }
}

// Test 3: Try alternative models that might work
async function testAlternativeModels() {
  console.log('\n🔄 Testing alternative models...\n');
  
  const client = new InferenceClient(process.env.HF_TOKEN);
  const alternativeModels = [
    'mistralai/Mistral-7B-Instruct-v0.2',
    'microsoft/DialoGPT-medium',
    'microsoft/DialoGPT-small',
    'gpt2'
  ];
  
  for (const model of alternativeModels) {
    console.log(`\n🧪 Testing ${model}...`);
    try {
      const result = await client.chatCompletion({
        model: model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 20,
      });
      console.log(`✅ ${model} works!`);
      console.log('Response:', result.choices[0].message.content);
    } catch (error) {
      console.log(`❌ ${model} failed:`, error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  const llamaWorked = await testLlamaModel();
  
  if (!llamaWorked) {
    await testAlternativeModels();
  }
}

runAllTests().catch(console.error);
