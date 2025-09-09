// Test script to check Hugging Face model output
const OpenAI = require('openai');

async function testHFModel() {
  if (!process.env.HF_TOKEN) {
    console.error('HF_TOKEN environment variable is not set');
    return;
  }

  const openai = new OpenAI({
    baseURL: 'https://rxz0wdbx23c1j35h.us-east-1.aws.endpoints.huggingface.cloud/v1/',
    apiKey: process.env.HF_TOKEN,
  });

  const prompt = `You are a prenatal health assistant. Answer ONLY in clear, grammatical English with proper spacing between words.

CRITICAL: You MUST respond in perfect English only. Use proper spelling, grammar, and word spacing.

RULES:
1. ONLY answer questions about prenatal care, pregnancy, childbirth, or postnatal care.
2. If the question is not about pregnancy/prenatal health, respond: "I can only answer questions about prenatal and postnatal care. Please ask a question related to pregnancy, childbirth, or newborn care."
3. For medical emergencies, advise seeking immediate medical attention.
4. Include appropriate medical disclaimers.
5. Use clear, readable English with proper punctuation and spacing.

Question: What are the signs of labor?

Format your response EXACTLY like this example:
ANSWER: During pregnancy, it is important to maintain a healthy diet rich in essential nutrients. Focus on eating fruits, vegetables, whole grains, lean proteins, and dairy products. Avoid raw fish, unpasteurized products, and limit caffeine intake. Always consult your healthcare provider for personalized dietary recommendations.

SUGGESTED_QUESTIONS:
1. What vitamins should I take during pregnancy?
2. How much weight should I gain during pregnancy?
3. What exercises are safe during pregnancy?`;

  try {
    console.log('Testing Hugging Face model...');
    console.log('Prompt length:', prompt.length);
    console.log('---');

    // Test non-streaming first
    console.log('=== NON-STREAMING RESPONSE ===');
    const nonStreamingResponse = await openai.chat.completions.create({
      model: 'tgi',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    });

    const fullResponse = nonStreamingResponse.choices[0]?.message?.content || 'No content';
    console.log('Full response length:', fullResponse.length);
    console.log('Full response:');
    console.log(JSON.stringify(fullResponse, null, 2));
    console.log('---');
    console.log('Raw response preview (first 200 chars):');
    console.log(fullResponse.substring(0, 200));
    console.log('---');

    // Check for patterns
    const spaceCount = (fullResponse.match(/ /g) || []).length;
    const wordCount = fullResponse.split(/\s+/).filter(w => w.length > 0).length;
    const avgWordsPerSpace = wordCount / Math.max(spaceCount, 1);
    const hasLongSequences = /[a-z]{25,}/.test(fullResponse);
    const hasProperSpacing = spaceCount > fullResponse.length / 20;

    console.log('=== ANALYSIS ===');
    console.log('Space count:', spaceCount);
    console.log('Word count:', wordCount);
    console.log('Avg words per space:', avgWordsPerSpace.toFixed(2));
    console.log('Has long lowercase sequences (25+ chars):', hasLongSequences);
    console.log('Has proper spacing ratio:', hasProperSpacing);
    console.log('Contains ANSWER:', fullResponse.includes('ANSWER:'));
    console.log('Contains SUGGESTED_QUESTIONS:', fullResponse.includes('SUGGESTED_QUESTIONS:'));

    // Now test streaming
    console.log('\n=== STREAMING RESPONSE ===');
    const stream = await openai.chat.completions.create({
      model: 'tgi',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    let streamedContent = '';
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        chunkCount++;
        streamedContent += content;
        if (chunkCount <= 5) {
          console.log(`Chunk ${chunkCount}:`, JSON.stringify(content));
        }
        if (chunkCount === 6) {
          console.log('... (showing first 5 chunks only)');
        }
      }
    }

    console.log('\nStreamed content length:', streamedContent.length);
    console.log('Total chunks received:', chunkCount);
    console.log('Streaming matches non-streaming:', streamedContent === fullResponse);
    
    if (streamedContent !== fullResponse) {
      console.log('DIFFERENCE DETECTED!');
      console.log('Non-streaming first 100:', fullResponse.substring(0, 100));
      console.log('Streaming first 100:', streamedContent.substring(0, 100));
    }

  } catch (error) {
    console.error('Error testing model:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testHFModel();
