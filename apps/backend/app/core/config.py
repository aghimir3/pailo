from functools import lru_cache
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    database_url: str | None = None
    database_host: str = "127.0.0.1"
    database_port: int = 55432
    database_name: str = "pailo"
    database_username: str = "pailo"
    database_password: str = "pailo"
    initial_owner_admin_email: str = ""

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        username = quote_plus(self.database_username)
        password = quote_plus(self.database_password)
        return (
            f"postgresql+asyncpg://{username}:{password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
