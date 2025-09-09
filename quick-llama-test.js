#!/usr/bin/env node

const { InferenceClient } = require('@huggingface/inference');
require('dotenv').config({ path: '.env.local' });

async function testCorrectModels() {
  console.log('🦙 Testing the correct Llama models...\n');
  
  if (!process.env.HF_TOKEN) {
    console.error('❌ HF_TOKEN not found');
    return;
  }
  
  console.log('✅ HF_TOKEN found');
  
  const client = new InferenceClient(process.env.HF_TOKEN);
  const models = [
    'meta-llama/Llama-3.2-3B-Instruct',
    'DoD-MUST/Llama-3.2-3B-Instruct-Sunbird-Dialogue.v1'
  ];
  
  for (const model of models) {
    console.log(`\n🧪 Testing ${model}...`);
    
    // Test with 10 second timeout
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000);
    });
    
    try {
      const apiCall = client.chatCompletion({
        model: model,
        messages: [{ role: 'user', content: 'Hello, what is pregnancy?' }],
        max_tokens: 50,
        temperature: 0.2,
      });
      
      const result = await Promise.race([apiCall, timeout]);
      console.log(`✅ ${model} works!`);
      console.log('Response:', result.choices[0].message.content);
      
      // Test streaming for this model
      console.log(`\n🌊 Testing streaming for ${model}...`);
      try {
        const stream = client.chatCompletionStream({
          model: model,
          messages: [{ role: 'user', content: 'What are prenatal vitamins?' }],
          max_tokens: 100,
          temperature: 0.2,
        });
        
        let streamResponse = '';
        let chunkCount = 0;
        
        for await (const chunk of stream) {
          chunkCount++;
          if (chunk.choices && chunk.choices.length > 0) {
            const content = chunk.choices[0].delta?.content;
            if (content) {
              streamResponse += content;
              process.stdout.write(content);
            }
          }
        }
        
        console.log(`\n✅ Streaming works for ${model}! (${chunkCount} chunks)`);
        console.log('Stream response length:', streamResponse.length);
        
        // If we found a working model, we can stop here
        console.log(`\n🎉 Found working model: ${model}`);
        break;
        
      } catch (streamError) {
        console.error(`❌ Streaming failed for ${model}:`, streamError.message);
      }
      
    } catch (error) {
      console.error(`❌ ${model} failed:`, error.message);
      
      if (error.message.includes('401')) {
        console.error('� Authentication issue');
      } else if (error.message.includes('404')) {
        console.error('📍 Model not found');
      } else if (error.message.includes('403')) {
        console.error('🚫 Access denied');
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        console.error('⏰ Request timed out');
      }
    }
  }
}

testCorrectModels().catch(console.error);
