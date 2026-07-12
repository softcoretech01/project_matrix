const fs = require('fs');

let content = fs.readFileSync('db.js', 'utf8');

// Fix insertEmployee
content = content.replace(
  /async insertEmployee\(emp\) \{[\s\S]*?return emp;\n  \}/,
  `async insertEmployee(emp) {
    if (this.isFallback) {
      const data = this.getMockData();
      const count = data.employees.length + 1;
      emp.id = \`E\${String(count).padStart(3, '0')}\`;
      data.employees.push(emp);
      this.saveMockData(data);
      return emp;
    }
    const newId = emp.id || ('E' + Date.now().toString().slice(-6));
    await this.pool.execute(
      'INSERT INTO employees (id, code, name, email, mobile, designation, department, managerId, costPerHour, role, status, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newId, emp.code, emp.name, emp.email, emp.mobile, emp.designation, emp.department, emp.managerId || null, emp.costPerHour, emp.role, emp.status, emp.password]
    );
    emp.id = newId;
    return emp;
  }`
);

fs.writeFileSync('db.js', content, 'utf8');
console.log('db.js patched successfully');
