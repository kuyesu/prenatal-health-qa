// Simple test to call our test-model endpoint
async function testModel() {
  try {
    console.log('Testing model endpoint...');
    
    const response = await fetch('http://localhost:3000/api/test-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('=== TEST RESULTS ===');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error testing model:', error.message);
  }
}

testModel();
