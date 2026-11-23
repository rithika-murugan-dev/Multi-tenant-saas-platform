import asyncio
import asyncpg
from app.core.config import settings


async def create_database_if_not_exists():
    print(f"Connecting to PostgreSQL at {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}...")
    try:
        # Connect to the default system 'postgres' database
        conn = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            database="postgres",
        )

        # Check if target database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", settings.POSTGRES_DB
        )

        if not exists:
            print(f"Database '{settings.POSTGRES_DB}' does not exist. Creating it now...")
            await conn.execute(f'CREATE DATABASE "{settings.POSTGRES_DB}"')
            print(f" Database '{settings.POSTGRES_DB}' created successfully!")
        else:
            print(f"Database '{settings.POSTGRES_DB}' already exists.")

        await conn.close()
    except Exception as e:
        print(f"Failed to connect or create database: {e}")
        print("\nTroubleshooting tips:")
        print("1. If using Docker, make sure PostgreSQL container is running: docker ps")
        print("2. If using local PostgreSQL, check your POSTGRES_PASSWORD in .env")


if __name__ == "__main__":
    asyncio.run(create_database_if_not_exists())
