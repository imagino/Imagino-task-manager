import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect("postgresql://postgres:root@localhost:5432/taskdb")
    # Set ALL existing users to admin for easy development testing
    await conn.execute("UPDATE users SET role = 'admin'")
    users = await conn.fetch("SELECT id, name, email, role, is_active FROM users ORDER BY id")
    print("Updated users:")
    for u in users:
        print(f"  id={u['id']} name={u['name']} role={u['role']} active={u['is_active']}")
    await conn.close()

asyncio.run(main())
