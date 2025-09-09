#!/usr/bin/env node

const { InferenceClient } = require('@huggingface/inference');
require('dotenv').config({ path: '.env.local' });

async function testHuggingFaceAPI() {
  console.log('🧪 Testing Hugging Face API...\n');
  
  // Check if token exists
  if (!process.env.HF_TOKEN) {
    console.error('❌ HF_TOKEN not found in environment variables');
    return;
  }
  
  console.log('✅ HF_TOKEN found:', process.env.HF_TOKEN.substring(0, 10) + '...');
  
  const client = new InferenceClient(process.env.HF_TOKEN);
  
  // Test 1: Simple text generation with a known working model
  console.log('\n📝 Test 1: Basic text generation with GPT-2...');
  try {
    const result = await client.textGeneration({
      model: 'gpt2',
      inputs: 'Hello, how are you?',
      parameters: {
        max_new_tokens: 50,
        temperature: 0.7,
        return_full_text: false,
      },
    });
    console.log('✅ GPT-2 basic test successful:');
    console.log('Result:', result.generated_text);
  } catch (error) {
    console.error('❌ GPT-2 basic test failed:', error.message);
  }
  
  // Test 2: Streaming text generation with GPT-2
  console.log('\n🌊 Test 2: Streaming text generation with GPT-2...');
  try {
    const stream = client.textGenerationStream({
      model: 'gpt2',
      inputs: 'Question: What is pregnancy? Answer:',
      parameters: {
        max_new_tokens: 100,
        temperature: 0.7,
        return_full_text: false,
      },
    });
    
    let fullResponse = '';
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      chunkCount++;
      if (chunk.token && chunk.token.text) {
        fullResponse += chunk.token.text;
        process.stdout.write(chunk.token.text);
      }
    }
    
    console.log(`\n✅ GPT-2 streaming test successful! (${chunkCount} chunks)`);
    console.log('Full response:', fullResponse);
  } catch (error) {
    console.error('❌ GPT-2 streaming test failed:', error.message);
    console.error('Error details:', error);
  }
  
  // Test 3: Try a different model
  console.log('\n🤖 Test 3: Testing with different model...');
  try {
    const result = await client.textGeneration({
      model: 'microsoft/DialoGPT-small',
      inputs: 'Hello',
      parameters: {
        max_new_tokens: 20,
        temperature: 0.7,
      },
    });
    console.log('✅ DialoGPT test successful:', result.generated_text);
  } catch (error) {
    console.error('❌ DialoGPT test failed:', error.message);
  }
  
  // Test 4: Check available models (this might not work with all tokens)
  console.log('\n📋 Test 4: Checking API connectivity...');
  try {
    // Simple API health check
    const healthCheck = await client.textGeneration({
      model: 'gpt2',
      inputs: 'Test',
      parameters: {
        max_new_tokens: 1,
      },
    });
    console.log('✅ API connectivity confirmed');
  } catch (error) {
    console.error('❌ API connectivity failed:', error.message);
  }
  
  // Test 5: Test chat completion if available
  console.log('\n💬 Test 5: Testing chat completion...');
  try {
    const chatResult = await client.chatCompletion({
      model: 'microsoft/DialoGPT-medium',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 50,
    });
    console.log('✅ Chat completion successful:', chatResult);
  } catch (error) {
    console.error('❌ Chat completion failed:', error.message);
  }
  
  // Test 6: Test chat completion streaming
  console.log('\n💬🌊 Test 6: Testing chat completion streaming...');
  try {
    const chatStream = client.chatCompletionStream({
      model: 'microsoft/DialoGPT-medium',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 50,
    });
    
    let chatResponse = '';
    for await (const chunk of chatStream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const content = chunk.choices[0].delta?.content;
        if (content) {
          chatResponse += content;
          process.stdout.write(content);
        }
      }
    }
    console.log('\n✅ Chat completion streaming successful:', chatResponse);
  } catch (error) {
    console.error('❌ Chat completion streaming failed:', error.message);
  }
}

// Run the tests
testHuggingFaceAPI().catch(console.error);
