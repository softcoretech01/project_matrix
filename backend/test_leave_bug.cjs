async function testLeaveBug() {
  const baseUrl = 'http://localhost:5002/api';
  const headers = (userId) => ({ 'Content-Type': 'application/json', 'x-user-id': userId });
  
  try {
    // 2. PM (E003) fetches leaves
    console.log('--- PM (E003) fetching leaves ---');
    let res = await fetch(`${baseUrl}/leaves`, { headers: headers('E003') });
    let leaves = await res.json();
    console.log("PM received leaves count:", leaves.length);
    
    // Pick the last pending leave
    let target = leaves.reverse().find(l => l.status === 'Pending');
    console.log("Target leave to approve:", target);
    
    if (!target) {
        console.log("No Pending leave found for PM to approve!");
        return;
    }
    
    // 3. PM approves the leave
    const payload = {
      ...target,
      status: 'Approved',
      comments: 'Processed'
    };
    console.log('--- PM (E003) approving leave ---');
    console.log("Payload:", payload);
    
    res = await fetch(`${baseUrl}/leaves/${target.id}`, { 
      method: 'PUT', 
      headers: headers('E003'), 
      body: JSON.stringify(payload) 
    });
    let result = await res.json();
    if (!res.ok) {
        console.error("PUT Failed with status:", res.status);
        console.error("Error response:", result);
    } else {
        console.log("PUT Success:", result);
    }

  } catch(e) {
    console.error("Test script error:", e);
  }
}

testLeaveBug();
