// Test our API endpoint to see raw model output
async function testOurAPI() {
  try {
    console.log('Testing our API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'What are the signs of labor?',
        language: 'en'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    let fullResponse = '';
    let chunkCount = 0;

    console.log('\n=== STREAMING CHUNKS ===');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = new TextDecoder().decode(value);
      const lines = text.split('\n\n');
      
      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        
        try {
          const data = JSON.parse(line.substring(6));
          if (data.type === 'chunk' && data.content) {
            chunkCount++;
            fullResponse += data.content;
            
            if (chunkCount <= 10) {
              console.log(`Chunk ${chunkCount}:`, JSON.stringify(data.content));
            }
            if (chunkCount === 11) {
              console.log('... (showing first 10 chunks only)');
            }
          } else if (data.type === 'done') {
            console.log('Stream completed');
          } else if (data.type === 'error') {
            console.log('Error in stream:', data);
          }
        } catch (parseError) {
          console.log('Failed to parse chunk:', line.substring(0, 100));
        }
      }
    }

    console.log('\n=== ANALYSIS ===');
    console.log('Total chunks:', chunkCount);
    console.log('Full response length:', fullResponse.length);
    console.log('Full response preview (first 200 chars):');
    console.log(fullResponse.substring(0, 200));
    
    // Pattern analysis
    const spaceCount = (fullResponse.match(/ /g) || []).length;
    const wordCount = fullResponse.split(/\s+/).filter(w => w.length > 0).length;
    const hasLongSequences = /[a-z]{25,}/.test(fullResponse);
    const hasProperSpacing = spaceCount > fullResponse.length / 20;
    
    console.log('\nSpace count:', spaceCount);
    console.log('Word count (estimated):', wordCount);
    console.log('Has long lowercase sequences (25+ chars):', hasLongSequences);
    console.log('Has proper spacing ratio:', hasProperSpacing);
    console.log('Contains ANSWER:', fullResponse.includes('ANSWER:'));
    console.log('Contains SUGGESTED_QUESTIONS:', fullResponse.includes('SUGGESTED_QUESTIONS:'));
    
    if (hasLongSequences) {
      const matches = fullResponse.match(/[a-z]{25,}/g);
      console.log('Long sequences found:', matches?.slice(0, 3));
    }

  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

// Run the test
testOurAPI();
