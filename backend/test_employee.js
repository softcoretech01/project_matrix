async function test() {
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-user-id': 'E006'
  };

  console.log("=== 1. POST /api/employees ===");
  const postRes = await fetch('http://localhost:5002/api/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      code: 'EMP999',
      name: 'Test Worker',
      email: 'testworker@projectmatrix.com'
    })
  });
  
  const postData = await postRes.json();
  console.log("POST Status:", postRes.status);
  console.log("POST Response:", postData);
  
  if (!postRes.ok) {
    console.error("POST Failed! Exiting.");
    return;
  }

  const newId = postData.id;

  console.log("\n=== 2. PUT /api/employees/:id ===");
  const putRes = await fetch(`http://localhost:5002/api/employees/${newId}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      code: 'EMP999',
      name: 'Test Worker Updated',
      email: 'testworker@projectmatrix.com',
      designation: 'Tester'
    })
  });
  
  const putData = await putRes.json();
  console.log("PUT Status:", putRes.status);
  console.log("PUT Response:", putData);

  console.log("\n=== 3. Verify in DB ===");
  const getRes = await fetch('http://localhost:5002/api/employees', {
    headers: adminHeaders
  });
  const allEmps = await getRes.json();
  const found = allEmps.find(e => e.id === newId);
  console.log("Found in DB:", found);
}

test();
