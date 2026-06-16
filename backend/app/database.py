from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://itams:itams123@localhost:5432/assetmanager"
)

engine = create_engine(DATABASE_URL)

# Set search_path to asset_mgr for every new connection
@event.listens_for(engine, "connect")
def set_search_path(dbapi_conn, conn_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("SET search_path TO asset_mgr")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
