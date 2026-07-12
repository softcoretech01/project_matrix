const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root123',
      database: 'ProjectMatrix'
    });
    
    console.log('Altering table...');
    await conn.query(`
      ALTER TABLE task_types 
      ADD COLUMN code VARCHAR(20) AFTER id, 
      ADD COLUMN description TEXT, 
      ADD COLUMN status VARCHAR(20) DEFAULT 'Active'
    `);
    
    console.log('Updating existing codes...');
    await conn.query('UPDATE task_types SET code = id WHERE code IS NULL');
    
    console.log('Fetching new schema...');
    const [rows] = await conn.query('SHOW CREATE TABLE task_types');
    console.log(rows[0]['Create Table']);
    
    await conn.end();
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.error(e);
    }
  }
})();
