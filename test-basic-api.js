#!/usr/bin/env node

const { InferenceClient } = require('@huggingface/inference');
require('dotenv').config({ path: '.env.local' });

async function testBasicAPI() {
  console.log('🔧 Testing basic HF API functionality...\n');
  
  if (!process.env.HF_TOKEN) {
    console.error('❌ HF_TOKEN not found');
    return;
  }
  
  console.log('✅ HF_TOKEN found');
  const client = new InferenceClient(process.env.HF_TOKEN);
  
  // Test 1: Very simple text generation with GPT-2
  console.log('🧪 Test 1: Basic text generation with GPT-2...');
  try {
    const result = await Promise.race([
      client.textGeneration({
        model: 'gpt2',
        inputs: 'Hello',
        parameters: { max_new_tokens: 10 }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);
    console.log('✅ GPT-2 works:', result.generated_text);
  } catch (error) {
    console.error('❌ GPT-2 failed:', error.message);
    console.log('🚨 Basic API is not working - this suggests token or connectivity issues');
    return;
  }
  
  // Test 2: Try Llama with text generation instead of chat completion
  console.log('\n🧪 Test 2: Llama with text generation...');
  try {
    const result = await Promise.race([
      client.textGeneration({
        model: 'meta-llama/Llama-3.2-3B-Instruct',
        inputs: 'Question: What is pregnancy? Answer:',
        parameters: { max_new_tokens: 50 }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
    ]);
    console.log('✅ Llama text generation works:', result.generated_text);
  } catch (error) {
    console.error('❌ Llama text generation failed:', error.message);
  }
  
  // Test 3: Try with provider parameter for chat completion
  console.log('\n🧪 Test 3: Llama with provider parameter...');
  try {
    const result = await Promise.race([
      client.chatCompletion({
        model: 'meta-llama/Llama-3.2-3B-Instruct',
        provider: 'hf-inference',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 30
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
    ]);
    console.log('✅ Llama chat completion with provider works!');
    console.log('Response:', result.choices[0].message.content);
  } catch (error) {
    console.error('❌ Llama chat completion with provider failed:', error.message);
  }
  
  // Test 4: Try the DoD model
  console.log('\n🧪 Test 4: DoD model...');
  try {
    const result = await Promise.race([
      client.chatCompletion({
        model: 'DoD-MUST/Llama-3.2-3B-Instruct-Sunbird-Dialogue.v1',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 30
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
    ]);
    console.log('✅ DoD model works!');
    console.log('Response:', result.choices[0].message.content);
  } catch (error) {
    console.error('❌ DoD model failed:', error.message);
  }
}

testBasicAPI().catch(console.error);
