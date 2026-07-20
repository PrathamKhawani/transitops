const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:pratham2102005@localhost:5432/transitops'
});

async function main() {
  await client.connect();
  
  // Check Role enum
  const enumRes = await client.query(`
    SELECT enumlabel FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'Role'
    ORDER BY enumsortorder
  `);
  console.log('Role enum values in DB:', enumRes.rows.map(r => r.enumlabel));
  
  // Check user count and roles
  const usersRes = await client.query('SELECT name, email, role FROM users LIMIT 10');
  console.log('Users in DB:', usersRes.rows);
  
  await client.end();
}

main().catch(e => {
  console.error('DB Error:', e.message);
  process.exit(1);
});
